import sys,hashlib,os; sys.path.insert(0,"/home/nala/.local/share/reflow-runtime/chameleon-a44a060/renderer"); sys.path.insert(0,".")
from converter.brand_fonts import load_brand_font_manager
from engine import text_fit as tf
D=tf._fonts_dir(); fm=load_brand_font_manager(D)
h=lambda b:hashlib.sha1(b).hexdigest()[:8]
H=lambda p:h(open(p,"rb").read())
for fam in ("Solstice Serif","Solstice Sans","Times Serif","Arial","Lora"):
  for w,s,bw,fs in (("regular","regular",None,None),("bold","regular","bold",None),("regular","italic",None,"italic"),("bold","bolditalic","bold","italic")):
    e={"font_family":fam,"font_weight":bw,"font_style":fs}
    r=h(fm.lookup(fam,w,s)); t=H(tf._path(D,e))
    print(f"{fam:15}{w:8}{s:11} renderer {r} fit {t} {'SAME' if r==t else 'DIFF'}")
