#!/usr/bin/env python3
"""Write the compact GUID -> name table the desktop app embeds.

The desktop app (separate repo, sstracker-desktop) reads the game's run save and
needs only a few dozen GUIDs: map nodes (central and minor, base and upgraded)
and the minor bosses. Everything else in out/guid_names.json is left out so the
app stays small and carries no game content it does not use.

  python3 extraction/mt2_emit_desktop_names.py [OUT.json]
    default OUT: ../sstracker-desktop/src-tauri/data/names.json
Needs out/guid_names.json (mt2_guid_scan.py then mt2_resolve_guids.py).
"""
import json, os, re, sys

here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, '..', 'out', 'guid_names.json')
dst = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    here, '..', '..', 'sstracker-desktop', 'src-tauri', 'data', 'names.json')

N = json.load(open(src))
KEEP = re.compile(r'^(RewardNode|SoulSavior_(RewardNode)?Upgraded|Boss_SoulSavior_R\d_TrainBoss_)')
KINDS = {'MerchantData', 'StoryEventPoolData'}
out = {}
for g, v in N.items():
    i = v.get('internal') or ''
    if KEEP.match(i) or v.get('kind') in KINDS:
        out[g] = {'internal': i, 'name': v.get('name')}
os.makedirs(os.path.dirname(dst), exist_ok=True)
json.dump(out, open(dst, 'w'), indent=1, sort_keys=True, ensure_ascii=False)
print(len(out), 'entries ->', dst)
