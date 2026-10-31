"""Contract-first tests for the future LICA -> official format converter.

Run from the repo root with CHAMELEON_UPSTREAM pointing to the pinned starter:
    python -m unittest tests_python.test_lica_official -v
Only synthetic LICA fixtures and the three public Adobe sources are opened.
"""
from collections import Counter
import copy
from decimal import Decimal
import hashlib
import importlib
import json
import os
from pathlib import Path
import re
import unittest

from tests_python.official_schema_assertions import assert_schema_valid

ROOT = Path(__file__).resolve().parent.parent
UPSTREAM = Path(os.environ.get("CHAMELEON_UPSTREAM", ROOT.parent / "reflow-studio-spikes/chameleon-official"))
SCHEMA_FILE = UPSTREAM / "chameleon_design_schema_v0.9.json"
SCHEMA_SHA256 = "14d97d48c4f00357f7f27d2e8000ef9cc8778cac7cd5a621ed7e1261f949820d"
ALLOWED_TEMPLATE = "69a274dd-7f45-4883-8965-f27390a27179"
SEALED_TEMPLATES = (
    "ff1965c1-2739-4902-8d77-ee782a1501b6",
    "3a0b7e24-fe06-4645-961d-8b063b9b4122",
    "f2453c19-78eb-4cfc-aebc-da914389ba79",
    "0fd97113-ec95-4d61-9284-fd62fa3b30ac",
    "e70d8252-9ffa-49e7-a0e2-3a389aaf0243",
)
TARGETS = (
    (1080, 1080), (1080, 1920), (1920, 1080), (1080, 1350),
    (1500, 500), (728, 90), (160, 600),
)


def text(eid="0-2", **overrides):
    return {"type": "TEXT", "id": eid, "left": "10.25px", "top": "20.5px",
            "width": "240px", "height": "80px", "transform": "none",
            "text": "Hello café", "fontFamily": "Montserrat--400", "fontWeight": "400",
            "fontSize": "20px", "fontStyle": "normal", "color": "rgb(12, 34, 56)",
            "textAlign": "left", "lineHeight": "24px", "letterSpacing": "0em",
            "textTransform": "none", **overrides}


def image(eid="0-1", **overrides):
    return {"type": "IMAGE", "id": eid, "left": "4px", "top": "5px",
            "width": "120px", "height": "60px", "transform": "none", "opacity": 1,
            "src": "https://storage.googleapis.com/lica-video/photo.png", **overrides}


def shape(eid="0-0-0", **overrides):
    return {"type": "GROUP", "id": eid, "left": "0px", "top": "0px",
            "width": "100px", "height": "40px", "transform": "none",
            "backgroundColor": "rgb(9, 8, 7)", **overrides}


def layout(*components, **overrides):
    return {"width": "1000px", "height": "800px", "background": "rgba(0,0,0,0)",
            "components": copy.deepcopy(list(components)), **overrides}


def rgba_channels(css):
    match = re.fullmatch(r"rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.eE+-]+)\s*\)", css)
    if not match:
        raise AssertionError(f"Expected a numeric rgba() color, got {css!r}")
    return tuple(int(match[i]) for i in (1, 2, 3)) + (Decimal(match[4]),)


class UnopenedLayout(dict):
    """A sentinel that detects conversion attempting to inspect a blocked design."""
    def __getitem__(self, key):
        raise AssertionError("Blocked layout was read before its metadata gate")

    def get(self, *args):
        raise AssertionError("Blocked layout was read before its metadata gate")

    def __iter__(self):
        raise AssertionError("Blocked layout was read before its metadata gate")

    def items(self):
        raise AssertionError("Blocked layout was read before its metadata gate")

    def __len__(self):
        raise AssertionError("Blocked layout was read before its metadata gate")


class SchemaContext(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not SCHEMA_FILE.is_file():
            raise AssertionError(f"Pinned Adobe schema missing: {SCHEMA_FILE}; set CHAMELEON_UPSTREAM")
        schema_bytes = SCHEMA_FILE.read_bytes()
        if hashlib.sha256(schema_bytes).hexdigest() != SCHEMA_SHA256:
            raise AssertionError("Adobe schema differs from the pinned a44a060 file")
        cls.schema = json.loads(schema_bytes)


class PinnedSchemaControls(SchemaContext):
    def test_schema_file_matches_pinned_hash(self):
        self.assertEqual(hashlib.sha256(SCHEMA_FILE.read_bytes()).hexdigest(), SCHEMA_SHA256)

    def test_schema_accepts_all_three_public_source_controls(self):
        samples = sorted((UPSTREAM / "input").glob("*.json"))
        self.assertEqual(len(samples), 3)
        for path in samples:
            with self.subTest(sample=path.name):
                assert_schema_valid(json.loads(path.read_text())["source"], self.schema)

    def test_schema_rejects_invalid_design_controls(self):
        valid = {"canvas": {"width": 100, "height": 100}, "elements": [
            {"id": "t", "type": "text", "x": 0, "y": 0, "width": 30, "height": 20,
             "content": "Hi", "font_family": "Montserrat", "font_size": 12,
             "color": "rgba(0,0,0,1)"}]}
        invalid = []
        for value in (0, 1.5, True, "100"):
            case = copy.deepcopy(valid); case["canvas"]["width"] = value; invalid.append(case)
        for field, value in (("width", -1), ("opacity", 1.1), ("z_index", 1.5),
                             ("font_size", 0.5), ("font_weight", "600"), ("font_style", "oblique"),
                             ("style_runs", [{"start": -1, "end": 2}]),
                             ("style_runs", [{"start": 0}]), ("rotation", float("nan"))):
            case = copy.deepcopy(valid); case["elements"][0][field] = value; invalid.append(case)
        for typ, missing in (("text", "color"), ("image", "asset_id"), ("shape", "fill_color")):
            case = copy.deepcopy(valid)
            case["elements"][0].update(type=typ, asset_id="a.png", shape_type="rectangle", fill_color="rgba(0,0,0,1)")
            del case["elements"][0][missing]; invalid.append(case)
        case = copy.deepcopy(valid); case["elements"] = []; invalid.append(case)
        case = copy.deepcopy(valid); case["canvas"]["extra"] = 1; invalid.append(case)
        case = copy.deepcopy(valid); case["extra"] = 1; invalid.append(case)
        invalid.append({"source": valid, "target_canvas": valid["canvas"], "task_id": "wrapper"})
        for index, case in enumerate(invalid):
            with self.subTest(mutation=index), self.assertRaises(AssertionError):
                assert_schema_valid(case, self.schema)

    def test_schema_helper_refuses_unimplemented_keywords(self):
        changed = copy.deepcopy(self.schema)
        changed["$defs"]["element"]["properties"]["id"]["pattern"] = "^x$"
        with self.assertRaisesRegex(ValueError, "pattern"):
            assert_schema_valid({}, changed)


class LicaOfficialContract(SchemaContext):
    def converter(self):
        try:
            module = importlib.import_module("scripts.lica_official")
        except ModuleNotFoundError as exc:
            if exc.name != "scripts.lica_official":
                raise
            self.fail("LICA official conversion is not implemented: scripts.lica_official is absent")
        self.assertTrue(callable(getattr(module, "convert_layout", None)), "convert_layout entry point is absent")
        return module.convert_layout

    def convert(self, source, **overrides):
        args = {"layout_id": "synthetic-layout", "template_id": ALLOWED_TEMPLATE,
                "category": "Business Documents", "split": "development",
                "target_canvas": {"width": 1080, "height": 1350}, **overrides}
        return self.converter()(source, **args)

    def converted(self, source, **overrides):
        result = self.convert(source, **overrides)
        self.assertEqual(result["status"], "converted", result.get("ledger"))
        self.assertEqual(result["ledger"]["status"], "converted")
        self.assertEqual(result["ledger"]["reasons"], [])
        self.assertIsInstance(result["task"], dict)
        return result

    def skipped(self, source, **overrides):
        result = self.convert(source, **overrides)
        self.assertEqual(result["status"], "skipped")
        self.assertEqual(result["ledger"]["status"], "skipped")
        self.assertIsNone(result["task"], "Unsupported layouts must not expose partial tasks")
        self.assertTrue(result["ledger"]["reasons"])
        for reason in result["ledger"]["reasons"]:
            self.assertTrue(reason["code"])
            self.assertTrue(reason["detail"])
            self.assertIn("element_id", reason)
        return result

    def test_original_component_ids_kept_exactly_once(self):
        result = self.converted(layout(shape(), image(), text(eid="Original-ID-é")))
        elements = result["task"]["source"]["elements"]
        self.assertEqual(Counter(e["id"] for e in elements), Counter(["0-0-0", "0-1", "Original-ID-é"]))
        self.assertEqual([e["type"] for e in elements], ["shape", "image", "text"])
        self.assertEqual(result["ledger"]["input_element_ids"], ["0-0-0", "0-1", "Original-ID-é"])

    def test_source_geometry_and_paint_order_are_preserved(self):
        result = self.converted(layout(text(), shape(), image()))
        source = result["task"]["source"]
        self.assertEqual(source["canvas"], {"width": 1000, "height": 800})
        self.assertEqual([e["id"] for e in source["elements"]], ["0-2", "0-0-0", "0-1"])
        self.assertEqual([e["z_index"] for e in source["elements"]], [0, 1, 2])
        e = source["elements"][0]
        self.assertEqual([e[k] for k in ("x", "y", "width", "height")], [10.25, 20.5, 240, 80])

    def test_zero_size_text_and_image_are_not_omitted(self):
        result = self.converted(layout(text(height="0px"), image(width="0px")))
        elements = result["task"]["source"]["elements"]
        self.assertEqual([e["id"] for e in elements], ["0-2", "0-1"])
        self.assertEqual(elements[0]["height"], 0)
        self.assertEqual(elements[1]["width"], 0)
        assert_schema_valid(result["task"]["source"], self.schema)

    def test_duplicate_and_nonstring_component_ids_are_refused(self):
        self.converter()
        for source, code in ((layout(text(), image(eid="0-2")), "duplicate-element-id"),
                             (layout(text(eid=7)), "missing-element-id")):
            with self.subTest(reason=code):
                result = self.skipped(source)
                self.assertIn(code, [r["code"] for r in result["ledger"]["reasons"]])

    def test_missing_ids_use_component_indices_and_are_logged(self):
        missing = text(); del missing["id"]
        source = layout(missing, image(eid=None), shape(eid=" "))
        before = copy.deepcopy(source)
        result = self.converted(source)
        self.assertEqual([e["id"] for e in result["task"]["source"]["elements"]], ["lica-0", "lica-1", "lica-2"])
        self.assertEqual(result["ledger"]["assigned_ids"], [
            {"component_index": i, "original": value, "id": f"lica-{i}", "rule": "missing-id-component-index"}
            for i, value in enumerate((None, None, " "))])
        self.assertEqual(source, before)
        self.assertEqual(self.converted(source), result)

    def test_assigned_ids_avoid_existing_ids_even_in_later_components(self):
        missing = text(); del missing["id"]
        source = layout(missing, image(eid="lica-0"), shape(eid="lica-0-1"), image(eid=None))
        result = self.converted(source)
        ids = [e["id"] for e in result["task"]["source"]["elements"]]
        self.assertEqual(ids, ["lica-0-2", "lica-0", "lica-0-1", "lica-3"])
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(result["ledger"]["assigned_ids"][0]["id"], "lica-0-2")
        assert_schema_valid(result["task"]["source"], self.schema)

    def test_justified_text_maps_to_left_with_a_per_element_record(self):
        result = self.converted(layout(text(eid="j1", textAlign="justify"), text(eid="j2", textAlign="justify"),
                                       text(eid="r", textAlign="right")))
        self.assertEqual([e["text_align"] for e in result["task"]["source"]["elements"]], ["left", "left", "right"])
        self.assertEqual([r for r in result["ledger"]["changes"] if r["field"] == "text_align"], [
            {"element_id": eid, "field": "text_align", "original": "justify", "value": "left", "rule": "justify-to-left"}
            for eid in ("j1", "j2")])

    def test_a5_layout_remains_blocked_before_layout_access(self):
        result = self.skipped(UnopenedLayout(), layout_id="A5ijgpumOCZpbBwUaoE0")
        self.assertIn("blocked-layout", [r["code"] for r in result["ledger"]["reasons"]])

    def test_input_layout_and_target_are_not_mutated_or_aliased(self):
        source = layout(text())
        target = {"width": 728, "height": 90}
        before = copy.deepcopy(source)
        result = self.converted(source, target_canvas=target)
        self.assertEqual(source, before)
        self.assertEqual(target, {"width": 728, "height": 90})
        result["task"]["source"]["elements"][0]["content"] = "changed"
        result["task"]["target_canvas"]["width"] = 1
        self.assertEqual(source, before)
        self.assertEqual(target, {"width": 728, "height": 90})

    def test_untransformed_text_is_byte_identical(self):
        content = "  Café e\u0301 ☕ مرحبا\n\tSecond line\r\nEnd  "
        result = self.converted(layout(text(text=content)))
        actual = result["task"]["source"]["elements"][0]["content"]
        self.assertEqual(actual.encode("utf-8"), content.encode("utf-8"))
        self.assertEqual(result["ledger"]["text"], [{"element_id": "0-2", "original": content,
                                                     "transform": "none", "displayed": content}])

    def test_uppercase_uses_displayed_text_and_records_raw_text(self):
        result = self.converted(layout(text(text="Straße café\n  keep\tspaces", textTransform="uppercase")))
        self.assertEqual(result["task"]["source"]["elements"][0]["content"], "STRASSE CAFÉ\n  KEEP\tSPACES")
        self.assertEqual(result["ledger"]["text"], [{"element_id": "0-2", "original": "Straße café\n  keep\tspaces",
                                                     "transform": "uppercase", "displayed": "STRASSE CAFÉ\n  KEEP\tSPACES"}])

    def test_absent_text_transform_preserves_raw_text(self):
        component = text(text=" MiXeD\n spacing "); del component["textTransform"]
        result = self.converted(layout(component))
        self.assertEqual(result["task"]["source"]["elements"][0]["content"].encode("utf-8"), b" MiXeD\n spacing ")
        self.assertEqual(result["ledger"]["text"][0], {"element_id": "0-2", "original": " MiXeD\n spacing ",
                                                       "transform": "none", "displayed": " MiXeD\n spacing "})

    def test_lowercase_uses_displayed_text_and_records_transform(self):
        result = self.converted(layout(text(text="ÉCOLE\n HELLO ", textTransform="lowercase")))
        self.assertEqual(result["task"]["source"]["elements"][0]["content"], "école\n hello ")
        self.assertEqual(result["ledger"]["text"][0], {"element_id": "0-2", "original": "ÉCOLE\n HELLO ",
                                                       "transform": "lowercase", "displayed": "école\n hello "})

    def test_weight_threshold_and_each_mapping_are_recorded(self):
        values = [(400, "regular"), (500, "regular"), (599, "regular"), (600, "bold"),
                  (700, "bold"), (800, "bold"), (900, "bold")]
        components = [text(eid=f"w{weight}", fontWeight=str(weight)) for weight, _ in values]
        result = self.converted(layout(*components))
        self.assertEqual([e["font_weight"] for e in result["task"]["source"]["elements"]],
                         ["regular", "regular", "regular", "bold", "bold", "bold", "bold"])
        self.assertEqual(result["ledger"]["weights"], [
            {"element_id": f"w{weight}", "original": str(weight), "numeric": weight,
             "mapped": mapped, "rule": "600-and-above-bold"} for weight, mapped in values])

    def test_family_suffix_supplies_weight_when_explicit_weight_absent(self):
        component = text(fontFamily="Open Sans--600"); del component["fontWeight"]
        result = self.converted(layout(component))
        element = result["task"]["source"]["elements"][0]
        self.assertEqual(element["font_family"], "Open Sans")
        self.assertEqual(element["font_weight"], "bold")
        self.assertEqual(result["ledger"]["weights"][0], {"element_id": "0-2", "original": "600", "numeric": 600,
                                                          "mapped": "bold", "rule": "600-and-above-bold"})

    def test_color_channels_and_fractional_alpha_are_exact(self):
        self.converter()
        values = [("rgb(12, 34, 56)", (12, 34, 56, Decimal(1))),
                  ("rgba(12,34,56,0.123456789)", (12, 34, 56, Decimal("0.123456789"))),
                  ("#123", (17, 34, 51, Decimal(1))),
                  ("#123456", (18, 52, 86, Decimal(1))),
                  ("rgba(1,2,3,0)", (1, 2, 3, Decimal(0)))]
        for color, expected in values:
            with self.subTest(color=color):
                result = self.converted(layout(text(color=color), shape(backgroundColor=color)))
                t, s = result["task"]["source"]["elements"]
                self.assertEqual(rgba_channels(t["color"]), expected)
                self.assertEqual(rgba_channels(s["fill_color"]), expected)

    def test_hex_alpha_retains_original_byte_fraction(self):
        self.converter()
        for color, expected_rgb, expected_alpha in (("#1234", (17, 34, 51), 68 / 255),
                                                    ("#12345680", (18, 52, 86), 128 / 255)):
            with self.subTest(color=color):
                result = self.converted(layout(text(color=color)))
                actual = rgba_channels(result["task"]["source"]["elements"][0]["color"])
                self.assertEqual(actual[:3], expected_rgb)
                self.assertEqual(float(actual[3]), expected_alpha)

    def test_opacity_is_separate_from_fill_alpha(self):
        result = self.converted(layout(shape(backgroundColor="rgba(9,8,7,0.25)", opacity=0.4)))
        element = result["task"]["source"]["elements"][0]
        self.assertEqual(element["opacity"], 0.4)
        self.assertEqual(rgba_channels(element["fill_color"]), (9, 8, 7, Decimal("0.25")))

    def test_italic_spacing_and_sub_one_line_height_are_preserved(self):
        result = self.converted(layout(text(fontStyle="italic", textAlign="right", lineHeight="16px", letterSpacing="0.15em")))
        element = result["task"]["source"]["elements"][0]
        self.assertEqual(element["font_style"], "italic")
        self.assertEqual(element["text_align"], "right")
        self.assertEqual(element["line_height"], 0.8)
        self.assertEqual(element["letter_spacing"], 3)

    def test_pixel_spacing_and_percentage_line_height_are_converted(self):
        result = self.converted(layout(text(lineHeight="150%", letterSpacing="2.5px")))
        element = result["task"]["source"]["elements"][0]
        self.assertEqual(element["line_height"], 1.5)
        self.assertEqual(element["letter_spacing"], 2.5)

    def test_rotation_is_kept_for_text_image_and_shape(self):
        result = self.converted(layout(text(transform="rotate(-12.5deg)"), image(transform="rotate(90deg)"),
                                       shape(transform="rotate(-45deg)")))
        self.assertEqual([e["rotation"] for e in result["task"]["source"]["elements"]], [-12.5, 90, -45])
        self.assertEqual(result["task"]["source"]["elements"][0]["x"], 10.25)

    def test_image_filename_and_original_url_are_traceable(self):
        url = "https://storage.googleapis.com/lica-video/photo.png?version=2"
        result = self.converted(layout(image(src=url)))
        element = result["task"]["source"]["elements"][0]
        self.assertEqual(element["asset_id"], "photo.png")
        self.assertEqual(element["fit"], "cover")
        self.assertEqual(result["ledger"]["assets"], [{"element_id": "0-1", "asset_id": "photo.png", "source": url}])

    def test_flat_group_artwork_is_not_invented_semantic_grouping(self):
        result = self.converted(layout(shape(), text()))
        element = result["task"]["source"]["elements"][0]
        self.assertEqual(element["shape_type"], "rectangle")
        self.assertEqual(rgba_channels(element["fill_color"]), (9, 8, 7, Decimal(1)))
        for element in result["task"]["source"]["elements"]:
            self.assertIsNone(element.get("group_id"))

    def test_all_unsupported_features_are_reported_without_partial_task(self):
        source = layout(image(eid="masked", clipPath='path("M0,0L100,0L50,50Z")', transform="scale(-1,1)"),
                        shape(eid="path", clipPath='path("M0,0C10,10 20,20 30,30Z")'),
                        text(eid="curved", curvature=20), text(eid="markup", text="<b>Hello</b>"),
                        text(eid="unaligned", textAlign="start"))
        result = self.skipped(source)
        reported = {(r["element_id"], r["code"]) for r in result["ledger"]["reasons"]}
        self.assertTrue({("masked", "image-mask"), ("masked", "unsupported-transform"),
                         ("path", "shape-clip"), ("curved", "curved-text"),
                         ("markup", "rich-text-markup"), ("unaligned", "unsupported-text-align")} <= reported)
        self.assertEqual(result["ledger"]["input_element_ids"], ["masked", "path", "curved", "markup", "unaligned"])
        self.assertEqual(result["ledger"]["layout_id"], "synthetic-layout")

    def test_rectangular_shape_clip_is_an_allowed_positive_control(self):
        result = self.converted(layout(shape(clipPath='path("M0,0L100,0L100,40L0,40Z")')))
        element = result["task"]["source"]["elements"][0]
        self.assertEqual(element["id"], "0-0-0")
        self.assertEqual(element["shape_type"], "rectangle")
        self.assertEqual((element["width"], element["height"]), (100, 40))

    def test_other_text_transforms_are_refused_explicitly(self):
        result = self.skipped(layout(text(textTransform="capitalize")))
        self.assertIn(("0-2", "unsupported-text-transform"),
                      [(r["element_id"], r["code"]) for r in result["ledger"]["reasons"]])

    def test_unknown_component_type_is_refused_with_its_id(self):
        result = self.skipped(layout(text(eid="new-text", type="TEXT_NEW"), text()))
        self.assertIn(("new-text", "unsupported-component-type"),
                      [(r["element_id"], r["code"]) for r in result["ledger"]["reasons"]])

    def test_invalid_geometry_color_and_weight_are_not_silently_defaulted(self):
        self.converter()
        cases = [(text(width="-1px"), "invalid-geometry"), (text(left="NaNpx"), "invalid-geometry"),
                 (text(opacity=1.1), "invalid-opacity"), (text(color="rgba(300,0,0,1)"), "unsupported-color"),
                 (text(fontWeight="heavy"), "invalid-font-weight"), (text(fontSize="0px"), "invalid-font-size")]
        for component, code in cases:
            with self.subTest(reason=code):
                result = self.skipped(layout(component))
                self.assertIn(("0-2", code), [(r["element_id"], r["code"]) for r in result["ledger"]["reasons"]])

    def test_translation_and_mirroring_are_refused(self):
        self.converter()
        for transform in ("translate(10px,0px)", "scale(-1,1)", "matrix(1,0,0,1,5,0)"):
            with self.subTest(transform=transform):
                result = self.skipped(layout(image(transform=transform)))
                self.assertIn(("0-1", "unsupported-transform"),
                              [(r["element_id"], r["code"]) for r in result["ledger"]["reasons"]])

    def test_all_five_sealed_template_ids_are_refused_before_layout_access(self):
        self.converter()
        for template_id in SEALED_TEMPLATES:
            with self.subTest(template_id=template_id):
                result = self.skipped(UnopenedLayout(), template_id=template_id)
                self.assertEqual(result["ledger"]["template_id"], template_id)
                self.assertEqual(result["ledger"]["input_element_ids"], [])
                self.assertIn("sealed-template", [r["code"] for r in result["ledger"]["reasons"]])

    def test_allowed_template_is_not_rejected_by_sealed_gate(self):
        result = self.converted(layout(text()), template_id=ALLOWED_TEMPLATE)
        self.assertEqual(result["ledger"]["template_id"], ALLOWED_TEMPLATE)

    def test_solid_canvas_background_is_documented_and_cannot_collide_with_ids(self):
        component = text(eid="__lica_background__")
        result = self.converted(layout(component, background="rgba(12,34,56,0.5)"))
        elements = result["task"]["source"]["elements"]
        self.assertEqual(sum(e["id"] == "__lica_background__" for e in elements), 1)
        self.assertEqual(len(elements), 2)
        synthetic = result["ledger"]["synthetic_elements"]
        self.assertEqual(len(synthetic), 1)
        self.assertNotEqual(synthetic[0], "__lica_background__")
        background = next(e for e in elements if e["id"] == synthetic[0])
        self.assertEqual(background["shape_type"], "rectangle")
        self.assertEqual(rgba_channels(background["fill_color"]), (12, 34, 56, Decimal("0.5")))
        self.assertEqual([background[k] for k in ("x", "y", "width", "height")], [0, 0, 1000, 800])
        self.assertLess(background["z_index"], next(e for e in elements if e["id"] == "__lica_background__")["z_index"])
        assert_schema_valid(result["task"]["source"], self.schema)

    def test_missing_text_color_default_is_recorded(self):
        component = text(); del component["color"]
        result = self.converted(layout(component))
        self.assertEqual(rgba_channels(result["task"]["source"]["elements"][0]["color"]), (0, 0, 0, Decimal(1)))
        changes = [c for c in result["ledger"]["changes"] if c["element_id"] == "0-2" and c["field"] == "color"]
        self.assertEqual(len(changes), 1)
        self.assertIsNone(changes[0]["original"])
        self.assertEqual(rgba_channels(changes[0]["value"]), (0, 0, 0, Decimal(1)))
        self.assertTrue(changes[0]["rule"])

    def test_each_manifest_target_keeps_the_source_design_unchanged(self):
        self.converter()
        source = layout(text(), image())
        reference = None
        task_ids = set()
        for width, height in TARGETS:
            with self.subTest(target=(width, height)):
                result = self.converted(source, target_canvas={"width": width, "height": height})
                self.assertEqual(result["task"]["target_canvas"], {"width": width, "height": height})
                self.assertIsInstance(result["task"]["task_id"], str)
                self.assertTrue(result["task"]["task_id"])
                task_ids.add(result["task"]["task_id"])
                if reference is None:
                    reference = result["task"]["source"]
                self.assertEqual(result["task"]["source"], reference)
        self.assertEqual(len(task_ids), 7, "Different target tasks must not share a task ID")

    def test_converted_source_validates_against_the_pinned_schema(self):
        result = self.converted(layout(shape(opacity=0.7), image(), text(fontWeight="600", fontStyle="italic")))
        assert_schema_valid(result["task"]["source"], self.schema)
        assert_schema_valid({"canvas": result["task"]["target_canvas"],
                             "elements": result["task"]["source"]["elements"]}, self.schema)
        json.dumps(result["task"], allow_nan=False)

    def test_existing_development_and_validation_splits_are_preserved(self):
        self.converter()
        for split in ("development", "validation"):
            with self.subTest(split=split):
                result = self.converted(layout(text()), split=split)
                self.assertEqual(result["ledger"]["split"], split)
                self.assertEqual(result["ledger"]["category"], "Business Documents")

    def test_animated_category_is_skipped_before_layout_access(self):
        result = self.skipped(UnopenedLayout(), category="Videos")
        self.assertIn("animated-layout", [r["code"] for r in result["ledger"]["reasons"]])

    def test_fractional_source_canvas_and_invalid_target_are_refused(self):
        self.converter()
        cases = [(layout(text(), width="1000.5px"), {"width": 1080, "height": 1350}, "invalid-source-canvas"),
                 (layout(text()), {"width": 0, "height": 90}, "invalid-target-canvas"),
                 (layout(text()), {"width": True, "height": 90}, "invalid-target-canvas")]
        for source, target, code in cases:
            with self.subTest(reason=code):
                result = self.skipped(source, target_canvas=target)
                self.assertIn(code, [r["code"] for r in result["ledger"]["reasons"]])


if __name__ == "__main__":
    unittest.main()
