#!/usr/bin/env python3
"""Resolve GUIDs found in the run-history / save JSON to game names.

Reads out/guid_index.json (from mt2_guid_scan.py), resolves localization keys
through resources.assets (mt2_lib.Localizer), and (optionally) a RunHistory.json
to report which GUIDs a player's runs actually used.

Writes out/guid_names.json: {guid: {internal, kind, name, desc}}.

Usage:
  python3 extraction/mt2_resolve_guids.py [--history mt2-save-copy/run-history/RunHistory.json]
"""
import argparse, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from mt2_lib import Localizer, parse_assets


class Utf8Localizer(Localizer):
    """Localizer that also accepts non-ASCII text (e.g. the curly apostrophe in
    "Limbo’s Solace"), which the base class rejects."""
    def resolve(self, key):
        if key in self.cache:
            return self.cache[key]
        kb = key.encode(); i = self.res.find(kb); v = None
        if i >= 0:
            end = (i + len(kb) + 3) & ~3
            for probe in range(end, end + 8, 4):
                ln = int.from_bytes(self.res[probe:probe + 4], 'little', signed=True)
                if 0 < ln < 4000:
                    raw = self.res[probe + 4:probe + 4 + ln]
                    try:
                        t = raw.decode('utf8')
                    except UnicodeDecodeError:
                        continue
                    if all(c >= 0x20 or c in (9, 10, 13) for c in raw):
                        v = t; break
        self.cache[key] = v
        return v


def class_champions(data_dir):
    """{ClassInternal: {guid, champions:[{internal, clanSelect}]}} in championIndex order.
    ClassData holds PPtrs to ChampionData objects ('XxxChamp1', 'ClanSelect_...');
    their order in the object is the order of `championIndex` 0, 1 in run records."""
    data, objs, le = parse_assets(os.path.join(data_dir, 'sharedassets0.assets'))
    byp = {o[0]: o for o in objs}
    out = {}
    for (pid, off, size, cid, tid) in objs:
        if cid != 114:
            continue
        chunk = data[off:off + size]
        if b'ClassData_titleLoc' not in chunk:
            continue
        cname = re.search(rb'Class[A-Za-z]+', chunk[16:80]).group().decode()
        guid = re.search(rb'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', chunk).group().decode()
        champs = []
        for p in range(0, len(chunk) - 12, 4):
            fid = int.from_bytes(chunk[p:p + 4], 'little', signed=True)
            tp = int.from_bytes(chunk[p + 4:p + 12], 'little', signed=True)
            if fid != 0 or tp not in byp or byp[tp][3] != 114:
                continue
            o = byp[tp]; c2 = data[o[1]:o[1] + o[2]]
            m = re.search(rb'ClanSelect_([A-Za-z_]+)', c2)
            if m:
                nm = re.search(rb'[\x20-\x7e]{4,}', c2[28:80]).group().decode()
                champs.append({'internal': nm, 'clanSelect': m.group(1).decode()})
        out[cname] = {'guid': guid, 'champions': champs}
    return out

KEY_RE = re.compile(r'^[A-Za-z]+_(nameKey|titleLoc|title)-')
DESC_RE = re.compile(r'^[A-Za-z]+_(descriptionKey|descriptionLoc)-')


def resolve_entry(e, L):
    name = desc = None
    for s in e['after']:
        if name is None and KEY_RE.match(s):
            name = L.resolve(s)
        elif desc is None and DESC_RE.match(s):
            desc = L.resolve(s)
    return name, desc


def build(index, L):
    out = {}
    for e in index:
        name, desc = resolve_entry(e, L)
        cur = out.get(e['guid'])
        rec = {'internal': e['name'], 'kind': e['kind'], 'name': name, 'desc': desc, 'file': e['file']}
        if cur is None or (cur['name'] is None and name):
            out[e['guid']] = rec
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default='Contents/Resources/Data')
    ap.add_argument('--index', default='out/guid_index.json')
    ap.add_argument('--out', default='out/guid_names.json')
    ap.add_argument('--history', default=None)
    a = ap.parse_args()
    L = Utf8Localizer(os.path.join(a.data, 'resources.assets'))
    index = json.load(open(a.index))
    names = build(index, L)
    json.dump(names, open(a.out, 'w'), indent=1, ensure_ascii=False)
    json.dump(class_champions(a.data), open(os.path.join(os.path.dirname(a.out) or '.', 'class_champions.json'), 'w'), indent=1)
    print(len(names), 'guids ->', a.out, '; with English name:', sum(1 for v in names.values() if v['name']))
    if a.history:
        runs = json.load(open(a.history))['_runEntries']
        seen = {}
        def note(g, where):
            seen.setdefault(g, set()).add(where)
        for r in runs:
            d = json.loads(r['runDataJson']); s = d['startingConditions']
            for k in ('mainClassInfo', 'subclassInfo'): note(s[k]['classId'], k)
            note(s['pyreCharacterId'], 'pyreCharacterId')
            note(d['pyreArtifactState']['relicDataID'], 'pyreArtifact')
            for k in ('souls', 'blessings', 'mutators'):
                for x in d[k]: note(x['relicDataID'], k)
            for b in d['completedBattles']:
                if b['trialID']: note(b['trialID'], 'trial')
        missing = [g for g in seen if g not in names]
        print('GUIDs used by runs:', len(seen), '; not in game data:', len(missing))
        for g in missing[:20]: print('  missing', g, seen[g])
