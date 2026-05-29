"""End-to-end WebSocket test client for the Phase 5 AI server.

Simulates both sides of the production conversation:
  - As the camera publisher: captures laptop webcam frames at 1 fps,
    JPEG-encodes them, sends them over /upload/{session_id}.
  - As the phone listener:    connects to /events/{session_id} and
    prints every alarm event received.

Run locally:
  # Terminal 1 — start the server
  uvicorn main:app --host 0.0.0.0 --port 8000

  # Terminal 2 — start this client
  python test_client.py                     # uses default session_id "test-local"
  python test_client.py abc-123-uuid        # uses a specific session_id

Press Ctrl+C to stop.

Difference from test_webcam.py:
  test_webcam.py runs the AI in-process (no server, no WebSocket) — useful
                  for tuning detector thresholds on local frames.
  test_client.py  exercises the server + WebSocket pipeline — useful for
                  verifying the API contract, deployment, and Mira/Rania
                  integration before the phone is involved.
"""

import asyncio
import json
import logging
import platform
import sys
import time

import cv2
import websockets

# Cross-platform alarm beep — Windows uses winsound, others fall back to bell.
if platform.system() == "Windows":
    import winsound
    def beep():
        winsound.Beep(1000, 200)
else:
    def beep():
        print("\a", end="", flush=True)


# ─── Config ──────────────────────────────────────────────────────────
SERVER_URL = "ws://localhost:8000"
FRAME_W, FRAME_H = 640, 480
FRAME_INTERVAL_S = 1.0      # 1 fps capture, matches API contract
JPEG_QUALITY = 70
CAMERA_INDEX = 0            # 0 = default built-in cam (Iriun usually = 1)
WINDOW_NAME = "test_client — press q to quit"

# Shared state for the preview overlay (worker threads update, main thread reads).
_state = {"sent": 0, "last_alarm": "(none)"}


# ─── Logging ─────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("test_client")


# ─── Upload side ─────────────────────────────────────────────────────
async def upload_loop(session_id: str):
    """Open the webcam and stream JPEGs to the server at 1 fps."""
    upload_url = f"{SERVER_URL}/upload/{session_id}"
    cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
    if not cap.isOpened():
        log.error("Could not open camera at index %d", CAMERA_INDEX)
        return

    try:
        async with websockets.connect(upload_url, ping_interval=20, ping_timeout=60) as ws:
            log.info("[upload] connected to %s", upload_url)
            sent = 0
            last_send = 0.0
            while True:
                ret, frame = cap.read()
                if not ret:
                    log.warning("[upload] camera read failed, retrying")
                    await asyncio.sleep(0.1)
                    continue

                frame = cv2.resize(frame, (FRAME_W, FRAME_H))
                now = time.time()

                # Only SEND a frame every FRAME_INTERVAL_S seconds (matches
                # production 1 fps). Display refreshes on every loop iteration
                # for a smooth preview.
                if now - last_send >= FRAME_INTERVAL_S:
                    last_send = now
                    ok, buf = cv2.imencode(
                        ".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]
                    )
                    if ok:
                        await ws.send(buf.tobytes())
                        sent += 1
                        _state["sent"] = sent
                        if sent % 10 == 0:
                            log.info("[upload] sent %d frames", sent)

                # Live preview overlay (refreshes ~30 fps for smooth video).
                overlay = frame.copy()
                cv2.rectangle(overlay, (0, 0), (FRAME_W, 60), (0, 0, 0), -1)
                cv2.putText(overlay, f"frames sent: {sent}", (10, 25),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
                cv2.putText(overlay, f"last alarm: {_state['last_alarm']}", (10, 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 165, 255), 1)
                cv2.imshow(WINDOW_NAME, overlay)
                if (cv2.waitKey(1) & 0xFF) == ord("q"):
                    log.info("[upload] user pressed q, quitting")
                    break

                # Small async sleep so the events_loop coroutine gets to run.
                await asyncio.sleep(0.01)
    except websockets.ConnectionClosed:
        log.warning("[upload] connection closed by server")
    except Exception as exc:
        log.exception("[upload] error: %s", exc)
    finally:
        cap.release()
        cv2.destroyAllWindows()
        log.info("[upload] released camera")


# ─── Events side ─────────────────────────────────────────────────────
async def events_loop(session_id: str):
    """Listen on /events/{session_id} and print every behavior alarm."""
    events_url = f"{SERVER_URL}/events/{session_id}"
    try:
        async with websockets.connect(events_url, ping_interval=20, ping_timeout=60) as ws:
            log.info("[events] connected to %s", events_url)
            async for msg in ws:
                try:
                    data = json.loads(msg)
                    behavior = data.get("behavior", "?")
                    ts = data.get("ts", time.time())
                    log.info("[events]  ALARM: %s  (ts=%.2f)", behavior, ts)
                    _state["last_alarm"] = behavior
                    beep()
                except json.JSONDecodeError:
                    log.warning("[events] non-JSON message: %r", msg)
    except websockets.ConnectionClosed:
        log.warning("[events] connection closed by server")
    except Exception as exc:
        log.exception("[events] error: %s", exc)


# ─── Main ────────────────────────────────────────────────────────────
async def main():
    session_id = sys.argv[1] if len(sys.argv) > 1 else "test-local"
    log.info("Using session_id: %s", session_id)
    log.info("Server: %s", SERVER_URL)
    log.info("Press Ctrl+C to stop.")
    # Run both tasks concurrently. The script exits when either one ends.
    await asyncio.gather(
        upload_loop(session_id),
        events_loop(session_id),
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        log.info("stopped by user")
