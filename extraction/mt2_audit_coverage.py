#!/usr/bin/env python3
"""
mt2_audit_coverage.py — cross-check enemy coverage between the wave data and the
observation CSV, catching the base-vs-upgraded trap that hid Energizing Flautist.

An enemy renders with inline stats + a note popover in the app only if its
*internal* has at least one Overgrowth row in difficulty_observations.csv (that's
what ENEMY_STATS / ENEMY_NOTES key on, via mt2_emit_enemy_stats / mt2_emit_notes).
A base enemy that spawns only at low Overgrowth orders (e.g. EnchanterT1_Speed /
Energizing Flautist in Favored Ascent O1/O2) is easy to miss because its upgraded
`_Ver2` twin covers the higher orders — so it silently shows as plain text.

This audits both directions against out/waves.json's resolved per-order `tiers`:
  MISSING   — internal spawns in a wave but has NO Overgrowth CSV row  → gap; add
              its Overgrowth rows (note + stats; blank stats + verified=No until
              observed). Exit status is nonzero when any exist.
  UNREFERENCED (informational) — internal has Overgrowth rows but never spawns in
              any wave → possibly a mis-keyed row or roster-only dup.

Bosses (`Boss_*` / is_boss) are skipped — they live in BOSS_STATS, not ENEMY_STATS.
Internals in EXCLUDE_INTERNALS (non-spawning duplicate display names the emit
drops) are skipped in the MISSING check.

Run after mt2_extract_waves.py (needs a current out/waves.json). Usage:
    python3 extraction/mt2_audit_coverage.py [--csv FILE] [--waves out/waves.json]
"""
import sys, os, csv, json
from collections import defaultdict
from importlib import util

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _enemies(node):
    """Yield every combatant dict (has a string `internal`) under node."""
    if isinstance(node, dict):
        if isinstance(node.get('internal'), str):
            yield node
        else:
            for v in node.values():
                yield from _enemies(v)
    elif isinstance(node, list):
        for v in node:
            yield from _enemies(v)


def spawning_internals(waves):
    """{internal: {'display', 'orders':set, 'scenarios':set}} for non-boss enemies
    across every scenario's resolved per-order `tiers` (tier key '0'..'3' → O1..O4)."""
    spawn = defaultdict(lambda: {'display': '', 'orders': set(), 'scenarios': set()})
    for scen, data in waves.items():
        for tk, tier in (data.get('tiers') or {}).items():
            order = int(tk) + 1
            for e in _enemies(tier):
                intr = e['internal']
                if intr.startswith('Boss_') or e.get('is_boss'):
                    continue
                spawn[intr]['orders'].add(order)
                spawn[intr]['display'] = e.get('display') or spawn[intr]['display']
                spawn[intr]['scenarios'].add(scen)
    return spawn


def overgrowth_internals(csv_path):
    """{internal: display} for every non-boss internal with an Overgrowth row."""
    out = {}
    for r in csv.DictReader(open(csv_path, newline='')):
        intr = (r.get('internal') or '').strip()
        if (r.get('difficulty') or '').strip() == 'Overgrowth' and intr and not intr.startswith('Boss_'):
            out.setdefault(intr, (r.get('display') or '').strip())
    return out


def _exclude_set():
    spec = util.spec_from_file_location('es', os.path.join(REPO, 'extraction', 'mt2_emit_enemy_stats.py'))
    es = util.module_from_spec(spec)
    spec.loader.exec_module(es)
    return es.EXCLUDE_INTERNALS


def main():
    argv = sys.argv[1:]
    csv_path = argv[argv.index('--csv') + 1] if '--csv' in argv else os.path.join(REPO, 'difficulty_observations.csv')
    waves_path = argv[argv.index('--waves') + 1] if '--waves' in argv else os.path.join(REPO, 'out', 'waves.json')

    if not os.path.exists(waves_path):
        sys.exit(f'ERROR: {waves_path} not found — run mt2_extract_waves.py first.')

    spawn = spawning_internals(json.load(open(waves_path)))
    og = overgrowth_internals(csv_path)
    excl = _exclude_set()

    missing = {i: v for i, v in spawn.items() if i not in og and i not in excl}
    unreferenced = {i: d for i, d in og.items() if i not in spawn}

    print(f'Spawning non-boss internals: {len(spawn)} | with Overgrowth rows: '
          f'{len(og.keys() & spawn.keys())} | EXCLUDE\'d: {len(spawn.keys() & excl)}')

    print(f'\n=== MISSING (spawns in a wave, no Overgrowth CSV row): {len(missing)} ===')
    for i, v in sorted(missing.items(), key=lambda kv: kv[1]['display']):
        orders = ','.join('O%d' % o for o in sorted(v['orders']))
        print(f'  {v["display"]:<26} {i:<40} @ {orders}')
        print(f'       in: {", ".join(sorted(s.replace("SoulSavior_", "") for s in v["scenarios"]))}')

    print(f'\n=== UNREFERENCED (has Overgrowth rows, never spawns): {len(unreferenced)} ===')
    for i, d in sorted(unreferenced.items(), key=lambda kv: kv[1]):
        print(f'  {d:<26} {i}')

    sys.exit(1 if missing else 0)


if __name__ == '__main__':
    main()
