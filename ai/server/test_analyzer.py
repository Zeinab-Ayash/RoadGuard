"""Test the FrameAnalyzer orchestrator on the test images.

Verifies that analyze() returns the correct WINNING behavior per the
priority ladder when given each test image.
"""

import os
import cv2
from analyzer import FrameAnalyzer

TEST_IMAGES_DIR = "test_images"

# Expected WINNER per image (priority ladder applied):
# 1. Drowsiness 2. Phone Usage 3. Eating 4. Eyes Off Road 5. No Seatbelt
EXPECTED = {
    "drowsiness.jpg":           "Drowsiness",
    "phone_usage.jpg":          "Phone Usage",
    "eating_while_driving.jpg": "Eating While Driving",
    "eyes_off_road.jpg":        "Eyes Off Road",
    "no_seatbelt.jpg":          None,            # has seatbelt despite filename
    "face.jpg":                 None,            # no misbehavior
}


print("Loading models...")
# Use heavy_every_n_frames=1 so each test image gets full detection
# (don't let YOLO results from one image leak into another via cache).
analyzer = FrameAnalyzer(heavy_every_n_frames=1)
print("Models ready.\n")

print("=" * 100)
print(f"{'Image':<32}{'Detected behavior':<28}{'Expected':<28}{'OK/FAIL':<10}")
print("-" * 100)

correct = total = 0
for filename in sorted(os.listdir(TEST_IMAGES_DIR)):
    if not filename.endswith((".jpg", ".png", ".jpeg")):
        continue

    path = os.path.join(TEST_IMAGES_DIR, filename)
    image_bgr = cv2.imread(path)

    result = analyzer.analyze(image_bgr)
    detected = result["behavior"]
    expected = EXPECTED.get(filename, "?")

    correct_str = "OK" if detected == expected else "FAIL"
    if detected == expected:
        correct += 1
    total += 1

    detected_str = detected if detected else "(no misbehavior)"
    expected_str = expected if expected else "(no misbehavior)"
    print(f"{filename:<32}{detected_str:<28}{expected_str:<28}{correct_str:<10}")

print("-" * 100)
print(f"{'Orchestrator accuracy':<32}{'':<28}{'':<28}{f'{correct}/{total}':<10}")
print()

# Also print the flags for each image — useful to verify priority ladder
print("=" * 100)
print("Per-image flag breakdown (raw detector outputs)")
print("=" * 100)
print(f"{'Image':<32}{'drowsy':<8}{'phone':<8}{'eating':<8}{'looking':<8}{'no_seat':<8}")
print("-" * 100)

for filename in sorted(os.listdir(TEST_IMAGES_DIR)):
    if not filename.endswith((".jpg", ".png", ".jpeg")):
        continue
    path = os.path.join(TEST_IMAGES_DIR, filename)
    image_bgr = cv2.imread(path)
    result = analyzer.analyze(image_bgr)
    f = result["flags"]
    print(f"{filename:<32}"
          f"{str(f['drowsy']):<8}"
          f"{str(f['phone']):<8}"
          f"{str(f['eating']):<8}"
          f"{str(f['looking_away']):<8}"
          f"{str(f['no_seatbelt']):<8}")

analyzer.close()
print()
print("Done.")
