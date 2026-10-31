"""P5: text-fit for extreme aspect changes. Measured facts only; no layout-quality claim. Skipped loudly without the pinned upstream."""
import copy
import hashlib
import json
import math
import os
import sys
import unittest
import warnings

from engine.resize import resize

UPSTREAM = os.environ.get("CHAMELEON_UPSTREAM", "/nonexistent")
FONTS = os.path.join(UPSTREAM, "brand_kit", "fonts")
SKIP = f"pinned upstream not found at {UPSTREAM}; set CHAMELEON_UPSTREAM"
FLOOR = 6.0   # same value as engine.text_fit.FLOOR_PX, repeated on purpose so the test fails on behavior, not on import
LINE_H = 1.2  # upstream renderer default line height
BASE_HASH = {  # sha256(json.dumps(resize(...), sort_keys=True)); L2 includes the renderer-ink-safe wide text boxes
    "level1_warmup": "5553467cf7ae106de6c6502aec567c3f23c5a953d4a43c47a4ef5c98b8f4e23a",
    "level2_core": {
        "darwin": "6c74bf04d6102e7c5bc6c68d62c647b49ec934ba5fcdaff08ed9cfa93ff427ff",
        "linux": "8955ad6bf37c7da603263d639f82adc1217b8ac093da4ea73db7ea1237ce1990",
    }[sys.platform],
}


def sample(name):
    with open(os.path.join(UPSTREAM, "input", f"chameleon_sample_{name}.json")) as f:
        return json.load(f)


def font_for(e, size):
    from PIL import ImageFont
    fam = "SolsticeSerif" if "Serif" in e["font_family"] else "SolsticeSans"
    bold, ital = e.get("font_weight") == "bold", e.get("font_style") == "italic"
    style = {(False, False): "Regular", (True, False): "Bold", (False, True): "Italic", (True, True): "BoldItalic"}[(bold, ital)]
    if fam == "SolsticeSerif" and style == "BoldItalic":
        style = "Bold"  # the kit has no serif bold-italic file
    # Independent wrapping/overflow probe, using the documented BASIC metric policy.
    # This is not a Skia glyph-shaping or complex-script parity assertion.
    return ImageFont.truetype(os.path.join(FONTS, f"{fam}-{style}.ttf"), size, layout_engine=ImageFont.Layout.BASIC)


def lines_of(e):
    """Greedy word wrap at the element width, same rule as upstream wrap_text; returns (lines, max line width)."""
    f = font_for(e, e["font_size"])
    out = []
    for para in e["content"].split("\n"):
        cur = ""
        for w in para.split(" "):
            c = f"{cur} {w}" if cur else w
            if cur and f.getlength(c) > e["width"]:
                out.append(cur)
                cur = w
            else:
                cur = c
        out.append(cur)
    return out, max(f.getlength(l) for l in out)


def texts(out):
    return [e for e in out["elements"] if e["type"] == "text"]


def overflow(e, tol=0.5):
    ls, mw = lines_of(e)
    return mw > e["width"] + tol or len(ls) * e["font_size"] * LINE_H > e["height"] + tol


def overlap(a, b):
    return a["x"] < b["x"] + b["width"] and b["x"] < a["x"] + a["width"] and a["y"] < b["y"] + b["height"] and b["y"] < a["y"] + a["height"]


def synthetic():
    els = [{"id": "h", "type": "text", "x": 100, "y": 100, "width": 1000, "height": 160, "content": "A rather long headline for a tiny strip banner",
            "font_family": "Solstice Serif", "font_size": 64, "font_weight": "bold", "color": "rgba(0,0,0,1)", "rotation": 0},
           {"id": "s", "type": "text", "x": 100, "y": 300, "width": 1000, "height": 100, "content": "Subline that also has to survive",
            "font_family": "Solstice Sans", "font_size": 36, "color": "rgba(0,0,0,1)"},
           {"id": "c", "type": "text", "x": 100, "y": 450, "width": 400, "height": 80, "content": "Shop now", "font_family": "Solstice Sans",
            "font_size": 40, "font_weight": "bold", "color": "rgba(0,0,0,1)", "rotation": 7}]
    return {"canvas": {"width": 1200, "height": 1200}, "elements": els}, {"width": 1000, "height": 60}


@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class L3ToStrip(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        t = sample("level3_advanced")
        cls.src, cls.target = t["source"], t["target_canvas"]
        cls.before = copy.deepcopy(cls.src)
        cls.out = resize(cls.src, cls.target)

    def test_target_is_the_extreme_strip(self):
        self.assertEqual(self.target, {"width": 728, "height": 90})

    def test_no_ungrouped_text_below_pixel_floor(self):
        for e in (e for e in texts(self.out) if not e.get("group_id")):
            with self.subTest(e["id"]):
                self.assertGreaterEqual(e["font_size"], FLOOR, f"{e['id']} font_size {e['font_size']:.2f}px")

    def test_grouped_texts_below_floor_are_the_measured_unmet_list(self):
        """P6 (was: {badge1/2/3_label 1.0, cta_label 1.47, ribbon_label 1.33}). Unmet set is measured from the run, never claimed beyond it.
        On L3 -> 728x90 every group is upscaled to the floor; the empty set is asserted together with the checks that make it mean something."""
        unmet = {e["id"]: round(e["font_size"], 2) for e in texts(self.out) if e.get("group_id") and e["font_size"] < FLOOR - 1e-9}
        self.assertEqual(unmet, {})
        by = {e["id"]: e for e in self.out["elements"]}
        self.assertEqual({e["id"]: e["group_id"] for e in self.out["elements"] if e.get("group_id")},
                         {e["id"]: e["group_id"] for e in self.src["elements"] if e.get("group_id")})
        self.assertEqual((by["ribbon_label"]["rotation"], by["ribbon_bg"]["rotation"]), (-12, -12))

    def test_no_fit_keeps_the_old_p5b_unmet_pin(self):
        """No-fit fixture: the plate is as tall as the source, so no k > s fits a 100x30 target; output is the uniform P5b placement (label 1px)."""
        els = [{"id": "g_bg", "type": "shape", "shape_type": "rectangle", "fill_color": "rgba(1,2,3,1)", "x": 450, "y": 0, "width": 100, "height": 1000, "group_id": "g"},
               {"id": "g_l", "type": "text", "x": 450, "y": 400, "width": 100, "height": 100, "content": "Hi", "font_family": "Solstice Sans", "font_size": 10,
                "color": "rgba(0,0,0,1)", "group_id": "g"}]
        o = resize({"canvas": {"width": 1000, "height": 1000}, "elements": els}, {"width": 100, "height": 30})["elements"]
        self.assertEqual({e["id"]: round(e["font_size"], 2) for e in o if e["type"] == "text"}, {"g_l": 1.0})
        self.assertEqual((o[0]["width"], o[0]["height"]), (3.0, 30.0))

    def test_no_ungrouped_text_overflows_its_own_box(self):
        for e in (e for e in texts(self.out) if not e.get("group_id")):
            with self.subTest(e["id"]):
                # Pillow BASIC can wrap to two lines where the actual pinned
                # Skia renderer wraps to one. Measure the real output ink.
                from pathlib import Path
                from scripts.quality.text_ink import probe
                r=probe(e['content'],e['font_family'],e.get('font_weight','regular'),e['font_size'],e['x'],e['y'],e['width'],e['height'],(728,90),Path(UPSTREAM),e.get('rotation',0))
                self.assertGreater(r['ink_px'],0)
                self.assertEqual((r['lost_px'],r['overflow_px']),(0,0))

    def test_no_ungrouped_text_overlaps_grouped_or_other_text_ungrouped_images_excluded(self):
        from engine.text_fit import aabb
        free = [e for e in texts(self.out) if not e.get("group_id")]
        others = [e for e in self.out["elements"] if e.get("group_id") or e in free]
        for a in free:
            for b in others:
                if a is b:
                    continue
                with self.subTest(f"{a['id']}/{b['id']}"):
                    p, q = aabb(a), aabb(b)
                    self.assertFalse(p[0] < q[2] and q[0] < p[2] and p[1] < q[3] and q[1] < p[3])

    def test_ungrouped_text_does_not_newly_overlap_ungrouped_image(self):
        """R6: a re-fit text may keep a source overlap with an image, but must not start covering one it cleared in the source."""
        from engine.text_fit import aabb
        hit = lambda p, q: p[0] < q[2] and q[0] < p[2] and p[1] < q[3] and q[1] < p[3]
        src = {e["id"]: e for e in self.src["elements"]}
        out = {e["id"]: e for e in self.out["elements"]}
        checked = 0
        for t in (e for e in self.src["elements"] if e["type"] == "text" and not e.get("group_id")):
            for i in (e for e in self.src["elements"] if e["type"] == "image" and not e.get("group_id")):
                if hit(aabb(src[t["id"]]), aabb(src[i["id"]])):
                    continue
                checked += 1
                with self.subTest(f"{t['id']}/{i['id']}"):
                    self.assertFalse(hit(aabb(out[t["id"]]), aabb(out[i["id"]])), f"{t['id']} {aabb(out[t['id']])} covers {i['id']} {aabb(out[i['id']])}")
        self.assertGreater(checked, 0)

    def test_text_boxes_inside_target(self):
        for e in texts(self.out):
            with self.subTest(e["id"]):
                self.assertGreaterEqual(e["x"], -1e-9)
                self.assertGreaterEqual(e["y"], -1e-9)
                self.assertLessEqual(e["x"] + e["width"], self.target["width"] + 1e-9)
                self.assertLessEqual(e["y"] + e["height"], self.target["height"] + 1e-9)

    def test_ids_order_and_non_geometry_fields_preserved(self):
        geom = {"x", "y", "width", "height", "font_size", "letter_spacing", "corner_radius", "stroke_width"}
        self.assertEqual([e["id"] for e in self.out["elements"]], [e["id"] for e in self.src["elements"]])
        for a, b in zip(self.src["elements"], self.out["elements"]):
            self.assertEqual({k: v for k, v in b.items() if k not in geom}, {k: v for k, v in a.items() if k not in geom}, a["id"])

    def test_rotation_untouched(self):
        for a, b in zip(self.src["elements"], self.out["elements"]):
            self.assertEqual(b.get("rotation", "<absent>"), a.get("rotation", "<absent>"), a["id"])

    def test_source_unmutated_and_deterministic(self):
        self.assertEqual(self.src, self.before)
        again = resize(copy.deepcopy(self.src), self.target)
        self.assertEqual(json.dumps(again), json.dumps(self.out))


@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class SyntheticStrip(unittest.TestCase):
    def test_floor_overflow_overlap_on_1200_square_to_1000x60(self):
        s, tc = synthetic()
        before = copy.deepcopy(s)
        out = resize(s, tc)
        self.assertEqual(s, before)
        ts = texts(out)
        self.assertEqual([e["id"] for e in ts], ["h", "s", "c"])
        for e in ts:
            with self.subTest(e["id"]):
                self.assertGreaterEqual(e["font_size"], FLOOR)
                self.assertFalse(overflow(e))
                self.assertLessEqual(e["y"] + e["height"], tc["height"] + 1e-9)
        for i, a in enumerate(ts):
            for b in ts[i + 1:]:
                self.assertFalse(overlap(a, b), f"{a['id']}/{b['id']}")
        self.assertEqual([e.get("rotation") for e in ts], [0, None, 7])


@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class GroupContainment(unittest.TestCase):
    """P5b invariant: group association is protected. Every grouped label stays inside its plate's bounds."""
    def inside(self, out):
        by = {e["id"]: e for e in out["elements"]}
        bad = []
        for e in out["elements"]:
            g = e.get("group_id")
            if g and e["type"] == "text":
                bg = by[g + "_bg"]
                if not (e["x"] >= bg["x"] - 1e-6 and e["y"] >= bg["y"] - 1e-6 and e["x"] + e["width"] <= bg["x"] + bg["width"] + 1e-6
                        and e["y"] + e["height"] <= bg["y"] + bg["height"] + 1e-6):
                    bad.append(e["id"])
        return bad

    def test_l3_728x90_labels_inside_plates(self):
        t = sample("level3_advanced")
        self.assertEqual(self.inside(resize(t["source"], t["target_canvas"])), [])

    def test_l3_narrow_target_labels_inside_plates(self):
        t = sample("level3_advanced")
        self.assertEqual(self.inside(resize(t["source"], {"width": 120, "height": 600})), [])


@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class RotatedBounds(unittest.TestCase):
    """Schema rotation = degrees clockwise about the element centre; bounds use the rotated axis-aligned box."""
    @staticmethod
    def aabb(e):
        r = math.radians(e.get("rotation", 0))
        w, h = abs(e["width"] * math.cos(r)) + abs(e["height"] * math.sin(r)), abs(e["width"] * math.sin(r)) + abs(e["height"] * math.cos(r))
        cx, cy = e["x"] + e["width"] / 2, e["y"] + e["height"] / 2
        return cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2

    def test_l3_rotated_group_inside_canvas_and_labels_inside_plate_box(self):
        t = sample("level3_advanced")
        out = resize(t["source"], t["target_canvas"])
        by = {e["id"]: e for e in out["elements"]}
        sb = {e["id"]: self.aabb(e) for e in t["source"]["elements"]}
        k = 90 / 1350  # uniform scale for 1080x1350 -> 728x90
        oy = (90 - 1350 * k) / 2
        # label: inside the source canvas, so its rotated box must be strictly inside the target
        x0, y0, x1, y1 = self.aabb(by["ribbon_label"])
        self.assertTrue(x0 >= 0 and y0 >= 0 and x1 <= 728 and y1 <= 90, f"ribbon_label rotated box {x0:.2f},{y0:.2f},{x1:.2f},{y1:.2f}")
        # plate: the SOURCE overhangs the canvas top by 0.597px (rotated box); P6 allowance = source overhang x s (uniform canvas scale, not x k_g)
        self.assertLess(sb["ribbon_bg"][1], 0)
        self.assertGreaterEqual(self.aabb(by["ribbon_bg"])[1], sb["ribbon_bg"][1] * k + oy - 1e-9)
        self.assertLessEqual(self.aabb(by["ribbon_bg"])[3], 90)
        a, b = self.aabb(by["ribbon_label"]), self.aabb(by["ribbon_bg"])
        self.assertTrue(a[0] >= b[0] - 1e-6 and a[1] >= b[1] - 1e-6 and a[2] <= b[2] + 1e-6 and a[3] <= b[3] + 1e-6, "label rotated box leaves plate")
        self.assertEqual((by["ribbon_label"]["rotation"], by["ribbon_bg"]["rotation"]), (-12, -12))


@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class RotatedRefit(unittest.TestCase):
    """An ungrouped text rotated 90deg is re-fit: its ROTATED box must be inside the target and clear of the other text."""
    def test_rotated_ungrouped_text_rotated_box_inside_and_clear(self):
        base = {"type": "text", "font_family": "Solstice Sans", "color": "rgba(0,0,0,1)"}
        els = [dict(base, id="a", x=50, y=50, width=500, height=100, content="Plain label", font_size=40),
               dict(base, id="r", x=600, y=300, width=500, height=100, content="Rotated tag", font_size=40, rotation=90)]
        src_ = {"canvas": {"width": 1200, "height": 1200}, "elements": els}
        out = resize(src_, {"width": 150, "height": 150})  # s=0.125: 40px -> 5px, so the refit path fires
        a, r = out["elements"]
        self.assertEqual(r["rotation"], 90)
        self.assertGreaterEqual(min(a["font_size"], r["font_size"]), FLOOR)
        box = RotatedBounds.aabb(r)
        self.assertTrue(box[0] >= -1e-6 and box[1] >= -1e-6 and box[2] <= 150 + 1e-6 and box[3] <= 150 + 1e-6, f"rotated box {box}")
        p, q = RotatedBounds.aabb(a), box
        self.assertFalse(p[0] < q[2] and q[0] < p[2] and p[1] < q[3] and q[1] < p[3], "rotated text overlaps the other text")


@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class ImageOcclusion(unittest.TestCase):
    """R6: committed synthetic fixture (1200x1200 -> 150x100 (images sit where shelf-packing starts); rotated ungrouped text and image). Boxes are rotated AABBs on the OUTPUT rects."""
    TC = {"width": 150, "height": 100}

    @staticmethod
    def hit(p, q):
        return p[0] < q[2] and q[0] < p[2] and p[1] < q[3] and q[1] < p[3]

    @staticmethod
    def img(id_, x, y, w, h, **kw):
        return dict({"id": id_, "type": "image", "x": x, "y": y, "width": w, "height": h, "asset_id": "a.png", "fit": "contain"}, **kw)

    @staticmethod
    def txt(id_, x, y, w, h, content, size, **kw):
        return dict({"id": id_, "type": "text", "x": x, "y": y, "width": w, "height": h, "content": content, "font_family": "Solstice Sans",
                     "font_size": size, "color": "rgba(0,0,0,1)"}, **kw)

    def fixture(self):
        els = [self.img("bg", 0, 0, 1200, 1200, fit="cover"),
               self.img("pic", 0, 0, 90, 90),
               self.img("rpic", 200, 0, 300, 100, rotation=30),
               self.txt("h", 100, 400, 700, 100, "Headline here", 48),
               self.txt("r", 100, 700, 300, 80, "Rotated tag", 40, rotation=90)]
        return {"canvas": {"width": 1200, "height": 1200}, "elements": els}

    def test_red_no_new_overlap_rotated_text_and_image(self):
        from engine.text_fit import aabb
        src = self.fixture()
        before = copy.deepcopy(src)
        out = resize(src, self.TC)
        self.assertEqual(src, before)
        so, oo = {e["id"]: e for e in src["elements"]}, {e["id"]: e for e in out["elements"]}
        checked = 0
        for t in ("h", "r"):
            self.assertGreaterEqual(oo[t]["font_size"], FLOOR)
            for i in ("pic", "rpic"):
                if self.hit(aabb(so[t]), aabb(so[i])):
                    continue
                checked += 1
                self.assertFalse(self.hit(aabb(oo[t]), aabb(oo[i])), f"{t} {aabb(oo[t])} covers {i} {aabb(oo[i])}")
        self.assertEqual(checked, 4)
        self.assertEqual(oo["r"]["rotation"], 90)

    def test_positive_control_source_overlap_is_not_an_obstacle(self):
        """A text that overlapped an image in the source is placed exactly as if the image were not there (pic -> shape = P5b rule)."""
        els = [self.img("pic", 0, 0, 200, 200), self.txt("over", 0, 150, 300, 60, "On the picture", 40)]
        src = {"canvas": {"width": 1200, "height": 1200}, "elements": els}
        off = copy.deepcopy(src)
        off["elements"][0] = {"id": "pic", "type": "shape", "shape_type": "rectangle", "fill_color": "rgba(0,0,0,1)", "x": 0, "y": 0, "width": 200, "height": 200}
        a = resize(src, self.TC)["elements"][1]
        b = resize(off, self.TC)["elements"][1]
        self.assertEqual({k: a[k] for k in ("x", "y", "width", "height", "font_size")}, {k: b[k] for k in ("x", "y", "width", "height", "font_size")})

    def test_grouped_image_stays_protected_obstacle(self):
        """Even a source overlap never exempts a GROUPED image: group association is protected."""
        from engine.text_fit import aabb
        els = [self.img("gimg", 0, 0, 200, 200, group_id="g"), self.txt("t", 0, 150, 300, 60, "Over a grouped image", 40)]  # overlaps it in the source: only an ungrouped image may be exempt
        out = resize({"canvas": {"width": 1200, "height": 1200}, "elements": els}, self.TC)
        g, t = out["elements"]
        self.assertFalse(self.hit(aabb(t), aabb(g)), f"{aabb(t)} covers grouped {aabb(g)}")

    def test_r7_full_bleed_makes_output_relation_differ_from_source(self):
        """R7: 1200x1200 -> 100x1000 (s=1/12, letterbox oy=450). Uniform scale preserves overlap EXCEPT for an ungrouped cover image, which is
        stretched to the whole target. 't' sits below the source canvas (disjoint from 'bg' in the source) but lands inside the stretched bg in the output.
        Correct: bg is a real obstacle, nothing fits, fallback = images-ignored placement (P5b) even though 'pic' is also ignored there.
        A mutant that judges the exemption on OUTPUT rects exempts bg, then avoids pic, and differs. The reverse relation (overlap in source,
        clear in output) cannot occur under a uniform scale. pic is off-canvas in the source so it lands at the output origin."""
        from engine.text_fit import aabb
        tc = {"width": 100, "height": 1000}
        els = [self.img("bg", 0, 0, 1200, 1200, fit="cover"), self.img("pic", 0, -5400, 600, 600),
               self.txt("t", 0, 1210, 300, 60, "Words that wrap onto two lines here", 40)]
        src = {"canvas": {"width": 1200, "height": 1200}, "elements": els}
        ref = copy.deepcopy(src)
        for k in (0, 1):
            ref["elements"][k] = {"id": els[k]["id"], "type": "shape", "shape_type": "rectangle", "fill_color": "rgba(0,0,0,1)",
                                  "x": els[k]["x"], "y": els[k]["y"], "width": els[k]["width"], "height": els[k]["height"]}
        out = resize(src, tc)["elements"]
        self.assertFalse(self.hit(aabb(src["elements"][2]), aabb(src["elements"][0])), "source: t disjoint from bg")
        self.assertTrue(self.hit(aabb(out[2]), aabb(out[0])), "output: t inside the stretched bg (no placement avoids it)")
        self.assertEqual(aabb(out[1]), (0.0, 0.0, 50.0, 50.0))
        geo = lambda e: {k: e[k] for k in ("x", "y", "width", "height", "font_size")}
        self.assertEqual(geo(out[2]), geo(resize(ref, tc)["elements"][2]))
        self.assertGreaterEqual(out[2]["font_size"], FLOOR)

    def test_no_placement_falls_back_to_p5b_exactly(self):
        """A full-height image splits a 100x30 target into two 40px gaps; the 6px text is ~55px wide, so no step clears it.
        Output must equal the images-ignored placement (P5b) exactly, floor kept."""
        wall = self.img("wall", 300, 0, 600, 1200)
        els = [wall, self.txt("t", 100, 900, 150, 100, "Nowhere to go at all", 40)]
        src = {"canvas": {"width": 1200, "height": 1200}, "elements": els}
        off = copy.deepcopy(src)
        off["elements"][0] = {"id": "wall", "type": "shape", "shape_type": "rectangle", "fill_color": "rgba(0,0,0,1)", "x": 300, "y": 0, "width": 600, "height": 1200}
        tc = {"width": 100, "height": 30}
        got = resize(src, tc)["elements"][1]
        want = resize(off, tc)["elements"][1]
        self.assertEqual(got, want)
        from engine.text_fit import aabb
        self.assertGreaterEqual(got["font_size"], FLOOR)
        w = resize(src, tc)["elements"][0]
        self.assertTrue(self.hit(aabb(got), aabb(w)), "fallback must be the overlapping P5b placement, otherwise this test does not reach the limit")


@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class SubFloorLabelRaise(unittest.TestCase):
    """P10: when no rigid k packs a sub-floor group, the label font is raised to FLOOR in place iff its scaled box fits the 6px text."""
    def test_c1_badge2_and_c3b_cta_raised_to_floor(self):
        c1 = json.load(open('docs/evidence/2026-10-07-p8/run3/C1_l3_120x600_input.json'))
        o1 = resize(c1['source'], c1['target_canvas'])
        b2 = next(e for e in o1['elements'] if e['id'] == 'badge2_label')
        self.assertEqual(b2['font_size'], FLOOR)

        c3b = json.load(open('docs/evidence/2026-10-07-p8/run3/C3b_extreme_60x1000_input.json'))
        o3b = resize(c3b['source'], c3b['target_canvas'])
        cta = next(e for e in o3b['elements'] if e['id'] == 'cta_label')
        self.assertEqual(cta['font_size'], FLOOR)

    # sha256(json.dumps(resize(...), sort_keys=True)) on main 0536a10 (P5b/P6 placement); only the label font_size may differ after P10
    MAIN = {"C1_l3_120x600": ("badge2_label", 4.860000000000001, "900c61306c57613477e160db5d8028d7f93212b149d2413f3ea07588a0423691"),
            "C3b_extreme_60x1000": ("cta_label", 4.3740000000000006, "3985b3e0f2b261c661a993661981c9db89d423aade1913556a034ef27fd49eda")}

    def run_case(self, name):
        c = json.load(open(f"docs/evidence/2026-10-07-p8/run3/{name}_input.json"))
        with warnings.catch_warnings():
            warnings.simplefilter("error")  # no RuntimeWarning (or any other) from the raise path
            return resize(c["source"], c["target_canvas"])

    def test_only_label_font_changes_everything_else_equals_main(self):
        from unittest import mock
        from engine import text_fit
        for name in self.MAIN:
            with self.subTest(name):
                c = json.load(open(f"docs/evidence/2026-10-07-p8/run3/{name}_input.json"))
                source = copy.deepcopy(c["source"])
                with mock.patch.object(text_fit, "_raise_all"):
                    settled = resize(c["source"], c["target_canvas"])
                self.assertEqual(c["source"], source)
                out = copy.deepcopy(settled)
                text_fit._raise_all(out)
                expected = copy.deepcopy(settled)
                lid = self.MAIN[name][0]
                label = next(e for e in expected["elements"] if e["id"] == lid)
                self.assertLess(label["font_size"], FLOOR)
                label["font_size"] = FLOOR
                if name == "C1_l3_120x600":
                    cta = next(e for e in expected["elements"] if e["id"] == "cta_label")
                    self.assertAlmostEqual(cta["font_size"], FLOOR)
                    cta["font_size"] = FLOOR  # historical rigid packing leaves 5.999999999999999
                self.assertEqual(out, expected)  # nothing except eligible label fonts changes
                historical = json.load(open(f"docs/evidence/2026-10-07-p10/run/{name}_output.json"))
                self.assertEqual([e["id"] for e in out["elements"]], [e["id"] for e in c["source"]["elements"]])
                for src, e, old in zip(c["source"]["elements"], out["elements"], historical["elements"]):
                    if e.get("group_id") or e["type"] != "text":
                        old = copy.deepcopy(old)
                        if name == "C1_l3_120x600" and old["id"] == "cta_label":
                            self.assertAlmostEqual(old["font_size"], FLOOR)
                            old["font_size"] = FLOOR
                        self.assertEqual(e, old)
                    mutable = {"x", "y", "width", "height", "font_size", "letter_spacing", "corner_radius", "stroke_width"}
                    self.assertEqual({k: v for k, v in e.items() if k not in mutable},
                                     {k: v for k, v in src.items() if k not in mutable})

    S = 0.05  # 1200x1200 -> 60x1000 uniform scale; plate is 50-60px wide so no rigid k >= s can pack

    @classmethod
    def fx(cls, box_h=200, content="Hi", rot=0, pw=1200, extra=None, lw=None, **kw):
        lw = lw or pw  # label box width; plate width pw (a plate wider than the canvas/f keeps rigid k from packing)
        lab = {"id": "l", "type": "text", "x": 600 - lw / 2, "y": 400, "width": lw, "height": box_h, "content": content, "font_family": "Solstice Sans",
               "font_size": 40, "color": "rgba(0,0,0,1)", "group_id": "g", "rotation": rot}
        lab.update(kw)
        els = [{"id": "bg", "type": "shape", "shape_type": "rectangle", "fill_color": "rgba(255,255,255,1)", "x": 0, "y": 0, "width": 1200, "height": 1200},
               {"id": "p", "type": "shape", "shape_type": "rectangle", "fill_color": "rgba(1,2,3,1)", "x": 600 - pw / 2, "y": 400, "width": pw, "height": 240, "group_id": "g", "rotation": rot},
               lab] + (extra or [])
        return {"canvas": {"width": 1200, "height": 1200}, "elements": els}

    def go(self, src):
        with warnings.catch_warnings():
            warnings.simplefilter("error")
            return {e["id"]: e for e in resize(src, {"width": 60, "height": 1000})["elements"]}

    def test_fitting_label_raised_geometry_equals_uniform(self):
        o = self.go(self.fx())
        self.assertEqual(o["l"]["font_size"], FLOOR)
        self.assertAlmostEqual(o["l"]["width"], 1200 * self.S)
        self.assertAlmostEqual(o["l"]["height"], 200 * self.S)
        self.assertAlmostEqual(o["p"]["width"], 1200 * self.S)
        self.assertAlmostEqual(o["l"]["y"] - o["p"]["y"], 0.0)

    def test_label_not_fitting_its_scaled_box_stays_p5b(self):
        o = self.go(self.fx(box_h=100))  # 5px box < 7.2 needed at 6px (the SOURCE box 100 would not matter: 6px text needs 7.2)
        self.assertAlmostEqual(o["l"]["font_size"], 40 * self.S)
        o = self.go(self.fx(box_h=2400, content="Hi"))  # source box tall, scaled box 120px fits -> raised (fit is on the scaled box)
        self.assertEqual(o["l"]["font_size"], FLOOR)

    def test_letter_spacing_label_not_raised(self):
        o = self.go(self.fx(letter_spacing=1))
        self.assertAlmostEqual(o["l"]["font_size"], 40 * self.S)

    def test_group_all_or_nothing(self):
        two = {"id": "l2", "type": "text", "x": 0, "y": 700, "width": 1200, "height": 100, "content": "Hi", "font_family": "Solstice Sans",
               "font_size": 40, "color": "rgba(0,0,0,1)", "group_id": "g"}
        o = self.go(self.fx(extra=[two]))
        self.assertAlmostEqual(o["l"]["font_size"], 40 * self.S)
        self.assertAlmostEqual(o["l2"]["font_size"], 40 * self.S)

    def test_rotated_group_label_stays_inside_plate_rotated_frame(self):
        o = self.go(self.fx(pw=1100, rot=-12, box_h=240))  # label box == plate box, so any rotated-frame offset is a bug; 55px plate: no rigid k packs
        l, pl = o["l"], o["p"]
        self.assertEqual((l["rotation"], pl["rotation"]), (-12, -12))
        self.assertEqual(l["font_size"], FLOOR)
        r = math.radians(-12)
        dx, dy = (l["x"] + l["width"] / 2) - (pl["x"] + pl["width"] / 2), (l["y"] + l["height"] / 2) - (pl["y"] + pl["height"] / 2)
        u, v = dx * math.cos(r) + dy * math.sin(r), -dx * math.sin(r) + dy * math.cos(r)
        self.assertLessEqual(abs(u) + l["width"] / 2, pl["width"] / 2 + 1e-9)
        self.assertLessEqual(abs(v) + l["height"] / 2, pl["height"] / 2 + 1e-9)

    def test_lone_grouped_text_and_non_sub_floor_group_untouched(self):
        lone = self.fx()
        lone["elements"] = [e for e in lone["elements"] if e["id"] != "p"]  # no plate: not a sub-floor group (P6 rule)
        self.assertAlmostEqual(self.go(lone)["l"]["font_size"], 40 * self.S)
        big = self.fx()
        big["elements"][2]["font_size"] = 200  # 200*0.05 = 10px >= FLOOR: untouched
        self.assertAlmostEqual(self.go(big)["l"]["font_size"], 10.0)

    def test_rigid_packing_group_stays_rigid_not_raised_in_place(self):
        src = self.fx(pw=400)  # 20px-wide plate: rigid k fits the 60px canvas, so the raise is not reached
        o = resize(src, {"width": 60, "height": 1000})["elements"]
        l, p = o[2], o[1]
        self.assertGreaterEqual(l["font_size"], FLOOR - 1e-9)
        self.assertGreater(l["width"], 400 * self.S + 1e-9)  # geometry grew rigidly (raise alone would keep 20)
        self.assertAlmostEqual(l["width"] / p["width"], 1.0)

    def test_raise_survives_p5b_revert_geometry_equal_to_p5b(self):
        """A rigid-moved group + ungrouped text that cannot pack -> exact P5b revert; the in-place raise is applied to that settled placement."""
        from engine import text_fit
        src = self.fx()
        wall = {"id": "t", "type": "text", "x": 0, "y": 0, "width": 1200, "height": 200, "content": "A very long sentence that cannot possibly fit",
                "font_family": "Solstice Sans", "font_size": 40, "color": "rgba(0,0,0,1)"}
        src["elements"].append(wall)
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            o = {e["id"]: e for e in resize(src, {"width": 60, "height": 1000})["elements"]}
        self.assertEqual(o["l"]["font_size"], FLOOR)
        self.assertAlmostEqual(o["l"]["width"], 1200 * self.S)
        self.assertEqual([x for x in w if issubclass(x.category, RuntimeWarning)], [])

    def test_width_fit_boundary_uses_scaled_width_and_both_margins(self):
        """'Shop now' at 6px measures 30.0 -> needs ceil(30*1.02)+1 = 32 of box width. Box widths 31.5 (just under) and 32.5 (just over), via pw/S."""
        under = self.go(self.fx(lw=31.5 / self.S, content="Shop now"))
        over = self.go(self.fx(lw=32.5 / self.S, content="Shop now"))
        self.assertAlmostEqual(under["l"]["font_size"], 40 * self.S)  # kills width-fit-dropped and +1 / 1.02 margin removals (31 / 31 would pass)
        self.assertEqual(over["l"]["font_size"], FLOOR)

    def test_fit_uses_scaled_box_not_source_box(self):
        """Source box 1200 wide would fit 'Shop now' at 6px; the scaled label box is 20px wide here and does not."""
        o = self.go(self.fx(lw=20 / self.S, content="Shop now"))
        self.assertAlmostEqual(o["l"]["font_size"], 40 * self.S)

    def test_wrap_is_measured_at_the_scaled_box_width(self):
        """20px-wide, 20px-tall scaled box: 'Shop now' (30px) wraps to 2 lines (widest 16 -> 18 <= 20, height 14.4 <= 20) -> raised.
        Wrapping at the SOURCE width would give 1 line of 30px > 20 -> not raised (kills fit-on-unscaled-source-box)."""
        o = self.go(self.fx(lw=20 / self.S, box_h=400, content="Shop now"))
        self.assertEqual(o["l"]["font_size"], FLOOR)

@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class WrapCapPadding(unittest.TestCase):
    """P11: text_fit wrap cap leaves room for box padding ceil(w*1.02)+1 <= tw-2, allowing multi-line wrap instead of failing to pack."""
    def test_l3_narrow_targets_survive_without_sub_floor_or_warning(self):
        t = sample("level3_advanced")
        for tc in ({"width": 300, "height": 250}, {"width": 160, "height": 600}, {"width": 300, "height": 600}):
            with self.subTest(tc=tc):
                with warnings.catch_warnings(record=True) as w:
                    warnings.simplefilter("always")
                    out = resize(t["source"], tc)
                self.assertEqual([str(x.message) for x in w if issubclass(x.category, RuntimeWarning)], [])
                for e in (e for e in texts(out) if not e.get("group_id")):
                    self.assertGreaterEqual(e["font_size"], FLOOR, f"{e['id']} font_size {e['font_size']:.2f}")
                    self.assertLessEqual(e["width"], tc["width"] - 2.0 + 1e-9, f"{e['id']} width {e['width']:.2f} exceeds cap")

    def test_wrapped_headline_box_is_padded_width_and_text_inside(self):
        """Reviewer (b): on the real wrapped case the BOX width is <= tw-2 and the measured text fits inside it (not only font >= 6)."""
        t = sample("level3_advanced")
        out = resize(t["source"], {"width": 300, "height": 250})
        for e in (e for e in texts(out) if not e.get("group_id")):
            with self.subTest(e["id"]):
                self.assertLessEqual(e["width"], 298.0 + 1e-9)
                self.assertFalse(overflow(e), f"{e['id']} measured text overflows its box")
        h = next(e for e in texts(out) if e["id"] == "headline")
        self.assertGreater(len(lines_of(h)[0]), 1, "headline must have wrapped (2+ lines), else the cap fix is not what made it pack")

    def test_cases_that_packed_before_keep_the_tw_minus_2_cap(self):
        """Initial search cap remains tw-2; returned-width recount and pinned glyph capacity are separate controls."""
        from unittest import mock
        from engine import text_fit
        import skia
        import importlib.util
        spec = importlib.util.spec_from_file_location("pinned_wrap", os.path.join(UPSTREAM, "renderer/converter/wrap.py"))
        wrap = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(wrap)
        self.assertEqual(hashlib.sha256(open(spec.origin, "rb").read()).hexdigest(),
                         "3055a4c83009760a225233c43ae3433d8ef597bc2f6025c867833806accd0975")
        t = sample("level3_advanced")
        trace = []
        block = text_fit._block_widths
        def record(content, widths, cap):
            trace.append((content, cap))
            return block(content, widths, cap)
        with mock.patch.object(text_fit, "_block_widths", side_effect=record):
            out = resize(t["source"], {"width": 120, "height": 600})
        free = [e for e in texts(out) if not e.get("group_id")]
        self.assertEqual(trace[0], (free[0]["content"], 118.0))  # first search, not subsequent final-width recount
        self.assertTrue(any(cap == free[0]["width"] for content, cap in trace if content == free[0]["content"]))
        for e in free:
            self.assertGreaterEqual(e["font_size"], FLOOR)
            family = "SolsticeSerif" if "Serif" in e["font_family"] else "SolsticeSans"
            suffix = "Bold" if e.get("font_weight") == "bold" else "Regular"
            data = open(os.path.join(FONTS, f"{family}-{suffix}.ttf"), "rb").read()
            want = {"SolsticeSerif-Bold": "837d42cc1b336364b69714c73288a0ec7ceded41c137d5f62943df5f0745551a",
                    "SolsticeSans-Regular": "4500567b25fc1af2983cee01c1e57e01a0108b8b3844c182936d14c7dec7f69c"}
            self.assertEqual(hashlib.sha256(data).hexdigest(), want[f"{family}-{suffix}"])
            font = skia.Font(skia.Typeface.MakeFromData(data), e["font_size"])
            widths = list(font.getWidths(font.textToGlyphs(e["content"])))
            wrapped = wrap.wrap_text(e["content"], widths, e["width"])
            lines, start = [], 0
            for i, c in enumerate(wrapped + "\n"):
                if c == "\n":
                    lines.append(sum(widths[start:i])); start = i + 1
            self.assertLessEqual(max(lines), e["width"])
            self.assertLessEqual(len(lines) * e["font_size"] * e.get("line_height", LINE_H), e["height"] + 1e-9)

    def test_block_reuses_character_advances_without_changing_wrap(self):
        from engine import text_fit

        class CountingFont:
            def __init__(self):
                self.calls = []

            def getlength(self, char):
                self.calls.append(char)
                return {"a": 3.0, "b": 4.0, " ": 2.0, "\n": 0.0}[char]

        content = "aaaa bbbb\naaaa bbbb"
        font = CountingFont()
        result = text_fit._block(font, content, 15)
        expected = text_fit._block_widths(content, [{"a": 3.0, "b": 4.0, " ": 2.0, "\n": 0.0}[c] for c in content], 15)
        self.assertEqual(result, expected)
        self.assertEqual(len(font.calls), len(set(content)))
        self.assertEqual(set(font.calls), set(content))

    def test_first_success_stops_before_retry(self):
        from unittest import mock
        from engine import text_fit
        class Fake:
            def getlength(self, s):
                return float(len(s))
        source = {"canvas": {"width": 200, "height": 200}, "elements": [{
            "id": "t", "type": "text", "x": 0, "y": 0, "width": 100, "height": 40,
            "content": "Hi", "font_family": "Solstice Sans", "font_size": 10}]}
        out = copy.deepcopy(source)
        out["elements"][0]["font_size"] = 5
        with mock.patch.object(text_fit, "_fonts_dir", return_value="/nonexistent"), \
                mock.patch.object(text_fit, "_font", return_value=Fake()), \
                mock.patch.object(text_fit, "_renderer_widths", side_effect=lambda path, size, text: [1.0] * len(text)), \
                mock.patch.object(text_fit, "_block_widths", wraps=text_fit._block_widths) as block, \
                mock.patch.object(text_fit, "_pack", wraps=text_fit._pack) as pack:
            self.assertTrue(text_fit._texts(source, out, 100, 100))
        self.assertEqual([(call.args[0], call.args[2]) for call in block.call_args_list],
                         [("Hi", 98.0)] * 2 + [("Hi", out["elements"][0]["width"])] * 2)
        self.assertEqual(pack.call_count, 1)  # first search packed; no later search or tightened retry

    def test_retry_cap_is_pinned_to_tw_minus_3_over_1_02(self):
        """P13: constant-width fake font (1px per char at any size). A forces the padded-cap retry (first attempt box > tw); B sits between the
        (tw-4)/1.02 and (tw-3)/1.02 caps, so it stays ONE line only at the exact retry cap. Kills cap-minus-4; A 2 lines proves the retry ran."""
        from unittest import mock
        from engine import text_fit
        tw, th = 150, 400
        a_w, b_w = 147, 144
        self.assertTrue((tw - 1) / 1.02 < a_w <= tw - 2)                 # first attempt: one line, box ceil(w*1.02)+1 > tw, cannot pack
        self.assertTrue((tw - 4) / 1.02 < b_w <= (tw - 3) / 1.02)        # between the cap-minus-4 and the real retry cap

        class Fake:
            def getlength(self, s):
                return float(len(s))

        def el(i, y, n):
            half = (n - 1) // 2
            return {"id": i, "type": "text", "x": 0, "y": y, "width": 300, "height": 100, "content": "x" * half + " " + "x" * (n - 1 - half),
                    "font_family": "Solstice Sans", "font_size": 6, "color": "rgba(0,0,0,1)"}
        src = {"canvas": {"width": 2 * tw, "height": 2 * th}, "elements": [el("a", 100, a_w), el("b", 500, b_w)]}
        with mock.patch.object(text_fit, "_fonts_dir", return_value="/nonexistent"), mock.patch.object(text_fit, "_font", lambda path, size: Fake()), \
                mock.patch.object(text_fit, "_renderer_widths", side_effect=lambda path, size, text: [1.0] * len(text)):
            with warnings.catch_warnings(record=True) as w:
                warnings.simplefilter("always")
                out = resize(src, {"width": tw, "height": th})
        self.assertEqual([str(x.message) for x in w if issubclass(x.category, RuntimeWarning)], [])
        a, b = (next(e for e in out["elements"] if e["id"] == i) for i in "ab")
        self.assertAlmostEqual(a["font_size"], FLOOR)
        self.assertAlmostEqual(b["font_size"], FLOOR)
        self.assertAlmostEqual(a["height"], 2 * FLOOR * LINE_H)          # A wrapped: the retry ran
        self.assertAlmostEqual(b["height"], 1 * FLOOR * LINE_H)          # B one line: exact retry cap
        for e in (a, b):
            self.assertLessEqual(e["width"], tw - 2.0 + 1e-9)


@unittest.skipUnless(os.path.isdir(FONTS), SKIP)
class UnaffectedSamples(unittest.TestCase):
    def test_public_output_matches_ink_safe_baseline(self):
        for name, want in BASE_HASH.items():
            t = sample(name)
            got = hashlib.sha256(json.dumps(resize(t["source"], t["target_canvas"]), sort_keys=True).encode()).hexdigest()
            self.assertEqual(got, want, name)

    def test_no_refit_when_nothing_below_floor(self):
        t = sample("level1_warmup")
        out = resize(t["source"], t["target_canvas"])
        k = min(t["target_canvas"]["width"] / t["source"]["canvas"]["width"], t["target_canvas"]["height"] / t["source"]["canvas"]["height"])
        for a, b in zip(t["source"]["elements"], out["elements"]):
            if a["type"] == "text":
                self.assertAlmostEqual(b["font_size"], a["font_size"] * k)


if __name__ == "__main__":
    unittest.main()
