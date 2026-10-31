"""Per ungrouped text x ungrouped image overlap (rotated AABBs): source vs before (main fd215a0) vs after (R6), with z-order. Run from repo root, venv python."""
import json, sys
from pathlib import Path
sys.path.insert(0, ".")
from engine.text_fit import aabb
E = Path("docs/evidence/2026-10-07-r6"); U = Path("/home/nala/.local/share/reflow-runtime/chameleon-a44a060/input")
hit = lambda p, q: p[0] < q[2] and q[0] < p[2] and p[1] < q[3] and q[1] < p[3]
rows = ["| case | text | image | source overlap | before (main) | after (R6) | z (text/image; JSON idx) | text px before/after |", "|---|---|---|---|---|---|---|---|"]
t = json.load(open(U / "chameleon_sample_level3_advanced.json")); src = t["source"]
b, a = (json.load(open(E / f"{n}/chameleon_sample_level3_advanced_output.json")) for n in ("before", "after"))
S, B, A = ({e["id"]: e for e in d["elements"]} for d in (src, b, a)); idx = {e["id"]: n for n, e in enumerate(src["elements"])}
for x in (e for e in src["elements"] if e["type"] == "text" and not e.get("group_id")):
    for i in (e for e in src["elements"] if e["type"] == "image" and not e.get("group_id")):
        z = f"{x.get('z_index','-')}/{i.get('z_index','-')}; {idx[x['id']]}/{idx[i['id']]}"
        rows.append(f"| L3 | {x['id']} | {i['id']} | {hit(aabb(S[x['id']]), aabb(S[i['id']]))} | {hit(aabb(B[x['id']]), aabb(B[i['id']]))} | {hit(aabb(A[x['id']]), aabb(A[i['id']]))} | {z} | {B[x['id']]['font_size']:.2f}/{A[x['id']]['font_size']:.2f} |")
rows.append("\nR4 synthetic S1-S4 contain no images and cannot exercise this defect; the committed fixture tests_python/test_text_fit.py::ImageOcclusion does (rotated text and image).")
rows.append("Before/after PNGs viewed (L3, crop x 250-500): before headline runs across the bottle; after bottle clear, headline one line at 9.15px. Geometry/pixels only; no quality claim.")
(E / "overlap.md").write_text("\n".join(rows) + "\n")
