#!/usr/bin/env python3
"""
mt2_extract_waves.py — extract per-visit-tier enemy wave lists from SoulSavior
ScenarioData objects.

Each wave group in the binary encodes enemy variants for 4 visit slots (O1-O4,
the Oversoul-ring difficulty axis; output labels are O#) using two mechanisms:
  1. Per-enemy: header=0 (base/early) vs header=1 (late/upgrade) pair at offset+56,
     with a RunDistance pathID threshold at PPtr+44 controlling inclusion.
  2. Per-wave: "Complete N" string in the inter-wave gap sets the minimum slot
     (N=1 → O2+, N=2 → O3+) for the whole wave group.

Reconstruction per tier (RD in 0-3):
  - Late variant (header=1):   include if tier >= threshold_rd
  - Early of a pair (header=0 with header=1 at +56): include if
       own threshold_rd <= tier < partner threshold_rd  (the base has its own
       RunDistance gate too — it doesn't spawn below it, even pre-upgrade)
  - Standalone (header=0, no pair): include if tier >= threshold_rd
  Enemy list is reversed from storage order for display.

Usage:  python3 mt2_extract_waves.py [DATA_DIR] [--out OUTDIR] [--all]
  --all  include roguelike (Level*Battle*) encounters in addition to SS ones
"""
import sys, os, re, json, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mt2_lib import parse_assets, read_mname, find_data_dir, iter_characters, Localizer, EXCLUDED_INTERNALS

WAVE_GAP  = 100   # bytes; larger gap between PPtrs = new wave group boundary
NUM_TIERS = 4     # combat-order tiers (O1..O4)
RD_NAMES  = ['SoulSavior_RunDistance1', 'SoulSavior_RunDistance2',
              'SoulSavior_RunDistance3', 'SoulSavior_RunDistance4']


# ── enemy index ──────────────────────────────────────────────────────────────

def build_enemy_index(data, objs, le, data_dir):
    loc = Localizer(os.path.join(data_dir, "resources.assets"))
    pid_to_internal, pid_to_display, pid_is_boss = {}, {}, {}
    for ch in iter_characters(data, objs, le):
        if ch["internal"].startswith("DialogueCharacter"):
            continue
        if ch["internal"] in EXCLUDED_INTERNALS:
            continue
        pid = ch["pid"]
        pid_to_internal[pid] = ch["internal"]
        name = loc.resolve(ch["nameKey"]) if ch["nameKey"] else None
        pid_to_display[pid] = name or ch["internal"]
        pid_is_boss[pid] = "boss" in " ".join(ch["subtypes"]).lower()
    return pid_to_internal, pid_to_display, pid_is_boss


# ── RunDistance pathID discovery ──────────────────────────────────────────────

def find_rd_pid_map(data, objs, le):
    """Return {pathID: tier_index_1based} for SoulSavior_RunDistance1..4 objects."""
    rd_map = {}
    for (pid, off, size, cid, tid) in objs:
        if cid != 114:
            continue
        try:
            name, _ = read_mname(data, off, le)
        except Exception:
            continue
        for i, rdn in enumerate(RD_NAMES, start=1):
            if name == rdn:
                rd_map[pid] = i
    return rd_map


# ── scenario object finder ───────────────────────────────────────────────────

def find_scenario_objects(data, objs, le, ss_only=True):
    results = []
    for (pid, off, size, cid, tid) in objs:
        if cid != 114:
            continue
        try:
            name, _ = read_mname(data, off, le)
        except Exception:
            continue
        is_ss    = re.match(r"SoulSavior_R\d+_(Boss)?Battle_", name)
        is_level = re.match(r"(Level|TestEndless_Level)\d+Battle", name)
        if is_ss or (not ss_only and is_level):
            results.append((name, pid, off, size))
    results.sort(key=lambda x: x[0])
    return results


# ── hit scanning ─────────────────────────────────────────────────────────────

def scan_hits(chunk, valid_pids, rd_pid_map):
    """
    Scan for enemy PPtrs.  Each hit yields:
      (offset, pid, header, threshold_rd)
    where
      header       = int32 at offset-4  (0=base, 1=late-variant, N=wave count for 1st PPtr)
      threshold_rd = RD tier index from uint32 at offset+44 (0=always, 1=RD1+, …)
    """
    hits = []
    for i in range(4, len(chunk) - 11, 4):
        fid = struct.unpack_from('<i', chunk, i)[0]
        if fid != 0:
            continue
        pid = struct.unpack_from('<q', chunk, i + 4)[0]
        if pid not in valid_pids:
            continue
        header = struct.unpack_from('<i', chunk, i - 4)[0]
        if i + 48 <= len(chunk):
            thresh_raw = struct.unpack_from('<I', chunk, i + 44)[0]
            threshold_rd = rd_pid_map.get(thresh_raw, 0)
        else:
            threshold_rd = 0
        hits.append((i, pid, header, threshold_rd))
    return hits


def group_hits(hits):
    """Split hits into wave groups using WAVE_GAP threshold."""
    if not hits:
        return []
    groups, cur = [], [hits[0]]
    for k in range(1, len(hits)):
        if hits[k][0] - hits[k-1][0] > WAVE_GAP:
            groups.append(cur)
            cur = []
        cur.append(hits[k])
    groups.append(cur)
    return groups


# ── wave group analysis ───────────────────────────────────────────────────────

def wave_min_tier(chunk, wave_start, prev_end):
    """
    Find minimum tier index for a wave group by scanning its preceding gap for a
    "regions complete" condition string.  The number = how many regions must be
    cleared before this wave group appears, which equals its min tier index
    (1 -> O2+, 2 -> O3+).  Several phrasings occur in-game and all must match:
      - minor Battle scenarios:  "(Regions Complete N) ..."   (number AFTER)
      - BossBattle scenarios:    "N Region(s) Complete"        (number BEFORE)
      - some BossBattle (R2):    "Distance N"                  (= RunDistance N)
    The old regex matched only the first form, so other BossBattle waves
    defaulted to min_tier 0 and wrongly showed at O1 (e.g. Plaguebringer O1
    showed 6 waves instead of 4).  Returns 0 if no condition (always present).

    A fourth phrasing — an unnumbered "(Bonus)" label (R1/R3 bosses, some R1
    battles) — gates the wave too but carries no number.  Verified in-game +
    wiki (Maera & Tivi bosses have 4 waves at O1): the two "(Bonus)" groups sit
    in the same slots the numbered gates occupy and map to min_tier 1 then 2.
    We signal it with the sentinel 'bonus'; parse_scenario resolves it to a
    sequential tier (1st bonus -> 1, 2nd -> 2, …).
    """
    gap = chunk[prev_end:wave_start]
    m = (re.search(rb'Complete (\d+)', gap)
         or re.search(rb'(\d+) Regions? Complete', gap)
         or re.search(rb'Distance (\d+)', gap))
    if m:
        return int(m.group(1))
    return 'bonus' if b'(Bonus)' in gap else 0


def reconstruct_variants(wave_hits):
    """
    Build 4-tier enemy pid lists from a wave group's hits.
    Pair rule: a base hit at offset X has a late-variant partner if chunk[X+56-4] == 1
    and there is a hit at X+56 in the same group.
    Returns {tier_index: [pid, …]} in display order (reversed from storage).
    """
    offset_map = {h[0]: h for h in wave_hits}

    # late_threshold[base_offset] = threshold_rd of the late-variant partner
    late_threshold = {}
    for (offset, pid, header, threshold_rd) in wave_hits:
        if header == 1:
            base_off = offset - 56
            if base_off in offset_map:
                late_threshold[base_off] = threshold_rd

    result = {}
    for tier in range(NUM_TIERS):
        enemies = []
        for (offset, pid, header, threshold_rd) in wave_hits:
            if header == 1:
                # Late variant: include when tier reached the upgrade threshold
                if tier >= threshold_rd:
                    enemies.append(pid)
            elif offset in late_threshold:
                # Base of a pair: present from its OWN threshold up to (but not
                # including) the late-variant upgrade threshold.  The base carries
                # its own RunDistance gate at +44 just like a standalone — a unit
                # with own-threshold>0 doesn't spawn at the lower tiers, even
                # though its late variant hasn't taken over yet.
                if threshold_rd <= tier < late_threshold[offset]:
                    enemies.append(pid)
            else:
                # Standalone: include when tier meets its own threshold
                if tier >= threshold_rd:
                    enemies.append(pid)
        result[tier] = list(reversed(enemies))
    return result


# ── scenario parser ───────────────────────────────────────────────────────────

def parse_scenario(name, chunk, pid_to_internal, pid_to_display, pid_is_boss, rd_pid_map):
    valid_pids = set(pid_to_internal.keys())
    hits   = scan_hits(chunk, valid_pids, rd_pid_map)
    groups = group_hits(hits)
    is_boss_battle = bool(re.search(r"BossBattle", name))

    wave_groups = []
    prev_end = 0
    bonus_idx = 0   # nth "(Bonus)" group -> min_tier n (1st bonus = O2+, 2nd = O3+)

    for grp in groups:
        wave_start = grp[0][0]
        wave_end   = grp[-1][0] + 12   # fileID(4) + pathID(8)
        min_tier   = wave_min_tier(chunk, wave_start, prev_end)
        if min_tier == 'bonus':
            bonus_idx += 1
            min_tier = bonus_idx
        variants   = reconstruct_variants(grp)

        named = {}
        for tier, pids in variants.items():
            named[tier] = [
                {"internal": pid_to_internal[p],
                 "display":  pid_to_display[p],
                 "is_boss":  pid_is_boss.get(p, False)}
                for p in pids
            ]
        wave_groups.append({"min_tier": min_tier, "variants": named})
        prev_end = wave_end

    # Trim at the first wave group that contains ONLY the Collector enemy
    # (a post-combat encounter placeholder, not a combat wave).  Everything
    # from the Collector group onward is non-combat data.
    trimmed = []
    for grp in wave_groups:
        all_enemies = [e for v in grp["variants"].values() for e in v]
        if all_enemies and all(e["display"] == "Collector" for e in all_enemies):
            break
        trimmed.append(grp)
    wave_groups = trimmed

    # Per-tier wave sequences: include groups whose min_tier ≤ current tier
    # and whose enemy list for that tier is non-empty.
    tiers = {}
    for tier in range(NUM_TIERS):
        tiers[tier] = [
            grp["variants"][tier]
            for grp in wave_groups
            if tier >= grp["min_tier"] and grp["variants"][tier]
        ]

    # The encounter's "designated boss" is stored as a consecutive duplicate PPtr
    # pair (two identical copies, 12 bytes apart) at the tail of the final wave
    # group.  That pointer is a real combatant ONLY in BossBattle scenarios:
    #   - BossBattle: the doubled boss IS the fight (region boss) → collapse to one.
    #   - minor Battle: the doubled boss is the run's order-1 boss (Maera) stored
    #     as metadata; it does NOT spawn here → drop it.  The real combatant is the
    #     single-copy minor boss earlier in the wave (Korin/Elebor/Phalanx/Qel/…).
    # Single-copy bosses (e.g. Astrael in R0_Battle) are genuine and always kept.
    for tier in tiers:
        if not tiers[tier]:
            continue
        last_wave = tiers[tier][-1]
        boss_counts = {}
        for e in last_wave:
            if e["is_boss"]:
                boss_counts[e["internal"]] = boss_counts.get(e["internal"], 0) + 1
        seen_bosses = set()
        deduped = []
        for e in last_wave:
            if e["is_boss"]:
                # Duplicated boss = designated-boss pointer (metadata in minor Battles).
                if boss_counts[e["internal"]] >= 2 and not is_boss_battle:
                    continue
                if e["internal"] in seen_bosses:
                    continue
                seen_bosses.add(e["internal"])
            deduped.append(e)

        # Boss placement. Trash is storage-reversed (stored back→front), and a
        # *minor* boss (Battle scenario) is a real combatant stored in its true
        # position, so the reversal already places it correctly — e.g. Elebor at
        # the FRONT of its wave (confirmed in-game). A *region* boss (BossBattle)
        # is instead the doubled designated-boss pointer appended as metadata at
        # the tail; reversal floats it to the front, but it actually fights at
        # the BACK (Maera et al., confirmed) — so move it to the end. Only
        # reorder for BossBattle; leave minor Battle as the natural reversal.
        if is_boss_battle:
            deduped = [e for e in deduped if not e["is_boss"]] + \
                      [e for e in deduped if e["is_boss"]]
        tiers[tier][-1] = deduped

    # Astrael can only be O1; Lifemother can only be O4.
    # Match on internal AND display: Astrael's internal name is
    # Boss_SoulSavior_R0_TrainBoss_Defensive (no "Astrael" token), so the
    # name only appears in the display string.
    def _has(token, e):
        return token in e["internal"] or token in e["display"]
    all_enemies = [e for t in tiers.values() for wave in t for e in wave]
    if any(_has("Astrael", e) for e in all_enemies):
        tiers = {t: w for t, w in tiers.items() if t == 0}
    elif any(_has("Lifemother", e) for e in all_enemies):
        tiers = {t: w for t, w in tiers.items() if t == 3}

    return {
        "name":         name,
        "is_boss":      is_boss_battle,
        "wave_groups":  wave_groups,
        "tiers":        tiers,
    }


# ── markdown output ───────────────────────────────────────────────────────────

def format_enemy(e):
    return e["display"] + (" [B]" if e["is_boss"] else "")


def write_waves_md(results, out_path):
    lines = ["# Soul Savior — Enemy Waves\n",
             "_Generated from binary extraction. O1=first order … O4=fourth order._\n",
             "_[B] marks the boss-type character (one per scenario's final wave)._\n"]

    for name, sc in sorted(results.items()):
        lines.append(f"\n## {name}\n")
        tiers = sc["tiers"]
        for tier in sorted(tiers.keys()):
            waves = tiers[tier]
            lines.append(f"\n**O{tier+1} — {len(waves)} waves**\n")
            lines.append("| Wave | Enemies |")
            lines.append("|------|---------|")
            for wi, wave in enumerate(waves, start=1):
                enemies_str = ", ".join(format_enemy(e) for e in wave)
                lines.append(f"| {wi} | {enemies_str} |")

    with open(out_path, "w") as f:
        f.write("\n".join(lines) + "\n")


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    argv = sys.argv[1:]
    outdir = argv[argv.index("--out") + 1] if "--out" in argv else "."
    skip = set()
    for flag in ("--out",):
        if flag in argv:
            idx = argv.index(flag); skip.add(idx); skip.add(idx + 1)
    pos_args = [a for i, a in enumerate(argv) if i not in skip and not a.startswith("--")]
    data_dir = pos_args[0] if pos_args else find_data_dir('.')
    ss_only  = "--all" not in argv

    sa0 = os.path.join(data_dir, "sharedassets0.assets")
    data, objs, le = parse_assets(sa0)

    print("Building enemy index…")
    pid_to_internal, pid_to_display, pid_is_boss = build_enemy_index(data, objs, le, data_dir)
    print(f"  {len(pid_to_internal)} CharacterData objects indexed")

    print("Finding RunDistance pathIDs…")
    rd_pid_map = find_rd_pid_map(data, objs, le)
    if rd_pid_map:
        for pid, lv in sorted(rd_pid_map.items(), key=lambda x: x[1]):
            print(f"  RD{lv}: pathID={pid}")
    else:
        print("  WARNING: no RunDistance objects found — all enemies will appear at all tiers")

    print("Finding scenario objects…")
    scenarios = find_scenario_objects(data, objs, le, ss_only=ss_only)
    mode = "Soul Savior only" if ss_only else "all modes"
    print(f"  {len(scenarios)} objects ({mode})")

    results = {}
    for (name, pid, off, size) in scenarios:
        chunk  = data[off:off + size]
        parsed = parse_scenario(name, chunk, pid_to_internal, pid_to_display, pid_is_boss, rd_pid_map)
        results[name] = parsed

        label = "BOSS-BATTLE" if parsed["is_boss"] else "battle     "
        print(f"\n  {label}  {name}")
        for tier in sorted(parsed["tiers"].keys()):
            waves = parsed["tiers"][tier]
            print(f"    O{tier+1} ({len(waves)} waves):", end="")
            for wi, wave in enumerate(waves):
                names = [format_enemy(e) for e in wave]
                print(f"\n      W{wi+1}: {names}", end="")
            print()

    os.makedirs(outdir, exist_ok=True)

    json_path = os.path.join(outdir, "waves.json")
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nWrote {json_path}  ({len(results)} scenarios)")

    md_path = os.path.join(outdir, "waves.md")
    write_waves_md(results, md_path)
    print(f"Wrote {md_path}")


if __name__ == "__main__":
    main()
