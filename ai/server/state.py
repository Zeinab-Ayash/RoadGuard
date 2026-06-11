"""Per-session state for the Phase 5 AI server.

Each driving session gets its own Session object holding:
  - Fresh analyzer + tracker + cooldown instances (locked to that session, so
    two simultaneous demos cannot corrupt each other's tracker streaks)
  - A drop-stale frame slot (latest_frame), overwritten on every upload
  - References to both WebSockets (upload + events) so we know when the
    session is fully disconnected
  - A background asyncio task running the AI pipeline at 1 fps

The SessionRegistry is a process-global dict that main.py imports. It hands
out Session objects (creating them on demand) and tears them down when both
sides have disconnected.
"""

import asyncio
import logging
import time
from typing import Optional

import cv2
import numpy as np
from fastapi import WebSocket

from analyzer import FrameAnalyzer
from behavior_tracker import BehaviorTracker
from cooldown_tracker import CooldownTracker


log = logging.getLogger("roadguard.state")

# Target inference rate. Matches our 1 fps production capture plan.
FRAME_INTERVAL_SECONDS = 1.0


class Session:
    """All state and the AI loop for one driving session."""

    def __init__(self, session_id: str):
        self.session_id = session_id

        # Fresh per-session AI instances. Each one carries its own tracker
        # streak state, cooldown timers, etc.
        self.analyzer = FrameAnalyzer(heavy_every_n_frames=1)
        self.tracker = BehaviorTracker()
        self.cooldown = CooldownTracker()

        # The drop-stale frame slot. Overwritten on every upload.
        self.latest_frame: Optional[bytes] = None

        # The two WebSockets attached to this session, if any.
        self.upload_ws: Optional[WebSocket] = None
        self.events_ws: Optional[WebSocket] = None

        # Async coordination
        self._lock = asyncio.Lock()
        self._task: Optional[asyncio.Task] = None
        self._stop = False

    # ── frame slot ─────────────────────────────────────────────

    async def set_latest_frame(self, frame_bytes: bytes):
        """Called by main.py's /upload loop on every incoming JPEG.
        Older un-processed frames are silently overwritten (drop-stale)."""
        async with self._lock:
            self.latest_frame = frame_bytes

    async def _consume_latest_frame(self) -> Optional[bytes]:
        """Take the latest frame and clear the slot, atomically.
        Returns None if no frame is waiting."""
        async with self._lock:
            frame = self.latest_frame
            self.latest_frame = None
            return frame

    # ── WebSocket attachment ───────────────────────────────────

    def attach_upload_ws(self, ws: WebSocket):
        self.upload_ws = ws

    def detach_upload_ws(self):
        self.upload_ws = None

    def attach_events_ws(self, ws: WebSocket):
        self.events_ws = ws

    def detach_events_ws(self):
        self.events_ws = None

    def is_idle(self) -> bool:
        """True when both WebSockets have disconnected — registry uses
        this to know when to garbage-collect the session."""
        return self.upload_ws is None and self.events_ws is None

    # ── event delivery ─────────────────────────────────────────

    async def _send_event(self, event: dict):
        """Push a behavior alarm to the phone if it's connected. Swallow
        errors (the phone may have disconnected between checks)."""
        ws = self.events_ws
        if ws is None:
            return
        try:
            await ws.send_json(event)
        except Exception as exc:
            log.warning("[%s] failed to send event: %s", self.session_id, exc)
            self.events_ws = None

    # ── lifecycle ──────────────────────────────────────────────

    def start(self):
        """Start the background AI loop. Idempotent."""
        if self._task is None:
            self._task = asyncio.create_task(self._process_loop())

    async def stop(self):
        """Cancel the AI loop and close the analyzer's MediaPipe handles."""
        self._stop = True
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        try:
            self.analyzer.close()
        except Exception:
            pass

    # ── the AI loop ────────────────────────────────────────────

    async def _process_loop(self):
        """Run the full per-frame pipeline at 1 fps.

        Loops until stop() is called. Each iteration:
          1. Grab the latest queued frame (drop-stale: skip if nothing waiting).
          2. Decode the JPEG bytes into a BGR image.
          3. Run analyzer.analyze() in a worker thread (it's sync + CPU-heavy
             and would otherwise freeze the event loop for ~1 s per call).
          4. Hand the raw flags to the tracker → filter through cooldown.
          5. For each behavior that survives, emit a JSON event to the phone.
          6. Sleep just enough to maintain the 1 fps cadence.
        """
        log.info("[%s] process loop starting", self.session_id)
        while not self._stop:
            try:
                loop_start = time.time()

                frame_bytes = await self._consume_latest_frame()
                if frame_bytes is None:
                    # No frame waiting — short sleep so we don't spin the CPU.
                    await asyncio.sleep(0.1)
                    continue

                # Decode JPEG bytes into a BGR numpy image
                try:
                    np_arr = np.frombuffer(frame_bytes, np.uint8)
                    frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                except Exception as exc:
                    log.warning("[%s] JPEG decode error: %s", self.session_id, exc)
                    continue
                if frame is None:
                    log.warning("[%s] malformed JPEG, skipping", self.session_id)
                    continue

                # Heavy sync work — push it to a thread so the asyncio
                # event loop stays responsive to other WebSocket traffic.
                result = await asyncio.to_thread(self.analyzer.analyze, frame)

                now = time.time()
                fired = self.tracker.update_from_flags(result["flags"], now=now)
                allowed = self.cooldown.filter(fired, now=now)

                for behavior in allowed:
                    event = {"behavior": behavior, "ts": now}
                    log.info("[%s] ALARM %s", self.session_id, behavior)
                    await self._send_event(event)

                # Pace at 1 fps. If this frame already took longer than the
                # interval, skip the sleep (we're behind, just keep going).
                elapsed = time.time() - loop_start
                if elapsed < FRAME_INTERVAL_SECONDS:
                    await asyncio.sleep(FRAME_INTERVAL_SECONDS - elapsed)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                # Never let an exception kill the loop — log it and keep going.
                log.exception("[%s] loop error: %s", self.session_id, exc)
                await asyncio.sleep(0.5)

        log.info("[%s] process loop exited", self.session_id)


class SessionRegistry:
    """Process-global registry of live sessions."""

    def __init__(self):
        self._sessions: dict[str, Session] = {}
        self._lock = asyncio.Lock()

    async def get_or_create(self, session_id: str) -> Session:
        """Return the existing Session for this id, or create one and
        start its AI loop. Safe to call concurrently."""
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                session = Session(session_id)
                session.start()
                self._sessions[session_id] = session
                log.info("[%s] session created", session_id)
            return session

    async def maybe_close(self, session_id: str):
        """Called whenever a WebSocket disconnects. Closes + removes the
        session only if BOTH the upload and events WebSockets are gone."""
        async with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return
            if not session.is_idle():
                # At least one side still connected — keep the session alive
                return
            await session.stop()
            del self._sessions[session_id]
            log.info("[%s] session closed (both WebSockets disconnected)", session_id)

    def list_session_ids(self) -> list[str]:
        """For the / status page in main.py."""
        return list(self._sessions.keys())


# The single module-level registry that main.py imports.
registry = SessionRegistry()
