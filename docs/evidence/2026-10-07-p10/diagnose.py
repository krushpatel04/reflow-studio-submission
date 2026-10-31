import json,sys,copy,math
sys.path.insert(0,".")
from engine import text_fit as tf, resize as rz
def load(f): return json.load(open(f))
cases=[("C1","docs/evidence/2026-10-07-p8/run3/C1_l3_120x600_input.json","badge2"),("C3b","docs/evidence/2026-10-07-p8/run3/C3b_extreme_60x1000_input.json","cta")]
for n,f,g in cases:
    c=load(f); src=c["source"]; tw,th=c["target_canvas"]["width"],c["target_canvas"]["height"]
    sw,sh=src["canvas"]["width"],src["canvas"]["height"]; s=min(tw/sw,th/sh)
    print("==",n,"src",sw,sh,"tgt",tw,th,"s=%.5f"%s)
    out=rz.resize(src,c["target_canvas"]) if hasattr(rz,"resize") else None
    els=out["elements"]; gs=tf._groups(els)
    for gid,idx in gs.items():
        if gid==g or n=="C1" and gid==g:
            for i in idx:
                e=els[i];print(gid,e["id"],e["type"],"fs=%.2f"%e.get("font_size",0),"box",[round(e[k],2) for k in("x","y","width","height")],"rot",e.get("rotation",0))
            sub=tf._sub_floor(els,idx); print("sub_floor",sub)
            if sub:
                need=max(tf.FLOOR_PX/els[i]["font_size"] for i in idx if els[i]["type"]=="text" and els[i]["font_size"]<tf.FLOOR_PX)
                print("need f=%.3f"%need, "ladder",[round(x,3) for x in tf.ladder(need,1.0)])
                for f_ in tf.ladder(need,1.0)[:-1]:
                    new,(w,h)=tf._unit(els,idx,f_); print("  f=%.3f union w=%.1f h=%.1f fits_canvas=%s"%(f_,w,h,w<=tw and h<=th))
print("== text measure: widest line of label at 6px vs plate, and max rigid f by canvas")
d=tf._fonts_dir()
for n,f,g in cases:
    c=load(f); src=c["source"]; tw,th=c["target_canvas"]["width"],c["target_canvas"]["height"]
    els=rz.resize(src,c["target_canvas"])["elements"]; idx=tf._groups(els)[g]
    lab=next(els[i] for i in idx if els[i]["type"]=="text"); plate=next(els[i] for i in idx if els[i]["type"]!="text")
    w6,n6=tf._block(tf._font(tf._path(d,lab),6.0),lab["content"],plate["width"]-2)
    wc,nc=tf._block(tf._font(tf._path(d,lab),lab["font_size"]),lab["content"],plate["width"]-2)
    fmax=min(tw/ (plate["width"]),th/plate["height"])
    print(n,repr(lab["content"]),"fs_now=%.2f"%lab["font_size"],"plate %.2fx%.2f"%(plate["width"],plate["height"]),"text@now w=%.1f lines=%d"%(wc,nc),"text@6 w=%.1f lines=%d h=%.1f"%(w6,n6,n6*6*1.2),"max rigid f by canvas=%.3f -> font %.2f"%(fmax,lab["font_size"]*fmax))
