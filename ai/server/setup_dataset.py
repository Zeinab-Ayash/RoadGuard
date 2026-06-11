"""Move the Roboflow seatbelt zip from Downloads, extract it, and show structure."""

import os
import shutil
import zipfile
import glob

# Find the Roboflow zip in Downloads folder
downloads_dir = os.path.expanduser("~/Downloads")
zip_candidates = glob.glob(os.path.join(downloads_dir, "*eatbelt*.zip"))

if not zip_candidates:
    raise FileNotFoundError(
        f"No seatbelt zip found in {downloads_dir}. "
        "Make sure the download finished."
    )

# Pick the most recent one
zip_path = max(zip_candidates, key=os.path.getmtime)
print(f"Found: {zip_path}")

# Target folder in our project
dataset_dir = os.path.join("datasets", "seatbelt")
os.makedirs(dataset_dir, exist_ok=True)

# Extract directly into the target folder
print(f"Extracting to {dataset_dir}...")
with zipfile.ZipFile(zip_path, "r") as z:
    z.extractall(dataset_dir)
print("Extraction complete.")
print()

# Show the structure
print(f"Dataset structure:")
for root, dirs, files in os.walk(dataset_dir):
    level = root.replace(dataset_dir, "").count(os.sep)
    indent = "  " * level
    folder = os.path.basename(root) or "seatbelt"
    print(f"{indent}{folder}/")
    subindent = "  " * (level + 1)
    for f in sorted(files)[:5]:
        print(f"{subindent}{f}")
    if len(files) > 5:
        print(f"{subindent}... ({len(files) - 5} more files)")
