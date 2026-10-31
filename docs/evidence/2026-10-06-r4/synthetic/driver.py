#!/usr/bin/env python3
"""S1-S4 synthetic cases runner for R4.
Runs each variant (P4, P5, P5b) through the exact same orchestrator path as official samples.
"""
import os, sys, json, shutil, subprocess, copy, tempfile
from pathlib import Path

UPSTREAM = os.environ.get("CHAMELEON_UPSTREAM", "/home/nala/.local/share/reflow-runtime/chameleon-a44a060")
PY = os.environ.get("PY", "/home/nala/.local/share/reflow-runtime/chameleon-venv311/bin/python")
SYSLIBS = os.environ.get("SYSLIBS", "/home/nala/.local/share/reflow-runtime/chameleon-syslibs/root/usr/lib/x86_64-linux-gnu")

def mk_s1():
    return "S1_narrow_group", {
        "canvas": {"width": 1000, "height": 1000},
        "elements": [
            {"id": "bg", "type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 1000, "height": 1000, "fill_color": "rgba(240,240,240,1)"},
            {"id": "plate", "type": "shape", "shape_type": "rectangle", "x": 200, "y": 400, "width": 600, "height": 150, "fill_color": "rgba(20,20,20,1)", "group_id": "g1"},
            {"id": "label", "type": "text", "x": 220, "y": 430, "width": 560, "height": 90, "content": "Grouped Plate and Label", "font_family": "Solstice Sans", "font_size": 48, "color": "rgba(255,255,255,1)", "group_id": "g1"}
        ]
    }, {"width": 120, "height": 600}

def mk_s2():
    return "S2_rotated_group", {
        "canvas": {"width": 1000, "height": 1000},
        "elements": [
            {"id": "bg", "type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 1000, "height": 1000, "fill_color": "rgba(255,255,255,1)"},
            {"id": "ribbon_bg", "type": "shape", "shape_type": "rectangle", "x": 100, "y": 300, "width": 800, "height": 200, "fill_color": "rgba(200,50,50,1)", "group_id": "ribbon", "rotation": -12},
            {"id": "ribbon_label", "type": "text", "x": 150, "y": 350, "width": 700, "height": 100, "content": "Rotated (-12 deg) Group Ribbon", "font_family": "Solstice Serif", "font_size": 54, "color": "rgba(255,255,255,1)", "group_id": "ribbon", "rotation": -12}
        ]
    }, {"width": 728, "height": 90}

def mk_s3():
    return "S3_extreme_strip", {
        "canvas": {"width": 1200, "height": 1200},
        "elements": [
            {"id": "bg", "type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 1200, "height": 1200, "fill_color": "rgba(255,255,255,1)"},
            {"id": "h", "type": "text", "x": 100, "y": 100, "width": 1000, "height": 160, "content": "A rather long headline for a tiny strip banner", "font_family": "Solstice Serif", "font_size": 64, "font_weight": "bold", "color": "rgba(0,0,0,1)"},
            {"id": "s", "type": "text", "x": 100, "y": 300, "width": 1000, "height": 100, "content": "Subline that also has to survive", "font_family": "Solstice Sans", "font_size": 36, "color": "rgba(0,0,0,1)"},
            {"id": "c", "type": "text", "x": 100, "y": 450, "width": 400, "height": 80, "content": "Shop now", "font_family": "Solstice Sans", "font_size": 40, "font_weight": "bold", "color": "rgba(0,0,0,1)", "rotation": 7}
        ]
    }, {"width": 1000, "height": 60}

def mk_s4():
    return "S4_extreme_tall", {
        "canvas": {"width": 1000, "height": 1000},
        "elements": [
            {"id": "bg", "type": "shape", "shape_type": "rectangle", "x": 0, "y": 0, "width": 1000, "height": 1000, "fill_color": "rgba(255,255,255,1)"},
            {"id": "tall1", "type": "text", "x": 100, "y": 100, "width": 800, "height": 200, "content": "Vertical Tower Headline", "font_family": "Solstice Serif", "font_size": 50, "color": "rgba(0,0,0,1)"},
            {"id": "tall2", "type": "text", "x": 100, "y": 400, "width": 800, "height": 200, "content": "Secondary Column Text", "font_family": "Solstice Sans", "font_size": 40, "color": "rgba(0,0,0,1)"}
        ]
    }, {"width": 60, "height": 1000}

cases = [mk_s1(), mk_s2(), mk_s3(), mk_s4()]
variants = {"P4": "4c86006", "P5": "79b18b3", "P5b": "d48a548"}
out_dir = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
out_dir.mkdir(parents=True, exist_ok=True)

for name, src, target in cases:
    for var_name, commit in variants.items():
        tdir = Path(tempfile.mkdtemp(prefix=f"r4_{name}_{var_name}_")).resolve()
        # upstream tree (orchestrator, renderer, brand_kit), then overlay the variant's engine/*.py exactly like run_official_samples.sh
        shutil.copytree(UPSTREAM, tdir, dirs_exist_ok=True)
        shutil.rmtree(tdir / "input"); (tdir / "output").mkdir(exist_ok=True)
        subprocess.run(f"git archive {commit} engine | tar -x -C {tdir}", shell=True, check=True)
        
        # write input JSON
        inp_dir = tdir / "input"
        inp_dir.mkdir()
        task_json = {"task_id": name, "difficulty": "synthetic", "difficulty_label": name, "source": src, "target_canvas": target}
        json_path = inp_dir / f"{name}.json"
        json_path.write_text(json.dumps(task_json, indent=2))
        
        # run python script in venv with LD_LIBRARY_PATH
        runner_code = f"""
import os, sys, json
os.environ["LD_LIBRARY_PATH"] = "{SYSLIBS}"
import engine.main as em
events = []
fb = em._fallback_render
em._fallback_render = lambda d, p: (events.append(["FALLBACK", str(p)]), fb(d, p))[1]
import renderer.converter.convert as conv, cr_renderer
orig = conv.render_design_to_png
conv.render_design_to_png = lambda d, a, o: (events.append(["REAL", str(o)]), orig(d, a, o))[1]
try:
    import warnings
    warnings.simplefilter("error", RuntimeWarning)
    rc = em.main()
except Exception as e:
    print("RUN EXCEPTION:", e)
    sys.exit(1)
print("exit", rc)
print("events", json.dumps(events))
"""
        run_py = tdir / "run.py"
        run_py.write_text(runner_code)
        
        res = subprocess.run([PY, "run.py"], cwd=tdir, capture_output=True, text=True, env=dict(os.environ, LD_LIBRARY_PATH=SYSLIBS))
        log_file = out_dir / f"{name}_{var_name}.log"
        log_file.write_text(f"STDOUT:\n{res.stdout}\nSTDERR:\n{res.stderr}\nEXIT:{res.returncode}")
        
        # collect output json and png if present
        out_json = tdir / "output" / f"{name}_output.json"
        out_png = tdir / "output" / f"{name}_output.png"
        if out_json.exists():
            shutil.copy(out_json, out_dir / f"{name}_{var_name}_output.json")
        if out_png.exists():
            shutil.copy(out_png, out_dir / f"{name}_{var_name}_output.png")
        
        shutil.rmtree(tdir)
        print(f"Finished {name} {var_name} (exit {res.returncode})")
