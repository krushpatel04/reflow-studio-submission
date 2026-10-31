"""Group + geometry facts per case/variant. Pixel metric: plate mask = pixels within 12 RGB of the plate fill_color (inside its aabb, +3px);
label mask = pixels within 60 RGB of the label color inside the plate bbox. Angle = PCA principal axis of the plate mask, folded to (-90,90].
JSON facts: label aabb inside plate aabb, aabb inside canvas, JSON rotation. Approximate: antialiasing, overlapping art of same colour -> flagged by mask size."""
import json, re, math, glob
import numpy as np
from pathlib import Path
from PIL import Image
import sys; sys.path.insert(0, ".")
from engine.text_fit import aabb
E = Path("docs/evidence/2026-10-06-r4")
rgb = lambda s: np.array([float(x) for x in re.findall(r"[\d.]+", s)[:3]])
def cases():
    for v in ("P4", "P5", "P5b"):
        for j in sorted((E / "public" / v).glob("*level3*_output.json")): yield "L3", v, j
    for j in sorted((E / "synthetic").glob("S[12]_*_output.json")):
        b = j.name[:-12]; yield b.rsplit("_", 1)[0], b.rsplit("_", 1)[1], j
def bbox(m):
    if not m.any(): return None
    ys, xs = np.where(m); return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
def angle(m):
    ys, xs = np.where(m)
    if len(xs) < 5: return None
    c = np.cov(np.vstack([xs, ys])); w, v = np.linalg.eigh(c); a = math.degrees(math.atan2(v[1, 1], v[0, 1]))
    return a - 180 if a > 90 else a + 180 if a <= -90 else a
rows = ["| case | variant | group | plate | label | json label in plate | json plate aabb in canvas | json rot | plate mask px | plate ink bbox | label ink in plate ink | plate axis deg (px) | flags |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
for case, v, j in cases():
    d = json.loads(j.read_text()); im = np.asarray(Image.open(j.with_suffix(".png")).convert("RGB")).astype(float); H, W = im.shape[:2]
    for g in sorted({e.get("group_id") for e in d["elements"] if e.get("group_id")}):
        pl = next(e for e in d["elements"] if e.get("group_id") == g and e["type"] == "shape"); lb = [e for e in d["elements"] if e.get("group_id") == g and e["type"] == "text"]
        for t in lb:
            pa, ta = aabb(pl), aabb(t); fl = []
            inside = ta[0] >= pa[0] - 1e-6 and ta[1] >= pa[1] - 1e-6 and ta[2] <= pa[2] + 1e-6 and ta[3] <= pa[3] + 1e-6
            incan = pa[0] >= -0.5 and pa[1] >= -0.5 and pa[2] <= W + 0.5 and pa[3] <= H + 0.5
            X0, Y0, X1, Y1 = max(0, math.floor(pa[0]) - 3), max(0, math.floor(pa[1]) - 3), min(W, math.ceil(pa[2]) + 3), min(H, math.ceil(pa[3]) + 3)
            sub = im[Y0:Y1, X0:X1]; pm = (np.abs(sub - rgb(pl["fill_color"])).max(2) < 12) if X1 > X0 and Y1 > Y0 else np.zeros((0, 0), bool)
            bb = bbox(pm); ang = angle(pm) if pm.size else None
            if pm.sum() < 20: fl.append("plate-mask<20px")
            if t["font_size"] < 3: fl.append("label<3px: ink unreliable")
            if pl.get("rotation"): fl.append("rotated plate: bbox corners include background, label-colour count UNRELIABLE")
            lin = "-"
            if bb:
                bx0, by0, bx1, by1 = bb; ps = sub[by0:by1, bx0:bx1]; lm = np.abs(ps - rgb(t["color"])).max(2) < 60
                lin = f"{int(lm.sum())}px label-colour in plate bbox" if lm.any() else "none found"
            ra = f"{ang:.1f}" if ang is not None else "-"
            rows.append(f"| {case} | {v} | {g} | {pl['id']} | {t['id']} | {'yes' if inside else 'NO'} | {'yes' if incan else 'NO'} | {pl.get('rotation', 0)} | {int(pm.sum())} | {(bx0 + X0, by0 + Y0, bx1 + X0, by1 + Y0) if bb else '-'} | {lin} | {ra} | {';'.join(fl) or '-'} |")
(E / "groups_ledger.md").write_text("\n".join(rows) + "\n"); print(len(rows) - 2)
