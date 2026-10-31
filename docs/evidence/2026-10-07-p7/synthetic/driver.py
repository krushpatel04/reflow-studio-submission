#!/usr/bin/env python3
"""P7 synthetic: ungrouped card + circle the repacked text must clear. before = c9178a6, after = working tree engine/. Genuine renderer path."""
import json, os, shutil, subprocess, sys, tempfile
from pathlib import Path
U = "/home/nala/.local/share/reflow-runtime/chameleon-a44a060"
PY = "/home/nala/.local/share/reflow-runtime/chameleon-venv311/bin/python"
SL = "/home/nala/.local/share/reflow-runtime/chameleon-syslibs/root/usr/lib/x86_64-linux-gnu"
REPO = Path(__file__).resolve().parents[4]
src = {"canvas": {"width": 1200, "height": 1200}, "elements": [
    {"id": "bg", "type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 1200, "height": 1200, "fill_color": "rgba(255,255,255,1)"},
    {"id": "card", "type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 300, "height": 300, "fill_color": "rgba(200,50,50,1)"},
    {"id": "dot", "type": "shape", "shape_type": "ellipse", "x": 400, "y": 0, "width": 300, "height": 300, "fill_color": "rgba(50,50,200,1)"},
    {"id": "h", "type": "text", "x": 100, "y": 600, "width": 900, "height": 200, "content": "Headline here", "font_family": "Solstice Sans", "font_size": 60, "color": "rgba(0,0,0,1)"}]}
case = {"task_id": "P7_shapes", "difficulty": "synthetic", "difficulty_label": "P7_shapes", "source": src, "target_canvas": {"width": 150, "height": 100}}
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
for var, ref in (("before", "c9178a6"), ("after", None)):
    t = Path(tempfile.mkdtemp(prefix="p7_")).resolve()
    shutil.copytree(U, t, dirs_exist_ok=True); shutil.rmtree(t / "input"); (t / "input").mkdir(); (t / "output").mkdir(exist_ok=True)
    if ref: subprocess.run(f"git -C {REPO} archive {ref} engine | tar -x -C {t}", shell=True, check=True)
    else: [shutil.copy(p, t / "engine") for p in (REPO / "engine").glob("*.py")]
    (t / "input" / "P7_shapes.json").write_text(json.dumps(case))
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
    (out / f"{var}.log").write_text(r.stdout + "\n" + r.stderr + f"\nEXIT:{r.returncode}")
    for ext in ("json", "png"):
        f = t / "output" / f"P7_shapes_output.{ext}"
        if f.exists(): shutil.copy(f, out / f"{var}.{ext}")
    shutil.rmtree(t)
