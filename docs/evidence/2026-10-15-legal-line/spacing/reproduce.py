"""Bounded #148 diagnosis; pinned renderer untouched, same strings/sizes."""
import hashlib, json, os, platform, sys
from pathlib import Path
import skia
from scripts.quality import text_ink as T
from scripts.lica_official.render import RealRenderer

out=Path('reports/two-hour/A/spacing');out.mkdir(parents=True,exist_ok=True)
up=Path(os.environ['CHAMELEON_UPSTREAM']); blobs=out/'blobs';blobs.mkdir(exist_ok=True)
faces=[]
for weight,label in [(400,'regular'),(700,'bold')]:
 data=T.load_face(T.face_name('Solstice Sans',label),upstream=up);digest=hashlib.sha256(data).hexdigest();(blobs/digest).write_bytes(data)
 faces.append({'family':'Solstice Sans','weight':weight,'style':'normal','ttf_sha256':digest})
r=RealRenderer(blobs,up,faces)
rows=[]
strings=['SUNSET SALE','AWARD WINNING 2026','SMALL BATCH','NEW FLAVOR','Shop the Summer Line']
for j,text in enumerate(strings):
 for size in (6,6.67,7,8,8.15):
  for rot in (0,-12):
   font=skia.Font(skia.Typeface.MakeFromData(T.load_face('SolsticeSans-Bold',upstream=up)),int(size))
   glyphs=font.textToGlyphs(text)
   e={'id':'text','type':'text','x':30,'y':35,'width':220,'height':30,'font_family':'Solstice Sans','font_size':size,'font_weight':'bold','content':text,'rotation':rot,'text_align':'left','color':'rgba(0,0,0,1)'}
   p=out/f'string{j}-size{size}-rot{rot}.png';audit=r.render({'canvas':{'width':300,'height':100},'elements':[e]},p)
   rows.append({'text':text,'size':size,'rotation':rot,'png':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'font_events':audit['font_events'],'real_renderer_calls':audit['real_renderer_calls'],'fallbacks':audit['font_fallbacks'],'drawn_size':int(size),'subpixel':font.isSubpixel(),'linear_metrics':font.isLinearMetrics(),'glyph_positions':list(font.getXPos(glyphs)),'advances':list(font.getWidths(glyphs))})
pairs=[]
for text in strings:
 for rot in (0,-12):
  for a,b in [(6,6.67),(8,8.15)]:
   x,y=[next(r for r in rows if r['text']==text and r['rotation']==rot and r['size']==s) for s in (a,b)]
   pairs.append({'text':text,'rotation':rot,'sizes':[a,b],'png_identical':x['sha256']==y['sha256']})
report={'host':platform.platform(),'arch':platform.machine(),'upstream':'a44a06046b0413f0785e7203955c3822e0acbc32','renderer':'a17e1fb9a732959dd6c21ae168d5ee09d74bd64f','scope':'macOS same-string size and rotation sweep; no renderer changes','rows':rows,'fractional_integer_pairs':pairs,'limits':['No fresh Linux run','No human gap/readability judgments','Unhinted/rounding causal intervention not performed; cross-platform spacing cause remains unisolated','No global font floor change']}
(out/'diagnosis.json').write_text(json.dumps(report,indent=2)+'\n')
print('rendered',len(rows),'pairs',len(pairs),'identical',sum(p['png_identical'] for p in pairs))
