"""P2 (M3): full official field matrix, derived from the pinned upstream schema (skipped loudly when it is absent)."""
import copy
import json
import os
import unittest

from engine.resize import resize

UPSTREAM = os.environ.get("CHAMELEON_UPSTREAM", "/nonexistent")
SCHEMA = os.path.join(UPSTREAM, "chameleon_design_schema_v0.9.json")
SKIP = f"pinned upstream schema not found at {SCHEMA}; set CHAMELEON_UPSTREAM"

# THE one constant: which official fields are geometric. position/size follow the layout transform; the scalars scale by s.
POSITION = ("x", "y", "width", "height")
SCALARS = ("font_size", "letter_spacing", "corner_radius", "stroke_width")
GEOMETRIC = POSITION + SCALARS

SAMPLE = {"string": "v", "integer": 3, "number": 2.5, "array": [], "null": None}
SPECIAL = {  # a valid, non-default value per field; enums come from the schema itself
    "id": "e1", "x": 40, "y": 60, "width": 200, "height": 100, "rotation": -12.5, "opacity": 0.4, "z_index": 7, "group_id": "grp",
    "content": "Café ☕ مرحبا", "font_family": "Solstice Sans", "font_size": 32, "color": "rgba(1,2,3,0.5)",
    "line_height": 1.4, "letter_spacing": 3, "max_lines": 2, "asset_id": "a.png", "fill_color": "rgba(9,8,7,1)", "stroke_color": "rgba(1,1,1,1)",
    "stroke_width": 6, "corner_radius": 10,
    "style_runs": [{"start": 0, "end": 3, "color": "rgba(5,5,5,1)", "font_weight": "bold", "font_style": "italic"}],
}
BY_TYPE = {"text": ("content", "font_family", "font_size", "font_weight", "font_style", "color", "text_align", "line_height", "letter_spacing",
                    "max_lines", "style_runs"),
           "image": ("asset_id", "fit"), "shape": ("shape_type", "fill_color", "stroke_color", "stroke_width", "corner_radius")}
COMMON = ("id", "type", "x", "y", "width", "height", "rotation", "opacity", "z_index", "group_id")


def load_schema():
    with open(SCHEMA) as f:
        return json.load(f)


def values(props, name):
    if name in SPECIAL:
        return [SPECIAL[name]]
    p = props[name]
    return list(p["enum"]) if "enum" in p else [SAMPLE[p["type"] if isinstance(p["type"], str) else p["type"][0]]]


def element_fixtures(schema):
    """One fixture per (type, enum value): every field of that type set at once, varying one enum at a time."""
    props = schema["$defs"]["element"]["properties"]
    out = []
    for typ, own in BY_TYPE.items():
        names = [n for n in COMMON if n != "type"] + list(own)
        enums = [n for n in names if "enum" in props[n]]
        base = {"type": typ, **{n: values(props, n)[0] for n in names}}
        out.append((f"{typ}/base", base))
        for n in enums:
            for v in props[n]["enum"][1:]:
                out.append((f"{typ}/{n}={v}", {**base, n: v}))
    return out


def src(*els, w=1000, h=1000):
    return {"canvas": {"width": w, "height": h}, "elements": copy.deepcopy(list(els))}


@unittest.skipUnless(os.path.exists(SCHEMA), SKIP)
class FieldMatrix(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schema = load_schema()
        cls.props = cls.schema["$defs"]["element"]["properties"]
        cls.fixtures = element_fixtures(cls.schema)

    def test_every_schema_field_is_classified(self):
        covered = set(COMMON) | {n for v in BY_TYPE.values() for n in v}
        self.assertEqual(covered, set(self.props), "schema field not covered by the matrix")
        self.assertTrue(set(GEOMETRIC) <= set(self.props))

    def test_every_field_is_set_in_some_fixture(self):
        seen = {k for _, f in self.fixtures for k in f}
        self.assertEqual(seen, set(self.props))
        self.assertGreaterEqual(len(self.fixtures), 10)

    def test_non_geometry_fields_preserved_verbatim(self):
        for name, el in self.fixtures:
            with self.subTest(name):
                for target in ({"width": 500, "height": 2000}, {"width": 3000, "height": 300}, {"width": 1000, "height": 1000}):
                    out = resize(src(el), target)["elements"][0]
                    rest = lambda e: {k: v for k, v in e.items() if k not in GEOMETRIC}
                    self.assertEqual(rest(out), rest(el))
                    self.assertEqual(list(out), [k for k in el])  # key set and order unchanged

    def test_only_declared_geometry_changes_and_scalars_scale_by_s(self):
        for name, el in self.fixtures:
            with self.subTest(name):
                out = resize(src(el), {"width": 500, "height": 2000})["elements"][0]  # s = 0.5
                if el.get("fit") == "cover" or el["type"] == "image":
                    continue
                for k in SCALARS:
                    if k in el:
                        self.assertAlmostEqual(out[k], max(1.0, el[k] * 0.5) if k == "font_size" else el[k] * 0.5, msg=k)
                self.assertAlmostEqual(out["width"], el["width"] * 0.5)
                self.assertAlmostEqual(out["height"], el["height"] * 0.5)

    def test_identity_target_is_deep_equal(self):
        for name, el in self.fixtures:
            with self.subTest(name):
                self.assertEqual(resize(src(el), {"width": 1000, "height": 1000})["elements"][0], el)

    def test_input_unmutated_for_every_fixture(self):
        for name, el in self.fixtures:
            s = src(el); before = copy.deepcopy(s)
            resize(s, {"width": 321, "height": 777})
            self.assertEqual(s, before, name)

    def test_all_fixtures_together_ids_once_in_order(self):
        els = [dict(el, id=f"e{i}") for i, (_, el) in enumerate(self.fixtures)]
        out = resize(src(*els), {"width": 728, "height": 90})
        self.assertEqual([e["id"] for e in out["elements"]], [e["id"] for e in els])

    def test_nullable_and_default_fields_roundtrip(self):
        el = {"id": "n", "type": "shape", "x": 1, "y": 1, "width": 10, "height": 10, "shape_type": "line", "fill_color": "rgba(0,0,0,1)",
              "group_id": None, "stroke_color": None, "max_lines": None}
        out = resize(src(el), {"width": 400, "height": 400})["elements"][0]
        self.assertIsNone(out["group_id"]); self.assertIsNone(out["stroke_color"]); self.assertIsNone(out["max_lines"])
        self.assertEqual(out["shape_type"], "line")


@unittest.skipUnless(os.path.exists(SCHEMA), SKIP)
class NegativeFields(unittest.TestCase):
    """Schema-invalid non-geometry values must be rejected, not passed through (NaN would also make the output invalid JSON)."""
    BAD = {"rotation": [float("nan"), float("inf"), True, "1", None], "opacity": [-0.1, 1.1, float("nan"), True, "1"],
           "z_index": [1.5, True, "1", float("nan")], "group_id": [5, "", True], "font_size": [0, 0.5, -3, True, float("nan")],
           "line_height": [float("nan"), True, "1"], "letter_spacing": [float("inf"), True],
           "font_weight": ["heavy", 700], "font_style": ["oblique"], "text_align": ["justify"], "fit": ["stretch"],
           "shape_type": ["triangle"], "style_runs": ["x", {}, [1], [{"start": -1, "end": 2}], [{"start": 1.5, "end": 2}]],
           "max_lines": [1.5, True, "2"], "content": [5, None], "type": ["video", None, 5]}
    ELEMENT = {"text": {"id": "e", "type": "text", "x": 0, "y": 0, "width": 9, "height": 9, "content": "a", "font_family": "F", "font_size": 9, "color": "rgba(0,0,0,1)"}}

    def test_each_bad_value_rejected(self):
        base = self.ELEMENT["text"]
        shape = {"id": "e", "type": "shape", "x": 0, "y": 0, "width": 9, "height": 9, "shape_type": "rectangle", "fill_color": "rgba(0,0,0,1)"}
        image = {"id": "e", "type": "image", "x": 0, "y": 0, "width": 9, "height": 9, "asset_id": "a.png"}
        for field, bads in self.BAD.items():
            for bad in bads:
                for b in (base, shape, image):
                    if field in ("font_size", "line_height", "letter_spacing", "font_weight", "font_style", "text_align", "style_runs", "max_lines",
                                 "content") and b["type"] != "text":
                        continue
                    if field == "fit" and b["type"] != "image" or field == "shape_type" and b["type"] != "shape":
                        continue
                    with self.subTest(field=field, bad=repr(bad), type=b["type"]):
                        with self.assertRaises(ValueError):
                            resize(src({**b, field: bad}), {"width": 50, "height": 50})

    def test_missing_required_type_fields_rejected(self):
        req = {"text": ("content", "font_family", "font_size", "color"), "image": ("asset_id",), "shape": ("shape_type", "fill_color")}
        base = {"text": self.ELEMENT["text"],
                "image": {"id": "e", "type": "image", "x": 0, "y": 0, "width": 9, "height": 9, "asset_id": "a.png"},
                "shape": {"id": "e", "type": "shape", "x": 0, "y": 0, "width": 9, "height": 9, "shape_type": "rectangle", "fill_color": "rgba(0,0,0,1)"}}
        for typ, names in req.items():
            for n in names:
                el = dict(base[typ]); del el[n]
                with self.subTest(typ=typ, field=n), self.assertRaises(ValueError):
                    resize(src(el), {"width": 50, "height": 50})


@unittest.skipUnless(os.path.isdir(os.path.join(UPSTREAM, "input")), f"public samples not found under {UPSTREAM}/input; set CHAMELEON_UPSTREAM")
class PublicSamples(unittest.TestCase):
    def tasks(self):
        d = os.path.join(UPSTREAM, "input")
        names = sorted(n for n in os.listdir(d) if n.endswith(".json"))
        self.assertEqual(len(names), 3, names)
        for n in names:
            with open(os.path.join(d, n)) as f:
                yield n, json.load(f)

    def test_samples_per_element_invariants(self):
        for n, t in self.tasks():
            with self.subTest(n):
                s, tc = t["source"], t["target_canvas"]
                before = copy.deepcopy(s)
                out = resize(s, tc)
                self.assertEqual(s, before)
                self.assertEqual(out["canvas"], tc)
                self.assertEqual([e["id"] for e in out["elements"]], [e["id"] for e in s["elements"]])
                for a, b in zip(s["elements"], out["elements"]):
                    for k in ("id", "type", "group_id", "rotation", "z_index", "opacity"):
                        self.assertEqual(b.get(k, "<absent>"), a.get(k, "<absent>"), f"{a['id']}.{k}")
                    self.assertEqual({k: v for k, v in b.items() if k not in GEOMETRIC}, {k: v for k, v in a.items() if k not in GEOMETRIC})
                    self.assertTrue(all(isinstance(b[k], (int, float)) for k in POSITION))
                json.dumps(out, allow_nan=False)

    def test_sample_groups_keep_relative_layout(self):
        """P6: ONE ratio k_g per group across ALL members (offsets from the first member, widths, heights); k_g == s unless the group was
        upscaled by the wide split; compact banner plates instead retain label containment."""
        for n, t in self.tasks():
            s = t["source"]; out = resize(s, t["target_canvas"])
            k = min(t["target_canvas"]["width"] / s["canvas"]["width"], t["target_canvas"]["height"] / s["canvas"]["height"])
            groups = {}
            for a, b in zip(s["elements"], out["elements"]):
                if a.get("group_id"):
                    groups.setdefault(a["group_id"], []).append((a, b))
            for g, pairs in groups.items():
                if 'level3' in n:
                    # Compact banners refit plate padding around readable copy.
                    plate=next(b for a,b in pairs if b['type']=='shape')
                    label=next(b for a,b in pairs if b['type']=='text')
                    for axis,dim in [('x','width'),('y','height')]:
                        self.assertAlmostEqual(plate[axis]+plate[dim]/2,label[axis]+label[dim]/2)
                        self.assertGreaterEqual(plate[dim],label[dim])
                    continue
                (a0, b0) = pairs[0]
                ks = [b["width"] / a["width"] for a, b in pairs] + [b["height"] / a["height"] for a, b in pairs]
                for a, b in pairs[1:]:
                    for ax in ("x", "y"):
                        if a[ax] != a0[ax]:
                            ks.append((b[ax] - b0[ax]) / (a[ax] - a0[ax]))
                with self.subTest(n, group=g):
                    for r in ks:
                        self.assertAlmostEqual(r, ks[0], 6)
                    self.assertGreaterEqual(ks[0], k - 1e-9)
                    if "level3" not in n and "level2" not in n:
                        self.assertAlmostEqual(ks[0], k, 6)


if __name__ == "__main__":
    unittest.main()
