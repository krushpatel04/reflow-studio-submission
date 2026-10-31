"""Synthetic output tree for driving the real scripts.lica_official.render.run() (P12b). No lica-data, no network.
Two constructed faces: FitNarrow (500 units per glyph) and FitWide (800), same glyph set, so fit width must follow the bytes."""
import hashlib, io, json
from pathlib import Path
from PIL import Image
from scripts.lica_official import convert_layout
from scripts.lica_official.resources import digest
from tests_python.test_lica_official import layout, text

GLYPHS = ['.notdef', 'space', 'H', 'e', 'l', 'o', 'W', 'r', 'd']
CODES = {32: 'space', 72: 'H', 101: 'e', 108: 'l', 111: 'o', 87: 'W', 114: 'r', 100: 'd'}


def make_face(family, advance):
    from fontTools.fontBuilder import FontBuilder
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    b = FontBuilder(1000, isTTF=True)
    # Identical fixture inputs must yield identical bytes across clock boundaries.
    b.font['head'].created = b.font['head'].modified = 3786912000
    b.font.recalcTimestamp = False
    b.setupGlyphOrder(GLYPHS); b.setupCharacterMap(CODES)
    glyphs = {}
    for n in GLYPHS:
        pen = TTGlyphPen(None)
        if n != 'space':
            pen.moveTo((50, 0)); pen.lineTo((advance - 50, 0)); pen.lineTo((advance - 50, 700)); pen.lineTo((50, 700)); pen.closePath()
        glyphs[n] = pen.glyph()
    b.setupGlyf(glyphs); b.setupHorizontalMetrics({n: (advance, 50) for n in GLYPHS})
    b.setupHorizontalHeader(ascent=800, descent=-200)
    b.setupNameTable({'familyName': family, 'styleName': 'Regular', 'uniqueFontIdentifier': family + '-Regular',
                      'fullName': family + ' Regular', 'psName': family + '-Regular', 'version': 'Version 1.0'})
    b.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
    b.setupPost(); b.setupMaxp()
    buf = io.BytesIO(); b.save(buf)
    return buf.getvalue()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True))


def build_tree(root, designs):
    """designs: list of (layout_id, family, advance[, weight, style]). Returns (output, raw, schema). One task per design, 300x300."""
    out, raw = root / 'out', root / 'raw'
    entries, manifest_designs, fonts = [], [], []
    for pair, (lid, family, advance, *extra) in enumerate(designs, 1):
        weight, style = extra or (400, 'normal')
        data = make_face(family, advance)
        sha = digest(data)
        (out / 'resources/blobs').mkdir(parents=True, exist_ok=True)
        (out / 'resources/blobs' / sha).write_bytes(data)
        fonts.append({'family': family, 'weight': weight, 'style': style, 'ttf_sha256': sha})
        entry = layout(text('title', fontFamily=family, fontWeight=str(weight), fontStyle=style, text='Hello World', width='400px', height='60px', fontSize='15px'))
        source = convert_layout(entry, layout_id=lid, template_id='allowed', category='Posters', split='development',
                                target_canvas={'width': 300, 'height': 300})['task']['source']
        write(out / 'sources' / f'{lid}.json', source)
        task = {'task_id': f'task-{lid}', 'source': source, 'target_canvas': {'width': 300, 'height': 300}}
        task_file = f'tasks/{lid}.json'
        write(out / task_file, task)
        image = raw / 'images' / 'allowed' / f'{lid}.png'
        image.parent.mkdir(parents=True, exist_ok=True)
        Image.new('RGB', (300, 300), 'white').save(image)
        manifest_designs.append({'layout_id': lid, 'template_id': 'allowed', 'pair': pair, 'category': 'Posters',
                                 'split': 'development', 'source': f'sources/{lid}.json', 'font_sha256': [sha],
                                 'tasks': [{'target': 't300', 'file': task_file,
                                            'sha256': hashlib.sha256((out / task_file).read_bytes()).hexdigest()}]})
    write(out / 'manifest.json', {'version': 'p12b-fixture', 'targets': [{'id': 't300', 'label': '300x300', 'width': 300, 'height': 300}],
                                  'designs': manifest_designs, 'categories': {'Posters': len(designs)},
                                  'splits': {'development': len(designs)}, 'exclusions': {}})
    write(out / 'resources/index.json', {'fonts': fonts})
    return out, raw
