#!/usr/bin/env python3
"""Check the Soul Savior minor-node placement rules over many snapshot saves.

Usage: python3 extraction/mt2_map_rules.py [DIR]    (default mt2-save-copy/snapshots)

Decodes every distinct Soul Savior run (once per seed+id), then verifies the rules
documented in docs/run_save_decoding.md ("Minor-node placement rules") and prints
the tendencies (A/B weights, left/right bias, region omission patterns).
"""
import sys, os, glob, json, collections
sys.path.insert(0, os.path.dirname(__file__))
import mt2_decode_map as M

A = ['UnitPrimary', 'UnitAllied', 'Hoard', 'Well', 'Celestial']
B = ['Armory', 'Boons', 'Vortex', 'Remains']
U = {'UnitPrimary', 'UnitAllied'}
OTHER = {'Hoard', 'Well', 'Celestial'}
REGIONS = ((1, 2), (3, 4), (5, 6), (7, 8))


def load_runs(dirpath, N):
    seen, runs = set(), []
    for p in sorted(glob.glob(os.path.join(dirpath, '*'))):
        try:
            d = json.load(open(p))
            sc = d.get('startingConditions', {})
            if sc.get('mutators') is None or 'runState' not in d: continue
            if not any('SoulSavior' in (N.get(m['relicDataID'] if isinstance(m, dict) else m, {}).get('internal') or '') for m in sc['mutators']): continue
            key = (sc['seed'], d['id'])
            if key in seen: continue
            seen.add(key)
            slots = {s['slot']: s for s in M.describe(p, N)['slots'] if s['left']}
            runs.append(slots)
        except Exception:
            pass
    return runs


def ab(side):
    return [x for x in side if x in A][0], [x for x in side if x in B][0]


def main():
    d = sys.argv[1] if len(sys.argv) > 1 else 'mt2-save-copy/snapshots'
    N = json.load(open('out/guid_names.json'))
    runs = load_runs(d, N)
    print(len(runs), 'distinct Soul Savior runs\n')
    fails = collections.Counter(); omit_seqs = collections.Counter()
    unit_pos = collections.Counter(); left_of = collections.Counter(); bcnt = collections.Counter(); bpairs = collections.Counter()
    for slots in runs:
        omit = []
        for reg in REGIONS:
            As = []
            for sl in reg:
                s = slots[sl]
                for sd in ('left', 'right'):
                    if len(s[sd]) != 2 or sorted(1 for x in s[sd] if x in A) != [1] or sum(x in B for x in s[sd]) != 1: fails['side is not one A + one B'] += 1; continue
                    a, b = ab(s[sd]); As.append(a); bcnt[b] += 1
                    left_of[(sd, a)] += 1; left_of[(sd, b)] += 1
                if len(set(s['left'] + s['right'])) != 4: fails['slot has repeated node'] += 1
                bpairs[tuple(sorted([ab(s['left'])[1], ab(s['right'])[1]]))] += 1
            if sorted(x for x in As if x in U) != ['UnitAllied', 'UnitPrimary']: fails['region lacks exactly 1 Primary + 1 Allied'] += 1
            oth = [x for x in As if x in OTHER]
            if len(set(oth)) != 2 or len(oth) != 2: fails['region does not hold 2 distinct of Hoard/Well/Celestial'] += 1; omit.append('?'); continue
            omit.append((OTHER - set(oth)).pop())
            unit_pos[''.join('U' if x in U else 'o' for x in As)] += 1
        if sorted(collections.Counter(omit).values()) != [1, 1, 2]: fails['skipped-node multiset is not {X,X,Y,Z}'] += 1
        omit_seqs[tuple(omit)] += 1
    print('RULE VIOLATIONS:', dict(fails) or 'none')
    print('\nB node totals:', dict(bcnt)); print('B pair per slot:', dict(bpairs.most_common()))
    print('\nA/B side by position (left, right):')
    for t in A + B: print('  %-12s L %4d  R %4d' % (t, left_of[('left', t)], left_of[('right', t)]))
    print('\nunit-node layout per region (slot1 L R | slot2 L R):', {k[:2] + '|' + k[2:]: v for k, v in unit_pos.most_common()})
    rare = collections.Counter()
    for s in omit_seqs.elements(): rare[collections.Counter(s).most_common(1)[0][0]] += 1
    print('node skipped in 2 regions ("rare" one):', dict(rare))
    pairs = collections.Counter()
    for s, c in omit_seqs.items():
        for i in range(4):
            for j in range(i + 1, 4):
                if s[i] == s[j]: pairs[(i + 1, j + 1)] += c
    print('regions sharing the same skipped node:', dict(sorted(pairs.items())))
    free = sum(c for s, c in omit_seqs.items() if len(set(s[:3])) == 3)
    print('R4 free given R1-R3 (all distinct): %d runs; forced (R1-R3 has a repeat): %d' % (free, len(runs) - free))


if __name__ == '__main__':
    main()
