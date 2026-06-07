"""Dry-run: simulate 80/10/10 split on patok v2 and report class balance per split."""
import random
from pathlib import Path

SEED = 42
BASE = Path(__file__).parent / "raw" / "ds1"

# Collect (stem, c0_count, c1_count) for every label file
pairs = []
for split in ["train", "valid"]:
    lbl_dir = BASE / split / "labels"
    for txt in sorted(lbl_dir.glob("*.txt")):
        c0 = c1 = 0
        for line in txt.read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            cls = int(line.split()[0])
            if cls == 0:
                c0 += 1
            elif cls == 1:
                c1 += 1
        pairs.append({"stem": txt.stem, "c0": c0, "c1": c1})

n = len(pairs)
print(f"Total images: {n}")

rng = random.Random(SEED)
indices = list(range(n))
rng.shuffle(indices)

n_train = int(n * 0.80)
n_valid = int(n * 0.10)

splits = {"train": [], "valid": [], "test": []}
for i, idx in enumerate(indices):
    if i < n_train:
        splits["train"].append(pairs[idx])
    elif i < n_train + n_valid:
        splits["valid"].append(pairs[idx])
    else:
        splits["test"].append(pairs[idx])

print()
print("=" * 70)
print(f"{'Split':<8}{'Images':>10}{'no-seatbelt':>16}{'seatbelt':>14}{'balance':>14}")
print("=" * 70)
for name, items in splits.items():
    n_imgs = len(items)
    c0 = sum(p["c0"] for p in items)
    c1 = sum(p["c1"] for p in items)
    total = c0 + c1
    pct0 = 100 * c0 / total if total else 0
    pct1 = 100 * c1 / total if total else 0
    print(f"{name:<8}{n_imgs:>10}{c0:>11} ({pct0:>4.1f}%){c1:>9} ({pct1:>4.1f}%){pct0:>6.1f}/{pct1:<5.1f}")

print("=" * 70)
total_imgs = sum(len(v) for v in splits.values())
all_c0 = sum(p["c0"] for v in splits.values() for p in v)
all_c1 = sum(p["c1"] for v in splits.values() for p in v)
grand = all_c0 + all_c1
print(f"{'TOTAL':<8}{total_imgs:>10}{all_c0:>11} ({100*all_c0/grand:>4.1f}%){all_c1:>9} ({100*all_c1/grand:>4.1f}%)")
