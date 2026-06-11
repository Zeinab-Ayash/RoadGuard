"""Download the seatbelt dataset from Kaggle and show its structure."""

import os
import kagglehub

DATASET_HANDLE = "sachinmlwala/seatbelt"

print(f"Downloading dataset: {DATASET_HANDLE}")
print("(First run will download ~50-300 MB depending on the dataset)")
print()

path = kagglehub.dataset_download(DATASET_HANDLE)

print()
print(f"✅ Downloaded to: {path}")
print()
print("Dataset structure (first 5 files per folder):")
print()

for root, dirs, files in os.walk(path):
    level = root.replace(path, '').count(os.sep)
    indent = '  ' * level
    folder_name = os.path.basename(root) or os.path.basename(path)
    print(f"{indent}{folder_name}/")
    subindent = '  ' * (level + 1)
    for f in sorted(files)[:5]:
        print(f"{subindent}{f}")
    if len(files) > 5:
        print(f"{subindent}... ({len(files) - 5} more files)")
