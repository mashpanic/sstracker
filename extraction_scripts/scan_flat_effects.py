#!/usr/bin/env python3
"""
scan_flat_effects.py — extract field values from flat-bonus effect types in
the SoulSavior mutator objects, looking for the additive HP/ATK constants.

Reads the same objects as mt2_extract_scaling.py and dumps all int32 fields
after each RelicEffectModifyCharacterAttackDamage and
RelicEffectModifyCharacterMaxHealth occurrence, until a SubtypesData_ name
is found — the same technique used for the percentage effect.

Usage:  python3 scan_flat_effects.py [DATA_DIR]
"""
import sys, os, re, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mt2_lib import parse_assets, read_mname, find_data_dir

FLAT_EFFS = [
    b'RelicEffectModifyCharacterAttackDamage',
    b'RelicEffectModifyCharacterMaxHealth',
]
PCT_EFF   = b'RelicEffectModifyCharacterAttackOrHealthPercentage'
SUB       = b'SubtypesData_'

MUTATORS = [
    'SoulSavior_DifficultyTier2',
    'SoulSavior_DifficultyTier3',
    'SoulSavior_RunDistance1',
    'SoulSavior_RunDistance2',
    'SoulSavior_RunDistance3',
]

MAGIC = {1224, 2703, 3883, 7794, 13, 15, 23, 39}

def read_effect_fields(chunk, match_start, eff_len, max_fields=24):
    """Return (fields, subtype) after an effect name match."""
    p = (match_start + eff_len + 3) & ~3
    q = p
    fields = []
    subtype = '?'
    for _ in range(max_fields):
        if q + 4 > len(chunk):
            break
        ln = int.from_bytes(chunk[q:q+4], 'little')
        if 0 < ln < 80 and chunk[q+4:q+4+len(SUB)] == SUB:
            subtype = chunk[q+4:q+4+ln].decode(errors='replace')
            subtype = (subtype.replace('SubtypesData_SoulSavior_', '')
                              .replace('SubtypesData_', '')
                              .replace('_Enemy', ''))
            break
        fields.append(int.from_bytes(chunk[q:q+4], 'little', signed=True))
        q += 4
    return fields, subtype

def dump_object(nm, chunk):
    print(f'\n{"="*60}')
    print(f'  {nm}  (size={len(chunk)})')
    print(f'{"="*60}')

    all_effs = FLAT_EFFS + [PCT_EFF]
    found_any = False
    for eff in all_effs:
        label = eff.decode()
        for m in re.finditer(re.escape(eff), chunk):
            found_any = True
            fields, sub = read_effect_fields(chunk, m.start(), len(eff))
            magic_hits = [f'**{v}**' if v in MAGIC else str(v) for v in fields]
            tag = ' [PCT]' if eff == PCT_EFF else ' [FLAT]'
            print(f'  {label}{tag}')
            print(f'    subtype : {sub}')
            print(f'    fields  : {magic_hits}')
    if not found_any:
        print('  (no matching effect classes found)')

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    data_dir = args[0] if args else find_data_dir('.')
    sa0 = os.path.join(data_dir, 'sharedassets0.assets')
    data, objs, le = parse_assets(sa0)

    targets = {}
    for (pid, off, size, cid, tid) in objs:
        if cid != 114:
            continue
        try:
            iname, _ = read_mname(data, off, le)
        except Exception:
            continue
        if iname in MUTATORS:
            targets[iname] = (off, size)

    for nm in MUTATORS:
        if nm not in targets:
            print(f'\n!! {nm} NOT FOUND')
            continue
        off, size = targets[nm]
        dump_object(nm, data[off:off+size])

if __name__ == '__main__':
    main()
