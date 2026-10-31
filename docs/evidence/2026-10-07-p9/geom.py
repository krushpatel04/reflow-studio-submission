import json,glob,math,sys
U="/home/nala/.local/share/reflow-runtime/chameleon-a44a060/input/chameleon_sample_level3_advanced.json"
def centre(e): return e["x"]+e["width"]/2, e["y"]+e["height"]/2
def frame(e,p):
    """label centre minus plate centre, expressed in the plate's rotated frame (rotation = deg clockwise)"""
    (lx,ly),(px,py)=centre(e),centre(p); dx,dy=lx-px,ly-py; r=math.radians(p.get("rotation",0) or 0)
    return dx*math.cos(r)+dy*math.sin(r), -dx*math.sin(r)+dy*math.cos(r)
def rep(tag,els,sig=""):
    by={e["id"]:e for e in els}
    for e in els:
        if e["type"]=="text" and e.get("group_id"):
            p=by[e["group_id"]+"_bg"]; fx,fy=frame(e,p)
            print(f"{tag} {e['id']}: label-plate centre offset (plate frame) x={fx:.4f} y={fy:.4f}; label box in plate: dx0={e['x']-p['x']:.3f} dy0={e['y']-p['y']:.3f} w/pw={e['width']/p['width']:.4f} h/ph={e['height']/p['height']:.4f} align={e.get('text_align','left')} rot={e.get('rotation',0)}")
mode=sys.argv[1]
if mode=="l3":
    t=json.load(open(U)); rep("L3 source",t["source"]["elements"])
else:
    d=sys.argv[2]
    for f in sorted(glob.glob(d+"/C2*_input.json")):
        n=f.split("/")[-1][:-11]; c=json.load(open(f)); rep(n+" source",c["source"]["elements"]); rep(n+" output",json.load(open(f.replace("_input","_output")))["elements"])
