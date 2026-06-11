# Model Outputs Reference

Reference for what each model returns. Used by Phase 3 detection logic.

---

## 1. MediaPipe Face Landmarker

Model file: `models/face_landmarker.task`

### Load

```python
import mediapipe as mp

options = mp.tasks.vision.FaceLandmarkerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path="models/face_landmarker.task"),
    running_mode=mp.tasks.vision.RunningMode.IMAGE,
    num_faces=1,
)
landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)
```

### Output

```python
mp_image = mp.Image.create_from_file("test.jpg")
result = landmarker.detect(mp_image)
```

`result` has:
- `face_landmarks` — list, one entry per detected face. With `num_faces=1` it's a list of length 0 (no face) or 1.
- `result.face_landmarks[0]` → list of **478 landmarks** (with the `.task` model we use)
- Each landmark has `.x`, `.y`, `.z` — **normalized 0.0 to 1.0** relative to image dimensions
- To convert to pixel coords: `pixel_x = int(landmark.x * image_width)`

### Key landmark indices we care about

For **EAR (Eye Aspect Ratio)** — drowsiness detection:
- **Right eye**: 33 (outer corner), 133 (inner corner), 159 (top), 145 (bottom)
- **Left eye**: 263 (outer corner), 362 (inner corner), 386 (top), 374 (bottom)
- EAR formula per eye: `(|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)`
- Drowsy when EAR < 0.20 (per project spec threshold)

For **mouth** — eating / chewing motion:
- **Top lip center**: 13
- **Bottom lip center**: 14
- **Left corner**: 78
- **Right corner**: 308
- Mouth-open ratio: `|13 - 14| / |78 - 308|`

For **head pose** — eyes-off-road detection:
- **Nose tip**: 1
- **Chin**: 152
- **Left eye outer**: 33
- **Right eye outer**: 263
- **Left mouth corner**: 61
- **Right mouth corner**: 291
- Use `cv2.solvePnP()` with these 6 2D points + standard 3D face model → returns rotation vector → convert to Euler angles (yaw, pitch, roll)
- Eyes-off-road when `|yaw| > 30°` OR `|pitch| > 30°`

For **hand-to-mouth proximity** (eating signal):
- MediaPipe Face Landmarker doesn't track hands — use **hand detection from YOLO** (`person` class bbox top region as proxy) OR add MediaPipe Hand Landmarker as a second model later.

### Test

```python
print(f"Landmarks: {len(result.face_landmarks[0])}")  # Should print 478
```

---

## 2. YOLOv8s (COCO) — `yolov8s.pt`

Auto-downloaded by ultralytics on first run, ~22 MB.

### Load

```python
from ultralytics import YOLO
model = YOLO("yolov8s.pt")
```

### Inference

```python
results = model("image.jpg", verbose=False)
boxes = results[0].boxes  # detections for first image
```

### Output shape

`boxes` is a Boxes object. Iterate over each detected object:

```python
for box in boxes:
    cls_id = int(box.cls[0])           # class index (int)
    conf = float(box.conf[0])          # confidence 0..1
    x1, y1, x2, y2 = box.xyxy[0]       # bbox in pixel coords (corners)
    cls_name = model.names[cls_id]     # e.g. "cell phone"
```

### COCO class names we care about

| Class ID | Name | Used for |
|---|---|---|
| 0 | `person` | Driver presence verification (sanity check) |
| 39 | `bottle` | Eating/drinking signal |
| 41 | `cup` | Eating/drinking signal |
| 46 | `banana` | Eating signal |
| 47 | `apple` | Eating signal |
| 48 | `sandwich` | Eating signal |
| 49 | `orange` | Eating signal |
| 53 | `pizza` | Eating signal |
| 54 | `donut` | Eating signal |
| 55 | `cake` | Eating signal |
| 67 | `cell phone` | Phone usage detection |

### Thresholds per project spec

- Phone usage: `cell phone` with `conf ≥ 0.7`
- Eating: any food class above + hand-near-mouth (MediaPipe signal)

---

## 3. Custom Seatbelt Model — `seatbelt_v3.pt`

Trained on patok-tok-patok/seatbelt-cuunt v2 (4,696 in-cabin driver images, re-split 80/10/10 with seed=42), 50 epochs on Tesla T4.

**Performance on held-out test set (471 images):** mAP50 = 0.9522, mAP50-95 = 0.7051 (seatbelt class 0.985, no-seatbelt class 0.919).

### Load

```python
seatbelt_model = YOLO("models/seatbelt_v3.pt")
```

### Inference (same API as COCO YOLO)

```python
results = seatbelt_model(frame, verbose=False)
for box in results[0].boxes:
    cls_id = int(box.cls[0])
    conf = float(box.conf[0])
    cls_name = seatbelt_model.names[cls_id]
```

### Classes

| Class ID | Name |
|---|---|
| 0 | `no-seatbelt` |
| 1 | `seatbelt` |

### Threshold (per project spec)

- No seatbelt detection: class 0 (`no-seatbelt`) returned with `conf ≥ 0.6`
- Duration threshold: ≥ 3 seconds (in BehaviorTracker)
- Cooldown: 60 seconds

### Note about color vs grayscale

The model was trained on mixed color + grayscale/IR data and is mostly color-invariant. **However**, in testing we found it can over-confidently false-fire on out-of-distribution inputs (e.g., studio portraits, not-in-car shots). Converting frames to grayscale-3-channel reduces these false positives.

```python
import cv2
gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
gray_3ch = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)  # back to 3 channels
seatbelt_results = seatbelt_model(gray_3ch)
```

Or use the helper: `convert_to_grayscale_3ch(frame)` from `detectors.py`.

---

## Summary — how the orchestrator combines outputs

In `analyze_frame(image)` (Phase 3.6):

1. Run **MediaPipe Face Landmarker** → get 478 landmarks
2. Run **YOLOv8s COCO** on color frame → get `boxes` for phone/food/person
3. Convert frame to grayscale-3-channel, run **seatbelt model** → get seatbelt/no-seatbelt
4. Compute per-behavior signals using thresholds from project spec:
   - Drowsiness: EAR < 0.20
   - Eyes off road: head yaw or pitch > 30°
   - Phone usage: COCO `cell phone` with conf ≥ 0.7
   - Eating: food class detected + hand-near-mouth signal
   - No seatbelt: seatbelt model class 0 with conf ≥ 0.6
5. Return dict: `{ drowsiness: bool, eyes_off_road: bool, phone: bool, eating: bool, no_seatbelt: bool }`

This dict feeds into the `BehaviorTracker` (Phase 4) which enforces duration thresholds before declaring a confirmed misbehavior.
