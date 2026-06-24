#!/usr/bin/env python3
"""
mt2_extract_descriptions.py — PARTIAL extractor for per-enemy ability
descriptions ("Gain Titanskin 3 and restore 20 health."), written for review,
not yet complete. See docs/enemy_descriptions.md for the full write-up.

What it does (works reliably):
  - For each Soul Savior enemy (list + internal names read from
    enemy_observations.csv), reads its CharacterData and resolves the
    `CharacterData_descriptionKey-…-v2` localization key via the Localizer.
    That yields a TEMPLATE with placeholders, e.g.:
        "Gain [titanskin] [effect0.status0.power] and restore [effect1.power] health."
  - Substitutes the two easy placeholder kinds:
      * [keyword]  → a readable status name (DISPLAY map below): titanskin → "Titanskin".
      * [effectN.statusM.power] / [effectN.upgrade.statusM.power]
                   → the status's amount, read as the 4-byte-aligned int32
                     immediately after the keyword's length-prefixed string in
                     the CharacterData chunk (status_power()). Paired with the
                     adjacent [keyword] placeholder (either order).
  - Writes out/enemy_descriptions.xlsx (Name | Internal | filled | raw template).

What it does NOT do yet (the gaps — left as markers in the output):
  - `?`   : some status amounts don't resolve because that status (observed:
            infested, rage, meleeweakness, emberdrain, damageshield,
            spellshield, lifesteal) is NOT stored inline as a keyword string —
            it's a PPtr reference to a separate StatusEffectData object, so the
            power isn't sitting right after a keyword in this chunk. To finish:
            parse each effect's statusEffectStackList = [{PPtr statusEffectData,
            int count}, …] and take `count` (resolve the PPtr only if you also
            want to confirm the keyword).
  - `{?}` : non-status `[effectN.power]` amounts (Heal/self-damage/pyre-damage,
            e.g. Glutmass's "restore 20 health", Flagellant's "Take X damage").
            These are the effect's paramInt, buried deeper in the CardEffect
            block (className strings seen: CardEffectHeal, CardEffectDamage,
            CardEffectAddStatusEffect). Layout not yet decoded — needs the
            CardEffectData field offsets relative to the className.
  - The leading starting-keyword (e.g. Glutmass's "Trample.") and the trigger
    prefix (e.g. "Gorge:") are NOT in the descriptionKey at all — they're a
    separate starting-status list + trigger data (this was "option C", not done).

Status at last run (2026-06-24): ~15/31 fully auto-filled, ~10 with a `?`,
~7 with a `{?}`; Longlash / Mother's Hunter have no descriptionKey (basic
attackers), Mother's Spearman is excluded from extraction.

Usage:  python3 mt2_extract_descriptions.py ["Contents/Resources/Data"] [--csv enemy_observations.csv] [--out out]
"""
import sys, os, re, csv, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mt2_lib import parse_assets, find_data_dir, iter_characters, Localizer

# Status keyword id (as it appears in the descriptionKey template / inline in
# the chunk) → readable display name.
DISPLAY = {
    'titanskin': 'Titanskin', 'burst': 'Burst', 'dazed': 'Dazed',
    'infested': 'Infested', 'malaise': 'Malaise', 'armor': 'Armor',
    'rage': 'Rage', 'regen': 'Regen', 'witherbloom': 'Witherbloom',
    'haste': 'Haste', 'multistrike': 'Multistrike', 'meleeweakness': 'Melee Weakness',
    'damageshield': 'Damage Shield', 'spellshield': 'Spell Shield',
    'lifesteal': 'Lifesteal', 'emberdrain': 'Emberdrain', 'titanite': 'Titanite',
    'soulscourge': 'Soulscourge',
}
KW = '|'.join(map(re.escape, DISPLAY))


def status_power(chunk, kw):
    """Amount of an INLINE status: int32 right after the keyword's
    length-prefixed string (4-byte aligned). Returns None if the keyword isn't
    stored inline here (then it's a PPtr-referenced status — see module docs)."""
    kb = kw.encode()
    i = chunk.find(kb)
    while i >= 0:
        if i >= 4 and struct.unpack_from('<i', chunk, i - 4)[0] == len(kb):
            end = (i + len(kb) + 3) & ~3  # align up to 4
            if end + 4 <= len(chunk):
                return struct.unpack_from('<i', chunk, end)[0]
        i = chunk.find(kb, i + 1)
    return None


def fill(tmpl, chunk):
    """Substitute keyword names and inline status powers; mark gaps."""
    def kp(m):  # [keyword] [..statusN.power]
        p = status_power(chunk, m.group(1))
        return '%s %s' % (DISPLAY[m.group(1)], p if p is not None else '?')

    def pk(m):  # [..statusN.power] [keyword]
        p = status_power(chunk, m.group(1))
        return '%s %s' % (p if p is not None else '?', DISPLAY[m.group(1)])

    tmpl = re.sub(r'\[(' + KW + r')\]\s+\[[^\]]*\.status\d+\.power\]', kp, tmpl)
    tmpl = re.sub(r'\[[^\]]*\.status\d+\.power\]\s+\[(' + KW + r')\]', pk, tmpl)
    tmpl = re.sub(r'\[(' + KW + r')\]', lambda m: DISPLAY[m.group(1)], tmpl)  # bare keywords
    tmpl = re.sub(r'\[effect\d+\.power\]', '{?}', tmpl)  # non-status powers — TODO
    return tmpl


def main():
    argv = sys.argv[1:]
    csv_path = argv[argv.index('--csv') + 1] if '--csv' in argv else 'enemy_observations.csv'
    outdir = argv[argv.index('--out') + 1] if '--out' in argv else 'out'
    pos = [a for a in argv if not a.startswith('--') and a not in (csv_path, outdir)]
    data_dir = pos[0] if pos else find_data_dir('.')

    data, objs, le = parse_assets(os.path.join(data_dir, 'sharedassets0.assets'))
    loc = Localizer(os.path.join(data_dir, 'resources.assets'))
    byint = {}
    for ch in iter_characters(data, objs, le):
        for (pid, off, size, cid, tid) in objs:
            if pid == ch['pid']:
                byint[ch['internal']] = data[off:off + size]
                break

    out = []
    for r in csv.DictReader(open(csv_path)):
        c = byint.get(r['Internal'])
        if not c:
            out.append((r['Name'], r['Internal'], '(no data — excluded)', ''))
            continue
        dk = re.search(rb'(CharacterData_descriptionKey-[ -~]+?-v2)', c)
        tmpl = loc.resolve(dk.group(1).decode()) if dk else ''
        filled = fill(tmpl, c).replace('<br>', ' / ') if tmpl else ''
        out.append((r['Name'], r['Internal'], filled, tmpl or ''))

    os.makedirs(outdir, exist_ok=True)
    try:
        import openpyxl
        wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'Enemy Descriptions'
        ws.append(['Name', 'Internal', 'Description (filled)', 'Raw template'])
        for row in out:
            ws.append(list(row))
        for col, w in zip('ABCD', [26, 38, 60, 60]):
            ws.column_dimensions[col].width = w
        path = os.path.join(outdir, 'enemy_descriptions.xlsx')
        wb.save(path)
        print('Wrote', path)
    except ImportError:
        print('(openpyxl not installed — printing instead)')
    for nm, _, f, _ in out:
        print('%-26s %s' % (nm, f or '(none)'))


if __name__ == '__main__':
    main()
