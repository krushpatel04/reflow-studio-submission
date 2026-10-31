"""RF-02: measured current-vs-candidate numbers for the public Level 2 wide target. Run from repo root with PYTHONPATH=. and the pinned env."""
import json, os, subprocess, hashlib
from engine.resize import resize
from engine import text_fit
from scripts.lica_official.render import measure
U = os.environ["CHAMELEON_UPSTREAM"]
t = json.load(open(f"{U}/input/chameleon_sample_level2_core.json")); src, tc = t["source"], t["target_canvas"]
cand = resize(src, tc)
text_fit.WIDE_RATIO = 1e9  # disables only the RF-02 reflow: the c75a0ef behaviour
cur = resize(src, tc)
res = {}
for name, o in (("current", cur), ("candidate", cand)):
    m = measure(src, o)
    res[name] = {"foreground_fraction": round(m["foreground_fraction"], 4), "foreground_aabb": [round(v, 1) for v in m["foreground_aabb"]],
                 "min_rendered_text_px": m["min_rendered_text_px"],
                 "text": {e["id"]: [round(e["font_size"], 2), round(e["x"], 1), round(e["y"], 1), round(e["width"], 1), round(e["height"], 1)] for e in o["elements"] if e["type"] == "text"},
                 "sha256": hashlib.sha256(json.dumps(o, sort_keys=True).encode()).hexdigest()}
print(json.dumps(res, indent=1))
