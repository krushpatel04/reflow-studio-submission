"""P7: ungrouped non-bg shapes are obstacles for repacked text and P6 groups. Geometry facts only; no layout-quality claim."""
import copy
import hashlib
import json
import os
import sys
import unittest

from engine.resize import resize
from engine.text_fit import aabb
from tests_python.test_text_fit import FLOOR, FONTS, SKIP, sample

TC = {"width": 150, "height": 100}
# #147: Skia float advances are platform-dependent. macOS widens only subhead
# (585->595) and legal copy (344->354); Linux retains its prior metric policy.
# Actual rendered visibility is independently asserted in test_legal_line_fit.
L3_HASH = ("77633c5be4f7b15c80ef89fe743fde35317c89d2a4021902bc342e3d6b59f8e1" if sys.platform == "darwin"
           else "0ba3602618ed7d34ce66015205b54ae7e1056c41dbef2af0b2db65c6bc81ce0a")
BASE_HASH = {"level1_warmup": "5553467cf7ae106de6c6502aec567c3f23c5a953d4a43c47a4ef5c98b8f4e23a",
             "level2_core": {"darwin": "6c74bf04d6102e7c5bc6c68d62c647b49ec934ba5fcdaff08ed9cfa93ff427ff",
                             "linux": "8955ad6bf37c7da603263d639f82adc1217b8ac093da4ea73db7ea1237ce1990"}[sys.platform],
             "level3_advanced": L3_HASH}


def hit(p, q):
    return p[0] < q[2] and q[0] < p[2] and p[1] < q[3] and q[1] < p[3]


def shape(id_, x, y, w, h, st="rectangle", **kw):
    return dict({"id": id_, "type": "shape", "shape_type": st, "fill_color": "rgba(1,2,3,1)", "x": x, "y": y, "width": w, "height": h}, **kw)


def txt(id_, x, y, w, h, size, content="Headline", **kw):
    return dict({"id": id_, "type": "text", "x": x, "y": y, "width": w, "height": h, "content": content, "font_family": "Solstice Sans",
                 "font_size": size, "color": "rgba(0,0,0,1)"}, **kw)


def run(els, tc=TC):
    return {e["id"]: e for e in resize({"canvas": {"width": 1200, "height": 1200}, "elements": copy.deepcopy(els)}, tc)["elements"]}


@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class ShapeObstacles(unittest.TestCase):
    def test_red_text_does_not_land_on_rectangle_or_ellipse_it_was_clear_of(self):
        els = [shape("box", 0, 0, 90, 90), shape("dot", 200, 0, 300, 100, "ellipse"), txt("h", 100, 400, 700, 100, 48), txt("r", 100, 700, 300, 80, 40, "Tag", rotation=90)]
        o = run(els)
        for t in ("h", "r"):
            self.assertGreaterEqual(o[t]["font_size"], FLOOR)
            for s in ("box", "dot"):
                self.assertFalse(hit(aabb(o[t]), aabb(o[s])), f"{t} covers {s}")
        self.assertEqual(o["r"]["rotation"], 90)

    def test_positive_control_text_on_its_own_card_is_not_blocked(self):
        els = [shape("card", 0, 0, 200, 200), txt("over", 0, 150, 300, 60, 40, "On the card")]
        keys = ("x", "y", "width", "height", "font_size")
        none = run([els[1]])["over"]
        self.assertEqual({k: run(els)["over"][k] for k in keys}, {k: none[k] for k in keys})

    def test_full_bleed_ungrouped_rectangle_is_never_an_obstacle(self):
        els = [shape("bg", 0, 0, 1200, 1200), txt("h", 100, 400, 700, 100, 48)]
        keys = ("x", "y", "width", "height", "font_size")
        self.assertEqual({k: run(els)["h"][k] for k in keys}, {k: run([els[1]])["h"][k] for k in keys})

    def test_full_bleed_shape_not_an_obstacle_for_text_outside_its_source_rect(self):
        """Text below the source canvas is not exempt from the stretched bg (it fills the whole target). If bg blocked, nothing would pack, the
        fallback would ignore 'pic' too, and the text would land on it. Correct: bg ignored, pic still avoided."""
        pic = {"id": "pic", "type": "image", "x": 0, "y": -5400, "width": 1200, "height": 1200, "asset_id": "a.png", "fit": "contain"}
        o = run([shape("bg", 0, 0, 1200, 1200), pic, txt("t", 100, 1250, 700, 100, 40, "Below")], {"width": 100, "height": 1000})
        self.assertEqual(aabb(o["bg"]), (0.0, 0.0, 100.0, 1000.0))
        self.assertGreaterEqual(o["t"]["font_size"], FLOOR)
        self.assertFalse(hit(aabb(o["t"]), aabb(o["pic"])), "text covers pic: bg was treated as an obstacle")

    def test_group_without_source_overlap_avoids_shape_and_with_overlap_is_exempt(self):
        def grp(w):
            return [shape("g_bg", 600, 0, 100, 40, group_id="g"), txt("g_l", 600, 0, 100, 40, 20, "Hi", group_id="g")]
        s = shape("blk", 0, 0, 60, 60)
        o = run([s] + grp(0), {"width": 100, "height": 100})
        for g in ("g_bg", "g_l"):
            self.assertFalse(hit(aabb(o[g]), aabb(o["blk"])), g)
        self.assertGreaterEqual(o["g_l"]["font_size"], FLOOR - 1e-9)
        s2 = shape("blk", 600, 0, 100, 40)  # overlaps the group members in the source: exempt, group placed as if it were absent
        a = run([s2] + grp(0), {"width": 100, "height": 100})
        b = run(grp(0), {"width": 100, "height": 100})
        for g in ("g_bg", "g_l"):
            self.assertEqual({k: a[g][k] for k in "xy"}, {k: b[g][k] for k in "xy"})

    def test_union_box_overlap_alone_does_not_exempt_a_shape(self):
        s = shape("mid", 150, 0, 100, 40)  # between the two members, overlapping neither
        els = [s, txt("g_l", 0, 0, 100, 40, 10, "Hi", group_id="g"), shape("g_bg", 300, 0, 100, 40, group_id="g")]
        o = run(els, {"width": 300, "height": 300})
        self.assertGreaterEqual(o["g_l"]["font_size"], FLOOR - 1e-9)
        for g in ("g_l", "g_bg"):
            self.assertFalse(hit(aabb(o[g]), aabb(o["mid"])), g)

    def test_no_fit_equals_shapes_ignored_placement(self):
        wall = shape("wall", 300, 0, 600, 1200)
        t = txt("t", 100, 900, 150, 100, 40, "Nowhere to go at all")
        got = run([wall, t], {"width": 100, "height": 30})["t"]
        base = run([t], {"width": 100, "height": 30})["t"]
        self.assertEqual(got, base)
        self.assertGreaterEqual(got["font_size"], FLOOR)

    def test_deterministic_repeat_and_permuted_order(self):
        els = [shape("box", 0, 0, 90, 90), txt("h", 100, 400, 700, 100, 48), txt("r", 100, 700, 300, 80, 40, "Tag", rotation=90)]
        self.assertEqual(json.dumps(run(els)), json.dumps(run(els)))
        self.assertEqual(run(els), run(list(reversed(els))))

    def test_public_samples_match_ink_safe_baseline(self):
        for n, want in BASE_HASH.items():
            t = sample(n)
            self.assertEqual(hashlib.sha256(json.dumps(resize(t["source"], t["target_canvas"]), sort_keys=True).encode()).hexdigest(), want, n)


if __name__ == "__main__":
    unittest.main()
