"""P10: genuine-renderer PNGs. Label ink = pixels differing from the plate fill inside the plate; report ink bbox vs label box and PIL width."""
import json, sys
import numpy as np
from PIL import Image
sys.path.insert(0, ".")
from engine import text_fit as tf
d = sys.argv[1]
# thr: C1 white text on dark plate with rounded corners (low thr would pick the corners); C3b black text on rgb(20,20,20)
for n, lid, pid, thr in (("C1_l3_120x600", "badge2_label", "badge2_bg", 300), ("C3b_extreme_60x1000", "cta_label", "cta_bg", 15)):
    els = {e["id"]: e for e in json.load(open(f"{d}/{n}_output.json"))["elements"]}
    l, p = els[lid], els[pid]
    im = np.array(Image.open(f"{d}/{n}_output.png").convert("RGB")).astype(int)
    x0, y0, x1, y1 = int(p["x"] + 1), int(p["y"] + 1), int(p["x"] + p["width"] - 1), int(p["y"] + p["height"] - 1)
    reg = im[y0:y1, x0:x1]; fill = np.median(reg.reshape(-1, 3), axis=0)
    m = np.abs(reg - fill).sum(2) > thr
    ys, xs = np.nonzero(m)
    w, nl = tf._block(tf._font(tf._path(tf._fonts_dir(), l), l["font_size"]), l["content"], l["width"])
    if not len(xs): print(n, "no ink"); continue
    bx0, bx1, by0, by1 = xs.min() + x0, xs.max() + x0 + 1, ys.min() + y0, ys.max() + y0 + 1
    inbox = bx0 >= l["x"] - 1 and bx1 <= l["x"] + l["width"] + 1
    print(f"{n} {lid}: font={l['font_size']} PIL width={w:.1f} ink width={bx1-bx0} ink x[{bx0},{bx1}] y[{by0},{by1}] label box x[{l['x']:.1f},{l['x']+l['width']:.1f}] y[{l['y']:.1f},{l['y']+l['height']:.1f}] plate x[{p['x']:.1f},{p['x']+p['width']:.1f}] y[{p['y']:.1f},{p['y']+p['height']:.1f}] ink inside label box x: {inbox}; inside plate y: {by0>=p['y']-1 and by1<=p['y']+p['height']+1}")
