# MT2 extraction scripts

Runnable companions to `docs/MonsterTrain2_Extraction_Playbook.md`. They re-derive everything
from the game files, so when a balance patch changes numbers you just re-run them — no
re-analysis. Pure Python; only `openpyxl` is needed for the `.xlsx` outputs (JSON/console
work without it).

## Files
- `mt2_lib.py` — shared SerializedFile parser + helpers (the only file with the parsing logic).
- `mt2_extract_roster.py` — every enemy → `roster.json` (+ `roster.xlsx`).
- `mt2_extract_scaling.py` — difficulty + region scaling tables → `scaling.json` (+ console).
- `mt2_build_outputs.py` — owns the scaling math (`build_model`/`compute_orders`), imported by `mt2_emit_boss_stats.py`. Its standalone outputs (`scaled_<difficulty>.xlsx`, a one-page boss sheet, `scaling_page.html`) are **deprecated** — superseded by the app (`gamedata.js`); run only to regenerate those legacy artifacts.

## Usage
Point them at the game's `.../Contents/Resources/Data` folder (contains `sharedassets0.assets`
and `resources.assets`). They auto-find it if you pass a parent dir, or pass `Data` directly.

```bash
OUT=./out
python3 mt2_extract_roster.py  "/path/to/Contents/Resources/Data" --out $OUT
python3 mt2_extract_scaling.py "/path/to/Contents/Resources/Data" --out $OUT
python3 mt2_build_outputs.py   --in $OUT --difficulty Overgrowth --prefix Boss_SoulSavior
```

Options: `--difficulty Bloom|Tangle|Overgrowth`, `--prefix <internal-name-prefix>` for the
one-page boss sheet (default `Boss_SoulSavior`, which yields the 25 campaign bosses),
`--no-xlsx` to skip spreadsheets.

## After a game patch — do this
1. Re-run all three scripts against the new `Data` folder.
2. **Sanity-check the stat-block indices.** If a known unit (e.g. Flagellant) comes out with
   nonsense HP/ATK, the field order shifted — fix `STAT_HP_INDEX` / `STAT_ATK_INDEX` in `mt2_lib.py`.
3. **Trust `scaling.json`, not your memory.** `mt2_build_outputs.py` reads the formulas from it,
   so the percentages update automatically. Eyeball the `mt2_extract_scaling.py` console output.
4. If `mt2_extract_scaling.py` prints `NOT FOUND`, the patch renamed the mutator objects —
   `strings Assembly-CSharp.dll | grep -iE 'Difficulty|RunDistance|Mutator'` to find the new names.

## Known limits (see playbook for detail)
- No type trees → fields read by byte position; verify after patches.
- Set A=Health / Set B=Attack is inferred; re-confirm by reconciling one in-game boss.
- Boss HP and ATK formulas are verified against all 26 boss rows including all three Lifemother
  variants. The earlier note that "Lifemother HP didn't match" was based on wrong base stats and
  is now superseded.
- Region→room mapping (R2=+RunDistance1, R3=+RD1+RD2, R4=all three) is assumed cumulative.
