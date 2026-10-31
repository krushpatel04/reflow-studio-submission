"""P4 (M4): deterministic layout in resize(). Geometry facts only; no layout-quality claim. Run: python -m unittest discover -s tests_python -t ."""
import copy
import json
import unittest

from engine.resize import resize

TEXT = {"id": "t", "type": "text", "x": 100, "y": 200, "width": 400, "height": 80, "content": "Hi", "font_family": "F", "font_size": 40,
        "color": "rgba(1,2,3,1)"}
SHAPE = {"id": "s", "type": "shape", "x": 10, "y": 10, "width": 50, "height": 50, "shape_type": "rectangle", "fill_color": "rgba(0,0,0,1)"}
IMG = {"id": "i", "type": "image", "x": 100, "y": 100, "width": 400, "height": 200, "asset_id": "a.png", "fit": "cover"}
BG = dict(SHAPE, id="bg", x=0, y=0, width=1000, height=1000)
COVER = {"id": "cv", "type": "image", "x": 0, "y": 0, "width": 1000, "height": 1000, "asset_id": "b.png", "fit": "cover"}
TARGETS = [(1001, 1000), (600, 1200), (1600, 400), (80, 3000), (728, 90)]


def src(*els, w=1000, h=1000):
    return {"canvas": {"width": w, "height": h}, "elements": copy.deepcopy(list(els))}


def run(source, w, h):
    return {e["id"]: e for e in resize(source, {"width": w, "height": h})["elements"]}


class Aspect(unittest.TestCase):
    def test_framed_image_aspect_never_changes(self):  # the starter bug: stretch to the target
        for fit in ("cover", "contain", "fill"):
            for w, h in TARGETS:
                with self.subTest(fit=fit, target=(w, h)):
                    o = run(src(dict(IMG, fit=fit)), w, h)["i"]
                    self.assertAlmostEqual(o["width"] / o["height"], 2.0, 9)

    def test_shape_and_text_aspect_never_changes(self):
        checked = 0
        for w, h in TARGETS:
            o = run(src(SHAPE, TEXT), w, h)
            self.assertAlmostEqual(o["s"]["width"] / o["s"]["height"], 1.0, 9)
            if 40 * min(w, h) / 1000 >= 6.0:  # uniform path (P5b: below the 6px floor the text is re-fit, see test_text_fit)
                self.assertAlmostEqual(o["t"]["width"] / o["t"]["height"], 5.0, 9)
            else:
                self.assertGreaterEqual(o["t"]["font_size"], 6.0)  # refit path, covered in depth by test_text_fit
            checked += 1 if 40 * min(w, h) / 1000 >= 6.0 else 0
        self.assertGreaterEqual(checked, 3, "uniform-path assertion must stay exercised")

    def test_contain_image_covering_canvas_is_not_stretched(self):
        o = run(src(dict(COVER, fit="contain")), 2000, 500)["cv"]
        self.assertAlmostEqual(o["width"] / o["height"], 1.0, 9)


class Groups(unittest.TestCase):
    def test_members_keep_relative_layout(self):
        a = dict(SHAPE, id="a", group_id="g", x=100, y=100, width=100, height=100)
        b = dict(SHAPE, id="b", group_id="g", x=300, y=150, width=60, height=40)
        for w, h in TARGETS:
            with self.subTest(target=(w, h)):
                k = min(w / 1000, h / 1000)
                o = run(src(a, b), w, h)
                self.assertAlmostEqual(o["b"]["x"] - o["a"]["x"], 200 * k)
                self.assertAlmostEqual(o["b"]["y"] - o["a"]["y"], 50 * k)
                self.assertAlmostEqual(o["b"]["width"], 60 * k)
                self.assertAlmostEqual(o["b"]["height"], 40 * k)

    def test_grouped_full_canvas_shape_is_not_stretched(self):
        o = run(src(dict(BG, group_id="g")), 2000, 500)["bg"]
        self.assertAlmostEqual(o["width"], 500)
        self.assertAlmostEqual(o["height"], 500)
        self.assertAlmostEqual(o["x"], 750)


class Inside(unittest.TestCase):
    def test_inside_source_stays_inside_target(self):
        for w, h in TARGETS:
            for e in resize(src(TEXT, SHAPE, IMG), {"width": w, "height": h})["elements"]:
                with self.subTest(target=(w, h), id=e["id"]):
                    self.assertGreaterEqual(e["x"], -1e-9)
                    self.assertGreaterEqual(e["y"], -1e-9)
                    self.assertLessEqual(e["x"] + e["width"], w + 1e-9)
                    self.assertLessEqual(e["y"] + e["height"], h + 1e-9)


class Bleed(unittest.TestCase):
    def test_ungrouped_full_canvas_shape_fills_target(self):
        for w, h in TARGETS:
            o = run(src(BG, TEXT), w, h)["bg"]
            self.assertEqual((o["x"], o["y"], o["width"], o["height"]), (0, 0, w, h))

    def test_ungrouped_full_canvas_cover_image_fills_target(self):
        o = run(src(COVER), 2000, 500)["cv"]
        self.assertEqual((o["x"], o["y"], o["width"], o["height"]), (0, 0, 2000, 500))
        self.assertEqual(o["fit"], "cover")

    def test_partial_shape_is_not_bled(self):
        o = run(src(dict(BG, width=900)), 2000, 500)["bg"]
        self.assertLess(o["width"], 2000)

    def test_identity_exact(self):
        s = src(BG, TEXT, SHAPE, IMG, COVER)
        self.assertEqual(resize(s, {"width": 1000, "height": 1000}), s)


class OffCanvasSource(unittest.TestCase):
    def test_off_canvas_source_element_is_accepted_and_scaled(self):  # L2 sample deco_circle_1 sits at (-100,-100)
        deco = dict(SHAPE, id="deco", shape_type="ellipse", x=-100, y=-100, width=300, height=300)
        o = run(src(deco), 500, 500)["deco"]  # s = 0.5
        self.assertAlmostEqual(o["x"], -50)
        self.assertAlmostEqual(o["y"], -50)
        self.assertAlmostEqual(o["width"], 150)


class Impossible(unittest.TestCase):
    def test_font_below_schema_minimum_floors_at_one(self):  # documented rule: public sample level3 legal_text scales to 0.8; raising would fail it
        o = run(src(dict(TEXT, font_size=12, group_id="g")), 67, 67)["t"]  # grouped: protected uniform path keeps the original rule
        self.assertEqual(o["font_size"], 1.0)
        self.assertGreaterEqual(run(src(dict(TEXT, font_size=12)), 67, 67)["t"]["font_size"], 6.0)  # ungrouped: P5 refit path
        self.assertAlmostEqual(run(src(dict(TEXT, font_size=40)), 500, 500)["t"]["font_size"], 20)

    def test_overflowing_geometry_raises_naming_id(self):
        big = dict(SHAPE, x=1e308, width=1e308)
        with self.assertRaisesRegex(ValueError, "'s'"):
            resize(src(big), {"width": 99999, "height": 99999})


class Deterministic(unittest.TestCase):
    def test_same_input_byte_identical(self):
        for w, h in TARGETS:
            a = json.dumps(resize(src(BG, TEXT, SHAPE, IMG, COVER), {"width": w, "height": h}), allow_nan=False)
            b = json.dumps(resize(src(BG, TEXT, SHAPE, IMG, COVER), {"width": w, "height": h}), allow_nan=False)
            self.assertEqual(a, b)


if __name__ == "__main__":
    unittest.main()
