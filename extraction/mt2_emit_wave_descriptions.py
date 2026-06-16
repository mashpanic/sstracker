#!/usr/bin/env python3
"""
mt2_emit_wave_descriptions.py — emit the BOSS_WAVE_DESCRIPTIONS and
WAVE_SET_DESCRIPTIONS blocks for gamedata.js from out/waves.json.

This is the first piece of the eventual "pipeline emits gamedata.js" job
(see CLAUDE.md). It reads the extracted wave compositions and renders one
human-readable string per visit order (O1–O4), keyed the way app.js looks
them up:
  - WAVE_SET_DESCRIPTIONS — keyed by wave-set name (battle rows), [O1..O4].
  - BOSS_WAVE_DESCRIPTIONS — keyed by boss *variant* name (boss/standalone
    rows). Main-region bosses → [O1..O4]; Astrael (O1 only) and Lifemother
    (O4 only) → a single string.

The variant↔scenario pairings below are the ones resolved in CLAUDE.md
(R1 confirmed in-game, R3/R5 by mechanic suffix, R2/R4 by boss internal name).

Usage:  python3 mt2_emit_wave_descriptions.py [--in out] [--write gamedata.js]
  --in     dir holding waves.json (default: out)
  --write  if given, rewrite the two const blocks in this gamedata.js in place;
           otherwise the blocks are printed to stdout.
"""
import sys, os, re, json

# wave-set name (WAVE_SET_OPTIONS in gamefacts.js) → scenario key.
# The emitted wave string ends with whichever minor boss the extractor found in
# that scenario, but the boss is chosen independently of the wave set — app.js
# swapBattleBoss() substitutes the actually-selected battle variant at render
# time, so don't treat the baked-in boss name here as authoritative.
WAVESET_TO_SCENARIO = {
    'Dutiful Sentinels': 'SoulSavior_R1_Battle_HealOnShiftHeavy',
    'Favored Ascent':    'SoulSavior_R1_Battle_AscendAttacker',
    'Gluttonous Masses': 'SoulSavior_R2_Battle_TroopBuffFeed',  # Elebor/Quoto share
    'Harassing Snipers': 'SoulSavior_R3_Battle_StealthSniper',
    'Rabble-Rousers':    'SoulSavior_R3_Battle_Decoys',
    'Plague Legion':     'SoulSavior_R4_Battle_MultistrikeDebuffer',  # Qel/Ajax share
}

# boss variant name (VARIANT_OPTIONS in gamefacts.js) → scenario key
BOSSVARIANT_TO_SCENARIO = {
    # Astrael (R0, O1 only) — verified by which scenario holds each enemy
    "Mother's Hunter":     'SoulSavior_R0_Battle_Infested',
    "Mother's Flagellant": 'SoulSavior_R0_Battle_Morsels',
    # Maera (R1) — Sibling Hierarchy confirmed in-game
    'Stern Sister':        'SoulSavior_R1_BossBattle_DutifulChild_Burst',
    'Sibling Hierarchy':   'SoulSavior_R1_BossBattle_DutifulChild_AscendDescend',
    'Eldest Scion':        'SoulSavior_R1_BossBattle_DutifulChild_Heal',
    # Thaddeus (R2) — by boss internal name
    'Insatiable':          'SoulSavior_R2_BossBattle_FavoredChild_1',  # GorgeOnSlay
    'Train Chomper':       'SoulSavior_R2_BossBattle_FavoredChild_2',  # ReduceCapacityResolve
    'Thick Skinned':       'SoulSavior_R2_BossBattle_FavoredChild_3',  # Titanskin
    # Tivi (R3) — by mechanic suffix
    'Duplicitous':         'SoulSavior_R3_BossBattle_DuplicateEnemy',
    'Prankster':           'SoulSavior_R3_BossBattle_Scourge',
    'Mischevious Child':   'SoulSavior_R3_BossBattle_StealBuffs1',
    # Lylith (R4) — by boss internal name
    'Plaguebringer':       'SoulSavior_R4_BossBattle_EstrangedChild_1',  # DualismAt50
    'Inoculation':         'SoulSavior_R4_BossBattle_EstrangedChild_2',  # ArmorPerDebuff
    'Energy Vampire':      'SoulSavior_R4_BossBattle_EstrangedChild_3',  # WitherbloomOnAction
    # Lifemother (R5, O4 only) — by mechanic suffix
    'The Corpseflower':    'SoulSavior_R5_BossBattle_Lifemother_Debuffs',
    'The Swarmhost':       'SoulSavior_R5_BossBattle_Lifemother_Infested',
    'The Undying Bloom':   'SoulSavior_R5_BossBattle_Lifemother_Reanimate',
}

CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫'

# In-game combatant display names to show under a friendlier label in the wave
# lists. The Lifemother's Corpseflower form is named "Cycle Ender" in-game,
# which doesn't match its variant name — show the variant name instead. (The
# Swarmhost / Undying Bloom combatant names already contain their variant name,
# so no override is needed for them.)
DISPLAY_OVERRIDE = {
    'The Lifemother - Cycle Ender': 'The Corpseflower',
}


def fmt_wave(wave, idx):
    # List every enemy individually (no count consolidation).
    parts = [DISPLAY_OVERRIDE.get(e['display'], e['display']) for e in wave]
    num = CIRCLED[idx] if idx < len(CIRCLED) else f'({idx+1})'
    return f'{num} ' + ', '.join(parts)


def order_string(scenario, order_idx):
    """Render the wave list for one visit order (0-based), one wave per line."""
    waves = scenario['tiers'].get(str(order_idx), [])
    if not waves:
        return None
    return '<br>'.join(fmt_wave(w, i) for i, w in enumerate(waves))


def build(scenario):
    """Return either a single string (one order) or a 4-element [O1..O4] list."""
    present = [o for o in range(4) if scenario['tiers'].get(str(o))]
    if len(present) == 1:
        return order_string(scenario, present[0])
    return [order_string(scenario, o) or '—' for o in range(4)]


def render_block(const_name, mapping, data, comment):
    lines = [comment, f'const {const_name} = {{']
    for variant, key in mapping.items():
        if key not in data:
            val = 'Waves: TBD'
        else:
            val = build(data[key])
        lines.append(f'    {json.dumps(variant)}: {json.dumps(val, ensure_ascii=False)},')
    lines.append('};')
    return '\n'.join(lines)


def main():
    argv = sys.argv[1:]
    indir = argv[argv.index('--in') + 1] if '--in' in argv else 'out'
    target = argv[argv.index('--write') + 1] if '--write' in argv else None
    data = json.load(open(os.path.join(indir, 'waves.json')))

    boss = render_block(
        'BOSS_WAVE_DESCRIPTIONS', BOSSVARIANT_TO_SCENARIO, data,
        '// ---- Boss wave descriptions ----\n'
        '// Keyed by boss VARIANT name. Main-region bosses are order-scaled\n'
        '// ([O1..O4]); Astrael (O1 only) and Lifemother (O4 only) are single\n'
        '// strings. Appended to the info box for boss / standalone rows.')
    waveset = render_block(
        'WAVE_SET_DESCRIPTIONS', WAVESET_TO_SCENARIO, data,
        '// ---- Wave set descriptions ----\n'
        '// Keyed by wave-set name, order-scaled [O1..O4]. Appended to the info\n'
        '// box when a battle row is selected and a wave set is chosen.')

    if not target:
        print(boss + '\n\n' + waveset)
        return

    src = open(target).read()
    for const_name, block in (('BOSS_WAVE_DESCRIPTIONS', boss),
                              ('WAVE_SET_DESCRIPTIONS', waveset)):
        # Replace the leading comment block + the const declaration.
        pat = re.compile(
            r'(?:^//[^\n]*\n)*' + r'const ' + const_name + r' = \{.*?\n\};',
            re.DOTALL | re.MULTILINE)
        src, n = pat.subn(lambda _: block, src, count=1)
        if n != 1:
            sys.exit(f'ERROR: could not locate {const_name} block in {target}')
    open(target, 'w').write(src)
    print(f'Updated {target}')


if __name__ == '__main__':
    main()
