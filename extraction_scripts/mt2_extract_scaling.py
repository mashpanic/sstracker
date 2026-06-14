#!/usr/bin/env python3
"""
mt2_extract_scaling.py — dump the difficulty + region (distance) scaling tables.

Reads the MutatorData objects (SoulSavior_DifficultyTier2/3, SoulSavior_RunDistance1/2/3)
and prints the per-subtype % buffs. Writes scaling.json.

Set A (excludes Support) is treated as HEALTH; Set B (includes Support) as ATTACK.
This A->Health / B->Attack labeling is an inference — re-confirm after a patch by
reconciling a known in-game boss (see playbook).

Usage:  python3 mt2_extract_scaling.py [DATA_DIR] [--out OUTDIR]
"""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mt2_lib import parse_assets, read_mname, find_data_dir, Reader

EFF=b'RelicEffectModifyCharacterAttackOrHealthPercentage'
SUB=b'SubtypesData_'

def dump_mutator(data, off, size, le):
    chunk=data[off:off+size]
    entries=[]
    for m in re.finditer(re.escape(EFF), chunk):
        p=(m.start()+len(EFF)+3)&~3
        q=p; pct=None; sub='?'; fields=[]
        for _ in range(24):
            ln=int.from_bytes(chunk[q:q+4],'little')
            if 0<ln<80 and chunk[q+4:q+4+13]==SUB:
                sub=chunk[q+4:q+4+ln].decode(); break
            fields.append(int.from_bytes(chunk[q:q+4],'little',signed=True)); q+=4
        pct=fields[1] if len(fields)>1 else None
        sub=sub.replace('SubtypesData_SoulSavior_','').replace('SubtypesData_','').replace('_Enemy','')
        entries.append((sub, pct))
    # The 11 effects come in two positional groups (Set A then Set B).
    # Boundary = where a subtype repeats (Set B restarts the subtype list).
    setA={}; setB={}; cur=setA
    for sub,pct in entries:
        if cur is setA and sub in setA:   # subtype repeats -> we've crossed into Set B
            cur=setB
        cur[sub]=pct
    return entries, setA, setB

def main():
    args=[a for a in sys.argv[1:] if not a.startswith('--')]
    outdir='.'
    if '--out' in sys.argv: outdir=sys.argv[sys.argv.index('--out')+1]
    data_dir = args[0] if args else find_data_dir('.')
    sa0=os.path.join(data_dir,'sharedassets0.assets')
    data, objs, le = parse_assets(sa0)
    targets={}
    for (pid,off,size,cid,tid) in objs:
        if cid!=114: continue
        try: iname,_=read_mname(data,off,le)
        except: continue
        if re.match(r'SoulSavior_(DifficultyTier[23]|RunDistance[123])$', iname):
            targets[iname]=(off,size)
    result={}
    order=['SoulSavior_DifficultyTier2','SoulSavior_DifficultyTier3',
           'SoulSavior_RunDistance1','SoulSavior_RunDistance2','SoulSavior_RunDistance3']
    label={'SoulSavior_DifficultyTier2':'Tangle (difficulty)','SoulSavior_DifficultyTier3':'Overgrowth (difficulty)',
           'SoulSavior_RunDistance1':'RunDistance1 (O2)','SoulSavior_RunDistance2':'RunDistance2 (O3)',
           'SoulSavior_RunDistance3':'RunDistance3 (O4)'}
    for nm in order:
        if nm not in targets:
            print(f"!! {nm} NOT FOUND (new patch may have renamed it)"); continue
        off,size=targets[nm]
        entries,setA,setB=dump_mutator(data,off,size,le)
        result[nm]=dict(setA_health=setA, setB_attack=setB)
        print(f"\n== {label[nm]}  ({nm}) ==")
        print(f"   Set A / HEALTH (no Support): {setA}")
        print(f"   Set B / ATTACK (with Support): {setB}")
    os.makedirs(outdir, exist_ok=True)
    with open(os.path.join(outdir,'scaling.json'),'w') as f: json.dump(result,f,indent=1)
    print(f"\nwrote {os.path.join(outdir,'scaling.json')}")
    print("Bloom (DifficultyTier1) has no object = baseline / no change.")

if __name__=='__main__': main()
