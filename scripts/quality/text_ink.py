"""RF-01: independent Skia ink probe through the real upstream renderer (hash-pinned faces, no fallback); pixels measured with numpy.
No Pillow wrapping helper is used as the oracle."""
import hashlib, io, os
from pathlib import Path

PINNED_FACES = {  # starter a44a06046b0413f0785e7203955c3822e0acbc32 brand_kit/fonts
    'SolsticeSans-Bold': '609a215925701021b97578c71702bfc492882556ce05602b670aaa74a32a1156',
    'SolsticeSans-BoldItalic': 'e47af214406befc181508cf7ff87b774a955a670f7a54d8563a9757d45b2167d',
    'SolsticeSans-Italic': '848a0433face0f273e313e4fdb3497a764f3c96b3b6670dffcc3cc38dcc83f2a',
    'SolsticeSans-Regular': '4500567b25fc1af2983cee01c1e57e01a0108b8b3844c182936d14c7dec7f69c',
    'SolsticeSerif-Bold': '837d42cc1b336364b69714c73288a0ec7ceded41c137d5f62943df5f0745551a',
    'SolsticeSerif-Italic': '07526ca6ef70e5a7853abcdd614aeb62cdb958ed0cabc0f771f85094b4c67ccf',
    'SolsticeSerif-Regular': 'b7eb2a832ae91824a7c670469f4a4e0c4910a3ceedc1d31aad07ea2bc336d2a7',
}
# Scripts needing shaping (joining/reordering/marks). The upstream renderer maps codepoints to glyphs one-to-one, so these are unqualified.
COMPLEX_RANGES = [(0x0590, 0x08FF), (0x0900, 0x0DFF), (0x0E00, 0x0EFF), (0x1000, 0x109F), (0x1780, 0x17FF)]

def _upstream(upstream=None):
    return Path(upstream or os.environ['CHAMELEON_UPSTREAM'])

def _weight(weight):
    """Only the pinned regular/bold faces are drivable; ints and other names are rejected, never mapped."""
    key = weight.lower() if isinstance(weight, str) else None
    if key not in ('regular', 'bold'):
        raise ValueError(f'Unsupported weight {weight!r}: expected regular or bold')
    return key

def face_name(family, weight='regular'):
    base = {'Solstice Sans': 'SolsticeSans', 'Solstice Serif': 'SolsticeSerif'}.get(family)
    if base is None:
        raise ValueError(f'Unpinned font family: {family}')
    weight = _weight(weight)
    return f"{base}-{'Bold' if weight == 'bold' else 'Regular'}"

def load_face(name, data=None, upstream=None):
    """Pinned bytes only: a wrong hash (substitution) raises."""
    if name not in PINNED_FACES:
        raise ValueError(f'Unpinned face: {name}')
    if data is None:
        data = (_upstream(upstream) / 'brand_kit/fonts' / f'{name}.ttf').read_bytes()
    if hashlib.sha256(data).hexdigest() != PINNED_FACES[name]:
        raise ValueError(f'Font hash mismatch: {name}')
    return data

def shaping_notes(text, family='Solstice Sans', weight='regular', size=24, upstream=None):
    """Unsupported or approximate shaping for this exact input, read from the pinned face's own tables."""
    from fontTools.ttLib import TTFont
    font = TTFont(io.BytesIO(load_face(face_name(family, weight), upstream=upstream)))
    notes = []
    if size != int(size):
        notes.append(f'size-truncated: renderer draws int({size})={int(size)}; wrap is measured at {size}')
    gpos = font.get('GPOS')
    feats = sorted({r.FeatureTag for r in gpos.table.FeatureList.FeatureRecord}) if gpos else []
    notes.append(f'kerning-not-applied: renderer positions glyphs by advance only; face GPOS features={feats}'
                 + ('' if 'kern' in feats else ' (no kern feature)'))
    cps = {ord(c) for c in text}
    complex_cps = sorted(c for c in cps if any(a <= c <= b for a, b in COMPLEX_RANGES))
    if complex_cps:
        notes.append('complex-script: ' + ' '.join(f'U+{c:04X}' for c in complex_cps) + ' (no shaping; unqualified)')
    cmap = font.getBestCmap()
    missing = sorted(c for c in cps if c not in cmap and not chr(c).isspace())
    if missing:
        notes.append('missing-glyph: ' + ' '.join(f'U+{c:04X}' for c in missing))
    return notes

def _render(png_dir, canvas, element, upstream, family, weight):
    from PIL import Image
    from scripts.lica_official.render import RealRenderer
    root = Path(png_dir) / 'blobs'; root.mkdir(exist_ok=True)
    faces = []
    for w, label in ((400, 'regular'), (700, 'bold')):
        name = face_name(family, label); data = load_face(name, upstream=upstream)
        digest = hashlib.sha256(data).hexdigest(); (root / digest).write_bytes(data)
        faces.append({'family': family, 'weight': w, 'style': 'normal', 'ttf_sha256': digest})
    renderer = RealRenderer(root, _upstream(upstream), faces)
    design = {'canvas': {'width': canvas[0], 'height': canvas[1]}, 'elements': [element]}
    png = Path(png_dir) / f'{canvas[0]}x{canvas[1]}.png'
    audit = renderer.render(design, png)
    if audit['font_fallbacks'] or audit['real_renderer_calls'] != 1 or not audit['font_events']:
        raise ValueError('Renderer did not use exactly the pinned faces')
    with Image.open(png) as image:
        import numpy as np
        pixels = np.asarray(image.convert('RGB')).astype(int)
    return (pixels < 255).any(axis=2), audit

MAX_PADDED_PIXELS = 60_000_000

def _require_ink_inside_border(padded):
    """Backstop for the extent-derived pad: ink touching the padded border means lost ink could be undercounted."""
    if padded[0].any() or padded[-1].any() or padded[:, 0].any() or padded[:, -1].any():
        raise ValueError('Ink reaches the padded canvas border: lost ink would be undercounted')

def probe(text, family, weight, size, x, y, width, height, canvas, upstream=None, rotation=0):
    """Render on the real canvas and on a padded canvas (same transforms, same fractional size) and compare ink.
    Positions are in real-canvas coordinates. overflow = ink outside the (rotated) element box; clipped = padded ink off the canvas."""
    import math, tempfile
    import numpy as np
    weight = _weight(weight)
    element = {'id': 't', 'type': 'text', 'x': x, 'y': y, 'width': width, 'height': height, 'z_index': 0, 'content': text,
               'font_family': family, 'font_size': size, 'font_weight': weight, 'color': 'rgba(0,0,0,1)', 'text_align': 'left', 'rotation': rotation}
    # Pad from the element's own extent so far-off-canvas ink is still seen: glyph advance <= 2em, line count <= characters, any rotation
    # stays inside this radius around the element centre.
    cx, cy = x + width / 2, y + height / 2
    reach = (width + height) / 2 + len(text) * size * 2 + 4 * size
    padx = max(0, math.ceil(max(cx + reach - canvas[0], reach - cx))) + 8
    pady = max(0, math.ceil(max(cy + reach - canvas[1], reach - cy))) + 8
    if (canvas[0] + 2 * padx) * (canvas[1] + 2 * pady) > MAX_PADDED_PIXELS:
        raise ValueError('Padded probe canvas too large for this element position')
    with tempfile.TemporaryDirectory() as tmp:
        real, audit = _render(tmp, canvas, element, upstream, family, weight)
        padded, _ = _render(tmp, (canvas[0] + 2 * padx, canvas[1] + 2 * pady), {**element, 'x': x + padx, 'y': y + pady}, upstream, family, weight)
    ys, xs = np.nonzero(padded)
    _require_ink_inside_border(padded)
    inside = padded[pady:pady + canvas[1], padx:padx + canvas[0]]
    if int(inside.sum()) != int(real.sum()):
        raise ValueError('Probe inconsistent: padded in-canvas ink differs from the real render')
    ink, visible = int(padded.sum()), int(real.sum())
    px, py = xs + .5 - padx - cx, ys + .5 - pady - cy  # pixel centres relative to the element centre, real-canvas orientation
    a = math.radians(-rotation)
    ex, ey = px * math.cos(a) - py * math.sin(a), px * math.sin(a) + py * math.cos(a)  # back into the element's own frame
    out = (np.abs(ex) > width / 2 + 1) | (np.abs(ey) > height / 2 + 1)
    return {'ink_px': ink, 'visible_px': visible, 'lost_px': ink - visible, 'clipped': ink != visible,
            'ink_bbox': [int(xs.min() - padx), int(ys.min() - pady), int(xs.max() + 1 - padx), int(ys.max() + 1 - pady)] if ink else None,
            'overflow_px': int(out.sum()), 'overflow': bool(out.any()), 'font_events': audit['font_events'], 'notes': shaping_notes(text, family, weight, size, upstream)}
