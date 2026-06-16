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
    'maera-boss-variant':       ['Stern Sister', 'Sibling Hierarchy', 'Eldest Scion'],
    'thaddeus-battle-variant':  ['Elebor the Unstoppable', 'Quoto the Destroyer'],
    'thaddeus-boss-variant':    ['Train Chomper', 'Thick Skinned', 'Insatiable'],
    'tivi-battle-variant':      ['Phalanx', 'The Undying Spirit'],
    'tivi-boss-variant':        ['Duplicitous', 'Mischevious Child', 'Prankster'],
    'lylith-battle-variant':    ['Qel the Malaiser', 'Ajax the Deathbringer'],
    'lylith-boss-variant':      ['Plaguebringer', 'Energy Vampire', 'Inoculation'],
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
    'Stern Sister':      { name: 'Anxious',      short: 'Atk on Shift',   effect: 'Enemy units gain Attack on Shift.' },
    'Sibling Hierarchy': { name: 'Overachiever', short: 'Boss Burst 3',   effect: 'Bosses enter with Burst.' },
    'Eldest Scion':      { name: 'Guarded',      short: 'Armor on Slay',  effect: 'Enemy units gain Armor equal to their Attack on Slay.' },
    // Thaddeus Boss
    'Train Chomper':     { name: 'Glutton',      short: '-3 Capacity',    effect: 'A random floor loses -3 capacity.' },
    'Thick Skinned':     { name: 'Callous',      short: 'Titanskin 3',    effect: 'Enemy units gain Titanskin 3.' },
    'Insatiable':        { name: 'Spoiled',      short: 'Infested 1',     effect: 'Enemy units gain Infested 1.' },
    // Tivi Boss
    'Duplicitous':       { name: 'Joker',        short: '+Jeermasks',     effect: 'At start of battle, spawn a Jeermask on each floor.' },
    'Mischevious Child': { name: 'Insecure',     short: 'Melee Weak 3',   effect: 'Champions enter with Melee Weakness 3.' },
    'Prankster':         { name: 'Tormentor',    short: '+4 Scourge',     effect: 'At start of battle, add 4 Tivi\'s Scourge cards to your deck.' },
    // Lylith Boss
    'Plaguebringer':     { name: 'Reclusive',    short: 'Malaise 10',     effect: 'Champions enter with Malaise 10.' },
    'Energy Vampire':    { name: 'Masochist',    short: 'Regen 2 on hit', effect: 'Enemy units gain Regen 2 when hit.' },
    'Inoculation':       { name: 'Sadist',       short: 'Witherbloom 1',  effect: 'Your units enter with Witherbloom 1.' },
};

// ---- Per-variant descriptions ----
// Keyed by the variant's option value (the exact text shown in the dropdown).
// When a variant has a non-empty entry here, its description replaces the
// generic "[variant name] information" text in the info box. Leave an entry
// blank ('') to keep showing the generic placeholder until you fill it in.
const variantDescriptions = {
    // Astrael
    "Mother's Flagellant": 'Sap 6 Infest 3',
    "Mother's Hunter": 'Sap 6 Infest 3',

    // Maera Battle
    'Athane the Fallen': 'Applies Rage 1 to enemy units on Incant.',
    'Korin the Judged': 'All enemies still alive on the train will come to her defense.',

    // Maera Boss
    'Stern Sister': 'Maera gives Burst to self and enemies on Resolve.',
    'Sibling Hierarchy': 'Maera applies Rage on Shift.',
    'Eldest Scion': 'Maera applies Armor to enemy units equal to their Attack on Resolve.',

    // Thaddeus Battle (wiki pages not yet written)
    'Elebor the Unstoppable': '',
    'Quoto the Destroyer': '',

    // Thaddeus Boss
    'Train Chomper': 'Thaddeus reduces Armor by 1 and triggers Gorge on Resolve.',
    'Thick Skinned': 'Thaddeus enters with Titanskin 3 and gains Titanskin 3 on Gorge.',
    'Insatiable': 'Thaddeus triggers Gorge on Slay.',

    // Tivi Battle (wiki pages not yet written)
    'Phalanx': '',
    'The Undying Spirit': '',

    // Tivi Boss
    'Duplicitous': 'Tivi creates a copy of the front enemy unit on the floor at end of turn. If no enemy units, creates a Jeermask.',
    'Mischevious Child': 'Sniper. Advances the attacked unit on Strike.',
    'Prankster': 'Tivi adds a Tivi\'s Scourge to your hand on Siphon.',

    // Lylith Battle (wiki pages not yet written)
    'Qel the Malaiser': '',
    'Ajax the Deathbringer': '',

    // Lylith Boss
    'Plaguebringer': 'Lylith gains Dualism at 50% health.',
    'Energy Vampire': 'Lylith applies Witherbloom X to your units on Action.',
    'Inoculation': 'Lylith gains 3x Armor per Malaise on Strike.',

    // Lifemother
    'Corpseflower': 'The Lifemother applies Malaise 12 on Strike and spreads Debuff effects on Hellborne Harvest.',
    'Swarmhost': 'The Lifemother gains Infested 2 on Harvest.',
    'Undying Bloom': 'The Lifemother applies Witherbloom 10 to the front friendly unit and Reanimate 2 to front enemy unit at the end of the turn.'
};
