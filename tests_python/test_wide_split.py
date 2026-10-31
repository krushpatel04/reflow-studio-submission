"""#5 prototype: wide-banner split for the public Level 2 sample (1080x1080 -> 1600x400).

Behaviour: groups below the image block join the RF-02 text lane, and the remaining content block is enlarged into the
left region. Geometry facts plus a real-renderer clipping check; the visual verdict is separate (docs/evidence/jh-5).
"""
import copy
import json
import os
import unittest

from engine.resize import resize
from engine.text_fit import aabb

UP = os.environ.get("CHAMELEON_UPSTREAM", "/nonexistent")
TW, TH = 1600, 400
S = min(TW / 1080, TH / 1080)  # uniform scale
DECOR = ("deco_circle_1", "deco_circle_2")
PROTECTED = ("id", "type", "z_index", "group_id", "rotation", "content", "color", "opacity", "asset_id", "fit", "shape_type", "fill_color", "font_family")


def task():
    with open(os.path.join(UP, "input", "chameleon_sample_level2_core.json")) as f:
        return json.load(f)


def go(src=None, w=TW, h=TH):
    src = src or task()["source"]
    return {e["id"]: e for e in resize(src, {"width": w, "height": h})["elements"]}


def hit(a, b):
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


def area(e):
    return e["width"] * e["height"]


@unittest.skipUnless(os.path.isdir(os.path.join(UP, "brand_kit", "fonts")), f"pinned upstream not found at {UP}")
class WideSplit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.src = task()["source"]
        cls.S = {e["id"]: e for e in cls.src["elements"]}
        cls.o = go()

    # --- the behaviour this prototype adds (red on main) ---
    def test_product_is_enlarged_beyond_uniform(self):
        self.assertGreaterEqual(area(self.o["product"]), 1.5 * area(self.S["product"]) * S * S)

    def test_cta_joins_the_text_lane_below_the_subhead(self):
        lane = [aabb(self.o[k]) for k in ("headline", "subhead")]
        x0, x1 = min(b[0] for b in lane), max(b[2] for b in lane)
        for k in ("cta_bg", "cta_label"):
            b = aabb(self.o[k])
            self.assertGreaterEqual(b[0], x0 - 1e-6, k)
            self.assertLessEqual(b[2], x1 + 1e-6, k)
            self.assertGreaterEqual(b[1], aabb(self.o["subhead"])[3] - 1e-6, k)

    def test_cta_label_is_drawn_at_8px_or_more(self):
        self.assertGreaterEqual(int(self.o["cta_label"]["font_size"]), 8)

    def test_content_block_uses_the_left_region(self):
        block = [aabb(self.o[k]) for k in ("logo", "product", "badge_bg")]
        self.assertLess(min(b[0] for b in block), 0.25 * TW)

    # --- controls that must hold before and after ---
    def test_groups_scale_rigidly_and_aspect_kept(self):
        for bg, label in (("cta_bg", "cta_label"), ("badge_bg", "badge_label")):
            kb = self.o[bg]["width"] / self.S[bg]["width"]
            for k in (bg, label):
                self.assertAlmostEqual(self.o[k]["width"] / self.S[k]["width"], kb, 6, k)
                self.assertAlmostEqual(self.o[k]["height"] / self.S[k]["height"], kb, 6, k)
            self.assertAlmostEqual(self.o[label]["font_size"] / self.S[label]["font_size"], kb, 6, label)
            for a in ("x", "y"):  # the label keeps its offset from its plate, scaled
                self.assertAlmostEqual(self.o[label][a] - self.o[bg][a], (self.S[label][a] - self.S[bg][a]) * kb, 6, (label, a))
        for k in ("product", "logo"):
            self.assertAlmostEqual(self.o[k]["width"] / self.o[k]["height"], self.S[k]["width"] / self.S[k]["height"], 6, k)

    def test_inside_canvas_except_source_bleed(self):
        for k, e in self.o.items():
            s = self.S[k]
            if s["x"] < 0 or s["y"] < 0 or s["x"] + s["width"] > 1080 or s["y"] + s["height"] > 1080:
                continue  # already off-canvas in the source (deco_circle_1): kept, see test_layout
            x0, y0, x1, y1 = aabb(e)
            self.assertTrue(x0 >= -1e-6 and y0 >= -1e-6 and x1 <= TW + 1e-6 and y1 <= TH + 1e-6, (k, x0, y0, x1, y1))

    def test_no_new_overlap_among_content(self):
        content = [k for k in self.o if k != "bg" and k not in DECOR]
        for i, a in enumerate(content):
            for b in content[i + 1:]:
                if self.o[a].get("group_id") and self.o[a].get("group_id") == self.o[b].get("group_id"):
                    continue
                if hit(aabb(self.S[a]), aabb(self.S[b])):
                    continue  # overlapped in the source: allowed
                self.assertFalse(hit(aabb(self.o[a]), aabb(self.o[b])), f"{a} hits {b}")

    def test_protected_fields_and_order_preserved(self):
        out = resize(self.src, {"width": TW, "height": TH})
        self.assertEqual([e["id"] for e in out["elements"]], [e["id"] for e in self.src["elements"]])
        for a, b in zip(self.src["elements"], out["elements"]):
            for k in PROTECTED:
                self.assertEqual(a.get(k), b.get(k), f"{a['id']}.{k}")

    def test_lane_text_does_not_clip_in_the_real_renderer(self):
        from pathlib import Path
        from scripts.quality.text_ink import probe
        for k in ("headline", "subhead", "cta_label", "badge_label"):
            e = self.o[k]
            with self.subTest(k):
                r = probe(e["content"], e["font_family"], e.get("font_weight", "regular"), e["font_size"], e["x"], e["y"],
                          e["width"], e["height"], (TW, TH), Path(UP), e.get("rotation", 0) or 0)
                self.assertGreater(r["ink_px"], 0)
                self.assertEqual(r["lost_px"], 0, k)

    def test_semi_transparent_content_image_still_defines_the_block(self):
        """Control for the opacity heuristic: a faded product must still be enlarged and kept clear of the lane."""
        src = copy.deepcopy(self.src)
        for e in src["elements"]:
            if e["id"] == "product":
                e["opacity"] = 0.4
        o = go(src)
        lane_x0 = min(aabb(o[k])[0] for k in ("headline", "subhead"))
        self.assertLessEqual(aabb(o["product"])[2], lane_x0 + 1e-6)

    def test_nearby_wide_targets_also_split(self):
        for w, h in ((1500, 400), (1600, 420), (2000, 400)):
            with self.subTest(target=(w, h)):
                o = go(w=w, h=h)
                s = min(w / 1080, h / 1080)
                self.assertGreater(area(o["product"]), 1.2 * area(self.S["product"]) * s * s)
                self.assertGreaterEqual(aabb(o["cta_bg"])[1], aabb(o["subhead"])[3] - 1e-6)


if __name__ == "__main__":
    unittest.main()
