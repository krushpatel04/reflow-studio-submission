"""RF-02: wide-target reflow on the public official Level 2 sample. Measured geometry only; no layout-quality claim."""
import json, os, unittest
from engine.resize import resize
from engine.text_fit import aabb, GAP

UP = os.environ.get("CHAMELEON_UPSTREAM", "/nonexistent")
PROTECTED = ("id", "type", "z_index", "group_id", "rotation", "content", "color", "opacity", "asset_id", "fit", "shape_type", "fill_color", "font_family")

def src():
    with open(os.path.join(UP, "input", "chameleon_sample_level2_core.json")) as f:
        return json.load(f)["source"]

def go(w, h):
    return {e["id"]: e for e in resize(src(), {"width": w, "height": h})["elements"]}

def s_of(w, h):
    return min(w / 1080, h / 1080)

@unittest.skipUnless(os.path.isdir(os.path.join(UP, "brand_kit", "fonts")), f"pinned upstream not found at {UP}")
class WideComposition(unittest.TestCase):
    def test_wide_target_enlarges_ungrouped_text_beside_product(self):
        o = go(1600, 400)
        for k, size in (("headline", 56), ("subhead", 24)):
            self.assertGreater(o[k]["font_size"], size * s_of(1600, 400) + 1e-6, k)
            self.assertLessEqual(o[k]["font_size"], size, k)
            self.assertGreaterEqual(aabb(o[k])[0], aabb(o["product"])[2] + GAP - 1e-9, k)

    def test_wide_text_ink_stays_in_its_boxes(self):
        from pathlib import Path
        from scripts.quality.text_ink import probe

        o = go(1600, 400)
        for key in ("headline", "subhead"):
            with self.subTest(key=key):
                e = o[key]
                result = probe(e["content"], e["font_family"], e.get("font_weight", "regular"),
                               e["font_size"], e["x"], e["y"], e["width"], e["height"],
                               (1600, 400), Path(UP), e.get("rotation", 0) or 0)
                self.assertGreater(result["ink_px"], 0)
                self.assertEqual((result["lost_px"], result["overflow_px"]), (0, 0), key)

    def test_no_new_collision_and_inside_canvas(self):
        o = go(1600, 400)
        for k in ("headline", "subhead"):
            x0, y0, x1, y1 = aabb(o[k])
            self.assertTrue(x0 >= 0 and y0 >= 0 and x1 <= 1600 and y1 <= 400, k)
            for other in ("product", "logo", "cta_bg", "cta_label", "badge_bg"):
                a, b = aabb(o[k]), aabb(o[other])
                self.assertFalse(a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3], f"{k} hits {other}")

    def test_protected_fields_and_order_preserved(self):
        s, o = src(), resize(src(), {"width": 1600, "height": 400})
        self.assertEqual([e["id"] for e in o["elements"]], [e["id"] for e in s["elements"]])
        for a, b in zip(s["elements"], o["elements"]):
            for k in PROTECTED:
                self.assertEqual(a.get(k), b.get(k), f"{a['id']}.{k}")

    def test_legitimate_overlap_and_groups_kept(self):
        o = go(1600, 400)
        a, b = aabb(o["deco_circle_1"]), aabb(o["product"])
        self.assertTrue(a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3])
        self.assertEqual({k: o[k].get("group_id") for k in ("badge_bg", "badge_label", "cta_bg", "cta_label")}, {"badge_bg": "badge", "badge_label": "badge", "cta_bg": "cta", "cta_label": "cta"})

    def test_identity_target_is_uniform(self):
        o = go(1080, 1080)
        for e in src()["elements"]:
            self.assertEqual((o[e["id"]]["x"], o[e["id"]]["y"], o[e["id"]]["width"], o[e["id"]]["height"]), (e["x"], e["y"], e["width"], e["height"]), e["id"])

    def test_nearby_wide_sizes_still_reflow(self):
        for w, h in ((1500, 400), (1600, 420)):
            self.assertGreater(go(w, h)["headline"]["font_size"], 56 * s_of(w, h) + 1e-6, (w, h))

    def test_non_wide_target_untouched(self):
        o = go(1200, 1000)
        self.assertAlmostEqual(o["headline"]["font_size"], 56 * s_of(1200, 1000))
        self.assertAlmostEqual(o["headline"]["x"], 90 * s_of(1200, 1000) + (1200 - 1080 * s_of(1200, 1000)) / 2)

    def _mut(self, **kw):
        s = src()
        for e in s["elements"]:
            if e["id"] == "headline":
                e.update(kw)
        return {e["id"]: e for e in resize(s, {"width": 1600, "height": 400})["elements"]}

    def test_trigger_negatives_fall_back_to_uniform(self):
        uni = 56 * s_of(1600, 400)
        for name, kw in (("headline above the product in the source", {"y": 100}), ("rotated headline", {"rotation": 10})):
            self.assertAlmostEqual(self._mut(**kw)["headline"]["font_size"], uni, msg=name)
            self.assertAlmostEqual(self._mut(**kw)["subhead"]["font_size"], 24 * s_of(1600, 400), msg=name)

    def test_grouped_text_never_joins_the_lane(self):
        o = self._mut(group_id="hg")
        self.assertAlmostEqual(o["headline"]["x"], 90 * s_of(1600, 400) + (1600 - 1080 * s_of(1600, 400)) / 2)
        self.assertEqual(o["headline"]["group_id"], "hg")
        self.assertAlmostEqual(o["headline"]["font_size"], 56 * s_of(1600, 400))  # grouped text keeps the uniform scale
        self.assertGreater(o["subhead"]["font_size"], 24 * s_of(1600, 400) + 1e-6)  # the ungrouped text still reflows: not a vacuous pass

if __name__ == "__main__":
    unittest.main()
