"""Per-behavior detection functions.

Each function takes the OUTPUT of one or more models (MediaPipe landmarks,
YOLO detections) and returns True/False for the current frame.

Duration filtering (e.g., must be drowsy for 2.0s, not just one frame) is
handled separately by BehaviorTracker in Phase 4 — these functions just
answer the instant question: "is this happening RIGHT NOW?"
"""

import math


# ============================================================
# DROWSINESS (3.1)
# ============================================================
# Eye Aspect Ratio (EAR) — Soukupová & Čech 2016
#
# For each eye, take 6 landmarks:
#   p1 — outer corner          p2 — upper-outer   p3 — upper-inner
#   p4 — inner corner          p5 — lower-inner   p6 — lower-outer
#
# EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
#
# When the eye is wide open, vertical distances are large → EAR ≈ 0.30
# When the eye closes,        vertical distances → 0      → EAR < 0.20
#
# We average BOTH eyes and check against the threshold. Both eyes
# averaging makes it more robust to single-eye occlusion (e.g., one eye
# partially hidden by glare or head turn).
# ============================================================

# Threshold per project spec
EAR_THRESHOLD = 0.20

# MediaPipe Face Mesh landmark indices for EAR.
# Standard, widely-cited indices.
LEFT_EYE = (33, 160, 158, 133, 153, 144)   # p1..p6 (subject's left, image right)
RIGHT_EYE = (362, 385, 387, 263, 373, 380)  # p1..p6 (subject's right, image left)


def _euclidean(a, b):
    """Euclidean distance between two MediaPipe landmark points (uses x, y)."""
    return math.hypot(a.x - b.x, a.y - b.y)


def _eye_aspect_ratio(landmarks, eye_indices):
    """Compute EAR for one eye given 6 landmark indices (p1..p6)."""
    p1, p2, p3, p4, p5, p6 = (landmarks[i] for i in eye_indices)
    vertical = _euclidean(p2, p6) + _euclidean(p3, p5)
    horizontal = _euclidean(p1, p4)
    if horizontal == 0:
        return 1.0  # degenerate — treat as "open" to avoid false alarm
    return vertical / (2.0 * horizontal)


def detect_drowsiness_ear(face_landmarks):
    """EAR-based drowsiness — return (is_drowsy, avg_ear)."""
    if not face_landmarks:
        return False, None
    left_ear = _eye_aspect_ratio(face_landmarks, LEFT_EYE)
    right_ear = _eye_aspect_ratio(face_landmarks, RIGHT_EYE)
    avg_ear = (left_ear + right_ear) / 2.0
    return avg_ear < EAR_THRESHOLD, avg_ear


# Blendshape-based drowsiness
# MediaPipe's eyeBlinkLeft and eyeBlinkRight are ML-derived 0.0–1.0 values
# where 0 = fully open and 1 = fully closed. Trained on diverse images,
# more robust to head angle than geometric EAR.
BLINK_THRESHOLD = 0.45  # tuned: drowsy image scores ~0.485, looking-down ~0.44


def detect_drowsiness_blendshape(face_blendshapes):
    """Blendshape-based drowsiness — return (is_drowsy, avg_blink).

    face_blendshapes: list of blendshape categories from MediaPipe (or None)
    """
    if not face_blendshapes:
        return False, None
    blink_left = None
    blink_right = None
    for bs in face_blendshapes:
        if bs.category_name == "eyeBlinkLeft":
            blink_left = bs.score
        elif bs.category_name == "eyeBlinkRight":
            blink_right = bs.score
    if blink_left is None or blink_right is None:
        return False, None
    avg_blink = (blink_left + blink_right) / 2.0
    return avg_blink > BLINK_THRESHOLD, avg_blink


# Default detect_drowsiness uses blendshape (assumed more robust);
# we'll switch back to EAR if testing shows otherwise.
def detect_drowsiness(face_landmarks, face_blendshapes=None):
    """Main API — uses blendshapes when available, falls back to EAR."""
    if face_blendshapes:
        return detect_drowsiness_blendshape(face_blendshapes)
    return detect_drowsiness_ear(face_landmarks)


# ============================================================
# LOOKING AWAY / HEAD POSE (3.2)
# ============================================================
# Uses MediaPipe's facialTransformationMatrix output — a 4×4 matrix that
# represents the head's 3D rotation/translation relative to the camera.
#
# The top-left 3×3 sub-matrix is a pure rotation matrix. We extract
# Euler angles (yaw, pitch, roll) from it. Convention used:
#   yaw   — rotation around Y-axis (head turning left/right)
#   pitch — rotation around X-axis (head tilting up/down)
#   roll  — rotation around Z-axis (head tilting sideways toward shoulder)
#
# Per project spec: looking away if |yaw| > 30° OR |pitch| > 30°.
# (We treat strong head-down as "eyes off road" — looking at lap/phone.)
# ============================================================

YAW_THRESHOLD = 35.0     # degrees — head turned left/right. Lowered from 40° to compensate for ~5° MediaPipe underestimation observed empirically. Aligned with Smart Eye / Mobileye commercial DMS thresholds (30-35°). 1.0 s duration filter catches the brief mirror checks at this range.
PITCH_THRESHOLD = 35.0   # degrees — head tilted up/down (above infotainment 25°, catches "looking at lap")


def _rotation_matrix_to_euler(R):
    """Extract Euler angles (yaw, pitch, roll) in degrees from a 3x3 rotation matrix.

    Labels are assigned by *physical head motion*, not by axis index:
        yaw   = head turn left/right  (rotation around the vertical Y axis)
        pitch = head nod up/down      (rotation around the lateral X axis)
        roll  = head tilt ear-to-shoulder (rotation around the depth Z axis)

    Empirically validated against MediaPipe Face Landmarker's transformation
    matrix: when the driver turns the head right ~45°, this function's `yaw`
    output goes to ~-50°; when nodding chin-to-chest, `pitch` changes; when
    tilting the head sideways, `roll` changes.
    """
    sy = math.sqrt(R[0, 0] ** 2 + R[1, 0] ** 2)
    singular = sy < 1e-6

    if not singular:
        yaw  = math.atan2(-R[2, 0], sy)          # head turn (was mislabeled "pitch")
        pitch = math.atan2(R[2, 1], R[2, 2])     # head nod  (was mislabeled "roll")
        roll = math.atan2(R[1, 0], R[0, 0])      # head tilt (was mislabeled "yaw")
    else:
        # Gimbal lock — head looking straight up/down. Rare in driving.
        yaw  = math.atan2(-R[2, 0], sy)
        pitch = 0.0
        roll = math.atan2(-R[0, 1], R[1, 1])

    return math.degrees(yaw), math.degrees(pitch), math.degrees(roll)


def detect_looking_away(transform_matrix):
    """Return (is_looking_away, yaw_deg, pitch_deg, roll_deg) for the current frame.

    transform_matrix: 4x4 numpy array from MediaPipe FaceLandmarker
                      (None if no face detected or option not enabled)

    Strategy:
        - Extract the 3x3 rotation matrix
        - Convert to Euler angles
        - Looking away if |yaw| > 40° OR |pitch| > 35°
    Roll is returned for diagnostic purposes only.
    """
    if transform_matrix is None:
        return False, None, None, None

    R = transform_matrix[:3, :3]
    yaw, pitch, roll = _rotation_matrix_to_euler(R)

    looking_away = abs(yaw) > YAW_THRESHOLD or abs(pitch) > PITCH_THRESHOLD
    return looking_away, yaw, pitch, roll


# ============================================================
# PHONE USAGE (3.4)
# ============================================================
# Uses YOLOv8s COCO output. COCO class 67 = "cell phone".
# Per project spec: confidence threshold ≥ 0.7
# ============================================================

PHONE_CONFIDENCE_THRESHOLD = 0.6
PHONE_COCO_CLASS_NAME = "cell phone"


def detect_phone(yolo_results):
    """Return (is_phone_visible, best_conf) for the current frame.

    yolo_results: an ultralytics Results object (results[0] of model(image))
                  or None if YOLO didn't run.

    Strategy:
        - Scan all boxes for class "cell phone"
        - Return True if any box has confidence >= threshold
        - Returns the highest matching confidence for debug/logging
    """
    if yolo_results is None or yolo_results.boxes is None:
        return False, None

    best_conf = 0.0
    for box in yolo_results.boxes:
        cls_id = int(box.cls[0])
        cls_name = yolo_results.names[cls_id]
        if cls_name == PHONE_COCO_CLASS_NAME:
            conf = float(box.conf[0])
            if conf > best_conf:
                best_conf = conf

    if best_conf == 0.0:
        return False, None

    return best_conf >= PHONE_CONFIDENCE_THRESHOLD, best_conf


# ============================================================
# NO SEATBELT (3.5)
# ============================================================
# Uses our custom-trained YOLOv8s seatbelt model (seatbelt_v3.pt).
# Classes: 0 = no-seatbelt, 1 = seatbelt
# Per project spec: confidence threshold ≥ 0.6 for class 0
#
# Trained on a mix of color + grayscale in-cabin images. In testing
# we found the model can over-confidently false-fire on out-of-
# distribution inputs (e.g., studio portraits, not-in-car shots).
# Converting frames to grayscale-3-channel reduces these false
# positives while keeping accuracy on real in-car frames. Use
# convert_to_grayscale_3ch() before passing frames to the model.
# ============================================================

NO_SEATBELT_CLASS_ID = 0
NO_SEATBELT_CONF_THRESHOLD = 0.6


def detect_no_seatbelt(seatbelt_yolo_results):
    """Return (is_no_seatbelt, best_conf) for the current frame.

    seatbelt_yolo_results: Results object from seatbelt_v3.pt inference
                            (results[0] of seatbelt_model(image))

    Strategy:
        - Scan boxes for class 0 (no-seatbelt)
        - Return True if any has confidence >= 0.6
    """
    if seatbelt_yolo_results is None or seatbelt_yolo_results.boxes is None:
        return False, None

    best_conf = 0.0
    for box in seatbelt_yolo_results.boxes:
        cls_id = int(box.cls[0])
        if cls_id == NO_SEATBELT_CLASS_ID:
            conf = float(box.conf[0])
            if conf > best_conf:
                best_conf = conf

    if best_conf == 0.0:
        return False, None

    return best_conf >= NO_SEATBELT_CONF_THRESHOLD, best_conf


def convert_to_grayscale_3ch(image_bgr):
    """Convert a color BGR image to grayscale, then back to 3 channels.

    Reduces false positives on the seatbelt model for out-of-distribution
    inputs. The model was trained on mixed color/grayscale data, so
    accuracy on real in-car frames is unchanged.
    """
    import cv2
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)


# ============================================================
# EATING WHILE DRIVING (3.3)
# ============================================================
# Combines THREE signals:
#   1. MediaPipe Face Landmarker — gives mouth center position
#   2. MediaPipe Hand Landmarker  — gives fingertip positions
#   3. YOLOv8s COCO               — detects food objects in scene
#
# Per project spec: eating = hand within ~50 px of mouth AND food object detected.
#
# Coordinate systems are NORMALIZED (0..1 of image dimensions) from both
# MediaPipe outputs, so distances are also in normalized units. We use
# a normalized threshold of 0.10 (≈ 10% of image height/width) which
# corresponds roughly to "fingertip within ~50 px on a 640x480 frame".
# ============================================================

# COCO class IDs for food/drink items
FOOD_CLASS_NAMES = {
    "sandwich", "banana", "apple", "orange", "carrot",
    "pizza", "donut", "cake", "hot dog", "broccoli",
    "bottle", "fork", "spoon",
    # "cup" removed — YOLO frequently misclassifies phones as cups, causing
    # eating to fire when the driver is on a phone call. The eating priority
    # is below phone in the ladder, but the false flag was distracting.
}

# Face landmark indices (mouth)
MOUTH_TOP = 13
MOUTH_BOTTOM = 14

# Hand landmark indices (fingertips)
HAND_FINGERTIPS = (4, 8, 12, 16, 20)  # thumb, index, middle, ring, pinky tips

# Normalized distance threshold for hand-near-mouth.
# 0.10 ≈ 10% of image dimension ≈ ~50 px on 480p frame.
HAND_NEAR_MOUTH_THRESHOLD = 0.10


def _mouth_center(face_landmarks):
    """Return (x, y) of mouth center in normalized coords (0..1)."""
    top = face_landmarks[MOUTH_TOP]
    bot = face_landmarks[MOUTH_BOTTOM]
    return ((top.x + bot.x) / 2.0, (top.y + bot.y) / 2.0)


def _hand_near_mouth(hand_landmarks_list, mouth_xy):
    """Return (is_near, min_distance) — minimum fingertip distance to mouth.

    hand_landmarks_list: list of detected hands, each containing landmarks
    """
    if not hand_landmarks_list:
        return False, None

    mx, my = mouth_xy
    min_dist = float("inf")
    for hand_lms in hand_landmarks_list:
        for tip_idx in HAND_FINGERTIPS:
            tip = hand_lms[tip_idx]
            dist = math.hypot(tip.x - mx, tip.y - my)
            if dist < min_dist:
                min_dist = dist

    if min_dist == float("inf"):
        return False, None
    return min_dist < HAND_NEAR_MOUTH_THRESHOLD, min_dist


def _food_detected(yolo_results):
    """Return (food_visible, name, conf, bbox) — best food detection in frame.

    bbox is the normalized (x1, y1, x2, y2) of the best detection, or None
    if no food was found. Normalized coordinates match MediaPipe Hand
    landmarks so the two can be compared directly without knowing frame size.
    """
    if yolo_results is None or yolo_results.boxes is None:
        return False, None, None, None

    best = None  # (name, conf, bbox)
    for box in yolo_results.boxes:
        cls_id = int(box.cls[0])
        cls_name = yolo_results.names[cls_id]
        if cls_name in FOOD_CLASS_NAMES:
            conf = float(box.conf[0])
            if best is None or conf > best[1]:
                xyxyn = box.xyxyn[0].tolist()  # normalized [x1, y1, x2, y2]
                best = (cls_name, conf, xyxyn)

    if best is None:
        return False, None, None, None
    return True, best[0], best[1], best[2]


def _hand_on_food(hand_landmarks_list, food_bbox):
    """Return True if any hand landmark falls inside the food bounding box.

    hand_landmarks_list: list of detected hands (each a list of 21 landmarks)
    food_bbox: normalized (x1, y1, x2, y2) from _food_detected, or None

    This is our "driver is holding the food" signal — more meaningful for the
    cabin context than hand-near-mouth, because just carrying food/drink in
    the car already counts as eating while driving. Food in frame WITHOUT a
    hand touching it is NOT considered eating (e.g., a bottle in a cupholder).
    """
    if not hand_landmarks_list or food_bbox is None:
        return False

    x1, y1, x2, y2 = food_bbox
    for hand_lms in hand_landmarks_list:
        for lm in hand_lms:
            if x1 <= lm.x <= x2 and y1 <= lm.y <= y2:
                return True
    return False


def detect_eating(face_landmarks, hand_landmarks_list, yolo_results):
    """Return (is_eating, debug_info).

    face_landmarks: list of 478 MediaPipe face landmarks (or None) — kept
        for diagnostic mouth-distance logging only; NOT part of the firing
        condition anymore.
    hand_landmarks_list: list of hands, each a list of 21 landmarks (or [])
    yolo_results: COCO YOLO Results object

    Logic: must BOTH be true:
        - At least one food/drink class detected by YOLO
        - At least one hand landmark falls inside that food's bounding box
          (i.e. the driver is HOLDING the food)

    Rationale: in a cabin, simply holding food/drink is "eating while
    driving" — the hand does NOT need to be at the mouth. Food in the
    frame without a hand on it (e.g. a bottle in the cupholder) is NOT
    eating.
    """
    debug = {
        "hand_near": False, "hand_dist": None,
        "food": False, "food_name": None, "food_conf": None,
        "hand_on_food": False,
    }

    food_visible, food_name, food_conf, food_bbox = _food_detected(yolo_results)
    debug["food"] = food_visible
    debug["food_name"] = food_name
    debug["food_conf"] = food_conf

    hand_on_food = _hand_on_food(hand_landmarks_list, food_bbox)
    debug["hand_on_food"] = hand_on_food

    # Hand-near-mouth still recorded for diagnostics — not part of the fire decision.
    if face_landmarks:
        mouth_xy = _mouth_center(face_landmarks)
        hand_near, hand_dist = _hand_near_mouth(hand_landmarks_list, mouth_xy)
        debug["hand_near"] = hand_near
        debug["hand_dist"] = hand_dist

    return (food_visible and hand_on_food), debug
