---
title: RoadGuard AI Server
emoji: 🚗
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# RoadGuard AI Server

Real-time driver behavior detection server for the RoadGuard mobile application.

Detects five categories of unsafe driving behavior from a live camera stream:

- **Drowsiness** — eye closure tracked via MediaPipe Face Mesh blendshapes
- **Eyes Off Road** — head pose (yaw / pitch) from MediaPipe Face Mesh
- **Phone Usage** — YOLOv8s COCO `cell phone` class
- **Eating While Driving** — YOLOv8s COCO food classes combined with hand-on-food check (MediaPipe Hand Landmarker)
- **No Seatbelt** — custom fine-tuned YOLOv8s seatbelt-detection model (`seatbelt_v3.pt`, test mAP50 = 0.952)

## Architecture

- **FastAPI** with two WebSocket endpoints, bound by session ID:
  - `/upload/{session_id}` — camera source streams JPEG frames here
  - `/events/{session_id}` — the mobile app listens here for behavior alarms
- **Multi-model inference pipeline** — four models run in parallel per frame via Python `ThreadPoolExecutor`: MediaPipe Face Mesh, MediaPipe Hand Landmarker, YOLOv8s COCO, custom seatbelt YOLOv8s.
- **Per-session state** — each driving session has its own analyzer, behavior tracker (duration thresholds), and cooldown tracker (post-fire suppression).
- **Drop-stale frame buffering** — only the most recent frame is processed when CPU spikes occur.

## HTTP routes

| Route | Purpose |
|---|---|
| `GET /` | JSON status — confirms the server is running, lists active sessions |
| `GET /health` | Liveness probe for hosting platforms |
| `GET /publish` | Serves the browser-based camera publisher (`publish.html`) for development testing |

## Configuration

- **Capture rate:** 1 frame per second, every frame heavy (all four models per frame) — matches the deployment target's CPU budget.
- **Inference time:** ~4.6 ms per image on GPU benchmark; ~300 ms per image on free-tier CPU — comfortably within the 1 fps frame budget.

## Local development

```bash
cd ai/server
python -m venv venv
venv\Scripts\activate                # Windows
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open `http://localhost:8000/publish` in a browser to test the upload pipeline with your laptop webcam.
