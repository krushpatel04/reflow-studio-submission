"""Submission regressions: readable associations and subject prominence, independent of source IDs."""
import copy
import os
import unittest
from engine.resize import resize


def text(name, x, y, w, h, size, content):
    return dict(
        id=name,
        type="text",
        x=x,
        y=y,
        width=w,
        height=h,
        font_size=size,
        content=content,
        font_family="Solstice Sans",
        color="rgba(0,0,0,1)",
    )


def article():
    es = [text("title", 60, 60, 1000, 170, 76, "Understanding our three priorities")]
    for n, x in enumerate((60, 650, 1240)):
        es.extend(
            [
                text(f"h{n}", x, 420, 480, 50, 30, f"Priority {n+1}"),
                text(
                    f"b{n}",
                    x,
                    490,
                    480,
                    180,
                    20,
                    "Preserve each heading with its explanation. "
                    + "Every detail matters to the reader. " * 4,
                ),
            ]
        )
    return dict(canvas=dict(width=1800, height=1000), elements=es)


def art():
    return dict(
        canvas=dict(width=1500, height=1900),
        elements=[
            dict(
                id="main",
                type="image",
                asset_id="main.png",
                fit="contain",
                x=375,
                y=300,
                width=750,
                height=1400,
            ),
            dict(
                id="corner-a",
                type="image",
                asset_id="a.png",
                fit="contain",
                x=1050,
                y=-100,
                width=600,
                height=600,
            ),
            dict(
                id="corner-b",
                type="image",
                asset_id="b.png",
                fit="contain",
                x=-150,
                y=1400,
                width=600,
                height=700,
                rotation=19,
            ),
        ],
    )


def by(d):
    return {e["id"]: e for e in d["elements"]}


@unittest.skipUnless(os.environ.get("CHAMELEON_UPSTREAM"), "set pinned CHAMELEON_UPSTREAM")
class ArticleComposition(unittest.TestCase):
    def test_portrait_uses_vertical_space_and_keeps_each_heading_with_body(self):
        for w, h in [(1080, 1920), (160, 600), (161, 601)]:
            o = by(resize(article(), dict(width=w, height=h)))
            for n in range(3):
                a, b = o[f"h{n}"], o[f"b{n}"]
                self.assertAlmostEqual(a["x"], b["x"])
                self.assertGreaterEqual(b["y"], a["y"] + a["height"])
                self.assertLessEqual(b["y"] - a["y"] - a["height"], max(12, h * 0.025))
                self.assertGreaterEqual(b["font_size"], 10)
                if n:
                    self.assertGreater(a["y"], o[f"b{n-1}"]["y"] + o[f"b{n-1}"]["height"])
            self.assertGreater(o["b2"]["y"] + o["b2"]["height"] - o["title"]["y"], h * 0.6)

    def test_banner_keeps_three_heading_body_columns_and_readable_copy(self):
        o = by(resize(article(), dict(width=728, height=90)))
        for n in range(3):
            a, b = o[f"h{n}"], o[f"b{n}"]
            self.assertAlmostEqual(a["x"], b["x"])
            self.assertGreaterEqual(b["y"], a["y"] + a["height"])
            self.assertGreaterEqual(b["font_size"], 9)
            self.assertLessEqual(b["y"] + b["height"], 90)
        self.assertLess(o["b0"]["x"], o["b1"]["x"])
        self.assertLess(o["b1"]["x"], o["b2"]["x"])

    def test_unambiguous_row_required_and_source_never_mutated(self):
        s = article()
        before = copy.deepcopy(s)
        resize(s, dict(width=160, height=600))
        self.assertEqual(s, before)
        self.assertEqual(resize(s, s["canvas"]), s)
        # A lone title/paragraph pair is not evidence of a multi-column article.
        s["elements"] = s["elements"][:3]
        out = resize(s, dict(width=1080, height=1920))
        self.assertAlmostEqual(out["elements"][1]["x"], 60 * 0.6)

    def test_folio_beside_large_title_is_not_a_column_heading(self):
        s = article()
        s["elements"].append(text("page", 1650, 55, 80, 40, 25, "25"))
        o = by(resize(s, dict(width=160, height=600)))
        self.assertGreaterEqual(o["b0"]["font_size"], 10)
        self.assertGreater(o["h1"]["y"], o["b0"]["y"] + o["b0"]["height"])

    def test_protected_fields_and_order_are_preserved(self):
        s = article()
        o = resize(s, dict(width=160, height=600))
        self.assertEqual([e["id"] for e in s["elements"]], [e["id"] for e in o["elements"]])
        allowed = {
            "x",
            "y",
            "width",
            "height",
            "font_size",
            "letter_spacing",
            "corner_radius",
            "stroke_width",
        }
        for a, b in zip(s["elements"], o["elements"]):
            self.assertEqual(
                {k: v for k, v in a.items() if k not in allowed},
                {k: v for k, v in b.items() if k not in allowed},
            )


class ArtworkComposition(unittest.TestCase):
    def test_narrow_subject_uses_available_width_without_distorting(self):
        o = by(resize(art(), dict(width=160, height=600)))
        self.assertGreaterEqual(o["main"]["width"], 145)
        self.assertGreaterEqual(o["main"]["height"], 270)
        self.assertAlmostEqual(o["main"]["width"] / o["main"]["height"], 750 / 1400)

    def test_wide_subject_uses_height_and_decorations_use_width(self):
        o = by(resize(art(), dict(width=728, height=90)))
        self.assertGreaterEqual(o["main"]["height"], 83)
        self.assertLess(o["corner-b"]["x"], 728 * 0.25)
        self.assertGreater(o["corner-a"]["x"], 728 * 0.7)
        for e in o.values():
            self.assertEqual(e["asset_id"], by(art())[e["id"]]["asset_id"])
            self.assertAlmostEqual(
                e["width"] / e["height"], by(art())[e["id"]]["width"] / by(art())[e["id"]]["height"]
            )

    def test_identity_nearby_grouped_and_collage_are_unchanged(self):
        s = art()
        self.assertEqual(resize(s, s["canvas"]), s)
        # A second fully contained image is a collage, not one subject plus corner decoration.
        s["elements"][1].update(x=50, y=50, width=200, height=200)
        o = by(resize(s, dict(width=160, height=600)))
        self.assertAlmostEqual(o["main"]["width"], 750 * 160 / 1500)
        s = art()
        s["elements"][0]["group_id"] = "protected"
        o = by(resize(s, dict(width=160, height=600)))
        self.assertAlmostEqual(o["main"]["width"], 750 * 160 / 1500)

    def test_canvas_key_order_and_element_names_do_not_choose_the_layout(self):
        s = art()
        s["canvas"] = {"height": 1900, "width": 1500}
        for n, e in enumerate(s["elements"]):
            e["id"] = f"random-{n}"
        o = resize(s, dict(width=160, height=600))
        self.assertGreaterEqual(o["elements"][0]["width"], 145)

    def test_full_canvas_contain_image_or_ellipse_is_not_a_background(self):
        for extra in [
            dict(
                id="other",
                type="image",
                asset_id="other.png",
                fit="contain",
                x=0,
                y=0,
                width=1500,
                height=1900,
            ),
            dict(
                id="other",
                type="shape",
                shape_type="ellipse",
                fill_color="rgba(0,0,0,1)",
                x=0,
                y=0,
                width=1500,
                height=1900,
            ),
        ]:
            s = art()
            s["elements"].append(extra)
            o = by(resize(s, dict(width=160, height=600)))
            self.assertAlmostEqual(o["main"]["width"], 750 * 160 / 1500)

    def test_invalid_target_is_rejected(self):
        with self.assertRaises(ValueError):
            resize(art(), dict(width=0, height=600))


@unittest.skipUnless(os.environ.get("CHAMELEON_UPSTREAM"), "set pinned CHAMELEON_UPSTREAM")
class CampaignReadability(unittest.TestCase):
    def test_small_footer_art_keeps_its_source_prominence_and_header_logo_can_grow(self):
        import json
        from pathlib import Path

        source = json.loads((Path(os.environ["CHAMELEON_UPSTREAM"])
                             / "input/chameleon_sample_level3_advanced.json").read_text())["source"]
        # The same bound applies to real artwork and an absent asset; neither
        # asset names nor source IDs may select layout roles.
        for asset in ("solstice_holiday_badge_2025.png", "solstice_logo_lockup.png"):
            s = copy.deepcopy(source)
            by(s)["holiday_watermark"]["asset_id"] = asset
            names = {}
            for n, e in enumerate(s["elements"]):
                names[e["id"]] = f"anonymous-{n}"
                e["id"] = f"anonymous-{n}"
            if asset == "solstice_logo_lockup.png":
                s["elements"].reverse()
            before = copy.deepcopy(s)
            for w, h in ((728, 90), (730, 92), (160, 600)):
                with self.subTest(asset=asset, target=(w, h)):
                    out = resize(s, dict(width=w, height=h))
                    self.assertEqual(s, before)
                    footer, logo = by(out)[names["holiday_watermark"]], by(out)[names["logo"]]
                    old = by(s)[names["holiday_watermark"]]
                    scale = min(w / s["canvas"]["width"], h / s["canvas"]["height"])
                    self.assertLessEqual(footer["width"], old["width"] * scale + 1e-6)
                    self.assertLessEqual(footer["height"], old["height"] * scale + 1e-6)
                    self.assertGreater(footer["width"], 0)
                    self.assertAlmostEqual(footer["width"] / footer["height"], old["width"] / old["height"])
                    self.assertEqual(footer["asset_id"], asset)
                    self.assertGreaterEqual(logo["width"], 35)
                    self.assertTrue(all(e.get("font_size", 9) >= 9 for e in out["elements"]))

    def test_secondary_art_alongside_subject_is_not_mistaken_for_footer(self):
        import json
        from pathlib import Path

        s = json.loads((Path(os.environ["CHAMELEON_UPSTREAM"])
                        / "input/chameleon_sample_level3_advanced.json").read_text())["source"]
        by(s)["product"]["height"] = 900
        s["elements"].append(dict(id="secondary", type="image", asset_id="solstice_logo_lockup.png",
                                  x=800, y=700, width=60, height=60))
        o = by(resize(s, dict(width=728, height=90)))
        # Lower-half placement alone must not demote artwork alongside the
        # main subject. It keeps the available ancillary image slot.
        self.assertAlmostEqual(o["secondary"]["width"], 14)
        self.assertGreaterEqual(o["logo"]["width"], 35)

    def test_dense_banner_labels_and_copy_are_legible_without_deleting_content(self):
        import json
        from pathlib import Path
        from engine.text_fit import aabb

        s = json.loads(
            (
                Path(os.environ["CHAMELEON_UPSTREAM"])
                / "input/chameleon_sample_level3_advanced.json"
            ).read_text()
        )["source"]
        before = copy.deepcopy(s)
        o = resize(s, dict(width=728, height=90))
        self.assertEqual(s, before)
        self.assertEqual([e["id"] for e in o["elements"]], [e["id"] for e in s["elements"]])
        for a, b in zip(s["elements"], o["elements"]):
            for k in [
                "content",
                "asset_id",
                "font_family",
                "color",
                "rotation",
                "group_id",
                "z_index",
            ]:
                self.assertEqual(a.get(k), b.get(k), (a["id"], k))
            if b["type"] == "text":
                self.assertGreaterEqual(int(b["font_size"]), 9, b["id"])
            x0, y0, x1, y1 = aabb(b)
            self.assertTrue(
                x0 >= -1e-6 and y0 >= -1e-6 and x1 <= 728 + 1e-6 and y1 <= 90 + 1e-6, b["id"]
            )
        self.assertGreaterEqual(by(o)["product"]["height"], 40)

    def test_banner_real_ink_is_not_clipped_and_unsupported_fonts_keep_fallback(self):
        import json
        from pathlib import Path
        from scripts.quality.text_ink import probe

        s = json.loads(
            (
                Path(os.environ["CHAMELEON_UPSTREAM"])
                / "input/chameleon_sample_level3_advanced.json"
            ).read_text()
        )["source"]
        o = resize(s, dict(width=728, height=90))
        for e in o["elements"]:
            if e["type"] == "text":
                ink = probe(
                    e["content"],
                    e["font_family"],
                    e.get("font_weight", "regular"),
                    e["font_size"],
                    e["x"],
                    e["y"],
                    e["width"],
                    e["height"],
                    (728, 90),
                    Path(os.environ["CHAMELEON_UPSTREAM"]),
                    e.get("rotation", 0),
                )
                self.assertGreater(ink["ink_px"], 0, e["id"])
                self.assertEqual((ink["lost_px"], ink["overflow_px"]), (0, 0), e["id"])
        # Unknown faces must never enable a new arrangement using substitute metrics.
        for e in s["elements"]:
            if e["type"] == "text":
                e["font_family"] = "Unavailable Family"
        o = resize(s, dict(width=728, height=90))
        self.assertTrue(any(e.get("font_size", 9) < 9 for e in o["elements"]))

    def test_longer_banner_headline_keeps_complete_copy_readable(self):
        import json
        from pathlib import Path

        s = json.loads(
            (
                Path(os.environ["CHAMELEON_UPSTREAM"])
                / "input/chameleon_sample_level3_advanced.json"
            ).read_text()
        )["source"]
        next(e for e in s["elements"] if e["id"] == "headline")["content"] += " Tonight"
        o = resize(s, dict(width=728, height=90))
        self.assertEqual(by(o)["headline"]["content"], by(s)["headline"]["content"])
        for e in o["elements"]:
            if e["type"] == "text":
                self.assertGreaterEqual(int(e["font_size"]), 9, e["id"])

    def test_positive_tracking_retains_explicitly_unsupported_fallback(self):
        import json
        from pathlib import Path

        s = json.loads(
            (
                Path(os.environ["CHAMELEON_UPSTREAM"])
                / "input/chameleon_sample_level3_advanced.json"
            ).read_text()
        )["source"]
        by(s)["headline"]["letter_spacing"] = 2.0
        before = copy.deepcopy(s)
        out = resize(s, dict(width=728, height=90))
        self.assertEqual(s, before)
        self.assertEqual(by(out)["headline"]["content"], by(s)["headline"]["content"])
        # The new pass cannot certify tracking with advance-only wrapping.
        # Unsupported text keeps the documented older fit, not a false9px claim.
        self.assertTrue(any(e.get("font_size", 9) < 9 for e in out["elements"]))

    def test_overfull_image_row_keeps_safe_fallback(self):
        import json
        from pathlib import Path

        s = json.loads(
            (
                Path(os.environ["CHAMELEON_UPSTREAM"])
                / "input/chameleon_sample_level3_advanced.json"
            ).read_text()
        )["source"]
        s["elements"].extend(
            dict(
                id=f"extra-{n}",
                type="image",
                asset_id="existing.png",
                fit="contain",
                x=10,
                y=100,
                width=40,
                height=40,
            )
            for n in range(20)
        )
        o = resize(s, dict(width=160, height=600))
        for e in o["elements"]:
            if e["id"].startswith("extra-"):
                self.assertGreaterEqual(e["x"], 0)
                self.assertLessEqual(e["x"] + e["width"], 160)

    def test_small_labels_are_readable_across_narrow_and_wide_formats(self):
        import json
        from pathlib import Path

        s = json.loads(
            (
                Path(os.environ["CHAMELEON_UPSTREAM"])
                / "input/chameleon_sample_level3_advanced.json"
            ).read_text()
        )["source"]
        for w, h in [(160, 600), (1600, 400), (2000, 300), (730, 92), (728, 101)]:
            with self.subTest(target=(w, h)):
                o = resize(s, dict(width=w, height=h))
                for e in o["elements"]:
                    if e["type"] == "text":
                        self.assertGreaterEqual(int(e["font_size"]), 9, e["id"])

    def test_labels_keep_their_plates_and_no_new_content_collisions(self):
        import json
        from pathlib import Path
        from engine.text_fit import aabb

        s = json.loads(
            (
                Path(os.environ["CHAMELEON_UPSTREAM"])
                / "input/chameleon_sample_level3_advanced.json"
            ).read_text()
        )["source"]
        out = resize(s, dict(width=728, height=90))
        els = out["elements"]
        for e in els:
            if e["type"] == "text" and e.get("group_id"):
                p = next(
                    a for a in els if a.get("group_id") == e["group_id"] and a["type"] == "shape"
                )
                # A rotated label and its backing plate must share a centre.
                self.assertAlmostEqual(e["x"] + e["width"] / 2, p["x"] + p["width"] / 2)
                self.assertAlmostEqual(e["y"] + e["height"] / 2, p["y"] + p["height"] / 2)
        fg = [e for e in els if e["id"] != "bg"]
        for n, a in enumerate(fg):
            for b in fg[n + 1 :]:
                if a.get("group_id") and a.get("group_id") == b.get("group_id"):
                    continue
                aa, bb = aabb(a), aabb(b)
                self.assertFalse(
                    aa[0] < bb[2] - 1e-6
                    and bb[0] < aa[2] - 1e-6
                    and aa[1] < bb[3] - 1e-6
                    and bb[1] < aa[3] - 1e-6,
                    (a["id"], b["id"]),
                )


if __name__ == "__main__":
    unittest.main()
