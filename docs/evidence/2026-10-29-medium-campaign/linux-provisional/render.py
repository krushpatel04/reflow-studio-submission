import json,hashlib,platform
from pathlib import Path
from engine.resize import resize
from renderer.converter.convert import render_design_to_png
s=json.loads(Path('/source/chameleon_sample_level3_advanced.json').read_text())['source']
p=Path('/out');p.mkdir(exist_ok=True)
rows=[]
for w,h in [(300,250),(301,251),(320,250),(250,300),(600,500)]:
 o=resize(s,dict(width=w,height=h));name=f'{w}x{h}'
 (p/f'{name}.json').write_text(json.dumps(o,indent=2)+'\n')
 warnings=render_design_to_png(o,Path('/app/brand_kit/assets'),p/f'{name}.png')
 rows.append(dict(target=[w,h],font_sizes={e['id']:e['font_size'] for e in o['elements'] if e['type']=='text'},warnings=warnings,png_sha256=hashlib.sha256((p/f'{name}.png').read_bytes()).hexdigest()))
receipt=dict(platform=platform.platform(),composition_sha256=hashlib.sha256(Path('/app/engine/composition.py').read_bytes()).hexdigest(),production_image_changed_via_readonly_source_mount=True,cases=rows)
(p/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
