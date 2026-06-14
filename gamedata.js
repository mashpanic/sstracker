// gamedata.js — PIPELINE-GENERATED game data (bucket ①).
//
// This file is the seam between the extraction pipeline and the tracker app.
// Its contents are sourced from the .assets extraction (roster/scaling/waves)
// and are intended to eventually be emitted by the Python pipeline, replacing
// the hand-stubbed placeholders below ('0⚔️ 0❤️' / 'Waves: TBD').
//
// Do NOT put hand-authored prose here (mutator effects, ability text) — that
// lives in gamefacts.js, which the pipeline must never overwrite.
//
// Loaded as a classic <script> before app.js; these top-level consts are
// visible to app.js by their bare names.

// ---- Per-variant stats by visit order ----
// Keyed by variant name. Each array holds [order1, order2, order3, order4] stats.
// Applies to all four main-region bosses (battle and boss rows).
// Astrael and Lifemother are excluded — their stats don't scale with visit order.
const BOSS_STATS = {
    // Astrael (fixed stats, no order scaling)
    "Mother's Flagellant":      '0⚔️ 0❤️',
    "Mother's Hunter":          '0⚔️ 0❤️',
    // Lifemother (fixed stats, no order scaling)
    'The Corpseflower':         '0⚔️ 0❤️',
    'The Swarmhost':            '0⚔️ 0❤️',
    'The Undying Bloom':        '0⚔️ 0❤️',
    // Maera Battle
    'Athane the Fallen':        ['0⚔️ 0❤️', '0⚔️ 0❤️', '44⚔️ 2908❤️', '0⚔️ 0❤️'],
    'Korin the Judged':         ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    // Maera Boss
    'Stern Sister':             ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    'Sibling Hierarchy':        ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    'Eldest Scion':             ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    // Thaddeus Battle
    'Elebor the Unstoppable':   ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '66⚔️ 4867❤️'],
    'Quoto the Destroyer':      ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    // Thaddeus Boss
    'Train Chomper':            ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    'Thick Skinned':            ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    'Insatiable':               ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    // Tivi Battle
    'Phalanx':                  ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    'The Undying Spirit':       ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    // Tivi Boss
    'Duplicitous':              ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    'Mischevious Child':        ['21⚔️ 1320❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    'Prankster':                ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    // Lylith Battle
    'Qel the Malaiser':         ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    'Ajax the Deathbringer':    ['0⚔️ 0❤️', '29⚔️ 1470❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    // Lylith Boss
    'Plaguebringer':            ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    'Energy Vampire':           ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
    'Inoculation':              ['0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️', '0⚔️ 0❤️'],
};

// ---- Boss wave descriptions ----
// Keyed by region name. Each region boss has a single wave composition regardless
// of which boss variant appears. Appended to the info box for boss rows.
// NOTE (CLAUDE.md TODO): waves.md actually has 3 distinct boss-battle wave sets
// per region (one per variant); this likely needs to become per-variant.
const BOSS_WAVE_DESCRIPTIONS = {
    'astrael':  'Waves: TBD',
    'maera':    'Waves: TBD',
    'thaddeus': 'Waves: TBD',
    'tivi':     'Waves: TBD',
    'lylith':   'Waves: TBD',
    'lifemother': 'Waves: TBD',
};

// ---- Wave set descriptions ----
// Keyed by wave set name. Appended to the info box when a battle row is selected
// and a wave set is chosen.
const WAVE_SET_DESCRIPTIONS = {
    'Dutiful Sentinels': 'Waves: TBD',
    'Favored Ascent':    'Waves: TBD',
    'Gluttonous Masses': 'Waves: TBD',
    'Harassing Snipers': 'Waves: TBD',
    'Rabble-Rousers':    'Waves: TBD',
    'Plague Legion':     'Waves: TBD',
};
