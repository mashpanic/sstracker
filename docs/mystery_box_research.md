# Mystery Box (Garfield Boxes) research

*Started 2026-10-26. Local notes only: this repo's public copy must not carry
decoding details (see memory `public-release-info-hygiene`). Do not push this file.*

## The question (short)

The Celestial alcove event **Garfield Boxes** (the "Richard Garfield mystery box"
event) gives a large box and small boxes. A **Jack in the Box** unit, and the
small boxes, interact with permanent card changes (and, for small boxes, with
souls) in ways nobody fully understands. Benj saw one game where a card with
permanent changes seemed to affect *copies* of the same card. A related open
question: do permanent changes to **spell** cards (extra damage, etc.) behave
the same way? Goal: find out what the game actually writes when these things
happen, and test hypotheses against that.

Wiki page Benj wrote with what is known:
https://monstertrain2.miraheze.org/wiki/Jack_in_the_Box

Soul Savior has no run seed you can replay (regular mode does), so the usual
"replay the same run" approach is not available. Comparing saves is the way in.

## What we know about the save (`save-regionRun.json`)

All from real saves; sizes are for one example run.

- **Deck**: `deckState` is a plain list (22 cards in the example). Each entry:
  `cardDataID`, `cardModifiers`, `purified`, `isEventCachedCard`,
  `isEventCachedCardDuplicate`. **There is no per-card id.** Two copies of one
  card differ only by their changes and their position in the list. A diff must
  match cards by content, and the list order can change between saves.
- **`cardModifiers`** (same shape for units and spells): `additionalDamage`,
  `additionalMaxHP`, `additionalCost`, `additionalXCost`, `additionalHeal`,
  `additionalSize`, `additionalEquipmentLimit`, `additionalUpgradeSlotCount`,
  `cardTraitReplacements`, `cardUpgrades`, `mergedCardStateIDs`,
  `graftedEquipmentCardStateId` (-1 = none), `boxedCardStateIds`, `persistentHP`.
- **`cardUpgrades`**: one entry per upgrade applied: `cardUpgradeDataId`,
  `attackDamage`, `additionalHP`, `additionalUnhealedHP`, `costReduction`,
  `xCostReduction`, `additionalHeal`, `additionalSize`, status-effect upgrades,
  `traitsModified`. A unit's current stats = the base card's stats + these.
  **The base stats are not in the save** (they are in the game data; our pipeline
  reads character base stats, but the card -> unit link is not built yet).
- **Separate lists at the top level**: `boxedCardStates`, `mergedCardStates`
  (the same card-entry shape), referenced from a deck card by the numbers in
  `boxedCardStateIds` / `mergedCardStateIDs` (apparently indexes into those lists;
  not confirmed). Also `graftedCardStates`, `cachedDeckState`, `soulDraftRerolls`,
  `souls`.
- **Unknown flags worth looking at first**: `isEventCachedCard` and
  `isEventCachedCardDuplicate` (probably event related), `bananaCombatRoundCount`
  and `hasDestroyedBananaRelic` (unrelated name, but top-level counters).
- **When it is written**: at events (battle start, victory, map screens, branch
  choice), not after every pick, so a change shows at the next write. Note the
  time of each action when testing.

## Game data names (resolved GUIDs)

`GarfieldBoxes` (the event prefab), `GarfieldBoxesJackInTheBoxBase` and
`GarfieldBoxesSmallBoxBase` (cards), `GarfieldBoxesJackInTheBox` (the unit),
`GarfieldBoxRandomCardPerTurn` (relic), `GarfieldBoxesLargeReward`,
`GarfieldBoxesSmallReward`, `GarfieldBoxesJackInTheBoxReward`,
`GarfieldBoxesSmallBoxUnitCostReduction`. Lookup: `out/guid_names.json`
(from `extraction/mt2_guid_scan.py` + `mt2_resolve_guids.py`).

## Where the event is on the map

`storyEventStates` lists three events per run with `activeDistance` (the battle
slot), `activeBranch` (0 left / 1 right) and `claimed`. The Garfield event's
prefab id is `5eb13460-64d0-46ee-aca3-262ffff590e6`. Its rewards are pre-generated
at the first full map save. The desktop app's **debug build** shows "Celestial:
Boxes" in the grid box where the alcove sits, from the start of the run
(`sstracker-desktop/src-tauri/src/reveal.rs`, `debug_garfield_alcove`, debug
builds only; remove before the repo goes public).

## Tools

- `extraction/mt2_snapshot_saves.sh` (run in the playing account) keeps every
  distinct save in `mt2-save-copy/snapshots/`. Keep it running during experiments.
- `extraction/mt2_decode_runs.py` / `mt2_decode_map.py`: decode finished runs and
  the live map.
- **To build when a first test exists**: a deck diff script. It lines up two
  saves, matches cards by content (not position), and prints only what changed
  per card: stats, upgrades, flags, and the boxed / merged lists.

## How to run an experiment

1. Start the watcher and the debug app (so the alcove location is known early).
2. Write down: what you did, in what order, and the clock time of each step.
3. After each step that should write a save (battle start / victory / map),
   note which snapshot file name follows it.
4. Give me the step list and the snapshot names (or just the time range); I diff
   the saves around each step.

## Open items

- Link a deck card to its unit and base stats (needs CardData decoded).
- What `boxedCardStateIds`, `mergedCardStateIDs`, `isEventCachedCard*` mean.
- Spells: does a permanent change land in `additionalDamage`, in an upgrade, or
  elsewhere? (No sample yet.)
- Which souls / scaling cards to use as test cases (Benj to pick).
