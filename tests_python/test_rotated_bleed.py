"""Rotated full-bleed frames use the uniform fallback. Geometry-only, no asset or renderer claim."""
import copy
import math
import unittest
from engine.resize import resize


def element(kind, rotation=90, **kw):
    e = {"id": "plate", "type": kind, "x": 0, "y": 0, "width": 100, "height": 100,
         "rotation": rotation, "z_index": 7, "opacity": 0.6}
    if kind == "shape":
        e.update(shape_type="rectangle", fill_color="rgba(255,0,0,1)", corner_radius=0)
    else:
        e.update(asset_id="geometry-only.png", fit="cover")
    e.update(kw)
    return e


def source(*els):
    return {"canvas": {"width": 100, "height": 100}, "elements": list(els)}


def corners(e):
    """Independent frame-centred rotation, not the engine's AABB helper."""
    r = math.radians(e.get("rotation", 0))
    c, s = math.cos(r), math.sin(r)
    cx, cy = e["x"] + e["width"] / 2, e["y"] + e["height"] / 2
    return [(cx + dx * c - dy * s, cy + dx * s + dy * c)
            for dx in (-e["width"] / 2, e["width"] / 2)
            for dy in (-e["height"] / 2, e["height"] / 2)]


class RotatedBleed(unittest.TestCase):
    def test_quarter_turn_full_canvas_frames_use_uniform_fallback(self):
        for kind in ("shape", "image"):
            for rotation in (90, -90):
                for width in (200, 201):
                    with self.subTest(kind=kind, rotation=rotation, width=width):
                        e = resize(source(element(kind, rotation)), {"width": width, "height": 100})["elements"][0]
                        self.assertEqual((e["x"], e["y"], e["width"], e["height"]), ((width - 100) / 2, 0, 100, 100))

    def test_quarter_turn_source_inside_does_not_gain_target_overhang(self):
        for kind in ("shape", "image"):
            for rotation in (90, -90):
                for width in (200, 201):
                    with self.subTest(kind=kind, rotation=rotation, width=width):
                        src = source(element(kind, rotation))
                        for x, y in corners(src["elements"][0]):
                            self.assertTrue(-1e-9 <= x <= 100 + 1e-9 and -1e-9 <= y <= 100 + 1e-9)
                        out = resize(src, {"width": width, "height": 100})["elements"][0]
                        for x, y in corners(out):
                            self.assertTrue(-1e-9 <= x <= width + 1e-9 and -1e-9 <= y <= 100 + 1e-9, (x, y))

    def test_axis_aligned_full_bleed_keeps_filling_target(self):
        for kind in ("shape", "image"):
            for rotation in (0, 180, -180, 360, -360):
                with self.subTest(kind=kind, rotation=rotation):
                    e = resize(source(element(kind, rotation)), {"width": 200, "height": 100})["elements"][0]
                    self.assertEqual((e["x"], e["y"], e["width"], e["height"]), (0, 0, 200, 100))
                    self.assertEqual(e["rotation"], rotation)

    def test_noncover_images_and_nonrectangle_shapes_keep_uniform_transform(self):
        for e in (element("image", 0, fit="contain"), element("image", 0, fit="fill"),
                  element("shape", 0, shape_type="ellipse"), element("shape", 0, shape_type="line")):
            with self.subTest(type=e["type"], fit=e.get("fit"), shape_type=e.get("shape_type")):
                out = resize(source(e), {"width": 200, "height": 100})["elements"][0]
                self.assertEqual((out["x"], out["y"], out["width"], out["height"]), (50, 0, 100, 100))

    def test_absent_rotation_keeps_existing_bleed(self):
        for kind in ("shape", "image"):
            e = element(kind)
            del e["rotation"]
            out = resize(source(e), {"width": 200, "height": 100})["elements"][0]
            self.assertEqual((out["x"], out["y"], out["width"], out["height"]), (0, 0, 200, 100))
            self.assertNotIn("rotation", out)

    def test_oversized_rotated_identity_keeps_source_overhang(self):
        for kind in ("shape", "image"):
            for rotation in (90, -90):
                with self.subTest(kind=kind, rotation=rotation):
                    src = source(element(kind, rotation, x=-10, y=-10, width=120, height=120))
                    self.assertEqual(resize(src, {"width": 100, "height": 100}), src)

    def test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment(self):
        for kind in ("shape", "image"):
            for rotation in (1e-12, -1e-12):
                with self.subTest(kind=kind, rotation=rotation):
                    out = resize(source(element(kind, rotation)), {"width": 200, "height": 100})["elements"][0]
                    self.assertEqual((out["x"], out["y"], out["width"], out["height"]), (50, 0, 100, 100))
                    self.assertEqual(out["rotation"], rotation)

    def test_grouped_quarter_turn_frames_keep_uniform_transform(self):
        for kind in ("shape", "image"):
            for rotation in (90, -90):
                with self.subTest(kind=kind, rotation=rotation):
                    e = resize(source(element(kind, rotation, group_id="g")), {"width": 200, "height": 100})["elements"][0]
                    self.assertEqual((e["x"], e["y"], e["width"], e["height"]), (50, 0, 100, 100))
                    self.assertEqual(e["group_id"], "g")

    def test_identity_is_exact(self):
        for kind in ("shape", "image"):
            for rotation in (90, -90, 0, 180, 360):
                with self.subTest(kind=kind, rotation=rotation):
                    src = source(element(kind, rotation))
                    self.assertEqual(resize(src, {"width": 100, "height": 100}), src)

    def test_partial_frames_keep_uniform_transform(self):
        for kind in ("shape", "image"):
            for rotation in (0, 90, -90):
                with self.subTest(kind=kind, rotation=rotation):
                    e = resize(source(element(kind, rotation, width=80)), {"width": 200, "height": 100})["elements"][0]
                    self.assertEqual((e["x"], e["y"], e["width"], e["height"]), (50, 0, 80, 100))

    def test_source_order_and_protected_values_are_preserved(self):
        els = [element("shape", 90), element("image", -90, id="image", z_index=-2),
               element("shape", 0, id="grouped", group_id="g")]
        src = source(*els)
        before = copy.deepcopy(src)
        out = resize(src, {"width": 201, "height": 100})
        self.assertEqual(src, before)
        self.assertEqual([e["id"] for e in out["elements"]], [e["id"] for e in els])
        for a, b in zip(els, out["elements"]):
            self.assertEqual({k: v for k, v in a.items() if k not in ("x", "y", "width", "height")},
                             {k: v for k, v in b.items() if k not in ("x", "y", "width", "height")})


if __name__ == "__main__":
    unittest.main()
