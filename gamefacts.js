// gamefacts.js — HAND-AUTHORED game facts (bucket ②).
//
// Sourced from the Monster Train 2 Wiki (see attribution in index.html), NOT
// from the .assets extraction. These are prose/descriptive facts the pipeline
// cannot generate, so the pipeline must NEVER overwrite this file.
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
