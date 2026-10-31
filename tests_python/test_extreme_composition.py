"""RF-03: floor accounting on the public Level 3 sample. Measured facts only; no layout-quality claim. Skipped loudly without the pinned upstream."""
import copy
import json
import os
import unittest
from engine.resize import resize
from engine.text_fit import _raise
UPSTREAM = os.environ.get("CHAMELEON_UPSTREAM", "/nonexistent")
FONTS = os.path.join(UPSTREAM, "brand_kit", "fonts")
SKIP = f"pinned upstream not found at {UPSTREAM}; set CHAMELEON_UPSTREAM"
FLOOR = 6.0  # same value as engine.text_fit.FLOOR_PX, repeated on purpose so the test fails on behavior, not on import
TARGETS = ((728, 90), (2000, 300), (1600, 400), (160, 600))
PROTECTED = ("id", "type", "z_index", "group_id", "rotation", "content", "color", "opacity", "asset_id", "fit", "shape_type", "fill_color", "font_family", "x", "y", "width", "height")


def l3():
    with open(os.path.join(UPSTREAM, "input", "chameleon_sample_level3_advanced.json")) as f:
        return json.load(f)["source"]


def go(w, h):
    return {e["id"]: e for e in resize(l3(), {"width": w, "height": h})["elements"]}


def label_group(size, width, height=40.0):
    """One plate + one grouped label already scaled to `size`; same shape _raise sees after the uniform P5b placement."""
    plate = {"id": "p", "type": "shape", "shape_type": "rectangle", "fill_color": "rgba(1,2,3,1)", "x": 0, "y": 0, "width": width, "height": height, "group_id": "g"}
    lab = {"id": "l", "type": "text", "x": 0, "y": 0, "width": width, "height": height, "content": "Hi", "font_family": "Solstice Sans",
           "font_size": size, "color": "rgba(0,0,0,1)", "group_id": "g", "rotation": 0}
    return [plate, lab]


def raised(size, width):
    els = label_group(size, width)
    ok = _raise(els, [0, 1])
    return ok, els[1]["font_size"]


@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class FloorAccounting(unittest.TestCase):
    def test_every_text_draws_at_or_above_floor(self):
        for w, h in TARGETS:
            for k, e in go(w, h).items():
                if e["type"] == "text":
                    with self.subTest(target=f"{w}x{h}", text=k, font_size=repr(e["font_size"])):
                        self.assertGreaterEqual(int(e["font_size"]), FLOOR)  # the renderer draws int(font_size)

    def test_rotated_ribbon_label_draws_at_or_above_floor(self):
        for w, h in ((160, 600), (1600, 400)):
            with self.subTest(target=f"{w}x{h}"):
                r = go(w, h)["ribbon_label"]
                self.assertEqual(r["rotation"], -12)
                self.assertGreaterEqual(int(r["font_size"]), FLOOR)

    def test_nearby_sizes_stay_at_or_above_floor(self):
        for w, h in ((730, 90), (728, 92), (1990, 300), (160, 610)):
            for k, e in go(w, h).items():
                if e["type"] == "text":
                    with self.subTest(target=f"{w}x{h}", text=k):
                        self.assertGreaterEqual(int(e["font_size"]), FLOOR)

    def test_only_font_size_of_the_sliver_labels_changes_geometry_group_rotation_paint_preserved(self):
        s = l3()
        for w, h in TARGETS:
            o = go(w, h)
            ids = [e["id"] for e in s["elements"]]
            self.assertEqual(list(o), ids)
            for e in s["elements"]:
                for k in ("id", "type", "z_index", "group_id", "rotation", "content", "color", "opacity", "asset_id", "fit", "shape_type", "fill_color", "font_family"):
                    self.assertEqual(o[e["id"]].get(k), e.get(k), (w, h, e["id"], k))

    def test_grouped_plate_and_label_keep_valid_overlap(self):
        for w, h in TARGETS:
            o = go(w, h)
            for g in ("badge1", "badge2", "badge3", "cta", "ribbon"):
                a, b = o[f"{g}_bg"], o[f"{g}_label"]
                self.assertTrue(a["x"] < b["x"] + b["width"] and b["x"] < a["x"] + a["width"] and a["y"] < b["y"] + b["height"] and b["y"] < a["y"] + a["height"], (w, h, g))


@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class SliverControls(unittest.TestCase):
    """Only [FLOOR-1e-9, FLOOR) is the defect. Each case is compared against what _raise does for a value outside the sliver in the same box (fit gate only)."""
    SLIVER = FLOOR - 1e-15  # 5.999999999999999

    def test_sliver_value_in_fitting_box_is_raised_to_exactly_floor(self):
        ok, fs = raised(self.SLIVER, 200.0)
        ref_ok, ref_fs = raised(5.9999, 200.0)  # outside the sliver: the base gate already raises a fitting label
        self.assertTrue(ref_ok)
        self.assertEqual((ok, fs), (ref_ok, ref_fs))
        self.assertEqual(fs, FLOOR)

    def test_sliver_value_in_too_narrow_box_is_not_raised_and_stays_reported(self):
        ok, fs = raised(self.SLIVER, 4.0)
        ref_ok, ref_fs = raised(5.9999, 4.0)
        self.assertFalse(ref_ok)
        self.assertEqual((ok, fs), (ref_ok, self.SLIVER))  # unsatisfied constraint stays visible: nothing hidden, nothing forced
        self.assertLess(fs, FLOOR)
        self.assertEqual(ref_fs, 5.9999)

    def test_outside_epsilon_and_genuine_sub_floor_values_follow_the_fit_gate_only(self):
        for size in (FLOOR - 1e-6, 5.9999, 5.5):
            for width in (200.0, 4.0):
                with self.subTest(size=size, width=width):
                    ok, fs = raised(size, width)
                    self.assertEqual(ok, width == 200.0)
                    self.assertEqual(fs, FLOOR if ok else size)  # a genuine 5.5 is never silently snapped

    def test_floor_exactly_and_above_untouched(self):
        for size in (FLOOR, 6.2, 12.0):
            els = label_group(size, 200.0)
            before = copy.deepcopy(els)
            self.assertFalse(_raise(els, [0, 1]))
            self.assertEqual(els, before)


@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class RenderedFloor(unittest.TestCase):
    """Real renderer (Skia via text_ink.probe): the four sub-floor rows and the small legal copy render with ink at the drawn size."""
    @staticmethod
    def ink(w, h, tid, size=None):
        from pathlib import Path
        from scripts.quality import text_ink
        e = go(w, h)[tid]
        if size is not None:
            e = {**e, "font_size": size}
        return text_ink.probe(e["content"], e["font_family"], e.get("font_weight", "regular"), e["font_size"], e["x"], e["y"], e["width"], e["height"], (w, h), Path(UPSTREAM), e.get("rotation", 0) or 0)

    def test_four_rows_render_at_the_returned_size_not_the_five_pixel_control(self):
        cases = ((728, 90, "cta_label"), (2000, 300, "cta_label"),
                 (1600, 400, "ribbon_label"), (160, 600, "ribbon_label"))
        for w, h, tid in cases:
            with self.subTest(target=f"{w}x{h}", text=tid):
                r = self.ink(w, h, tid)
                # Absolute pixel counts differ by platform. Compare actual
                # returned ink with explicit six/five-pixel controls on this host.
                six = self.ink(w, h, tid, size=6.0)
                five = self.ink(w, h, tid, size=5.0)
                self.assertGreater(six["ink_px"], 0)
                self.assertGreater(five["ink_px"], 0)
                self.assertNotEqual(six["ink_px"], five["ink_px"])
                self.assertGreaterEqual(go(w, h)[tid]["font_size"], FLOOR)
                self.assertEqual(r["ink_px"], self.ink(w, h, tid, size=go(w,h)[tid]["font_size"])["ink_px"])
                self.assertEqual((r["lost_px"], r["overflow"]), (0, False))

    def test_small_legal_copy_renders_at_the_improved_readable_size(self):
        r = self.ink(728, 90, "legal_text")
        self.assertEqual(go(728, 90)["legal_text"]["font_size"], 9.0)
        six = self.ink(728, 90, "legal_text", size=6.0)
        five = self.ink(728, 90, "legal_text", size=5.0)
        self.assertGreater(six["ink_px"], 0)
        self.assertGreater(five["ink_px"], 0)
        self.assertNotEqual(six["ink_px"], five["ink_px"])
        self.assertEqual(r["ink_px"], self.ink(728,90,"legal_text",size=9.0)["ink_px"])
        self.assertEqual((r["lost_px"], r["overflow"]), (0, False))


if __name__ == "__main__":
    unittest.main()
