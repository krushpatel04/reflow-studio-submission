import json,math,sys
from PIL import Image
import numpy as np
def run(png,els,tag):
    im=np.array(Image.open(png).convert("RGB")).astype(int)
    p=next(e for e in els if e["id"]=="ribbon_bg"); l=next(e for e in els if e["id"]=="ribbon_label")
    r=math.radians(p["rotation"]); cx,cy=p["x"]+p["width"]/2,p["y"]+p["height"]/2
    ys,xs=np.mgrid[0:im.shape[0],0:im.shape[1]]
    dx,dy=xs+.5-cx,ys+.5-cy; u=dx*math.cos(r)+dy*math.sin(r); v=-dx*math.sin(r)+dy*math.cos(r)
    inside=(abs(u)<p["width"]/2-.5)&(abs(v)<p["height"]/2-.5)
    ink=inside&(im.sum(2)<150)   # black-ish text on red plate
    n=ink.sum()
    if not n: print(tag,"no ink"); return
    print(f"{tag}: ink px={n} centre in plate frame u={u[ink].mean():.2f} v={v[ink].mean():.2f} | plate {p['width']:.1f}x{p['height']:.1f} -> u/pw={u[ink].mean()/p['width']:.3f} v/ph={v[ink].mean()/p['height']:.3f}; ink extent u[{u[ink].min():.1f},{u[ink].max():.1f}] v[{v[ink].min():.1f},{v[ink].max():.1f}]")
d=sys.argv[1]
for n in sys.argv[2:]:
    run(d+n+"_output.png",json.load(open(d+n+"_output.json"))["elements"],n)
