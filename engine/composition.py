"""Small composition alternatives for extreme ratios. Geometry, never IDs or copy, selects the pattern.

Only a repeated heading/body row, or one contained artwork plus bleeding corner
images, qualifies. Ambiguous documents keep the established fit unchanged.
"""
import copy
import math
from . import text_fit as tf


def _background(e, source):
    kind = (e["type"] == "image" and e.get("fit") == "cover") or (
        e["type"] == "shape" and e.get("shape_type") == "rectangle"
    )
    return (
        kind
        and not e.get("group_id")
        and e.get("rotation", 0) % 180 == 0
        and tf._covers_src(e, source["canvas"]["width"], source["canvas"]["height"])
    )


def _move_image(e, scale, cx, cy):
    e.update(width=e["width"] * scale, height=e["height"] * scale)
    e.update(x=cx - e["width"] / 2, y=cy - e["height"] / 2)


def _artwork(source, out, tw, th):
    fg = [i for i, e in enumerate(source["elements"]) if not _background(e, source)]
    if len(fg) < 2 or any(
        source["elements"][i]["type"] != "image" or source["elements"][i].get("group_id")
        for i in fg
    ):
        return False
    sw, sh = source["canvas"]["width"], source["canvas"]["height"]
    inside = [
        i
        for i in fg
        if source["elements"][i]["x"] >= 0
        and source["elements"][i]["y"] >= 0
        and source["elements"][i]["x"] + source["elements"][i]["width"] <= sw
        and source["elements"][i]["y"] + source["elements"][i]["height"] <= sh
    ]
    if len(inside) != 1 or source["elements"][inside[0]].get("rotation", 0):
        return False
    main = source["elements"][inside[0]]
    if main["width"] <= 0 or main["height"] <= 0:
        return False
    # Frame the full subject. Decorations retain their image aspect, rotation and
    # source-side ordering, distributed to the ends of the new format.
    for i in fg:
        old = source["elements"][i]
        e = out["elements"][i]
        e.update(width=old["width"], height=old["height"])
        if old["width"] <= 0 or old["height"] <= 0:
            return False
        if i == inside[0]:
            _move_image(e, min(0.94 * tw / old["width"], 0.94 * th / old["height"]), tw / 2, th / 2)
        else:
            x0, y0, x1, y1 = tf.aabb(old)
            scale = min(0.72 * min(tw, th) / (x1 - x0), 0.82 * min(tw, th) / (y1 - y0))
            bw, bh = (x1 - x0) * scale, (y1 - y0) * scale
            right = (old["x"] + old["width"] / 2) > sw / 2
            bottom = (old["y"] + old["height"] / 2) > sh / 2
            cx = tw - bw / 2 if right else bw / 2
            cy = th - bh / 2 if bottom else bh / 2
            _move_image(e, scale, cx, cy)
    return True


def _metrics(e, size, width, both_metrics=False):
    """Match float-size wrapping and integer-size ink, without rewriting copy."""
    d = tf._fonts_dir()
    if tf._FACES.get() is not None:
        path = tf._resolve(e)
    else:
        # The default official kit contains only these families. No substitute.
        path = (
            tf._path(d, e)
            if d and e["font_family"] in ("Solstice Sans", "Solstice Serif")
            else None
        )
    if not path or width <= 2:
        return None
    import skia

    face = skia.Typeface.MakeFromFile(path)
    if face is None:
        return None
    widths = tf._renderer_widths(path, size, e["content"])
    widest, n = tf._block_widths(e["content"], widths, (width - 2) / 1.02)
    if widest * 1.02 + 1 > width or e.get("max_lines") and n > e["max_lines"]:
        return None
    if both_metrics:
        pillow_width, pillow_lines = tf._block(tf._font(path, size), e["content"], width)
        if pillow_width > width or e.get("max_lines") and pillow_lines > e["max_lines"]:
            return None
        n = max(n, pillow_lines)
    font = skia.Font(face, int(size))
    m = font.getMetrics()
    advance = size * float(e.get("line_height", tf.DEFAULT_LINE_HEIGHT))
    return max(n * advance, (n - 1) * advance - m.fAscent + m.fBottom + 2)


def _set_text(e, old, size, x, y, width, height):
    e.update(x=x, y=y, width=width, height=height, font_size=float(size))
    if "letter_spacing" in e:
        e["letter_spacing"] = old["letter_spacing"] * size / old["font_size"]


def _article(source, out, tw, th):
    es = source["elements"]
    texts = [i for i, e in enumerate(es) if e["type"] == "text"]
    if len(texts) < 5 or any(
        es[i].get("group_id")
        or es[i].get("rotation", 0)
        or es[i].get("style_runs")
        or es[i].get("letter_spacing", 0) > 0
        for i in texts
    ):
        return False
    # Do not move artwork out of an article. Thin separator lines are the only
    # non-background graphics this conservative pattern can reposition.
    lines = [i for i, e in enumerate(es) if e["type"] != "text" and not _background(e, source)]
    if any(
        es[i].get("group_id")
        or es[i]["height"] > 2
        or es[i]["width"] <= 0
        or abs(es[i].get("rotation", 0)) > 1e-6
        for i in lines
    ):
        return False
    sw, sh = source["canvas"]["width"], source["canvas"]["height"]
    pairs = []
    for i in texts:
        a = es[i]
        candidates = [
            j
            for j in texts
            if es[j]["y"] >= a["y"] + a["height"]
            and abs(es[j]["x"] - a["x"]) < sw * 0.015
            and a["font_size"] >= es[j]["font_size"] * 1.2
        ]
        if candidates:
            j = min(candidates, key=lambda j: es[j]["y"])
            peers = [
                k
                for k in texts
                if k != i
                and 0.8 <= es[k]["font_size"] / a["font_size"] <= 1.25
                and abs(es[k]["y"] - a["y"]) < sh * 0.015
                and abs(es[k]["x"] - a["x"]) > sw * 0.1
            ]
            if peers:
                pairs.append((i, j))
    if not 2 <= len(pairs) <= 6 or len({j for p in pairs for j in p}) != 2 * len(pairs):
        return False
    pairs.sort(key=lambda p: es[p[0]]["x"])
    used = {i for p in pairs for i in p}
    rest = [i for i in texts if i not in used]
    if not rest:
        return False
    title = max(rest, key=lambda i: es[i]["font_size"])
    if es[title]["y"] >= min(es[i]["y"] for i, j in pairs):
        return False
    extras = sorted((i for i in rest if i != title), key=lambda i: (es[i]["y"], es[i]["x"]))
    wide = tw > th * 2
    margin = max(3, min(tw, th) * 0.045)
    gap = max(3, min(tw, th) * 0.025)
    # Try one descending readable type scale. No per-source thresholds or scorer.
    for step in range(82 if wide else 41):
        factor = 1.8 - (step % 41) * 0.035
        body_sizes = [
            max(9 if wide else 10, math.floor(es[j]["font_size"] * factor)) for i, j in pairs
        ]
        blocks = []
        candidate = copy.deepcopy(out)
        ok = True
        sidebar = tw * (0.15 if step < 41 else 0.11) if wide else 0
        col = (
            (tw - 2 * margin - sidebar - gap * len(pairs)) / len(pairs) if wide else tw - 2 * margin
        )
        y = margin
        title_size = min(es[title]["font_size"] * factor, 9 if wide else tw * 0.12)
        title_width = sidebar - gap if wide else col
        h = _metrics(es[title], title_size, title_width)
        while h is None and title_size > max(body_sizes) * 1.2:
            title_size -= 1
            h = _metrics(es[title], title_size, title_width)
        if h is None:
            continue
        _set_text(candidate["elements"][title], es[title], title_size, margin, y, title_width, h)
        title_end = y + h
        y = margin if wide else title_end + gap * 2
        for n, ((i, j), bs) in enumerate(zip(pairs, body_sizes)):
            hs = max(
                10,
                min(es[i]["font_size"] * factor, bs * 1.2 if wide else es[i]["font_size"] * factor),
            )
            ha, hb = _metrics(es[i], hs, col), _metrics(es[j], bs, col)
            if ha is None or hb is None:
                ok = False
                break
            x = margin + sidebar + gap + n * (col + gap) if wide else margin
            _set_text(candidate["elements"][i], es[i], hs, x, y, col, ha)
            _set_text(candidate["elements"][j], es[j], bs, x, y + ha + gap, col, hb)
            blocks.append((i, j, y + ha + gap + hb))
            if not wide:
                y += ha + gap + hb + gap * 2
        if not ok:
            continue
        ey = title_end + gap if wide else y
        for i in extras:
            size = max(
                8 if wide else 10, min(es[i]["font_size"] * factor, 8 if wide else tw * 0.075)
            )
            ew = title_width if wide else col
            h = _metrics(es[i], size, ew)
            if h is None:
                ok = False
                break
            _set_text(candidate["elements"][i], es[i], size, margin, ey, ew, h)
            ey += h + gap
        if not ok or max([ey] + [b[2] for b in blocks]) > th - margin:
            continue
        for i in lines:
            e = candidate["elements"][i]
            e.update(width=es[i]["width"], height=es[i]["height"])
            scale = min(title_width / es[i]["width"], 1)
            _move_image(e, scale, margin + title_width / 2, margin / 2)
        if not wide:
            # Distribute spare vertical space between coherent sections, not
            # between their headings and body copy.
            spare = max(0, th - margin - ey)
            shift = spare / (len(blocks) + 1)
            for n, (i, j, _) in enumerate(blocks):
                candidate["elements"][i]["y"] += (n + 1) * shift
                candidate["elements"][j]["y"] += (n + 1) * shift
            for i in extras:
                candidate["elements"][i]["y"] += len(blocks) * shift
        out["elements"] = candidate["elements"]
        return True
    return False


def adapt(source, out, tw, th):
    sw, sh = source["canvas"]["width"], source["canvas"]["height"]
    if (tw, th) == (sw, sh):
        return out
    ratio = (tw / th) / (sw / sh)
    nearby = 0.5 <= ratio <= 2
    medium = tw < th * 3 and th < tw * 2
    if nearby and (not medium or not any(e["type"] == "text" and e["font_size"] <= tf.FLOOR_PX
                                        for e in out["elements"])):
        return out
    candidate = copy.deepcopy(out)
    if (
        _campaign(source, candidate, tw, th)
        or (not nearby and _artwork(source, candidate, tw, th))
        or (not nearby and _article(source, candidate, tw, th))
    ):
        # A proposed arrangement must not introduce a structural failure.
        if all(
            -1e-6 <= x0 and -1e-6 <= y0 and x1 <= tw + 1e-6 and y1 <= th + 1e-6
            for x0, y0, x1, y1 in (tf.aabb(e) for e in candidate["elements"])
        ):
            return candidate
    return out


def _campaign(source, out, tw, th):
    """Dense small banner: one image/ribbon rail, measured copy and a label row.

    Backing rectangles fit their own labels; membership, rotation, colours and
    content stay fixed. This avoids retaining large source padding at tiny sizes.
    """
    medium = tw < th * 3 and th < tw * 2
    if medium and not any(e["type"] == "text" and e["font_size"] <= tf.FLOOR_PX for e in out["elements"]):
        return False
    es = source["elements"]
    groups = tf._groups(es)
    if len(groups) < 3:
        return False
    pairs = []
    singletons = set()
    for idx in groups.values():
        if len(idx) == 1 and es[idx[0]]["type"] == "text":
            singletons.add(idx[0])
            continue
        if len(idx) != 2:
            return False
        labels = [i for i in idx if es[i]["type"] == "text"]
        plates = [i for i in idx if es[i]["type"] == "shape" and es[i]["shape_type"] == "rectangle"]
        if len(labels) != 1 or len(plates) != 1:
            return False
        l, p = labels[0], plates[0]
        if es[p]["width"] <= 0 or es[p]["height"] <= 0:
            return False
        if (
            es[l].get("rotation", 0) != es[p].get("rotation", 0)
            or es[l].get("letter_spacing")
            or es[l].get("style_runs")
        ):
            return False
        pairs.append((p, l))
    if len(pairs) < 3:
        return False
    rotated = [p for p in pairs if es[p[0]].get("rotation", 0)]
    if len(rotated) > 1:
        return False
    free = sorted(
        [i for i, e in enumerate(es) if e["type"] == "text" and (not e.get("group_id") or i in singletons)],
        key=lambda i: (es[i]["y"], es[i]["x"]),
    )
    images = sorted(
        [i for i, e in enumerate(es) if e["type"] == "image" and not _background(e, source)],
        key=lambda i: (es[i]["y"], es[i]["x"]),
    )
    if len(free) < 2 or not images:
        return False
    shapes = [i for i, e in enumerate(es)
              if e["type"] == "shape" and not e.get("group_id") and not _background(e, source)]

    def shapes_clear(candidate):
        # Retain ancillary shapes at their existing geometry, but never let an
        # opaque/important shape become a newly ignored foreground obstacle.
        return all(not tf._overlap(tf.aabb(candidate[i]), tf.aabb(candidate[j]))
                   for i in shapes for j in range(len(es))
                   if j not in shapes and not _background(es[j], source))
    if any(
        es[i].get("rotation", 0) or es[i].get("style_runs") or es[i].get("letter_spacing", 0) > 0
        for i in free
    ):
        return False
    main = max(images, key=lambda i: es[i]["width"] * es[i]["height"])
    if any(es[i]["width"] <= 0 or es[i]["height"] <= 0 or es[i].get("rotation", 0) for i in images):
        return False

    def ancillary_scale(i):
        scale = min(36 / es[i]["width"], 14 / es[i]["height"])
        # Small artwork following the subject should not become a prominent
        # badge merely because the copy is repacked. Keep its source scale;
        # header logos and artwork alongside the subject retain their slots.
        if es[i]["y"] >= es[main]["y"] + es[main]["height"]:
            scale = min(scale, tw / source["canvas"]["width"], th / source["canvas"]["height"])
        return scale

    margin, gap = (1.0 if medium else 2.0), 2.0
    rail = th * 0.85
    lane = tw - rail - 3 * margin
    source_sizes = sorted(es[i]["font_size"] for i in free)
    reference = source_sizes[len(source_sizes) // 2]
    # Try bounded source-relative emphasis before the established uniform type
    # scale on wide layouts. Tall layouts retain their existing supporting-copy
    # sizes; neither mode lowers supporting copy below the existing 9px floor.
    modes = (True, False) if (tw >= th * 3 or medium) and source_sizes[0] < source_sizes[-1] else (False,)
    for emphasis, size in [(mode, n) for mode in modes
                           for n in range(max(12, min(40, int(min(tw, th) * 0.14))), 8, -1)]:
        sizes = {i: max(9, math.floor(size * min(1.5, max(0.75, es[i]["font_size"] / reference))))
                 if emphasis else size for i in free}
        if medium:
            sizes = {i: max(sizes[i], math.ceil(out["elements"][i]["font_size"])) for i in free}
        if medium and any(size < out["elements"][l]["font_size"] for _, l in pairs):
            continue
        candidate = copy.deepcopy(out)
        ce = candidate["elements"]
        row = []
        rail_box = None
        ok = True
        for p, l in pairs:
            d = tf._fonts_dir()
            path = (
                tf._resolve(es[l])
                if tf._FACES.get() is not None
                else (
                    tf._path(d, es[l])
                    if d and es[l]["font_family"] in ("Solstice Sans", "Solstice Serif")
                    else None
                )
            )
            if not path:
                ok = False
                break
            advance = sum(tf._renderer_widths(path, size, es[l]["content"]))
            if medium:
                advance = max(advance, sum(tf._pillow_widths(tf._font(path, size), es[l]["content"])))
            width = math.ceil(advance * 1.02) + 3
            height = _metrics(es[l], size, width, both_metrics=medium)
            if height is None:
                ok = False
                break
            pw, ph = width + (6 if medium else 10), height + 4
            r = math.radians(es[p].get("rotation", 0))
            bw = abs(pw * math.cos(r)) + abs(ph * math.sin(r))
            bh = abs(pw * math.sin(r)) + abs(ph * math.cos(r))
            item = (p, l, pw, ph, width, height, bw, bh)
            if (p, l) in rotated:
                rail_box = item
            else:
                row.append(item)
        if not ok:
            continue
        rail = max(th * 0.85, rail_box[6] + 2 * margin if rail_box else 0)
        lane = tw - rail - 3 * margin
        # Keep source row ordering, including the CTA. IDs never choose a role.
        row.sort(key=lambda t: (es[t[0]]["y"], es[t[0]]["x"]))
        if medium:
            width = tw - 2 * margin
            # A compact product/copy header frees the full width below for
            # supporting copy and coherent plate/label rows. Never shrink the
            # established product or any text to make the alternative fit.
            image_scale = out["elements"][main]["width"] / es[main]["width"]
            iw, ih = es[main]["width"] * image_scale, es[main]["height"] * image_scale
            if iw > width * 0.45:
                continue
            headline_width = width - iw - gap
            footer_images = [i for i in images if i != main and es[i]["y"] >= es[main]["y"] + es[main]["height"]]
            top_dims = [(i, ancillary_scale(i)) for i in images if i != main and i not in footer_images]
            footer_dims = [(i, ancillary_scale(i)) for i in footer_images]
            top_w = sum(es[i]["width"] * k for i, k in top_dims) + gap * max(0, len(top_dims) - 1)
            top_h = max([es[i]["height"] * k for i, k in top_dims] + [0])
            footer_w = sum(es[i]["width"] * k for i, k in footer_dims) + gap * max(0, len(footer_dims) - 1)
            footer_h = max([es[i]["height"] * k for i, k in footer_dims] + [0])
            if top_w > width or footer_w > width:
                continue
            group_bottom = max(es[p]["y"] + es[p]["height"] for p, _ in pairs)
            bottom_ids = [i for i in free[1:] if es[i]["y"] >= group_bottom]
            footer_text = bottom_ids[0] if len(bottom_ids) == 1 and footer_dims else None
            heights = [_metrics(es[i], sizes[i], headline_width if n == 0 else
                                width - footer_w - gap if i == footer_text else width, both_metrics=True)
                       for n, i in enumerate(free)]
            if any(h is None for h in heights):
                continue
            shelves, shelf, used = [], [], 0.0
            for item in sorted(row + ([rail_box] if rail_box else []),
                               key=lambda t: (es[t[0]]["y"], es[t[0]]["x"])):
                if item[6] > width:
                    ok = False
                    break
                if shelf and used + gap + item[6] > width:
                    shelves.append(shelf)
                    shelf, used = [], 0.0
                used += (gap if shelf else 0) + item[6]
                shelf.append(item)
            if not ok:
                continue
            if shelf:
                shelves.append(shelf)
            shelf_heights = [max(t[7] for t in shelf) for shelf in shelves]
            compact_header = bool(top_dims) and top_w <= iw
            top_strip = 0 if compact_header else top_h
            for vertical_gap in (gap, 1.0):
                image_header_h = ih + top_h + vertical_gap if compact_header else ih
                header_h = max(image_header_h, heights[0])
                total = top_strip + header_h + sum(heights[1:]) + sum(shelf_heights) + vertical_gap * (len(free) + len(shelves))
                if footer_text is not None:
                    total += max(0, footer_h - heights[free.index(footer_text)])
                elif footer_dims:
                    total += footer_h + vertical_gap
                if total <= th - 2 * margin:
                    break
            if total > th - 2 * margin:
                continue
            yy = margin + (0 if compact_header else top_h + vertical_gap)
            image_y = yy + (header_h - image_header_h) / 2
            xx = margin if compact_header else (tw - top_w) / 2
            for i, k in top_dims:
                ce[i].update(x=xx, y=image_y if compact_header else margin,
                             width=es[i]["width"] * k, height=es[i]["height"] * k)
                xx += ce[i]["width"] + gap
            ce[main].update(x=margin, y=image_y + (top_h + vertical_gap if compact_header else 0), width=iw, height=ih)
            _set_text(ce[free[0]], es[free[0]], sizes[free[0]], margin + iw + gap,
                      yy, headline_width, heights[0])
            yy += header_h + vertical_gap
            bottom_copy = [(i, h) for i, h in zip(free[1:], heights[1:]) if es[i]["y"] >= group_bottom]
            for i, h in zip(free[1:], heights[1:]):
                if es[i]["y"] >= group_bottom:
                    continue
                _set_text(ce[i], es[i], sizes[i], margin, yy, width, h)
                yy += h + vertical_gap
            for shelf, sh in zip(shelves, shelf_heights):
                sw = sum(t[6] for t in shelf) + gap * (len(shelf) - 1)
                xx = (tw - sw) / 2
                for p, l, pw, ph, w, h, bw, bh in shelf:
                    cx, cy = xx + bw / 2, yy + sh / 2
                    ce[p].update(x=cx-pw/2, y=cy-ph/2, width=pw, height=ph)
                    if "corner_radius" in ce[p]:
                        ce[p]["corner_radius"] = es[p]["corner_radius"] * ph / es[p]["height"]
                    _set_text(ce[l], es[l], size, cx-w/2, cy-h/2, w, h)
                    xx += bw + gap
                yy += sh + vertical_gap
            xx = margin if footer_text is not None else (tw - footer_w) / 2
            for i, k in footer_dims:
                ce[i].update(x=xx, y=yy, width=es[i]["width"] * k, height=es[i]["height"] * k)
                xx += ce[i]["width"] + gap
            if footer_dims and footer_text is None:
                yy += footer_h + vertical_gap
            for i, h in bottom_copy:
                inset = footer_w + gap if i == footer_text else 0
                _set_text(ce[i], es[i], sizes[i], margin + inset, yy, width - inset, h)
                yy += h + vertical_gap
            if not shapes_clear(ce):
                continue
            out["elements"] = ce
            return True
        if th >= tw * 2:
            portrait = row + ([rail_box] if rail_box else [])
            portrait.sort(key=lambda t: (es[t[0]]["y"], es[t[0]]["x"]))
            width = tw - 2 * margin
            heights = [_metrics(es[i], sizes[i], width) for i in free]
            if any(h is None for h in heights) or any(t[6] > width for t in portrait):
                continue
            picture_h = min(th * 0.28, width + 20)
            top_images = [i for i in images if i != main]
            top_dims = [(i, ancillary_scale(i)) for i in top_images]
            if (
                sum(es[i]["width"] * k for i, k in top_dims) + gap * max(0, len(top_dims) - 1)
                > width
            ):
                continue
            top_h = max([es[i]["height"] * k for i, k in top_dims] + [0])
            image_scale = min(
                width / es[main]["width"], (picture_h - top_h - gap) / es[main]["height"]
            )
            content_h = top_h + gap + es[main]["height"] * image_scale + gap
            total = (
                content_h
                + sum(heights)
                + sum(t[7] for t in portrait)
                + gap * (len(free) + len(portrait))
            )
            if total > th - 2 * margin or image_scale <= 0:
                continue
            xx = (
                tw - sum(es[i]["width"] * k for i, k in top_dims) - gap * max(0, len(top_dims) - 1)
            ) / 2
            for i, k in top_dims:
                ce[i].update(x=xx, y=margin, width=es[i]["width"] * k, height=es[i]["height"] * k)
                xx += ce[i]["width"] + gap
            ce[main].update(
                width=es[main]["width"] * image_scale, height=es[main]["height"] * image_scale
            )
            ce[main].update(x=(tw - ce[main]["width"]) / 2, y=margin + top_h + gap)
            yy = margin + content_h
            for i, h in zip(free, heights):
                _set_text(ce[i], es[i], sizes[i], margin, yy, width, h)
                yy += h + gap
            for p, l, pw, ph, w, h, bw, bh in portrait:
                cx, cy = tw / 2, yy + bh / 2
                ce[p].update(x=cx - pw / 2, y=cy - ph / 2, width=pw, height=ph)
                if "corner_radius" in ce[p]:
                    ce[p]["corner_radius"] = es[p]["corner_radius"] * ph / es[p]["height"]
                _set_text(ce[l], es[l], size, cx - w / 2, cy - h / 2, w, h)
                yy += bh + gap
            if not shapes_clear(ce):
                continue
            out["elements"] = ce
            return True
        extras = []
        for i in images:
            if i != main:
                scale = ancillary_scale(i)
                extras.append((i, es[i]["width"] * scale, es[i]["height"] * scale))
        rh = max([t[7] for t in row] + [h for _, w, h in extras])
        rw = (
            sum(t[6] for t in row)
            + sum(w for _, w, h in extras)
            + gap * (len(row) + len(extras) - 1)
        )
        if rw > lane or rail_box and (rail_box[6] > rail or rail_box[7] + margin >= th):
            continue
        heights = [_metrics(es[i], sizes[i], lane) for i in free]
        if any(h is None for h in heights):
            continue
        paired = False
        if sum(heights) + rh + gap * len(free) > th - 2 * margin:
            # A wrap boundary may make the vertical copy stack too tall. Try
            # the first two copy blocks side by side before reducing type.
            if len(free) != 3:
                continue
            half = (lane - gap) / 2
            pair_h = [_metrics(es[i], sizes[i], half) for i in free[:2]]
            if (
                any(h is None for h in pair_h)
                or max(pair_h) + heights[2] + rh + 3 * gap > th - 2 * margin
            ):
                continue
            paired = True
        y = margin
        if paired:
            for n, (i, h) in enumerate(zip(free[:2], pair_h)):
                _set_text(ce[i], es[i], sizes[i], rail + 2 * margin + n * (half + gap), y, half, h)
            y += max(pair_h) + gap
            _set_text(ce[free[2]], es[free[2]], sizes[free[2]], rail + 2 * margin, y, lane, heights[2])
            y += heights[2] + gap
        else:
            for i, h in zip(free, heights):
                _set_text(ce[i], es[i], sizes[i], rail + 2 * margin, y, lane, h)
                y += h + gap

        def place(item, cx, cy):
            p, l, pw, ph, w, h, _, _ = item
            ce[p].update(x=cx - pw / 2, y=cy - ph / 2, width=pw, height=ph)
            if "corner_radius" in ce[p]:
                ce[p]["corner_radius"] = es[p]["corner_radius"] * ph / es[p]["height"]
            _set_text(ce[l], es[l], size, cx - w / 2, cy - h / 2, w, h)

        x = rail + 2 * margin + (lane - rw) / 2
        for item in row:
            place(item, x + item[6] / 2, y + rh / 2)
            x += item[6] + gap
        for i, w, h in extras:
            ce[i].update(x=x, y=y + (rh - h) / 2, width=w, height=h)
            x += w + gap
        top = margin
        if rail_box:
            place(rail_box, rail / 2 + margin, top + rail_box[7] / 2)
            top += rail_box[7] + gap
        old = es[main]
        scale = min((rail - 2 * margin) / old["width"], (th - margin - top) / old["height"])
        if scale <= 0:
            continue
        ce[main].update(width=old["width"] * scale, height=old["height"] * scale)
        ce[main].update(
            x=margin + (rail - ce[main]["width"]) / 2,
            y=top + (th - margin - top - ce[main]["height"]) / 2,
        )
        if not shapes_clear(ce):
            continue
        out["elements"] = ce
        return True
    return False
