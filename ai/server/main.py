"""RoadGuard AI server — Phase 5 entry point.

Two WebSocket endpoints bound by session_id:
  /upload/{session_id}   - camera source connects here, sends JPEG bytes
  /events/{session_id}   - phone connects here, receives behavior alarms

Plus three HTTP routes:
  GET /          - JSON status (sanity check in a browser)
  GET /health    - liveness probe for hosting platforms
  GET /publish   - serves the browser-based camera publisher (publish.html)

Run locally:
  cd ai/server
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

# ── OpenMP / PyTorch single-threading (MUST be set BEFORE any import that
# loads torch / mediapipe / ultralytics) ───────────────────────────────────
# Each model is forced to one internal thread so that our 4-way ThreadPool
# in analyzer.py gets clean fan-out across the available cores rather than
# every model spawning its own OpenMP team and fighting for cache. On HF
# Spaces (2 vCPU) this unlocks the ~1.5-1.8x parallel speedup; on multi-core
# laptops it scales accordingly. Detection accuracy is unaffected — only
# thread counts change.
import os
os.environ["OMP_NUM_THREADS"] = "1"

import torch
torch.set_num_threads(1)
torch.set_num_interop_threads(1)

import logging
import time

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from state import registry


# ─── logging ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
log = logging.getLogger("roadguard.server")


# ─── app ──────────────────────────────────────────────────────────────
app = FastAPI(title="RoadGuard AI Server")

# Allow connections from any origin so the deployed mobile app and the
# browser publisher can reach the server regardless of where they are
# hosted. For a production tightening pass, replace ["*"] with the exact
# list of allowed origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── HTTP routes ──────────────────────────────────────────────────────

@app.get("/")
def root():
    """Tiny status page so opening the server URL in a browser shows
    something useful (active sessions count, etc.)."""
    return {
        "status": "RoadGuard AI server running",
        "active_sessions": registry.list_session_ids(),
    }


@app.get("/health")
def health():
    """Liveness probe for hosting platforms (HF Spaces, Render, etc.)."""
    return {"status": "ok", "ts": time.time()}


@app.get("/publish", response_class=FileResponse)
def publish_page():
    """Serves the browser-based camera publisher HTML page.

    The HTML file lives at static/publish.html and is created in Step 4
    of the Phase-5 build. Returns 404 if it doesn't exist yet.
    """
    return FileResponse("static/publish.html")


# Mount the static directory so any JS/CSS the HTML imports can be served
# alongside it (currently empty; populated in Step 4).
app.mount("/static", StaticFiles(directory="static"), name="static")


# ─── WebSocket: camera source → server ────────────────────────────────

@app.websocket("/upload/{session_id}")
async def upload_ws(websocket: WebSocket, session_id: str):
    """Camera source connects here and streams JPEG bytes.

    Every WebSocket message is raw binary JPEG. The server overwrites the
    session's `latest_frame` on each one — older frames are silently lost
    if a new one arrives before the AI loop has consumed them (drop-stale).
    """
    await websocket.accept()
    session = await registry.get_or_create(session_id)
    session.attach_upload_ws(websocket)
    log.info("[%s] /upload connected", session_id)
    try:
        while True:
            frame_bytes = await websocket.receive_bytes()
            await session.set_latest_frame(frame_bytes)
    except WebSocketDisconnect:
        log.info("[%s] /upload disconnected", session_id)
    except Exception as exc:
        log.exception("[%s] /upload error: %s", session_id, exc)
    finally:
        session.detach_upload_ws()
        await registry.maybe_close(session_id)


# ─── WebSocket: server → phone ────────────────────────────────────────

@app.websocket("/events/{session_id}")
async def events_ws(websocket: WebSocket, session_id: str):
    """Phone connects here and waits for behavior alarms.

    Each event sent is JSON, e.g. {"behavior":"Drowsiness","ts":1716393600.42}.
    The connection stays open even when no frames are arriving — the
    background process loop emits events when they fire.
    """
    await websocket.accept()
    session = await registry.get_or_create(session_id)
    session.attach_events_ws(websocket)
    log.info("[%s] /events connected", session_id)
    try:
        # We don't expect meaningful data from the phone here, but we still
        # need to await so the disconnect is detected and propagated.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        log.info("[%s] /events disconnected", session_id)
    except Exception as exc:
        log.exception("[%s] /events error: %s", session_id, exc)
    finally:
        session.detach_events_ws()
        await registry.maybe_close(session_id)
