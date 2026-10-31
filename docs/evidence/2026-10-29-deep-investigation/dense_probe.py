import cProfile,hashlib,importlib,json,os,pstats,sys,time,warnings
from pathlib import Path
r=Path.cwd();out=r/'reports/deep-investigation-2026-10-29';sys.path.insert(0,str(out));os.environ['CHAMELEON_UPSTREAM']=str(r/'.cache/chameleon')
t=json.loads((r/'reports/quality-speed-profile-20261029/inputs/dense100/task.json').read_text());rows=[]
for name in ['candidate','floor_stop']:
    m=importlib.import_module(name+'.resize');profile=cProfile.Profile()
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter('always');start=time.perf_counter();profile.enable();v=m.resize(t['source'],t['target_canvas']);profile.disable();elapsed=time.perf_counter()-start
    profile.dump_stats(str(out/(name+'-dense100.prof')))
    stats=pstats.Stats(profile);top=[]
    for (file,line,fn),(cc,nc,tt,ct,_) in sorted(stats.stats.items(),key=lambda x:-x[1][3])[:20]:top.append({'file':Path(file).name,'line':line,'function':fn,'calls':nc,'self_s':tt,'cumulative_s':ct})
    row={'variant':name,'instrumented_s':elapsed,'output_hash':hashlib.sha256(json.dumps(v,sort_keys=True).encode()).hexdigest(),'warnings':[str(x.message) for x in w],'top':top};rows.append(row);print(name,elapsed,flush=True)
    (out/'dense100-profile.json').write_text(json.dumps(rows,indent=2))
