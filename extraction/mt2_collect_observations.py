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
      → Lifemother (O4, fixed last)

At each battle it lists the non-boss enemies present (from out/waves.json at the
chosen ring) and prompts for any cell not yet recorded for the current
difficulty. Stats key on (difficulty, internal, order) — NOT scenario — so an
enemy is asked for once per run even when it recurs across battles.

Menus are sourced from gamefacts.js (WAVE_SET_OPTIONS, VARIANT_OPTIONS) and the
scenario pairings in mt2_emit_wave_descriptions.py, so the tool stays in sync
with the rest of the project. On first run the Overgrowth column is seeded from
enemy_observations.csv.

Output: difficulty_observations.csv at repo root, columns
    difficulty, internal, display, order, atk, hp, note

Usage:  python3 extraction/mt2_collect_observations.py [--out FILE] [--reseed]
        python3 extraction/mt2_collect_observations.py --check [--out FILE]
        python3 extraction/mt2_collect_observations.py --prefill-base DIFFICULTY
"""
import sys, os, re, csv, ast, json
try:
    import readline  # enables left/right arrow cursor editing + history in input()
except ImportError:
    pass  # not available on some platforms; input() just loses line editing

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
FIELDS = ['difficulty', 'internal', 'display', 'order', 'atk', 'hp', 'note']
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
        'key': 'lifemother', 'name': 'Lifemother', 'orders': [4], 'fixed_order': 4,
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
    """Long-format observation table, keyed (difficulty, internal, order)."""

    def __init__(self, path):
        self.path = path
        self.rows = {}           # (difficulty, internal, order) -> dict
        self.display = {}        # internal -> last-seen display name
        if os.path.exists(path):
            for r in csv.DictReader(open(path, newline='')):
                key = (r['difficulty'], r['internal'], int(r['order']))
                self.rows[key] = r
                self.display[r['internal']] = r['display']

    def get(self, difficulty, internal, order):
        return self.rows.get((difficulty, internal, order))

    def upsert(self, difficulty, internal, display, order, atk, hp, note):
        self.rows[(difficulty, internal, order)] = {
            'difficulty': difficulty, 'internal': internal, 'display': display,
            'order': order, 'atk': atk, 'hp': hp, 'note': note,
        }
        self.display[internal] = display
        self.save()

    def save(self):
        rank = {d: i for i, d in enumerate(DIFFICULTIES)}
        ordered = sorted(self.rows.values(),
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
    isn't already recorded with the enemy's roster BASE stats, tagged note
    'base?'. Used to seed Bloom under the hypothesis that Bloom enemies don't
    scale (sit at base) — so they read as ✓ and can be eyeballed against the
    game while collecting bosses; correct one by re-recording it. Existing
    observations are left untouched. Bosses are excluded (they scale)."""
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
        store.upsert(difficulty, internal, display, order, str(e['atk']), str(e['hp']), 'base?')
        added += 1
    if missing:
        print('  (no roster base for: ' + ', '.join(sorted(missing)) + ')')
    return added


# ───────────────────────── TUI helpers ─────────────────────────

class Back(Exception):
    """Raised by prompts when the user types 'b' to step back a level."""


def prompt(msg, default=None):
    """One line of input. 'q' quits the program; 'b' raises Back."""
    suffix = f' [{default}]' if default not in (None, '') else ''
    try:
        raw = input(f'{msg}{suffix}: ').strip()
    except (EOFError, KeyboardInterrupt):
        print('\nbye.')
        sys.exit(0)
    if raw.lower() == 'q':
        print('\nbye.')
        sys.exit(0)
    if raw.lower() == 'b':
        raise Back
    return raw if raw else (str(default) if default is not None else '')


def choose(title, options, allow_back=True):
    """Numbered menu. options = list of (label, value). Returns chosen value."""
    print(f'\n{title}')
    for i, (label, _) in enumerate(options, 1):
        print(f'  {i}. {label}')
    hint = '#' + (', b=back, q=quit' if allow_back else ', q=quit')
    while True:
        raw = prompt(f'Select {hint}')
        if raw.isdigit() and 1 <= int(raw) <= len(options):
            return options[int(raw) - 1][1]
        print('  ? enter a number from the list.')


def stat_label(rec):
    if not rec:
        return '—'
    note = f'  · {rec["note"]}' if rec.get('note') else ''
    return f'{rec["atk"]}⚔️ {rec["hp"]}❤️{note}'


def fmt_orders(orders):
    """Compact order-range label: {1,2,3,4}→'O1-O4', {3,4}→'O3-O4', {1,3}→'O1,O3'."""
    s = sorted(orders)
    if len(s) > 1 and s == list(range(s[0], s[-1] + 1)):
        return f'O{s[0]}-O{s[-1]}'
    return ','.join(f'O{o}' for o in s)


# ───────────────────────── collection ─────────────────────────

def collect_battle(store, scen, difficulty, scenario_key, order, title, bosses=()):
    """Prompt for the combatants in `scenario_key` at this `order` — the boss(es)
    of the battle (`bosses` = [(internal, display, orders_set)]) plus the trash.

    Lower orders spawn fewer enemies (tier gating from waves.json), so we show
    BOTH what's present at this order (selectable) and what's gated out, each
    tagged with its order-range — so an absent unit is never ambiguous between
    'doesn't appear at this order' and 'missing from the data'. Bosses are
    listed first, marked ★, and recorded into the same file as the trash."""
    tiers = scen.get(scenario_key, {})
    ranges, disp = {}, {}                       # internal -> set(orders) / display
    for t, lst in tiers.items():
        for internal, d in lst:
            ranges.setdefault(internal, set()).add(t + 1)
            disp[internal] = d
    for internal, d, orders in bosses:
        ranges.setdefault(internal, set()).update(orders)
        disp[internal] = d
    if not ranges:
        print(f'  (no recorded combatants for {scenario_key})')
        return
    # here = (internal, display, is_boss) present at this order; bosses first.
    here = [(i, d, True) for i, d, o in bosses if order in o]
    here += [(i, d, False) for i, d in tiers.get(order - 1, [])]
    here_set = {i for i, _, _ in here}
    gated = sorted((disp[i], fmt_orders(ranges[i])) for i in ranges if i not in here_set)
    while True:
        print(f'\n── {title}  (O{order}) ──')
        for i, (internal, display, is_boss) in enumerate(here, 1):
            rec = store.get(difficulty, internal, order)
            mark = '✓' if rec else ' '
            tag = '★ ' if is_boss else '  '
            print(f'  {mark}{i:2d}. {tag}{display:24s} [{fmt_orders(ranges[internal])}]  {stat_label(rec)}')
        if gated:
            print('      not at O%d: %s' % (order, ', '.join(f'{d} [{r}]' for d, r in gated)))
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


def record_enemy(store, difficulty, internal, display, order):
    rec = store.get(difficulty, internal, order)
    try:
        atk = prompt(f'  {display} ATK', rec['atk'] if rec else None)
        hp = prompt(f'  {display} HP', rec['hp'] if rec else None)
        note = prompt('  note (blank=skip)', rec['note'] if rec else None)
    except Back:
        print('  (cancelled)')
        return
    if atk == '' or hp == '':
        print('  (skipped — need both ATK and HP)')
        return
    store.upsert(difficulty, internal, display, order, atk, hp, note)
    print(f'  saved {display}: {atk}⚔️ {hp}❤️ @ O{order} {difficulty}')


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
               if not store.get(difficulty, i, o))


def boss_orders_needed(store, difficulty, region, variant):
    """Orders of `variant` (the region's chosen boss) not yet recorded — the
    'can I still pick this boss up here?' hint for the routing menu."""
    b = BOSSES.get(BOSSVARIANT_TO_SCENARIO.get(variant, ''))
    if not b:
        return []
    return [o for o in sorted(b[2] & set(region['orders']))
            if not store.get(difficulty, b[0], o)]


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


def visit_region(store, scen, difficulty, region, order, boss_preselect=None):
    print(f'\n══════ {region["name"]}  —  Oversoul O{order} ({difficulty}) ══════')
    for battle in region['battles']:
        try:
            preselect = boss_preselect if (battle['kind'] == 'boss'
                                           and not battle.get('astrael')) else None
            label, scenario_key = pick_scenario(battle, preselect)
            bosses = resolve_bosses(battle, scenario_key, label, region['orders'])
        except Back:
            return
        collect_battle(store, scen, difficulty, scenario_key, order,
                       f'{battle["title"]}: {label}', bosses=bosses)


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
        return [(b[0], display, set(b[2]))]
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

    # Lifemother — fixed O4.
    try:
        visit_region(store, scen, difficulty, lifemother, lifemother['fixed_order'])
    except Back:
        pass

    print(f'\nRun complete. {store.path} saved.')
    print('\n── Validation (read-only; your data is already saved) ──')
    run_validator(store, scen)


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
        print(f'Prefilled {n} {difficulty} non-boss cells with roster base stats (note "base?").')
        return

    if reseed or not store.rows:
        n = seed_overgrowth(store)
        print(f'Seeded {n} Overgrowth cells from {os.path.basename(SEED_CSV)}.')

    astrael, mids, lifemother = build_run_model(variant_opts, wave_set_opts)

    print('Soul Savior observation collector. q=quit, b=back at most prompts.')
    while True:
        action = choose('Main menu', [
            ('Walk a run (collect observations)', 'walk'),
            ('Coverage summary', 'summary'),
            ('Quit', 'quit'),
        ], allow_back=False)
        if action == 'quit':
            break
        if action == 'summary':
            print_summary(store, scen, astrael, mids, lifemother)
        else:
            try:
                run_walk(store, scen, astrael, mids, lifemother)
            except Back:
                pass
    print('bye.')


def reachable_cells(scen):
    """{(internal, order)} that it is actually possible to observe — trash from
    every scenario/tier, plus bosses (region/Astrael/Lifemother from waves.json,
    and the roster-only minor bosses Quoto/Ajax at any order)."""
    cells = set()
    for tiers in scen.values():
        for t, lst in tiers.items():
            for internal, _ in lst:
                cells.add((internal, t + 1))
    for internal, _, orders in BOSSES.values():
        for o in orders:
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
    """
    from collections import defaultdict
    reach = reachable_cells(scen)
    series = defaultdict(dict)                  # (difficulty, internal) -> {order: row}
    for (diff, internal, order), row in store.rows.items():
        series[(diff, internal)][order] = row

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
    return issues


def run_validator(store, scen):
    issues = validate(store, scen)
    print(f'Checked {len(store.rows)} observations in {os.path.basename(store.path)}.\n')
    if not issues:
        print('No issues found. ✓')
        return
    from collections import Counter
    order = {'NUM': 0, 'PAIR': 1, 'MONO': 2, 'REACH': 3}
    for cat, msg in sorted(issues, key=lambda x: (order.get(x[0], 9), x[1])):
        print(f'  [{cat:5s}] {msg}')
    counts = Counter(c for c, _ in issues)
    print('\n' + ', '.join(f'{n} {c}' for c, n in counts.most_common()) + f'  ({len(issues)} total)')


def print_summary(store, scen, astrael, mids, lifemother):
    print('\nCells remaining (reachable but unrecorded):')
    for d in DIFFICULTIES:
        parts = []
        for region in [astrael, *mids, lifemother]:
            parts.append(f'{region["name"]}={remaining(store, d, region, scen)}')
        print(f'  {d:11s} ' + '  '.join(parts))


if __name__ == '__main__':
    main()
