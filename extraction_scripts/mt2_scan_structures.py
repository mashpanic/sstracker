#!/usr/bin/env python3
"""
mt2_scan_structures.py — find data structures that might contain per-enemy static stat tables.

Hypothesis: enemy O2-O4 stats may be stored in a lookup table (ScriptableObject or
TextAsset) rather than computed from mutator percentages at runtime.

What this script does:
  1. Lists all .assets files in the Data dir (we may have been missing files).
  2. Scans every MonoBehaviour (class 114) in sharedassets0.assets and prints all
     names that are NOT CharacterData — looking for scaling/override/table objects.
  3. Scans TextAssets (class 49) for any that contain enemy name strings, which
     would indicate embedded JSON/CSV stat tables.
  4. For each enemy pathID (from CharacterData), scans all OTHER MonoBehaviours
     for binary references to that pathID (PPtr cross-references), which would
     reveal structures that explicitly enumerate enemy entries.

Usage:
  python3 mt2_scan_structures.py [DATA_DIR] [--out OUTDIR]
"""
import sys, os, re, json, struct
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mt2_lib import parse_assets, read_mname, find_data_dir, iter_characters, Reader, EXCLUDED_INTERNALS

INTERESTING_PATTERNS = re.compile(
    r'(scal|table|override|stat|buff|tier|order|region|overgrowth|difficulty|run|distance|wave|encounter|balance|curve|growth)',
    re.IGNORECASE
)

def scan_assets_file(path, label):
    print(f"\n{'='*60}")
    print(f"Scanning: {label}  ({path})")
    data, objs, le = parse_assets(path)
    print(f"  Objects: {len(objs)} total")

    # Count by class
    from collections import Counter
    class_counts = Counter(cid for _,_,_,cid,_ in objs)
    print(f"  Class breakdown (top 10): {class_counts.most_common(10)}")
    return data, objs, le

def list_all_monobehaviour_names(data, objs, le, label):
    print(f"\n--- All MonoBehaviour names in {label} ---")
    names = []
    for (pid, off, size, cid, tid) in objs:
        if cid != 114: continue
        try:
            name, _ = read_mname(data, off, le)
            names.append((name, pid, size))
        except:
            pass
    names.sort()
    print(f"  Total MonoBehaviours: {len(names)}")

    # Group: CharacterData vs everything else
    char_data = [(n,p,s) for n,p,s in names if n.startswith(('Boss_','SoulSavior_','Enemy_','DialogueCharacter','EnchanterT1') or not n)]
    other = [(n,p,s) for n,p,s in names if not n.startswith(('Boss_','SoulSavior_','Enemy_','DialogueCharacter','EnchanterT1'))]

    print(f"\n  Non-character MonoBehaviours ({len(other)} objects):")
    for name, pid, size in other:
        marker = ' <-- INTERESTING' if INTERESTING_PATTERNS.search(name) else ''
        print(f"    [{pid:>12}] {size:>8} bytes  {name}{marker}")
    return names

def scan_text_assets(data, objs, le, enemy_names, label):
    print(f"\n--- TextAssets (class 49) in {label} ---")
    count = 0
    for (pid, off, size, cid, tid) in objs:
        if cid != 49: continue
        count += 1
        chunk = data[off:off+size]
        # TextAsset: i32 name_len + name + align + i32 script_len + script bytes
        try:
            r = Reader(chunk, le)
            nlen = r.i32()
            tname = chunk[r.o:r.o+nlen].decode('utf8','replace')
            r.o += nlen; r.align(4)
            slen = r.i32()
            content = chunk[r.o:r.o+min(slen, 4000)]
            # Check if it looks like text and references enemies
            try:
                text = content.decode('utf8', 'replace')
                hits = [en for en in enemy_names if en in text]
                if hits or INTERESTING_PATTERNS.search(tname):
                    print(f"  [{pid}] '{tname}' ({size} bytes) — enemy refs: {hits[:5]}")
                    if hits:
                        # Print first 300 chars of content
                        print(f"    Preview: {text[:300]!r}")
            except:
                pass
        except:
            pass
    if count == 0:
        print("  (none found)")
    print(f"  Total TextAssets: {count}")

def scan_pptr_references(data, objs, le, enemy_pids, enemy_names_by_pid, label):
    """Find MonoBehaviours that contain PPtr references to enemy CharacterData pathIDs."""
    print(f"\n--- PPtr cross-references to enemy CharacterData objects in {label} ---")
    # PPtr<T> is stored as (fileID: i32, pathID: i64) = 12 bytes in Unity 2022+
    # We pack each enemy pathID as little-endian i64 and search for it in non-character MonoBehaviours
    pid_bytes = {pid: struct.pack('<q', pid) for pid in enemy_pids}

    results = []
    for (pid, off, size, cid, tid) in objs:
        if cid != 114: continue
        try:
            name, _ = read_mname(data, off, le)
        except:
            name = '?'
        # Skip the CharacterData objects themselves
        if name in {n for n in enemy_names_by_pid.values()}:
            continue
        # Also skip the obvious character-named ones
        if name.startswith(('Boss_','SoulSavior_','Enemy_','DialogueCharacter')):
            continue
        chunk = data[off:off+size]
        found_enemies = []
        for epid, ebytes in pid_bytes.items():
            if ebytes in chunk:
                found_enemies.append(f"{enemy_names_by_pid.get(epid,'?')} (pid={epid})")
        if found_enemies:
            results.append((name, pid, size, found_enemies))

    if results:
        for name, pid, size, enemies in results:
            print(f"  [{pid}] '{name}' ({size} bytes) references enemies:")
            for e in enemies[:10]:
                print(f"    - {e}")
            if len(enemies) > 10:
                print(f"    ... and {len(enemies)-10} more")
    else:
        print("  (no non-character MonoBehaviours found that reference enemy pathIDs)")
    return results

def dump_interesting_object(data, objs, le, target_name):
    """Print the raw int fields of a named object for manual inspection."""
    for (pid, off, size, cid, tid) in objs:
        if cid != 114: continue
        try:
            name, _ = read_mname(data, off, le)
        except:
            continue
        if name == target_name:
            chunk = data[off:off+size]
            print(f"\n--- Raw ints in '{target_name}' (pid={pid}, {size} bytes) ---")
            # Print all strings found
            strs = [m.group().decode() for m in re.finditer(rb'[\x20-\x7e]{4,}', chunk)]
            print(f"  Strings: {strs[:40]}")
            # Print as int32 array
            n = size // 4
            ints = [struct.unpack_from('<i', chunk, i*4)[0] for i in range(min(n, 200))]
            print(f"  Int32s (first {min(n,200)}): {ints}")

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    outdir = sys.argv[sys.argv.index('--out')+1] if '--out' in sys.argv else None
    data_dir = args[0] if args else find_data_dir('.')

    print(f"Data dir: {data_dir}")

    # 1. List all .assets files
    print("\n--- Asset files in Data dir ---")
    all_files = sorted(os.listdir(data_dir))
    assets_files = [f for f in all_files if f.endswith('.assets')]
    bundle_files = [f for f in all_files if f.endswith('.bundle') or f.endswith('.unity3d')]
    print(f"  .assets files ({len(assets_files)}): {assets_files}")
    print(f"  .bundle files ({len(bundle_files)}): {bundle_files[:20]}")

    # 2. Scan sharedassets0.assets (primary)
    sa0_path = os.path.join(data_dir, 'sharedassets0.assets')
    data, objs, le = scan_assets_file(sa0_path, 'sharedassets0.assets')

    # 3. Build enemy set from CharacterData
    print("\n--- Extracting known enemy CharacterData objects ---")
    enemy_pids = set()
    enemy_names_by_pid = {}
    enemy_internals = set()
    for ch in iter_characters(data, objs, le):
        if ch['internal'].startswith('DialogueCharacter'): continue
        if ch['internal'] in EXCLUDED_INTERNALS: continue
        subs_lower = ' '.join(ch['subtypes']).lower()
        is_boss = 'boss' in subs_lower
        # Focus on non-boss enemies (the ones with the formula problem)
        if not is_boss:
            enemy_pids.add(ch['pid'])
            enemy_names_by_pid[ch['pid']] = ch['internal']
            enemy_internals.add(ch['internal'])
    print(f"  Found {len(enemy_pids)} non-boss enemy CharacterData objects")

    # 4. List all MonoBehaviour names
    all_names = list_all_monobehaviour_names(data, objs, le, 'sharedassets0.assets')

    # 5. Scan TextAssets for enemy references
    scan_text_assets(data, objs, le, enemy_internals, 'sharedassets0.assets')

    # 6. Find PPtr cross-references
    refs = scan_pptr_references(data, objs, le, enemy_pids, enemy_names_by_pid, 'sharedassets0.assets')

    # 7. Scan additional assets files if present (sharedassets1+, level*)
    for fname in assets_files:
        if fname == 'sharedassets0.assets': continue
        if fname.startswith(('sharedassets', 'level')):
            fpath = os.path.join(data_dir, fname)
            try:
                d2, o2, le2 = scan_assets_file(fpath, fname)
                list_all_monobehaviour_names(d2, o2, le2, fname)
                scan_text_assets(d2, o2, le2, enemy_internals, fname)
            except Exception as ex:
                print(f"  Error scanning {fname}: {ex}")

    print("\n--- Done ---")
    if not refs:
        print("No PPtr cross-references found. The static table (if it exists) may be:")
        print("  a) In a .bundle file (not a raw .assets file)")
        print("  b) Stored as a TextAsset (JSON/CSV) rather than a structured object")
        print("  c) Indexed by internal name string rather than pathID PPtr")
        print("  d) Not present — the formula may be the actual mechanism")

if __name__ == '__main__': main()
