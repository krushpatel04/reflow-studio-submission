import json,sys,glob,math,warnings
sys.path.insert(0,".")
from engine import resize as rz, text_fit as tf
FL=6.0
def rep(tag,src,tc):
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always"); out=rz.resize(src,tc)
    els=out["elements"]; tw,th=tc["width"],tc["height"]; sel=src["elements"]
    by={e["id"]:e for e in els}; issues=[]
    for a,e in zip(sel,els):
        if e["type"]=="text":
            if e["font_size"]<FL-1e-9: issues.append(f"sub-floor {e['id']} {e['font_size']:.2f}px"+(" (grouped)" if e.get("group_id") else ""))
            b=tf.aabb(e)
            if b[0]<-0.5 or b[1]<-0.5 or b[2]>tw+0.5 or b[3]>th+0.5: issues.append(f"clip {e['id']} aabb {[round(x,1) for x in b]} canvas {tw}x{th}")
    # group detach: members' union must stay connected (label centre inside plate aabb)
    gs=tf._groups(els)
    for g,idx in gs.items():
        pl=[els[i] for i in idx if els[i]["type"]!="text"]; tx=[els[i] for i in idx if els[i]["type"]=="text"]
        for t in tx:
            for p in pl:
                pb=tf.aabb(p); cx,cy=t["x"]+t["width"]/2,t["y"]+t["height"]/2
                if not(pb[0]-1<=cx<=pb[2]+1 and pb[1]-1<=cy<=pb[3]+1): issues.append(f"detach {t['id']} centre outside {p['id']}")
    # occlusion: text aabb overlapping other text or non-bg image/shape obstacle that did not overlap in source
    sw,sh=src["canvas"]["width"],src["canvas"]["height"]
    texts=[(i,e) for i,e in enumerate(els) if e["type"]=="text"]
    for n,(i,e) in enumerate(texts):
        for j,f in texts[n+1:]:
            a=tf.aabb(e);b=tf.aabb(f)
            ov=tf._overlap(a,b); so=tf._overlap(tf.aabb(sel[i]),tf.aabb(sel[j]))
            if ov and not so: issues.append(f"text-overlap {e['id']}~{f['id']} (new)")
        for j,o in enumerate(els):
            if o["type"] in("image","shape") and tf._blocks(o,sel[j],sw,sh) and o.get("group_id")!=e.get("group_id"):
                if tf._overlap(tf.aabb(e),tf.aabb(o)) and not tf._overlap(tf.aabb(sel[i]),tf.aabb(sel[j])): issues.append(f"occlusion {e['id']} newly over {o['id']}")
    rw=[str(x.message)[:90] for x in w if issubclass(x.category,RuntimeWarning)]
    print(f"{tag} {sw}x{sh}->{tw}x{th}: "+("; ".join(issues) if issues else "none")+(f" | WARN {rw}" if rw else ""))
U="/home/nala/.local/share/reflow-runtime/chameleon-a44a060/input/"
for n in ("level1_warmup","level2_core","level3_advanced"):
    t=json.load(open(U+"chameleon_sample_"+n+".json")); rep(n,t["source"],t["target_canvas"])
seen=set()
for f in sorted(glob.glob("docs/evidence/2026-10-07-p8/run3/*_input.json")):
    c=json.load(open(f)); rep(f.split("/")[-1][:-11],c["source"],c["target_canvas"])
# L3 across extra targets
l3=json.load(open(U+"chameleon_sample_level3_advanced.json"))["source"]
for tc in ((300,250),(160,600),(1080,1080),(1000,60),(60,1000),(320,50),(970,250),(300,600),(728,90),(120,600),(600,300)):
    rep("L3",l3,{"width":tc[0],"height":tc[1]})
l2=json.load(open(U+"chameleon_sample_level2_core.json"))["source"]
for tc in ((300,250),(120,600),(1000,60),(60,1000),(728,90)): rep("L2",l2,{"width":tc[0],"height":tc[1]})
