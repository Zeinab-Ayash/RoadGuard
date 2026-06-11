"""Measure per-model inference time. Used to plan frame-rate strategy.

Current plan: 1 fps capture, every frame heavy (all 4 models).
  - Heavy frame budget: <1000 ms (1 fps capture interval)
  - Light frame metric kept for reference / future GPU deployment where
    asymmetric 2 fps would become viable.

Runs each model in isolation, averages 5 runs, ignores first run (cold).
"""

import os
import time
import cv2
import mediapipe as mp
from ultralytics import YOLO

TEST_IMAGES_DIR = "test_images"

# Pick one representative image (with face, hand-near-mouth, food, in-car)
SAMPLE_IMAGE = os.path.join(TEST_IMAGES_DIR, "eating_while_driving.jpg")
image_bgr = cv2.imread(SAMPLE_IMAGE)
image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)

print(f"Benchmarking on: {SAMPLE_IMAGE}")
print(f"Resolution: {image_bgr.shape[1]}x{image_bgr.shape[0]}")
print()


def bench(label, fn, runs=5):
    """Run fn() warmup once, then 'runs' times. Return avg ms."""
    fn()  # warmup
    times = []
    for _ in range(runs):
        t0 = time.perf_counter()
        fn()
        t1 = time.perf_counter()
        times.append((t1 - t0) * 1000)
    avg = sum(times) / len(times)
    mn = min(times)
    mx = max(times)
    print(f"{label:<40} avg {avg:7.1f} ms  (min {mn:.1f}, max {mx:.1f})")
    return avg


# ──────────────────────────────────────────────────────────────
# MediaPipe Face Landmarker
# ──────────────────────────────────────────────────────────────
face_opts = mp.tasks.vision.FaceLandmarkerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path="models/face_landmarker.task"),
    running_mode=mp.tasks.vision.RunningMode.IMAGE,
    num_faces=1,
    output_face_blendshapes=True,
    output_facial_transformation_matrixes=True,
)
face_landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(face_opts)

# ──────────────────────────────────────────────────────────────
# MediaPipe Hand Landmarker
# ──────────────────────────────────────────────────────────────
hand_opts = mp.tasks.vision.HandLandmarkerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path="models/hand_landmarker.task"),
    running_mode=mp.tasks.vision.RunningMode.IMAGE,
    num_hands=2,
)
hand_landmarker = mp.tasks.vision.HandLandmarker.create_from_options(hand_opts)

# ──────────────────────────────────────────────────────────────
# YOLO models
# ──────────────────────────────────────────────────────────────
print("Loading YOLO models...")
yolo_coco_s = YOLO("yolov8s.pt")
yolo_coco_n = YOLO("yolov8n.pt")
seatbelt_s = YOLO("models/seatbelt_v3.pt")
print()


def gray3ch(img):
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return cv2.cvtColor(g, cv2.COLOR_GRAY2BGR)

image_gray = gray3ch(image_bgr)


print("===== INDIVIDUAL MODEL TIMINGS =====")
t_face = bench("MediaPipe Face Landmarker",       lambda: face_landmarker.detect(mp_image))
t_hand = bench("MediaPipe Hand Landmarker",       lambda: hand_landmarker.detect(mp_image))
t_yolos = bench("YOLOv8s COCO (current)",         lambda: yolo_coco_s(image_bgr, verbose=False))
t_yolon = bench("YOLOv8n COCO (nano alternative)", lambda: yolo_coco_n(image_bgr, verbose=False))
t_belt = bench("YOLOv8s Seatbelt (current)",      lambda: seatbelt_s(image_gray, verbose=False))

print()
print("===== ESTIMATED TOTALS =====")
print()

light = t_face + t_hand
heavy_current = t_face + t_hand + t_yolos + t_belt
heavy_nano_coco = t_face + t_hand + t_yolon + t_belt

print(f"Light frame (Face + Hand only):             ~{light:7.0f} ms")
print(f"   (Reference only — 1 fps plan uses heavy frame for every capture.)")
print()
print(f"Heavy frame (Face + Hand + both YOLO 8s):   ~{heavy_current:7.0f} ms")
print(f"   Need < 1000 ms to hit 1 fps for YOLOs:    {'OK' if heavy_current < 1000 else 'TOO SLOW'}")
print()
print(f"Heavy frame (with yolov8n COCO + 8s seatbelt): ~{heavy_nano_coco:7.0f} ms")
print(f"   Need < 1000 ms:                            {'OK' if heavy_nano_coco < 1000 else 'TOO SLOW'}")
print()

print("===== 1 FPS PLAN VIABILITY =====")
print(f"At 1 fps capture, every frame is heavy (~{heavy_current:.0f} ms).")
print(f"   Need <1000 ms: {'OK' if heavy_current < 1000 else 'TOO SLOW (will require drop-stale)'}")
print(f"Effective max sustainable fps: {1000 / heavy_current:.2f}")

face_landmarker.close()
hand_landmarker.close()
print()
print("Done.")
