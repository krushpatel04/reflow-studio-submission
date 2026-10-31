"""Replay the already accepted development manifest. No downloads or new source intake.

Run from the repository root with its Python3.11 test environment:
python docs/evidence/2026-10-27-layout-finish/reproduce.py --manifest ACCEPTED.json \
  --bundle EXTRACTED_ACCEPTED_MEMBERS --upstream PINNED_STARTER --out reports/finish-replay
Add --engine-ref f6b919f for the historical comparison. Output must be new.
"""
import argparse
import hashlib
import importlib
import json
import os
from pathlib import Path
import subprocess
import sys
import warnings

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))
from scripts.quality.dev_report import build_report

p = argparse.ArgumentParser(description=__doc__)
for name in ('manifest','bundle','upstream','out'):
    p.add_argument('--'+name, type=Path, required=True)
p.add_argument('--engine-ref')
a = p.parse_args()
pin = '67e8c30f01e004682537f6228d18a70c56bef3ea6177b770b7d3f004254e7356'
check = build_report(a.manifest, pin, a.bundle)
assert check['inputs_complete'], 'accepted payloads missing or changed'
assert subprocess.check_output(['git','-C',str(a.upstream),'rev-parse','HEAD'],text=True).strip() == 'a44a06046b0413f0785e7203955c3822e0acbc32'
assert not a.out.exists() and a.bundle.resolve() not in a.out.resolve().parents
assert not subprocess.check_output(['git','-C',str(a.upstream),'status','--porcelain'],text=True).strip()
a.out.mkdir(parents=True)
if a.engine_ref:
    # Materialize only that reference's Python engine; leave the working tree intact.
    old = a.out/'reference-engine'/'engine'
    old.mkdir(parents=True)
    files=subprocess.check_output(['git','ls-tree','--name-only',a.engine_ref,'engine/'],cwd=ROOT,text=True).splitlines()
    for name in files:
        if name.endswith('.py'):
            (old/Path(name).name).write_bytes(subprocess.check_output(['git','show',a.engine_ref+':'+name],cwd=ROOT))
    sys.path.insert(0,str(old.parent))
os.environ['CHAMELEON_UPSTREAM'] = str(a.upstream.resolve())
from engine.resize import resize
from engine import text_fit
from scripts.lica_official.render import RealRenderer, compare_rules, measure, off_canvas
manifest=json.loads(a.manifest.read_text())
rows=[]
for v in manifest['versions']:
    for s in v['sources']:
        src=json.loads((a.bundle/s['converted']['file']).read_text())
        blobs=(a.bundle/s['blobs'][0]['file']).parent
        renderer=RealRenderer(blobs,a.upstream,s['fonts'])
        for t in s['tasks']:
            task=json.loads((a.bundle/t['file']).read_text())
            with warnings.catch_warnings(record=True) as ws, text_fit.faces(renderer.records):
                out=resize(task['source'],task['target_canvas'])
            stem=t['task_id']
            raw=(json.dumps(out,indent=2)+'\n').encode()
            (a.out/(stem+'.json')).write_bytes(raw)
            render=renderer.render(out,a.out/(stem+'.png'))
            rows.append(dict(task=stem,source_sha256=s['converted']['sha256'],
                output_sha256=hashlib.sha256(raw).hexdigest(),
                png_sha256=hashlib.sha256((a.out/(stem+'.png')).read_bytes()).hexdigest(),
                rules=compare_rules(src,out),canvas=off_canvas(src,out),measure=measure(src,out),
                render=render,warnings=[str(w.message) for w in ws]))
assert len(rows)==21
result=dict(engine_ref=a.engine_ref or subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
    manifest_sha256=pin,preflight=check['summary'],tasks=rows,
    limitation='Exposed development replay; no hidden score, blind win or human acceptance.')
(a.out/'replay.json').write_text(json.dumps(result,indent=2)+'\n')
print(f'Rendered {len(rows)} accepted tasks with real rendering; inspect all outputs.')
