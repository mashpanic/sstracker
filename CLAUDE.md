# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A Python pipeline that extracts and analyzes enemy/boss stat data from the Monster Train 2 game bundle — a Unity 2022.3 Mono build. Everything reads raw `.assets` binary files (no type trees; positional field reads). All scripts are in `extraction/`.

## Game knowledge (Soul Savior)

A Soul Savior run is a specific mode of Monster Train 2.  Most web searches will return results for the base game which will be wrong.  Important things:
    No Covenant.  
    No Endless.
    Unique enemies set.
    Unique map and node set.

A Soul Savior run has one of three difficulty levels, **in order from easiest to hardest: Bloom → Tangle → Overgrowth.**
    Bloom       (easiest)
    Tangle      (medium)
    Overgrowth  (hardest)

The **app and scaling pipeline target Overgrowth** (`mt2_emit_enemy_stats.py` /
`mt2_emit_boss_stats.py` emit Overgrowth into `gamedata.js`). **Observations,
however, are collected for all three** difficulties via
`mt2_collect_observations.py` → `difficulty_observations.csv` (the wiki-facing
dataset; `DIFFICULTIES` there lists all three in this easy→hard order). Note:
Bloom non-boss enemies appear to sit at base stats (tentative — see
`roster.json` note).

A Soul Savior run passes through six regions in a fixed order. Each region is named after its boss; the first and last are fixed encounters. These are the `R0`–`R5` indices used in the extracts (`mt2_extract_waves.py`, `R#_Battle_*` keys):

| Index | Region | Boss (full name) | Map position | Also known as |
|-------|--------|------------------|--------------|---------------|
| `R0` | **Astrael's Region** | Astrael, the First Reborn | — (fixed first) | **"The First Battle"** (Astrael appears only here) |
| `R1` | **Maera's Region** | Maera the Dutiful | top-left | |
| `R2` | **Thaddeus's Region** | Thaddeus the Indulgent | top-right | |
| `R3` | **Tivi's Region** | Tivi the Unruly | bottom-left | |
| `R4` | **Lylith's Region** | Lylith the Spurned | bottom-right | |
| `R5` | **Lifemother's Region** | The Lifemother | — (fixed last) | **"The Final Battle"** (Lifemother appears only here) |

`R0` and `R5` are single fixed encounters. **Regions `R1`–`R4` each have two encounters: a *minor boss* first, then the region's *named boss* second** (e.g. `R1` ends on Maera). So a full run is: Astrael → (minor, Maera) → (minor, Thaddeus) → (minor, Tivi) → (minor, Lylith) → Lifemother.

The boss epithet is encoded in its `BossBattle` variant *family* name: Maera **Dutiful** = `DutifulChild`, Lylith **Spurned** = `EstrangedChild`, Thaddeus **Indulgent** = `FavoredChild` (the three are all "children" of the Lifemother; Tivi and Lifemother use mechanic-named families instead).

**Central-node upgrade mechanic** (wiki, tracker-relevant): defeating any region's boss permanently upgrades one central node in *every other* region to a more powerful "+" version — so the 4th region visited has all 3 of its central nodes upgraded. (Detailed node lists live in `app.js`/`gamefacts.js`.)

## Web resources

Base page for the soul savior mode of monster train 2
https://monstertrain2.miraheze.org/wiki/Soul_Savior

Base page for information about Astrael
https://monstertrain2.miraheze.org/wiki/First_Battle

Base page for information about Maera
https://monstertrain2.miraheze.org/wiki/Maera%27s_Region

Base page for information about Thaddeus
https://monstertrain2.miraheze.org/wiki/Thaddeus%27s_Region

Base page for information about Tivi
https://monstertrain2.miraheze.org/wiki/Tivi%27s_Region

Base page for information about Lylith
https://monstertrain2.miraheze.org/wiki/Lylith%27s_Region

Base page for information about Lifemother and the final battle
https://monstertrain2.miraheze.org/wiki/Final_Battle

**Possible minor bosses** (first encounter of `R1`–`R4`; exactly one of the two appears per run — sourced from the `*-battle-variant` arrays in `index.html`):

| Region | Minor boss (one of) | Named region boss — its 3 variants (`*-boss-variant`) |
|--------|---------------------|--------------------------------------------------------|
| `R1` Maera | Athane the Fallen · Korin the Judged | **Maera**: Stern Sister · Sibling Hierarchy · Eldest Scion |
| `R2` Thaddeus | Elebor the Unstoppable · Quoto the Destroyer | **Thaddeus**: Train Chomper · Thick Skinned · Insatiable |
| `R3` Tivi | Phalanx · The Undying Spirit | **Tivi**: Duplicitous · Mischevious Child · Prankster |
| `R4` Lylith | Qel the Malaiser · Ajax the Deathbringer | **Lylith**: Plaguebringer · Energy Vampire · Inoculation |

`R0` Astrael and `R5` Lifemother are fixed in run *position* (always first / always last) but still have multiple wave sets — `R0` has two `Battle` sets and no `BossBattle`; `R5` has three `BossBattle` variants and no `Battle` (see the section-naming convention below).

**`waves.md` section naming.** Every section header is `SoulSavior_R{0–5}_{Battle|BossBattle}_{suffix}`:
- **`Battle`** = the region's *first* encounter (the minor boss). Suffix is a theme tag (e.g. `AscendAttacker`, `TroopTitanskin`).
- **`BossBattle`** = the region's *second* encounter (the named region boss). One section per boss variant; suffix names the variant family + variant (`DutifulChild_Burst`, `FavoredChild_1`, `EstrangedChild_2`, `Lifemother_Reanimate`, …).

Section counts per region: `R0` = 2 Battle / 0 BossBattle · `R1`–`R3` = 2 Battle / 3 BossBattle · `R4` = 1 Battle / 3 BossBattle (Ajax shares Qel's Battle) · `R5` = 0 Battle / 3 BossBattle. BossBattle variant families by region: `R1` Maera = `DutifulChild_{AscendDescend,Burst,Heal}` · `R2` Thaddeus = `FavoredChild_{1,2,3}` · `R3` Tivi = `{DuplicateEnemy,Scourge,StealBuffs1}` · `R4` Lylith = `EstrangedChild_{1,2,3}` · `R5` Lifemother = `Lifemother_{Debuffs,Infested,Reanimate}`.

**Wave set → scenario** (descriptive names are the `WAVE_SET_OPTIONS` from `index.html`). The wave-set ↔ `waves.md` scenario link is solid; the **"boss found"** column is just whichever minor boss the extractor happened to find in that scenario's final wave.

> **Each battle shows (wave-set name, boss) in-game — both are GAME FACTS** (confirmed in-game by the user; the app's wave-set + boss labels match what you read before the fight). For the four mid regions the **wave-set name = `ScenarioData.battleNameKey`** (resolve via `mt2_lib.Localizer`), verified to match `WAVE_SET_OPTIONS` exactly: Favored Ascent, Dutiful Sentinels, Gluttonous Masses (`Forbidden Fruit` = the excluded R2 TroopTitanskin), Harassing Snipers, Rabble-Rousers, Plague Legion — so those are **extractable** from `battleNameKey`.
> **Astrael (R0) is the wrinkle:** its `battleNameKey` is the *boss* ("Astrael, the First Reborn") for both scenarios, and the **wave-set name shown in-game is a featured-enemy name** — **"Mother's Flagellant"** (`Morsels` set) / **"Mother's Hunter"** (`Infested` set) — which is exactly what's in the app dropdown (these are NOT tracker-invented). That text is **not stored in the Astrael `ScenarioData`** (only `battleNameKey` + an absent description; the signature-enemy nameKeys aren't referenced) — the game resolves it at runtime from a featured/"headliner" enemy of the wave. So Astrael's wave-set names **can't** be sourced from `battleNameKey`; keep them hand-authored (or, future work, find the featured-enemy pointer). (BossBattle scenarios' `battleNameKey` is the boss name, not a wave-set name.)

> **The minor boss and the wave set are INDEPENDENT — not a fixed pairing.** Confirmed by play + the Tivi's Region wiki: for R3, *either* Phalanx *or* The Undying Spirit can front *either* Harassing Snipers *or* Rabble-Rousers; the same holds for the other paired-minor regions. So "boss found" below is **not** an exclusive pairing — it's only the boss baked into that scenario's extract. The app handles this correctly: `swapBattleBoss()` in `app.js` shows whichever minor boss you actually selected, regardless of wave set (see the resolved TODO).

| Wave set | `waves.md` scenario key | Boss found in extract (not exclusive) |
|----------|--------------------------|----------------------------------------|
| Favored Ascent | `SoulSavior_R1_Battle_AscendAttacker` | Korin the Judged |
| Dutiful Sentinels | `SoulSavior_R1_Battle_HealOnShiftHeavy` | Athane the Fallen |
| Gluttonous Masses | `SoulSavior_R2_Battle_TroopBuffFeed` **and** `_TroopTitanskin` | Elebor (fronts both extracts); Quoto reuses this set |
| Harassing Snipers | `SoulSavior_R3_Battle_StealthSniper` | Phalanx |
| Rabble-Rousers | `SoulSavior_R3_Battle_Decoys` | The Undying Spirit |
| Plague Legion | `SoulSavior_R4_Battle_MultistrikeDebuffer` | Qel; Ajax reuses this set |

(R2's `Gluttonous Masses` is the only R2 wave set; R4's `Plague Legion` the only R4 — so the app auto-selects them. Quoto/Ajax don't have their own wave scenario; they reuse the sibling's, and the app swaps in the selected boss name.)

**Alternate bosses (Quoto, Ajax).** Quoto is the alternate to Elebor in `R2`; Ajax is the alternate to Qel in `R4`. Per the user, each shares its sibling's wave set (same trash, swapped boss), which is why neither has its own `waves.md` scenario. **Their boss stat data *is* present in `roster.json`** — only the wave extraction is shared:

| Boss | Internal name | HP | ATK |
|------|---------------|----|----|
| Elebor the Unstoppable | `Boss_SoulSavior_R2_TrainBoss_BigStats` | 360 | 12 |
| Quoto the Destroyer | `Boss_SoulSavior_R2_TrainBoss_Titanskin` | 320 | 8 |
| Qel the Malaiser | `Boss_SoulSavior_R4_TrainBoss_Corruptor` | 380 | 12 |
| Ajax the Deathbringer | `Boss_SoulSavior_R4_TrainBoss_EmberGranter` | 450 | 11 |

Quoto's `_Titanskin` internal name *resembles* the `R2_Battle_TroopTitanskin` wave scenario, but the two are **NOT linked** — **refuted by video (2026-06-15): Quoto at O3 fought the `TroopBuffFeed` layout, not Titanskin.** So the two `Gluttonous Masses` layouts (`TroopBuffFeed` / `TroopTitanskin`) are chosen **independently of the boss** (Elebor vs Quoto), consistent with the general not-fixed boss↔wave-set rule — you cannot predict the layout from which alt boss appears. (Quoto/Ajax also have non-Soul-Savior roguelike twins — "the Absolute", "the Unyielding" — under `Boss_Level*` internals; ignore those for SS work.)

**Difficulty axis — tiers and rings are the same thing.** Combat-order tiers (`T1`–`T4`) and Oversoul rings (`O1`–`O4`) are *not* separate axes; they're two names for one difficulty axis = your position in the run's combat order. The player **chooses the visit order of `R1`–`R4`**, and a region visited later sits at a higher tier/ring and is harder. `R0` (Astrael) is always first (lowest); `R5` (Lifemother) is always last (highest).

Consequence: a region's identity (`R#`) is independent of its difficulty slot — the same region can land at different tiers depending on the chosen route. So when reading the data, treat "which region" and "which tier/ring (difficulty slot)" as separate keys, but treat tier and ring as **synonyms**, not distinct dimensions. (The exact numbering reconciliation — `T1`–`T4` vs `O1`–`O5` across six regions — still needs nailing down against extraction output.)

## Running the pipeline

Point scripts at the game's `Contents/Resources/Data` folder (contains `sharedassets0.assets` and `resources.assets`). Scripts auto-find it if you pass a parent directory.

```bash
OUT=./out
python3 extraction/mt2_extract_roster.py  "Contents/Resources/Data" --out $OUT
python3 extraction/mt2_extract_scaling.py "Contents/Resources/Data" --out $OUT
```

> **`mt2_build_outputs.py` is fully retired (2026-07-03).** It owned the old
> boss/enemy scaling math (`build_model`/`compute_orders`) and emitted the now-
> **deprecated** standalone outputs (`scaled_<difficulty>.xlsx`, the boss sheet,
> `scaling_page.html`) — all superseded by the app (`index.html` + `gamedata.js`)
> and observed stats. Its last consumer, the `--seed-bosses-from-computed` reseed,
> was removed, so **nothing imports it anymore**; the script now lives in
> `deprecated/` (git-ignored, local-only). If you ever need to revive the scaling
> math, it's there.

The wave/scenario extractor is a separate, self-contained pass (not part of the stat pipeline above):

```bash
python3 extraction/mt2_extract_waves.py "Contents/Resources/Data" --out $OUT
```

`mt2_extract_waves.py` options:
- `[DATA_DIR]` positional (optional — auto-finds the `Data` folder if omitted)
- `--out <dir>` output directory (default: current directory)
- `--all` to include the full roster (default: Soul Savior scenarios only)

Writes `out/waves.json` + `out/waves.md` — per-scenario wave composition (enemy lists per wave) broken out by tier T1–T4. Reads `RunDistance` pathIDs and CharacterData directly; does not depend on `roster.json`/`scaling.json`.

`mt2_build_outputs.py` (retired to `deprecated/`) options, for reference if revived:
- `--difficulty Bloom|Tangle|Overgrowth` (default: Overgrowth)
- `--prefix <internal-name-prefix>` for the boss sheet (default `Boss_SoulSavior`)
- `--all` to include full 382-character roster (default: 59 Soul Savior enemies only)
- `--no-xlsx` to skip spreadsheets (requires `openpyxl`)

## Architecture

```
mt2_lib.py                 ← shared SerializedFile parser + helpers (only place with parsing logic)
mt2_extract_roster.py      → out/roster.json (+ roster.xlsx)
mt2_extract_scaling.py     → out/scaling.json
mt2_build_outputs.py       ← RETIRED to deprecated/ (2026-07-03) — owned the scaling math (build_model/compute_orders) + DEPRECATED scaled_<difficulty>.xlsx/scaling_page.html outputs; nothing imports it anymore (last consumer --seed-bosses-from-computed was removed)
mt2_extract_waves.py       → out/waves.json + out/waves.md  (standalone, not wired to build_outputs)
mt2_emit_wave_descriptions.py → rewrites the BOSS_WAVE_DESCRIPTIONS + WAVE_SET_DESCRIPTIONS blocks in gamedata.js from out/waves.json (first piece of the "pipeline emits gamedata.js" job)
mt2_emit_boss_stats.py     → rewrites the BOSS_STATS block in gamedata.js from difficulty_observations.csv (OBSERVED Overgrowth boss rows; keyed by variant via the GROUPS table). The old computed path (roster.json + scaling.json + compute_orders) is fully retired — that math lived in mt2_build_outputs.py, now in deprecated/
mt2_emit_enemy_stats.py    → rewrites the ENEMY_STATS block in gamedata.js from difficulty_observations.csv (Overgrowth, non-boss rows; OBSERVED — non-boss scaling is unsolved)
mt2_emit_notes.py          → rewrites the ENEMY_NOTES block in gamedata.js from difficulty_observations.csv (note column; enemies AND bosses, keyed by display name; Overgrowth rows, **per-order**: a string when the note is the same at every order, else an [O1..O4] array with null per unrecorded order — resolved in app.js via pickByOrder/noteForOrder). Feeds the app's enemy/boss ability-note hover popover. Re-run after editing notes in the CSV.
mt2_audit_coverage.py      → coverage check: non-boss internals that spawn in out/waves.json vs those with Overgrowth rows in difficulty_observations.csv. Reports MISSING (spawns but no row → not in ENEMY_STATS, shows as plain text; exit 1) and UNREFERENCED (has rows, never spawns). Run after mt2_extract_waves.py. (Resolved the base-vs-upgraded gap that hid Energizing Flautist.)
mt2_collect_observations.py → guided TUI collector → difficulty_observations.csv (Bloom/Tangle/Overgrowth enemy AND boss ATK/HP + notes + verified). Entering a stat in the run-walk sets verified=Yes (the act of observing in-game); bulk/seed modes write verified=No. The walk keys its ✓/remaining on verified (not just on having stats), so the marks are: ✓ verified · ~ provisional (seeded ATK/HP, unconfirmed — shown "(unverified)") · blank unrecorded. Pressing Enter on a ~ row accepts its prefilled value and flips it to ✓. **The `Store` reload-and-merges on every save** (2026-07-04): it re-reads the CSV from disk before rewriting it and overlays only the cells this session touched, so external edits to untouched rows are never clobbered — this fixed a footgun where a long-lived session's stale in-memory snapshot overwrote newer on-disk edits (it had reverted several committed fixes; recovered by merging the run's observations back onto HEAD). The interactive main menu offers **Walk a run** (collect in visit order) and **Manual collection** (jump straight to a chosen encounter: pick a region/Lifemother 1-5, then its battle/boss 1-2 or Lifemother variant 1-3, then an order — loops back to the region menu; Astrael isn't offered there, collect it via the walk). Numbered menus (`choose`) take a single keypress on a TTY (no Enter) for ≤9 options via cbreak mode (`read_key`); piped/non-interactive stdin and the ATK/HP/note line prompts still use typed input. Maintenance modes: --check (validator, incl. NOTE divergence), --prefill-base DIFF (seed a difficulty's non-boss cells from roster base, verified=No). See its module docstring. (**Removed 2026-07-03:** `--tidy-notes`/`--seed-notes` — they propagated a note across an enemy's orders/difficulties on the now-obsolete invariance assumption, harmful since notes went per-order (see the note-column paragraph below); and `--seed-bosses-from-computed` — a one-time bridge-seed of 84 Overgrowth boss rows from the then-computed BOSS_STATS, obsolete now that boss stats are observed.)
mt2_extract_descriptions.py → out/enemy_descriptions.xlsx — PARTIAL per-enemy ability text from CharacterData descriptionKey (templates 100%; some amounts unresolved). See docs/enemy_descriptions.md
difficulty_observations.csv ← hand-collected SS enemy+boss ATK/HP by difficulty×order (long format); columns: difficulty, internal, display, order, atk, hp, note, verified. Source of truth for ENEMY_STATS (and, in progress, BOSS_STATS — see the boss-migration note), plus the wiki-facing dataset. `verified` (Yes/No) = whether the row's ATK/HP was confirmed through the run-walk; bulk-seeded rows are No until observed.
roster.json (out/)         ← authoritative BASE stats for every char (Bloom non-boss ≈ base, tentative)
```

**Authoritative sources (post-2026-06-25 cleanup).** `out/roster.json` = base stats; `difficulty_observations.csv` = observed scaled/per-difficulty/boss stats. Legacy/superseded artifacts live in `deprecated/` (git-ignored, local-only): `enemy_observations.csv` (ATK/HP role moved to difficulty_observations.csv; its `Description (filled)` column is still the active home for the descriptions TODO), the old boss spreadsheets `Observations.xlsx` / `Expected_Boss_Values.xlsx`, and the deprecated `mt2_build_outputs.py` outputs `scaled_Overgrowth_SoulSavior.xlsx` / `scaling_page.html`. **Ignore `deprecated/` unless a task specifically asks about it.**

**The `note` column (ability text) is per-order — the old difficulty/order-invariance assumption is retired (2026-07-03).** Each enemy's `note` (its ability/mechanic blurb, `<br>`-joined) is hand-observed per row, and abilities genuinely scale with order (confirmed: Athane Rage 1→2→3, Sibling Hierarchy Rage 3→6, Thick Skinned, Mother's Hunter, …). `mt2_emit_notes.py` now emits `ENEMY_NOTES` from the **Overgrowth** rows keyed by display name, as a single **string** when the note is the same at every recorded order or an **[O1,O2,O3,O4] array** (null per unrecorded order) when it varies — same string|array shape as `ENEMY_STATS`/`BOSS_STATS`, resolved in `app.js` via `pickByOrder`/`noteForOrder` (the note popover shows the order-correct text). Amounts also scale by *difficulty* (Corpseflower Malaise 18 Bloom → 27 Overgrowth), so a note is NOT copyable across difficulties either. Because of all this the propagation tooling was **removed** (`--tidy-notes`/`--seed-notes`): flattening a note across an enemy's orders/difficulties now fabricates data. `--check` still reports NOTE divergence, but divergence is now often *intentional* (per-order) — it's a prompt to eyeball, not an error to normalize.

`mt2_lib.py` owns: `parse_assets()` (SerializedFile v22 reader), `Localizer` (resolves localization keys from `resources.assets`), `iter_characters()` (yields CharacterData dicts), `STAT_HP_INDEX`/`STAT_ATK_INDEX` constants.

`mt2_build_outputs.py` (now in `deprecated/`, unused) owns all scaling math: `build_model()` reads formulas from `scaling.json` so percentages update automatically after a patch. Boss and non-boss scaling use separate code paths (see below). Relevant only if the computed path is ever revived — stats are observed now.

## Critical facts for any work on scaling math

**No type trees anywhere** (`enableTypeTree = 0`). Fields read by byte position. HP = stat-block index 3, ATK = index 13 (0-based, after the prefab's 32-hex GUID). **Re-verify on a known unit (e.g. Flagellant, HP=90/ATK=3) after any patch.**

**Set A / Set B labeling** in the scaling mutators is counterintuitive and was historically inverted. In `scaling.json`, for `DifficultyTier3`: `setA_health.Boss = 50%` is ATK and `setB_attack.Boss = 65%` is HP. For `RunDistance*` mutators the keys map more naturally. The code in `deprecated/mt2_build_outputs.py:build_model()` handles this correctly — read the code, not the key names.

**Rounding rules** (verified across all 26 boss rows and non-boss observation set):
- Boss O1–O4 formulas: `rnd(x) = math.floor(x + 0.5)` (round-half-up, not banker's, not ceil)
- Non-boss O1 HP: `math.ceil` — confirmed by 5 small-base enemies where `rnd` gives the wrong answer
- Non-boss O2–O4: empirical best-fit formula, **not derivable from raw game data** (see `docs/enemy_scaling.md`)

**Non-boss O2–O4 formula** is approximate (77% ATK match, 57% HP match against observations). The game data shows 10%/4% per RunDistance, but observed values match 20% ATK / 7% HP. The discrepancy is likely caused by an undecoded `int[2]=2` field in RunDistance effects (vs `int[2]=0` in difficulty effects). The empirical formula is the best available.

**O1–O4** = Oversoul rings (combat encounter order), not region visits. Astrael only appears at O1; Lifemother only at O4/O5.

**Soul Savior filter** (`is_soul_savior()`) keeps enemies with `SoulSavior_` in subtypes or internal name, plus the `SOUL_SAVIOR_EXTRA` set (currently: `EnchanterT1_Speed`).

## After a game patch

1. Re-run all three scripts against the new `Data` folder.
2. Verify `STAT_HP_INDEX`/`STAT_ATK_INDEX` in `mt2_lib.py` against Flagellant (HP 90 / ATK 3).
3. Eyeball `mt2_extract_scaling.py` console output — if a mutator prints `NOT FOUND`, the patch renamed it. Use `strings Managed/Assembly-CSharp.dll | grep -iE 'Difficulty|RunDistance|Mutator'` to find the new names.
4. Re-confirm Set A/B labeling by reconciling one in-game boss.

## TODO — wire waves.md data into index.html

Goal: replace the `'Waves: TBD'` placeholders in `index.html` with the wave compositions from `out/waves.md`. Data model: each scenario's final wave contains exactly one boss — the region's own (`BossBattle`) or the region's minor boss (`Battle`). After the extractor fix below, `waves.md` reflects this directly (one `[B]` per section, no cross-region bleed). Earlier docs claimed Maera appeared in "every region's first-battle pool" — **that was an extraction artifact, not game behavior** (see next note); Maera fights only in `R1_BossBattle_*`.

**Paired-base RunDistance gate (extractor bug, fixed 2026-06-14).** Verified in-game: at order 2 (O2), Maera's `_AscendDescend` Wave 1 is **3 Zephyrites + Flautist**, but `waves.md` showed 4. Cause: a base enemy in a base/late pair carries its *own* RunDistance threshold at PPtr+44 (not just an upgrade point), and `reconstruct_variants` was gating it only by the late partner's upper threshold — so a base whose own threshold > 0 wrongly appeared at lower tiers. Fix: gate the paired base by `own_threshold <= tier < late_threshold`. After the fix early-tier waves are smaller and ramp up with tier (the intended "deeper = harder" behavior). Re-confirmed: `_AscendDescend` O1/O2/O3 W1 = 2 / 3 / 4 Zephyrites. **This changed counts across the whole `waves.md` — re-derive any transcribed wave lists from the regenerated file.**

- [x] **Wave-count per order too high at low orders — FIXED (2026-06-14).** Verified in-game: Lylith BossBattle (Plaguebringer = `R4_BossBattle_EstrangedChild_1`) at **O1 has 4 waves** (`Plaguehost,Witchwarden` ×3 then `④ Lylith the Spurned, Plaguehost, Witchwarden`), but the app showed **6**. Root cause: a whole wave group is gated to a min tier by a *condition string* in the pre-group bytes, but `wave_min_tier()` only matched one phrasing, `Complete (\d+)` (number AFTER). BossBattle scenarios phrase it differently and slipped through, defaulting to `min_tier=0` → always-present → wrong O1 counts (16 scenarios were flat `[N,N,N,N]`). The pre-group gate strings actually seen: `(Regions Complete N)` (battles), `N Region(s) Complete` (R4 bosses), `Distance N` (R2 bosses). Fix: `wave_min_tier` now matches all three. Result: Plaguebringer + R2/R4 bosses now scale (e.g. `[4,5,6,6]`), matching the in-game O1. Re-ran `mt2_extract_waves.py` + `mt2_emit_wave_descriptions.py`.
- [x] **`(Bonus)` wave groups — FIXED (2026-06-14).** 8 scenarios were still flat (R1 battles `AscendAttacker`/`HealOnShiftHeavy`, all 3 R1 Maera bosses `DutifulChild_*`, all 3 R3 Tivi bosses) because their gated groups carry an unnumbered `(Bonus)` label. Confirmed in-game + wiki that Maera & Tivi bosses have **4 waves at O1**, so the two `(Bonus)` groups are gated (not always-present). They sit in the exact g4/g5 slots the numbered gates use, so they map to min_tier 1 then 2. Fix: `wave_min_tier` returns a `'bonus'` sentinel for `(Bonus)`, and `parse_scenario` resolves it sequentially (nth bonus → tier n). Result: **0 scenarios flat** — all now scale (Maera/Tivi bosses = `[4,5,6,6]`, O1=4).

**Designated-boss pointer (extractor gotcha, fixed).** Every Soul Savior `ScenarioData` stores its *designated boss* as a doubled `PPtr<CharacterData>` (two identical copies, 12 bytes apart) at the tail of the final wave group. That pointer is a real combatant **only in `BossBattle` scenarios** (where it's the region boss). In a minor `Battle` it points at the run's order-1 boss (Maera) as metadata and does **not** spawn — the actual combatant is the *single-copy* minor boss earlier in the wave. `mt2_extract_waves.py` now collapses the duplicate for `BossBattle` and **drops** it for `Battle` (the `boss_counts[...] >= 2 and not is_boss_battle` guard in `parse_scenario`). Single-copy bosses (e.g. Astrael in `R0_Battle`) are always genuine and kept. If a future patch makes a minor boss appear doubled, this heuristic would wrongly drop it — re-verify against a known minor battle (Korin in `R1_Battle_AscendAttacker`).

**Boss placement in the final wave (revised 2026-06-15).** Trash is storage-reversed (stored back→front). Boss handling splits by scenario type:
- **Region boss (`BossBattle`)** — the *doubled designated-boss pointer* appended as metadata at the storage tail; reversal floats it to the front, but it actually fights at the **BACK** (Maera/Lylith/Lifemother, confirmed in-game + wiki). `parse_scenario` moves it to the end.
- **Minor boss (`Battle`, incl. Astrael)** — a *real combatant* stored in its true back→front position, so the natural reversal already places it correctly. **Do NOT move it.** Confirmed by video: Elebor fights at the **FRONT** of Gluttonous Masses ⑥. (An earlier fix wrongly forced all bosses to the back, breaking this — now conditioned on `is_boss_battle`.) Minor-boss position therefore varies by scenario as stored: Elebor front (confirmed), Astrael front, Phalanx mid, Korin back (latter three inferred from storage, not yet eyeballed).

- [x] **Per-variant boss waves — DONE.** `BOSS_WAVE_DESCRIPTIONS` is now keyed by boss **variant name** (not region). Main-region bosses store an order-scaled `[O1..O4]` array; Astrael (O1 only) and Lifemother (O4 only) store a single string. `WAVE_SET_DESCRIPTIONS` is likewise order-scaled `[O1..O4]` per wave-set. `app.js` resolves both through the shared `pickByOrder(entry, region)` helper (same string-vs-array pattern as `BOSS_STATS`).
- [x] **Variant↔scenario pairing — RESOLVED for all boss trios.** **Rule: the `BossBattle` suffix tag = the named boss's *own* combat mechanic** (not its defeat mutator), confirmed by the final-wave boss `CharacterData` internal name.
  - **R5 Lifemother — 3/3 confident:** The Corpseflower (spreads Debuff effects) ↔ `Lifemother_Debuffs` · The Swarmhost (gains Infested on Harvest) ↔ `Lifemother_Infested` · The Undying Bloom (applies Reanimate) ↔ `Lifemother_Reanimate`.
  - **R3 Tivi — 3/3 confirmed via boss internal (2026-06-15):** Duplicitous ↔ `DuplicateEnemy` (`…Unruly_DuplicateEnemy`) · Prankster ↔ `Scourge` (`…Unruly_Scourge`) · Mischievous Child ↔ `StealBuffs1` (`…Unruly_SniperAdvance` = the wiki's Sniper/Advance mechanic — **upgraded from "by elimination" to confirmed**).
  - **R2 Thaddeus / R4 Lylith — RESOLVED via boss internal name (2026-06-14).** The numbered *section* suffix (`FavoredChild_{1,2,3}`, `EstrangedChild_{1,2,3}`) is opaque, but the final-wave boss `CharacterData` internal name encodes the mechanic and matches the wiki 1:1 (read from `waves.json`). Numbering does **not** follow the wiki listing order.
    - **R2:** `FavoredChild_1` = `…Indulgent_GorgeOnSlay` → **Insatiable** · `FavoredChild_2` = `…_ReduceCapacityResolve` → **Train Chomper** · `FavoredChild_3` = `…_Titanskin` → **Thick Skinned**.
    - **R4:** `EstrangedChild_1` = `…Spurned_DualismAt50` → **Plaguebringer** · `EstrangedChild_2` = `…_ArmorPerDebuff` → **Inoculation** · `EstrangedChild_3` = `…_WitherbloomOnAction` → **Energy Vampire**.
  - **R1 Maera — RESOLVED in-game (2026-06-14).** Confirmed live: Maera applying *Rage 3 to enemy units on Shift* (the wiki's Sibling Hierarchy mechanic) appeared in the `_AscendDescend` section → **Sibling Hierarchy ↔ `_AscendDescend`** confirmed. This validates the "suffix = boss's own mechanic" rule and **refutes the old "Sibling Hierarchy ↔ `_Burst`" claim** (that one mistakenly matched the *defeat mutator* Overachiever = "Bosses enter with Burst"). By the rule, the trio is: **Stern Sister ↔ `_Burst`** (Burst to self/enemies) · **Sibling Hierarchy ↔ `_AscendDescend`** (Rage on Shift) · **Eldest Scion ↔ `_Heal`** (Armor on Resolve; the Sentinel-heavy wave-set outlier corroborates it). **All four boss regions now fully paired** (R1 in-game · R3 + R5 by mechanic suffix · R2 + R4 by boss internal name).
- [x] **Quoto (R2) and Ajax (R4) resolved.** Both are alternate bosses that **reuse their sibling's wave set** (Quoto↔Elebor, Ajax↔Qel) — no separate wave scenario, by design. Their **boss stat data is present in `roster.json`** (`…R2_TrainBoss_Titanskin` / `…R4_TrainBoss_EmberGranter`). `Gluttonous Masses` covers both R2 battle scenarios. See the Game knowledge "Alternate bosses" note.
- [x] **Minor boss ↔ wave set not a fixed pairing — display FIXED (2026-06-15).** Boss and wave set are chosen independently (verified for R3: either Phalanx or The Undying Spirit can front either Harassing Snipers or Rabble-Rousers). The wave-set string used to bake in whichever minor boss the extractor found, so a mismatched (or alt-boss) combo showed the wrong boss. Fix: `swapBattleBoss(waves, region, variant)` in `app.js` replaces the baked region candidate (from `VARIANT_OPTIONS['<region>-battle-variant']`) with the actually-selected battle variant, applied in `getDisplayText`'s battle branch. Now any boss×wave-set combination renders the correct boss. Verified headless: Maera+Korin on Athane's `Dutiful Sentinels` → shows Korin; alt bosses below also fixed. **Still optional/open:** (a) confirm the boss×wave-set independence for R1/R2/R4 against wiki/play (display is already correct regardless); (b) the `mt2_emit_wave_descriptions.py` pairing dicts and the Game-knowledge tables still describe a 1:1 pairing — informational only now, but could be reworded.
- [x] **Alt-boss wave shows the sibling's name — FIXED (subsumed by the swap above).** Quoto (reuses Elebor's `Gluttonous Masses`) and Ajax (reuses Qel's `Plague Legion`) are region battle candidates, so `swapBattleBoss` swaps the sibling's name for the selected alt. Verified headless: selecting Quoto → final wave ends in **Quoto the Destroyer**; Ajax → **Ajax the Deathbringer**.
- [x] **Ability-note hover/click popover — DONE (2026-06-28).** Notes are now collected in the **`note` column of `difficulty_observations.csv`** (per enemy AND boss, difficulty/order-invariant — hand-observed in-game, not extracted) and surfaced in the app: `mt2_emit_notes.py` emits an `ENEMY_NOTES` block (keyed by display name) into `gamedata.js`; `enemySpan` in `app.js` tags each noted span with `data-note-key`/`data-full-name` (bosses key on their variant, e.g. `Sibling Hierarchy`, since the wave-list name differs); a floating `.note-popover` shows the multi-line (`<br>`) note on **hover** (instant — replaces the slow native-title tooltip; moving off or any info-box rebuild hides it). Hover-only — click-to-pin was tried then dropped as redundant once the hover was instant. No-note enemies keep the native `title` (full name). **This supersedes the old plan** of extracting descriptions via `mt2_extract_descriptions.py` + the deprecated `enemy_observations.csv` `Description (filled)` column — the note column is the live source now. (The extractor + `docs/enemy_descriptions.md` remain only as a reference for auto-filling notes; 10 boss notes are still blank pending observation — see the no-note list.)
- [ ] **Collect descriptions for 2 minor bosses (currently the "… information" placeholder).** These have empty `''` values in `variantDescriptions` (gamefacts.js), so the info box shows e.g. "Qel the Malaiser information" instead of a mechanic blurb: **Qel the Malaiser** & **Ajax the Deathbringer** (R4 Lylith). Done: Maera's Athane/Korin; R3 **Phalanx**, **The Undying Spirit**; R2 **Elebor** = "Resolve: Gain Titanskin 5." and **Quoto** = "Titanskin 10. Revenge: Lose Titanskin 1 and Gain Rage 2." (2026-06-24). **Action:** observe each minor boss's ability/mechanic in-game (wiki pages not yet written) and fill the `variantDescriptions` strings — hand-authored, same style as the others (e.g. "Applies Rage 1 to enemy units on Incant.").
- [x] **Auto-select the wave set when only one exists for a battle — DONE (2026-06-15).** `handleVariantChange()` in `app.js`: when a `*-battle-variant` is chosen and `WAVE_SET_OPTIONS[region]` has exactly one entry (Thaddeus `Gluttonous Masses`, Lylith `Plague Legion`), it sets `#<region>-wave-set` to that option and calls `updateNodeDisplay`; `saveState` follows via the existing flow. Judged by region option count, not per boss. Verified headless: picking Quoto auto-selects Gluttonous Masses; Ajax auto-selects Plague Legion.
- [x] **Thaddeus's second battle wave set "Forbidden Fruit" does NOT appear in game — RESOLVED (2026-06-24).** R2's Thaddeus battle has two scenarios in `waves.json` — `R2_Battle_TroopBuffFeed` and `R2_Battle_TroopTitanskin` — with **different trash** and **different in-game names** (resolved from each scenario's `battleNameKey` via the Localizer):
  - `TroopBuffFeed` = **"Gluttonous Masses"** (Glutmass + Mother's Hunter swarms + double Cherubs) — the real, only wave set.
  - `TroopTitanskin` = **"Forbidden Fruit"** (Mother's Zealot/Knight + Fleshfruit-heavy) — **confirmed never spawns** (user watched the battle-name banner across many runs; only ever "Gluttonous Masses").

  **Resolution:**
  - **App:** no change — `WAVE_SET_OPTIONS['thaddeus']` correctly lists only `Gluttonous Masses` (the proposed "add Forbidden Fruit" fix was dropped — it doesn't exist in play).
  - **Extract:** `TroopTitanskin` added to `EXCLUDED_SCENARIOS` in `mt2_extract_waves.py`, so it's dropped from `waves.json`/`waves.md` (like a never-spawned enemy). Re-ran the wave extractor + emit; Gluttonous Masses still renders from `TroopBuffFeed`.
  - **Data:** base `Fleshfruit` O3 lived only in Forbidden Fruit, so it's uncollectable → `enemy_observations.csv` Fleshfruit O3 marked `-`.

  Useful byproduct: the wave-set friendly names are extractable from `battleNameKey` (verified: Harassing Snipers, Rabble-Rousers, Gluttonous Masses) — could source `WAVE_SET_OPTIONS` from there instead of hand-authoring. The Wave-① BuffFeed-vs-(former)Forbidden-Fruit recognition table below is kept for reference / in case Forbidden Fruit ever turns up:

  | Order | BuffFeed — Wave ① | Titanskin — Wave ① |
  |-------|-------------------|--------------------|
  | O1 | Glutmass, M. Cherub, M. Cherub | Fleshfruit, M. Cherub |
  | O2 | Glutmass, Glutmass, M. Cherub, M. Cherub | Glutmass, **M. Zealot**, Fleshfruit, M. Cherub |
  | O3 | Glutmass, Glutmass, M. Cherub, M. Cherub | Glutmass, **M. Zealot**, M. Fleshfruit, M. Cherub |
  | O4 | M. Glutmass, M. Glutmass, M. Cherub, M. Cherub | M. Glutmass, **M. Zealot**, M. Fleshfruit, M. Cherub |
- [x] **`WAVE_SET_DESCRIPTIONS` + `BOSS_WAVE_DESCRIPTIONS` filled — DONE** via `extraction/mt2_emit_wave_descriptions.py --write gamedata.js` (generated from `out/waves.json`, not hand-transcribed). Each entry renders one wave per line (`<br>`-separated), e.g. `① Zephyrite, Zephyrite, Zephyrite, Mother's Flautist` … `⑥ Maera the Dutiful, …` — circled wave number prefix, every enemy listed individually (no count consolidation). The scenario↔variant pairings live in that script's two mapping dicts. **Re-run it after `mt2_extract_waves.py`** to refresh.
- [x] **`BOSS_STATS` now sourced from observations — DONE (2026-06-28).** `mt2_emit_boss_stats.py` was retargeted to read the **Overgrowth boss rows of `difficulty_observations.csv`** (authoritative observed stats), dropping the computed `roster.json + scaling.json + compute_orders` path. Keyed by variant via the `GROUPS` table (preserves key order + the Astrael→two-keys remap); main-region + minor bosses → `['O1','O2','O3','O4']` of `'ATK⚔️ HP❤️'` (`null` per unobserved order); Astrael (O1) + Lifemother (final) → single string. **The 84 boss rows were bridge-seeded from the prior computed values** (`--seed-bosses-from-computed`), so the first re-emit reproduced the old `BOSS_STATS` byte-for-byte (0 value diffs) — those seeds carry `verified=No` until observed-and-overwritten in the run-walk. **Re-run `mt2_emit_boss_stats.py --write gamedata.js` after editing the CSV.** (History: was first wired 2026-06-14 via the now-deprecated computed path.)
  - **TODO (key rename):** Astrael's `BOSS_STATS` keys are still `Mother's Flagellant`/`Mother's Hunter` and Lifemother's are the variant names; the CSV uses `Astrael the First Reborn` etc. Rename the `BOSS_STATS` keys + app dropdowns to the CSV display names and drop the Astrael remap in the emit, so it keys straight off `display`.
- [~] **Minor-boss HP formula is wrong — now MOOT for the app (Athane issue, 2026-06-14).** `compute_orders`/`boss_overgrowth_scaled` over-inflate the small-base **minor "TrainBoss" bosses** (Athane/Korin/Elebor/Quoto/Phalanx/Undying Spirit/Qel/Ajax): their large additive HP constants (`+1224/+2703/+3883`) assume region-boss base HP. Example — **Athane the Fallen** (base 5/400): computed O3 = **36⚔️/4667❤️** vs an observed **44⚔️/2908❤️** (HP ~0.6×). **Since `BOSS_STATS` now comes from `difficulty_observations.csv` (observed), this no longer affects the app — you just observe the right value.** ⚠️ But the **84 bridge-seeded boss rows still carry these wrong computed minor-boss HPs** (`verified=No`) until overwritten — so prioritize observing the 8 minor TrainBosses. The formula itself is only relevant if anyone revives the computed path; not worth fixing otherwise.
  - [ ] **Check Quoto the Destroyer @ 37/4517 (observed).** Sits beside the emitted **O3** value `40⚔️ 4519❤️` (HP ~matches, ATK 37 vs 40). Confirm the order and reconcile — another data point for the minor-boss formula. Currently emitted Quoto = `["12⚔️ 528❤️","25⚔️ 1784❤️","40⚔️ 4519❤️","63⚔️ 8448❤️"]`.

Wave-set → scenario mapping (the wave-set ↔ `waves.md` scenario link is solid; the parenthetical *boss* is **only the one the extractor found in that scenario, NOT an exclusive pairing** — see the "Wave set → scenario" table in Game knowledge and the resolved pairing TODO):
- `Dutiful Sentinels` → `R1_Battle_HealOnShiftHeavy` (Athane) · `Favored Ascent` → `R1_Battle_AscendAttacker` (Korin)
- `Gluttonous Masses` → `R2_Battle_TroopBuffFeed` **and** `R2_Battle_TroopTitanskin` (Elebor)
- `Harassing Snipers` → `R3_Battle_StealthSniper` (Phalanx) · `Rabble-Rousers` → `R3_Battle_Decoys` (Undying Spirit)
- `Plague Legion` → `R4_Battle_MultistrikeDebuffer` (Qel)

## TODO — enemy stat hover (observation table)

> **Superseded (2026-06-25).** The wide `enemy_observations.csv` workflow below is historical. Observations are now collected via `extraction/mt2_collect_observations.py` into `difficulty_observations.csv` (long format, all three difficulties + bosses, with `--check` validation and `--prefill-base`). `mt2_emit_enemy_stats.py` reads that file's Overgrowth non-boss rows. The bullets below are kept for context (and the deprecated file still hosts the descriptions column).

Goal: hovering an enemy name in the info box's wave lists shows that enemy's ATK/HP. Every wave-list name resolves to a roster entry, so the data exists — but the values must be **observed, not computed**.

**Why a custom observation table (not a formula).** The non-boss O2–O4 scaling formula has never been solved (see `docs/enemy_scaling.md` — ~77% ATK / 57% HP match, best-effort only). So enemy order-scaled stats can't be trusted from the pipeline. Instead, maintain a hand-curated **observation table** of ground-truth ATK/HP by Oversoul order (O1–O4), scoped to **Soul Savior enemies only** (the full roster has 382 chars; SS is ~35 enemies).

- **Source of truth = `difficulty_observations.csv`** (repo root, long format, collected via `mt2_collect_observations.py`) — **superseded `enemy_observations.csv`** (now in `deprecated/`) as of 2026-06-25. `mt2_emit_enemy_stats.py` reads its **Overgrowth, non-boss** rows to emit `ENEMY_STATS`. The historical wide-CSV details below describe the deprecated file; kept for the descriptions column it still hosts. Columns of the legacy file: `Name, Internal, Base ATK, Base HP, O1..O4 ATK/HP, Description (filled), Reviewed and correct`.
- **Keyed by `Internal`, not Subtype.** Internal name is unique across all 34 SS-enemy rows, so it cleanly distinguishes the duplicate display names (`Mother's Amalgam` / `Blade` / `Supplicant` each have two distinct internals). The CSV itself is unambiguous; only the *wave-list reference* (display name) is still ambiguous — see the duplicate-rows note below.
- **`Reviewed and correct` column:** one flag per enemy row, marking the row's values were confirmed in-game. Per-row, not per-order. (Currently informational — the emit doesn't gate on it.)
- **Provenance:** the seed CSV was built from a `data/Enemy-Observations.xlsx` (~46% of order-cells already filled with real hand-observed values that differed from the formula) — *not* the formula tab — preserving those observations; blank cells = not yet observed (emitted as `null`). That xlsx has since been **deleted** to avoid confusion. (`enemy_observations.csv` was the authoritative source at the time; since 2026-06-25 it's deprecated and superseded by `difficulty_observations.csv` — see the banner at the top of this section.)

- [x] **Seed CSV built — DONE.** `enemy_observations.csv` generated from `data/Enemy-Observations.xlsx` (real observations preserved, `Internal` key, `Reviewed and correct`=FALSE everywhere). Hand-maintained in Excel thereafter.
- [x] **`ENEMY_STATS` in `gamedata.js` — DONE** via `extraction/mt2_emit_enemy_stats.py --write gamedata.js`. Keyed by display name → `[O1,O2,O3,O4]` of `'ATK⚔️ HP❤️'`, `null` per unobserved order. Same string/array shape as `BOSS_STATS` (so `pickByOrder` semantics apply). **Re-run after editing the CSV.**
- [x] **Hover wired in `app.js` — DONE.** `wrapEnemyStats(html, order)` wraps recognized enemy names in the info-box wave lists in a `<span class="enemy-stat" title="…">` (native tooltip, dotted underline styled in `index.html`). Order resolved by `encounterOrder(key)` (astrael=O1, lifemother=O4, mid-run = region Order dropdown). Unobserved/no-order → title says "not yet recorded". Popup deliberately uses the native `title` (deferred styled-tooltip option not taken).
- [x] **Duplicate enemy rows — RESOLVED for current data (2026-06-14).** Three SS enemies share a display name with distinct internals: `Mother's Amalgam`, `Mother's Blade`, `Mother's Supplicant`. Checked each pair against `waves.json`: in every case **exactly one internal actually spawns in a wave and the other is roster-only** (Blade spawns `R3_HeavyT1_Basic_Ver2`, not `R3_HeavyT2_Basic`; Amalgam spawns `RAny_Heavy_T2_BurstIfUnblocked`, not `R4_Heavy_ArmorIfUnblocked_Ver2`; Supplicant spawns `R3_MageT3_Junker_Ver2`, not `R3_MageT2_Junker`). The old "first row wins" rule was actually **wrong** for Amalgam and Supplicant (their first CSV row is the non-spawning one). Fix: `mt2_emit_enemy_stats.py` now drops the non-spawning internals via an `EXCLUDE_INTERNALS` set (derived from `waves.json`), leaving one row per display name. **Maintenance:** re-derive `EXCLUDE_INTERNALS` after a patch if rosters change. **Cleaner long-term fix (still open):** carry internal identity from `waves.json` into the wave descriptions so the hover keys on `Internal` directly, retiring the exclusion list.
- [x] **Audit `waves.json` against `ENEMY_STATS` (coverage gap) — DONE, scripted (2026-07-03).** `extraction/mt2_audit_coverage.py` cross-checks every non-boss internal that spawns in `out/waves.json` (resolved per-order `tiers`) against the internals in the Overgrowth rows of `difficulty_observations.csv` (what `ENEMY_STATS`/`ENEMY_NOTES` emit from). A spawning internal with **no Overgrowth rows** is missing from `ENEMY_STATS`, so it's not in the app's name regex → renders as **plain text in wave lists** (no inline stats, no note popover) — the base-vs-upgraded trap that hid `EnchanterT1_Speed` / **Energizing Flautist** (Favored Ascent O1/O2), since its upgraded `_Ver2` twin covers the higher orders. The script reports MISSING (spawns, no row → exit 1) and UNREFERENCED (has rows, never spawns → informational), skipping bosses and `EXCLUDE_INTERNALS`. **Current result: 30/30 covered, 0 missing, 0 unreferenced** (after the Energizing Flautist fix). Re-run after `mt2_extract_waves.py` following a patch.
- [ ] **Sanity-check the observation data (validation pass).** Once `enemy_observations.csv` is mostly filled, run a validator (small script, e.g. `mt2_validate_observations.py`, or a `--check` mode on the emit) that flags likely transcription errors. Checks to include:
  - **Monotonic by order (primary):** for each enemy, `O1 ≤ O2 ≤ O3 ≤ O4` for ATK and for HP across *filled* cells (skip blanks/`-`). Stats should only rise (or hold) with order. ⚠️ Apply this to **O1→O4 only, not Base→O1**: observed O1 can dip below Base (e.g. Glutmass Base HP 60 → O1 51), so don't treat Base as the leftmost point of the monotonic chain.
  - **Paired cells:** each order's ATK and HP are both filled or both empty — a half-filled order (one number, one blank) is a typo.
  - **Valid contents:** every order cell is a non-negative integer, blank, or `-` (nothing else).
  - **Reachability cross-check vs `waves.json`** (strongest structural check): a cell with a *value* whose enemy never appears at that order = recorded against the wrong order; a `-` whose enemy *does* appear there = mis-marked N/A (should be collected); a blank that's reachable = still-to-collect (fine). Reuse the appears-at-(name,order) computation (respecting Astrael=O1, Lifemother=O4).
  - **Plausible ramp (soft):** flag extreme order-to-order jumps (e.g. HP >~3× between adjacent orders) as possible typos.
  - **`Reviewed and correct` consistency:** a row marked TRUE should have all its *reachable* cells filled.

## index.html (the product)

`index.html` is the **product** — a no-backend Soul Savior run tracker served from GitHub Pages (and openable as a local file via `file://`). The extraction pipeline exists to feed it data. It is now **editable**; the earlier "reference only, do not edit" restriction was lifted 2026-06-13, once the data work matured enough to merge the two efforts into one project.

It is being split into separate files (load order matters — data before logic, all **classic** `<script src>`, never `type="module"`, so top-level `const`s stay visible across files and it still works on `file://`):

- `index.html` — markup + `<style>` only
- `gamedata.js` — **pipeline-generated**: `BOSS_STATS` (by `mt2_emit_boss_stats.py`), `ENEMY_STATS` (by `mt2_emit_enemy_stats.py`), `ENEMY_NOTES` (by `mt2_emit_notes.py`), `BOSS_WAVE_DESCRIPTIONS` + `WAVE_SET_DESCRIPTIONS` (by `mt2_emit_wave_descriptions.py`)
- `gamefacts.js` — **hand-authored wiki facts**, NOT extractable: `MUTATORS`, `variantDescriptions`, `VARIANT_OPTIONS`, `WAVE_SET_OPTIONS`. The pipeline must never write this file.
- `app.js` — tracker logic (all functions) + UI config (`CENTRAL_NODE_OPTIONS`, `TRACK_NODE_OPTIONS`, `PATH_TRACK_OPTIONS`, `ORDER_OPTIONS`, `encounterInfo`)

The pipeline's eventual job is to emit `gamedata.js`, retiring the manual-transcription TODO above.
