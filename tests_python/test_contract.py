"""P1 contract tests for engine.resize.resize (stdlib unittest). Run: python -m unittest discover -s tests_python -t . -v"""
import copy
import json
import unittest

from engine.resize import resize

TEXT = {"id": "t", "type": "text", "x": 100, "y": 200, "width": 400, "height": 80, "z_index": 3, "rotation": 5, "opacity": 0.8,
        "group_id": "g", "content": "Hi é", "font_family": "Solstice Serif", "font_size": 40, "font_weight": "bold",
        "font_style": "italic", "color": "rgba(1,2,3,0.5)", "text_align": "center", "line_height": 1.3, "letter_spacing": 2, "max_lines": 2,
        "style_runs": [{"start": 0, "end": 2, "color": "rgba(9,9,9,1)", "font_weight": "bold"}]}
IMG = {"id": "i", "type": "image", "x": 0, "y": 0, "width": 200, "height": 100, "z_index": 1, "asset_id": "a.png", "fit": "contain"}
SHAPE = {"id": "s", "type": "shape", "x": 10, "y": 10, "width": 50, "height": 50, "shape_type": "rectangle", "fill_color": "rgba(0,0,0,1)",
         "stroke_color": "rgba(1,1,1,1)", "stroke_width": 4, "corner_radius": 8}


def src(*els, w=1000, h=1000):
    return {"canvas": {"width": w, "height": h}, "elements": copy.deepcopy(list(els))}


def by_id(out):
    return {e["id"]: e for e in out["elements"]}


class Identity(unittest.TestCase):
    def test_same_canvas_is_identity(self):
        s = src(TEXT, IMG, SHAPE)
        out = resize(s, {"width": 1000, "height": 1000})
        self.assertEqual(out, s)

    def test_canvas_is_target_and_ids_exactly_once(self):
        s = src(TEXT, IMG, SHAPE)
        out = resize(s, {"width": 600, "height": 1500})
        self.assertEqual(out["canvas"], {"width": 600, "height": 1500})
        self.assertEqual(sorted(e["id"] for e in out["elements"]), ["i", "s", "t"])

    def test_source_order_kept(self):
        s = src(SHAPE, TEXT, IMG)
        out = resize(s, {"width": 500, "height": 500})
        self.assertEqual([e["id"] for e in out["elements"]], ["s", "t", "i"])

    def test_input_not_mutated_and_output_not_aliased(self):
        s = src(TEXT, IMG, SHAPE)
        before = json.dumps(s, sort_keys=True)
        t = {"width": 500, "height": 800}
        out = resize(s, t)
        self.assertEqual(json.dumps(s, sort_keys=True), before)
        out["elements"][0]["style_runs"][0]["color"] = "x"
        out["elements"][0]["style_runs"].append(1)
        out["canvas"]["width"] = 1
        self.assertEqual(json.dumps(s, sort_keys=True), before)
        self.assertEqual(t, {"width": 500, "height": 800})

    def test_no_role_sidecar_needed(self):
        for e in resize(src(TEXT, IMG, SHAPE), {"width": 300, "height": 300})["elements"]:
            self.assertNotIn("role", e)


class Preservation(unittest.TestCase):
    PROTECTED = ["content", "font_family", "font_weight", "font_style", "color", "text_align", "line_height", "max_lines", "style_runs",
                 "rotation", "opacity", "z_index", "group_id", "id", "type"]

    def test_text_fields_verbatim(self):
        out = by_id(resize(src(TEXT), {"width": 500, "height": 900}))["t"]
        for k in self.PROTECTED:
            self.assertEqual(out[k], TEXT[k], k)

    def test_image_and_shape_fields_verbatim(self):
        o = by_id(resize(src(IMG, SHAPE), {"width": 500, "height": 900}))
        for k in ("asset_id", "fit", "z_index", "type"):
            self.assertEqual(o["i"][k], IMG[k])
        for k in ("shape_type", "fill_color", "stroke_color", "type"):
            self.assertEqual(o["s"][k], SHAPE[k])

    def test_unknown_fields_pass_through(self):
        e = dict(SHAPE, _note="keep me", future_field={"a": [1, 2]})
        o = by_id(resize(src(e), {"width": 500, "height": 500}))["s"]
        self.assertEqual(o["_note"], "keep me")
        self.assertEqual(o["future_field"], {"a": [1, 2]})


class Layout(unittest.TestCase):
    def test_uniform_scale_and_centering(self):
        # 1000x1000 -> 2000x1000: scale 1, centered with 500px side margins
        o = by_id(resize(src(SHAPE), {"width": 2000, "height": 1000}))["s"]
        self.assertAlmostEqual(o["x"], 510); self.assertAlmostEqual(o["y"], 10)
        self.assertAlmostEqual(o["width"], 50); self.assertAlmostEqual(o["height"], 50)

    def test_aspect_ratio_preserved_for_non_cover_image(self):
        o = by_id(resize(src(IMG), {"width": 500, "height": 1500}))["i"]
        self.assertAlmostEqual(o["width"] / o["height"], 2.0)

    def test_font_and_scalars_scale_uniformly(self):
        o = by_id(resize(src(TEXT, SHAPE), {"width": 500, "height": 2000}))
        self.assertAlmostEqual(o["t"]["font_size"], 20)       # s = 0.5
        self.assertAlmostEqual(o["t"]["letter_spacing"], 1)
        self.assertAlmostEqual(o["s"]["corner_radius"], 4)
        self.assertAlmostEqual(o["s"]["stroke_width"], 2)

    def test_group_moves_as_unit(self):
        a = dict(SHAPE, id="a", group_id="g", x=100, y=100, width=100, height=100)
        b = dict(SHAPE, id="b", group_id="g", x=300, y=100, width=100, height=100)
        s = src(a, b)
        o = by_id(resize(s, {"width": 3000, "height": 500}))   # s = 0.5, offset x = 1250
        self.assertAlmostEqual(o["b"]["x"] - o["a"]["x"], 100)  # 200 * 0.5
        self.assertAlmostEqual(o["a"]["x"], 1250 + 50)

    def test_everything_inside_target_when_source_inside(self):
        o = resize(src(TEXT, IMG, SHAPE), {"width": 728, "height": 90})
        for e in o["elements"]:
            self.assertGreaterEqual(e["x"], -1e-9); self.assertGreaterEqual(e["y"], -1e-9)
            self.assertLessEqual(e["x"] + e["width"], 728 + 1e-9); self.assertLessEqual(e["y"] + e["height"], 90 + 1e-9)

    def test_cover_image_covering_canvas_fills_target(self):
        bg = {"id": "bg", "type": "image", "x": 0, "y": 0, "width": 1000, "height": 1000, "asset_id": "b.png", "fit": "cover"}
        o = by_id(resize(src(bg), {"width": 2000, "height": 500}))["bg"]
        self.assertEqual((o["x"], o["y"], o["width"], o["height"]), (0, 0, 2000, 500))
        self.assertEqual(o["fit"], "cover")

    def test_positive_control_cover_not_covering_canvas_keeps_aspect(self):
        c = {"id": "c", "type": "image", "x": 100, "y": 100, "width": 400, "height": 200, "asset_id": "b.png", "fit": "cover"}
        o = by_id(resize(src(c), {"width": 2000, "height": 500}))["c"]
        self.assertAlmostEqual(o["width"] / o["height"], 2.0)
        self.assertLess(o["width"], 2000)

    def test_positive_control_contain_full_canvas_not_stretched(self):
        c = {"id": "c", "type": "image", "x": 0, "y": 0, "width": 1000, "height": 1000, "asset_id": "b.png", "fit": "contain"}
        o = by_id(resize(src(c), {"width": 2000, "height": 500}))["c"]
        self.assertAlmostEqual(o["width"] / o["height"], 1.0)

    def test_zero_size_element_ok(self):
        z = dict(SHAPE, id="z", width=0, height=0)
        o = by_id(resize(src(z), {"width": 500, "height": 800}))["z"]
        self.assertEqual((o["width"], o["height"]), (0, 0))
        self.assertTrue(all(isinstance(o[k], (int, float)) for k in ("x", "y")))


class Validation(unittest.TestCase):
    T = {"width": 500, "height": 500}

    def bad(self, source, target=None):
        with self.assertRaises(ValueError):
            resize(source, target or self.T)

    def test_invalid_target_dims(self):
        for t in ({"width": 0, "height": 5}, {"width": 5, "height": -1}, {"width": True, "height": 5}, {"width": 5.5, "height": 5},
                  {"width": "5", "height": 5}, {"width": 5}, {"width": 1e9, "height": 1e9}):
            self.bad(src(SHAPE), t)

    def test_invalid_source_canvas(self):
        for w, h in ((0, 10), (10, 0), (True, 10), (10.5, 10)):
            self.bad(src(SHAPE, w=w, h=h))

    def test_nonfinite_and_bool_geometry(self):
        for k in ("x", "y", "width", "height"):
            for v in (float("nan"), float("inf"), float("-inf"), True, "1", None):
                self.bad(src(dict(SHAPE, **{k: v})))

    def test_negative_size_rejected(self):
        self.bad(src(dict(SHAPE, width=-1)))

    def test_huge_integer_reports_invalid_field(self):
        for key in ("x", "stroke_width"):
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, rf"source\.elements\[0\]\.{key}"):
                resize(src(dict(SHAPE, **{key: 10**1000})), self.T)
        self.assertEqual(resize(src(SHAPE), self.T)["elements"][0]["type"], "shape")

    def test_duplicate_and_missing_ids(self):
        self.bad(src(SHAPE, SHAPE))
        self.bad(src(dict(SHAPE, id="")))
        e = dict(SHAPE); del e["id"]
        self.bad(src(e))

    def test_font_size_must_be_valid_number(self):
        self.bad(src(dict(TEXT, font_size=True)))
        self.bad(src(dict(TEXT, font_size=float("nan"))))

    def test_invalid_element_type_reports_field(self):
        for value in (["text"], {"kind": "text"}, None, "unknown"):
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, r"source\.elements\[0\]\.type"):
                resize(src(dict(TEXT, type=value)), self.T)
        self.assertEqual([e["type"] for e in resize(src(TEXT, IMG, SHAPE), self.T)["elements"]],
                         ["text", "image", "shape"])

    def test_malformed_containers(self):
        self.bad({"canvas": {"width": 5, "height": 5}})
        self.bad({"canvas": {"width": 5, "height": 5}, "elements": []})
        self.bad({"canvas": {"width": 5, "height": 5}, "elements": [1]})
        self.bad([])


if __name__ == "__main__":
    unittest.main()
