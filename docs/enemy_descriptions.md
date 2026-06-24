# Enemy ability descriptions — extraction notes (partial)

Goal: per-enemy ability text like **"Trample. Gorge: Gain Titanskin 3 and restore 20 health."**, eventually shown on hover in the tracker. This documents a *partial* extraction (the `?`/`{?}` numbers are not all resolved). The working script is `extraction/mt2_extract_descriptions.py`; it writes a review spreadsheet `out/enemy_descriptions.xlsx`.

Status (2026-06-24): **review is being done in-game** and the partial data was copied into `enemy_observations.csv` for hand-completion. This file is so the binary half can be resumed/finished later.

## Where the description lives

Each enemy's `CharacterData` (class 114, in `sharedassets0.assets`) has a **`CharacterData_descriptionKey-…-v2`** localization key. Resolve it through `mt2_lib.Localizer` (reads `resources.assets`) to get a **template with placeholders**, e.g.:

```
Glutmass   → "Gain [titanskin] [effect0.status0.power] and restore [effect1.power] health."
Zephyrite  → "Gain [burst] [effect0.status0.power]."
Plaguehost → "Apply [witherbloom] [effect0.status0.power] to your front unit."
```

The template text is 100% reliable. Only the placeholders need filling.

## Placeholder kinds

| Placeholder | Meaning | Status |
|---|---|---|
| `[titanskin]`, `[burst]`, `[malaise]`, … | a status keyword | **done** — `DISPLAY` map → "Titanskin", "Melee Weakness", … |
| `[effectN.statusM.power]`, `[effectN.upgrade.statusM.power]` | a status's amount | **partly done** — see below |
| `[effectN.power]` | a non-status amount (Heal / self-damage / Pyre-damage `paramInt`) | **not done** (`{?}`) |

### Status powers — `status_power()`
For statuses stored **inline**, the amount is the 4-byte-aligned `int32` immediately after the keyword's length-prefixed string in the CharacterData chunk. `status_power(chunk, kw)` finds the keyword string (verifying the `int32` length prefix at `offset-4` == `len(kw)`) and reads the trailing aligned int. Verified: Glutmass `titanskin` → 3, Jeermask `dazed` → 2, Witchwarden `armor` → 10 / `regen` → 3, etc. Each `[…statusM.power]` placeholder is always adjacent (either side) to its `[keyword]`, so they're paired by two regexes (keyword-then-power and power-then-keyword).

**Why some `?` remain:** these statuses are **not stored inline** — observed: `infested`, `rage`, `meleeweakness`, `emberdrain`, `damageshield`, `spellshield`, `lifesteal`. The keyword string simply isn't in the chunk; the status is a **`PPtr` reference** to a separate `StatusEffectData` object, with the amount held as the `count` in the effect's `statusEffectStackList`. **To finish:** parse each effect's `statusEffectStackList = [{PPtr statusEffectData, int count}, …]` positionally and take `count` for the placeholder's `effectN.statusM` slot (only need to deref the PPtr if you also want to confirm the keyword).

### Non-status powers — `[effectN.power]` (`{?}`)
These are the effect's `paramInt` (Heal amount, self-damage, Pyre damage). They sit deeper in the `CardEffect` block after the className string (`CardEffectHeal`, `CardEffectDamage`, `CardEffectAddStatusEffect`). For Glutmass the heal `20` was at chunk offset 1620, ~212 bytes after `CardEffectHeal` (1408), past several `SubtypesData_None` strings — **the CardEffectData field layout isn't decoded yet.** Decoding `paramInt`'s offset relative to the className (per effect class/version) would resolve these.

## Not attempted ("option C")
The full in-game tooltip also has a **leading starting-keyword** (Glutmass's "Trample.") and a **trigger prefix** ("Gorge:"). Neither is in the `descriptionKey` — they come from a separate starting-status list and trigger data on the CharacterData. Not extracted.

## To resume / finish
1. Parse the effects array of each CharacterData: ordered `CardEffectData` entries, each with className, `paramInt`/`paramFloat`, and a `statusEffectStackList`.
2. From the stack list, fill `[effectN.statusM.power]` with `count` (resolves all the `?`).
3. From `paramInt`, fill `[effectN.power]` (resolves all the `{?}`).
4. (Optional, option C) prepend starting keywords + trigger label.
5. Then this becomes a real pipeline step emitting an `ENEMY_DESCRIPTIONS` block (likely into `gamedata.js`), surfaced on the enemy hover (`wrapEnemyStats` already holds the full name in the `title` as the hook).
