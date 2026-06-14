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

A Soul Savior run has one of three difficultly levels.  This project is only concerned with Overgrowth difficulty.
    Bloom
    Tangle
    Overgrowth

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

**Minor boss → wave set** (verified by finding the minor boss's name in the final wave of each `waves.md` scenario; descriptive names are the `WAVE_SET_OPTIONS` from `index.html`):

| Minor boss | Wave-set name | `waves.md` scenario key |
|------------|---------------|--------------------------|
| Korin the Judged | Favored Ascent | `SoulSavior_R1_Battle_AscendAttacker` |
| Athane the Fallen | Dutiful Sentinels | `SoulSavior_R1_Battle_HealOnShiftHeavy` |
| Elebor the Unstoppable | Gluttonous Masses | `SoulSavior_R2_Battle_TroopBuffFeed` **and** `SoulSavior_R2_Battle_TroopTitanskin` (Elebor fronts both) |
| Phalanx | Harassing Snipers | `SoulSavior_R3_Battle_StealthSniper` |
| The Undying Spirit | Rabble-Rousers | `SoulSavior_R3_Battle_Decoys` |
| Qel the Malaiser | Plague Legion | `SoulSavior_R4_Battle_MultistrikeDebuffer` |
| **Quoto the Destroyer** | (shares Elebor's) | reuses Elebor's R2 wave set — no separate wave scenario |
| **Ajax the Deathbringer** | (shares Qel's) | reuses Qel's R4 wave set — no separate wave scenario |

**Alternate bosses (Quoto, Ajax).** Quoto is the alternate to Elebor in `R2`; Ajax is the alternate to Qel in `R4`. Per the user, each shares its sibling's wave set (same trash, swapped boss), which is why neither has its own `waves.md` scenario. **Their boss stat data *is* present in `roster.json`** — only the wave extraction is shared:

| Boss | Internal name | HP | ATK |
|------|---------------|----|----|
| Elebor the Unstoppable | `Boss_SoulSavior_R2_TrainBoss_BigStats` | 360 | 12 |
| Quoto the Destroyer | `Boss_SoulSavior_R2_TrainBoss_Titanskin` | 320 | 8 |
| Qel the Malaiser | `Boss_SoulSavior_R4_TrainBoss_Corruptor` | 380 | 12 |
| Ajax the Deathbringer | `Boss_SoulSavior_R4_TrainBoss_EmberGranter` | 450 | 11 |

Quoto's `_Titanskin` internal name lines up with the `R2_Battle_TroopTitanskin` wave scenario — that scenario is very likely Quoto's encounter even though the wave extractor prints "Elebor" as its final-wave `[B]` boss (it resolves the boss from the shared R2 pool, not the alt). (Quoto/Ajax also have non-Soul-Savior roguelike twins — "the Absolute", "the Unyielding" — under `Boss_Level*` internals; ignore those for SS work.)

**Difficulty axis — tiers and rings are the same thing.** Combat-order tiers (`T1`–`T4`) and Oversoul rings (`O1`–`O4`) are *not* separate axes; they're two names for one difficulty axis = your position in the run's combat order. The player **chooses the visit order of `R1`–`R4`**, and a region visited later sits at a higher tier/ring and is harder. `R0` (Astrael) is always first (lowest); `R5` (Lifemother) is always last (highest).

Consequence: a region's identity (`R#`) is independent of its difficulty slot — the same region can land at different tiers depending on the chosen route. So when reading the data, treat "which region" and "which tier/ring (difficulty slot)" as separate keys, but treat tier and ring as **synonyms**, not distinct dimensions. (The exact numbering reconciliation — `T1`–`T4` vs `O1`–`O5` across six regions — still needs nailing down against extraction output.)

## Running the pipeline

Point scripts at the game's `Contents/Resources/Data` folder (contains `sharedassets0.assets` and `resources.assets`). Scripts auto-find it if you pass a parent directory.

```bash
OUT=./out
python3 extraction/mt2_extract_roster.py  "Contents/Resources/Data" --out $OUT
python3 extraction/mt2_extract_scaling.py "Contents/Resources/Data" --out $OUT
python3 extraction/mt2_build_outputs.py   --in $OUT --difficulty Overgrowth
```

The wave/scenario extractor is a separate, self-contained pass (not part of the stat pipeline above):

```bash
python3 extraction/mt2_extract_waves.py "Contents/Resources/Data" --out $OUT
```

`mt2_extract_waves.py` options:
- `[DATA_DIR]` positional (optional — auto-finds the `Data` folder if omitted)
- `--out <dir>` output directory (default: current directory)
- `--all` to include the full roster (default: Soul Savior scenarios only)

Writes `out/waves.json` + `out/waves.md` — per-scenario wave composition (enemy lists per wave) broken out by tier T1–T4. Reads `RunDistance` pathIDs and CharacterData directly; does not depend on `roster.json`/`scaling.json`.

`mt2_build_outputs.py` options:
- `--difficulty Bloom|Tangle|Overgrowth` (default: Overgrowth)
- `--prefix <internal-name-prefix>` for the boss sheet (default `Boss_SoulSavior`)
- `--all` to include full 382-character roster (default: 59 Soul Savior enemies only)
- `--no-xlsx` to skip spreadsheets (requires `openpyxl`)

## Architecture

```
mt2_lib.py                 ← shared SerializedFile parser + helpers (only place with parsing logic)
mt2_extract_roster.py      → out/roster.json (+ roster.xlsx)
mt2_extract_scaling.py     → out/scaling.json
mt2_build_outputs.py       ← reads both JSONs → scaled_<difficulty>.xlsx + scaling_page.html
mt2_extract_waves.py       → out/waves.json + out/waves.md  (standalone, not wired to build_outputs)
mt2_emit_wave_descriptions.py → rewrites the BOSS_WAVE_DESCRIPTIONS + WAVE_SET_DESCRIPTIONS blocks in gamedata.js from out/waves.json (first piece of the "pipeline emits gamedata.js" job)
mt2_emit_boss_stats.py     → rewrites the BOSS_STATS block in gamedata.js from roster.json + scaling.json (reuses mt2_build_outputs.compute_orders for the math)
mt2_emit_enemy_stats.py    → rewrites the ENEMY_STATS block in gamedata.js from enemy_observations.csv (OBSERVED non-boss stats; not computed — non-boss scaling is unsolved)
enemy_observations.csv     ← hand-maintained (Excel) SS-enemy ATK/HP by order; committed source of truth for ENEMY_STATS
```

`mt2_lib.py` owns: `parse_assets()` (SerializedFile v22 reader), `Localizer` (resolves localization keys from `resources.assets`), `iter_characters()` (yields CharacterData dicts), `STAT_HP_INDEX`/`STAT_ATK_INDEX` constants.

`mt2_build_outputs.py` owns all scaling math: `build_model()` reads formulas from `scaling.json` so percentages update automatically after a patch. Boss and non-boss scaling use separate code paths (see below).

## Critical facts for any work on scaling math

**No type trees anywhere** (`enableTypeTree = 0`). Fields read by byte position. HP = stat-block index 3, ATK = index 13 (0-based, after the prefab's 32-hex GUID). **Re-verify on a known unit (e.g. Flagellant, HP=90/ATK=3) after any patch.**

**Set A / Set B labeling** in the scaling mutators is counterintuitive and was historically inverted. In `scaling.json`, for `DifficultyTier3`: `setA_health.Boss = 50%` is ATK and `setB_attack.Boss = 65%` is HP. For `RunDistance*` mutators the keys map more naturally. The code in `mt2_build_outputs.py:build_model()` handles this correctly — read the code, not the key names.

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

**Designated-boss pointer (extractor gotcha, fixed).** Every Soul Savior `ScenarioData` stores its *designated boss* as a doubled `PPtr<CharacterData>` (two identical copies, 12 bytes apart) at the tail of the final wave group. That pointer is a real combatant **only in `BossBattle` scenarios** (where it's the region boss). In a minor `Battle` it points at the run's order-1 boss (Maera) as metadata and does **not** spawn — the actual combatant is the *single-copy* minor boss earlier in the wave. `mt2_extract_waves.py` now collapses the duplicate for `BossBattle` and **drops** it for `Battle` (the `boss_counts[...] >= 2 and not is_boss_battle` guard in `parse_scenario`). Single-copy bosses (e.g. Astrael in `R0_Battle`) are always genuine and kept. If a future patch makes a minor boss appear doubled, this heuristic would wrongly drop it — re-verify against a known minor battle (Korin in `R1_Battle_AscendAttacker`).

- [x] **Per-variant boss waves — DONE.** `BOSS_WAVE_DESCRIPTIONS` is now keyed by boss **variant name** (not region). Main-region bosses store an order-scaled `[O1..O4]` array; Astrael (O1 only) and Lifemother (O4 only) store a single string. `WAVE_SET_DESCRIPTIONS` is likewise order-scaled `[O1..O4]` per wave-set. `app.js` resolves both through the shared `pickByOrder(entry, region)` helper (same string-vs-array pattern as `BOSS_STATS`).
- [ ] **Nail the variant↔scenario pairing** within each boss trio. **Rule discovered from the wiki: the `BossBattle` suffix tag = the named boss's *own* combat mechanic** (not its defeat mutator). Validated cleanly on R5 and R3:
  - **R5 Lifemother — 3/3 confident:** The Corpseflower (spreads Debuff effects) ↔ `Lifemother_Debuffs` · The Swarmhost (gains Infested on Harvest) ↔ `Lifemother_Infested` · The Undying Bloom (applies Reanimate) ↔ `Lifemother_Reanimate`.
  - **R3 Tivi — 2 confident + 1 by elimination:** Duplicitous (copies enemies) ↔ `DuplicateEnemy` · Prankster (adds Tivi's Scourge cards) ↔ `Scourge` · Mischievous Child (Sniper/Advance) ↔ `StealBuffs1` *(by elimination; name doesn't obviously match — verify against waves.md)*.
  - **R2 Thaddeus / R4 Lylith — RESOLVED via boss internal name (2026-06-14).** The numbered *section* suffix (`FavoredChild_{1,2,3}`, `EstrangedChild_{1,2,3}`) is opaque, but the final-wave boss `CharacterData` internal name encodes the mechanic and matches the wiki 1:1 (read from `waves.json`). Numbering does **not** follow the wiki listing order.
    - **R2:** `FavoredChild_1` = `…Indulgent_GorgeOnSlay` → **Insatiable** · `FavoredChild_2` = `…_ReduceCapacityResolve` → **Train Chomper** · `FavoredChild_3` = `…_Titanskin` → **Thick Skinned**.
    - **R4:** `EstrangedChild_1` = `…Spurned_DualismAt50` → **Plaguebringer** · `EstrangedChild_2` = `…_ArmorPerDebuff` → **Inoculation** · `EstrangedChild_3` = `…_WitherbloomOnAction` → **Energy Vampire**.
  - **R1 Maera — RESOLVED in-game (2026-06-14).** Confirmed live: Maera applying *Rage 3 to enemy units on Shift* (the wiki's Sibling Hierarchy mechanic) appeared in the `_AscendDescend` section → **Sibling Hierarchy ↔ `_AscendDescend`** confirmed. This validates the "suffix = boss's own mechanic" rule and **refutes the old "Sibling Hierarchy ↔ `_Burst`" claim** (that one mistakenly matched the *defeat mutator* Overachiever = "Bosses enter with Burst"). By the rule, the trio is: **Stern Sister ↔ `_Burst`** (Burst to self/enemies) · **Sibling Hierarchy ↔ `_AscendDescend`** (Rage on Shift) · **Eldest Scion ↔ `_Heal`** (Armor on Resolve; the Sentinel-heavy wave-set outlier corroborates it). **All four boss regions now fully paired** (R1 in-game · R3 + R5 by mechanic suffix · R2 + R4 by boss internal name).
- [x] **Quoto (R2) and Ajax (R4) resolved.** Both are alternate bosses that **reuse their sibling's wave set** (Quoto↔Elebor, Ajax↔Qel) — no separate wave scenario, by design. Their **boss stat data is present in `roster.json`** (`…R2_TrainBoss_Titanskin` / `…R4_TrainBoss_EmberGranter`). `Gluttonous Masses` covers both R2 battle scenarios. See the Game knowledge "Alternate bosses" note.
- [x] **`WAVE_SET_DESCRIPTIONS` + `BOSS_WAVE_DESCRIPTIONS` filled — DONE** via `extraction/mt2_emit_wave_descriptions.py --write gamedata.js` (generated from `out/waves.json`, not hand-transcribed). Each entry renders one wave per line (`<br>`-separated), e.g. `① Zephyrite, Zephyrite, Zephyrite, Mother's Flautist` … `⑥ Maera the Dutiful, …` — circled wave number prefix, every enemy listed individually (no count consolidation). The scenario↔variant pairings live in that script's two mapping dicts. **Re-run it after `mt2_extract_waves.py`** to refresh.
- [x] **`BOSS_STATS` wired to the pipeline — DONE (2026-06-14)** via `extraction/mt2_emit_boss_stats.py --write gamedata.js`, which reuses `mt2_build_outputs.compute_orders` (lifted out of `main()` to a module-level fn so the math has one source of truth). Keyed by variant name: main-region + minor bosses → `['O1','O2','O3','O4']` of `'ATK⚔️ HP❤️'`; Astrael (O1) and Lifemother (final) → single fixed string. Region-boss formula confirmed correct (e.g. Mischevious Child O1 = 21/1320 matched the prior hand value). **Re-run after `mt2_extract_roster.py` + `mt2_extract_scaling.py`.**
- [ ] **Minor-boss HP formula is wrong (Athane issue, 2026-06-14).** `boss_overgrowth_scaled` is applied to **all** `is_boss` enemies, but its large additive HP constants (`+1224/+2703/+3883`) over-inflate the small-base **minor "TrainBoss" bosses** (Athane/Korin/Elebor/Quoto/Phalanx/Undying Spirit/Qel/Ajax). Example — **Athane the Fallen** (base 5/400): emitted O3 = **36⚔️/4667❤️**, but a prior observed value in `gamedata.js` was **44⚔️/2908❤️** (HP ~0.6× the formula). Same pattern on Elebor O4 (obs 66/4867 vs 69/8528) and Ajax O2 (29/1470 vs 30/2012). Region bosses (Maera/Thaddeus/Tivi/Lylith) + Astrael + Lifemother look correct; only the minor TrainBosses are off — they likely scale by a **different formula**. These numbers are emitted anyway (better than `0⚔️ 0❤️`). **Action:** gather ground-truth minor-boss observations (note: `boss_observations.csv` referenced by `mt2_build_outputs.py` is **not in the repo** — only `docs/boss_scaling.md` / `docs/enemy_scaling.md`), derive the minor-boss formula, then split the boss code path in `compute_orders` / `boss_overgrowth_scaled` and re-emit.

Wave-set → scenario mapping (**confirmed** — see the Minor boss → wave set table in Game knowledge):
- `Dutiful Sentinels` → `R1_Battle_HealOnShiftHeavy` (Athane) · `Favored Ascent` → `R1_Battle_AscendAttacker` (Korin)
- `Gluttonous Masses` → `R2_Battle_TroopBuffFeed` **and** `R2_Battle_TroopTitanskin` (Elebor)
- `Harassing Snipers` → `R3_Battle_StealthSniper` (Phalanx) · `Rabble-Rousers` → `R3_Battle_Decoys` (Undying Spirit)
- `Plague Legion` → `R4_Battle_MultistrikeDebuffer` (Qel)

## TODO — enemy stat hover (observation table)

Goal: hovering an enemy name in the info box's wave lists shows that enemy's ATK/HP. Every wave-list name resolves to a roster entry, so the data exists — but the values must be **observed, not computed**.

**Why a custom observation table (not a formula).** The non-boss O2–O4 scaling formula has never been solved (see `docs/enemy_scaling.md` — ~77% ATK / 57% HP match, best-effort only). So enemy order-scaled stats can't be trusted from the pipeline. Instead, maintain a hand-curated **observation table** of ground-truth ATK/HP by Oversoul order (O1–O4), scoped to **Soul Savior enemies only** (the full roster has 382 chars; SS is ~35 enemies).

- **Source of truth = `enemy_observations.csv`** (repo root, committed — *not* under gitignored `data/`), **hand-edited directly in Excel**, no app or UI. Columns: `Name, Internal, Base ATK, Base HP, O1 ATK, O1 HP, O2 ATK, O2 HP, O3 ATK, O3 HP, O4 ATK, O4 HP, Reviewed and correct`. `extraction/mt2_emit_enemy_stats.py` reads it to emit `ENEMY_STATS`; the user fills/corrects cells in Excel and commits the CSV, then re-runs the emit.
- **Keyed by `Internal`, not Subtype.** Internal name is unique across all 34 SS-enemy rows, so it cleanly distinguishes the duplicate display names (`Mother's Amalgam` / `Blade` / `Supplicant` each have two distinct internals). The CSV itself is unambiguous; only the *wave-list reference* (display name) is still ambiguous — see the duplicate-rows note below.
- **`Reviewed and correct` column:** one flag per enemy row, marking the row's values were confirmed in-game. Per-row, not per-order. (Currently informational — the emit doesn't gate on it.)
- **Source data was already being recorded** in `data/Enemy-Observations.xlsx` (~46% of order-cells filled with real hand-observed values that differ from the formula). The seed CSV was built from *that*, not the formula tab, preserving those observations; blank cells = not yet observed (emitted as `null`).

- [x] **Seed CSV built — DONE.** `enemy_observations.csv` generated from `data/Enemy-Observations.xlsx` (real observations preserved, `Internal` key, `Reviewed and correct`=FALSE everywhere). Hand-maintained in Excel thereafter.
- [x] **`ENEMY_STATS` in `gamedata.js` — DONE** via `extraction/mt2_emit_enemy_stats.py --write gamedata.js`. Keyed by display name → `[O1,O2,O3,O4]` of `'ATK⚔️ HP❤️'`, `null` per unobserved order. Same string/array shape as `BOSS_STATS` (so `pickByOrder` semantics apply). **Re-run after editing the CSV.**
- [x] **Hover wired in `app.js` — DONE.** `wrapEnemyStats(html, order)` wraps recognized enemy names in the info-box wave lists in a `<span class="enemy-stat" title="…">` (native tooltip, dotted underline styled in `index.html`). Order resolved by `encounterOrder(key)` (astrael=O1, lifemother=O4, mid-run = region Order dropdown). Unobserved/no-order → title says "not yet recorded". Popup deliberately uses the native `title` (deferred styled-tooltip option not taken).
- [ ] **Duplicate enemy rows — extraction bug, not a game thing.** Several SS enemies share a display name with distinct internals (`Mother's Amalgam` / `Blade` / `Supplicant`). The CSV disambiguates by `Internal`, but `ENEMY_STATS` is keyed by display name and the wave lists reference enemies by display name only, so the hover can't tell which row. **Interim rule:** `mt2_emit_enemy_stats.py` keeps the **first** CSV row per display name. **Real fix:** carry internal identity from `waves.json` into the wave descriptions so the hover keys on `Internal`.

## index.html (the product)

`index.html` is the **product** — a no-backend Soul Savior run tracker served from GitHub Pages (and openable as a local file via `file://`). The extraction pipeline exists to feed it data. It is now **editable**; the earlier "reference only, do not edit" restriction was lifted 2026-06-13, once the data work matured enough to merge the two efforts into one project.

It is being split into separate files (load order matters — data before logic, all **classic** `<script src>`, never `type="module"`, so top-level `const`s stay visible across files and it still works on `file://`):

- `index.html` — markup + `<style>` only
- `gamedata.js` — **pipeline-generated**: `BOSS_STATS` (by `mt2_emit_boss_stats.py`), `BOSS_WAVE_DESCRIPTIONS` + `WAVE_SET_DESCRIPTIONS` (by `mt2_emit_wave_descriptions.py`)
- `gamefacts.js` — **hand-authored wiki facts**, NOT extractable: `MUTATORS`, `variantDescriptions`, `VARIANT_OPTIONS`, `WAVE_SET_OPTIONS`. The pipeline must never write this file.
- `app.js` — tracker logic (all functions) + UI config (`CENTRAL_NODE_OPTIONS`, `TRACK_NODE_OPTIONS`, `PATH_TRACK_OPTIONS`, `ORDER_OPTIONS`, `encounterInfo`)

The pipeline's eventual job is to emit `gamedata.js`, retiring the manual-transcription TODO above.
