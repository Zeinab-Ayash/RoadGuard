import asyncio
import cv2
import numpy as np

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from state import latest_frame, frame_buffer, frame_lock

from analyzer import FrameAnalyzer
from behavior_tracker import BehaviorTracker
from cooldown_tracker import CooldownTracker

app = FastAPI()

# =========================
# AI SYSTEM
# =========================
analyzer = FrameAnalyzer()
tracker = BehaviorTracker()
cooldown = CooldownTracker()


# =========================
# INPUT SOCKET (LAPTOP ONLY)
# =========================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            frame_bytes = await websocket.receive_bytes()

            frame_buffer.append(frame_bytes)

            # OVERWRITE ONLY (KEEP LAST FRAME)
            with frame_lock:
                global latest_frame
                latest_frame = frame_bytes

    except WebSocketDisconnect:
        pass


# =========================
# AI LOOP (CRITICAL FIX)
# =========================
async def process_loop():
    global latest_frame

    while True:

        frame_bytes = None

        # TAKE AND CLEAR IMMEDIATELY
        with frame_lock:
            frame_bytes = latest_frame
            latest_frame = None   # 🔥 KEY FIX: prevents reprocessing old frame

        if frame_bytes is None:
            await asyncio.sleep(0.005)
            continue

        # decode
        np_arr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # AI
        result = analyzer.analyze(frame)

        tracker.update_from_flags(result["flags"])
        cooldown.filter([])

        # optional debug print (KEEP LOW FREQUENCY)
        print(result["flags"])

        await asyncio.sleep(0.05)  # control AI speed


# =========================
# STARTUP
# =========================
@app.on_event("startup")
async def startup():
    asyncio.create_task(process_loop())


# =========================
# HEALTH CHECK
# =========================
@app.get("/")
def root():
    return {"status": "RoadGuard backend running"}