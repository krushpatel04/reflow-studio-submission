import copy, hashlib, importlib, json, os, platform, statistics, subprocess, sys, time, warnings
from pathlib import Path
ROOT=Path.cwd(); OUT=Path(os.environ.get('REFLOW_INVESTIGATION_OUT',str(ROOT/'reports/deep-investigation-2026-10-29'))); OUT.mkdir(parents=True,exist_ok=True); UP=ROOT/'.cache/chameleon'
os.environ['CHAMELEON_UPSTREAM']=str(UP)
sys.path.insert(0,str(OUT)); sys.path.insert(0,str(UP))
def digest(x): return hashlib.sha256(json.dumps(x,sort_keys=True).encode()).hexdigest()
def task(name): return json.loads((ROOT/'reports/quality-speed-profile-20261029/inputs'/name/'task.json').read_text())
mods={}; manifests={}
for name in ['committed','candidate','floor_stop']:
    p=OUT/name;p.mkdir(exist_ok=True);manifests[name]={}
    for src in sorted((ROOT/'engine').glob('*.py')):
        data=subprocess.check_output(['git','show','2fd7a89afbde50ae2e2ae886861adb2b7d4cbf1a:engine/'+src.name]) if name=='committed' else src.read_bytes()
        if name=='floor_stop' and src.name=='text_fit.py':
            old='''        for step in range(MAX_STEPS + 1):
            sizes = [max(FLOOR_PX, b * STEP ** step) for b in base]
            dims, geo = [], []'''
            new='''        previous_sizes = None
        for step in range(MAX_STEPS + 1):
            sizes = [max(FLOOR_PX, b * STEP ** step) for b in base]
            if sizes == previous_sizes:
                break
            previous_sizes = sizes
            dims, geo = [], []'''
            text=data.decode();assert text.count(old)==1;data=text.replace(old,new).encode()
        (p/src.name).write_bytes(data);manifests[name][src.name]=hashlib.sha256(data).hexdigest()
    mods[name]=importlib.import_module(name+'.resize')
result={'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'platform':platform.platform(),'python':sys.version,'modules':manifests,'scope':'Local native Python resize only; per-call Pillow cache cleared, Python/native libraries warmed. No Docker/startup/render included. Floor-stop is an isolated diagnostic prototype, not production.','timings':{},'quality':[]}
(OUT/'source-manifest.json').write_text(json.dumps(result,indent=2))
# Import/native-library warm-up is outside timings. Inputs and outputs remain immutable.
for m in mods.values():
    t=task('public-level1');m.resize(t['source'],t['target_canvas'])
for case in ['dense16','public-level3','infeasible']:
    t=task(case);initial=digest(t);rows={k:[] for k in mods};hashes={k:set() for k in mods};warn={k:set() for k in mods}
    for trial in range(5):
        for name in (list(mods) if trial%2==0 else list(mods)[::-1]):
            m=mods[name];m.text_fit._font.cache_clear()
            with warnings.catch_warnings(record=True) as w:
                warnings.simplefilter('always');start=time.perf_counter();r=m.resize(t['source'],t['target_canvas']);elapsed=time.perf_counter()-start
            rows[name].append(elapsed);hashes[name].add(digest(r));warn[name].update(str(v.message) for v in w)
    assert digest(t)==initial
    result['timings'][case]={'input_sha256':initial,'seconds':rows,'median_s':{k:statistics.median(v) for k,v in rows.items()},'output_hashes':{k:sorted(v) for k,v in hashes.items()},'warnings':{k:sorted(v) for k,v in warn.items()}}
    print(case, result['timings'][case]['median_s'],flush=True)
    (OUT/'results.json').write_text(json.dumps(result,indent=2))
# Quality boundary probes: one benign source variation at a time, with identical target.
base=task('public-level3')
variants={'public-l3':base}
v=copy.deepcopy(base);v['source']['elements'].append({'id':'decor-dot','type':'shape','x':20,'y':20,'width':5,'height':5,'shape_type':'ellipse','fill_color':'rgba(255,255,255,0.1)','z_index':1});variants['l3-small-decor']=v
v=copy.deepcopy(base)
for e in v['source']['elements']:
    if e['id']=='legal_text':e['group_id']='legal-copy'
variants['l3-singleton-group']=v
for w,h in [(300,250),(970,250),(1080,1920)]:
    v=copy.deepcopy(base);v['target_canvas']={'width':w,'height':h};variants[f'l3-{w}x{h}']=v
m=mods['candidate']
for name,t in variants.items():
    source_before=copy.deepcopy(t['source'])
    selected=[];cm=importlib.import_module('candidate.composition'); originals={n:getattr(cm,n) for n in ['_campaign','_artwork','_article']}
    for n,fn in originals.items():
        def tracked(*args,_n=n,_fn=fn,**kwargs):
            r=_fn(*args,**kwargs);selected.append([_n,bool(r)]);return r
        setattr(cm,n,tracked)
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter('always');start=time.perf_counter();r=m.resize(t['source'],t['target_canvas']);elapsed=time.perf_counter()-start
    for n,fn in originals.items():setattr(cm,n,fn)
    (OUT/(name+'-input.json')).write_text(json.dumps(t,indent=2));(OUT/(name+'-output.json')).write_text(json.dumps(r,indent=2))
    texts={e['id']:e['font_size'] for e in r['elements'] if e['type']=='text'}
    row={'name':name,'target':t['target_canvas'],'seconds':elapsed,'strategies':selected,'font_sizes':texts,'below6':sum(f<6 for f in texts.values()),'warnings':[str(x.message) for x in w],'source_unchanged':t['source']==source_before}
    result['quality'].append(row);print(name,selected,texts,flush=True)
(OUT/'results.json').write_text(json.dumps(result,indent=2))
