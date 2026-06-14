# Boss Scaling Formula (Soul Savior — Overgrowth)

Derived from `out/scaling.json` and verified against `data/Expected_Boss_Values.xlsx`.

## Rounding

All calculations use **round-half-up** (e.g. 0.5 → 1, not banker's rounding).

## Scaling keys used from scaling.json

| Tier | Key used for HP | Key used for ATK |
|---|---|---|
| `SoulSavior_DifficultyTier3` | `setB_attack.Boss` = 65% | `setA_health.Boss` = 50% |
| `SoulSavior_RunDistance1` | `setA_health.Boss` = 10% | fixed +13 |
| `SoulSavior_RunDistance2` | `setA_health.Boss` = 10% | fixed +15 |
| `SoulSavior_RunDistance3` | 14.5% of base | fixed +23 |

The HP and ATK keys are counterintuitive (`setB_attack` drives HP, `setA_health` drives ATK for DT3), but confirmed by data.

The ATK increments (+13, +15, +23) and HP constants (1224, 2703, 3883) are fixed regardless of individual boss base stats.

The 14.5% for RunDistance3 HP has no clean single-key derivation from scaling.json but is empirically exact across all bosses.

## Formulas

```
O1_HP  = rnd(base_hp  * 1.65)
O1_ATK = rnd(base_atk * 1.50)

O2_HP  = O1_HP  + rnd(base_hp * 0.10) + 1224
O2_ATK = O1_ATK + 13

O3_HP  = O2_HP  + rnd(base_hp * 0.10) + 2703
O3_ATK = O2_ATK + 15

O4_HP  = O3_HP  + rnd(base_hp * 0.145) + 3883
O4_ATK = O3_ATK + 23
```

## Lifemother (special case — O5 only)

The three Lifemother variants are the end boss and only appear at Overgrowth 5. Columns O1–O4 are blank; only O5 is populated.

Their O5 formula is structurally different from the regular boss chain:

```
O5_HP  = rnd(base_hp  * 2.003) + 7794
O5_ATK = rnd(base_atk * 2.1)   + 39
```

Verified against all three variants:

| Variant | Base ATK | Base HP | O5 ATK | O5 HP |
|---|---|---|---|---|
| The Corpseflower (Cycle Ender) | 50 | 9000 | 144 | 25821 |
| The Swarmhost | 40 | 9000 | 123 | 25821 |
| The Undying Bloom | 40 | 10000 | 123 | 27824 |

**Caveats:** Only 2 distinct base_hp values and 2 distinct base_atk values exist, so the formula is exact for all known rows but cannot be independently validated. The multipliers (2.003 for HP, 2.1 for ATK) have no clean derivation from scaling.json.

## Source of the flat additive constants

Searched using `extraction/scan_flat_effects.py`. Two flat effect types exist in the RunDistance mutator objects targeting Boss subtype:

- `RelicEffectModifyCharacterAttackDamage` — flat ATK bonus
- `RelicEffectModifyCharacterMaxHealth` — flat HP bonus

**Raw stored values:**

| Object | Flat Boss ATK | Flat Boss HP |
|---|---|---|
| `SoulSavior_RunDistance1` | +10 | +700 |
| `SoulSavior_RunDistance2` | +12 | +1500 |
| `SoulSavior_RunDistance3` | +20 | +2000 |

These do **not** match the empirical formula constants. The gap is perfectly constant across all 26 bosses:

- ATK: source is **+3 less** than empirical (10 vs 13, 12 vs 15, 20 vs 23)
- HP: source is **+524 less** than empirical (700 vs 1224, 1500 vs 2703, 2000 vs 3883)

The gap is not explained by any SoulSavior asset object — checked all five mutator objects (DifficultyTier2/3, RunDistance1/2/3), RunDistance4, PyreBuff_Mutator, and resources.assets. The +3 ATK / +524 HP likely comes from hardcoded logic in `Assembly-CSharp.dll` that has not been decompiled.

**Conclusion:** the flat effect types and their approximate values are confirmed in the source, but the exact empirical constants (1224, 2703, 3883, 13, 15, 23) cannot be fully re-derived from asset data alone.

## Verification

All 26 boss rows in `data/Expected_Boss_Values.xlsx` match exactly using the formulas above.
