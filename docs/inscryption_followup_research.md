# Inscryption event follow-up (Soul Savior) research

*Started 2026-10-27. Local notes only (see memory `public-release-info-hygiene`): do not push.*

## The question (short)

The Celestial alcove event **Inscryption** (Stoat) shows a left/right pattern. If the
player takes that path through the next three rings, a follow-up event offers the
other two upgrades. In Soul Savior Benj has seen the follow-up **not trigger**, and
also trigger **many rings late**. Goal: understand why, from what the game stores.

Wiki text Benj quoted: the numbers are the path the player must take through the next
three consecutive rings (0 = left, 1 = right; 010 = left, right, left). If done, after
the next battle the Stoat reappears and offers the other two upgrades (placeable on
any unit). The wiki notes it has appeared later, "or it may just be a bug".

The key difference: in the standard game rings are in the order you play. In Soul Savior
the player chooses the region order, so "the next three rings" may not match the next
three map slots.

## What the game data and saves show

- **Event data** (`sharedassets0.assets`, object `InscryptionEvent`, 15 tickets, slots
  1-4 only, so Maera or Thaddeus rows): three groups of follow-up conditions, one per
  upgrade: Fecundity, Many Lives, Worthy Sacrifice. Each group holds three conditions:
  `FollowupConditionInscryptionEvent`, `FollowupConditionCardUpgradePresent` (that
  upgrade), `FollowupConditionInscryptionEventIncomplete` (same upgrade). The follow-up
  events are `InscryptionFollowupEventCorpseEater`, `...ManyLives`, `...WorthySacrifice`
  (25 tickets, slots 0-8). Which upgrade belongs with Corpse Eater is not confirmed.
  The condition records in the asset show no left/right data.
- **The path number**: every save has a top-level `inscryptionPathFilters`, 0-7, fixed
  for the run, present even when Inscryption is not in the run (121 maps; seen 0..7
  roughly evenly). It is almost certainly the 3-bit pattern (010 -> 2). Bit order is not
  confirmed. Another top-level field, `inscryptionEventSuccess`, was false in every map
  seen (none were played).
- **Follow-ups at run time**: the save has `followupEventStates`. Each entry holds the
  event id, `claimed`, `canShowAfterVictory` and its `conditions`, each with a
  `startDistance` (a map SLOT number). The only entries seen so far are Balatro's
  Cavendish (start battle 7, 21 snapshots of one run). Follow-ups are the one thing
  added to a run after map creation: ordinary alcove events never change.
- **Path choices in the save**: each battle row has `chosenBranch` (0 left, 1 right, -1
  unchosen) and the run has `currentBranch`.

## Hypotheses (not tested, no played Inscryption run yet)

1. "Next three rings" is computed in map-slot order, not play order. Inscryption sits in
   slots 1-4, so its next three slots are in Maera/Thaddeus (and Tivi from slot 4). A
   different region order means the forks the game counts are not the forks the player
   walks, so the path never matches, or matches by accident.
2. The follow-up is scheduled for a slot number (`startDistance`, like Balatro's 7), so
   it appears when the player reaches that slot, possibly many fights later, or never.
3. Smaller: the upgrade-present check fails if the upgraded card was purged or changed
   (Benj: several follow-up checks skip the event when a purged unit/card is gone; Dante's
   Candle is a different trigger, one candle added per play of Dante).

## How to test

Play one Inscryption run with the snapshot script running (1 s poll). Note by hand:
`inscryptionPathFilters` (from the first snapshot), the alcove's slot and side, the order
the regions are visited, the side taken at each fork, and when (if ever) the follow-up
shows up. Then diff the snapshots: when `followupEventStates` gains the Inscryption
entry, its `startDistance`, and when `inscryptionEventSuccess` flips. Compare the stored
path number with the sides actually taken (`chosenBranch` per slot) in slot order and in
play order.

## First observation (2026-10-27, 17:18:17, Bloom run `9c37ee35`)

Benj took the Inscryption alcove (Maera Boss row, slot 2, left) with too few forks left
to follow the path, only to confirm nothing else happens. The save at that moment:

- `storyEventStates` Inscryption `claimed` false -> true.
- `followupEventStates` went from 0 to **3 entries**, created right away:
  `InscryptionFollowupEventCorpseEater`, `...ManyLives`, `...WorthySacrifice`. Each has
  `claimed false`, `canShowAfterVictory false` and three conditions, **every one with
  `startDistance 2`**, which is the alcove's own slot (Maera Boss):
  `FollowupConditionInscryptionEvent`, `FollowupConditionCardUpgradePresent` and
  `FollowupConditionInscryptionEventIncomplete`, the last two naming the upgrade:
  Corpse Eater <-> `InscryptionEventFecundity_Upgrade`, Many Lives <->
  `InscryptionEventManyLives_Upgrade`, Worthy Sacrifice <->
  `InscryptionEventWorthySacrifice_Upgrade`. (This settles the pairing guessed earlier.)
- `inscryptionPathFilters` stayed 6, `inscryptionEventSuccess` stayed false. No deck
  card changed. The rest of the diff was gold, score, the reward being marked claimed, and
  the replay log.

What this adds to the hypotheses: the follow-ups carry a **map slot number as their
start distance** (2, where the event happened), not a count of fights played. This makes
the slot-order idea more likely: the three "next rings" are probably slots 3, 4, 5
(Thaddeus Battle, Thaddeus Boss, Tivi Battle) however the player routes. It does not prove
it. The path number still has to be compared with the sides taken once a run actually
follows or misses the path; the entries to watch are when each follow-up becomes
`claimed`, and whether `inscryptionEventSuccess` flips.

## Related

Event pool / tickets / slot windows: `extraction/mt2_celestial_model.py` and the end of
`docs/run_save_decoding.md`. Follow-up chains found in the assets: Balatro -> Cavendish
(Gros Michel destroyed), Dante Returns (card-count conditions), Inscryption (above),
Lifemother's Remnant 1 -> 2 -> 3 (`growCounter` ink variable plus a battle delay),
Penance Fields -> Major / Minor (3-battle delay plus the matching Penance upgrade).
