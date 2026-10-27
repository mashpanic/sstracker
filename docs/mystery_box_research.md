# Mystery Box (Garfield Boxes) research

*Started 2026-10-26. Local notes only: this repo's public copy must not carry
decoding details (see memory `public-release-info-hygiene`). Do not push this file.*

## The question (short)

The Celestial alcove event **Garfield Boxes** (the "Richard Garfield mystery box"
event; designed by Richard Garfield, the Magic: The Gathering designer, as a guest
event for Monster Train 2, per Benj) gives a large box and small boxes. A **Jack in the Box** unit, and the
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

## Experiment 1 (2026-10-27): duplicate the large box with the Lifemother Pyre

Setup: Bloom run, souls Wizlord T3 (spells: each upgrade +3 damage, +3 heal), Grump T3
(unit: +3 health each turn, +2 attack each time it is damaged, kept as permanent
`Plus3HPScalable` / `Plus2AttackScalable` upgrade entries) and Lil Cap T3 (to survive).
`TraitCorrupt` on Wurmkin cards is just the "infused" effect, not a stat change.
Run `9c37ee35`, Boxes alcove in the Thaddeus Battle row (slot 3, right).

What the saves showed (snapshots in `mt2-save-copy/snapshots/`):

- **15:57:52** (entering the event): `storyEventStates[].claimed` flips to true and the
  RNG state changes. Nothing else; no deck change yet. The save is not written after
  every pick, only at screen changes.
- **16:02:21** (pre-battle screen of the next fight): the deck went from 20 to 18 cards.
  Three units left it and a single card `GarfieldBoxesJackInTheBoxBase` appeared, with
  `cardModifiers.boxedCardStateIds = [0, 1, 2]`. The three units sit in the new top-level
  list `boxedCardStates`, copied exactly: a Husk Hermit with all its soul upgrade entries
  (Grump marker, three `Plus2Attack`, three `Plus3HP`, `AddQuick`, `AddMultistrike`), a
  Train Steward Shield with its Butterball upgrade, and a plain Train Steward Spear. The
  game boxed the *upgraded* Shield, not the plain one left in the deck. So `boxedCardStateIds`
  are indexes into `boxedCardStates`. The `isEventCachedCard*` flags stayed false on all of them.
- **16:06:41** (after that fight, on the map): the boxed Hermit gained two new upgrade
  entries (+10 attack, +18 health) while it was boxed. Units inside a box keep earning
  soul scaling like units in the deck. The Wizlord spells in the deck scaled too.
- **16:10-16:11** (after duplicating the box): the deck has **two** box cards, both with
  `boxedCardStateIds [0, 1, 2]`. `boxedCardStates` still has 3 entries. So duplicating a
  box copies only the box card; both boxes refer to the same three stored units.
- **Combat**: the save does not record unit stats mid-fight; `replayData.replayEntries`
  only grows by short encoded action records. Benj's notes are the only source of
  in-fight stats. Both boxes opened the same unit each turn (Steward, Spear, Husk) so
  the unit order appears fixed and shared.
- **16:26:42** (victory): the stored Hermit went from 11 to 15 entries. The four new
  ones are one entry per fight-time Hermit and stat: health +9 and +21, attack +2 and +16.
  Benj's turn notes match exactly: Hermit #1 had 3 health scales (3 x 3 = 9) and 1 attack
  scale (+2); Hermit #2 had 7 health scales (21) and 8 attack scales (16; Benj had counted
  7 and then remembered the boss hit it once). Shield and Spear unchanged.

Conclusion so far: two Hermits came out of the one shared stored Hermit; each kept its own
gains during the fight, and afterwards both sets of gains were added to the single stored
card. In the next fight every Hermit from either box starts with all of them (Benj
predicted this before the fight and it matches). The save never held two Hermit states,
so the stat gains are merged by *adding entries*, not by copying a unit.

Context from Benj: a regular duplicate of a unit (in or out of combat) does not keep its
soul upgrades. One other exception he has seen is hatched (egg) units, where both units
keep a copy of the soul upgrade; he has not had a run to check whether it behaves like the
box.

## Experiment 2 (2026-10-27, 16:35-16:54): three boxes (the box duplicated twice)

Same run. Deck had three box cards, all with `boxedCardStateIds [0, 1, 2]`; `boxedCardStates`
still held only the three original units (the stored Hermit had 15 entries after
experiment 1). All three boxes were played.

- **Pop-out order**: not the same for every box this time. Turn 1: Shield, Spear, Shield.
  Turn 2: Spear, Hermit, Spear. Turn 3: Hermit, Shield, Hermit. Each box walks the same
  cycle Shield -> Spear -> Hermit, but boxes can start at different points (box 2 started one
  step ahead). In experiment 1 both boxes started at the same point. Benj predicted the turn-3
  wrap-around from the first two turns and it held. After three turns each box has produced
  each of its three units once, so three Hermits were in play.
- **Result (16:54:41, victory)**: the stored Hermit went from 15 to 21 entries: six new
  entries, three Plus3HP (health +15, +12, +36) and three Plus2Attack (+14, +4, +6). So
  three sets, one per Hermit that fought, added as separate entries to the one stored Hermit.
  The Shield and the Spear did not change.
- **Against Benj's turn notes**: totals match exactly. Health: 5 + 4 + 12 = 21 scales
  (63 health) in both. Attack: 12 scales (24) in both. Per Hermit, health matches for all
  three (5, 4, 12 scales) and attack matches for Hermit 3 (3 scales). For Hermits 1 and 2
  the save has 7 and 2 attack scales where the notes have 3 and 6: four scales moved between
  them, most likely the notes attributed some "damaged" events to the wrong Hermit.

Conclusion: the rule from experiment 1 holds with three boxes. Each Hermit's gains in a
fight are appended to the single stored Hermit as their own upgrade entries, so the next
fight every Hermit from any box starts with all of them. The number of boxes opened only
changes how many sets are appended.

## Next experiments

1. **Play only one of the boxes** in a fight (Benj, 2026-10-27) and check what the stored
   Hermit receives: does it get only that Hermit's gains, or also something for the unopened
   boxes? Verify every stat against Benj's notes.
2. Spells: the Wizlord spells with several upgrades are in the deck; no spell has been
   boxed (boxes only take units). Still open whether copies of a spell share changes.
3. The egg-unit case, if a run with a hatching unit and a scaling soul comes up.
4. Build the deck-diff script (see Tools) now that there is a real case to run it on.

## Open items

- Link a deck card to its unit and base stats (needs CardData decoded).
- What `mergedCardStateIDs` and `isEventCachedCard*` mean (`boxedCardStateIds` is settled:
  indexes into `boxedCardStates`).
- Spells: does a permanent change land in `additionalDamage`, in an upgrade, or
  elsewhere? Answered for Wizlord T3: it is an upgrade entry (`WizlordT3_Upgrade_AddSpellPower`,
  +3 attackDamage and +3 additionalHeal per entry), not a modifier.
