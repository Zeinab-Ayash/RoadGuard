"""Test all detectors against the images in test_images/."""

import os
import cv2
import mediapipe as mp
from ultralytics import YOLO
from detectors import (
    detect_drowsiness_ear,
    detect_drowsiness_blendshape,
    detect_looking_away,
    detect_phone,
    detect_no_seatbelt,
    detect_eating,
    convert_to_grayscale_3ch,
)

MODEL_PATH = "models/face_landmarker.task"
TEST_IMAGES_DIR = "test_images"

# Enable blendshapes AND facial transformation matrix
mp_options = mp.tasks.vision.FaceLandmarkerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=mp.tasks.vision.RunningMode.IMAGE,
    num_faces=1,
    output_face_blendshapes=True,
    output_facial_transformation_matrixes=True,
)
face_landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(mp_options)

# Hand Landmarker for eating detection
hand_options = mp.tasks.vision.HandLandmarkerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path="models/hand_landmarker.task"),
    running_mode=mp.tasks.vision.RunningMode.IMAGE,
    num_hands=2,
)
hand_landmarker = mp.tasks.vision.HandLandmarker.create_from_options(hand_options)

# YOLOv8s COCO model (for phone, food, etc.)
print("Loading YOLOv8s...")
yolo_model = YOLO("yolov8s.pt")

# Custom seatbelt model
print("Loading seatbelt_v2.pt...")
seatbelt_model = YOLO("models/seatbelt_v2.pt")
print()

# Ground truth — separate flag per behavior
GROUND_TRUTH = {
    "drowsiness.jpg":            {"drowsy": True,  "looking_away": False, "phone": False, "no_seatbelt": False, "eating": False,
                                  "note": "eyes closed, forward"},
    "face.jpg":                  {"drowsy": False, "looking_away": False, "phone": False, "no_seatbelt": False, "eating": False,
                                  "note": "smile-squint, forward"},
    "phone_usage.jpg":           {"drowsy": False, "looking_away": False, "phone": True,  "no_seatbelt": False, "eating": False,
                                  "note": "phone visible in hands"},
    "no_seatbelt.jpg":           {"drowsy": False, "looking_away": False, "phone": False, "no_seatbelt": False, "eating": False,
                                  "note": "ref image (named for misbehavior, has seatbelt)"},
    "eating_while_driving.jpg":  {"drowsy": False, "looking_away": False, "phone": False, "no_seatbelt": False, "eating": True,
                                  "note": "eating - hand near mouth + food"},
    "eyes_off_road.jpg":         {"drowsy": False, "looking_away": True,  "phone": False, "no_seatbelt": False, "eating": False,
                                  "note": "head turned sideways"},
}


print("=" * 110)
print("DROWSINESS test (3.1)")
print("=" * 110)
print(f"{'Image':<32}{'EAR result':<22}{'Blendshape result':<22}{'Truth':<32}")
print("-" * 110)

image_files = sorted(
    f for f in os.listdir(TEST_IMAGES_DIR) if f.endswith((".jpg", ".png", ".jpeg"))
)

ear_correct = blend_correct = look_correct = phone_correct = seatbelt_correct = eating_correct = total = 0
results_for_summary = []

for filename in image_files:
    path = os.path.join(TEST_IMAGES_DIR, filename)

    # MediaPipe face
    mp_image = mp.Image.create_from_file(path)
    result = face_landmarker.detect(mp_image)

    # MediaPipe hands
    hand_result = hand_landmarker.detect(mp_image)

    # YOLO (COCO) on color frame
    yolo_results = yolo_model(path, verbose=False)[0]

    # Seatbelt model — convert to grayscale-3ch first
    image_bgr = cv2.imread(path)
    image_gray = convert_to_grayscale_3ch(image_bgr)
    seatbelt_results = seatbelt_model(image_gray, verbose=False)[0]

    truth = GROUND_TRUTH.get(filename, {})
    truth_drowsy = truth.get("drowsy", False)
    truth_looking = truth.get("looking_away", False)
    truth_phone = truth.get("phone", False)
    truth_seatbelt = truth.get("no_seatbelt", False)
    truth_eating = truth.get("eating", False)
    note = truth.get("note", "")

    if not result.face_landmarks:
        print(f"{filename:<32}{'no face':<22}{'no face':<22}{note:<32}")
        # Can still test phone + seatbelt even with no face
        phone_visible, phone_conf = detect_phone(yolo_results)
        no_seat, seat_conf = detect_no_seatbelt(seatbelt_results)
        if phone_visible == truth_phone: phone_correct += 1
        if no_seat == truth_seatbelt: seatbelt_correct += 1
        total += 1
        results_for_summary.append({
            "filename": filename, "truth_looking": False, "looking": False,
            "yaw": 0, "pitch": 0, "note": note,
            "phone": phone_visible, "phone_conf": phone_conf, "truth_phone": truth_phone,
            "no_seatbelt": no_seat, "seat_conf": seat_conf, "truth_seatbelt": truth_seatbelt,
        })
        continue

    landmarks = result.face_landmarks[0]
    blendshapes = result.face_blendshapes[0] if result.face_blendshapes else None
    transform_matrix = (
        result.facial_transformation_matrixes[0]
        if result.facial_transformation_matrixes else None
    )

    # Hand landmarks (list of hands, each has 21 landmarks)
    hand_landmarks_list = hand_result.hand_landmarks if hand_result.hand_landmarks else []

    # Run all detectors
    ear_drowsy, ear_val = detect_drowsiness_ear(landmarks)
    blend_drowsy, blend_val = detect_drowsiness_blendshape(blendshapes)
    looking, yaw, pitch, _roll = detect_looking_away(transform_matrix)
    phone_visible, phone_conf = detect_phone(yolo_results)
    no_seat, seat_conf = detect_no_seatbelt(seatbelt_results)
    eating, eating_debug = detect_eating(landmarks, hand_landmarks_list, yolo_results)

    ear_str = f"{'DROWSY' if ear_drowsy else 'alert':<8} ({ear_val:.3f})"
    blend_str = f"{'DROWSY' if blend_drowsy else 'alert':<8} ({blend_val:.3f})" if blend_val is not None else "no data"

    if ear_drowsy == truth_drowsy: ear_correct += 1
    if blend_drowsy == truth_drowsy: blend_correct += 1
    if looking == truth_looking: look_correct += 1
    if phone_visible == truth_phone: phone_correct += 1
    if no_seat == truth_seatbelt: seatbelt_correct += 1
    if eating == truth_eating: eating_correct += 1
    total += 1

    results_for_summary.append({
        "filename": filename,
        "truth_looking": truth_looking,
        "looking": looking,
        "yaw": yaw,
        "pitch": pitch,
        "note": note,
        "phone": phone_visible,
        "phone_conf": phone_conf,
        "truth_phone": truth_phone,
        "no_seatbelt": no_seat,
        "seat_conf": seat_conf,
        "truth_seatbelt": truth_seatbelt,
        "eating": eating,
        "eating_debug": eating_debug,
        "truth_eating": truth_eating,
    })

    print(f"{filename:<32}{ear_str:<22}{blend_str:<22}{note:<32}")

print("-" * 110)
print(f"{'Drowsy accuracy':<32}{f'{ear_correct}/{total}':<22}{f'{blend_correct}/{total}':<22}")
print()
print()


print("=" * 110)
print("LOOKING AWAY test (3.2)")
print("=" * 110)
print(f"{'Image':<32}{'Result':<22}{'Yaw / Pitch':<22}{'Truth':<32}")
print("-" * 110)

for r in results_for_summary:
    label = "LOOKING AWAY" if r["looking"] else "forward"
    expected = "LOOKING AWAY" if r["truth_looking"] else "forward"
    correct = "OK" if r["looking"] == r["truth_looking"] else "FAIL"
    angles = f"yaw={r['yaw']:+.1f}  pitch={r['pitch']:+.1f}"
    print(f"{r['filename']:<32}{label:<22}{angles:<22}{r['note']:<32} {correct}")

print("-" * 110)
print(f"{'Looking-away accuracy':<32}{f'{look_correct}/{total}':<22}")
print()
print()


print("=" * 110)
print("PHONE DETECTION test (3.4)")
print("=" * 110)
print(f"{'Image':<32}{'Result':<22}{'Confidence':<22}{'Truth':<32}")
print("-" * 110)

for r in results_for_summary:
    label = "PHONE" if r["phone"] else "no phone"
    expected = "PHONE" if r["truth_phone"] else "no phone"
    correct = "OK" if r["phone"] == r["truth_phone"] else "FAIL"
    conf_str = f"conf={r['phone_conf']:.3f}" if r["phone_conf"] else "no detection"
    print(f"{r['filename']:<32}{label:<22}{conf_str:<22}{r['note']:<32} {correct}")

print("-" * 110)
print(f"{'Phone accuracy':<32}{f'{phone_correct}/{total}':<22}")
print()
print()


print("=" * 110)
print("NO SEATBELT test (3.5)")
print("=" * 110)
print(f"{'Image':<32}{'Result':<22}{'Confidence':<22}{'Truth':<32}")
print("-" * 110)

for r in results_for_summary:
    label = "NO SEATBELT" if r["no_seatbelt"] else "seatbelt OK"
    conf_str = f"conf={r['seat_conf']:.3f}" if r["seat_conf"] else "no detection"
    correct = "OK" if r["no_seatbelt"] == r["truth_seatbelt"] else "FAIL"
    print(f"{r['filename']:<32}{label:<22}{conf_str:<22}{r['note']:<32} {correct}")

print("-" * 110)
print(f"{'No-seatbelt accuracy':<32}{f'{seatbelt_correct}/{total}':<22}")
print()
print()


print("=" * 110)
print("EATING test (3.3)")
print("=" * 110)
print(f"{'Image':<32}{'Result':<14}{'Hand dist':<14}{'Food':<22}{'Truth':<32}")
print("-" * 110)

for r in results_for_summary:
    label = "EATING" if r["eating"] else "not eating"
    correct = "OK" if r["eating"] == r["truth_eating"] else "FAIL"
    d = r["eating_debug"]
    hand_str = f"{d['hand_dist']:.3f}" if d['hand_dist'] is not None else "no hand"
    food_str = f"{d['food_name']} ({d['food_conf']:.2f})" if d['food'] else "no food"
    print(f"{r['filename']:<32}{label:<14}{hand_str:<14}{food_str:<22}{r['note']:<32} {correct}")

print("-" * 110)
print(f"{'Eating accuracy':<32}{f'{eating_correct}/{total}':<22}")
print()

face_landmarker.close()
hand_landmarker.close()
print("Done.")
