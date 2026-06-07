"""
Re-split the patok-tok-patok/seatbelt-cuunt v2 dataset into 80/10/10 train/valid/test.

The second candidate dataset (work-xfknp/no-seatbelt-7duqi) was rejected because it is
99.4% no-seatbelt / 0.6% seatbelt — combining it would skew the class balance.

Input:   ai/server/combined_dataset/raw/ds1  (patok-tok-patok/seatbelt-cuunt v2, 4,696 images)
Outputs: ai/server/combined_dataset/{train,valid,test}/{images,labels}
         ai/server/combined_dataset/split_manifest.csv
         ai/server/combined_dataset/data.yaml
"""
import csv
import random
import shutil
from pathlib import Path

SEED = 42
SPLITS = {"train": 0.80, "valid": 0.10, "test": 0.10}

BASE = Path(__file__).parent
RAW = BASE / "raw"
OUT = BASE

SOURCES = [
    ("patok_v2", RAW / "ds1", ["train", "valid"]),
]


def collect_pairs():
    """Return list of dicts: {source, orig_split, stem, img_path, lbl_path}."""
    pairs = []
    for source_id, root, orig_splits in SOURCES:
        for orig_split in orig_splits:
            img_dir = root / orig_split / "images"
            lbl_dir = root / orig_split / "labels"
            if not img_dir.exists():
                continue
            for img_path in sorted(img_dir.iterdir()):
                if img_path.suffix.lower() not in (".jpg", ".jpeg", ".png"):
                    continue
                lbl_path = lbl_dir / (img_path.stem + ".txt")
                if not lbl_path.exists():
                    print(f"WARNING: missing label for {img_path.name}, skipping")
                    continue
                pairs.append({
                    "source": source_id,
                    "orig_split": orig_split,
                    "stem": img_path.stem,
                    "img_path": img_path,
                    "lbl_path": lbl_path,
                })
    return pairs


def make_clean_dirs():
    """Recreate train/valid/test/{images,labels}, removing any stale content."""
    for split in SPLITS:
        for sub in ("images", "labels"):
            d = OUT / split / sub
            if d.exists():
                shutil.rmtree(d)
            d.mkdir(parents=True, exist_ok=True)


def assign_splits(pairs):
    """Shuffle with fixed seed, then assign each pair to a split based on cumulative ratios."""
    rng = random.Random(SEED)
    indices = list(range(len(pairs)))
    rng.shuffle(indices)

    n = len(indices)
    n_train = int(n * SPLITS["train"])
    n_valid = int(n * SPLITS["valid"])
    # test gets the remainder (handles rounding)

    assignments = {}
    for i, idx in enumerate(indices):
        if i < n_train:
            assignments[idx] = "train"
        elif i < n_train + n_valid:
            assignments[idx] = "valid"
        else:
            assignments[idx] = "test"
    return assignments


def copy_files(pairs, assignments):
    """Copy each pair into the assigned split. Prefix filename with source to avoid collisions."""
    counts = {"train": 0, "valid": 0, "test": 0}
    for idx, pair in enumerate(pairs):
        split = assignments[idx]
        new_stem = f"{pair['source']}__{pair['stem']}"
        img_dst = OUT / split / "images" / (new_stem + pair["img_path"].suffix)
        lbl_dst = OUT / split / "labels" / (new_stem + ".txt")
        shutil.copy2(pair["img_path"], img_dst)
        shutil.copy2(pair["lbl_path"], lbl_dst)
        counts[split] += 1
    return counts


def write_manifest(pairs, assignments):
    """Write a CSV listing every file's source + original split + assigned split."""
    manifest_path = OUT / "split_manifest.csv"
    with open(manifest_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["source", "original_split", "original_stem", "assigned_split"])
        for idx, pair in enumerate(pairs):
            writer.writerow([pair["source"], pair["orig_split"], pair["stem"], assignments[idx]])
    return manifest_path


def write_data_yaml():
    """Write the YOLO data.yaml for the combined dataset."""
    yaml_path = OUT / "data.yaml"
    abs_path = str(OUT.resolve()).replace("\\", "/")
    content = f"""path: {abs_path}
train: train/images
val: valid/images
test: test/images

nc: 2
names: ['no-seatbelt', 'seatbelt']

# Dataset: patok-tok-patok/seatbelt-cuunt v2 (4,696 images, 50/50 class balance)
# Re-split 80/10/10 train/valid/test for held-out test evaluation.
# Random seed: {SEED}
"""
    yaml_path.write_text(content, encoding="utf-8")
    return yaml_path


def main():
    print(f"Random seed: {SEED}")
    print()

    print("Collecting (image, label) pairs from both datasets...")
    pairs = collect_pairs()
    print(f"Total pairs collected: {len(pairs)}")
    print()

    # Count per source
    by_source = {}
    for p in pairs:
        by_source.setdefault(p["source"], 0)
        by_source[p["source"]] += 1
    for src, n in by_source.items():
        print(f"  {src}: {n} pairs")
    print()

    print("Creating clean output folders...")
    make_clean_dirs()

    print(f"Assigning splits ({SPLITS})...")
    assignments = assign_splits(pairs)

    print("Copying files (this takes a minute)...")
    counts = copy_files(pairs, assignments)
    print()
    print("=== FINAL SPLIT COUNTS ===")
    for split, n in counts.items():
        pct = 100 * n / sum(counts.values())
        print(f"  {split}: {n} images ({pct:.1f}%)")
    print(f"  total: {sum(counts.values())}")
    print()

    manifest = write_manifest(pairs, assignments)
    print(f"Manifest written: {manifest}")

    yaml_path = write_data_yaml()
    print(f"data.yaml written: {yaml_path}")

    print()
    print("DONE.")


if __name__ == "__main__":
    main()
