import os
import urllib.request
import mediapipe as mp

MODEL_PATH = "models/face_landmarker.task"
MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
IMAGE_PATH = "test_images/face.jpg"

# Download the MediaPipe model if not already cached
if not os.path.exists(MODEL_PATH):
    os.makedirs("models", exist_ok=True)
    print("Downloading face landmarker model (~3 MB)...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Download complete.")

print(f"Loading {IMAGE_PATH}...")

options = mp.tasks.vision.FaceLandmarkerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=mp.tasks.vision.RunningMode.IMAGE,
    num_faces=1,
)

with mp.tasks.vision.FaceLandmarker.create_from_options(options) as landmarker:
    image = mp.Image.create_from_file(IMAGE_PATH)
    result = landmarker.detect(image)

if not result.face_landmarks:
    print("❌ No face detected.")
else:
    landmarks = result.face_landmarks[0]
    print(f"✅ Face detected with {len(landmarks)} landmarks")
    print(f"  Landmark 33  (left eye outer):  x={landmarks[33].x:.3f}, y={landmarks[33].y:.3f}")
    print(f"  Landmark 263 (right eye outer): x={landmarks[263].x:.3f}, y={landmarks[263].y:.3f}")
    print(f"  Landmark 1   (nose tip):        x={landmarks[1].x:.3f}, y={landmarks[1].y:.3f}")
