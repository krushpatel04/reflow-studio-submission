import json, sys, os
sys.path.insert(0, os.environ["CHAMELEON_UPSTREAM"]); sys.path.insert(0, ".")
from pathlib import Path
from renderer.converter.convert import render_design_to_png
import engine.resize as R
U = Path(os.environ["CHAMELEON_UPSTREAM"]); out = Path("reports/rf-02")
t = json.load(open(U / "input/chameleon_sample_level2_core.json"))
src, tc = t["source"], t["target_canvas"]
render_design_to_png(src, U / "brand_kit/assets", str(out / "source.png"))
cur = R.resize(src, tc)
json.dump(cur, open(out / "current.json", "w"), indent=1)
render_design_to_png(cur, U / "brand_kit/assets", str(out / "current.png"))
print(tc, [(e["id"], round(e["x"]), round(e["y"]), round(e["width"]), round(e["height"]), e.get("font_size")) for e in cur["elements"]])
