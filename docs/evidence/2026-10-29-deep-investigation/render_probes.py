import json,sys,time
from pathlib import Path
r=Path.cwd();out=r/'reports/deep-investigation-2026-10-29';sys.path.insert(0,str(r/'.cache/chameleon'))
from renderer.converter.convert import render_design_to_png
rows=[]
for p in sorted(out.glob('*-output.json')):
    t=time.perf_counter(); warnings=render_design_to_png(json.loads(p.read_text()),r/'.cache/chameleon/brand_kit/assets',p.with_suffix('.png'))
    rows.append({'file':p.name,'render_s':time.perf_counter()-t,'warnings':warnings});print(rows[-1],flush=True)
(out/'renders.json').write_text(json.dumps(rows,indent=2))
