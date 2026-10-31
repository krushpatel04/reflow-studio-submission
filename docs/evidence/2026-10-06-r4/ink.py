"""Ink-bound measurement per text element (approximate; see plan items 10-11). Run from repo root with the venv python.
bg = median RGB of a 2px ring just outside the element's rotated aabb (clipped); ink = pixels > 40 RGB distance from bg inside the aabb.
UNRELIABLE if: rotation != 0, another element's aabb intersects this aabb or its ring, ring colour spread > 12 (gradient/image), box clipped by canvas, ink empty, font < 3px.
"""
import json, sys, glob, math
import numpy as np
from pathlib import Path
from PIL import Image
sys.path.insert(0, ".")
from engine.text_fit import aabb, _block, _font, _path, _fonts_dir
E = Path("docs/evidence/2026-10-06-r4")
D = _fonts_dir()
rows = ["| case | variant | id | grp | rot | px | pred lines | pred w | ink w | ink h | ratio | flags |", "|---|---|---|---|---|---|---|---|---|---|---|---|"]
def cases():
    for v in ("P4", "P5", "P5b"):
        for j in sorted((E / "public" / v).glob("*level3*_output.json")):
            yield "L3", v, j
    for j in sorted((E / "synthetic").glob("*_output.json")):
        b = j.name[:-12]; yield b.rsplit("_", 1)[0], b.rsplit("_", 1)[1], j
for case, v, j in cases():
    d = json.loads(j.read_text()); im = np.asarray(Image.open(j.with_suffix(".png")).convert("RGB")).astype(int); H, W = im.shape[:2]
    els = d["elements"]
    for e in els:
        if e["type"] != "text": continue
        x0, y0, x1, y1 = aabb(e); fl = []
        X0, Y0, X1, Y1 = max(0, math.floor(x0)), max(0, math.floor(y0)), min(W, math.ceil(x1)), min(H, math.ceil(y1))
        if (x0 < -0.5 or y0 < -0.5 or x1 > W + 0.5 or y1 > H + 0.5): fl.append("clipped-by-canvas")
        if e.get("rotation"): fl.append("rotated")
        if e["font_size"] < 3: fl.append("font<3px")
        for o in els:
            if o is e or o["type"] == "shape" and o.get("group_id") == e.get("group_id") and e.get("group_id"): continue
            a = aabb(o)
            if a[0] < x1 + 2 and x0 - 2 < a[2] and a[1] < y1 + 2 and y0 - 2 < a[3] and not (o["x"] <= 0 and o["y"] <= 0 and o["width"] >= W - 1): fl.append("overlaps:" + o["id"])
        f = _font(_path(D, e), e["font_size"]); w, n = _block(f, e["content"], e["width"])
        if X1 <= X0 or Y1 <= Y0: rows.append(f"| {case} | {v} | {e['id']} | {e.get('group_id','-')} | {e.get('rotation',0)} | {e['font_size']:.2f} | {n} | {w:.1f} | - | - | UNRELIABLE | empty-box |"); continue
        ring = np.concatenate([im[max(0, Y0 - 2):Y0, X0:X1].reshape(-1, 3), im[Y1:Y1 + 2, X0:X1].reshape(-1, 3), im[Y0:Y1, max(0, X0 - 2):X0].reshape(-1, 3), im[Y0:Y1, X1:X1 + 2].reshape(-1, 3)])
        if len(ring) == 0: bg = np.median(im[Y0:Y1, X0:X1].reshape(-1, 3), axis=0); fl.append("no-ring")
        else:
            bg = np.median(ring, axis=0)
            if (ring.max(0) - ring.min(0)).max() > 12: fl.append("bg-not-uniform")
        m = np.abs(im[Y0:Y1, X0:X1] - bg).sum(2) > 40
        if not m.any(): rows.append(f"| {case} | {v} | {e['id']} | {e.get('group_id','-')} | {e.get('rotation',0)} | {e['font_size']:.2f} | {n} | {w:.1f} | 0 | 0 | UNRELIABLE | no-ink;" + ";".join(fl) + " |"); continue
        cs, rs = np.where(m.any(0))[0], np.where(m.any(1))[0]; iw, ih = cs[-1] - cs[0] + 1, rs[-1] - rs[0] + 1
        rows.append(f"| {case} | {v} | {e['id']} | {e.get('group_id','-')} | {e.get('rotation',0)} | {e['font_size']:.2f} | {n} | {w:.1f} | {iw} | {ih} | " + (f"UNRELIABLE ({iw/w:.2f})" if fl else f"{iw/w:.2f}") + " | " + (";".join(fl) or "-") + " |")
(E / "ink_ledger.md").write_text("\n".join(rows) + "\n"); print(len(rows) - 2, "rows")
