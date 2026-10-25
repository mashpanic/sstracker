# Decoding the Monster Train 2 save / run-history data

Started 2026-10-24. **Exploratory** — nothing in the app depends on this yet.
Goal: learn what the game's own files record about a Soul Savior run (so the
tracker's Win-Loss, route and boss data could one day be filled in from them).

Rewritten 2026-10-25 after the GUIDs turned out to be readable in the game data;
the earlier drafts of this document contained several wrong guesses (listed at
the end under *Corrections*).

Status words: **CONFIRMED** (checked against screenshots and/or the game data),
**INFERRED** (fits all data seen, not independently checked), **OPEN**.

> **Privacy.** Save files and run-summary screenshots contain the player's
> Steam ID and display name. Local copies live in `mt2-save-copy/` and
> `rundata/`, both git-ignored. Never write those values into tracked files.

Companion file: [`run_save_reference.md`](run_save_reference.md) — generated GUID
tables (clans/champions, Pyre Hearts, souls, trials, region mutators, scenario
indexes). This file explains the structure; that one lists the values.

## Tools (all in `extraction/`)

| Script | What it does |
|---|---|
| `mt2_guid_scan.py` | Scans the `.assets` files for GUID strings and records the object's internal name (the string just before) and the strings after it → `out/guid_index.json`. |
| `mt2_resolve_guids.py` | Resolves localization keys to English (`resources.assets`) and reads each clan's champion order → `out/guid_names.json`, `out/class_champions.json`. With `--history` it reports any run GUID missing from the game data (**none**: all 234 GUIDs used by the 100 runs resolve). |
| `mt2_decode_runs.py` | Decodes `RunHistory.json` into readable per-run JSON (`out/runs_decoded.json`) and prints a per-champion W–L summary. |
| `mt2_emit_run_reference.py` | Writes `run_save_reference.md`. |
| `mt2_decode_map.py` | Decodes the pre-generated map in an in-progress save; `--stats DIR` tallies minor nodes over many snapshots. |
| `mt2_snapshot_saves.sh` | Run by the player: keeps every distinct version of the run save for later study. |

Order: `guid_scan` → `resolve_guids` → `decode_runs` / `emit_run_reference`.
Re-run after a game patch. Why it works: Unity stores each object's name and its
GUID `id` as plain length-prefixed strings next to each other, so no type trees
are needed.

## Where the files are

macOS: `~/Library/Application Support/Shiny Shoe/MonsterTrain2/` (no space in
`MonsterTrain2`). Steam Cloud syncs it.

| Path | Contents |
|---|---|
| `run-history/RunHistory.json` | The newest **100** runs (`_runEntries[]`), each a `runDataJson` string holding the full record. |
| `metagameSave.json` (+ `.1`–`.10`, `.backup`, `.max`) | Account progress: per-clan win counts (Soul Savior flag), win streaks, unlocks. |
| `saves/save-regionRun.json` (+ `.backup`) | The in-progress Soul Savior run (see *In-progress run*). |
| `saves/save-singlePlayer.json`, `…dailyChallenge…`, … | Other modes. |
| `logfile*.log` | Unity player logs. |

Timestamps in the files are **UTC**; the game shows local time (UTC−7 here).
The GUID tables live in `Contents/Resources/Data/sharedassets0.assets`.

## A finished run record (`runDataJson`)

CONFIRMED against 8 Run Summary screenshots and 45 Run History list rows
(matched to records by score + time; 45 of 45 unique matches).

| Run Summary shows | Field |
|---|---|
| Outcome (Victory/Loss); trophy in the history list | `victory` (trophy = victory in all 45 rows) |
| Score / Time / Bonus gold | `score` / `runTime` (s) / `gold` |
| Primary and Allied clan | `startingConditions.mainClassInfo` / `.subclassInfo` (`classId` clan GUID, `championIndex` 0 or 1) |
| Pyre Heart | `startingConditions.pyreCharacterId` (and `pyreArtifactState.relicDataID`, a fixed pair) |
| Soul icons (top right, Tier III) | `souls[]`, in screen order |
| Relic icons (top left) | the `CollectableRelicData` entries of `blessings[]`, in screen order |
| Battles list | `completedBattles[]` |
| Deck | `cards[]` (first card = the primary champion's card) |

All 100 history runs are Soul Savior (same two mutators: *Overgrowth* and *Starter
Deck*). The record also holds gold/HP over time, undo and restart counts, merged/
grafted/boxed cards and a replay log.

### Battles

`completedBattles[]` is in **fight order**; the Run Summary lists the same
battles newest-first **by region** (Astrael, Maera, Thaddeus, Tivi, Lylith,
Lifemother), so rows must not be matched to entries by position.

Fields: `battleIndex, scenarioIndex, turnsLasted, totalTurns, scoreEvent,
healthLost, trialID, bossHPRemaining, titanTrial` (+ `loopIndex`).

- **`battleIndex` is a fixed map slot — CONFIRMED** (exactly one assignment fits
  all 52 runs that have every region mutator; shuffled controls fit none):
  `0` Astrael · `1,2` Maera (wave set, boss) · `3,4` Thaddeus · `5,6` Tivi ·
  `7,8` Lylith · `9` Lifemother. The *order* the pairs appear in is the player's
  route, so the list gives the **ring** (O1–O4) of each region: ring = the
  region's position in fight order.
- **`scenarioIndex`** = position in that slot's scenario list in the game's
  `RunDataSoulSavior` object — CONFIRMED (matches every screenshot, the region
  mutators, and the in-game hover names). Table in the reference file. Notes:
  Maera's wave sets are Favored Ascent = 0, Dutiful Sentinels = 1; Tivi's are
  Rabble-Rousers = 0, Harassing Snipers = 1; Thaddeus and Lylith have one wave
  set (index always 0 — the second Thaddeus scenario "Forbidden Fruit" never
  appears, consistent with `CLAUDE.md`). Lifemother's list is Undying Bloom,
  Swarmhost, Corpseflower (0, 1, 2). Astrael: 0 Infested, 1 Morsels (from the
  list order; not otherwise checked).
- **Boss variant also appears as a mutator.** Beating a region's boss adds
  `SoulSavior_Region{N}Complete_{k}` to `blessings[]` (Anxious, Overachiever,
  Guarded, …). The mutator-to-variant table is in the reference file, and it
  matches `MUTATORS` in `gamefacts.js`.
- **Trials.** The left icon of a wave-set row (or Astrael) is the trial taken
  there, stored as `trialID`. A trial has **one GUID per tier** (T1/T2/T3);
  the tier follows the ring: **Astrael and ring 1 = T1, ring 2 = T2, rings 3
  and 4 = T3** (CONFIRMED on 266 trial uses across 100 runs; it is also the order
  of the `T1Trials`/`T2Trials`/`T3Trials` entries in `RunDataSoulSavior`).
  GUID names come from the game data (`T1Ember` = Pyre Dampener, …). *Spike
  Rocks* exists in the data but is a base-game trial (not seen in Soul Savior).
- The **right icon** in each row only marks battle vs boss fight.
- **Points** per battle (the number on screen) are not stored. Partial result
  for **Astrael** (fits all 8 runs): points = `2200 − 100×turns −
  min(500, 20×healthLost)` with a trial, `1700 − …` without (the 500 cap rests
  on one run). Region fights are larger and not fitted. The "boss rush" bonus
  (kill the boss before Relentless) and the scoring code live in the game's
  code, not its data — OPEN.
- More regularities seen in the 7 full-run screenshots (not a complete model):
  a flawless boss fight (`scoreEvent` 5) loses a fixed amount per turn
  (Lifemother −1,200/turn: 19,200 at 5 turns … 15,600 at 8; Lylith boss the
  same, Maera boss −300/turn) and gains a fixed amount per ring (Lylith boss
  +1,200 per ring, Maera boss +300). `scoreEvent` 4/0 fights lose points for
  damage, but not linearly in `healthLost` (probably a share of the Pyre's HP).
  Trials raise wave-set points a lot (Rabble-Rousers 6,600 → 9,600 with Pyre
  Dampener T1).
- `healthLost` can be negative (−2 in a Lifemother fight): healing past max.

### Clans, champions, hearts, souls, relics

- **Clans** (`classId`): 12 GUIDs, names from `ClassData`; also CONFIRMED by the
  in-game Run History list (all 45 rows agree).
- **`championIndex`** is the order of the two `ChampionData` objects inside the
  clan's `ClassData` (e.g. Luna Coven: 0 Ekka, 1 Arduhn). It does **not**
  follow the `CHAMPION_CLANS` order in `gamefacts.js`. All 24 are decoded; the
  run's first deck card confirms them (Wurmkin 0 = Spine Chief, 1 = Echowright,
  Remnant 1 = Little Fade, from the card-art names).
- **Pyre Hearts:** `pyreCharacterId` is the heart's `CharacterData`;
  `pyreArtifactState.relicDataID` is the matching `PyreArtifactData`. All 13
  pairs are in the reference file; five were also confirmed by comparing the
  summary icons with the in-game heart picker.
- **Souls:** `souls[]` always holds the **Tier III** soul GUID. Each soul has
  T1/T2/T3 `SoulData` objects (99 total); the 33 T3 GUIDs are exactly the 33
  distinct soul GUIDs in the 100 runs. Order = screen order.
- **Relics:** the seven relic icons are the `CollectableRelicData` entries in
  `blessings[]`. That list also holds the region-defeat mutators and the four
  *Run Distance* mutators (not shown as relics). Benj's hover list for run 10-24
  (Chain of Gems … Winged Technology) matches in order. The curly apostrophe in
  "Limbo’s Solace" defeated the stock `Localizer` (ASCII only);
  `mt2_resolve_guids.py` has a UTF-8 version.

### The gold medal

Runs with a small gold circular-arrow badge (Run Summary and Run History, wins
and losses) are those that used **no undo and no restart combat**. Test on the
45 rows seen in the history list: all 10 badged rows have
`numUndosUsedThisRun = 0` and `numRestartsUsedThisRun = 0`; no unbadged row
has both at 0. 45 of 45 agree. Strongly supported; the meaning is not confirmed
in game, and the other 55 history rows were not screenshotted.

Controlled test, 2026-10-25: a winning run with exactly one deliberate undo and
no restart (`numUndosUsedThisRun` 1, `numRestartsUsedThisRun` 0) showed **no gold
medal** on its Run Summary, as predicted. So an undo alone removes it. Whether a
restart alone does too is not tested.

## Win streaks (`metagameSave.json`)

The game keeps its own win streaks: `winStreaks[]` and `bestWinStreaks[]`, each
`{length, bucketStartLevel, isSoulSavior}`. For Soul Savior, `bucketStartLevel`
is the difficulty (1 Bloom, 2 Tangle, 3 Overgrowth). CONFIRMED for Overgrowth:
the file said best = 7, current = 0; the same numbers fall out of the 100-run
history (longest run of consecutive victories 7; the newest result is the
abandoned/unfinished run, counted as not a win). A loss, or presumably an
abandon, resets the current streak. (This is the game's own streak, unrelated to
the tracker's Win-Loss "streak" of champions, but it is the same word.)

## In-progress run and the pre-generated map (`save-regionRun.json[.backup]`)

The save holds the **whole run map, generated before you reach it**. Decode with
`extraction/mt2_decode_map.py SAVE.json` (checked on the one Soul Savior save we
have, a run with 3 battles done; consistent with the finished-run structure).

**Is it known before it is shown? Yes, in the saves we have.** In that Soul
Savior save, the future slots (the regions not yet visited) already carry their
minor boss, wave set, boss variant and left/right minor nodes, with
`chosenBranch = −1`. And two non-Soul-Savior saves taken 28 s and 32 s into a
run, before any battle, already contain the full map. So the map is built at run
start. **INFERRED for Soul Savior** (no start-of-run Soul Savior save yet).

Structure of `runState.nodes[i]` (`i` = `battleIndex`; slot 10 is spare):

| Field | Meaning |
|---|---|
| `scenarioIndex` | variant for that slot (same lists as finished runs) |
| `bossId` | first battle of each region only: the **minor boss** (`CharacterData`; names resolve, e.g. Athane the Fallen, Elebor the Unstoppable, Phalanx, Ajax the Deathbringer; slot 0 = Astrael) |
| `trialInfo` | `trialDataId` (trial offered/taken) and `trialEnabled` (taken). The trial's tier depends on the ring, so the value for an unvisited slot may be provisional. |
| `chosenBranch` | the left/right pick: 0 or 1, −1 until chosen |
| `mapNodes[0]`, `mapNodes[1]` | the **left and right** branches; each lists `_nodes[]` |

Each branch lists the region's **shared central nodes first** (identical on both
sides), then that side's **two minor nodes**: the first battle of a region has
1 central node, the boss battle has 2, so a region has 3 central nodes in all
(matching the wiki rule). Central nodes that show as `SoulSavior_…Upgraded…` are
the "+" versions earned by beating another region's boss; in the examined save,
the region that had been won first left every *other* region with exactly one
upgraded central node, as the rule says.

**Minor nodes.** The nine in-game names and the node each is in the data
(all nine CONFIRMED by Benj 2026-10-25; Hoard gives a relic, matching the blessing node):

| In-game name | Internal node |
|---|---|
| UnitPrimary | `RewardNodeUnitPack<primary clan>` |
| UnitAllied | `RewardNodeUnitPack<allied clan>` |
| Boons | `RewardNodeCoinMedium` (coins) |
| Well | `RewardNodePurgeTwo` (purge) |
| Remains | `RewardNodeHeal` (heal) |
| Armory | `RewardNodeEquipmentOrRoom` |
| Hoard | `RewardNodeBlessingOnly` |
| Vortex | `RewardNodeDuplicateCard` |
| Celestial | `StoryEventPoolData` |

Observed in the one Soul Savior map (16 sides = 32 minor nodes), **a sample, not
a distribution**:
- Every side is one "A" node plus one "B" node: A ∈ {UnitPrimary, UnitAllied,
  Hoard, Vortex, Celestial} (16 of them), B ∈ {Armory, Boons, Well, Remains}
  (16 of them).
- Counts: Armory 6, UnitPrimary 4, UnitAllied 4, Well 4, Boons 3, Celestial 3,
  Remains 3, Hoard 3, Vortex 2.
- Pairs that always appeared together: Celestial + Well (3 of 3), Hoard +
  Armory (3 of 3), Vortex + Boons (2 of 2); the unit nodes paired with Armory,
  Remains, Well or Boons. (Could be chance with this few.)
- Benj's hypothesis (to test): a fixed set of nodes is always present,
  randomly placed, and a few extra random nodes fill the remaining slots. The
  one sample is consistent with it (every type appears at least 2 times; A
  nodes at least 2, B nodes at least 3), but cannot show it.
- The game's `RunDataSoulSavior` object lists the node slots and pools (a node
  list per ring with `RandomChosenMainClassUnit`, `RandomChosenSubClassUnit`,
  `DuplicateCard`, `StoryEventPool`, `BlessingOnly`, `Heal`, `CoinMedium`,
  `EquipmentOrRoom`, plus integer fields that may be weights); not decoded.
  If the hypothesis is right, the fixed set and the "fill" count should be in it.

To study the **distribution** one needs many saves: finished-run records do not
keep the map. `extraction/mt2_snapshot_saves.sh` (run it in the account that
plays) keeps every distinct version of the run save; then
`mt2_decode_map.py --stats DIR` tallies minor nodes and side pairs over the
distinct runs. It also answers whether a Soul Savior map exists at run start.

`regionRunVisitedRegions` and `regionRunDefeatedBosses` record progress;
`souls` is the souls taken so far. The history's newest unfinished row (score
27,529) is this run.

## How this was verified

Eight Run Summary screenshots (10-24 13:36 … 10-18 12:02) were each matched to a
history record. Decoded output was compared field by field with what the screens
show (champion, both clans, Pyre Heart, souls, relics, wave sets, boss variants
and trials named by hover, damage figures): all agree. The Run History list
(45 rows over 5 pages) gave clan names, trophies and medals.

## Open items

- **Points formula** beyond Astrael (code, not data).
- **Gold medal**: confirm the meaning in game; check the other 55 history rows.
- **Minor boss names** for finished runs: not recorded; only in a live save.
- Minor-node **distribution** (needs many saves; see above), the pools/weights in
  `RunDataSoulSavior`.
- `metagameSave.json`: `trackedValues`, `classStats` (per-clan win counts), unlocks are not decoded.

## Corrections to earlier drafts

- Boss-variant index is the game's list order, not "alphabetical"; for
  Lifemother that list is *Reanimate, Infested, Debuffs*.
- The Run Summary battle order is region order, not fight order; an early
  position-based match gave wrong conclusions about `scenarioIndex`.
- `battleIndex` slots are fixed per region (earlier: "vary per run").
- `2e24d1d9` is Pyre Dampener (T1) and `b1b76d68` Heaven's Seal (T3); a table
  published during exploration had them reversed.
- The trial GUID is per **tier** (ring), not per battle or per trial.
