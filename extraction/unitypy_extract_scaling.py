#!/usr/bin/env python3
"""
unitypy_extract_scaling.py — UnityPy-based replacement for mt2_extract_scaling.py.

Uses UnityPy for object enumeration; positional byte reads for MonoBehaviour fields
(no type trees in this build). Output is identical to mt2_extract_scaling.py.

Usage:  python3 unitypy_extract_scaling.py [DATA_DIR] [--out OUTDIR]
"""
import sys, os, re, json
import UnityPy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mt2_lib import find_data_dir

EFF = b"RelicEffectModifyCharacterAttackOrHealthPercentage"
SUB = b"SubtypesData_"

TARGETS = {
    "SoulSavior_DifficultyTier2",
    "SoulSavior_DifficultyTier3",
    "SoulSavior_RunDistance1",
    "SoulSavior_RunDistance2",
    "SoulSavior_RunDistance3",
}

ORDER = [
    "SoulSavior_DifficultyTier2",
    "SoulSavior_DifficultyTier3",
    "SoulSavior_RunDistance1",
    "SoulSavior_RunDistance2",
    "SoulSavior_RunDistance3",
]

LABEL = {
    "SoulSavior_DifficultyTier2": "Tangle (difficulty)",
    "SoulSavior_DifficultyTier3": "Overgrowth (difficulty)",
    "SoulSavior_RunDistance1":    "RunDistance1 (O2)",
    "SoulSavior_RunDistance2":    "RunDistance2 (O3)",
    "SoulSavior_RunDistance3":    "RunDistance3 (O4)",
}


def dump_mutator(raw: bytes):
    entries = []
    for m in re.finditer(re.escape(EFF), raw):
        p = (m.start() + len(EFF) + 3) & ~3
        q = p
        fields = []
        sub = "?"
        for _ in range(24):
            ln = int.from_bytes(raw[q:q + 4], "little")
            if 0 < ln < 80 and raw[q + 4: q + 4 + 13] == SUB:
                sub = raw[q + 4: q + 4 + ln].decode()
                break
            fields.append(int.from_bytes(raw[q:q + 4], "little", signed=True))
            q += 4
        pct = fields[1] if len(fields) > 1 else None
        sub = sub.replace("SubtypesData_SoulSavior_", "").replace("SubtypesData_", "").replace("_Enemy", "")
        entries.append((sub, pct))

    # Two positional groups: Set A (no Support) = Health, Set B (with Support) = Attack.
    # Boundary detected when a subtype appears for the second time.
    setA, setB, cur = {}, {}, "A"
    for sub, pct in entries:
        if cur == "A" and sub in setA:
            cur = "B"
        (setA if cur == "A" else setB)[sub] = pct
    return entries, setA, setB


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    outdir = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "."
    data_dir = args[0] if args else find_data_dir(".")

    env = UnityPy.load(os.path.join(data_dir, "sharedassets0.assets"))

    found = {}
    for obj in env.objects:
        if obj.type.name != "MonoBehaviour":
            continue
        name = obj.peek_name()
        if name not in TARGETS:
            continue
        raw = obj.get_raw_data()
        if raw:
            found[name] = raw

    result = {}
    for nm in ORDER:
        if nm not in found:
            print(f"!! {nm} NOT FOUND (new patch may have renamed it)")
            continue
        _, setA, setB = dump_mutator(found[nm])
        result[nm] = dict(setA_health=setA, setB_attack=setB)
        print(f"\n== {LABEL[nm]}  ({nm}) ==")
        print(f"   Set A / HEALTH (no Support): {setA}")
        print(f"   Set B / ATTACK (with Support): {setB}")

    os.makedirs(outdir, exist_ok=True)
    out_path = os.path.join(outdir, "scaling_unitypy.json")
    with open(out_path, "w") as f:
        json.dump(result, f, indent=1)
    print(f"\nwrote {out_path}")
    print("Bloom (DifficultyTier1) has no object = baseline / no change.")


if __name__ == "__main__":
    main()
