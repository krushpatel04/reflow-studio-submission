#!/usr/bin/env python3
"""P8: render cases through the genuine renderer with THIS repo's engine/. Every attempt kept (json, png, log). Usage: driver.py OUTDIR"""
import copy, json, os, shutil, subprocess, sys, tempfile
from pathlib import Path
U = "/home/nala/.local/share/reflow-runtime/chameleon-a44a060"
PY = "/home/nala/.local/share/reflow-runtime/chameleon-venv311/bin/python"
SL = "/home/nala/.local/share/reflow-runtime/chameleon-syslibs/root/usr/lib/x86_64-linux-gnu"
REPO = Path(__file__).resolve().parents[3]
def T(i, x, y, w, h, c, sz, font="Solstice Sans", **k):
    return dict({"id": i, "type": "text", "x": x, "y": y, "width": w, "height": h, "content": c, "font_family": font, "font_size": sz, "color": "rgba(0,0,0,1)"}, **k)
def S(i, x, y, w, h, fill="rgba(240,240,240,1)", st="rectangle", **k):
    return dict({"id": i, "type": "shape", "shape_type": st, "x": x, "y": y, "width": w, "height": h, "fill_color": fill}, **k)
def grp(g, x, y, w, h, c, sz, fill, rot=0):
    return [S(g + "_bg", x, y, w, h, fill, group_id=g, rotation=rot), T(g + "_label", x + 10, y + 10, w - 20, h - 20, c, sz, group_id=g, rotation=rot, font_weight="bold")]
l3 = json.load(open(f"{U}/input/chameleon_sample_level3_advanced.json"))["source"]
ribbon = {"canvas": {"width": 1000, "height": 1000}, "elements": [S("bg", 0, 0, 1000, 1000, "rgba(255,255,255,1)")] + grp("ribbon", 100, 300, 800, 200, "Rotated Group Ribbon", 48, "rgba(200,50,50,1)", -12)
          + [T("h", 100, 600, 800, 150, "Ungrouped headline text", 60)]}
ext = {"canvas": {"width": 1200, "height": 1200}, "elements": [S("bg", 0, 0, 1200, 1200, "rgba(255,255,255,1)"), S("card", 0, 0, 300, 90, "rgba(200,50,50,1)"), S("dot", 400, 0, 300, 90, "rgba(50,50,200,1)", "ellipse"), T("h", 100, 100, 1000, 160, "A rather long headline for a tiny strip banner", 64, "Solstice Serif", font_weight="bold"),
       T("s", 100, 300, 1000, 100, "Subline that also has to survive", 36)] + grp("cta", 100, 450, 500, 120, "Shop now", 40, "rgba(20,20,20,1)")}
CASES = [("C1_l3_120x600", l3, (120, 600)), ("C2a_ribbon_728x90", ribbon, (728, 90)), ("C2b_ribbon_300x250", ribbon, (300, 250)),
         ("C3a_extreme_1000x60", ext, (1000, 60)), ("C3b_extreme_60x1000", ext, (60, 1000))]
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
for name, src, (w, h) in CASES:
    t = Path(tempfile.mkdtemp(prefix="p8_")).resolve()
    shutil.copytree(U, t, dirs_exist_ok=True); shutil.rmtree(t / "input"); (t / "input").mkdir(); (t / "output").mkdir(exist_ok=True)
    for p in (REPO / "engine").glob("*.py"): shutil.copy(p, t / "engine" / p.name)
    case = {"task_id": name, "difficulty": "synthetic", "difficulty_label": name, "source": src, "target_canvas": {"width": w, "height": h}}
    (t / "input" / f"{name}.json").write_text(json.dumps(case))
    (out / f"{name}_input.json").write_text(json.dumps(case, indent=1))
    (t / "run.py").write_text('''import json, warnings
import engine.main as em
ev = []
fb = em._fallback_render
em._fallback_render = lambda d, p: (ev.append("FALLBACK"), fb(d, p))[1]
import renderer.converter.convert as conv
o = conv.render_design_to_png
conv.render_design_to_png = lambda d, a, p: (ev.append("REAL"), o(d, a, p))[1]
warnings.simplefilter("error", RuntimeWarning)
print("exit", em.main()); print("events", ev)
''')
    r = subprocess.run([PY, "run.py"], cwd=t, capture_output=True, text=True, env=dict(os.environ, LD_LIBRARY_PATH=SL))
    (out / f"{name}.log").write_text(r.stdout + "\nSTDERR:\n" + r.stderr + f"\nEXIT:{r.returncode}\n")
    for ext_ in ("json", "png"):
        f = t / "output" / f"{name}_output.{ext_}"
        if f.exists(): shutil.copy(f, out / f"{name}_output.{ext_}")
    print(name, "exit", r.returncode, "events", [l for l in r.stdout.splitlines() if l.startswith("events")])
    shutil.rmtree(t)
