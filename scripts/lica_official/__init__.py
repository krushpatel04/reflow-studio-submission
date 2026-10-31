"""Convert flat LICA layouts into official Chameleon tasks without file I/O.

Conversion decisions and blockers are returned in a per-layout ledger. Resource
preparation and renderer verification are separate from this module.
"""
import copy
from decimal import Decimal, InvalidOperation
import math
import re
from urllib.parse import urlsplit


SEALED_TEMPLATE_IDS = frozenset({
    "ff1965c1-2739-4902-8d77-ee782a1501b6",
    "3a0b7e24-fe06-4645-961d-8b063b9b4122",
    "f2453c19-78eb-4cfc-aebc-da914389ba79",
    "0fd97113-ec95-4d61-9284-fd62fa3b30ac",
    "e70d8252-9ffa-49e7-a0e2-3a389aaf0243",
})
_NUMBER = r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?"
_PIXELS = re.compile(rf"({_NUMBER})(?:px)?")
_TRANSFORM = re.compile(r"([A-Za-z]+)\(([^()]*)\)")
_COMMON_FIELDS = {"type", "id", "left", "top", "width", "height", "transform", "opacity"}
_TYPE_FIELDS = {
    "TEXT": {"text", "fontFamily", "fontWeight", "fontSize", "fontStyle", "color",
             "textAlign", "lineHeight", "letterSpacing", "textTransform", "curvature"},
    "IMAGE": {"src", "clipPath", "overflow"},
    "GROUP": {"background", "backgroundColor", "clipPath"},
}


def _number(value, *, pixels=False):
    if isinstance(value, bool):
        raise ValueError("booleans are not numeric values")
    if isinstance(value, (int, float)):
        number = float(value)
    elif isinstance(value, str):
        pattern = _PIXELS if pixels else re.compile(_NUMBER)
        match = pattern.fullmatch(value.strip())
        if not match:
            raise ValueError(f"invalid {'pixel' if pixels else 'numeric'} value {value!r}")
        number = float(match[1] if pixels else match[0])
    else:
        raise ValueError(f"expected a numeric value, got {value!r}")
    if not math.isfinite(number):
        raise ValueError("number must be finite")
    return number


def _rgba(value):
    if not isinstance(value, str):
        raise ValueError("expected a solid CSS color")
    css = value.strip()
    if css == "transparent":
        return "rgba(0,0,0,0)"
    if re.fullmatch(r"#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})", css):
        digits = css[1:]
        if len(digits) in (3, 4):
            digits = "".join(character * 2 for character in digits)
        rgb = [int(digits[i:i + 2], 16) for i in (0, 2, 4)]
        alpha = str(int(digits[6:8], 16) / 255) if len(digits) == 8 else "1"
        return f"rgba({rgb[0]},{rgb[1]},{rgb[2]},{alpha})"
    match = re.fullmatch(r"(rgb|rgba)\(([^()]*)\)", css)
    if not match:
        raise ValueError(f"unsupported solid color {value!r}")
    tokens = [token.strip() for token in match[2].split(",")]
    if len(tokens) != (4 if match[1] == "rgba" else 3):
        raise ValueError("wrong number of color channels")
    try:
        channels = [Decimal(token) for token in tokens]
    except InvalidOperation as error:
        raise ValueError("invalid color channel") from error
    if not all(channel.is_finite() for channel in channels):
        raise ValueError("color channels must be finite")
    if any(not 0 <= channel <= 255 for channel in channels[:3]):
        raise ValueError("RGB channels must be between 0 and 255")
    if len(channels) == 3:
        channels.append(Decimal(1))
    if not 0 <= channels[3] <= 1:
        raise ValueError("alpha must be between 0 and 1")
    # Decimal formatting keeps rgba alpha precise; it never passes through hex.
    values = [format(channel, "f") for channel in channels]
    return "rgba(" + ",".join(values) + ")"


def _rotation(value):
    if value is None or value == "none" or value == "":
        return 0.0
    if not isinstance(value, str):
        raise ValueError("expected CSS transform text")
    rotation = 0.0
    position = 0
    for match in _TRANSFORM.finditer(value):
        if value[position:match.start()].strip():
            raise ValueError("unparsed transform syntax")
        function, arguments = match[1], match[2].strip()
        if function == "rotate":
            angle = re.fullmatch(rf"({_NUMBER})deg", arguments)
            if not angle:
                raise ValueError("only degree rotations are supported")
            rotation += _number(angle[1])
        else:
            args = re.split(r"\s*,\s*|\s+", arguments)
            numeric = [_number(arg, pixels=function.startswith("translate")) for arg in args]
            identity = (
                function == "scale" and len(numeric) in (1, 2) and all(n == 1 for n in numeric)
                or function in ("scaleX", "scaleY") and numeric == [1]
                or function == "translate" and len(numeric) in (1, 2) and all(n == 0 for n in numeric)
                or function in ("translateX", "translateY") and numeric == [0]
                or function == "matrix" and numeric == [1, 0, 0, 1, 0, 0]
            )
            if not identity:
                raise ValueError(f"unsupported transform {function}({arguments})")
        position = match.end()
    if position == 0 or value[position:].strip() or not math.isfinite(rotation):
        raise ValueError("invalid transform syntax or nonfinite rotation")
    return rotation


def _rectangular_clip(value):
    if value is None or value == "" or value == "none":
        return True
    if not isinstance(value, str):
        return False
    match = re.fullmatch(r'path\("([^"()]*)"\)', value.strip())
    if not match:
        return False
    data = match[1]
    tokens = re.findall(rf"[MLZ]|{_NUMBER}", data)
    if re.sub(rf"[MLZ]|{_NUMBER}|[\s,]", "", data):
        return False
    points = []
    index = 0
    while index < len(tokens):
        command = tokens[index]
        if command == "Z":
            if index != len(tokens) - 1:
                return False
            break
        if command != ("M" if not points else "L") or index + 2 >= len(tokens):
            return False
        try:
            points.append((_number(tokens[index + 1]), _number(tokens[index + 2])))
        except ValueError:
            return False
        index += 3
    if len(points) == 5 and points[-1] == points[0]:
        points.pop()
    if len(points) != 4 or len(set(points)) != 4:
        return False
    xs, ys = {p[0] for p in points}, {p[1] for p in points}
    return (len(xs) == len(ys) == 2
            and set(points) == {(x, y) for x in xs for y in ys}
            and all(a[0] == b[0] or a[1] == b[1] for a, b in zip(points, points[1:] + points[:1])))


class _Conversion:
    def __init__(self, layout_id, template_id, category, split):
        self.ledger = {
            "layout_id": layout_id, "template_id": template_id, "category": category,
            "split": split, "status": "skipped", "input_element_ids": [], "reasons": [],
            "text": [], "weights": [], "assets": [], "changes": [], "synthetic_elements": [], "assigned_ids": [],
        }

    def reason(self, code, element_id, detail):
        self.ledger["reasons"].append({"code": code, "element_id": element_id, "detail": detail})

    def change(self, element_id, field, original, value, rule):
        self.ledger["changes"].append({"element_id": element_id, "field": field,
                                       "original": copy.deepcopy(original), "value": value, "rule": rule})

    def parse(self, parser, value, code, element_id, field):
        try:
            return parser(value)
        except (ValueError, OverflowError) as error:
            self.reason(code, element_id, f"{field}: {error}")
            return None

    def result(self, task=None):
        status = "converted" if task is not None else "skipped"
        self.ledger["status"] = status
        return {"status": status, "task": task, "ledger": self.ledger}

    def text(self, component, element):
        eid = element["id"]
        content = component.get("text")
        transform = component.get("textTransform") or "none"
        if not isinstance(content, str):
            self.reason("invalid-text", eid, "text must be a string")
        else:
            if re.search(r"</?[A-Za-z][^>]*>", content):
                self.reason("rich-text-markup", eid, "rich-text markup cannot be converted losslessly")
            if transform not in ("none", "uppercase", "lowercase"):
                self.reason("unsupported-text-transform", eid, f"text transform {transform!r} is unsupported")
            else:
                displayed = {"none": lambda: content, "uppercase": content.upper, "lowercase": content.lower}[transform]()
                element["content"] = displayed
                self.ledger["text"].append({"element_id": eid, "original": content,
                                            "transform": transform, "displayed": displayed})
        if "curvature" in component:
            curvature = self.parse(_number, component["curvature"], "curved-text", eid, "curvature")
            if curvature is not None and curvature != 0:
                self.reason("curved-text", eid, f"nonzero text curvature {curvature} is unsupported")

        family_value = component.get("fontFamily")
        family, suffix = "", ""
        if isinstance(family_value, str):
            family, _, suffix = family_value.partition("--")
        if not family.strip():
            self.reason("invalid-font-family", eid, "fontFamily must name a family")
        element["font_family"] = family
        original_weight = component.get("fontWeight", suffix if suffix else 400)
        weight = self.parse(_number, original_weight, "invalid-font-weight", eid, "fontWeight")
        if weight is not None:
            if not 1 <= weight <= 1000:
                self.reason("invalid-font-weight", eid, "fontWeight must be between 1 and 1000")
            else:
                mapped = "bold" if weight >= 600 else "regular"
                element["font_weight"] = mapped
                self.ledger["weights"].append({"element_id": eid, "original": original_weight,
                                               "numeric": weight, "mapped": mapped, "rule": "600-and-above-bold"})

        size = self.parse(lambda v: _number(v, pixels=True), component.get("fontSize"), "invalid-font-size", eid, "fontSize")
        element["font_size"] = size
        if size is not None and size < 1:
            self.reason("invalid-font-size", eid, "fontSize must be at least 1 px")
        for source, target, default, values, code in (
            ("fontStyle", "font_style", "normal", ("normal", "italic"), "unsupported-font-style"),
            ("textAlign", "text_align", "left", ("left", "center", "right"), "unsupported-text-align"),
        ):
            value = component.get(source, default)
            if source == "textAlign" and value == "justify":
                self.change(eid, target, value, "left", "justify-to-left")
                value = "left"
            element[target] = value
            if value not in values:
                self.reason(code, eid, f"{source} value {value!r} is unsupported")

        if "color" not in component:
            element["color"] = "rgba(0,0,0,1)"
            self.change(eid, "color", None, element["color"], "missing-text-color-black")
        else:
            element["color"] = self.parse(_rgba, component["color"], "unsupported-color", eid, "color")

        line_height = component.get("lineHeight")
        if line_height in (None, "", "normal"):
            element["line_height"] = 1.2
            self.change(eid, "line_height", line_height, 1.2, "normal-line-height-default")
        else:
            def multiplier(value):
                if isinstance(value, str) and value.strip().endswith("%"):
                    return _number(value.strip()[:-1]) / 100
                if isinstance(value, str) and value.strip().endswith("px"):
                    if size is None or size <= 0:
                        raise ValueError("pixel line height needs a positive fontSize")
                    return _number(value, pixels=True) / size
                return _number(value)
            element["line_height"] = self.parse(multiplier, line_height, "invalid-line-height", eid, "lineHeight")
            if element["line_height"] is not None and (not math.isfinite(element["line_height"]) or element["line_height"] <= 0):
                self.reason("invalid-line-height", eid, "lineHeight must give a finite positive multiplier")

        spacing = component.get("letterSpacing")
        if spacing in (None, "", "normal"):
            element["letter_spacing"] = 0.0
            self.change(eid, "letter_spacing", spacing, 0.0, "normal-letter-spacing-default")
        else:
            def pixels(value):
                if isinstance(value, str) and value.strip().endswith("em"):
                    if size is None:
                        raise ValueError("em spacing needs a valid fontSize")
                    return _number(value.strip()[:-2]) * size
                return _number(value, pixels=True)
            element["letter_spacing"] = self.parse(pixels, spacing, "invalid-letter-spacing", eid, "letterSpacing")
            if element["letter_spacing"] is not None and not math.isfinite(element["letter_spacing"]):
                self.reason("invalid-letter-spacing", eid, "letterSpacing overflowed")

    def image(self, component, element):
        eid = element["id"]
        if not _rectangular_clip(component.get("clipPath")):
            self.reason("image-mask", eid, "nonrectangular image masks are unsupported")
        source = component.get("src")
        if not isinstance(source, str) or not source:
            self.reason("missing-image-source", eid, "image src must be a nonempty string")
            return
        try:
            filename = urlsplit(source).path.rsplit("/", 1)[-1]
        except ValueError as error:
            self.reason("invalid-image-source", eid, str(error))
            return
        if not filename or filename in (".", "..") or "\\" in filename:
            self.reason("invalid-image-source", eid, "src must resolve to a usable asset filename")
            return
        element.update(asset_id=filename, fit="cover")
        self.ledger["assets"].append({"element_id": eid, "asset_id": filename, "source": source})

    def shape(self, component, element):
        eid = element["id"]
        if not _rectangular_clip(component.get("clipPath")):
            self.reason("shape-clip", eid, "nonrectangular shape clip paths are unsupported")
        fill = component.get("backgroundColor") or component.get("background")
        element.update(shape_type="rectangle", fill_color=self.parse(_rgba, fill, "unsupported-color", eid, "shape fill"))

    def run(self, layout, target_canvas):
        # Metadata gates must precede even truthiness or copying of the layout.
        if self.ledger["template_id"] in SEALED_TEMPLATE_IDS:
            self.reason("sealed-template", None, "template is excluded from conversion, including sealed spares")
            return self.result()
        if self.ledger["layout_id"] == "A5ijgpumOCZpbBwUaoE0":
            self.reason("blocked-layout", None, "layout remains blocked by explicit batch decision")
            return self.result()
        if self.ledger["category"] == "Videos":
            self.reason("animated-layout", None, "animated LICA layouts are outside the static converter")
            return self.result()
        if self.ledger["split"] not in ("development", "validation"):
            self.reason("invalid-split", None, "conversion requires an existing development or validation split")
        if (not isinstance(target_canvas, dict) or set(target_canvas) != {"width", "height"}
                or any(isinstance(target_canvas[k], bool) or not isinstance(target_canvas[k], int)
                       or target_canvas[k] < 1 for k in ("width", "height"))):
            self.reason("invalid-target-canvas", None, "target canvas requires only positive integer width and height")
        if not isinstance(layout, dict):
            self.reason("invalid-layout", None, "layout must be an object")
            return self.result()
        canvas = {}
        for field in ("width", "height"):
            dimension = self.parse(lambda v: _number(v, pixels=True), layout.get(field), "invalid-source-canvas", None, field)
            if dimension is not None:
                if dimension < 1 or not dimension.is_integer():
                    self.reason("invalid-source-canvas", None, f"source {field} must be a positive integer")
                else:
                    canvas[field] = int(dimension)
        background_value = layout.get("background", "transparent")
        background = self.parse(_rgba, background_value, "unsupported-background", None, "canvas background")
        components = layout.get("components")
        if not isinstance(components, list) or not components:
            self.reason("invalid-components", None, "components must be a nonempty array")
            return self.result()

        elements = []
        seen = set()
        reserved = {c["id"] for c in components if isinstance(c, dict)
                    and isinstance(c.get("id"), str) and c["id"].strip()}
        for index, component in enumerate(components):
            if not isinstance(component, dict):
                self.reason("invalid-component", None, f"component {index} must be an object")
                continue
            eid = component.get("id")
            if eid is None or isinstance(eid, str) and not eid.strip():
                original = eid
                base = f"lica-{index}"
                eid = base
                suffix = 1
                while eid in reserved:
                    eid = f"{base}-{suffix}"
                    suffix += 1
                reserved.add(eid)
                self.ledger["assigned_ids"].append({"component_index": index, "original": original,
                                                    "id": eid, "rule": "missing-id-component-index"})
                seen.add(eid)
            elif not isinstance(eid, str):
                self.reason("missing-element-id", None, f"component {index} requires a nonblank string id")
                eid = None
            else:
                self.ledger["input_element_ids"].append(eid)
                if eid in seen:
                    self.reason("duplicate-element-id", eid, f"component {index} repeats this id")
                seen.add(eid)
            kind = component.get("type")
            if not isinstance(kind, str) or kind not in _TYPE_FIELDS:
                self.reason("unsupported-component-type", eid, f"component type {kind!r} is unsupported")
                continue
            for field in sorted(set(component) - _COMMON_FIELDS - _TYPE_FIELDS[kind]):
                self.reason("unsupported-property", eid, f"component property {field!r} has no established mapping")
            element = {"id": eid, "type": {"TEXT": "text", "IMAGE": "image", "GROUP": "shape"}[kind], "z_index": index}
            for original, official in (("left", "x"), ("top", "y"), ("width", "width"), ("height", "height")):
                value = self.parse(lambda v: _number(v, pixels=True), component.get(original), "invalid-geometry", eid, original)
                element[official] = value
                if original in ("width", "height") and value is not None and value < 0:
                    self.reason("invalid-geometry", eid, f"{original} must not be negative")
            element["rotation"] = self.parse(_rotation, component.get("transform"), "unsupported-transform", eid, "transform")
            element["opacity"] = self.parse(_number, component.get("opacity", 1), "invalid-opacity", eid, "opacity")
            if element["opacity"] is not None and not 0 <= element["opacity"] <= 1:
                self.reason("invalid-opacity", eid, "opacity must be between 0 and 1")
            getattr(self, element["type"])(component, element)
            elements.append(element)

        if self.ledger["reasons"]:
            return self.result()
        if Decimal(background.rsplit(",", 1)[1][:-1]) != 0:
            synthetic_id = "__lica_background__"
            suffix = 1
            while synthetic_id in seen:
                synthetic_id = f"__lica_background__-{suffix}"
                suffix += 1
            elements.insert(0, {"id": synthetic_id, "type": "shape", "x": 0, "y": 0,
                                "width": canvas["width"], "height": canvas["height"], "z_index": -1,
                                "shape_type": "rectangle", "fill_color": background})
            self.ledger["synthetic_elements"].append(synthetic_id)
            self.change(synthetic_id, "background", background_value, background, "canvas-background-shape")
        task = {"task_id": f"lica-{self.ledger['layout_id']}-{target_canvas['width']}x{target_canvas['height']}",
                "source": {"canvas": canvas, "elements": elements}, "target_canvas": copy.deepcopy(target_canvas)}
        return self.result(task)


def convert_layout(layout, *, layout_id, template_id, category, split, target_canvas):
    """Return an official task and audit ledger, or a skipped-layout diagnostic.

Sealed templates and animated categories are refused before inspecting layout.
The input objects are never modified, and no unsupported layout yields a task.
"""
    return _Conversion(layout_id, template_id, category, split).run(layout, target_canvas)
