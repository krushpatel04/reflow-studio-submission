"""RF-02 R2: Level 1 public sample at wide targets, current (reflow disabled) vs candidate, plus real-renderer PNGs at 1600x400. Run from repo root, pinned env."""
import json, os
from pathlib import Path
from engine.resize import resize
from engine import text_fit
from renderer.converter.convert import render_design_to_png
U = Path(os.environ["CHAMELEON_UPSTREAM"]); out = Path("docs/evidence/rf-02/png")
src = json.load(open(U / "input/chameleon_sample_level1_warmup.json"))["source"]
for w, h in ((1600, 400), (2000, 400), (1500, 400), (3000, 600), (1080, 1350)):
    text_fit.WIDE_RATIO = 1e9; cur = resize(src, {"width": w, "height": h})
    text_fit.WIDE_RATIO = 2.0; cand = resize(src, {"width": w, "height": h})
    print(w, h, {e["id"]: [round(a["font_size"], 1), round(e["font_size"], 1)] for a, e in zip(cur["elements"], cand["elements"]) if e["type"] == "text"})
    if (w, h) == (1600, 400):
        render_design_to_png(src, U / "brand_kit/assets", str(out / "l1_source.png"))
        render_design_to_png(cur, U / "brand_kit/assets", str(out / "l1_current_1600x400.png"))
        render_design_to_png(cand, U / "brand_kit/assets", str(out / "l1_candidate_1600x400.png"))
