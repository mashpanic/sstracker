#!/usr/bin/env python3
"""Decode the pre-generated run map in an in-progress Soul Savior save.

`runState.nodes[i]` describes battle slot i (0 Astrael, 1/2 Maera, 3/4 Thaddeus,
5/6 Tivi, 7/8 Lylith, 9 Lifemother). For each slot the save already holds the
variant (`scenarioIndex`), the trial offered, the minor boss (first battle of a
region only) and the left/right minor-node choices. See docs/run_save_decoding.md.

Usage:
  python3 extraction/mt2_decode_map.py SAVE.json [SAVE2.json ...]
  python3 extraction/mt2_decode_map.py --stats DIR     # tally minor nodes over many snapshots
"""
import argparse, glob, json, os, sys, collections
sys.path.insert(0, os.path.dirname(__file__))
from mt2_decode_runs import WAVE_SETS, BOSS_VARIANTS, LIFEMOTHER, trial_name

REGION = {1: (1, 'Maera'), 3: (2, 'Thaddeus'), 5: (3, 'Tivi'), 7: (4, 'Lylith')}

# Node internal name -> in-game minor-node name (confirmed by Benj 2026-10-25):
# Boons = coins, Vortex = purge two cards, Remains = heal, Celestial = story event, Hoard = blessing
# (gives a relic), Armory = equipment/room, Well = duplicate a card (Empyrean Well). Well/Vortex corrected 2026-10-27 by Benj in game.
LIKELY_NAME = {
    'RewardNodeEquipmentOrRoom': 'Armory', 'RewardNodeCoinMedium': 'Boons',
    'RewardNodeBlessingOnly': 'Hoard', 'RewardNodePurgeTwo': 'Vortex',
    'RewardNodeHeal': 'Remains', 'RewardNodeDuplicateCard': 'Well',
    'StoryEventPoolData': 'Celestial',
}


def clan_pack(N, class_id):
    """RewardNodeUnitPack<Clan> internal name for a clan GUID (Class<Clan> -> that)."""
    return 'RewardNodeUnitPack' + (N[class_id]['internal'] or '')[len('Class'):]


def load(path, N):
    d = json.load(open(path))
    sc = d.get('startingConditions', {})
    main, sub = clan_pack(N, sc['mainClassInfo']['classId']), clan_pack(N, sc['subclassInfo']['classId'])
    return d, main, sub


def label(internal, main, sub):
    if internal == main: return 'UnitPrimary'
    if internal == sub: return 'UnitAllied'
    return LIKELY_NAME.get(internal, internal)


def minor_pairs(node, N, main, sub):
    """(shared central nodes, left minor nodes, right minor nodes) as internal names."""
    sides = [[N.get(x, {}).get('internal', x[:8]) for x in m['_nodes']] for m in node['mapNodes']]
    if len(sides) < 2:
        return sides[0] if sides else [], [], []
    shared = [a for a, b in zip(sides[0], sides[1]) if a == b]
    # shared nodes come first; the rest differ per side
    k = 0
    while k < len(sides[0]) and sides[0][k] == sides[1][k]:
        k += 1
    return sides[0][:k], sides[0][k:], sides[1][k:]


def describe(path, N):
    d, main, sub = load(path, N)
    rs = d['runState']
    out = {'file': os.path.basename(path), 'seed': d['startingConditions']['seed'],
           'battlesCompleted': rs['numBattlesCompleted'], 'slots': []}
    for i, n in enumerate(rs['nodes']):
        c, l, r = minor_pairs(n, N, main, sub) if n['mapNodes'] else ([], [], [])
        rec = {'slot': i, 'scenarioIndex': n['scenarioIndex'], 'chosenBranch': n['chosenBranch'],
               'central': c, 'left': [label(x, main, sub) for x in l], 'right': [label(x, main, sub) for x in r]}
        if n['bossId']:
            v = N.get(n['bossId'], {})
            rec['minorBoss'] = v.get('name') or v.get('internal')
        ti = n['trialInfo']
        if ti['trialDataId']:
            rec['trial'] = trial_name(N.get(ti['trialDataId'], {}).get('internal')) + (' [taken]' if ti['trialEnabled'] else ' [offered]')
        if i == 0: rec['what'] = 'Astrael ' + {0: 'Infested', 1: 'Morsels'}.get(n['scenarioIndex'], '?')
        elif i == 9: rec['what'] = 'Lifemother ' + LIFEMOTHER.get(n['scenarioIndex'], '?')
        elif i in REGION:
            rn, name = REGION[i]; rec['what'] = '%s wave set: %s' % (name, WAVE_SETS[rn].get(n['scenarioIndex']))
        elif i in (2, 4, 6, 8):
            rn, name = REGION[i - 1]; rec['what'] = '%s boss: %s' % (name, BOSS_VARIANTS[rn].get(n['scenarioIndex']))
        out['slots'].append(rec)
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('saves', nargs='*')
    ap.add_argument('--stats', default=None, help='directory of snapshot saves (*.json*)')
    ap.add_argument('--names', default='out/guid_names.json')
    a = ap.parse_args()
    N = json.load(open(a.names))
    if a.stats:
        seen, tally, pairs, n_runs = set(), collections.Counter(), collections.Counter(), 0
        for p in sorted(glob.glob(os.path.join(a.stats, '*'))):
            try:
                d = json.load(open(p))
                if d.get('startingConditions', {}).get('mutators') is None or 'runState' not in d:
                    continue
                if not any('SoulSavior' in (N.get(m['relicDataID'] if isinstance(m, dict) else m, {}).get('internal') or '') for m in d['startingConditions']['mutators']):
                    continue
                key = (d['startingConditions']['seed'], d['id'])
                if key in seen: continue
                seen.add(key); n_runs += 1
                for s in describe(p, N)['slots']:
                    for side in (s['left'], s['right']):
                        for x in side: tally[(s['slot'] % 2 == 1, x)] += 1
                        if len(side) == 2: pairs[tuple(sorted(side))] += 1
            except Exception as e:
                print('skip', p, e)
        print(n_runs, 'distinct Soul Savior runs')
        print('minor node counts (before minor battle? , node):')
        for (first, x), c in sorted(tally.items(), key=lambda kv: -kv[1]): print('  %-5s %-14s %d' % ('1st' if first else '2nd', x, c))
        print('side pairs:'); [print('  %-30s %d' % (' + '.join(p), c)) for p, c in pairs.most_common()]
    else:
        for p in a.saves:
            r = describe(p, N)
            print('==', r['file'], 'seed', r['seed'], 'battles completed', r['battlesCompleted'])
            for s in r['slots']:
                bits = [s.get('what', 'slot %d (unused)' % s['slot'])]
                if 'minorBoss' in s: bits.append('minor boss ' + str(s['minorBoss']))
                if 'trial' in s: bits.append('trial ' + s['trial'])
                print(' %2d %s' % (s['slot'], ' | '.join(bits)))
                if s['central'] or s['left']:
                    print('      central: %s   left: %s   right: %s   chosen: %s' % (
                        ', '.join(s['central']) or '-', ' + '.join(s['left']) or '-', ' + '.join(s['right']) or '-', s['chosenBranch']))
