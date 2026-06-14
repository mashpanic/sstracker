"""
mt2_lib.py — shared helpers for extracting Monster Train 2 data from the
Unity .assets files (no type trees; pure-Python SerializedFile reader).

Tested against Unity 2022.3 Mono builds. See the Extraction Playbook for context.
Re-verify HP/ATK stat-block indices after any game patch.
"""
import os, re, struct

# ----- byte reader -----
class Reader:
    def __init__(self, d, le=True): self.d=d; self.o=0; self.le=le
    def seek(self,o): self.o=o
    def read(self,n): b=self.d[self.o:self.o+n]; self.o+=n; return b
    def align(self,a=4):
        r=self.o%a
        if r: self.o+=(a-r)
    def _u(self,n,s=False): return int.from_bytes(self.read(n),'little' if self.le else 'big',signed=s)
    def u8(self): return self._u(1)
    def i16(self): return self._u(2,True)
    def i32(self): return self._u(4,True)
    def u32(self): return self._u(4)
    def i64(self): return self._u(8,True)
    def cstr(self):
        s=self.o
        while self.d[self.o]!=0: self.o+=1
        b=self.d[s:self.o]; self.o+=1; return b.decode('utf8','replace')

# ----- SerializedFile parser (v22, no type trees) -----
def parse_assets(path):
    """Return (data_bytes, objects, little_endian).
    objects = list of (pathID, absOffset, byteSize, classID, typeIndex)."""
    data=open(path,'rb').read()
    hr=Reader(data,le=False)
    hr.read(8); version=hr.u32(); hr.u32(); endian=hr.u8(); hr.read(3)
    hr.u32(); hr._u(8); dataOffset=hr._u(8); hr._u(8)
    le=(endian==0); r=Reader(data,le=le); r.seek(hr.o)
    r.cstr(); r.i32(); ett=r.u8()
    if ett:
        raise RuntimeError("This file HAS type trees; the by-position reader assumes none. Re-check the build.")
    typeCount=r.i32(); types=[]
    for _ in range(typeCount):
        classID=r.i32(); r.u8(); r.i16()
        if classID==114: r.read(16)
        r.read(16)
        types.append(classID)
    objCount=r.i32(); objs=[]
    for _ in range(objCount):
        r.align(4); pathID=r.i64()
        byteStart=r.i64() if version>=22 else r.u32()
        byteSize=r.u32(); typeID=r.i32()
        objs.append((pathID, dataOffset+byteStart, byteSize, types[typeID], typeID))
    return data, objs, le

# ----- localization resolver (against resources.assets bytes) -----
class Localizer:
    def __init__(self, resources_path):
        self.res=open(resources_path,'rb').read(); self.cache={}
    def resolve(self, key):
        if key in self.cache: return self.cache[key]
        kb=key.encode(); i=self.res.find(kb); v=None
        if i>=0:
            end=(i+len(kb)+3)&~3
            for probe in range(end, end+8, 4):
                ln=int.from_bytes(self.res[probe:probe+4],'little',signed=True)
                if 0<ln<4000 and all(0x20<=c<0x7f or c in (9,10,13) for c in self.res[probe+4:probe+4+ln]):
                    v=self.res[probe+4:probe+4+ln].decode('utf8','replace'); break
        self.cache[key]=v; return v

# ----- CharacterData helpers -----
STAT_HP_INDEX = 3      # re-verify after patch
STAT_ATK_INDEX = 13    # re-verify after patch

# Characters confirmed unimplemented in the shipped game — excluded from all outputs.
EXCLUDED_INTERNALS = {
    'Boss_SoulSavior_R1_TrainBoss_Athane_V2',
}

def read_mname(data, off, le):
    r=Reader(data,le=le); r.seek(off)
    r.i32(); r.i64(); r.u8(); r.align(4); r.i32(); r.i64()
    nln=r.i32()
    return data[r.o:r.o+nln].decode('utf8','replace'), nln

def iter_characters(data, objs, le):
    """Yield dicts for every CharacterData MonoBehaviour (class 114 with nameKey+prefab)."""
    for (pid, off, size, cid, tid) in objs:
        if cid!=114: continue
        chunk=data[off:off+size]
        if b'CharacterData_nameKey' not in chunk or b'.prefab' not in chunk: continue
        iname,_=read_mname(data, off, le)
        strs=[m.group().decode() for m in re.finditer(rb'[\x20-\x7e]{4,}', chunk)]
        # stat block after prefab path + 32-hex asset GUID
        hp=atk=None; statblock=[]
        pi=chunk.find(b'.prefab'); g=re.search(rb'[0-9a-f]{32}', chunk[pi:]) if pi>=0 else None
        if g:
            base=pi+g.start()+32; base=(base+3)&~3
            statblock=[int.from_bytes(chunk[base+4*k:base+4*k+4],'little',signed=True) for k in range(16)]
            if len(statblock)>STAT_HP_INDEX: hp=statblock[STAT_HP_INDEX]
            if len(statblock)>STAT_ATK_INDEX: atk=statblock[STAT_ATK_INDEX]
        subs=[s.replace('SubtypesData_','') for s in strs if s.startswith('SubtypesData_') and s!='SubtypesData_None']
        subs=[re.sub(r'_[0-9a-f]{6,}.*$','',s) for s in subs]
        nameKey=next((s for s in strs if s.startswith('CharacterData_nameKey')), None)
        pm=re.search(r'Character_Prefabs/([A-Za-z0-9_]+)/', '\n'.join(strs))
        yield dict(internal=iname, pid=pid, hp=hp, atk=atk, statblock=statblock,
                   subtypes=subs, nameKey=nameKey, set=(pm.group(1) if pm else ''),
                   strings=strs)

def find_data_dir(start='.'):
    """Locate the .../Contents/Resources/Data folder containing sharedassets0.assets."""
    for root,_,files in os.walk(start):
        if 'sharedassets0.assets' in files and 'resources.assets' in files:
            return root
    raise FileNotFoundError("Could not find sharedassets0.assets under "+os.path.abspath(start))
