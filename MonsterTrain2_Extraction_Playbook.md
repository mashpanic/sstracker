# Monster Train 2 — Enemy & Scaling Extraction Playbook

A reference for future sessions. It explains **where the data lives, how to parse it, how enemy stat-scaling works, the current formulas, and the caveats**. The game ships balance patches that change the numbers — so treat every specific number here as a *snapshot*. The **method** is stable; the **values must be re-extracted each patch**. Re-run the extraction rather than trusting cached numbers.

---

## 0. Environment facts (verify each patch)

- Game: **Monster Train 2**, Unity **2022.3.x**, **Mono** build (not IL2CPP), macOS `.app` bundle.
- Data root: `<App>/Contents/Resources/Data/`
- Key files:
  - `sharedassets0.assets` (~76 MB) — **the prize.** Holds all `CharacterData` ScriptableObjects (enemy/boss base stats) and the `MutatorData` scaling objects. Unencrypted.
  - `resources.assets` (~13 MB) — the **localization string table** (display names, descriptions, flavor text).
  - `Managed/Assembly-CSharp.dll` — game code; use `strings` on it to discover class/field names and the data model.
  - `StreamingAssets/aa/StandaloneOSX/*.bundle` — Addressables asset bundles. **These are AssetBundle-encrypted (header flag `0x200`). Do NOT try to read them — the data you want is already in `sharedassets0.assets` in the clear.**
- **No type trees anywhere** (`enableTypeTree = 0`). That means tools like UnityPy can't auto-read MonoBehaviour fields, and you must parse the `SerializedFile` manually and read fields **by byte position**. (UnityPy was also unavailable because pip had no network — assume you'll hand-roll the parser; see Appendix.)

---

## 1. Extracting the enemies

### 1.1 Identify enemy objects
In `sharedassets0.assets`, parse the object table and keep **class 114 (MonoBehaviour)** objects whose raw bytes contain both `CharacterData_nameKey` and `.prefab`. That set is the full character roster (enemies, bosses, plus non-combat "characters").

### 1.2 Read each object
After the standard MonoBehaviour header (PPtr m_GameObject = 12 bytes, m_Enabled = 1 byte + align, PPtr m_Script = 12 bytes), comes:

- **Internal name** (`m_Name`) — length-prefixed string. This is the stable key (e.g. `HeavyT1_LoseHealthOnMove`, `Boss_SoulSavior_Final_Lifemother_Debuffer`).
- A GUID string, the localization `CharacterData_nameKey-...`, the **prefab path** (`Assets/.../Character_X.prefab`), and the prefab's 32-hex asset GUID.
- **Numeric stat block:** immediately after the prefab's 32-hex GUID (aligned to 4), a run of `int32`s. **Health = index 3, Attack = index 13** (0-based). Verified across many units (e.g. Flagellant = HP 90 / ATK 3). *Re-verify these indices after a patch.*
- Later strings: `SubtypesData_*` (subtypes), card effect class names, status keywords, and the **artist** name (a `First Last` string near the end).

### 1.3 Resolve display names / text
The `nameKey` / `descriptionKey` / `data` strings are localization keys. Resolve them against `resources.assets`: find the key bytes, then read the following length-prefixed string value (the localized English text). `data` key → the flavor/subtitle line.

### 1.4 Filter
- `DialogueCharacter_*` internal names = **cutscene portraits** (0 HP / 0 ATK). Exclude them — there are ~147.
- "Snack", "TreasureCollector", "Statue", "Egg", "Pyre", etc. subtypes = non-combat objects.
- Dedupe by internal name (display names repeat across boss variants and Lifemother forms).

---

## 2. How the scaling was found

The CharacterData object stores **only base stats**. In-game inflation comes from two stacking systems, both discovered by:

1. `strings Assembly-CSharp.dll | grep -i difficulty|scaling|region` → revealed the data model: `DifficultyTierData`, `RegionRunData` (with `RegionRunTier1/2/3Difficulty`), `MutatorData`, `RelicEffectModifyCharacterAttackOrHealthPercentage`, fields `addAttackPercent` / `addHealthPercent` / `modifyAttack` / `modifyHealth`.
2. Finding the actual data objects in `sharedassets0.assets` by `m_Name`:
   - **Difficulties** are `MutatorData`: `SoulSavior_DifficultyTier2` (Tangle), `SoulSavior_DifficultyTier3` (Overgrowth). **Tier 1 (Bloom) has no object = baseline / no change.**
   - **Region/distance** scaling = `SoulSavior_RunDistance1`, `RunDistance2`, `RunDistance3` (added cumulatively as you advance regions).
3. Each mutator applies **`RelicEffectModifyCharacterAttackOrHealthPercentage`**, repeated **once per enemy subtype** (`SoulSavior_Horde_Enemy`, `_Attacker_`, `_Heavy_`, `_Mage_`, `_Support_`, and `Boss`). Inside each effect, the second `int32` param = the **percentage**. They come in two positional groups: **Set A** (excludes Support) and **Set B** (includes Support).
4. **Validation / labeling:** initial extraction tagged Set B = Attack (+65%) and Set A = Health, based on reconciling Lifemother ATK at R4 Overgrowth. **This labeling was wrong** — see §4 caveats. Empirical observation of multiple bosses and non-boss enemies at O1 Overgrowth conclusively shows Boss ATK = ×1.5 (+50%) and Boss HP = ×1.65 (+65%). Set A and Set B assignments in the game data bytes are inverted from the original extraction notes.

---

## 3. Scaling systems overview

There are **two independent, stacking** scaling systems. The old playbook modelled only the region system. Both must be combined to predict any in-game stat.

| System | What it does | When it applies |
|---|---|---|
| **Difficulty + Region** (§3.1) | Difficulty multiplier × region distance bonus | Every encounter within a run |
| **Order / Oversoul** (§3.2) | Additional flat and % bonuses per Oversoul ring | Determined by which Oversoul ring (O1–O5) the current run is on |

Combining them: the Order formula already bakes in the Overgrowth difficulty factor at its O1 multiplier. The Region system then stacks on top within each run (or may be separate — needs verification). For Soul Savior analysis the Order formula at O1 Overgrowth is the primary reference.

---

## 3.1 Difficulty + Region component (SNAPSHOT — re-extract after any patch)

**Empirically corrected multipliers at Overgrowth O1.** The old table had ATK and HP labels swapped for bosses and incorrect non-boss values. The values below come from in-game observation, not raw data extraction.

### Overgrowth difficulty multiplier (applied at O1)
| Role | ATK multiplier | HP multiplier |
|---|---|---|
| Boss | ×1.50 (+50%) | ×1.65 (+65%) |
| Non-boss (Attacker / Heavy / Horde / Mage) | ×1.50 (+50%) | ×1.35 (+35%) |
| Support | ×1.00 (no change) | ×1.35 (+35%) |

Both boss and non-boss ATK receive the same +50% at Overgrowth. The distinction is HP: bosses get +65%, non-boss gets +35%, Support gets +35% HP and no ATK change.

### Region / distance component (cumulative within a run; applies on every difficulty including Bloom)
| Region | Health (non-Support) | Attack (non-boss) | Attack (Boss) |
|---|---|---|---|
| R1 (start) | +0% | +0% | +0% |
| R2 | +10% | +4% | +6% |
| R3 | +20% | +8% | +12% |
| R4 (final) | +30% | +12% | +20% |

(Per-mutator: RunDistance1/2/3 each add Health +10% / Attack +4% non-boss, +6/+6/+8% boss.)

### Other
- `Echoes_DoubleEnemyUnitHealth` = a **separate mode** mutator (+100% enemy HP), not part of the Bloom/Tangle/Overgrowth ladder.

---

## 3.2 Order (Oversoul Ring) Scaling — Boss formula

Derived empirically and verified against all 26 boss rows at Overgrowth difficulty. All rounding uses **round-half-up** (`math.floor(x + 0.5)`), not `math.ceil` and not Python's `round()` (which uses banker's rounding).

### Boss ATK formula

```
ATK_O1 = ceil(base_atk × 1.5)
ATK_O2 = ATK_O1 + 13
ATK_O3 = ATK_O1 + 28
ATK_O4 = ATK_O1 + 51
```

The flat increments (+13, +28, +51 cumulative from O1) are **identical for every boss regardless of base ATK**. Differences between rings: +13, +15, +23 — not arithmetic, but the values are constant across bosses.

### Boss HP formula

```
HP_O1 = ceil(base_hp × 1.65)
HP_O2 = ceil(base_hp × 1.75 + 1224)
HP_O3 = ceil(base_hp × 1.85 + 3927)
HP_O4 = ceil(base_hp × 1.995 + 7810)
```

The multiplier increases by ~0.10 per ring. The flat addend grows substantially each ring (1224 → 3927 → 7810) and is shared across all bosses.

### Python reference implementation

```python
import math

def rnd(x):
    return math.floor(x + 0.5)  # round-half-up

def compute_boss_order(base_atk, base_hp):
    o1a = rnd(base_atk * 1.5)
    o1h = rnd(base_hp  * 1.65)
    o2h = o1h + rnd(base_hp * 0.10) + 1224
    o3h = o2h + rnd(base_hp * 0.10) + 2703
    o4h = o3h + rnd(base_hp * 0.145) + 3883
    return {
        'O1 ATK': o1a,        'O1 HP': o1h,
        'O2 ATK': o1a + 13,   'O2 HP': o2h,
        'O3 ATK': o1a + 28,   'O3 HP': o3h,
        'O4 ATK': o1a + 51,   'O4 HP': o4h,
    }
```

### O5 formula (Lifemother only)

Lifemother is never encountered before the final encounter — she has no O1–O4 values. O5 was verified against all three variants: **Cycle Ender** (base ATK 50, HP 9000), **Swarmhost** (base ATK 40, HP 9000), and **Undying Bloom** (base ATK 40, HP 10000).

```python
def lifemother_o5(base_atk, base_hp):
    return {
        'O5 ATK': rnd(base_atk * 2.1)   + 39,
        'O5 HP':  rnd(base_hp  * 2.003)  + 7794,
    }
```

### Validation table (O1–O4, Overgrowth)

| Boss | Base ATK/HP | O1 ATK | O2 ATK | O3 ATK | O4 ATK |
|---|---|---|---|---|---|
| Lylith | 16 / 1200 | 24 | 37 | 52 | 75 |
| Maera | 12 / 1000 | 18 | 31 | 46 | 69 |
| Thaddeus | 12 / 1100 | 18 | 31 | 46 | 69 |

| Boss | Base HP | O1 HP | O2 HP | O3 HP | O4 HP |
|---|---|---|---|---|---|
| Lylith | 1200 | 1980 | 3324 | 6147 | 10204 |
| Maera | 1000 | 1650 | 2974 | 5777 | 9805 |
| Thaddeus | 1100 | 1815 | 3149 | 5962 | 10005 |

---

## 4. Caveats (read before trusting any output)

1. **Patch sensitivity — the big one.** A released balance patch already changed many numbers, and more are expected. Every percentage in §3 and every base stat is a snapshot. **Re-run extraction each patch.** The *locations and method* (which files, which object names, parse approach) are far more stable than the *values*.
2. **No type trees → positional reads.** HP = stat-block index 3 and ATK = index 13 were verified empirically, not from named fields. A Unity-version bump or field reorder could shift them. Re-verify against a known unit (e.g. Flagellant) before bulk-extracting.
3. **Boss Order formula is empirically derived and accurate.** The §3.2 formula was cross-validated against three bosses at O1–O4. Boss HP predictions are **reliable** for Overgrowth Soul Savior. The earlier note that "boss HP predictions are unreliable" was based on an incorrect baseline and is now superseded.
4. **Set A / Set B label was inverted in original extraction.** The first extraction concluded Set B = Attack, Set A = Health. In-game observation proves this is wrong: at Overgrowth, Boss ATK = ×1.5 and Boss HP = ×1.65. The +50% corresponds to ATK and the +65% to HP — opposite of the original labeling. Re-extract and re-label game data with this in mind: the positional bytes are correct; only the semantic assignments were swapped.
5. **Region→room mapping is inferred.** Assumed R1 = no distance mutator, R2 = +RunDistance1, R3 = +RunDistance1+2, R4 = all three (cumulative). This was deduced from naming, not proven from per-room scenario data.
6. **Role mapping isn't 1:1 documented.** Enemies carry roles via subtype/internal-name prefixes (`HeavyT1`, `AttackerT2`, `HordeT1`, `MageT*`, plus `SoulSavior_*_Enemy` on variants). Mapping each unit to one of the six scaling categories (Horde/Attacker/Heavy/Mage/Support/Boss) is mostly reliable for HP (identical for all non-Support) but matters for ATK (boss vs non-boss) and HP (boss +65% vs non-boss +35%). Identify Support and Boss carefully.
7. **Rounding is round-half-up (`math.floor(x + 0.5)`), not `math.ceil` and not Python's `round()`.** Python's `round()` uses banker's rounding (rounds 0.5 to even), which gives wrong results (e.g. `round(742.5) = 742`, correct is 743). `math.ceil` is wrong for non-.5 fractional parts (e.g. `ceil(65.25) = 66`, correct is 65). Use `math.floor(x + 0.5)` throughout. Verified across all 26 boss rows.
8. **Soul Savior vs roguelike.** Bloom/Tangle/Overgrowth + RunDistance are the **Soul Savior campaign**. The roster also contains roguelike-mode units (`BannerUnit`, `Champion`, clan champions, `PyreHeart*`, treasure bags). Applying campaign scaling to those is meaningless — filter to campaign enemies when it matters.

---

## 5. Appendix — minimal reusable parser

Pure-Python `SerializedFile` reader for these `.assets` (v22, payload little-endian, header fields big-endian, no type trees). Drop into a script; it returns `(data, objects, le)` where each object is `(pathID, absOffset, byteSize, classID, typeIndex)`.

```python
import struct
class Reader:
    def __init__(self,d,le=True): self.d=d; self.o=0; self.le=le
    def seek(self,o): self.o=o
    def read(self,n): b=self.d[self.o:self.o+n]; self.o+=n; return b
    def align(self,a=4):
        r=self.o%a
        if r: self.o+=(a-r)
    def _u(self,n,s=False): return int.from_bytes(self.read(n),'little' if self.le else 'big',signed=s)
    def u8(self):return self._u(1)
    def i16(self):return self._u(2,True)
    def i32(self):return self._u(4,True)
    def u32(self):return self._u(4)
    def i64(self):return self._u(8,True)
    def cstr(self):
        s=self.o
        while self.d[self.o]!=0: self.o+=1
        b=self.d[s:self.o]; self.o+=1; return b.decode('utf8','replace')

def parse(path):
    data=open(path,'rb').read()
    hr=Reader(data,le=False)
    hr.read(8); version=hr.u32(); hr.u32(); endian=hr.u8(); hr.read(3)
    metadataSize=hr.u32(); fileSize=hr._u(8); dataOffset=hr._u(8); hr._u(8)
    le=(endian==0); r=Reader(data,le=le); r.seek(hr.o)
    unityVersion=r.cstr(); targetPlatform=r.i32(); ett=r.u8()  # ett (enableTypeTree) is 0 here
    typeCount=r.i32(); types=[]
    for _ in range(typeCount):
        classID=r.i32(); r.u8(); r.i16()
        if classID==114: r.read(16)   # script hash
        r.read(16)                    # old type hash
        types.append(classID)
        # ett==0 -> no type tree blob to skip
    objCount=r.i32(); objs=[]
    for _ in range(objCount):
        r.align(4); pathID=r.i64()
        byteStart=r.i64() if version>=22 else r.u32()
        byteSize=r.u32(); typeID=r.i32()
        objs.append((pathID, dataOffset+byteStart, byteSize, types[typeID], typeID))
    return data, objs, le
```

### Recipes
- **Enemy roster:** iterate objs, keep `classID==114` where chunk has `b'CharacterData_nameKey'` and `b'.prefab'`. Read `m_Name`; HP/ATK from the int block after the prefab's 32-hex GUID (idx 3 / 13).
- **Resolve a localization key** `k`: in `resources.assets`, `i=res.find(k.encode())`; then read the length-prefixed string at `(i+len(k)` aligned to 4`)` + small probe.
- **Scaling tables:** find objects with `m_Name` in {`SoulSavior_DifficultyTier2/3`, `SoulSavior_RunDistance1/2/3`}; for each `RelicEffectModifyCharacterAttackOrHealthPercentage` occurrence, the **2nd int32 after the (4-aligned) effect-name string is the percentage**, and the following `SubtypesData_*` string is the targeted role. Two positional groups: Set A (no Support) and Set B (with Support). **Note:** the original extraction labeled Set A = Health and Set B = Attack. Empirical observation shows this is inverted — Set A (+50%) = Attack, Set B (+65% for boss / +35% for non-boss) = Health. Re-confirm the byte-level labeling before using.
- **Find the data model after a patch:** `strings Managed/Assembly-CSharp.dll | grep -iE 'difficulty|scaling|RunDistance|Mutator|AttackOrHealth'`.

### Patch-update checklist
1. Re-confirm Unity version and that `enableTypeTree` is still 0.
2. Re-verify HP=idx3 / ATK=idx13 on a known unit.
3. Re-dump `SoulSavior_DifficultyTier2/3` and `RunDistance1/2/3` percentages (don't assume §3).
4. Re-check the role list and whether new difficulties/regions/mutators exist.
5. Re-reconcile one known in-game boss to confirm Set A/B labeling and the combine rule (additive).
