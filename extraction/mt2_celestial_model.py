#!/usr/bin/env python3
"""
Celestial alcove events: the game's own pool/weights vs what the saved maps show.

Reads each event's ticket count and its allowed slot window straight from the game
data (sharedassets0.assets), simulates how often each event should appear in a run,
and prints that next to what the snapshot saves actually contain.

IMPORTANT: the window is in map SLOTS (the save's `activeDistance`), a fixed place in
the map: 1-2 Maera, 3-4 Thaddeus, 5-6 Tivi, 7-8 Lylith (battle, then boss, per region).
It is NOT time: in Soul Savior the player picks the region order. So "max slot 3"
means "only in Maera or Thaddeus's battle", whenever you go there.

Model: each run has 2 or 3 alcoves at the slots of a random real map; per slot the
event is drawn by tickets among events whose window includes the slot, with no event
repeated in a run. Followup/test events and zero-ticket events are left out.

  python3 extraction/mt2_celestial_model.py [SNAPSHOT_DIR] [--data DATA_DIR] [--runs N]

Run it after collecting maps (extraction/mt2_snapshot_saves.sh). Output is a table:
event, tickets, window, model % of runs, seen count/%.
"""
import argparse, collections, glob, json, os, random, re, struct, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from mt2_lib import parse_assets, read_mname

ROOT = os.path.join(HERE, '..')


def load_events(data_dir):
    data, objs, le = parse_assets(os.path.join(data_dir, 'sharedassets0.assets'))
    out = {}
    for (pid, off, size, cid, tid) in objs:
        if cid != 114:
            continue
        ch = data[off:off + size]
        if b'Story/Event Prefabs' not in ch or size >= 2000:
            continue
        name, _ = read_mname(data, off, le)
        strs = re.findall(rb'[\x20-\x7e]{5,}', ch)
        starts = [(max(ch.rfind(s) for s in strs) + len(strs[-1]) + 3) & ~3]
        hexes = list(re.finditer(rb'[0-9a-f]{32}', ch))
        if hexes:
            starts.append((hexes[-1].end() + 3) & ~3)
        for st in starts:
            iv = [struct.unpack_from('<i', ch, i)[0] for i in range(st, size - 3, 4)]
            k = next((i for i in range(3, len(iv) - 6)
                  if iv[i] == 0 and iv[i + 1] == 1 and iv[i - 2] > 0 and iv[i - 1] > 0), None)
            if k is not None:
                out[name] = dict(tickets=iv[k - 2], lo=iv[k + 4], hi=iv[k + 5])
                break
    return out


def load_maps(snap_dir, names):
    runs = {}
    for f in sorted(glob.glob(os.path.join(snap_dir, '*-save-regionRun.json'))):
        try:
            d = json.load(open(f))
        except Exception:
            continue
        n = d.get('runState', {}).get('nodes')
        if n and len(n[1]['mapNodes']) >= 2 and d['id'] not in runs:
            runs[d['id']] = [(names.get(e['storyEventDataId'], e['storyEventDataId'][:8]), e['activeDistance'])
                             for e in d['storyEventStates']]
    return runs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('snapshots', nargs='?', default=os.path.join(ROOT, 'mt2-save-copy', 'snapshots'))
    ap.add_argument('--data', default=os.path.join(ROOT, 'Contents', 'Resources', 'Data'))
    ap.add_argument('--runs', type=int, default=20000)
    a = ap.parse_args()

    names = {k: v['internal'] for k, v in json.load(open(os.path.join(ROOT, 'out', 'guid_names.json'))).items()}
    ev = {n: e for n, e in load_events(a.data).items()
          if e['tickets'] > 0 and 'Followup' not in n and 'Test' not in n and n != 'TrueFinalBossUnlockC'}
    maps = load_maps(a.snapshots, names)
    if not maps:
        sys.exit('no maps with a full run map found in ' + a.snapshots)
    seen = collections.Counter(n for r in maps.values() for n, _ in r)
    slot_sets = [[s for _, s in r] for r in maps.values()]

    random.seed(1)
    inc = collections.Counter()
    for _ in range(a.runs):
        used = set()
        for slot in sorted(random.choice(slot_sets)):
            pool = [(n, e['tickets']) for n, e in ev.items() if n not in used and e['lo'] <= slot <= e['hi']]
            r = random.random() * sum(w for _, w in pool)
            for n, w in pool:
                r -= w
                if r <= 0:
                    used.add(n)
                    break
        inc.update(used)

    N = len(maps)
    print(f'{N} maps, {sum(len(r) for r in maps.values())} alcoves; slots are map positions (1-2 Maera, 3-4 Thaddeus, 5-6 Tivi, 7-8 Lylith)')
    print(f"{'event':26}{'tickets':>8}{'slots':>8}{'model %':>9}{'seen':>6}{'seen %':>8}")
    for n in sorted(ev, key=lambda x: -inc[x]):
        e = ev[n]
        print(f"{n:26}{e['tickets']:>8}{str(e['lo']) + '-' + str(e['hi']):>8}{100 * inc[n] / a.runs:>8.1f}%{seen.get(n, 0):>6}{100 * seen.get(n, 0) / N:>7.0f}%")
    extra = [n for n in seen if n not in ev]
    if extra:
        print('seen but not in the model:', ', '.join(extra))


if __name__ == '__main__':
    main()
