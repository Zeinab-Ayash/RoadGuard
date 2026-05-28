"""Run MediaPipe + YOLOv8s on every image in test_images/ and print results."""

import os
import mediapipe as mp
from ultralytics import YOLO

MODEL_PATH = "models/face_landmarker.task"
TEST_IMAGES_DIR = "test_images"

# --- Set up MediaPipe Face Landmarker ---
mp_options = mp.tasks.vision.FaceLandmarkerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=mp.tasks.vision.RunningMode.IMAGE,
    num_faces=1,
)
face_landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(mp_options)

# --- Set up YOLO ---
print("Loading YOLOv8s...")
yolo_model = YOLO("yolov8s.pt")
print()

# --- Run on each image ---
image_files = sorted(f for f in os.listdir(TEST_IMAGES_DIR) if f.endswith((".jpg", ".png", ".jpeg")))

for filename in image_files:
    path = os.path.join(TEST_IMAGES_DIR, filename)
    print(f"=== {filename} ===")

    # MediaPipe
    mp_image = mp.Image.create_from_file(path)
    mp_result = face_landmarker.detect(mp_image)
    if mp_result.face_landmarks:
        print(f"  MediaPipe: ✅ face detected ({len(mp_result.face_landmarks[0])} landmarks)")
    else:
        print(f"  MediaPipe: ❌ no face")

    # YOLO
    yolo_results = yolo_model(path, verbose=False)
    boxes = yolo_results[0].boxes
    if boxes is None or len(boxes) == 0:
        print(f"  YOLO:      ❌ no objects")
    else:
        detections = []
        for box in boxes:
            cls_name = yolo_model.names[int(box.cls)]
            conf = float(box.conf)
            detections.append(f"{cls_name} ({conf:.0%})")
        print(f"  YOLO:      ✅ {', '.join(detections)}")

    print()

face_landmarker.close()
print("Done.")
