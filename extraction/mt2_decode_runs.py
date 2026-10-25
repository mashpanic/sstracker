#!/usr/bin/env python3
"""Decode Monster Train 2 Soul Savior run records into readable JSON.

Input : RunHistory.json from the game's save folder
        (~/Library/Application Support/Shiny Shoe/MonsterTrain2/run-history/)
        plus out/guid_names.json + out/class_champions.json
        (made by mt2_guid_scan.py then mt2_resolve_guids.py).
Output: a list of dicts, one per run (see decode_run), written to
        out/runs_decoded.json, and a short per-champion W-L summary on stdout.

Everything here is documented in docs/run_save_decoding.md. In brief:
  * completedBattles[] is in FIGHT order. battleIndex is a fixed slot:
    0 Astrael; 1,2 Maera; 3,4 Thaddeus; 5,6 Tivi; 7,8 Lylith (wave set, then
    boss); 9 Lifemother. The position in the list gives the ring (O1..O4).
  * scenarioIndex = variant index within the region (tables below).
  * blessings[] holds relics (CollectableRelicData) AND the mutators earned from
    beating each region's boss (SoulSavior_Region{N}Complete_{k}).
"""
import argparse, json, os, re, sys
from collections import defaultdict

REGIONS = {  # first battleIndex of each region's pair -> (region number, name)
    1: (1, 'Maera'), 3: (2, 'Thaddeus'), 5: (3, 'Tivi'), 7: (4, 'Lylith'),
}

# scenarioIndex -> wave set (first battle of a pair). CONFIRMED (see doc).
WAVE_SETS = {
    1: {0: 'Favored Ascent', 1: 'Dutiful Sentinels'},
    2: {0: 'Gluttonous Masses'},
    3: {0: 'Rabble-Rousers', 1: 'Harassing Snipers'},
    4: {0: 'Plague Legion'},
}
# scenarioIndex -> boss variant (second battle of a pair). CONFIRMED against the
# region-defeat mutators in 52 runs (unique solution) and against the in-game
# hover names for the Lifemother.
BOSS_VARIANTS = {
    1: {0: 'Sibling Hierarchy', 1: 'Stern Sister', 2: 'Eldest Scion'},
    2: {0: 'Insatiable', 1: 'Train Chomper', 2: 'Thick Skinned'},
    3: {0: 'Duplicitous', 1: 'Prankster', 2: 'Mischevious Child'},
    4: {0: 'Plaguebringer', 1: 'Innoculation', 2: 'Energy Vampire'},
}
LIFEMOTHER = {0: 'The Undying Bloom', 1: 'The Swarmhost', 2: 'The Corpseflower'}
# Astrael's scenarioIndex 0/1 = Infested/Morsels set: not determined yet.

# internal champion-card name -> display name (the first card of a deck is the
# primary champion; verified with the in-game deck lists).
CHAMPION_BY_CARD = {
    'AwokenChampionSentient': 'The Sentient', 'AwokenChampionRoot': 'Wyldenten',
    'BanishedChamp1': 'Fel', 'BanishedChamp2': 'Talos',
    'HornbreakerChampion': 'Hornbreaker Prince', 'ImpQueenChampion': 'Shardtail Queen',
    'LazarusLeagueChamp1': 'Orechi', 'LazarusLeagueChamp2': 'Baron Grael',
    'LunaCovenChamp1': 'Ekka', 'LunaCovenChamp2': 'Arduhn',
    'PyreborneChamp1': 'Lord Fenix', 'PyreborneChamp2': 'Lady Gilda',
    'RailforgedChamp1': 'Herzal', 'RailforgedChamp2': 'Heph',
    'RemnantChampion': 'Rector Flicker', 'RemnantFirstWaxerChampion': 'Little Fade',
    'StygianChampionTethys': 'Tethys Titansbane', 'StygianChampionMartyr': 'Solgard the Martyr',
    'ChampionPenumbra': 'Penumbra', 'ChampionPrimordium': 'Primordium',
    'UnderlegionChamp1': 'Bolete the Guillotine', 'UnderlegionChamp2': 'Madame Lionsmane',
    'WurmChamp1': 'Spine Chief', 'WurmChamp2': 'Echowright',
}
TRIAL_NAMES = {  # key suffix of the game's trial name -> in-game name
    'Draw': 'Mind Muddler', 'Ember': 'Pyre Dampener', 'EnemyTitanskin': 'Tough as Nails',
    'Invasion': 'Mark of Invasion', 'nvasion': 'Mark of Invasion',
    'ArtifactForEnemyMultistrike': 'Seal of Aggression',
    'ArtifactForHealOnAscend': "Heaven's Seal", 'HealOnAscend': "Heaven's Seal",
    'FrontReanimation': 'Stone of the Undying', 'SpikeRocks': 'Spike Rocks',
}


def trial_name(internal):
    m = re.match(r'T(\d)(.*?)\$?$', internal or '')
    if not m:
        return internal
    return '%s (T%s)' % (TRIAL_NAMES.get(m.group(2), m.group(2)), m.group(1))


def decode_run(entry, N):
    d = json.loads(entry['runDataJson'])
    sc = d['startingConditions']

    def nm(g):
        v = N.get(g)
        return (v.get('name') or v.get('internal')) if v else g

    def internal(g):
        v = N.get(g)
        return v['internal'] if v else None

    champ_card = internal(d['cards'][0]['cardDataID']) if d['cards'] else None
    relics, mutators, defeat = [], [], {}
    for x in d['blessings']:
        g = x['relicDataID']; v = N.get(g, {})
        m = re.match(r'SoulSavior_Region(\d)Complete_(\d)$', v.get('internal') or '')
        if m:
            defeat[int(m.group(1))] = v.get('name')
        elif v.get('kind') == 'CollectableRelicData':
            relics.append(v.get('name') or v.get('internal'))
        else:
            mutators.append(v.get('name') or v.get('internal'))

    battles = []
    for ring_pos, b in enumerate(d['completedBattles']):
        bi, si = b['battleIndex'], b['scenarioIndex']
        rec = {'order': ring_pos, 'battleIndex': bi, 'scenarioIndex': si,
               'turns': b['turnsLasted'], 'healthLost': b['healthLost'], 'scoreEvent': b['scoreEvent']}
        if b['trialID']:
            rec['trial'] = trial_name(internal(b['trialID']))
        if bi == 0:
            rec['battle'] = 'Astrael'
        elif bi == 9:
            rec['battle'] = 'Lifemother: ' + LIFEMOTHER.get(si, str(si))
        else:
            first = bi if bi in REGIONS else bi - 1
            rn, rname = REGIONS[first]
            if bi == first:
                rec['battle'] = '%s wave set: %s' % (rname, WAVE_SETS[rn].get(si, si))
            else:
                rec['battle'] = '%s boss: %s' % (rname, BOSS_VARIANTS[rn].get(si, si))
        battles.append(rec)

    # region fight order (ring): a region = its two consecutive battles
    route = [b['battle'].split(' ')[0] for b in battles
             if b['battleIndex'] not in (0, 9) and b['battleIndex'] % 2 == 1]
    cls = N.get(sc['mainClassInfo']['classId'], {})
    return {
        'id': d['id'], 'saveDateUTC': entry['saveDate'], 'victory': d['victory'],
        'score': d['score'], 'runTimeSec': d['runTime'], 'gold': d['gold'],
        'primaryClan': nm(sc['mainClassInfo']['classId']),
        'primaryChampion': CHAMPION_BY_CARD.get(champ_card, champ_card),
        'alliedClan': nm(sc['subclassInfo']['classId']),
        'pyreHeart': nm(sc['pyreCharacterId']),
        'souls': [nm(x['relicDataID']) for x in d['souls']],
        'relics': relics, 'otherMutators': mutators,
        'regionBossDefeatMutators': defeat,
        'route': route, 'battles': battles,
        'undos': d['numUndosUsedThisRun'], 'restarts': d['numRestartsUsedThisRun'],
        'noUndoNoRestart': d['numUndosUsedThisRun'] == 0 and d['numRestartsUsedThisRun'] == 0,
    }


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('history', nargs='?', default='mt2-save-copy/run-history/RunHistory.json')
    ap.add_argument('--names', default='out/guid_names.json')
    ap.add_argument('--out', default='out/runs_decoded.json')
    a = ap.parse_args()
    N = json.load(open(a.names))
    entries = json.load(open(a.history))['_runEntries']
    runs = [decode_run(e, N) for e in entries]
    json.dump(runs, open(a.out, 'w'), indent=1, ensure_ascii=False)
    print(len(runs), 'runs ->', a.out)
    rec = defaultdict(lambda: [0, 0])
    for r in runs:
        rec[r['primaryChampion']][0 if r['victory'] else 1] += 1
    print('Champion  W-L (last %d runs):' % len(runs))
    for k, (w, l) in sorted(rec.items(), key=lambda kv: -sum(kv[1])):
        print('  %-24s %d-%d' % (k, w, l))
