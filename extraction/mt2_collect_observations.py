#!/usr/bin/env python3
"""mt2_collect_observations.py — guided TUI to collect enemy ATK/HP/notes
across all three Soul Savior difficulties (Bloom / Tangle / Overgrowth).

This is a *data-entry* tool, not part of the extraction pipeline. Non-boss
enemy order-scaling has never been solved (see docs/enemy_scaling.md), so these
stats must be observed in-game. The existing enemy_observations.csv covers
Overgrowth only; this tool extends the same hand-observation to Bloom + Tangle
and writes a long-format file intended primarily for the wiki community.

It walks a run the way you actually play one:

    Astrael (O1, fixed first)
      → four mid regions in the visit sequence YOU choose (1st entered = O1 …
        4th = O4; earlier = weaker), the order being your routing decision
      → Lifemother (O5, fixed last — its own scaling tier beyond the four rings)

At each battle it lists the non-boss enemies present (from out/waves.json at the
chosen ring) and prompts for any cell not yet recorded for the current
difficulty. Stats key on (difficulty, internal, order) — NOT scenario — so an
enemy is asked for once per run even when it recurs across battles.

Menus are sourced from gamefacts.js (WAVE_SET_OPTIONS, VARIANT_OPTIONS) and the
scenario pairings in mt2_emit_wave_descriptions.py, so the tool stays in sync
with the rest of the project. On first run the Overgrowth column is seeded from
enemy_observations.csv.

Output: difficulty_observations.csv at repo root, columns
    difficulty, internal, display, order, atk, hp, note, verified
where verified is Yes/No — Yes once a value has been entered/confirmed through
the run-walk (the act of observing in-game); No for bulk-seeded/prefilled rows
that still need confirmation.

Usage:  python3 extraction/mt2_collect_observations.py [--out FILE] [--reseed]
        python3 extraction/mt2_collect_observations.py --check [--out FILE]
        python3 extraction/mt2_collect_observations.py --prefill-base DIFFICULTY
"""
import sys, os, re, csv, ast, json
try:
    import gnureadline as readline   # GNU readline; on macOS replaces the default
except ImportError:                  # libedit and supports pre-filling the line
    try:
        import readline              # stdlib (libedit on macOS — arrow editing +
    except ImportError:              # history, but no prefill)
        readline = None
try:
    import termios, tty              # POSIX raw-mode single-keypress menus (choose)
except ImportError:                  # non-POSIX: fall back to typed-line menus
    termios = tty = None

# Pre-loading an existing value into the editable line ("prefill") only works on
# GNU readline, not macOS's libedit. Used to edit notes in place; see prompt_note.
CAN_PREFILL = readline is not None and 'libedit' not in (getattr(readline, '__doc__', '') or '')

# ---- TODO (collector) ----
# - Remove the "(skip remaining mid regions)" choice from run_walk's region
#   menu: a real run always visits all four mid regions, so skipping is not a
#   valid option.
# - Astrael "Mother's Hunter" wave-set (SoulSavior_R0_Battle_Infested) offers
#   Mother's Fiend (RAny_Horde_T1_DeathAddsHivemind_Ver2), but it never spawns
#   in that battle in-game — likely a waves.json extraction artifact. Confirm
#   and exclude it so it isn't prompted (fix in the wave extractor, or filter
#   here). Observed in-game composition: 3 waves of 2x Mother's Hunter, then a
#   final wave of Astrael + 1 Mother's Hunter (no Mother's Fiend at all).
# - Do status-effect amounts in enemy descriptions scale with difficulty?
#   Plaguehost's Witherbloom is 3 at Bloom — check Tangle/Overgrowth. If these
#   amounts vary by difficulty, the description/note isn't a single per-enemy
#   string and we'd need per-difficulty description capture.
# - Add "Purified Soul" to the roster — appears to be a Soul Savior unit missing
#   from out/roster.json (so the collector never offers it). Check whether it's
#   filtered out by is_soul_savior() in mt2_extract_roster.py and add it (e.g.
#   via the SOUL_SAVIOR_EXTRA set) if so.
# - O5 (Lifemother) is now its own scaling tier (added 2026-07-08). Lifemother is
#   collected at order 5, and its wave enemies + bosses carry O5 rows in
#   difficulty_observations.csv (seeded as copies of O4, verified=No). The emitters
#   emit 5-element [O1..O5] arrays for ENEMY_STATS/ENEMY_NOTES (BOSS_STATS keeps
#   Lifemother as a single order-invariant string). ATK/HP at O5 are believed
#   equal to O4; the status-effect *amounts* in the notes scale beyond O4, so
#   re-observe the O5 notes in-game (Apply Witherbloom, Malaise, etc.).

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from mt2_emit_wave_descriptions import WAVESET_TO_SCENARIO, BOSSVARIANT_TO_SCENARIO

WAVES_JSON   = os.path.join(REPO, 'out', 'waves.json')
ROSTER_JSON  = os.path.join(REPO, 'out', 'roster.json')
GAMEFACTS_JS = os.path.join(REPO, 'gamefacts.js')
# Legacy wide Overgrowth CSV — deprecated; kept only as the one-time bootstrap
# seed for difficulty_observations.csv (now the master, so this rarely runs).
SEED_CSV     = os.path.join(REPO, 'deprecated', 'enemy_observations.csv')
OUT_CSV      = os.path.join(REPO, 'difficulty_observations.csv')

DIFFICULTIES = ['Bloom', 'Tangle', 'Overgrowth']
FIELDS = ['difficulty', 'internal', 'display', 'order', 'atk', 'hp', 'note', 'verified']
NA_CELLS = {'', '-', '—', 'n/a', 'na'}

# Minor bosses with no Soul Savior wave scenario (each is the alternate of a
# sibling and reuses its wave set), so they never show up in waves.json — their
# stats live only in roster.json. Map the variant name to the roster internal.
MINORBOSS_FALLBACK = {
    'Quoto the Destroyer':   'Boss_SoulSavior_R2_TrainBoss_Titanskin',
    'Ajax the Deathbringer': 'Boss_SoulSavior_R4_TrainBoss_EmberGranter',
}

# Lookup tables populated once in main() (read-only thereafter).
BOSSES = {}        # scenario_key -> (internal, ingame_display, set(orders))
MINORBOSS = {}     # battle-variant name -> boss internal


# ───────────────────────── data sources ─────────────────────────

def read_js_object(js, name):
    """Pull a `const NAME = { ... };` object literal out of a JS file. The two
    objects we read (VARIANT_OPTIONS, WAVE_SET_OPTIONS) are comment-free, so a
    Python literal_eval handles the (single/double-quote, trailing-comma) JS."""
    m = re.search(r'const %s\s*=\s*(\{.*?\n\});' % re.escape(name), js, re.DOTALL)
    if not m:
        sys.exit(f'ERROR: could not find {name} in {GAMEFACTS_JS}')
    return ast.literal_eval(m.group(1))


def load_waves():
    """waves.json → (trash, bosses).

    trash[scenario][tier_int] = [(internal, display), ...]  (non-boss, deduped).
    bosses[scenario] = (internal, ingame_display, set(orders))  (the single
    is_boss combatant — region/minor boss, Astrael, or Lifemother)."""
    wj = json.load(open(WAVES_JSON))
    trash, bosses = {}, {}
    for key, sc in wj.items():
        tiers, boss, b_orders = {}, None, set()
        for t, waves in sc.get('tiers', {}).items():
            seen, lst = set(), []
            for wave in waves:
                for e in wave:
                    if e.get('is_boss'):
                        boss = (e['internal'], e['display'])
                        b_orders.add(int(t) + 1)
                        continue
                    if e['internal'] in seen:
                        continue
                    seen.add(e['internal'])
                    lst.append((e['internal'], e['display']))
            tiers[int(t)] = lst
        trash[key] = tiers
        if boss:
            bosses[key] = (boss[0], boss[1], b_orders)
    return trash, bosses


def build_minorboss_map(wave_set_opts, bosses):
    """battle-variant name → boss internal. Six minor bosses are read straight
    from their wave-set scenario (where the is_boss display IS the variant name);
    Quoto & Ajax have no scenario, so come from MINORBOSS_FALLBACK."""
    m = dict(MINORBOSS_FALLBACK)
    for region in ('maera', 'thaddeus', 'tivi', 'lylith'):
        for ws in wave_set_opts[region]:
            b = bosses.get(WAVESET_TO_SCENARIO[ws])
            if b:
                m[b[1]] = b[0]      # display (== variant name) -> internal
    return m


def build_run_model(variant_opts, wave_set_opts):
    """The fixed run skeleton: Astrael, the four mid regions, Lifemother.

    Each region is a dict with its `battles`. A battle is a dict:
      title   — menu/section label
      kind    — 'boss'  : pick one option; that option IS the boss variant and
                          its scenario carries the boss (Astrael, region boss,
                          Lifemother).
                'minor' : pick the wave-set (trash) AND, separately, the minor
                          boss you fought (they vary independently).
      options — [(label, scenario_key), ...] the player picks among.
      boss_variants — (minor only) the battle-variant names to choose the boss.
      astrael — (boss only) True for Astrael, whose single boss is named by the
                scenario, not the picked option (its options are wave-sets).
    `orders` is the rings a region can be visited at (Astrael O1, Lifemother O4)."""
    def waveset_battle(region):
        return [(name, WAVESET_TO_SCENARIO[name]) for name in wave_set_opts[region]]

    def boss_battle(opt_key):
        return [(name, BOSSVARIANT_TO_SCENARIO[name]) for name in variant_opts[opt_key]]

    astrael = {
        'key': 'astrael', 'name': 'Astrael', 'orders': [1], 'fixed_order': 1,
        'battles': [{'title': 'First Battle', 'kind': 'boss', 'astrael': True,
                     'options': boss_battle('astrael-variant')}],
    }
    lifemother = {
        'key': 'lifemother', 'name': 'Lifemother', 'orders': [5], 'fixed_order': 5,
        'battles': [{'title': 'Final Battle', 'kind': 'boss',
                     'options': boss_battle('lifemother-variant')}],
    }
    mids = []
    for key, name in [('maera', 'Maera'), ('thaddeus', 'Thaddeus'),
                      ('tivi', 'Tivi'), ('lylith', 'Lylith')]:
        mids.append({
            'key': key, 'name': name, 'orders': [1, 2, 3, 4], 'fixed_order': None,
            'battles': [
                {'title': 'First Combat (minor)', 'kind': 'minor',
                 'options': waveset_battle(key),
                 'boss_variants': variant_opts[f'{key}-battle-variant']},
                {'title': 'Region Boss', 'kind': 'boss',
                 'options': boss_battle(f'{key}-boss-variant')},
            ],
        })
    return astrael, mids, lifemother


# ───────────────────────── observation store ─────────────────────────

class Store:
    """Long-format observation table, keyed (difficulty, internal, order).

    Reload-and-merge on save: the whole file is rewritten each save, but first
    re-read from disk so edits made to the file *after* this session started
    (by hand, another tool, or another collector run) are not clobbered — only
    the cells this session actually touched (`dirty`) are overlaid on top. This
    guards against the long-lived-session footgun where a stale in-memory
    snapshot overwrites newer on-disk changes."""

    def __init__(self, path):
        self.path = path
        self.dirty = set()       # (difficulty, internal, order) touched this session
        self.rows = self._read_disk()
        self.display = {r['internal']: r['display'] for r in self.rows.values()}

    def _read_disk(self):
        """{(difficulty, internal, order) -> row dict} from the file (or {})."""
        rows = {}
        if os.path.exists(self.path):
            for r in csv.DictReader(open(self.path, newline='')):
                r.setdefault('verified', 'No')          # tolerate pre-migration files
                if not (r.get('verified') or '').strip():
                    r['verified'] = 'No'
                rows[(r['difficulty'], r['internal'], int(r['order']))] = r
        return rows

    def get(self, difficulty, internal, order):
        return self.rows.get((difficulty, internal, order))

    def upsert(self, difficulty, internal, display, order, atk, hp, note, verified='No'):
        key = (difficulty, internal, order)
        self.rows[key] = {
            'difficulty': difficulty, 'internal': internal, 'display': display,
            'order': order, 'atk': atk, 'hp': hp, 'note': note, 'verified': verified,
        }
        self.display[internal] = display
        self.dirty.add(key)
        self.save()

    def save(self):
        # Re-read disk (picks up external edits), then overlay this session's
        # own changes so we never clobber concurrent edits to untouched rows.
        merged = self._read_disk()
        for key in self.dirty:
            merged[key] = self.rows[key]
        self.rows = merged
        self.display = {r['internal']: r['display'] for r in merged.values()}
        rank = {d: i for i, d in enumerate(DIFFICULTIES)}
        ordered = sorted(merged.values(),
                         key=lambda r: (rank.get(r['difficulty'], 99),
                                        r['display'], r['internal'], int(r['order'])))
        with open(self.path, 'w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=FIELDS)
            w.writeheader()
            for r in ordered:
                w.writerow(r)


def seed_overgrowth(store):
    """First-run seed: copy filled Overgrowth cells out of enemy_observations.csv
    (the wide, Overgrowth-only file) into the long store. Notes left blank — the
    existing per-enemy Description doesn't map to a per-order note."""
    added = 0
    for r in csv.DictReader(open(SEED_CSV, newline='')):
        internal = (r.get('Internal') or '').strip()
        display = (r.get('Name') or '').strip()
        if not internal:
            continue
        for o in (1, 2, 3, 4):
            atk = (r.get(f'O{o} ATK') or '').strip()
            hp = (r.get(f'O{o} HP') or '').strip()
            if atk.lower() in NA_CELLS or hp.lower() in NA_CELLS:
                continue
            if store.get('Overgrowth', internal, o):
                continue
            store.upsert('Overgrowth', internal, display, o, atk, hp, '')
            added += 1
    return added


def prefill_base(store, scen, difficulty):
    """Fill every reachable non-boss (enemy, order) cell for `difficulty` that
    isn't already recorded with the enemy's roster BASE stats, left
    verified='No'. Used to seed Bloom under the hypothesis that Bloom enemies
    don't scale (sit at base) — so they can be eyeballed against the game while
    collecting bosses; confirm one by re-recording it in the walk (which flips
    it to verified='Yes'). Existing observations are left untouched. Bosses are
    excluded (they scale)."""
    roster = {e['internal']: e for e in json.load(open(ROSTER_JSON))}
    cells = {}                                  # (internal, order) -> display
    for tiers in scen.values():
        for t, lst in tiers.items():
            for internal, display in lst:
                cells[(internal, t + 1)] = display
    added, missing = 0, set()
    for (internal, order), display in sorted(cells.items()):
        if store.get(difficulty, internal, order):
            continue
        e = roster.get(internal)
        if not e:
            missing.add(internal)
            continue
        store.upsert(difficulty, internal, display, order, str(e['atk']), str(e['hp']), '')
        added += 1
    if missing:
        print('  (no roster base for: ' + ', '.join(sorted(missing)) + ')')
    return added


# ───────────────────────── TUI helpers ─────────────────────────

class Back(Exception):
    """Raised by prompts when the user types 'b' to step back a level."""


def prompt(msg, default=None, prefill=None):
    """One line of input. 'q' quits the program; 'b' raises Back.

    If `prefill` is given and the readline backend supports it (GNU readline, not
    macOS libedit), it is pre-loaded into the editable line so it can be tweaked
    in place; the returned value is whatever the line holds (so a cleared line
    returns ''). Otherwise a `[default]` hint shows and a blank entry returns the
    default."""
    use_prefill = prefill is not None and CAN_PREFILL
    suffix = '' if use_prefill else (f' [{default}]' if default not in (None, '') else '')
    try:
        if use_prefill:
            readline.set_startup_hook(lambda: readline.insert_text(prefill))
            try:
                raw = input(f'{msg}{suffix}: ').strip()
            finally:
                readline.set_startup_hook()
        else:
            raw = input(f'{msg}{suffix}: ').strip()
    except (EOFError, KeyboardInterrupt):
        print('\nbye.')
        sys.exit(0)
    if raw.lower() == 'q':
        print('\nbye.')
        sys.exit(0)
    if raw.lower() == 'b':
        raise Back
    if use_prefill:
        return raw
    return raw if raw else (str(default) if default is not None else '')


def read_key():
    """Read one keypress without Enter (POSIX cbreak mode). Returns the char;
    '' on EOF (Ctrl-D). Ctrl-C still raises KeyboardInterrupt under cbreak."""
    fd = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setcbreak(fd)
        return sys.stdin.read(1)
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)


def choose(title, options, allow_back=True):
    """Numbered menu. options = list of (label, value). Returns chosen value.

    On an interactive TTY with <=9 options a single keypress selects (no Enter);
    bigger menus or non-interactive stdin (piped input/tests) fall back to a
    typed line via prompt()."""
    print(f'\n{title}')
    for i, (label, _) in enumerate(options, 1):
        print(f'  {i}. {label}')
    hint = '#' + (', b=back, q=quit' if allow_back else ', q=quit')
    one_key = termios is not None and sys.stdin.isatty() and len(options) <= 9
    while True:
        if one_key:
            sys.stdout.write(f'Select {hint}: ')
            sys.stdout.flush()
            try:
                ch = read_key()
            except KeyboardInterrupt:
                print('\nbye.')
                sys.exit(0)
            print(ch if ch.isprintable() else '')   # echo the keypress
            if ch in ('', 'q', 'Q', '\x03', '\x04'):
                print('bye.')
                sys.exit(0)
            if allow_back and ch in ('b', 'B'):
                raise Back
            raw = ch
        else:
            raw = prompt(f'Select {hint}')
        if raw.isdigit() and 1 <= int(raw) <= len(options):
            return options[int(raw) - 1][1]
        print('  ? press the number of a listed option.')


def recorded(rec):
    """True when a row carries both ATK and HP (verified or not). A notes-only
    row (blank stats) is NOT recorded."""
    return bool(rec and (rec['atk'] or '').strip() and (rec['hp'] or '').strip())


def is_verified(rec):
    """True when a row's stats were confirmed in-game (verified=Yes). The walk
    keys its ✓ mark and 'remaining' counts on THIS, not on `recorded`, so a
    bulk-seeded row (verified=No, even with provisional ATK/HP) still shows as
    needing attention until you confirm it in the walk."""
    return bool(rec and (rec.get('verified') or '').strip() == 'Yes')


def stat_label(rec):
    if not rec:
        return '—'
    note = f'  · {rec["note"]}' if rec.get('note') else ''
    if not recorded(rec):
        return f'—{note}'           # notes-only seed row: stats not collected yet
    flag = '' if is_verified(rec) else ' (unverified)'
    return f'{rec["atk"]}⚔️ {rec["hp"]}❤️{flag}{note}'


# ───────────────────────── collection ─────────────────────────

def collect_battle(store, scen, difficulty, scenario_key, order, title, bosses=()):
    """Prompt for the combatants in `scenario_key` at this `order` — the boss(es)
    of the battle (`bosses` = [(internal, display, orders_set)]) plus the trash.

    Lists the units present at this order (tier gating from waves.json — lower
    orders spawn fewer enemies). Bosses are listed first, marked ★, and recorded
    into the same file as the trash."""
    tiers = scen.get(scenario_key, {})
    if not tiers and not bosses:
        print(f'  (no recorded combatants for {scenario_key})')
        return
    # here = (internal, display, is_boss) present at this order; bosses first.
    here = [(i, d, True) for i, d, o in bosses if order in o]
    # Clamp the tier lookup to the deepest wave tier we have data for: waves.json
    # only encodes tiers 0-3 (T1-T4), but Lifemother is collected at O5, so its
    # trash lives at the top tier (3) — order-1 == 4 has no tier, fall back to it.
    trash_tier = order - 1
    if tiers and trash_tier not in tiers:
        trash_tier = min(trash_tier, max(tiers))
    here += [(i, d, False) for i, d in tiers.get(trash_tier, [])]
    while True:
        print(f'\n── {title}  (O{order}) ──')
        for i, (internal, display, is_boss) in enumerate(here, 1):
            rec = store.get(difficulty, internal, order)
            mark = '✓' if is_verified(rec) else ('~' if recorded(rec) else ' ')
            tag = '★ ' if is_boss else '  '
            print(f'  {mark}{i:2d}. {tag}{display:24s}  {stat_label(rec)}')
        try:
            raw = prompt('Enter # to record (blank=done with battle)')
        except Back:
            return
        if raw == '':
            return
        if not (raw.isdigit() and 1 <= int(raw) <= len(here)):
            print('  ? enter a number from the list, or blank to finish.')
            continue
        internal, display, _ = here[int(raw) - 1]
        record_enemy(store, difficulty, internal, display, order)


def prompt_note(current):
    """Edit an observation's note without retyping the whole thing.

    With GNU readline (e.g. `pip install gnureadline` on macOS) the existing note
    is pre-loaded into the editable line for true inline editing — arrow around
    and tweak it, Enter to keep, clear it to blank. On libedit (no prefill) it
    falls back to a keep/clear/append/replace mini-syntax."""
    if not current:
        return prompt('  note (blank=none)')
    if CAN_PREFILL:
        return prompt('  note', prefill=current)
    print(f'  current note: {current}')
    raw = prompt("  note — Enter=keep · '-'=clear · '+ TEXT'=append · else replace",
                 default=current)
    if raw == current:           # blank → default(current) → keep
        return current
    if raw == '-':
        return ''
    if raw.startswith('+'):
        add = raw[1:].strip()
        return f'{current} {add}'.strip() if add else current
    return raw                    # replace


def record_enemy(store, difficulty, internal, display, order):
    rec = store.get(difficulty, internal, order)
    try:
        atk = prompt(f'  {display} ATK', rec['atk'] if rec else None)
        hp = prompt(f'  {display} HP', rec['hp'] if rec else None)
        note = prompt_note(rec['note'] if rec else '')
    except Back:
        print('  (cancelled)')
        return
    if atk == '' or hp == '':
        print('  (skipped — need both ATK and HP)')
        return
    store.upsert(difficulty, internal, display, order, atk, hp, note, verified='Yes')
    print(f'  saved {display}: {atk}⚔️ {hp}❤️ @ O{order} {difficulty} ✓verified')


def region_cells(region, scen, boss_variant=None):
    """All (internal, order) the region can yield — trash AND bosses — across
    every battle option and ring. If `boss_variant` is given (the region boss
    you know you'll face this run), the region-boss battle is narrowed to just
    that variant, so the count reflects what THIS run can actually collect."""
    cells = set()
    for battle in region['battles']:
        options = battle['options']
        if battle['kind'] == 'boss' and boss_variant:
            options = [(l, sk) for l, sk in options if l == boss_variant] or options
        for _, scenario_key in options:
            for order in region['orders']:
                for internal, _ in scen.get(scenario_key, {}).get(order - 1, []):
                    cells.add((internal, order))
            if battle['kind'] == 'boss':
                b = BOSSES.get(scenario_key)
                if b:
                    for order in (b[2] & set(region['orders'])):
                        cells.add((b[0], order))
        if battle['kind'] == 'minor':
            for variant in battle['boss_variants']:
                internal = MINORBOSS.get(variant)
                if internal:
                    for order in region['orders']:
                        cells.add((internal, order))
    return cells


def remaining(store, difficulty, region, scen, boss_variant=None):
    return sum(1 for (i, o) in region_cells(region, scen, boss_variant)
               if not is_verified(store.get(difficulty, i, o)))


def boss_orders_needed(store, difficulty, region, variant):
    """Orders of `variant` (the region's chosen boss) not yet verified — the
    'can I still pick this boss up here?' hint for the routing menu."""
    b = BOSSES.get(BOSSVARIANT_TO_SCENARIO.get(variant, ''))
    if not b:
        return []
    return [o for o in sorted(b[2] & set(region['orders']))
            if not is_verified(store.get(difficulty, b[0], o))]


def pick_scenario(battle, preselect=None):
    """Resolve a battle's (label, scenario_key): use the pre-selected region-boss
    variant if it matches an option, else auto-pick a sole option, else prompt."""
    options = battle['options']
    if preselect:
        for label, sk in options:
            if label == preselect:
                print(f'\n{battle["title"]}: {label}  (pre-selected)')
                return label, sk
    if len(options) == 1:
        label, sk = options[0]
        print(f'\n{battle["title"]}: {label}')
        return label, sk
    labels = [(lbl, (lbl, sk)) for lbl, sk in options]
    return choose(f'{battle["title"]} — which one did you fight?', labels)


def collect_single(store, scen, difficulty, region, battle, order, boss_preselect=None):
    """Resolve one battle's scenario + boss(es) and collect it at `order`. The
    per-battle unit of work shared by the full walk (visit_region) and manual
    mode. May raise Back if you step out of a scenario/boss prompt."""
    preselect = boss_preselect if (battle['kind'] == 'boss'
                                   and not battle.get('astrael')) else None
    label, scenario_key = pick_scenario(battle, preselect)
    bosses = resolve_bosses(battle, scenario_key, label, region['orders'])
    collect_battle(store, scen, difficulty, scenario_key, order,
                   f'{battle["title"]}: {label}', bosses=bosses)


def visit_region(store, scen, difficulty, region, order, boss_preselect=None):
    print(f'\n══════ {region["name"]}  —  Oversoul O{order} ({difficulty}) ══════')
    for battle in region['battles']:
        try:
            collect_single(store, scen, difficulty, region, battle, order, boss_preselect)
        except Back:
            return


def resolve_bosses(battle, scenario_key, label, region_orders):
    """The boss combatant(s) to offer for a battle → [(internal, display, orders)].

    'boss' battle: the picked option IS the variant; its scenario carries the
    boss. Display = the variant label (variants share an in-game name), except
    Astrael, whose options are wave-sets, so use the scenario's boss name.
    'minor' battle: ask which minor boss was fought (boss and wave-set vary
    independently), then map the variant to its internal."""
    if battle['kind'] == 'boss':
        b = BOSSES.get(scenario_key)
        if not b:
            return []
        display = b[1] if battle.get('astrael') else label
        # The designated boss is always present when you fight its own boss
        # battle, so offer it at the region's collectable orders — not the
        # waves-derived tiers b[2], which peg Lifemother at O4 (tier 3) and would
        # wrongly gate it out of its O5 collection.
        return [(b[0], display, set(region_orders))]
    # minor battle — independent boss choice
    variant = choose('Which minor boss did you fight?',
                     [(v, v) for v in battle['boss_variants']])
    internal = MINORBOSS.get(variant)
    return [(internal, variant, set(region_orders))] if internal else []


def run_walk(store, scen, astrael, mids, lifemother):
    difficulty = choose('Difficulty for this run?',
                        [(d, d) for d in DIFFICULTIES], allow_back=False)

    # You know each region's major boss at the start of a run, so pick all four
    # up front. The routing menu then shows which boss (and which of its orders)
    # a visit would let you collect, and the boss battle isn't re-asked later.
    print('\nMajor (region) boss you will face in each region this run:')
    boss_choice = {}
    for r in mids:
        variants = [(lbl, lbl) for lbl, _ in r['battles'][1]['options']]
        boss_choice[r['key']] = choose(f'{r["name"]} boss?', variants, allow_back=False)

    # Lifemother's variant is also known up front, so pick it here with the
    # region bosses; it's collected at the end of the run (preselected, not
    # re-asked). manual_collect prompts the variant separately and is unaffected.
    lm_battle = lifemother['battles'][0]
    lm_variant = choose('Lifemother variant?',
                        [(lbl, lbl) for lbl, _ in lm_battle['options']], allow_back=False)

    # Astrael — fixed O1.
    try:
        visit_region(store, scen, difficulty, astrael, astrael['fixed_order'])
    except Back:
        pass

    # Four mid regions. The player CHOOSES the visit sequence; that choice IS
    # the order (1st region entered = O1 … 4th = O4, earlier = weaker enemies).
    # So the slot counter is the order by definition — no need to ask.
    todo = list(mids)
    slot = 1
    while todo:
        opts = []
        for r in todo:
            variant = boss_choice[r['key']]
            need = boss_orders_needed(store, difficulty, r, variant)
            boss_tag = '✓' if not need else 'need ' + ','.join(f'O{o}' for o in need)
            left = remaining(store, difficulty, r, scen, variant)
            opts.append((f'{r["name"]:9s} — {variant} [{boss_tag}]   ({left} cells left)', r))
        opts.append(('(skip remaining mid regions)', None))
        region = choose(f'Region visited #{slot} (Order {slot}) — which did you enter?',
                        opts, allow_back=False)
        if region is None:
            break
        try:
            visit_region(store, scen, difficulty, region, slot,
                         boss_preselect=boss_choice[region['key']])
        except Back:
            continue
        todo.remove(region)
        slot += 1

    # Lifemother — fixed O4, variant preselected up front.
    try:
        visit_region(store, scen, difficulty, lifemother, lifemother['fixed_order'],
                     boss_preselect=lm_variant)
    except Back:
        pass

    print(f'\nRun complete. {store.path} saved.')
    print('\n── Validation (read-only; your data is already saved) ──')
    run_validator(store, scen)


def manual_collect(store, scen, mids, lifemother):
    """Targeted manual collection (top-level menu). Jump straight to any region's
    battle/boss — or a specific Lifemother variant — and record it at a chosen
    order, instead of walking a full run in visit order. After each collection it
    returns to the region menu; b (back) there returns to the main menu.

    (Astrael is not offered here — it's a single fixed O1 fight; collect it via
    the full walk. The region menu is the four mid regions + Lifemother = 1-5.)"""
    difficulty = choose('Manual collection — difficulty?',
                        [(d, d) for d in DIFFICULTIES], allow_back=False)
    regions = mids + [lifemother]               # Maera-Lylith = 1-4, Lifemother = 5
    while True:
        try:
            region = choose(f'Manual collection ({difficulty}) — pick a region',
                            [(r['name'], r) for r in regions])
        except Back:
            return
        try:
            if region is lifemother:
                # Lifemother: pick the variant (1-3); fixed order (O5).
                battle = lifemother['battles'][0]
                variant = choose('Lifemother — which variant?',
                                 [(lbl, lbl) for lbl, _ in battle['options']])
                collect_single(store, scen, difficulty, lifemother, battle,
                               lifemother['fixed_order'], boss_preselect=variant)
            else:
                # Mid region: battle (minor) or boss (1-2), then an order (1-4).
                battle = choose(f'{region["name"]} — battle or boss?',
                                [(b['title'], b) for b in region['battles']])
                order = choose('Which order?',
                               [(f'O{o}', o) for o in region['orders']])
                collect_single(store, scen, difficulty, region, battle, order)
        except Back:
            continue                            # back out of a sub-prompt → region menu


# ───────────────────────── main ─────────────────────────

def main():
    argv = sys.argv[1:]
    out = argv[argv.index('--out') + 1] if '--out' in argv else OUT_CSV
    reseed = '--reseed' in argv

    store = Store(out)
    scen, bosses = load_waves()
    js = open(GAMEFACTS_JS).read()
    variant_opts = read_js_object(js, 'VARIANT_OPTIONS')
    wave_set_opts = read_js_object(js, 'WAVE_SET_OPTIONS')

    global BOSSES, MINORBOSS
    BOSSES = bosses
    MINORBOSS = build_minorboss_map(wave_set_opts, bosses)

    if '--check' in argv:
        run_validator(store, scen)
        return

    if '--prefill-base' in argv:
        difficulty = argv[argv.index('--prefill-base') + 1]
        if difficulty not in DIFFICULTIES:
            sys.exit(f'ERROR: difficulty must be one of {DIFFICULTIES}')
        n = prefill_base(store, scen, difficulty)
        print(f'Prefilled {n} {difficulty} non-boss cells with roster base stats (verified=No).')
        return

    if reseed or not store.rows:
        n = seed_overgrowth(store)
        print(f'Seeded {n} Overgrowth cells from {os.path.basename(SEED_CSV)}.')

    astrael, mids, lifemother = build_run_model(variant_opts, wave_set_opts)

    print('Soul Savior observation collector. q=quit, b=back at most prompts.')
    while True:
        action = choose('Main menu', [
            ('Walk a run (collect observations)', 'walk'),
            ('Manual collection (pick an encounter)', 'manual'),
            ('Coverage summary', 'summary'),
            ('Quit', 'quit'),
        ], allow_back=False)
        if action == 'quit':
            break
        elif action == 'summary':
            print_summary(store, scen, astrael, mids, lifemother)
        elif action == 'manual':
            manual_collect(store, scen, mids, lifemother)
        else:
            try:
                run_walk(store, scen, astrael, mids, lifemother)
            except Back:
                pass
    note_divergence_warning(store)
    print('bye.')


def reachable_cells(scen):
    """{(internal, order)} that it is actually possible to observe — trash from
    every scenario/tier, plus bosses (region/Astrael/Lifemother from waves.json,
    and the roster-only minor bosses Quoto/Ajax at any order)."""
    cells = set()
    for name, tiers in scen.items():
        r5 = '_R5_' in name          # Lifemother scenarios are collected at O5
        for t, lst in tiers.items():
            for internal, _ in lst:
                cells.add((internal, t + 1))
                if r5:
                    cells.add((internal, 5))
    for key, (internal, _, orders) in BOSSES.items():
        for o in set(orders) | ({5} if '_R5_' in key else set()):
            cells.add((internal, o))
    for internal in MINORBOSS.values():
        for o in (1, 2, 3, 4):
            cells.add((internal, o))
    return cells


def validate(store, scen):
    """Return a list of (category, message) problems in the observation file:

      MONO  — ATK or HP decreases as order rises (should be non-decreasing)
      PAIR  — a row has only one of ATK/HP filled
      NUM   — ATK/HP isn't a non-negative integer (blocks the other checks)
      REACH — a cell is recorded for an (enemy, order) that never appears in
              waves.json (recorded against the wrong order, or a data gap)
      NOTE  — an enemy carries >1 distinct note across its rows. Notes are
              assumed difficulty- and order-invariant (see CLAUDE.md), so a
              divergence is usually a typo to reconcile — but could be a genuine
              per-order/per-difficulty ability change worth recording instead.
    """
    from collections import defaultdict
    reach = reachable_cells(scen)
    series = defaultdict(dict)                  # (difficulty, internal) -> {order: row}
    notes = defaultdict(set)                    # internal -> set of distinct non-empty notes
    for (diff, internal, order), row in store.rows.items():
        series[(diff, internal)][order] = row
        n = (row['note'] or '').strip()
        if n:
            notes[internal].add(n)

    def num(v):
        v = (v or '').strip()
        return int(v) if re.fullmatch(r'\d+', v) else None

    issues = []
    for (diff, internal), byorder in series.items():
        disp = store.display.get(internal, internal)
        for order, row in sorted(byorder.items()):
            atk, hp = (row['atk'] or '').strip(), (row['hp'] or '').strip()
            if bool(atk) != bool(hp):
                issues.append(('PAIR', f'{diff} · {disp} O{order}: only one of ATK/HP filled ({atk!r}/{hp!r})'))
            elif atk and (num(atk) is None or num(hp) is None):
                issues.append(('NUM', f'{diff} · {disp} O{order}: ATK/HP not a non-negative integer ({atk!r}/{hp!r})'))
            if (internal, order) not in reach:
                issues.append(('REACH', f'{diff} · {disp} O{order}: recorded, but this enemy never appears at O{order} in waves.json'))
        for stat in ('atk', 'hp'):
            prev_o = prev_v = None
            for order in sorted(byorder):
                v = num(byorder[order][stat])
                if v is None:
                    continue
                if prev_v is not None and v < prev_v:
                    issues.append(('MONO', f'{diff} · {disp} {stat.upper()}: O{prev_o}={prev_v} → O{order}={v} (decreases; should only rise or hold)'))
                prev_o, prev_v = order, v
    for internal, distinct in sorted(notes.items()):
        if len(distinct) > 1:
            disp = store.display.get(internal, internal)
            joined = ' || '.join(sorted(distinct))
            issues.append(('NOTE', f'{disp} ({internal}): {len(distinct)} distinct notes — {joined}'))
    return issues


def run_validator(store, scen):
    issues = validate(store, scen)
    print(f'Checked {len(store.rows)} observations in {os.path.basename(store.path)}.\n')
    if not issues:
        print('No issues found. ✓')
        return
    from collections import Counter
    order = {'NUM': 0, 'PAIR': 1, 'MONO': 2, 'REACH': 3, 'NOTE': 4}
    for cat, msg in sorted(issues, key=lambda x: (order.get(x[0], 9), x[1])):
        print(f'  [{cat:5s}] {msg}')
    counts = Counter(c for c, _ in issues)
    print('\n' + ', '.join(f'{n} {c}' for c, n in counts.most_common()) + f'  ({len(issues)} total)')


def note_divergence_warning(store):
    """Auto-run on exit from the interactive collector: warn if any enemy now
    carries >1 distinct note across its rows. Notes are assumed difficulty- and
    order-invariant (see CLAUDE.md), so a divergence is usually a typo to
    reconcile — but could be a genuine per-order/difficulty ability change worth
    keeping. Scoped to NOTE only (no MONO/REACH noise); run --check for the rest."""
    from collections import defaultdict
    notes = defaultdict(set)
    for (_, internal, _), row in store.rows.items():
        n = (row['note'] or '').strip()
        if n:
            notes[internal].add(n)
    diverged = {i: d for i, d in notes.items() if len(d) > 1}
    if not diverged:
        return
    print(f'\n⚠️  NOTE divergence: {len(diverged)} enemy(ies) have >1 distinct note '
          f'across orders/difficulties (typo, or a real per-order change?):')
    for internal, distinct in sorted(diverged.items()):
        disp = store.display.get(internal, internal)
        print(f'  · {disp} ({internal}):')
        for n in sorted(distinct):
            print(f'      | {n}')
    print('  → reconcile by hand, or run --check for full validation.')


def print_summary(store, scen, astrael, mids, lifemother):
    print('\nCells remaining (reachable but unrecorded):')
    for d in DIFFICULTIES:
        parts = []
        for region in [astrael, *mids, lifemother]:
            parts.append(f'{region["name"]}={remaining(store, d, region, scen)}')
        print(f'  {d:11s} ' + '  '.join(parts))


if __name__ == '__main__':
    main()
