"""Chameleon resize(source, target_canvas): aspect-preserving baseline.

One uniform scale s = min(tw/sw, th/sh), content centered. Every element, grouped or not, gets the same transform,
so groups move as units. Exception (P6, text_fit): a plate+label group whose label is under the 6px floor is rigidly rescaled by one k >= s and repacked; if no k packs, geometry stays uniform and (P10) the label font is raised to 6px in place only when its text fits its scaled box (not a floor guarantee). Only official keys are read; no roles, no id heuristics. Starter stretch: upstream a44a060.
"""
import copy
import math
from typing import Any

from . import text_fit

MAX_DIM = 100_000
_SCALED = ("font_size", "letter_spacing", "corner_radius", "stroke_width")


def _num(v: Any) -> bool:
    if not isinstance(v, (int, float)) or isinstance(v, bool):
        return False
    try:
        return math.isfinite(v)
    except OverflowError:
        return False


def _dim(v: Any, path: str) -> int:
    if isinstance(v, bool) or not isinstance(v, int) or not 1 <= v <= MAX_DIM:
        raise ValueError(f"{path}: expected integer in [1, {MAX_DIM}]")
    return v


def _canvas(c: Any, path: str) -> tuple[int, int]:
    if not isinstance(c, dict):
        raise ValueError(f"{path}: expected object")
    return _dim(c.get("width"), f"{path}.width"), _dim(c.get("height"), f"{path}.height")


def _validate(source: Any, target: Any) -> tuple[int, int, int, int]:
    if not isinstance(source, dict):
        raise ValueError("source: expected object")
    sw, sh = _canvas(source.get("canvas"), "source.canvas")
    tw, th = _canvas(target, "target_canvas")
    els = source.get("elements")
    if not isinstance(els, list) or not els:
        raise ValueError("source.elements: expected nonempty array")
    seen: set[str] = set()
    for i, e in enumerate(els):
        p = f"source.elements[{i}]"
        if not isinstance(e, dict):
            raise ValueError(f"{p}: expected object")
        eid = e.get("id")
        if not isinstance(eid, str) or not eid.strip():
            raise ValueError(f"{p}.id: expected nonempty string")
        if eid in seen:
            raise ValueError(f"{p}.id: duplicate id {eid!r}")
        seen.add(eid)
        for k in ("x", "y", "width", "height"):
            if not _num(e.get(k)):
                raise ValueError(f"{p}.{k}: expected finite number")
        if e["width"] < 0 or e["height"] < 0:
            raise ValueError(f"{p}: width/height must be >= 0")
        for k in _SCALED:
            if k in e and not _num(e[k]):
                raise ValueError(f"{p}.{k}: expected finite number")
        _fields(e, p)
    return sw, sh, tw, th


def _int(v: Any) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _str(v: Any) -> bool:
    return isinstance(v, str)


# Official schema v0.9 value rules for non-geometric fields. Present-but-invalid values are rejected, never passed through.
_RULES: dict[str, Any] = {
    "rotation": _num, "opacity": lambda v: _num(v) and 0 <= v <= 1, "z_index": _int,
    "group_id": lambda v: v is None or (_str(v) and v.strip() != ""),
    "content": _str, "font_family": lambda v: _str(v) and v != "", "font_size": lambda v: _num(v) and v >= 1,
    "font_weight": lambda v: v in ("regular", "bold"), "font_style": lambda v: v in ("normal", "italic"), "color": _str,
    "text_align": lambda v: v in ("left", "center", "right"), "line_height": _num,
    "max_lines": lambda v: v is None or (_int(v) and v >= 0),
    "asset_id": lambda v: _str(v) and v != "", "fit": lambda v: v in ("contain", "cover", "fill"),
    "shape_type": lambda v: v in ("rectangle", "ellipse", "line"), "fill_color": _str, "stroke_color": lambda v: v is None or _str(v),
}
_REQUIRED = {"text": ("content", "font_family", "font_size", "color"), "image": ("asset_id",), "shape": ("shape_type", "fill_color")}


def _runs(v: Any) -> bool:
    if not isinstance(v, list):
        return False
    for r in v:
        if not isinstance(r, dict) or not all(_int(r.get(k)) and r[k] >= 0 for k in ("start", "end")):
            return False
        if "color" in r and not _str(r["color"]) or "font_weight" in r and r["font_weight"] not in ("regular", "bold") \
                or "font_style" in r and r["font_style"] not in ("normal", "italic"):
            return False
    return True


def _fields(e: dict, p: str) -> None:
    if not isinstance(e.get("type"), str) or e["type"] not in _REQUIRED:
        raise ValueError(f"{p}.type: expected one of {sorted(_REQUIRED)}")
    for k in _REQUIRED[e["type"]]:
        if k not in e:
            raise ValueError(f"{p}.{k}: required for {e['type']}")
    for k, ok in _RULES.items():
        if k in e and not ok(e[k]):
            raise ValueError(f"{p}.{k}: invalid value {e[k]!r}")
    if "style_runs" in e and not _runs(e["style_runs"]):
        raise ValueError(f"{p}.style_runs: expected array of {{start,end[,color,font_weight,font_style]}}")


def _covers(e: dict, sw: int, sh: int) -> bool:
    """Only axis-aligned ungrouped cover images or rectangles covering the source stretch; other rotations keep the uniform fallback."""
    kind = (e.get("type") == "image" and e.get("fit") == "cover") or (e.get("type") == "shape" and e.get("shape_type") == "rectangle")
    return kind and not e.get("group_id") and e.get("rotation", 0) % 180 == 0 and e["x"] <= 0 and e["y"] <= 0 \
        and e["x"] + e["width"] >= sw and e["y"] + e["height"] >= sh


def resize(source: dict[str, Any], target_canvas: dict[str, Any]) -> dict[str, Any]:
    sw, sh, tw, th = _validate(source, target_canvas)
    s = min(tw / sw, th / sh)
    ox, oy = (tw - sw * s) / 2, (th - sh * s) / 2
    out = []
    for el in source["elements"]:
        e = copy.deepcopy(el)
        if _covers(el, sw, sh):  # full-bleed cover image: fills the target (it crops by design)
            e["x"], e["y"], e["width"], e["height"] = 0, 0, tw, th
        else:
            e["x"], e["y"] = el["x"] * s + ox, el["y"] * s + oy
            e["width"], e["height"] = el["width"] * s, el["height"] * s
        for k in _SCALED:
            if k in e:
                e[k] = e[k] * s
        for k in (*_SCALED, "x", "y", "width", "height"):
            if k in e and not _num(e[k]):  # scaling overflowed to inf; off-canvas placement is legal and not checked
                raise ValueError(f"source.elements[{el['id']!r}].{k}: scaled value is not finite")
        if e.get("type") == "text" and e["font_size"] < 1:  # schema minimum is 1; public sample level3 legal_text scales to 0.8, so raising is not an option
            e["font_size"] = 1.0
        out.append(e)
    from .composition import adapt
    with text_fit.renderer_resources():
        return adapt(source, text_fit.refit(source, {"canvas": {"width": tw, "height": th}, "elements": out}, tw, th), tw, th)
