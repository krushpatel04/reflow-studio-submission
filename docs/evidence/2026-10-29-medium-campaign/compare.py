"""Freeze both sources; compare exposed layouts and render through pinned converter."""
import copy,hashlib,importlib,json,os,statistics,subprocess,sys,time,warnings
from pathlib import Path

ROOT=Path.cwd(); OUT=ROOT/'reports/medium-campaign-20261029'; OUT.mkdir(parents=True,exist_ok=True)
UP=Path(os.environ['CHAMELEON_UPSTREAM']); BASE='f14d8312e1206a030593f4115062b78b78efb9fc'
sys.path[:0]=[str(ROOT),str(OUT),str(UP)]
modules={}; manifest={}
for variant in ['baseline','candidate']:
    package=OUT/variant; package.mkdir(exist_ok=True); manifest[variant]={}
    for p in sorted((ROOT/'engine').glob('*.py')):
        data=subprocess.check_output(['git','show',f'{BASE}:engine/{p.name}']) if variant=='baseline' else p.read_bytes()
        (package/p.name).write_bytes(data); manifest[variant][p.name]=hashlib.sha256(data).hexdigest()
    modules[variant]=importlib.import_module(f'{variant}.resize').resize
from renderer.converter.convert import render_design_to_png
from engine.text_fit import aabb
from engine.composition import _background

def digest(value):return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def call(variant,task):
    before=copy.deepcopy(task)
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always'); start=time.perf_counter()
        out=modules[variant](task['source'],task['target_canvas']); elapsed=time.perf_counter()-start
    assert task==before
    return out,[(x.category.__name__,str(x.message)) for x in caught],elapsed
def valid(source,out,old):
    mutable={'x','y','width','height','font_size','letter_spacing','corner_radius','stroke_width'}
    for a,b in zip(source['elements'],out['elements']):
        assert {k:v for k,v in a.items() if k not in mutable}=={k:v for k,v in b.items() if k not in mutable}
        x,y,xx,yy=aabb(b); assert x>=-1e-6 and y>=-1e-6 and xx<=out['canvas']['width']+1e-6 and yy<=out['canvas']['height']+1e-6
    old_by={e['id']:e for e in old['elements']}
    for e in out['elements']:
        if e['type']=='text': assert e['font_size']>=max(9,old_by[e['id']]['font_size'])
    fg=[e for e in out['elements'] if not _background(e,out)]
    for i,a in enumerate(fg):
        for b in fg[i+1:]:
            if a.get('group_id') and a.get('group_id')==b.get('group_id'):continue
            x,y,xx,yy=aabb(a);u,v,uu,vv=aabb(b)
            assert not (x<uu-1e-6 and u<xx-1e-6 and y<vv-1e-6 and v<yy-1e-6),(a['id'],b['id'])

public={p.stem:json.loads(p.read_text()) for p in sorted((UP/'input').glob('*.json'))}
seed=next(t for n,t in public.items() if 'level3' in n)
cases=dict(public)
for w,h in [(300,250),(301,251),(320,250),(250,300),(600,500),(970,250),(160,600),(300,900),(1080,1350)]:
    task=copy.deepcopy(seed);task['target_canvas']=dict(width=w,height=h);cases[f'{w}x{h}']=task
task=copy.deepcopy(seed);task['target_canvas']=copy.deepcopy(task['source']['canvas'])
next(e for e in task['source']['elements'] if e['id']=='legal_text')['font_size']=8
cases['samecanvas-smalltype']=task
report={'baseline_git_sha':BASE,'sources':manifest,'cases':{},'sweep':[]}
report['upstream_git_sha']=subprocess.check_output(['git','-C',str(UP),'rev-parse','HEAD'],text=True).strip()
report['upstream_git_dirty']=bool(subprocess.check_output(['git','-C',str(UP),'status','--porcelain'],text=True).strip())
report['renderer_file_sha256']=hashlib.sha256((UP/'renderer/converter/convert.py').read_bytes()).hexdigest()
render_names=['300x250','301x251','320x250','250x300','600x500']
for name,task in cases.items():
    row={}; results={}
    for variant in modules:
        out,caught,_=call(variant,task);results[variant]=out
        row[variant]={'output_sha256':digest(out),'warnings':caught,'text_sizes':{e['id']:e['font_size'] for e in out['elements'] if e['type']=='text'}}
        if name in render_names:
            label='before' if variant=='baseline' else 'after';path=OUT/f'{name}-{label}.png'
            (OUT/f'{name}-{label}.json').write_text(json.dumps(out,indent=2)+'\n')
            row[variant]['renderer_warnings']=render_design_to_png(out,UP/'brand_kit/assets',path)
            row[variant]['png_sha256']=hashlib.sha256(path.read_bytes()).hexdigest()
    row['changed']=results['baseline']!=results['candidate']
    if row['changed']:valid(task['source'],results['candidate'],results['baseline'])
    samples={variant:[] for variant in modules}
    for trial in range(5):
        for variant in (['baseline','candidate'] if trial%2==0 else ['candidate','baseline']):
            out,caught,elapsed=call(variant,task);assert out==results[variant];assert caught==row[variant]['warnings'];samples[variant].append(elapsed)
    row['seconds']=samples;row['median_seconds']={v:statistics.median(s) for v,s in samples.items()}
    report['cases'][name]=row;print(name,row['changed'],row['median_seconds'],flush=True)
for w in [240,280,300,320,400,600]:
    for h in [200,240,250,280,300,500]:
        task=copy.deepcopy(seed);task['target_canvas']=dict(width=w,height=h)
        old,_,_=call('baseline',task);out,_,_=call('candidate',task);changed=old!=out
        if changed:valid(task['source'],out,old)
        report['sweep'].append({'width':w,'height':h,'changed':changed,'invariants_checked':changed})
(OUT/'comparison.json').write_text(json.dumps(report,indent=2)+'\n')
