"""Frame analyzer orchestrator (Phase 3.6).

Loads all four models (MediaPipe Face Landmarker, MediaPipe Hand Landmarker,
YOLOv8s COCO, custom seatbelt YOLO) once, then exposes analyze(image_bgr) which
runs everything and returns the single highest-priority misbehavior (or None).

Priority order (Policy C — most specific wins, but safety first):
    1. Drowsiness        — critical safety (could crash)
    2. Phone Usage       — specific distraction cause
    3. Eating            — specific distraction cause
    4. Eyes Off Road     — generic distraction fallback
    5. No Seatbelt       — passive state, lowest priority

Capture rate: 1 fps. Every frame is heavy — runs all 4 models
(MediaPipe Face + Hand, YOLO COCO, YOLO Seatbelt). Asymmetric
sampling (heavy_every_n_frames > 1) is retained as an option for
future GPU deployment where 2 fps capture would be beneficial.

Returns:
    {
      "behavior": "Drowsiness" | "Phone Usage" | "Eating While Driving"
                  | "Eyes Off Road" | "No Seatbelt" | None,
      "flags": { drowsy, phone, eating, looking_away, no_seatbelt },  # raw booleans
      "debug": { ...per-detector debug values for logging/tuning... }
    }
"""

from concurrent.futures import ThreadPoolExecutor

import cv2
import mediapipe as mp
from ultralytics import YOLO

from detectors import (
    detect_drowsiness,
    detect_looking_away,
    detect_phone,
    detect_eating,
    detect_no_seatbelt,
    convert_to_grayscale_3ch,
)

FACE_MODEL_PATH = "models/face_landmarker.task"
HAND_MODEL_PATH = "models/hand_landmarker.task"
COCO_MODEL_PATH = "yolov8s.pt"
SEATBELT_MODEL_PATH = "models/seatbelt_v3.pt"


class FrameAnalyzer:
    """Loads all models once. Call .analyze(image_bgr) per frame.

    Default mode (N=1): every frame is heavy — all 4 models run on every
    frame. Matches the 1 fps capture plan for HF Spaces CPU deployment.

    Optional asymmetric mode (N>1): MediaPipe Face runs every frame, while
    MediaPipe Hand + both YOLO models run only every Nth frame; intermediate
    light frames reuse the cached heavy-frame YOLO results. Retained for
    future GPU deployment where 2 fps capture would be beneficial.
    """

    def __init__(self, heavy_every_n_frames: int = 1):
        # MediaPipe Face Landmarker — needs blendshapes + transform matrix
        face_opts = mp.tasks.vision.FaceLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=FACE_MODEL_PATH),
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            num_faces=1,
            output_face_blendshapes=True,
            output_facial_transformation_matrixes=True,
        )
        self.face_landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(face_opts)

        # MediaPipe Hand Landmarker — up to 2 hands
        hand_opts = mp.tasks.vision.HandLandmarkerOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=HAND_MODEL_PATH),
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            num_hands=2,
        )
        self.hand_landmarker = mp.tasks.vision.HandLandmarker.create_from_options(hand_opts)

        # YOLOv8s COCO for phone + food objects
        self.yolo_coco = YOLO(COCO_MODEL_PATH)

        # Custom seatbelt YOLO
        self.seatbelt_model = YOLO(SEATBELT_MODEL_PATH)

        # Thread pool used to run the 4 inference models in parallel inside
        # analyze(). PyTorch (YOLO) and MediaPipe both release the Python GIL
        # during native inference, so threads achieve real parallelism here.
        # 4 workers = one per model.
        self._pool = ThreadPoolExecutor(max_workers=4)

        # Asymmetric sampling state
        self.heavy_every_n_frames = heavy_every_n_frames
        self.frame_count = 0
        # Cached results from the most recent heavy frame
        self._cached_phone = (False, None)
        self._cached_eating = (False, {"hand_near": False, "hand_dist": None,
                                       "food": False, "food_name": None, "food_conf": None})
        self._cached_no_seatbelt = (False, None)

    def reset(self):
        """Reset frame counter and cached YOLO results.
        Call when starting a new driving session.
        """
        self.frame_count = 0
        self._cached_phone = (False, None)
        self._cached_eating = (False, {"hand_near": False, "hand_dist": None,
                                       "food": False, "food_name": None, "food_conf": None})
        self._cached_no_seatbelt = (False, None)

    def analyze(self, image_bgr):
        """Run detectors on a BGR numpy frame, return the priority winner.

        Default (N=1): every frame is heavy — all 4 models run.
        Optional (N>1): MediaPipe Face every frame, heavy detectors every
        Nth frame, cached results reused on intermediate light frames.

        image_bgr: numpy array (H, W, 3) — BGR format (cv2.imread default)
        """
        self.frame_count += 1
        # Heavy on frames 1, 1+N, 1+2N, ... (e.g., for N=2: frames 1, 3, 5, 7).
        # With the default N=1, every frame is heavy.
        is_heavy = ((self.frame_count - 1) % self.heavy_every_n_frames == 0)

        # MediaPipe expects RGB; YOLO seatbelt model expects 3-channel grayscale.
        # Prepare the three input variants once.
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        gray_3ch = convert_to_grayscale_3ch(image_bgr)

        if is_heavy:
            # ── PARALLEL INFERENCE ─────────────────────────────────────────
            # Submit all 4 models to the thread pool at once. Each releases the
            # Python GIL during its native inference call, so the total wall
            # time is bounded by the slowest model (YOLOv8s COCO, ~500 ms)
            # instead of the sum (~1000 ms).
            face_future     = self._pool.submit(self.face_landmarker.detect, mp_image)
            hand_future     = self._pool.submit(self.hand_landmarker.detect, mp_image)
            coco_future     = self._pool.submit(self.yolo_coco,     image_bgr, verbose=False)
            seatbelt_future = self._pool.submit(self.seatbelt_model, gray_3ch, verbose=False)

            face_result      = face_future.result()
            hand_result      = hand_future.result()
            yolo_results     = coco_future.result()[0]
            seatbelt_results = seatbelt_future.result()[0]
        else:
            # Light frame — only MediaPipe Face is needed (drowsy + eyes-off).
            face_result = self.face_landmarker.detect(mp_image)
            hand_result = None
            yolo_results = None
            seatbelt_results = None

        # Extract face outputs (used by drowsy, eyes-off, eating)
        landmarks = face_result.face_landmarks[0] if face_result.face_landmarks else None
        blendshapes = face_result.face_blendshapes[0] if face_result.face_blendshapes else None
        transform_matrix = (
            face_result.facial_transformation_matrixes[0]
            if face_result.facial_transformation_matrixes else None
        )

        # Light-frame detectors (run every frame)
        drowsy, drowsy_score = detect_drowsiness(landmarks, blendshapes)
        looking, yaw, pitch, roll = detect_looking_away(transform_matrix)

        if is_heavy:
            hand_landmarks_list = hand_result.hand_landmarks if hand_result.hand_landmarks else []
            phone, phone_conf = detect_phone(yolo_results)
            eating, eating_debug = detect_eating(landmarks, hand_landmarks_list, yolo_results)
            no_seatbelt, seat_conf = detect_no_seatbelt(seatbelt_results)

            # Update cache for the next light frames
            self._cached_phone = (phone, phone_conf)
            self._cached_eating = (eating, eating_debug)
            self._cached_no_seatbelt = (no_seatbelt, seat_conf)
        else:
            # Light frame — reuse cached YOLO results
            phone, phone_conf = self._cached_phone
            eating, eating_debug = self._cached_eating
            no_seatbelt, seat_conf = self._cached_no_seatbelt

        flags = {
            "drowsy": drowsy,
            "phone": phone,
            "eating": eating,
            "looking_away": looking,
            "no_seatbelt": no_seatbelt,
        }

        # Priority ladder — safety first, then specific causes
        if drowsy:
            behavior = "Drowsiness"
        elif phone:
            behavior = "Phone Usage"
        elif eating:
            behavior = "Eating While Driving"
        elif looking:
            behavior = "Eyes Off Road"
        elif no_seatbelt:
            behavior = "No Seatbelt"
        else:
            behavior = None

        return {
            "behavior": behavior,
            "flags": flags,
            "debug": {
                "drowsy_score": drowsy_score,
                "phone_conf": phone_conf,
                "eating": eating_debug,
                "yaw": yaw,
                "pitch": pitch,
                "roll": roll,
                "no_seatbelt_conf": seat_conf,
            },
        }

    def close(self):
        self.face_landmarker.close()
        self.hand_landmarker.close()
        self._pool.shutdown(wait=False, cancel_futures=True)
