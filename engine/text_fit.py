"""Deterministic text re-fit for extreme aspect changes (P5). Pillow metrics on the brand_kit TTFs; no Node, no model.

Readability measure: font_size >= FLOOR_PX, text box contains its own measured text, boxes pairwise >= GAP apart, boxes inside the target.

P10: when no rigid k packs a sub-floor plate+label group, geometry stays the uniform (P5b) one and the label font is raised to FLOOR_PX in place
only if the measured text fits its own scaled box (all labels of the group or none). Not a floor guarantee.
Fires only when a uniformly scaled text is below FLOOR_PX; otherwise resize() output is left untouched.
"""
import contextvars
import copy
import hashlib
import math
import os
import warnings
from contextlib import contextmanager
from functools import lru_cache
from typing import Any, Optional

FLOOR_PX = 6.0
GAP = 2.0
STEP = 0.9
MAX_STEPS = 60
DEFAULT_LINE_HEIGHT = 1.2  # upstream renderer default
_HERE = os.path.dirname(os.path.abspath(__file__))


def _fonts_dir() -> Optional[str]:
    for base in (os.path.join(_HERE, ".."), os.environ.get("CHAMELEON_UPSTREAM", "")):
        d = os.path.join(base, "brand_kit", "fonts")
        if base and os.path.isdir(d):
            return d
    return None


@lru_cache(maxsize=128)
def _font(path: str, size: float):
    from PIL import ImageFont
    # Preserve the established metric policy on hosts with or without optional RAQM.
    # Advanced script shaping remains a separate renderer/metric parity requirement.
    return ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.BASIC)


_FACES: contextvars.ContextVar = contextvars.ContextVar("text_fit_faces", default=None)
_RENDERER_BYTES: contextvars.ContextVar = contextvars.ContextVar("renderer_bytes", default=None)
_RENDERER_WIDTHS: contextvars.ContextVar = contextvars.ContextVar("renderer_widths", default=None)


@contextmanager
def renderer_resources():
    """Reuse exact font bytes within one resize, never across tasks.

    Retain at most eight files / 2 MiB and 128 glyph queries / 32768 characters.
    Construct separate Skia faces for distinct queries: sharing native face
    identities changed fractional-size output in paired regression checks.
    Always release resources after failures.
    """
    token = _RENDERER_BYTES.set({})
    width_token = _RENDERER_WIDTHS.set({})
    try:
        yield
    finally:
        _RENDERER_BYTES.reset(token)
        _RENDERER_WIDTHS.reset(width_token)


def _renderer_data(path: str):
    cache = _RENDERER_BYTES.get()
    if cache is not None and path in cache:
        return cache[path]
    with open(path, "rb") as stream:
        data = stream.read()
    if cache is not None and len(cache) < 8 and sum(map(len, cache.values())) + len(data) <= 2 * 1024 * 1024:
        cache[path] = data
    return data


_WEIGHTS = {"thin", "light", "extralight", "regular", "medium", "semibold", "bold", "extrabold", "black"}  # cr_renderer.fonts.FONT_WEIGHTS
_STYLES = {"regular", "bold", "italic", "bolditalic"}
_MAP = {"Arkana Script": "Arkana", "Blogger": "Blogger Sans", "Delius Swash": "Delius Swash Caps", "Elsie Swash": "Elsie Swash Caps",
        "Gluk Glametrix": "Gluk Foglihtenno06", "Gluk Znikomitno25": "Gluk Foglihtenno06", "Im Fell": "Im Fell Dw Pica Sc",
        "Medieval Sharp": "Medievalsharp", "Playlist Caps": "Playlist", "Rissa Typeface": "Rissatypeface", "Selima": "Selima Script",
        "Six": "Six Caps", "V T323": "Vt323", "Different Summer": "Montserrat", "Dukomdesign Constantine": "Montserrat", "Sunday": "Montserrat"}

def _norm(name: str) -> str:  # cr_renderer.fonts.normalize_family
    name = name.replace("_", " ").title()
    for w in (" Bold", " Regular", " Light", " Italic", " Medium"):
        name = name.replace(w, "")
    return _MAP.get(name, name)

def _last(name: str) -> str:
    return name.replace("_", " ").lower().split(" ")[-1]

@contextmanager
def faces(records):
    """P12 opt-in: measure with the renderer's own faces. records: {family, weight (400/700 or regular/bold), style, path, ttf_sha256}, as scripts/lica_official ExactManager.
    Every file is hash-verified (ValueError on mismatch) before any measuring. A face that is absent or ambiguous (distinct bytes for one key) is UNMEASURED:
    RuntimeWarning + uniform geometry, never a substitute. Default off; state is reset on exit so nothing leaks between calls."""
    table = {}
    for r in records:
        with open(r["path"], "rb") as f:
            if hashlib.sha256(f.read()).hexdigest() != r["ttf_sha256"]:
                raise ValueError(f"font hash mismatch: {r['family']}")
        w = r["weight"]
        bold = w == "bold" if isinstance(w, str) else w >= 600
        weight = "bold" if bold else "regular"
        style = ("bolditalic" if bold else "italic") if r["style"] == "italic" else weight  # as ExactManager
        keys = {(_norm(r["family"]), weight, style)}
        ew = _last(r["family"]) if _last(r["family"]) in _WEIGHTS else weight  # the renderer reads a trailing weight word in the name
        keys.add((_norm(r["family"]), ew, style))
        for k in keys:
            table.setdefault(k, {})[r["ttf_sha256"]] = r["path"]
    _font.cache_clear()
    token = _FACES.set(table)
    try:
        yield
    finally:
        _FACES.reset(token)
        _font.cache_clear()

def _resolve(e: dict) -> Optional[str]:
    """Verified blob path for a text under faces(); None = unmeasured (absent or ambiguous)."""
    fam = e["font_family"]
    bold, ital = e.get("font_weight") == "bold", e.get("font_style") == "italic"
    weight = "bold" if bold else "regular"
    style = ("bolditalic" if bold else "italic") if ital else weight
    ew = _last(fam) if _last(fam) in _WEIGHTS else weight
    es = _last(fam) if _last(fam) in _STYLES else style
    hits = _FACES.get().get((_norm(fam), ew, es), {})
    return next(iter(hits.values())) if len(hits) == 1 else None

def _unmeasured(els) -> list:
    """Under faces(): ids of texts with no single exact face (warns). Empty without a context."""
    if _FACES.get() is None:
        return []
    bad = [e["id"] for e in els if _resolve(e) is None]
    if bad:
        warnings.warn("text_fit: no exact font face for ids " + ",".join(bad) + "; keeping uniform scaling (metrics unproved)", RuntimeWarning)
    return bad

def _path(d: str, e: dict) -> str:
    if _FACES.get() is not None:
        return _resolve(e)
    fam = "SolsticeSerif" if "Serif" in e["font_family"] else "SolsticeSans"
    bold, ital = e.get("font_weight") == "bold", e.get("font_style") == "italic"
    style = {(False, False): "Regular", (True, False): "Bold", (False, True): "Italic", (True, True): "BoldItalic"}[(bold, ital)]
    if fam == "SolsticeSerif" and style == "BoldItalic":
        style = "Bold"  # the kit has no serif bold-italic file
    return os.path.join(d, f"{fam}-{style}.ttf")


def _pillow_widths(font, content: str) -> list:
    widths = {c: font.getlength(c) for c in set(content)}
    return [widths[c] for c in content]


def _block(font, content: str, cap: float) -> tuple[float, int]:
    """Upstream-compatible space-to-newline wrap; measure original character indices without rewriting content."""
    return _block_widths(content, _pillow_widths(font, content), cap)


def _block_widths(content: str, widths: list, cap: float) -> tuple[float, int]:
    chars = list(content)
    line_width, last_space = 0.0, None
    for i, c in enumerate(chars):
        if c == "\n":
            line_width, last_space = 0.0, None
            continue
        if cap > 0 and line_width + widths[i] > cap and last_space is not None:
            chars[last_space] = "\n"
            line_width = sum(widths[j] for j in range(last_space + 1, i + 1) if chars[j] != "\n")
            last_space = None
        else:
            line_width += widths[i]
        if c == " ":
            last_space = i
    lines, start = [], 0
    for i, c in enumerate(chars + ["\n"]):
        if c == "\n":
            lines.append(sum(widths[start:i]))
            start = i + 1
    return max(lines), len(lines)



def _renderer_widths(path: str, size: float, content: str) -> list:
    """Pinned upstream wrap uses Skia advances at the FLOAT size, not Pillow BASIC.

    Keep these metrics local to the same resolved face; no fallback/download. Skia
    is already a submission dependency. Do not alter its hinting or drawing policy.
    """
    cache = _RENDERER_WIDTHS.get()
    key = (path, size, content)
    if cache is not None and key in cache:
        return list(cache[key])
    import skia
    face = skia.Typeface.MakeFromData(_renderer_data(path))
    if face is None:
        raise ValueError(f"text_fit: Skia could not load exact font {path}")
    font = skia.Font(face, size)
    widths = font.getWidths(font.textToGlyphs(content))
    if cache is not None and len(cache) < 128 and sum(len(k[2]) for k in cache) + len(content) <= 32768:
        cache[key] = tuple(widths)
    return list(widths)

def aabb(e: dict) -> tuple:
    """Rotated axis-aligned box (x0, y0, x1, y1); schema rotation = degrees clockwise about the element centre."""
    r = math.radians(e.get("rotation", 0) or 0)
    w = abs(e["width"] * math.cos(r)) + abs(e["height"] * math.sin(r))
    h = abs(e["width"] * math.sin(r)) + abs(e["height"] * math.cos(r))
    cx, cy = e["x"] + e["width"] / 2, e["y"] + e["height"] / 2
    return cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2


def _hit(a: tuple, b: tuple) -> bool:
    return a[0] < b[0] + b[2] + GAP and b[0] < a[0] + a[2] + GAP and a[1] < b[1] + b[3] + GAP and b[1] < a[1] + a[3] + GAP


def _overlap(a: tuple, b: tuple) -> bool:
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


def _pack(dims: list, tw: float, th: float, fixed: list, skip: Optional[list] = None) -> Optional[list]:
    """Shelf-pack (w, h) units around `fixed` (x, y, w, h) rects; skip[n] = fixed indices unit n ignores. None if any unit leaves the target."""
    x = y = shelf = 0.0
    boxes = []
    for n, (w, h) in enumerate(dims):
        ign = skip[n] if skip else ()
        fx = [o for k, o in enumerate(fixed) if k not in ign]
        if w > tw or h > th:
            return None
        while True:
            if x and x + w > tw:
                x, y, shelf = 0.0, y + shelf + GAP, 0.0
            if y + h > th:
                return None
            hit = next((o for o in fx + boxes if _hit((x, y, w, h), o)), None)
            if hit is None:
                break
            x = hit[0] + hit[2] + GAP
        boxes.append((x, y, w, h))
        shelf = max(shelf, h)
        x += w + GAP
    return boxes


def _groups(els: list) -> dict:
    """{group_id: [element indices]} in element order."""
    g: dict = {}
    for i, e in enumerate(els):
        if e.get("group_id"):
            g.setdefault(e["group_id"], []).append(i)
    return g


def _sub_floor(els: list, idx: list) -> bool:
    """P6 trigger: >=2 members, one non-text plate, and a text member under FLOOR_PX. A lone grouped text never qualifies."""
    return len(idx) >= 2 and any(els[i]["type"] != "text" for i in idx) and any(els[i]["type"] == "text" and els[i]["font_size"] < FLOOR_PX for i in idx)


_UNIT_SCALED = ("font_size", "corner_radius", "stroke_width", "letter_spacing")


def _unit(els: list, idx: list, f: float) -> tuple:
    """Rigid scale of group members by f about the union-AABB centre. Rotation untouched. Returns (new member dicts, (w, h) of union AABB)."""
    bs = [aabb(els[i]) for i in idx]
    cx, cy = (min(b[0] for b in bs) + max(b[2] for b in bs)) / 2, (min(b[1] for b in bs) + max(b[3] for b in bs)) / 2
    new = []
    for i in idx:
        e = dict(els[i])
        mx, my = e["x"] + e["width"] / 2, e["y"] + e["height"] / 2
        e["width"], e["height"] = e["width"] * f, e["height"] * f
        e["x"], e["y"] = cx + (mx - cx) * f - e["width"] / 2, cy + (my - cy) * f - e["height"] / 2
        for k in _UNIT_SCALED:
            if k in e:
                e[k] = e[k] * f
        new.append(e)
    bs = [aabb(e) for e in new]
    return new, (max(b[2] for b in bs) - min(b[0] for b in bs), max(b[3] for b in bs) - min(b[1] for b in bs))


def _texts(source: dict, out: dict, tw: int, th: int) -> bool:
    """Re-fit UNGROUPED texts under FLOOR_PX around everything else. Mutates and returns `out` (a deep copy of the source).

    Precedence: group association and rotation are protected invariants, readability is a measured limit. Grouped elements keep the
    uniform group-as-unit placement even when their font is under FLOOR_PX (a measured limit, pinned by test_text_fit and the evidence log; never raised, no warning).
    """
    els = out["elements"]
    free = [i for i, e in enumerate(els) if e["type"] == "text" and not e.get("group_id")]
    if not any(els[i]["font_size"] < FLOOR_PX for i in free):
        return True
    d = _fonts_dir()
    if _FACES.get() is not None:
        if _unmeasured([els[i] for i in free]):
            return True
    elif d is None:
        warnings.warn("text_fit: brand_kit fonts not found; keeping uniform scaling", RuntimeWarning)
        return True
    fixed = []
    for i, e in enumerate(els):
        if i not in free and e.get("group_id"):  # grouped pieces (plates and their labels) are protected obstacles
            x0, y0, x1, y1 = aabb(e)
            fixed.append((x0, y0, x1 - x0, y1 - y0))
    sw, sh = source["canvas"]["width"], source["canvas"]["height"]
    imgs = [i for i, e in enumerate(els) if _blocks(e, source["elements"][i], sw, sh)]  # R6/P7: ungrouped images and non-bg shapes are obstacles too
    for i in imgs:
        x0, y0, x1, y1 = aabb(els[i])
        fixed.append((x0, y0, x1 - x0, y1 - y0))
    order = sorted(free, key=lambda i: (source["elements"][i]["y"], source["elements"][i]["x"], els[i]["id"]))
    base = [source["elements"][i]["font_size"] for i in order]
    skip = []  # per text: image obstacles it already overlapped in the source (kept, never newly created)
    for i in order:
        a = aabb(source["elements"][i])
        skip.append({len(fixed) - len(imgs) + k for k, j in enumerate(imgs) if _overlap(a, aabb(source["elements"][j]))})
    # R6 honest limit: if no step clears the images, retry with images ignored = exactly the P5b placement (floor and groups never weakened)
    # P11: wrap cap tw-2 first (unchanged behaviour); only if nothing packs, retry with the cap tightened for box padding, ceil(w*1.02)+1 <= tw-2,
    # so a full line that could never pack (box up to tw+1) wraps instead. Cases that packed before are byte-identical.
    policies = [skip]
    ignore_images = [set(range(len(fixed) - len(imgs), len(fixed))) for _ in order]
    if ignore_images != skip:
        policies.append(ignore_images)
    for cap, sk in [(c, k) for c in (lambda w: w - 2.0, lambda w: (w - 3.0) / 1.02) for k in policies]:
        previous_sizes = None
        for step in range(MAX_STEPS + 1):
            sizes = [max(FLOOR_PX, b * STEP ** step) for b in base]
            # Once the whole vector repeats, later steps cannot change this
            # failed trial. Continue with the next distinct cap/obstacle policy.
            if sizes == previous_sizes:
                break
            previous_sizes = sizes
            dims, geo = [], []
            for i, f in zip(order, sizes):
                e = els[i]
                path = _path(d, e)
                font = _font(path, f)
                widths = _renderer_widths(path, f, e["content"])
                pillow_widths = _pillow_widths(font, e["content"])
                widest, _ = _block_widths(e["content"], pillow_widths, cap(tw))
                rendered_widest, _ = _block_widths(e["content"], widths, cap(tw))
                w = math.ceil(max(widest, rendered_widest) * 1.02) + 1.0
                _, n = _block_widths(e["content"], pillow_widths, w)  # recount at the returned width in BOTH metric systems
                _, rendered_n = _block_widths(e["content"], widths, w)
                n = max(n, rendered_n)
                h = n * f * float(e.get("line_height", DEFAULT_LINE_HEIGHT))
                x0, y0, x1, y1 = aabb({"x": 0, "y": 0, "width": w, "height": h, "rotation": e.get("rotation", 0)})
                dims.append((x1 - x0, y1 - y0))
                geo.append((w, h, (x1 - x0 - w) / 2, (y1 - y0 - h) / 2))
            boxes = _pack(dims, tw, th, fixed, sk)
            if boxes is not None:
                for i, f, (bx, by, bw, bh), (w, h, mx, my) in zip(order, sizes, boxes, geo):
                    els[i].update(x=bx + mx, y=by + my, width=w, height=h, font_size=f)
                return True
    return False


def ladder(k_needed: float, s: float) -> list:
    """Discrete search ladder k_needed * 0.9^n, strictly decreasing, ending exactly at s (never below)."""
    out, cur = [], k_needed
    while cur > s + 1e-9:
        out.append(cur)
        cur *= STEP
    return out + [s]


def _covers_src(e: dict, sw: float, sh: float) -> bool:
    return e["x"] <= 0 and e["y"] <= 0 and e["x"] + e["width"] >= sw and e["y"] + e["height"] >= sh


def _blocks(e: dict, src_e: dict, sw: float, sh: float) -> bool:
    """P7: an ungrouped image or shape is an obstacle unless its SOURCE rect covers the source canvas (full-bleed bg)."""
    return e["type"] in ("image", "shape") and not e.get("group_id") and not _covers_src(src_e, sw, sh)


def _raise(els: list, idx: list) -> bool:
    """P10: in place, set every sub-floor text member of the group to FLOOR_PX iff ALL of them fit their own (already uniformly scaled) box at FLOOR_PX.
    Geometry untouched. All-or-nothing; letter_spacing or missing fonts -> nothing changes. Not a floor guarantee."""
    d = _fonts_dir()
    low = [els[i] for i in idx if els[i]["type"] == "text" and els[i]["font_size"] < FLOOR_PX]  # a rigid-upscaled label at 5.999999999999999 draws int()=5: it goes through the same fit gate
    if _FACES.get() is not None:
        d = ""  # faces() needs no brand kit
        if not low or _unmeasured(low):
            return False
    if d is None or not low or any(e.get("letter_spacing") for e in low):
        return False
    for e in low:
        widest, n = _block(_font(_path(d, e), FLOOR_PX), e["content"], e["width"])
        if math.ceil(widest * 1.02) + 1.0 > e["width"] or n * FLOOR_PX * float(e.get("line_height", DEFAULT_LINE_HEIGHT)) > e["height"]:
            return False
    for e in low:
        e["font_size"] = FLOOR_PX
    return True


def _place_groups(source: dict, out: dict, tw: int, th: int) -> bool:
    """P6: rigidly upscale each sub-floor group (one f >= 1 on the uniform output, i.e. k = f*s >= s) and pack it. True if any group moved."""
    els, src = out["elements"], source["elements"]
    gs = _groups(els)
    todo = sorted((g for g, idx in gs.items() if _sub_floor(els, idx)),
                  key=lambda g: (min(src[i]["y"] for i in gs[g]), min(src[i]["x"] for i in gs[g]), g))
    if not todo:
        return False
    sw, sh = source["canvas"]["width"], source["canvas"]["height"]
    obst = [(i, aabb(e)) for i, e in enumerate(els) if _blocks(e, src[i], sw, sh)]
    placed = [aabb(els[i]) for g, idx in gs.items() if g not in todo for i in idx]
    fixed = [(b[0], b[1], b[2] - b[0], b[3] - b[1]) for b in placed]
    moved = False
    for g in todo:
        idx = gs[g]
        mem = [aabb(src[i]) for i in idx]
        skip = {len(fixed) + n for n, (j, _) in enumerate(obst) if any(_overlap(m, aabb(src[j])) for m in mem)}
        need = max(FLOOR_PX / els[i]["font_size"] for i in idx if els[i]["type"] == "text" and els[i]["font_size"] < FLOOR_PX)
        for f in ladder(need, 1.0)[:-1]:  # f == 1 is the uniform P5b placement itself: the for-else keeps it untouched
            new, (w, h) = _unit(els, idx, f)
            rects = fixed + [(b[0], b[1], b[2] - b[0], b[3] - b[1]) for _, b in obst]
            ign = [k for k in skip]
            box = _pack([(w, h)], tw, th, rects, [set(ign)])
            if box is None:
                continue
            bs = [aabb(e) for e in new]
            dx, dy = box[0][0] - min(b[0] for b in bs), box[0][1] - min(b[1] for b in bs)
            for i, e in zip(idx, new):
                e["x"] += dx
                e["y"] += dy
                els[i].update(e)
            fixed.append(box[0])
            moved = True
            break
        else:
            b = [aabb(els[i]) for i in idx]
            fixed.append((min(x[0] for x in b), min(x[1] for x in b), max(x[2] for x in b) - min(x[0] for x in b), max(x[3] for x in b) - min(x[1] for x in b)))
    return moved


def _raise_all(out: dict) -> None:
    """P10 final pass on the settled placement (a P5b revert keeps it: geometry is the P5b one either way). Only labels still below FLOOR_PX, i.e. no rigid k packed their group."""
    els = out["elements"]
    for idx in _groups(els).values():
        if _sub_floor(els, idx):
            _raise(els, idx)


WIDE_RATIO = 2.0  # target aspect must be >= 2x the source aspect (documented choice, untuned)

def _wide(source: dict, out: dict, tw: int, th: int) -> bool:
    """RF-02: on a much wider target, move the ungrouped texts (all below a non-background ungrouped image in the SOURCE) into the free lane right of all other content, stacked in source order at the
    largest whole font size <= source that fits the lane (whole sizes: upstream draws int(size)). Nothing else moves; no roles, official keys only.
    Rotated/max_lines-bound texts, unmeasured fonts or no fit leave `out` untouched. Returns True if applied."""
    els, sw, sh = out["elements"], source["canvas"]["width"], source["canvas"]["height"]
    if tw / th < WIDE_RATIO * sw / sh:
        return False
    free = [i for i, e in enumerate(els) if e["type"] == "text" and not e.get("group_id")]
    if not free or any(els[i].get("rotation") for i in free):
        return False
    imgs = [e for i, e in enumerate(source["elements"]) if e["type"] == "image" and not e.get("group_id") and not _covers_src(e, sw, sh)]
    if not imgs or any(source["elements"][i]["y"] < max(m["y"] + m["height"] for m in imgs) - 1e-9 for i in free):
        return False  # source shows an image block with every free text below it: the stacked-column layout this reflow targets
    d = _fonts_dir()
    if _FACES.get() is not None:
        d = ""
        if _unmeasured([els[i] for i in free]):
            return False
    elif d is None:
        return False
    rest = [aabb(e) for i, e in enumerate(els) if i not in free and not _covers_src(source["elements"][i], sw, sh)]
    lane = max((b[2] for b in rest), default=0.0) + GAP
    order = sorted(free, key=lambda i: (source["elements"][i]["y"], source["elements"][i]["x"], els[i]["id"]))
    base = [source["elements"][i]["font_size"] for i in order]
    if _split(source, out, tw, th, free, imgs, d, order, base):
        return True
    fit = _lane_fit(els, d, order, base, tw - lane, th)
    if fit is None:
        return False
    sizes, dims = fit
    y = (th - sum(h for _, h in dims) - GAP * (len(dims) - 1)) / 2
    for i, f, (w, h) in zip(order, sizes, dims):
        _set_text(els[i], f, lane + (tw - lane - w) / 2, y, w, h)
        y += h + GAP
    return True


def _lane_fit(els: list, d: str, order: list, base: list, lane_w: float, lane_h: float, extra: float = 0.0):
    """RF-02 sizing: the largest whole font sizes <= source (one step for all) whose stacked texts fit lane_w x (lane_h - extra).
    None if no step fits or a size would fall below the uniform output. Returns (sizes, [(w, h)])."""
    import skia
    for step in range(int(max(base)) + 1):
        sizes = [max(1, math.floor(b) - step) for b in base]
        if any(f < els[i]["font_size"] for i, f in zip(order, sizes)):
            return None  # would be smaller than the uniform output
        dims = []
        for i, f in zip(order, sizes):
            e = els[i]
            widest, n = _block(_font(_path(d, e), f), e["content"], lane_w - 2.0)
            if e.get("max_lines") and n > e["max_lines"]:
                break
            advance = f * float(e.get("line_height", DEFAULT_LINE_HEIGHT))
            metrics = skia.Font(skia.Typeface.MakeFromFile(_path(d, e)), int(f)).getMetrics()
            height = max(n * advance, (n - 1) * advance - metrics.fAscent + metrics.fBottom + 2)
            dims.append((math.ceil(widest * 1.02) + 1.0, height))
        else:
            if sum(h for _, h in dims) + GAP * (len(dims) - 1) + extra > lane_h or max(w for w, _ in dims) > lane_w:
                continue
            return sizes, dims
    return None


def _set_text(e: dict, f: float, x: float, y: float, w: float, h: float) -> None:
    if e.get("letter_spacing"):
        e["letter_spacing"] *= f / e["font_size"]
    e.update(x=x, y=y, width=w, height=h, font_size=float(f))


def _place(e: dict, src: dict, k: float, ox: float, oy: float, x0: float, y0: float) -> None:
    """Rigid placement from the SOURCE element: scale k about the source point (x0, y0), which lands at (ox, oy). Rotation untouched."""
    e.update(x=ox + (src["x"] - x0) * k, y=oy + (src["y"] - y0) * k, width=src["width"] * k, height=src["height"] * k)
    for key in _UNIT_SCALED:
        if key in src:
            e[key] = src[key] * k


def _split(source: dict, out: dict, tw: int, th: int, free: list, imgs: list, d: str, order: list, base: list) -> bool:
    """#5 prototype (wide-banner split), tried before RF-02. Plate+label groups lying wholly below the image block in the SOURCE join the text lane
    (rigid at the block scale k, after the texts in source order); every other non-background element is scaled together by one k >= s and placed left,
    vertically centred. Ungrouped shapes with opacity < 0.5 (decorations) move with the block but do not size it, and are nudged back
    inside the canvas if their source was inside. Anything else wholly below the image block disables the split. Tries k from the largest
    that fits the height down to s; False leaves `out` to RF-02."""
    els, src = out["elements"], source["elements"]
    sw, sh = source["canvas"]["width"], source["canvas"]["height"]
    bottom = max(m["y"] + m["height"] for m in imgs)
    gs = _groups(els)
    movers = sorted((g for g, idx in gs.items() if any(els[i]["type"] != "text" for i in idx)  # plate + label groups only
                     and all(src[i]["y"] >= bottom - 1e-9 and not src[i].get("rotation") for i in idx)),
                    key=lambda g: (min(src[i]["y"] for i in gs[g]), min(src[i]["x"] for i in gs[g]), g))
    if not movers:
        return False
    lane_set = set(free) | {i for g in movers for i in gs[g]}
    block = [i for i in range(len(els)) if i not in lane_set and not _covers_src(src[i], sw, sh)]
    decor = {i for i in block if src[i]["type"] == "shape" and not src[i].get("group_id") and float(src[i].get("opacity", 1)) < 0.5}
    if any(src[i]["y"] >= bottom - 1e-9 for i in block if i not in decor):
        return False  # something else sits below the image block (e.g. grouped text without a plate): keep RF-02
    sized = [aabb(src[i]) for i in block if i not in decor]
    if not sized:
        return False
    bx0, by0 = min(b[0] for b in sized), min(b[1] for b in sized)
    bw, bh = max(b[2] for b in sized) - bx0, max(b[3] for b in sized) - by0
    gbox = {g: [aabb(src[i]) for i in gs[g]] for g in movers}
    gbox = {g: (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs) - min(b[0] for b in bs), max(b[3] for b in bs) - min(b[1] for b in bs))
            for g, bs in gbox.items()}
    s = min(tw / sw, th / sh)
    margin = max(GAP, 0.05 * th)  # breathing room above and below the block
    for k in ladder(max(s, (th - 2 * margin) / bh), s):
        lane_w = tw - bw * k - 3 * GAP
        if lane_w <= 0:
            continue
        # moved groups keep the content block's scale k (>= s), not the lane-text size, capped to the lane width
        gk = {g: min(k, (lane_w - 2.0) / gbox[g][2]) for g in movers}
        if any(gk[g] < s - 1e-9 for g in movers):
            continue
        gap_g = {g: max(GAP, 0.25 * gbox[g][3] * gk[g]) for g in movers}
        fit = _lane_fit(els, d, order, base, lane_w, th, sum(gbox[g][3] * gk[g] + gap_g[g] for g in movers))
        if fit is None:
            continue
        sizes, dims = fit
        lane_items = [("t", i, w, h) for i, (w, h) in zip(order, dims)] + [("g", g, gbox[g][2] * gk[g], gbox[g][3] * gk[g]) for g in movers]
        lane_cw = max(w for _, _, w, _ in lane_items)
        m = (tw - bw * k - lane_cw) / 3  # equal margins: left, between block and lane, right
        if m < GAP:
            continue
        for i in block:  # the content block, rigid about its source box
            _place(els[i], src[i], k, m, (th - bh * k) / 2, bx0, by0)
            if i in decor and src[i]["x"] >= 0 and src[i]["y"] >= 0 and src[i]["x"] + src[i]["width"] <= sw and src[i]["y"] + src[i]["height"] <= sh:
                e = els[i]
                e["x"] = min(max(e["x"], 0.0), tw - e["width"])
                e["y"] = min(max(e["y"], 0.0), th - e["height"])
        lane_x = 2 * m + bw * k
        y = (th - sum(h for _, _, _, h in lane_items) - GAP * (len(order) - 1) - sum(gap_g.values())) / 2
        size_of = dict(zip(order, sizes))
        for kind, key, w, h in lane_items:
            if kind == "t":
                _set_text(els[key], size_of[key], lane_x + (lane_cw - w) / 2, y, w, h)
                y += h + GAP
            else:
                y += gap_g[key] - GAP
                gx0, gy0 = gbox[key][0], gbox[key][1]
                for i in gs[key]:
                    _place(els[i], src[i], gk[key], lane_x + (lane_cw - w) / 2, y, gx0, gy0)
                y += h + GAP
        return True
    return False

def refit(source: dict, out: dict, tw: int, th: int) -> dict:
    """P5b text re-fit plus P6 rigid per-group upscale (+ P10 in-place label raise). Groups first, then ungrouped texts; if texts then cannot pack, groups revert to the exact P5b placement."""
    base = copy.deepcopy(out["elements"])
    moved = _place_groups(source, out, tw, th)
    ok = _texts(source, out, tw, th)
    if not ok and moved:
        out["elements"][:] = base
        ok = _texts(source, out, tw, th)
    _raise_all(out)
    ok = _wide(source, out, tw, th) or ok
    if not ok:
        free = [e["id"] for e in out["elements"] if e["type"] == "text" and not e.get("group_id")]
        warnings.warn("text_fit: no candidate meets the floor for ids " + ",".join(free), RuntimeWarning)
    return out
