# Enemy Scaling — Overgrowth (Soul Savior) Analysis

## Context

Non-boss enemies appear at Overgrowth difficulty orders O1–O4.
O_n = DifficultyTier3 mutator + (n−1) RunDistance mutators active.

- O1: DifficultyTier3 only
- O2: + RunDistance1
- O3: + RunDistance1 + RunDistance2
- O4: + RunDistance1 + RunDistance2 + RunDistance3

Boss scaling is confirmed correct and must not be changed. This document covers non-boss enemies only.

---

## O1 Formula — CONFIRMED CORRECT

```
O1_ATK = rnd(base_ATK × 1.50)   # DifficultyTier3 setA_health = 50% for all non-boss subtypes
O1_HP  = ceil(base_HP  × 1.35)  # DifficultyTier3 setB_attack = 35% for all non-boss subtypes
```

**Key finding:** HP at O1 uses **ceiling** (round-up always), NOT round-half-up (`rnd`).
This is confirmed by 5 enemies where `rnd` gives the wrong answer and `ceil` gives the right one:

| Enemy | base HP | rnd(base×1.35) | ceil(base×1.35) | Observed O1 HP |
|-------|---------|----------------|-----------------|----------------|
| Jeermask | 1 | 1 ✗ | 2 ✓ | 2 |
| Mother's Hunter | 3 | 4 ✗ | 5 ✓ | 5 |
| Longlash | 4 | 5 ✗ | 6 ✓ | 6 |
| Zephyrite | 6 | 8 ✗ | 9 ✓ | 9 |
| Witchwarden | 12 | 16 ✗ | 17 ✓ | 17 |

For large-base enemies (base HP >= 45) where `base × 1.35` is already near an integer or >= 0.5 fractional, ceil and rnd produce the same result — consistent with both.

Support ATK: Support enemies do not gain ATK from DifficultyTier3 (Support is absent from setA_health). O1 ATK for Support = base ATK unchanged.

---

## Extraction Investigation Results (Session 2)

### Effect types in RunDistance mutators — COMPLETE

A full scan of all effect-type strings in RunDistance1/2/3 confirms exactly 5 effect types:

| Effect | Applies to | Value |
|--------|-----------|-------|
| `RelicEffectModifyCharacterAttackOrHealthPercentage` | All subtypes | SetA=10%, SetB=4% |
| `RelicEffectModifyCharacterMaxHealth` | **Boss only** | RD1=+700, RD2=+1500, RD3=+2000 |
| `RelicEffectModifyCharacterAttackDamage` | **Boss only** | RD1=+10, RD2=+12, RD3=+20 |
| `RelicEffectIncreasePyreHealth` | Player pyre | (irrelevant to enemy scaling) |
| `RelicEffectIncreasePyreAttack` | Player pyre | (irrelevant to enemy scaling) |

**Key finding:** Flat HP/ATK effects are **Boss-only**. Non-boss enemies receive only percentage effects.
No other effect types were found — the extraction is complete and there is nothing missing.

### The int[2]=2 anomaly

All `RelicEffectModifyCharacterAttackOrHealthPercentage` effects in RunDistance mutators have a third integer field = **2**, while the same effect in DifficultyTier3 has that field = **0**:

```
DifficultyTier3 SetA 50%:  ints=[1, 50, 0, ...]
RunDistance1    SetA 10%:  ints=[1, 10, 2, ...]
RunDistance1    SetB  4%:  ints=[1,  4, 2, ...]
```

The meaning of this field is unknown. If interpreted as a **stack multiplier** (apply the percentage twice per RunDistance), it would give:
- SetA 10% × 2 = **20% per RunDistance for ATK** — matches ATK observations well
- SetB  4% × 2 = **8% per RunDistance for HP** — overshoots large-base HP; 7% fits better empirically

---

## O2–O4 Formula — EMPIRICAL BEST-FIT

The current formula in `mt2_build_outputs.py` uses additive percentages from `scaling.json` (10% HP / 4% ATK per region). This produces **wrong values**.

### Formula comparison (excluding confirmed-bad observations: Jeermask O3/O4, Hunter O3/O4)

| Formula | ATK | HP | Notes |
|---------|-----|----|-------|
| `rnd(base*(1.50+n*0.20))` / `ceil(base*(1.35+n*0.07))` | **17/22 (77%)** | **17/30 (57%)** | **selected — best overall** |
| `ceil(base*(1.50+n*0.20))` / `ceil(base*(1.35+n*0.08))` | 17/22 | 14/30 | 8% overshoots Knight/Amalgam HP |
| step-by-step `ceil(prev*1.10)` ATK / `ceil(prev*1.08)` HP | 16/22 | 13/30 | Amalgam diverges past O2 |

where `n` = number of RunDistance mutators active (O1=0, O2=1, O3=2, O4=3).

### What the best-fit formulas explain correctly

ATK at 20% `rnd`:
- Amalgam / Zephyrite / Ossivane (base_ATK=8): all orders correct
- Zealot O1–O3: correct; O4 off by +1
- Plaguehost / Knight O2: correct

HP at 7% `ceil`:
- **Knight (base_HP=60): ALL FOUR orders correct** (81, 86, 90, 94)
- Zealot O1–O2: correct; O3 off by −1, O4 off by −2
- Amalgam (base_HP=140): O1 correct, O2–O4 off by 1–4

### Persistent conflicts (likely observation errors)

1. **Knight ATK O3/O4**: Observed 20/23, formula gives 19/21 — off by 1 and 2. Flagged for re-verification.
2. **Amalgam HP vs Knight HP**: Amalgam requires ~6% per region; Knight requires ~7%. Irreconcilable — one or both observations likely have errors.
3. **Jeermask O3/O4 HP**: base_hp=1, observed HP=5/6 would require >130% per region — mathematically impossible. These observations are definitively wrong.
4. **Hunter O3/O4**: Small-base (base=3/3). ATK and HP both off by 1–2. Likely observation errors.
5. **Mother's Blade**: O1 ATK=8 with base_atk=4 (formula gives 6); likely a wrong observation or shifted column.

### Why 20% ATK cannot be derived directly from game data

The game data has SetA=10% and SetB=4% per RunDistance for non-boss enemies. No standard interpretation (additive, multiplicative, or step-by-step) of these percentages produces the ~20% that observations require. The int[2]=2 field is the only candidate explanation for 20% ATK, but the same interpretation (8% HP) does not fit HP observations as well as 7%.

**Decision**: Implement the empirical formula `rnd(base*(1.50+n*0.20))` for ATK and `ceil(base*(1.35+n*0.07))` for HP. This is clearly a best-fit approximation, not a confirmed formula derivation.

---

## Session 3 — Structure Scan Findings

### Hypothesis: static per-enemy lookup table

Tested by scanning all MonoBehaviour objects and TextAssets across all 54 `.assets` files in the game data directory. **Hypothesis is not supported.**

**`Enemy_EndlessScaling`** (pid 17869) — the most promising name — is a relic artifact carrying a `RelicEffectEndlessScalingOnSpawn` effect for an Endless roguelike mode. It is not a lookup table and is irrelevant to Soul Savior Overgrowth.

**`EndlessScalingData`** (pid 17150) is the configuration for that relic: 4 groups of 6 float multipliers for the Endless mode tiers. Unrelated to Overgrowth enemy scaling.

**`SoulSavior_RunDistance4`** exists but contains only `RelicEffectScaleStatusApplicationsOnSpawn` (scales status effects like spikes/armor) and boss pyre buffs. No `RelicEffectModifyCharacterAttackOrHealthPercentage` effects at all — RunDistance4 does not affect enemy ATK or HP.

No TextAssets contain embedded stat tables. No PPtr cross-references from enemy CharacterData pathIDs were found in any non-character MonoBehaviour that would indicate a per-enemy override structure.

### Per-subtype percentages — confirmed uniform

Full extraction of per-subtype percentages from all mutators reveals five distinct combat subtypes (Attacker, Heavy, Horde, Mage, Support), but all non-boss combat subtypes are **identical**:

| Mutator | Subtype | SetA | SetB | int[2] |
|---------|---------|------|------|--------|
| DifficultyTier3 | Attacker / Heavy / Horde / Mage | 50% | 35% | 0 |
| DifficultyTier3 | Boss | 50% | 65% | 0 |
| DifficultyTier3 | Support | — | 35% | 0 |
| RunDistance1/2 | Attacker / Heavy / Horde / Mage | 10% | 4% | 2 |
| RunDistance1/2 | Boss | 10% | 6% | 2 |
| RunDistance1/2 | Support | — | 4% | 2 |
| RunDistance3 | Attacker / Heavy / Horde / Mage | 10% | 4% | 2 |
| RunDistance3 | Boss | 10% | **8%** | 2 |
| RunDistance3 | Support | — | 4% | 2 |

**Key finding:** Collapsing Attacker/Heavy/Horde/Mage into a single role (as `mt2_build_outputs.py` does) is correct — there is no hidden per-subtype differentiation that could explain the formula discrepancy.

**int[2]=2 remains the only unexplained factor.** Every DifficultyTier effect has `int[2]=0`; every RunDistance effect has `int[2]=2`. No other scaling mechanism was found. The empirical formula (20% ATK / 7% HP per region) is the best available approximation and is confirmed to not be derivable from the raw data without understanding what int[2]=2 does at runtime.

---

## Verification Needed

The following specific observations, if re-verified in-game, would resolve the main ambiguities:

| Enemy | Stat | Order | Current obs | Formula gives | Question |
|-------|------|-------|-------------|---------------|----------|
| Mother's Knight | ATK | O3 | 20 | 19 | 19 or 20? |
| Mother's Knight | ATK | O4 | 23 | 21 | 21 or 23? |
| Mother's Amalgam T2 | HP | O2 | 198 | 199 | 198 or 199? |
| Mother's Zealot | ATK | O4 | 30 | 29 | 29 or 30? |
| Mother's Zealot | HP | O3 | 67 | 68 | 67 or 68? |
| Mother's Zealot | HP | O4 | 69 | 71 | 69 or 71? |
| Mother's Knight | HP | O4 | 94 | 95 | 94 or 95? |

---

## Current Code Status

File: `extraction/mt2_build_outputs.py`

- O1 HP: uses `rnd` — **should be `ceil`** (confirmed)
- O2–O4 ATK: uses `setB_attack` = 4% from RunDistance — **wrong**
- O2–O4 HP: uses `setA_health` = 10% from RunDistance — **wrong**
- Support ATK handling: must stay at base ATK (no scaling) across all orders
- Boss scaling: **DO NOT CHANGE** — confirmed correct separately

Formula to implement:
```python
# Empirical best-fit (not a confirmed derivation from game data)
# ATK: rnd(base * (1.50 + n_regions * 0.20))   -- where n_regions = order - 1
# HP:  ceil(base * (1.35 + n_regions * 0.07))
# Support enemies: ATK stays at base (no bonus), HP uses the same ceil formula
```
