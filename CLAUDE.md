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
python3 extraction/mt2_build_outputs.py   --in $OUT --difficulty Overgrowth   # optional — see note
```

> **`mt2_build_outputs.py` is now optional.** Its standalone outputs
> (`scaled_<difficulty>.xlsx`, the boss sheet, `scaling_page.html`) are
> **deprecated** — superseded by the app (`index.html` + `gamedata.js`); the
> last copies are archived in `deprecated/`. The script is **kept** because its
> scaling math (`build_model`/`compute_orders`) is imported by
> `mt2_emit_boss_stats.py`. Run it only if you actually want to regenerate those
> legacy spreadsheets/page.

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
mt2_build_outputs.py       ← owns the scaling math (build_model/compute_orders, imported by mt2_emit_boss_stats); its scaled_<difficulty>.xlsx + scaling_page.html outputs are DEPRECATED (archived in deprecated/)
mt2_extract_waves.py       → out/waves.json + out/waves.md  (standalone, not wired to build_outputs)
mt2_emit_wave_descriptions.py → rewrites the BOSS_WAVE_DESCRIPTIONS + WAVE_SET_DESCRIPTIONS blocks in gamedata.js from out/waves.json (first piece of the "pipeline emits gamedata.js" job)
mt2_emit_boss_stats.py     → rewrites the BOSS_STATS block in gamedata.js from roster.json + scaling.json (reuses mt2_build_outputs.compute_orders for the math)
mt2_emit_enemy_stats.py    → rewrites the ENEMY_STATS block in gamedata.js from difficulty_observations.csv (Overgrowth, non-boss rows; OBSERVED — non-boss scaling is unsolved)
mt2_collect_observations.py → guided TUI collector → difficulty_observations.csv (Bloom/Tangle/Overgrowth enemy AND boss ATK/HP + notes). Maintenance modes: --check (validator), --prefill-base DIFF (seed a difficulty from roster base), --tidy-notes (drop 'base?' markers + propagate each enemy's note across its orders/difficulties). See its module docstring.
mt2_extract_descriptions.py → out/enemy_descriptions.xlsx — PARTIAL per-enemy ability text from CharacterData descriptionKey (templates 100%; some amounts unresolved). See docs/enemy_descriptions.md
difficulty_observations.csv ← hand-collected SS enemy+boss ATK/HP by difficulty×order (long format); source of truth for ENEMY_STATS, and the wiki-facing dataset
roster.json (out/)         ← authoritative BASE stats for every char (Bloom non-boss ≈ base, tentative)
```

**Authoritative sources (post-2026-06-25 cleanup).** `out/roster.json` = base stats; `difficulty_observations.csv` = observed scaled/per-difficulty/boss stats. Legacy/superseded artifacts live in `deprecated/` (git-ignored, local-only): `enemy_observations.csv` (ATK/HP role moved to difficulty_observations.csv; its `Description (filled)` column is still the active home for the descriptions TODO), the old boss spreadsheets `Observations.xlsx` / `Expected_Boss_Values.xlsx`, and the deprecated `mt2_build_outputs.py` outputs `scaled_Overgrowth_SoulSavior.xlsx` / `scaling_page.html`. **Ignore `deprecated/` unless a task specifically asks about it.**

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
- [ ] **Finish per-enemy ability descriptions (partial extractor exists).** `extraction/mt2_extract_descriptions.py` resolves each enemy's `descriptionKey` template and fills keyword names + inline status powers, but leaves `?` (statuses stored as `PPtr` refs, not inline) and `{?}` (non-status `paramInt` amounts like Heal). Full method + how-to-finish in `docs/enemy_descriptions.md`. User is reviewing/hand-filling in-game via the `Description (filled)` column of `deprecated/enemy_observations.csv` (still the active home for descriptions, even though the file's ATK/HP role is deprecated); eventual goal is an `ENEMY_DESCRIPTIONS` block surfaced on the enemy hover (the `title` in `wrapEnemyStats` is the hook).
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
- [x] **`BOSS_STATS` wired to the pipeline — DONE (2026-06-14)** via `extraction/mt2_emit_boss_stats.py --write gamedata.js`, which reuses `mt2_build_outputs.compute_orders` (lifted out of `main()` to a module-level fn so the math has one source of truth). Keyed by variant name: main-region + minor bosses → `['O1','O2','O3','O4']` of `'ATK⚔️ HP❤️'`; Astrael (O1) and Lifemother (final) → single fixed string. Region-boss formula confirmed correct (e.g. Mischevious Child O1 = 21/1320 matched the prior hand value). **Re-run after `mt2_extract_roster.py` + `mt2_extract_scaling.py`.**
- [ ] **Minor-boss HP formula is wrong (Athane issue, 2026-06-14).** `boss_overgrowth_scaled` is applied to **all** `is_boss` enemies, but its large additive HP constants (`+1224/+2703/+3883`) over-inflate the small-base **minor "TrainBoss" bosses** (Athane/Korin/Elebor/Quoto/Phalanx/Undying Spirit/Qel/Ajax). Example — **Athane the Fallen** (base 5/400): emitted O3 = **36⚔️/4667❤️**, but a prior observed value in `gamedata.js` was **44⚔️/2908❤️** (HP ~0.6× the formula). Same pattern on Elebor O4 (obs 66/4867 vs 69/8528) and Ajax O2 (29/1470 vs 30/2012). Region bosses (Maera/Thaddeus/Tivi/Lylith) + Astrael + Lifemother look correct; only the minor TrainBosses are off — they likely scale by a **different formula**. These numbers are emitted anyway (better than `0⚔️ 0❤️`). **Action:** gather ground-truth minor-boss observations (note: `boss_observations.csv` referenced by `mt2_build_outputs.py` is **not in the repo** — only `docs/boss_scaling.md` / `docs/enemy_scaling.md`), derive the minor-boss formula, then split the boss code path in `compute_orders` / `boss_overgrowth_scaled` and re-emit.
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
- `gamedata.js` — **pipeline-generated**: `BOSS_STATS` (by `mt2_emit_boss_stats.py`), `BOSS_WAVE_DESCRIPTIONS` + `WAVE_SET_DESCRIPTIONS` (by `mt2_emit_wave_descriptions.py`)
- `gamefacts.js` — **hand-authored wiki facts**, NOT extractable: `MUTATORS`, `variantDescriptions`, `VARIANT_OPTIONS`, `WAVE_SET_OPTIONS`. The pipeline must never write this file.
- `app.js` — tracker logic (all functions) + UI config (`CENTRAL_NODE_OPTIONS`, `TRACK_NODE_OPTIONS`, `PATH_TRACK_OPTIONS`, `ORDER_OPTIONS`, `encounterInfo`)

The pipeline's eventual job is to emit `gamedata.js`, retiring the manual-transcription TODO above.
