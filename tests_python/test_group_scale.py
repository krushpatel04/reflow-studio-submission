"""P6: rigid per-group upscale for sub-floor grouped labels. Measured geometry only; no layout-quality claim."""
import copy
import json
import os
import unittest

from engine.resize import resize
from tests_python.test_text_fit import FLOOR, FONTS, SKIP, sample

TC = {"width": 728, "height": 90}
GROUPS = ("badge1", "badge2", "badge3", "cta", "ribbon")


def txt(id_, x, y, w, h, size, **kw):
    return dict({"id": id_, "type": "text", "x": x, "y": y, "width": w, "height": h, "content": "Hi", "font_family": "Solstice Sans",
                 "font_size": size, "color": "rgba(0,0,0,1)"}, **kw)


def plate(id_, x, y, w, h, **kw):
    return dict({"id": id_, "type": "shape", "shape_type": "rectangle", "fill_color": "rgba(1,2,3,1)", "x": x, "y": y, "width": w, "height": h}, **kw)


def by(out):
    return {e["id"]: e for e in out["elements"]}


@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class L3GroupScale(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        t = sample("level3_advanced")
        cls.src = t["source"]
        cls.s = min(728 / 1080, 90 / 1350)
        cls.out = resize(cls.src, TC)
        cls.o, cls.i = by(cls.out), by(cls.src)

    def k_of(self, g):
        """One ratio per group across ALL members: width, height, font and offsets from the plate. Returns it."""
        bg, ks = f"{g}_bg", []
        for e in self.src["elements"]:
            if e.get("group_id") != g:
                continue
            o = self.o[e["id"]]
            ks += [o["width"] / e["width"], o["height"] / e["height"]]
            if e["type"] == "text":
                ks.append(o["font_size"] / e["font_size"])
            if e["id"] != bg:
                for a in ("x", "y"):
                    if e[a] != self.i[bg][a]:
                        ks.append((o[a] - self.o[bg][a]) / (e[a] - self.i[bg][a]))
        for k in ks:
            self.assertAlmostEqual(k, ks[0], 6, g)
        return ks[0]

    def test_compact_banner_labels_are_readable_and_contained_by_their_plates(self):
        for g in GROUPS:
            with self.subTest(g):
                p,l=self.o[f"{g}_bg"],self.o[f"{g}_label"]
                self.assertGreaterEqual(l['font_size'],9)
                for axis,dim in [('x','width'),('y','height')]:
                    self.assertAlmostEqual(p[axis]+p[dim]/2,l[axis]+l[dim]/2)
                    self.assertGreaterEqual(p[dim],l[dim])

    def test_larger_format_retains_the_rigid_group_fallback(self):
        o=by(resize(self.src, {'width':728,'height':600}))
        for g in GROUPS:
            plate,label=o[f'{g}_bg'],o[f'{g}_label']
            k=plate['width']/self.i[f'{g}_bg']['width']
            for e in (plate,label):
                old=self.i[e['id']]
                self.assertAlmostEqual(e['width']/old['width'],k)
                self.assertAlmostEqual(e['height']/old['height'],k)

    def test_groups_do_not_overlap_each_other_or_logo_product(self):
        from engine.text_fit import aabb
        boxes = {g: [aabb(self.o[e["id"]]) for e in self.src["elements"] if e.get("group_id") == g] for g in GROUPS}
        hit = lambda a, b: a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]
        for g, bs in boxes.items():
            for other in (*[h for h in GROUPS if h > g], "logo", "product"):
                ob = boxes[other] if other in boxes else [aabb(self.o[other])]
                self.assertFalse(any(hit(a, b) for a in bs for b in ob), f"{g} vs {other}")

    def test_group_with_no_source_overlap_treats_ungrouped_image_as_obstacle(self):
        """Every L3 group overlaps only bg in the source, so logo/product are obstacles for all of them."""
        from engine.text_fit import aabb
        for g in GROUPS:
            for im in ("logo", "product"):
                for e in self.src["elements"]:
                    if e.get("group_id") == g:
                        a, b = aabb(self.o[e["id"]]), aabb(self.o[im])
                        self.assertFalse(a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3], f"{e['id']} on {im}")

    def test_unaffected_ungrouped_and_group_order_deterministic(self):
        self.assertEqual(json.dumps(self.out), json.dumps(resize(self.src, TC)))
        rev = copy.deepcopy(self.src)
        rev["elements"].reverse()
        self.assertEqual(by(resize(rev, TC)), self.o)


@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class Controls(unittest.TestCase):
    def test_single_text_group_is_not_scaled(self):
        src = {"canvas": {"width": 1000, "height": 1000}, "elements": [txt("t", 100, 200, 400, 80, 12, group_id="g")]}
        self.assertEqual(resize(src, {"width": 67, "height": 67})["elements"][0]["font_size"], 1.0)

    def test_no_fit_equals_uniform_p5b(self):
        """Plate as tall as the source: any k > s leaves the 100x30 target, so the group stays at the uniform placement."""
        els = [plate("g_bg", 450, 0, 100, 1000, group_id="g"), txt("g_l", 450, 400, 100, 100, 10, group_id="g")]
        src = {"canvas": {"width": 1000, "height": 1000}, "elements": els}
        out = resize(src, {"width": 100, "height": 30})
        s = 0.03
        for e, o in zip(els, out["elements"]):
            self.assertAlmostEqual(o["width"], e["width"] * s)
            self.assertAlmostEqual(o["height"], e["height"] * s)
            self.assertAlmostEqual(o["x"], e["x"] * s + 35)
            self.assertAlmostEqual(o["y"], e["y"] * s)

    def test_groups_pack_in_source_y_order_not_id_or_input_order(self):
        def grp(g, y):
            return [plate(g + "_bg", 0, y, 500, 50, group_id=g), txt(g + "_l", 0, y, 500, 50, 20, group_id=g)]
        for order in (("a", "b"), ("b", "a")):
            src = {"canvas": {"width": 1000, "height": 1000}, "elements": [e for g in order for e in grp(g, 600 if g == "a" else 100)]}
            o = by(resize(src, {"width": 1000, "height": 100}))
            self.assertEqual((o["b_bg"]["x"], o["a_bg"]["x"]), (0.0, 152.0))  # b is higher in the source, so it is placed first

    def test_union_box_overlap_alone_does_not_exempt_an_image(self):
        """Members at x0-100 and x300-400, image at x150-250 between them: the union box overlaps the image, no single member does."""
        from engine.text_fit import aabb
        pic = {"id": "pic", "type": "image", "x": 150, "y": 0, "width": 100, "height": 40, "asset_id": "a.png", "fit": "contain"}
        els = [pic, txt("g_l", 0, 0, 100, 40, 10, group_id="g"), plate("g_bg", 300, 0, 100, 40, group_id="g")]
        o = by(resize({"canvas": {"width": 1000, "height": 1000}, "elements": els}, {"width": 300, "height": 300}))
        self.assertGreaterEqual(o["g_l"]["font_size"], FLOOR - 1e-9)  # the group was upscaled, so the obstacle test is not vacuous
        p = aabb(o["pic"])
        for g in ("g_l", "g_bg"):
            a = aabb(o[g])
            self.assertFalse(a[0] < p[2] and p[0] < a[2] and a[1] < p[3] and p[1] < a[3], f"{g} overlaps pic")

    def test_ungrouped_text_cannot_pack_reverts_groups_to_exact_p5b(self):
        """Group fits at k>1 but a 30-char unbreakable ungrouped text cannot reach 6px in a 100x20 target: groups revert to the uniform placement."""
        import warnings
        els = [plate("g_bg", 0, 0, 100, 40, group_id="g"), txt("g_l", 0, 0, 100, 40, 20, group_id="g"), txt("u", 0, 500, 900, 200, 60, content="W" * 30)]
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            o = by(resize({"canvas": {"width": 1000, "height": 1000}, "elements": els}, {"width": 100, "height": 20}))
        self.assertTrue(any("no candidate meets the floor" in str(x.message) for x in w))
        s = 0.02
        self.assertAlmostEqual(o["g_bg"]["width"], 100 * s)
        self.assertEqual(o["g_l"]["font_size"], 1.0)
        self.assertAlmostEqual(o["g_l"]["width"], 100 * s)
        self.assertAlmostEqual(o["u"]["width"], 900 * s)
        self.assertAlmostEqual(o["u"]["font_size"], 60 * s)

    def test_ladder_ends_exactly_at_s(self):
        from engine.text_fit import ladder
        lad = ladder(0.4, 0.0667)
        self.assertEqual(lad[0], 0.4)
        self.assertEqual(lad[-1], 0.0667)
        self.assertTrue(all(a > b for a, b in zip(lad, lad[1:])))
        self.assertEqual(ladder(0.05, 0.0667), [0.0667])


if __name__ == "__main__":
    unittest.main()
