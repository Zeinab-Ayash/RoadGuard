from ultralytics import YOLO

IMAGE_PATH = "test_images/phone_usage.jpg"

print("Loading YOLOv8s model (will auto-download ~22MB on first run)...")
model = YOLO("yolov8s.pt")

print(f"Running detection on {IMAGE_PATH}...")
results = model(IMAGE_PATH, verbose=False)

for r in results:
    boxes = r.boxes
    if boxes is None or len(boxes) == 0:
        print("❌ No objects detected.")
    else:
        print(f"✅ Detected {len(boxes)} object(s):")
        for box in boxes:
            cls_id = int(box.cls)
            conf = float(box.conf)
            cls_name = model.names[cls_id]
            print(f"  - {cls_name:<20} confidence: {conf:.2%}")
