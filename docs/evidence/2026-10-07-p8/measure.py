#!/usr/bin/env python3
"""Generates measurements.md from the JSON on disk. Usage: measure.py RUNDIR > measurements.md"""
import glob, json, math, re, sys
from engine.text_fit import aabb
d = sys.argv[1]
hit = lambda a, b: a[0] < b[2] - 1e-6 and b[0] < a[2] - 1e-6 and a[1] < b[3] - 1e-6 and b[1] < a[3] - 1e-6
inside = lambda a, b, e=1e-6: a[0] >= b[0] - e and a[1] >= b[1] - e and a[2] <= b[2] + e and a[3] <= b[3] + e
for f in sorted(glob.glob(f"{d}/*_output.json")):
    name = re.sub(r"_output.json$", "", f.split("/")[-1])
    case = json.load(open(f"{d}/{name}_input.json")); src = case["source"]; tc = case["target_canvas"]; out = json.load(open(f))
    s = min(tc["width"] / src["canvas"]["width"], tc["height"] / src["canvas"]["height"])
    so = {e["id"]: e for e in src["elements"]}; oo = {e["id"]: e for e in out["elements"]}
    print(f"## {name}: {src['canvas']['width']}x{src['canvas']['height']} -> {tc['width']}x{tc['height']} (s={s:.5f})")
    bad = [i for i in so if i not in oo or [o for o in out["elements"]].index(oo[i]) != [e["id"] for e in src["elements"]].index(i)]
    print(f"- ids/order preserved: {not bad and len(so) == len(oo)}")
    chg = [i for i, e in so.items() if any(e.get(k) != oo[i].get(k) for k in ("content", "asset_id", "group_id", "rotation", "type", "font_family", "color"))]
    print(f"- text/asset/group/rotation/type/font/color changed: {chg or 'none'}")
    print("| id | group | font px | AABB (x0,y0,x1,y1) |\n|---|---|---|---|")
    for e in out["elements"]:
        if e["type"] == "text" or e.get("group_id"):
            print(f"| {e['id']} | {e.get('group_id') or '-'} | {e.get('font_size', '-') if e['type']=='text' else '-'} | {', '.join(f'{v:.1f}' for v in aabb(e))} |")
    below = [f"{e['id']}={e['font_size']:.2f}" for e in out["elements"] if e["type"] == "text" and e["font_size"] < 6 - 1e-9]
    print(f"- texts below 6px: {below or 'none'}")
    canvas = (0, 0, tc["width"], tc["height"])
    for g in sorted({e["group_id"] for e in out["elements"] if e.get("group_id")}):
        plate = [e for e in out["elements"] if e.get("group_id") == g and e["type"] != "text"]
        for l in (e for e in out["elements"] if e.get("group_id") == g and e["type"] == "text"):
            for p in plate:
                print(f"- group {g}: label AABB inside plate AABB: {inside(aabb(l), aabb(p))}")
        mem = [aabb(e) for e in out["elements"] if e.get("group_id") == g]
        u = (min(m[0] for m in mem), min(m[1] for m in mem), max(m[2] for m in mem), max(m[3] for m in mem))
        so_ = [aabb(so[e["id"]]) for e in out["elements"] if e.get("group_id") == g]
        su = (min(m[0] for m in so_), min(m[1] for m in so_), max(m[2] for m in so_), max(m[3] for m in so_))
        over = max(0, canvas[0] - u[0], canvas[1] - u[1], u[2] - canvas[2], u[3] - canvas[3])
        srcover = max(0, -su[0], -su[1], su[2] - src["canvas"]["width"], su[3] - src["canvas"]["height"]) * s
        print(f"- group {g}: union AABB overhang of canvas {over:.3f}px; source overhang x s = {srcover:.3f}px; rotation {sorted({e.get('rotation',0) for e in out['elements'] if e.get('group_id')==g})}")
    tx = [e for e in out["elements"] if e["type"] == "text"]
    pairs = [(a["id"], b["id"]) for i, a in enumerate(tx) for b in tx[i + 1:] if hit(aabb(a), aabb(b)) and a.get("group_id") != b.get("group_id") or (hit(aabb(a), aabb(b)) and not a.get("group_id") and not b.get("group_id"))]
    print(f"- text/text AABB overlaps (non-same-group): {pairs or 'none'}")
    gp = [(a["id"], b["id"]) for a in tx if not a.get("group_id") for b in out["elements"] if b.get("group_id") and hit(aabb(a), aabb(b))]
    print(f"- ungrouped text vs group member AABB overlaps: {gp or 'none'}")
    sh = [e for e in out["elements"] if e["type"] in ("shape", "image") and not e.get("group_id") and not (so[e["id"]]["x"] <= 0 and so[e["id"]]["y"] <= 0 and so[e["id"]]["x"] + so[e["id"]]["width"] >= src["canvas"]["width"] and so[e["id"]]["y"] + so[e["id"]]["height"] >= src["canvas"]["height"])]
    print(f"- ungrouped non-full-bleed shape/image ids: {[e['id'] for e in sh] or 'none'}; text AABB overlapping them: {[(a['id'], b['id']) for a in tx for b in sh if hit(aabb(a), aabb(b))] or 'none'}; group member overlapping them: {[(a['id'], b['id']) for a in out['elements'] if a.get('group_id') for b in sh if hit(aabb(a), aabb(b))] or 'none'}")
    ob = [e["id"] for e in out["elements"] if e["type"] == "text" and not inside(aabb(e), canvas, 0.5)]
    print(f"- text AABB outside canvas (>0.5px): {ob or 'none'}\n")
