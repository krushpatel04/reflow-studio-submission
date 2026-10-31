"""Paired, sequential layout timings and complete-output preservation.

CHAMELEON_UPSTREAM=/pinned/starter python docs/evidence/2026-10-29-finalist-pass/compare.py
Uses a frozen baseline module in reports; no production source edits. No rendering
in timed sections. Records process CPU separately from noisy wall-clock timings.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import statistics
import subprocess
import sys
import time
import warnings

ROOT = Path(__file__).resolve().parents[3]
BASELINE = '3d10c00bb6868c22937c507c910df9defbb09115'


def worker(engine_root, output):
    sys.path.insert(0, str(engine_root))
    from engine.resize import resize
    from engine import text_fit as tf
    from unittest.mock import patch
    import builtins
    upstream = Path(os.environ['CHAMELEON_UPSTREAM'])
    tasks = []
    for path in sorted((upstream/'input').glob('*.json')):
        task = json.loads(path.read_text())
        tasks.append((path.stem, task['source'], task['target_canvas']))
        if 'level3' in path.name:
            for w,h in [(300,250),(301,251),(320,250),(250,300),(600,500),(20,20),(1080,1350)]:
                tasks.append((f'campaign-{w}x{h}',task['source'],dict(width=w,height=h)))
    rows=[]
    for name,source,target in tasks:
        timings=[]; hashes=set(); warning_sets=[]
        for i in range(7):
            with warnings.catch_warnings(record=True) as caught:
                wall=time.perf_counter(); cpu=time.process_time()
                out=resize(source,target)
                cpu=(time.process_time()-cpu)*1000; wall=(time.perf_counter()-wall)*1000
            hashes.add(hashlib.sha256(json.dumps(out,sort_keys=True).encode()).hexdigest())
            warning_sets.append([str(w.message) for w in caught])
            if i: timings.append(dict(wallMs=wall,cpuMs=cpu))
        assert len(hashes)==1, (name,'nondeterministic output')
        assert all(w==warning_sets[0] for w in warning_sets), (name,'changed warnings')
        reads=[]; native=[]; original=builtins.open
        def opened(path,*args,**kwargs):
            if str(path).endswith('.ttf'): reads.append(str(path))
            return original(path,*args,**kwargs)
        # MakeFromData has exactly one call per native glyph query in both versions.
        import skia
        make=skia.Typeface.MakeFromData
        def decode(*args,**kwargs):
            native.append(1); return make(*args,**kwargs)
        with warnings.catch_warnings(), patch('builtins.open',side_effect=opened), patch.object(skia.Typeface,'MakeFromData',side_effect=decode):
            warnings.simplefilter('ignore'); resize(source,target)
        rows.append(dict(name=name,timings=timings,outputSha256=next(iter(hashes)),warnings=warning_sets[0],
                         pythonFontReads=len(reads),nativeGlyphQueries=len(native)))
    output.write_text(json.dumps(rows,indent=2)+'\n')


def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--out',type=Path,default=ROOT/'reports/finalist-pass/paired')
    ap.add_argument('--worker',type=Path); ap.add_argument('--result',type=Path)
    args=ap.parse_args()
    if args.worker: return worker(args.worker.resolve(),args.result)
    args.out.mkdir(parents=True,exist_ok=True); baseline=args.out/'baseline'; (baseline/'engine').mkdir(parents=True,exist_ok=True)
    for name in ['__init__.py','resize.py','text_fit.py','composition.py']:
        data=subprocess.check_output(['git','show',f'{BASELINE}:engine/{name}'],cwd=ROOT)
        (baseline/'engine'/name).write_bytes(data)
    trials=[]
    for pair in range(3):
        for label,root in ([('before',baseline),('after',ROOT)] if pair%2==0 else [('after',ROOT),('before',baseline)]):
            path=args.out/f'{label}-{pair}.json'
            subprocess.run([sys.executable,__file__,'--worker',str(root),'--result',str(path)],cwd=ROOT,check=True)
            trials.append(dict(pair=pair,label=label,rows=json.loads(path.read_text())))
    summary=[]
    for index,row in enumerate(trials[0]['rows']):
        same=[t['rows'][index] for t in trials]
        assert len({r['outputSha256'] for r in same})==1,row['name']
        assert all(r['warnings']==same[0]['warnings'] for r in same),row['name']
        result=dict(name=row['name'],outputSha256=row['outputSha256'],warnings=row['warnings'])
        for label in ['before','after']:
            rows=[t['rows'][index] for t in trials if t['label']==label]
            result[label]={metric:statistics.median(v[metric] for r in rows for v in r['timings']) for metric in ['wallMs','cpuMs']}
            result[label].update({k:rows[0][k] for k in ['pythonFontReads','nativeGlyphQueries']})
        summary.append(result)
    report=dict(baseline=BASELINE,source=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
                engineHashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((ROOT/'engine').glob('*.py'))},
                method='Three alternating fresh-process pairs; each case has one warmup and six timed resizes. Layout only; no renderer or startup timing. Both process CPU and wall time retained.',
                summary=summary,trials=trials)
    (args.out/'comparison.json').write_text(json.dumps(report,indent=2)+'\n')
    for r in summary: print(r['name'],r['before'],'->',r['after'])

if __name__=='__main__': main()
