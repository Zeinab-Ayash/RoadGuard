"""
=============================================================================
COLAB TRAINING CELLS — SEATBELT YOLOv8s v3 RETRAIN
=============================================================================

Open a fresh Google Colab notebook (https://colab.research.google.com → New notebook).

IMPORTANT: First, switch runtime to GPU:
    Runtime → Change runtime type → Hardware accelerator → T4 GPU → Save

Then copy each numbered cell below into its own Colab cell, top to bottom.
Run cells in order: Cell 1 → Cell 2 → Cell 3 → Cell 4 → Cell 5 → Cell 6.

Total expected time: ~1.5 hours (Cell 4 is the long one).

Dataset to upload: ai/server/combined_dataset.zip (189 MB)
"""


# =============================================================================
# CELL 1 — SETUP (install ultralytics, verify GPU)
# Expected runtime: ~30 seconds
# =============================================================================
!pip install -q ultralytics

import torch
from ultralytics import YOLO

print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available:  {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU detected:    {torch.cuda.get_device_name(0)}")
    print(f"VRAM:            {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
else:
    print("WARNING: No GPU detected!")
    print("Fix: Runtime menu → Change runtime type → T4 GPU → Save → Run this cell again")


# =============================================================================
# CELL 2 — UPLOAD + EXTRACT DATASET
# Click "Choose Files" when prompted, select combined_dataset.zip from your laptop
# Expected runtime: ~1-3 minutes (depends on upload speed)
# =============================================================================
from google.colab import files

print("Click 'Choose Files' and upload combined_dataset.zip from your laptop...")
uploaded = files.upload()

zip_name = list(uploaded.keys())[0]
print(f"\nUploaded: {zip_name}")

!mkdir -p /content/dataset
!unzip -q -o "{zip_name}" -d /content/dataset

print("\nExtracted contents:")
!ls /content/dataset


# =============================================================================
# CELL 3 — FIX data.yaml FOR COLAB PATHS
# Rewrites data.yaml so YOLO can find the splits in /content/dataset/
# Expected runtime: instant
# =============================================================================
data_yaml = """path: /content/dataset
train: train/images
val: valid/images
test: test/images

nc: 2
names: ['no-seatbelt', 'seatbelt']
"""

with open("/content/dataset/data.yaml", "w") as f:
    f.write(data_yaml)

print("=== data.yaml ===")
!cat /content/dataset/data.yaml
print()
print("=== Image counts per split ===")
!echo "  train: $(ls /content/dataset/train/images | wc -l)"
!echo "  valid: $(ls /content/dataset/valid/images | wc -l)"
!echo "  test:  $(ls /content/dataset/test/images | wc -l)"


# =============================================================================
# CELL 4 — TRAIN YOLOv8s FROM SCRATCH (~1.5 hours on T4 GPU)
# Same hyperparameters as the original training for a fair comparison.
# Expected runtime: ~1.0 to 1.5 hours
# =============================================================================
from ultralytics import YOLO

# Start from COCO-pretrained yolov8s (NOT from your old seatbelt_v2.pt)
# This ensures a fair, from-scratch retrain on the new split
model = YOLO("yolov8s.pt")

results = model.train(
    data="/content/dataset/data.yaml",
    epochs=50,
    imgsz=640,
    batch=16,
    patience=10,
    name="seatbelt-yolov8s-v3",
    save=True,
    verbose=True,
    seed=42,
)

print()
print("=" * 70)
print("TRAINING COMPLETE")
print("=" * 70)
print(f"Best weights saved to: {results.save_dir}/weights/best.pt")
print(f"Last weights saved to: {results.save_dir}/weights/last.pt")


# =============================================================================
# CELL 5 — EVALUATE ON ALL 3 SPLITS (train + valid + test)
# Runs yolo val on each split to get full metrics for the report.
# Expected runtime: ~3-5 minutes total on GPU.
# =============================================================================
from ultralytics import YOLO

RUN_DIR = "/content/runs/detect/seatbelt-yolov8s-v3"
best_pt = f"{RUN_DIR}/weights/best.pt"

model = YOLO(best_pt)

summary = {}
for split in ["train", "val", "test"]:
    print()
    print("=" * 70)
    print(f"EVALUATING ON: {split.upper()} SPLIT")
    print("=" * 70)
    res = model.val(
        data="/content/dataset/data.yaml",
        split=split,
        name=f"eval-{split}",
        verbose=True,
        save_json=False,
        plots=True,
    )
    P = float(res.box.mp)
    R = float(res.box.mr)
    F1 = 2 * P * R / (P + R) if (P + R) > 0 else 0.0
    summary[split] = {
        "P": P,
        "R": R,
        "F1": F1,
        "mAP50": float(res.box.map50),
        "mAP50-95": float(res.box.map),
        "per_class_P": [float(x) for x in res.box.p],
        "per_class_R": [float(x) for x in res.box.r],
        "per_class_mAP50": [float(x) for x in res.box.maps],
    }

# Print one consolidated table
print()
print("=" * 80)
print("CONSOLIDATED METRICS — all 3 splits")
print("=" * 80)
print(f"{'Split':<8}{'P':>10}{'R':>10}{'F1':>10}{'mAP50':>10}{'mAP50-95':>12}")
print("-" * 80)
for split, m in summary.items():
    print(f"{split:<8}{m['P']:>10.4f}{m['R']:>10.4f}{m['F1']:>10.4f}{m['mAP50']:>10.4f}{m['mAP50-95']:>12.4f}")

# Save summary as JSON so the laptop can read it later
import json
with open(f"{RUN_DIR}/metrics_all_splits.json", "w") as f:
    json.dump(summary, f, indent=2)
print(f"\nSaved: {RUN_DIR}/metrics_all_splits.json")


# =============================================================================
# CELL 6 — DOWNLOAD WEIGHTS + ALL ARTIFACTS
# Bundles every relevant file and downloads to your laptop.
# Expected runtime: ~30 seconds
# =============================================================================
import shutil
from google.colab import files

RUN_DIR = "/content/runs/detect/seatbelt-yolov8s-v3"

print("=== Output files ===")
!ls -lh "{RUN_DIR}/weights/"
print()
!ls "{RUN_DIR}/" | grep -E '\.(png|jpg|csv|yaml|json)$'
print()

# Bundle EVERYTHING: weights + plots + results.csv + args.yaml + metrics_all_splits.json
# Plus the eval-train, eval-val, eval-test folders (each has its own plots and confusion matrix)
shutil.make_archive("/content/seatbelt_v3_run", "zip", "/content/runs/detect")

print("Downloading...")
print("  1. best.pt (trained weights — replaces seatbelt_v2.pt)")
print("  2. seatbelt_v3_run.zip (all training + eval artifacts)")
print()

files.download(f"{RUN_DIR}/weights/best.pt")
files.download("/content/seatbelt_v3_run.zip")

print("\nDONE.")
print()
print("On your laptop, save the files to:")
print("  best.pt              → ai/server/models/seatbelt_v3.pt  (rename it)")
print("  seatbelt_v3_run.zip  → ai/server/training_runs/seatbelt_v3_run/")
