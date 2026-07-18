// gamefacts.js — HUMAN-ESTABLISHED game facts (bucket ②).
//
// Everything here was established by a person, NOT extracted from the .assets
// bundle: wiki-sourced prose (see attribution in index.html) and, at the
// bottom, in-game OBSERVED stats and ability notes. The prose must NEVER be
// machine-written; the observed blocks are the one exception — each is
// refreshed in place by its extraction/mt2_emit_*.py script (see the banner
// above them).
//
// Loaded as a classic <script> before app.js; these top-level consts are
// visible to app.js by their bare names.

// ---- Variant selector options ----
// Keyed by the select's element id. Each list holds the variant names available
// for that encounter; a "-- Select Variant --" placeholder is added automatically.
const VARIANT_OPTIONS = {
    'astrael-variant':          ["Mother's Flagellant", "Mother's Hunter"],
    'maera-battle-variant':     ['Athane the Fallen', 'Korin the Judged'],
    'maera-boss-variant':       ['Eldest Scion', 'Sibling Hierarchy', 'Stern Sister'],
    'thaddeus-battle-variant':  ['Elebor the Unstoppable', 'Quoto the Destroyer'],
    'thaddeus-boss-variant':    ['Insatiable', 'Thick Skinned', 'Train Chomper'],
    'tivi-battle-variant':      ['Phalanx', 'The Undying Spirit'],
    'tivi-boss-variant':        ['Duplicitous', 'Mischevious Child', 'Prankster'],
    'lylith-battle-variant':    ['Ajax the Deathbringer', 'Qel the Malaiser'],
    'lylith-boss-variant':      ['Energy Vampire', 'Inoculation', 'Plaguebringer'],
    'lifemother-variant':       ['Corpseflower', 'Swarmhost', 'Undying Bloom']
};

// ---- Wave set selector options ----
// The possible wave sets for each region's First Combat (Battle row).
// Keyed by region name. A "-- Select Wave Set --" placeholder is added automatically.
const WAVE_SET_OPTIONS = {
    'maera':    ['Dutiful Sentinels', 'Favored Ascent'],
    'thaddeus': ['Gluttonous Masses'],
    'tivi':     ['Harassing Snipers', 'Rabble-Rousers'],
    'lylith':   ['Plague Legion'],
};

// ---- Mutators granted on boss defeat ----
// Keyed by boss variant name. Each entry has the mutator name and its effect.
// Only main-region boss variants grant mutators (not battle bosses).
const MUTATORS = {
    // Maera Boss   ('short' = terse effect gist shown in the mutator box;
    //               'name' (flavor) + 'effect' (full) show on hover.)
    'Stern Sister':      { name: 'Anxious',      short: 'Attack on Shift', effect: 'Enemy units gain Attack on Shift.' },
    'Sibling Hierarchy': { name: 'Overachiever', short: 'Boss Burst 3',   effect: 'Bosses enter with Burst.' },
    'Eldest Scion':      { name: 'Guarded',      short: 'Armor on Slay',  effect: 'Enemy units gain Armor equal to their Attack on Slay.' },
    // Thaddeus Boss
    'Train Chomper':     { name: 'Glutton',      short: '-3 Capacity',    effect: 'A random floor loses -3 capacity.' },
    'Thick Skinned':     { name: 'Callous',      short: 'Titanskin 3',    effect: 'Enemy units gain Titanskin 3.' },
    'Insatiable':        { name: 'Spoiled',      short: 'Infested 1',     effect: 'Enemy units gain Infested 1.' },
    // Tivi Boss
    'Duplicitous':       { name: 'Joker',        short: 'Add Jeermasks',  effect: 'At start of battle, spawn a Jeermask on each floor.' },
    'Mischevious Child': { name: 'Insecure',     short: 'Melee Weakness 3', effect: 'Champions enter with Melee Weakness 3.' },
    'Prankster':         { name: 'Tormentor',    short: 'Add 4 Scourges', effect: 'At start of battle, add 4 Tivi\'s Scourge cards to your deck.' },
    // Lylith Boss
    'Plaguebringer':     { name: 'Reclusive',    short: 'Malaise 10',     effect: 'Champions enter with Malaise 10.' },
    'Energy Vampire':    { name: 'Masochist',    short: 'Regen 2 on hit', effect: 'Enemy units gain Regen 2 when hit.' },
    'Inoculation':       { name: 'Sadist',       short: 'Witherbloom 1',  effect: 'Your units enter with Witherbloom 1.' },
};

// ---- Champions by clan ----
// The 24 playable champions (2 per clan), with a short one-word alias for each
// champion and each clan. Hand-curated (does not change between patches).
// Full names match the CharacterData display names in the game bundle.
const CHAMPION_CLANS = [
    { clan: 'Awoken',          alias: 'Awoken',     champions: [
        { name: 'The Sentient',          alias: 'Sentient' },
        { name: 'Wyldenten',             alias: 'Wyldenten' },
    ] },
    { clan: 'Banished',        alias: 'Banished',   champions: [
        { name: 'Fel',                   alias: 'Fel' },
        { name: 'Talos',                 alias: 'Talos' },
    ] },
    { clan: 'Hellhorned',      alias: 'Hellhorned', champions: [
        { name: 'Hornbreaker Prince',    alias: 'Hornbreaker' },
        { name: 'Shardtail Queen',       alias: 'Shardtail' },
    ] },
    { clan: 'Lazarus League',  alias: 'Lazarus',    champions: [
        { name: 'Baron Grael',           alias: 'Grael' },
        { name: 'Orechi',                alias: 'Orechi' },
    ] },
    { clan: 'Luna Coven',      alias: 'Luna',       champions: [
        { name: 'Arduhn',                alias: 'Arduhn' },
        { name: 'Ekka',                  alias: 'Ekka' },
    ] },
    { clan: 'Melting Remnant', alias: 'Melting',    champions: [
        { name: 'Little Fade',           alias: 'Fade' },
        { name: 'Rector Flicker',        alias: 'Rector' },
    ] },
    { clan: 'Pyreborne',       alias: 'Pyreborne',  champions: [
        { name: 'Lady Gilda',            alias: 'Gilda' },
        { name: 'Lord Fenix',            alias: 'Fenix' },
    ] },
    { clan: 'Railforged',      alias: 'Railforged', champions: [
        { name: 'Heph',                  alias: 'Heph' },
        { name: 'Herzal',                alias: 'Herzal' },
    ] },
    { clan: 'Stygian Guard',   alias: 'Stygian',    champions: [
        { name: 'Solgard the Martyr',    alias: 'Solgard' },
        { name: 'Tethys Titansbane',     alias: 'Tethys' },
    ] },
    { clan: 'Umbra',           alias: 'Umbra',      champions: [
        { name: 'Penumbra',              alias: 'Penumbra' },
        { name: 'Primordium',            alias: 'Primordium' },
    ] },
    { clan: 'Underlegion',     alias: 'Underlegion', champions: [
        { name: 'Bolete the Guillotine', alias: 'Bolete' },
        { name: 'Madame Lionsmane',      alias: 'Lionsmane' },
    ] },
    { clan: 'Wurmkin',         alias: 'Wurmkin',    champions: [
        { name: 'Echowright',            alias: 'Echowright' },
        { name: 'Spine Chief',           alias: 'SpineChief' },
    ] },
];

// ---- Pyre Hearts ----
// The 13 selectable Pyre Hearts, each with a short one-word alias, its starting
// ATK/HP, and its effect text. Hand-curated from in-game (does not change
// between patches). The four resource symbols in the effect text are spelled as
// words: Gold, Energy (ember), Space (floor capacity), and Deployment Energy
// (distinct from Energy). The "Random Pyre Heart" grid option is NOT a heart —
// it's a randomizer ("At run start chooses a random unlocked Pyre Heart"), so
// it's omitted here (cf. champion/clan randomize).
const PYRE_HEARTS = [
    { name: 'Proto Heartcage',         alias: 'Proto',      atk: 45, hp: 80,
        effect: 'No special capabilities.' },
    { name: 'Heart of the Pact',       alias: 'Pact',       atk: 35, hp: 65,
        effect: 'After playing a card from your Primary and Allied clan, draw +1 next turn.' },
    { name: "Lifemother's Pyre",       alias: 'Lifemother', atk: 35, hp: 75,
        effect: 'Adds the option to copy cards at the Merchants of Steel, Magic, and Trinkets.' },
    { name: "Malicka's Shifting Pyre", alias: 'Malicka',    atk: 35, hp: 60,
        effect: 'All drafted cards appear with an upgrade.' },
    { name: "Wyngh's Spirit",          alias: 'Wyngh',      atk: 40, hp: 75,
        effect: 'Once per battle, select the Heart to restore the front friendly units on all floors to full health.' },
    { name: "Fhyra's Greed",           alias: 'Fhyra',      atk: 35, hp: 80,
        effect: 'When your Pyre takes damage, gain 10 Gold.' },
    { name: "Aquath's Reservation",    alias: 'Aquath',     atk: 35, hp: 65,
        effect: 'Once per battle, select the Heart to gain 3 Energy.' },
    { name: "Bogwurm's Growth",        alias: 'Bogwurm',    atk: 30, hp: 70,
        effect: 'Permanently add 1 Space to a random floor after each battle.' },
    { name: 'Echo of the Time Father', alias: 'Echo',       atk: 40, hp: 70,
        effect: 'Once per battle, select the Heart to apply Frozen to all non-Blight and non-Scourge cards in hand.' },
    { name: "Herzal's Horde",          alias: 'Herzal',     atk: 35, hp: 65,
        effect: 'Gain 4 Deployment Energy. Deployable upgrade is 50% cheaper.' },
    { name: 'Pyre of Savagery',        alias: 'Savagery',   atk: 55, hp: 50,
        effect: 'Friendly units gain Slay: +1⚔️ permanently.' },
    { name: 'Pyre of Dominion',        alias: 'Dominion',   atk: 30, hp: 65,
        effect: 'Remove Train Stewards and starting cards. Immediately draft four packs, and double each card picked.' },
    { name: 'Pyre of Entropy',         alias: 'Entropy',    atk: 30, hp: 90,
        effect: 'Add a Vengeful Shard to your deck after each battle. Draw 1 extra card for every 2 Blights in your deck.' },
];

// ============================================================
// OBSERVED stats & ability notes — hand-collected in-game into
// difficulty_observations.csv, which is why they live here with the
// human-established facts rather than in pipeline-extracted gamedata.js.
// The blocks below are the one exception to "hand-authored only": each is
// rewritten in place by its extraction/mt2_emit_*.py script (which replaces
// only the const and the // comment lines directly above it) — edit the CSV
// and re-run the emitter rather than editing a block by hand. The prose
// above is still never machine-written.
// ============================================================

// ---- Per-variant observed stats by visit order ----
// Keyed by variant name. Main-region + minor bosses store
// ['O1','O2','O3','O4'] of 'ATK⚔️ HP❤️' (null = order not yet observed);
// Astrael (O1) and Lifemother (final) store a single string. OBSERVED,
// from difficulty_observations.csv (boss rows). Generated by
// extraction/mt2_emit_boss_stats.py — edit that file, not this block.
const BOSS_STATS = {
    // Astrael (O1 only; both combats are the same Astrael fight)
    "Mother's Flagellant": "12⚔️ 380❤️",
    "Mother's Hunter": "12⚔️ 380❤️",
    // Lifemother (final boss; single fixed stat)
    "Corpseflower": "144⚔️ 25821❤️",
    "Swarmhost": "123⚔️ 25821❤️",
    "Undying Bloom": "123⚔️ 27824❤️",
    // Maera Battle
    "Athane the Fallen": ["18⚔️ 660❤️", "31⚔️ 1924❤️", "46⚔️ 4663❤️", "69⚔️ 8602❤️"],
    "Korin the Judged": ["18⚔️ 660❤️", "31⚔️ 1924❤️", "46⚔️ 4663❤️", "69⚔️ 8602❤️"],
    // Maera Boss
    "Stern Sister": ["24⚔️ 1320❤️", "37⚔️ 2624❤️", "52⚔️ 5406❤️", "75⚔️ 9404❤️"],
    "Sibling Hierarchy": ["23⚔️ 1485❤️", "36⚔️ 2799❤️", "51⚔️ 5591❤️", "74⚔️ 9603❤️"],
    "Eldest Scion": ["18⚔️ 1650❤️", "31⚔️ 2974❤️", "46⚔️ 5777❤️", "69⚔️ 9805❤️"],
    // Thaddeus Battle
    "Elebor the Unstoppable": ["18⚔️ 594❤️", "31⚔️ 1855❤️", "46⚔️ 4591❤️", "69⚔️ 8523❤️"],
    "Quoto the Destroyer": ["12⚔️ 528❤️", "24⚔️ 1786❤️", "37⚔️ 4517❤️", "59⚔️ 8442❤️"],
    // Thaddeus Boss
    "Train Chomper": ["18⚔️ 1815❤️", "31⚔️ 3149❤️", "46⚔️ 5962❤️", "69⚔️ 10004❤️"],
    "Thick Skinned": ["18⚔️ 1650❤️", "31⚔️ 2974❤️", "46⚔️ 5777❤️", "69⚔️ 9805❤️"],
    "Insatiable": ["20⚔️ 1815❤️", "33⚔️ 3149❤️", "48⚔️ 5962❤️", "71⚔️ 10004❤️"],
    // Tivi Battle
    "Phalanx": ["18⚔️ 825❤️", "31⚔️ 2099❤️", "46⚔️ 4850❤️", "69⚔️ 8803❤️"],
    "The Undying Spirit": ["11⚔️ 413❤️", "22⚔️ 1662❤️", "36⚔️ 4386❤️", "57⚔️ 8302❤️"],
    // Tivi Boss
    "Duplicitous": ["18⚔️ 1320❤️", "31⚔️ 2624❤️", "46⚔️ 5406❤️", "69⚔️ 9404❤️"],
    "Mischevious Child": ["21⚔️ 1320❤️", "34⚔️ 2624❤️", "49⚔️ 5406❤️", "72⚔️ 9404❤️"],
    "Prankster": ["20⚔️ 1485❤️", "33⚔️ 2799❤️", "48⚔️ 5591❤️", "71⚔️ 9603❤️"],
    // Lylith Battle
    "Qel the Malaiser": ["18⚔️ 627❤️", "31⚔️ 1890❤️", "46⚔️ 4627❤️", "69⚔️ 8562❤️"],
    "Ajax the Deathbringer": ["17⚔️ 743❤️", "30⚔️ 2012❤️", "45⚔️ 4757❤️", "68⚔️ 8703❤️"],
    // Lylith Boss
    "Plaguebringer": ["24⚔️ 1980❤️", "37⚔️ 3324❤️", "52⚔️ 6147❤️", "75⚔️ 10204❤️"],
    "Energy Vampire": ["21⚔️ 1485❤️", "34⚔️ 2799❤️", "49⚔️ 5591❤️", "72⚔️ 9603❤️"],
    "Inoculation": ["21⚔️ 1650❤️", "34⚔️ 2974❤️", "49⚔️ 5777❤️", "72⚔️ 9805❤️"],
};

// ---- Per-enemy observed stats by visit order ----
// Keyed by enemy display name → [O1,O2,O3,O4,O5] of 'ATK⚔️ HP❤️', null
// where that order has not been observed in-game yet. OBSERVED, not
// computed (non-boss scaling is unsolved). Generated by
// extraction/mt2_emit_enemy_stats.py from difficulty_observations.csv
// (Overgrowth rows) — edit that file, not this block.
const ENEMY_STATS = {
    "Energizing Flautist": ["0⚔️ 1❤️", "0⚔️ 1❤️", null, null, null],
    "Fleshfruit": ["0⚔️ 41❤️", "0⚔️ 44❤️", null, null, null],
    "Glutmass": ["12⚔️ 81❤️", "14⚔️ 86❤️", "15⚔️ 90❤️", "17⚔️ 94❤️", null],
    "Jeermask": ["0⚔️ 2❤️", "0⚔️ 3❤️", "0⚔️ 5❤️", null, null],
    "Longlash": ["11⚔️ 6❤️", "12⚔️ 7❤️", null, null, null],
    "Mother's Amalgam": ["12⚔️ 189❤️", "14⚔️ 198❤️", "15⚔️ 206❤️", "17⚔️ 215❤️", "17⚔️ 215❤️"],
    "Mother's Assassin": [null, "8⚔️ 13❤️", "9⚔️ 14❤️", "11⚔️ 15❤️", "11⚔️ 15❤️"],
    "Mother's Blade": ["8⚔️ 108❤️", "9⚔️ 114❤️", "11⚔️ 119❤️", "12⚔️ 125❤️", null],
    "Mother's Cherub": ["0⚔️ 41❤️", "0⚔️ 44❤️", "0⚔️ 46❤️", "0⚔️ 49❤️", "0⚔️ 49❤️"],
    "Mother's Fiend": ["3⚔️ 5❤️", null, null, "6⚔️ 9❤️", "6⚔️ 9❤️"],
    "Mother's Flagellant": ["5⚔️ 108❤️", "6⚔️ 114❤️", "8⚔️ 119❤️", "9⚔️ 125❤️", null],
    "Mother's Flautist": ["2⚔️ 7❤️", "2⚔️ 9❤️", "2⚔️ 10❤️", "2⚔️ 11❤️", null],
    "Mother's Fleshfruit": [null, null, "0⚔️ 90❤️", "0⚔️ 94❤️", "0⚔️ 94❤️"],
    "Mother's Glutmass": [null, null, "29⚔️ 366❤️", "32⚔️ 381❤️", "32⚔️ 381❤️"],
    "Mother's Hunter": ["5⚔️ 5❤️", "6⚔️ 6❤️", "8⚔️ 7❤️", "9⚔️ 9❤️", null],
    "Mother's Jeermask": [null, null, "0⚔️ 5❤️", "0⚔️ 6❤️", "0⚔️ 6❤️"],
    "Mother's Knight": ["15⚔️ 81❤️", "17⚔️ 86❤️", "20⚔️ 90❤️", "23⚔️ 94❤️", null],
    "Mother's Longlash": [null, null, "33⚔️ 19❤️", "38⚔️ 21❤️", "38⚔️ 21❤️"],
    "Mother's Ossivane Sentinel": [null, null, "33⚔️ 293❤️", "38⚔️ 306❤️", "38⚔️ 306❤️"],
    "Mother's Plaguehost": [null, null, "20⚔️ 235❤️", "23⚔️ 245❤️", "23⚔️ 245❤️"],
    "Mother's Sharp-Eye Sniper": [null, "11⚔️ 6❤️", "12⚔️ 7❤️", "14⚔️ 9❤️", null],
    "Mother's Supplicant": ["5⚔️ 27❤️", "6⚔️ 29❤️", "8⚔️ 30❤️", "9⚔️ 32❤️", null],
    "Mother's Witchwarden": [null, null, "22⚔️ 60❤️", "22⚔️ 63❤️", "22⚔️ 63❤️"],
    "Mother's Zealot": ["21⚔️ 61❤️", "24⚔️ 64❤️", "27⚔️ 67❤️", "30⚔️ 69❤️", "30⚔️ 69❤️"],
    "Mother's Zephyrite": [null, null, "45⚔️ 30❤️", "50⚔️ 32❤️", "50⚔️ 32❤️"],
    "Ossivane Sentinel": ["12⚔️ 81❤️", "14⚔️ 86❤️", null, null, null],
    "Plaguehost": ["8⚔️ 95❤️", "9⚔️ 99❤️", "11⚔️ 103❤️", null, null],
    "Sharp-Eye Sniper": ["8⚔️ 3❤️", null, null, null, null],
    "Witchwarden": ["10⚔️ 17❤️", "10⚔️ 18❤️", "10⚔️ 19❤️", null, null],
    "Zephyrite": ["12⚔️ 9❤️", "14⚔️ 10❤️", "15⚔️ 11❤️", null, null],
};

// ---- Per-enemy ability notes (hover/click popover text) ----
// Keyed by display name → ability text (may contain <br> for multi-line).
// Value is a single string when the note is the same at every order, or an
// [O1,O2,O3,O4,O5] array (null per order without a note) when it varies by order
// — same string|array shape as ENEMY_STATS/BOSS_STATS (resolve via pickByOrder).
// Covers enemies AND bosses (boss note keyed by variant/CSV display name).
// OBSERVED, from the Overgrowth rows of difficulty_observations.csv (note
// column). Generated by extraction/mt2_emit_notes.py — edit the CSV.
const ENEMY_NOTES = {
    "Ajax the Deathbringer": ["Action: Apply Malaise 8 to your front unit.", "Action: Apply Malaise 8 to your front unit.", "Action: Apply Malaise 8 to your front unit.", "Action: Apply Malaise 9 to your front unit.", null],
    "Astrael the First Reborn": "Sap 9<br>Infested 6",
    "Athane the Fallen": ["Incant: Apply Rage 2 to enemy units.<br>Ascension: Spawn an Ossivane Sentinel.<br>Strike: Retreat.", "Incant: Apply Rage 2 to enemy units.<br>Ascension: Spawn an Ossivane Sentinel.<br>Strike: Retreat.", "Incant: Apply Rage 2 to enemy units.<br>Ascension: Spawn an Ossivane Sentinel.<br>Strike: Retreat.", "Incant: Apply Rage 3 to enemy units.<br>Ascension: Spawn an Ossivane Sentinel.<br>Strike: Retreat.", null],
    "Corpseflower": "Trample<br>Strike: Apply Malaise 27.<br>Hellborne Harvest: Transfer all Debuff effects to your front unit.<br>On Team Turn: Lose Dazed 5.",
    "Duplicitous": "Resolve: Creates a copy of the front enemy unit on the floor.  If there are no enemy units, create a Jeermask unit.",
    "Eldest Scion": "Resolve: Enemy units gain armor equal to their attack.",
    "Elebor the Unstoppable": "Resolve: Gain Titanskin 5.",
    "Energizing Flautist": "Haste<br>Enchant: Grant enemy units Haste.",
    "Energy Vampire": ["Action: Apply Malaise 3 and Witherbloom 2 to your units.<br>Strike: Apply Witherbloom equal to Malaise.", "Action: Apply Malaise 3 and Witherbloom 2 to your units.<br>Strike: Apply Witherbloom equal to Malaise.", "Action: Apply Malaise 3 and Witherbloom 2 to your units.<br>Strike: Apply Witherbloom equal to Malaise.", "Action: Apply Malaise 5 and Witherbloom 3 to your units.<br>Strike: Apply Witherbloom equal to Malaise.", null],
    "Fleshfruit": ["Buffet 3<br>Infested 2<br>Eaten: Grant Infested 3.  Deal 10 damage to self.", "Buffet 3<br>Eaten: Grant Infested 3.  Deal 10 damage to self.", null, null, null],
    "Glutmass": "Trample<br>Gorge: Gain Titanskin 3 and restore 20 health.",
    "Inoculation": ["Action: Apply Malaise 3 to your units.<br>Strike: Apply Witherbloom equal to Malaise.  Gain Armor equal to 3x Malaise.", "Action: Apply Malaise 3 to your units.<br>Strike: Apply Witherbloom equal to Malaise.  Gain Armor equal to 3x Malaise.", "Action: Apply Malaise 3 to your units.<br>Strike: Gain Armor equal to 3x Malaise.", "Action: Apply Malaise 5 to your units.<br>Strike: Apply Witherbloom equal to Malaise.  Gain Armor equal to 3x Malaise.", null],
    "Insatiable": ["Trample<br>Gorge: Gain Rage 5.<br>Slay: Trigger Gorge.", "Trample<br>Gorge: Gain Rage 5.<br>Slay: Trigger Gorge.", "Trample<br>Gorge: Gain Rage 5.<br>Slay: Trigger Gorge.", "Trample<br>Gorge: Gain Rage 6.<br>Slay: Trigger Gorge.", null],
    "Jeermask": "Revenge: Apply Dazed 2 to the attacker.",
    "Korin the Judged": "Summon: Descend all friendly units to this floor and Retreat.",
    "Longlash": "Sniper<br>Stealth 1",
    "Mischevious Child": "Sniper<br>Strike: Advance the attacked unit.",
    "Mother's Amalgam": "Resolve: If you have no units on the floor, deals 3 damage to the Pyre and gains Burst 1.",
    "Mother's Assassin": [null, "Strike: Apply Malaise 6.", "Strike: Apply Malaise 6.", "Strike: Apply Malaise 8.", "Strike: Apply Malaise 9."],
    "Mother's Blade": ["Infested 3<br>Hellborne Harvest: Gain Infested 6.", "Infested 3. Hellborne Harvest: Gain Infested 6.", "Infested 2. Hellborne Harvest: Gain Infested 6.", "Infested 4. Hellborne Harvest: Gain Infested 8.", null],
    "Mother's Cherub": ["Buffet 3<br>Eaten: Grant Damage Shield 1, Spell Shield 1 and Life Steal 1.  Deal 10 damage to self.", "Buffet 3<br>Eaten: Grant Damage Shield 1, Spell Shield 1 and Life Steal 1.  Deal 10 damage to self.", "Buffet 3<br>Eaten: Grant Damage Shield 1, Spell Shield 1 and Life Steal 1.  Deal 10 damage to self.", "Buffet 3<br>Eaten: Grant Damage Shield 1, Spell Shield 1 and Life Steal 1.  Deal 10 damage to self.", "Infested 1<br>Buffet 3<br>Eaten: Grant Damage Shield 1, Spell Shield 1 and Life Steal 1.  Deal 10 damage to self."],
    "Mother's Fiend": ["Extinguish: Apply Infested 2 to enemy units.", null, null, "Extinguish: Apply Infested 5 to enemy units.", "Infested 5<br>Extinguish: Apply Infested 5 to enemy units."],
    "Mother's Flagellant": "Resolve: Take 20 damage.<br>Revenge: Gain Burst 1.",
    "Mother's Flautist": "Haste<br>Enchant: Grant enemy units Haste.",
    "Mother's Fleshfruit": [null, null, "Buffet 3<br>Eaten: Grant Burst 1 and Infested 6.  Deal 20 damage to self.", "Buffet 3<br>Eaten: Grant Burst 1 and Infested 6.  Deal 20 damage to self.", "Infested 1<br>Buffet 3<br>Eaten: Grant Burst 1 and Infested 6.  Deal 20 damage to self."],
    "Mother's Glutmass": [null, null, "Gorge: Gain Rage 8, Titanskin 5 and restore 50 health.", "Infested 3. Gorge: Gain Rage 9, Titanskin 5 and restore 50 health.", "Infested 5<br>Gorge: Gain Rage 12, Titanskin 5 and restore 50 health."],
    "Mother's Hunter": ["Infested 2", "Infested 2", "Infested 1", "Infested 3", null],
    "Mother's Jeermask": "Spell Shield 1<br>Revenge: Apply Dazed 2 and Melee Weakness 1 to the attacker.",
    "Mother's Knight": "Vanguard: Gain Titanite.",
    "Mother's Longlash": "Sniper<br>Stealth 2<br>Strike: Apply Emberdrain 1.",
    "Mother's Ossivane Sentinel": [null, null, "Shift: Gain Armor 30.", "Shift: Gain Armor 36.", "Shift: Gain Armor 36."],
    "Mother's Plaguehost": [null, null, "Extinguish: Apply Malaise 8 and Witherbloom 8 to your front unit.", "Extinguish: Apply Malaise 9 and Witherbloom 9 to your front unit.", "Extinguish: Apply Malaise 12 and Witherbloom 12 to your front unit."],
    "Mother's Sharp-Eye Sniper": [null, "Slay: Gain Rage 5.", "Slay: Gain Rage 5.", "Slay: Gain Rage 6.", null],
    "Mother's Supplicant": "Resolve: Add a Tivi's Scourge card to the top of your draw pile and to a random location in your draw pile.",
    "Mother's Witchwarden": [null, null, "Witherbloom 2<br>Revenge: Enemy units gain Armor 15 and Regen 3.", "Witherbloom 2<br>Revenge: Enemy units gain Armor 18 and Regen 3.", "Witherbloom 4<br>Revenge: Enemy units gain Armor 18 and Regen 3."],
    "Mother's Zealot": ["Gorge: Gain Multistrike 1.", "Gorge: Gain Multistrike 1.", "Gorge: Gain Multistrike 1.", "Gorge: Gain Multistrike 1.", "Infested 1<br>Gorge: Gain Multistrike 1."],
    "Mother's Zephyrite": [null, null, "Armor 30. Shift: Gain Burst 1.<br>Slay: Descend and gain Armor 15.", "Armor 34. Shift: Gain Burst 1.<br>Slay: Descend and gain Armor 18.", "Armor 34. Shift: Gain Burst 1.<br>Slay: Descend and gain Armor 18."],
    "Ossivane Sentinel": "Shift: Gain Armor 23.",
    "Phalanx": "Spikes 8<br>Strike: Lose Spikes 1.",
    "Plaguebringer": ["Gain Dualism at 50% Health<br>Action: Apply Malaise 3 to your units.<br>Strike: Apply Witherbloom equal to Malaise.", "Gain Dualism at 50% Health<br>Action: Apply Malaise 3 to your units.<br>Strike: Apply Witherbloom equal to Malaise.", "Gain Dualism at 50% Health<br>Action: Apply Malaise 3 to your units.<br>Strike: Apply Witherbloom equal to Malaise.", "Gain Dualism at 50% Health<br>Action: Apply Malaise 5 to your units.<br>Strike: Apply Witherbloom equal to Malaise.", null],
    "Plaguehost": "Extinguish: Apply Witherbloom 5 to your front unit.",
    "Prankster": "Siphon: Add Tivi's Scourge to your hand.",
    "Qel the Malaiser": ["Incant: Apply Witherbloom 2 and Malaise 3 to your units.", "Incant: Apply Witherbloom 2 and Malaise 3 to your units.", "Incant: Apply Witherbloom 2 and Malaise 3 to your units.", "Incant: Apply Witherbloom 3 and Malaise 5 to your units.", null],
    "Quoto the Destroyer": ["Titanskin 10<br>Revenge: Lose Titanskin 1 and Gain Rage 2.", "Titanskin 10<br>Revenge: Lose Titanskin 1 and Gain Rage 2.", "Titanskin 10<br>Revenge: Lose Titanskin 1 and Gain Rage 2.", "Titanskin 10<br>Revenge: Lose Titanskin 1 and Gain Rage 3.", null],
    "Sharp-Eye Sniper": "Slay: Gain Rage 2.",
    "Sibling Hierarchy": ["Shift: Apply Rage 5 to enemy units.", "Shift: Apply Rage 5 to enemy units.", "Shift: Apply Rage 5 to enemy units.", "Shift: Apply Rage 6 to enemy units.", null],
    "Stern Sister": "Resolve: Apply Burst 1 to self and enemy units.",
    "Swarmhost": "Trample<br>Harvest: Gain Infested 6.<br>On Team Turn: Lose Dazed 5.",
    "The Undying Spirit": ["Infested 6<br>Reanimate 6<br>Strike: Gain Infested 2.", "Infested 6<br>Reanimate 6<br>Strike: Gain Infested 2.", "Infested 6<br>Reanimate 6<br>Strike: Gain Infested 2.", "Infested 7<br>Reanimate 6<br>Strike: Gain Infested 3.", null],
    "Thick Skinned": ["Trample<br>Gorge: Gain Rage 5 and Titanskin 5.", "Trample<br>Titanskin 3<br>Gorge: Gain Rage 5 and Titanskin 5.", "Trample<br>Titanskin 3<br>Gorge: Gain Rage 5 and Titanskin 5.", "Trample<br>Gorge: Gain Rage 6 and Titanskin 6.", null],
    "Train Chomper": ["Gorge: Gain Rage 5.<br>Resolve: Reduce Space by 1 and trigger Gorge.", "Gorge: Gain Rage 5.<br>Resolve: Reduce Space by 1 and trigger Gorge.", "Gorge: Gain Rage 5.<br>Resolve: Reduce Space by 1 and trigger Gorge.", "Gorge: Gain Rage 6.<br>Resolve: Reduce Space by 1 and trigger Gorge.", null],
    "Undying Bloom": "Trample<br>Resolve: Apply Witherbloom 23 to your front unit and Reanimate 2 to the front enemy unit.<br>On Team Turn: Lose Dazed 5.",
    "Witchwarden": "Witherbloom 2<br>Revenge: Enemy units gain Regen 3.",
    "Zephyrite": "Armor 9<br>Shift: Gain Burst 1.",
};
