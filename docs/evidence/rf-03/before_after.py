"""RF-03 paired real-renderer receipt for the four sub-floor rows. Run from repo root, pinned venv, CHAMELEON_UPSTREAM set. Usage: before_after.py OUT.json"""
import json, os, sys
from pathlib import Path
from engine.resize import resize
from scripts.quality import text_ink as T
U = Path(os.environ["CHAMELEON_UPSTREAM"]); s = json.load(open(U / "input/chameleon_sample_level3_advanced.json"))["source"]
rows = []
for (w, h), tid in [((728, 90), "cta_label"), ((2000, 300), "cta_label"), ((1600, 400), "ribbon_label"), ((160, 600), "ribbon_label"), ((728, 90), "legal_text")]:
    e = next(x for x in resize(s, {"width": w, "height": h})["elements"] if x["id"] == tid)
    def ink(fs):
        r = T.probe(e["content"], e["font_family"], e.get("font_weight", "regular"), fs, e["x"], e["y"], e["width"], e["height"], (w, h), U, e.get("rotation", 0) or 0)
        return dict(ink_px=r["ink_px"], bbox=r["ink_bbox"], lost=r["lost_px"], overflow=r["overflow"])
    rows.append(dict(target=f"{w}x{h}", id=tid, font_size=repr(e["font_size"]), drawn=int(e["font_size"]), rot=e.get("rotation", 0) or 0,
                     geometry=[e["x"], e["y"], e["width"], e["height"]], rendered=ink(e["font_size"]), explicit_5=ink(5.0), explicit_6=ink(6.0)))
json.dump(rows, open(sys.argv[1], "w"), indent=1)
for r in rows: print(r["target"], r["id"], r["font_size"], "drawn", r["drawn"], "ink", r["rendered"]["ink_px"], r["rendered"]["bbox"], "| e5", r["explicit_5"]["ink_px"], "| e6", r["explicit_6"]["ink_px"], "| geom", r["geometry"])
