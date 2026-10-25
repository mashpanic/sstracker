#!/usr/bin/env python3
"""Build a GUID -> internal-name index from the game's .assets files.

Why: the run-history / save JSON identifies clans, souls, trials, Pyre Hearts,
relics, bosses, ... only by GUID. The game stores each GUID as a plain Unity
string (int32 length + bytes + pad-to-4) right after the object's name string,
so a byte scan can recover (name, guid) pairs without type trees.

Output: out/guid_index.json — list of
  {guid, name, kind, file, offset, after: [next strings], before: [prev strings]}
`kind` is a best-effort guess from the neighbouring strings ('XData_...' keys,
'Assets/...' paths); see docs/run_save_decoding.md for what is confirmed.

Usage: python3 extraction/mt2_guid_scan.py [DATA_DIR] [--out out]
"""
import argparse, json, os, re, sys

GUID_RE = re.compile(rb'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')
PRINT = re.compile(rb'^[\x20-\x7e]+$')


def str_at(d, p):
    """Unity string whose int32 length starts at p -> (text, next_aligned_pos) or None."""
    if p < 0 or p + 4 > len(d):
        return None
    n = int.from_bytes(d[p:p + 4], 'little')
    if not 0 < n < 400 or p + 4 + n > len(d):
        return None
    b = d[p + 4:p + 4 + n]
    if not PRINT.match(b):
        return None
    return b.decode(), p + 4 + ((n + 3) // 4) * 4


def prev_str(d, p):
    """Unity string that ends (after padding) exactly at p."""
    for n in range(1, 200):
        s = p - ((n + 3) // 4) * 4 - 4
        r = str_at(d, s)
        if r and r[1] == p and len(r[0]) == n:
            return r[0], s
    return None


def scan(path, before=4, after=8):
    d = open(path, 'rb').read()
    out = []
    for m in GUID_RE.finditer(d):
        lp = m.start() - 4
        r = str_at(d, lp)
        if not r or r[0] != m.group().decode():
            continue  # GUID text that is not a standalone Unity string
        ent = {'guid': r[0], 'file': os.path.basename(path), 'offset': lp}
        # strings before
        bs, p = [], lp
        for _ in range(before):
            pr = prev_str(d, p)
            if not pr:
                break
            bs.append(pr[0]); p = pr[1]
        ent['name'] = bs[0] if bs else None
        ent['before'] = bs[1:]
        # strings after
        a, p = [], r[1]
        for _ in range(after):
            nx = str_at(d, p)
            if not nx:
                # skip small non-string gaps (ints/refs) up to 64 bytes
                for q in range(p, p + 64, 4):
                    nx = str_at(d, q)
                    if nx:
                        break
            if not nx:
                break
            a.append(nx[0]); p = nx[1]
        ent['after'] = a
        out.append(ent)
    return out


def kind_of(e):
    keys = ' '.join(e['after'])
    m = re.search(r'\b([A-Za-z]+Data)_[A-Za-z]+Key|\b([A-Za-z]+Data)_(?:name|title|desc|data)', keys)
    if m:
        return m.group(1) or m.group(2)
    if 'Assets/' in keys:
        return 'prefab'
    return 'unknown'


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('data', nargs='?', default='Contents/Resources/Data')
    ap.add_argument('--out', default='out')
    ap.add_argument('--files', nargs='*', default=None)
    a = ap.parse_args()
    files = a.files or ['sharedassets0.assets', 'resources.assets', 'globalgamemanagers.assets']
    res = []
    for f in files:
        p = os.path.join(a.data, f)
        if os.path.exists(p):
            res += scan(p)
    for e in res:
        e['kind'] = kind_of(e)
    os.makedirs(a.out, exist_ok=True)
    json.dump(res, open(os.path.join(a.out, 'guid_index.json'), 'w'), indent=1)
    from collections import Counter
    print(len(res), 'guid strings;', len({e['guid'] for e in res}), 'distinct')
    print(Counter(e['kind'] for e in res).most_common())
