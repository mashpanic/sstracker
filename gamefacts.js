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
