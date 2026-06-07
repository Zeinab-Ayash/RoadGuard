"""Train YOLOv8s on the seatbelt dataset.

Production model `models/seatbelt_v2.pt` was trained on Google Colab (Tesla T4
GPU) using the patok-tok-patok/seatbelt-cuunt v2 Roboflow dataset (4696 in-cabin
driver images, classes: ['no-seatbelt', 'seatbelt']). Final results: mAP50=0.888
(seatbelt class: 0.962, no-seatbelt class: 0.814).

This script is the local fallback. CPU training on the 4700-image dataset takes
~10+ hours, so Colab is strongly preferred. See Colab steps in the project documentation.
"""

from ultralytics import YOLO

model = YOLO("yolov8s.pt")

results = model.train(
    data="datasets/seatbelt_v2/data.yaml",
    epochs=50,
    imgsz=640,
    batch=16,
    name="seatbelt-yolov8s-bigdata",
    patience=10,
    save=True,
    verbose=True,
)

print()
print("Training complete.")
print(f"Best weights saved to: {results.save_dir}/weights/best.pt")
print("Copy that file to: ai/server/models/seatbelt_v2.pt")
