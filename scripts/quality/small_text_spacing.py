"""Bounded #148 real-renderer evidence; no renderer or engine policy changes.

CHAMELEON_UPSTREAM=/pinned/starter python -m scripts.quality.small_text_spacing
The default output is retained by the existing Python CI artifact uploader.
"""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import subprocess

import skia
from PIL import Image

from scripts.lica_official.render import RealRenderer
from scripts.quality import text_ink as T

STRINGS = ('SUNSET SALE', 'AWARD WINNING 2026', 'SMALL BATCH',
           'NEW FLAVOR', 'Shop the Summer Line')
SIZES = (6, 6.67, 7, 8, 8.15)
ROTATIONS = (0, -12)
UPSTREAM = 'a44a06046b0413f0785e7203955c3822e0acbc32'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def metrics(face, size, text, policy='default'):
    font = skia.Font(face, size)
    if policy == 'subpixel':
        font.setSubpixel(True)
    elif policy == 'linear':
        font.setLinearMetrics(True)
    elif policy == 'unhinted':
        font.setHinting(skia.FontHinting.kNone)
    glyphs = font.textToGlyphs(text)
    return {'policy': policy, 'size': size, 'glyphs': list(glyphs),
            'subpixel': font.isSubpixel(), 'linear_metrics': font.isLinearMetrics(),
            'hinting': str(font.getHinting()),
            'glyph_positions': list(font.getXPos(glyphs)),
            'advances': list(font.getWidths(glyphs))}


def run(upstream, out):
    upstream, out = Path(upstream).resolve(), Path(out)
    actual = subprocess.check_output(['git', '-C', str(upstream), 'rev-parse', 'HEAD'], text=True).strip()
    if actual != UPSTREAM:
        raise ValueError(f'Unexpected starter revision: {actual}')
    tracked = subprocess.check_output(['git', '-C', str(upstream), 'status', '--porcelain', '--untracked-files=no'], text=True)
    if tracked.strip():
        raise ValueError('Starter has tracked modifications; diagnostic provenance invalid')
    out.mkdir(parents=True, exist_ok=True)
    blobs = out / 'blobs'; blobs.mkdir(exist_ok=True)
    faces = []
    for weight, label in ((400, 'regular'), (700, 'bold')):
        data = T.load_face(T.face_name('Solstice Sans', label), upstream=upstream)
        sha = digest(data); (blobs / sha).write_bytes(data)
        faces.append({'family': 'Solstice Sans', 'weight': weight,
                      'style': 'normal', 'ttf_sha256': sha})
    renderer = RealRenderer(blobs, upstream, faces)
    import cr_renderer.text_utils as renderer_text
    renderer_file = Path(renderer_text.__file__)
    # Keep backing bytes alive: the Skia Python data conversion can borrow them.
    face_data = T.load_face('SolsticeSans-Bold', upstream=upstream)
    face = skia.Typeface.MakeFromData(face_data)
    rows = []
    for j, text in enumerate(STRINGS):
        for size in SIZES:
            for rotation in ROTATIONS:
                element = {'id': 'text', 'type': 'text', 'x': 30, 'y': 35,
                           'width': 220, 'height': 30, 'font_family': 'Solstice Sans',
                           'font_size': size, 'font_weight': 'bold', 'content': text,
                           'rotation': rotation, 'text_align': 'left', 'color': 'rgba(0,0,0,1)'}
                design = {'canvas': {'width': 300, 'height': 100}, 'elements': [element]}
                png = out / f'string{j}-size{size}-rot{rotation}.png'
                design_path = png.with_suffix('.json')
                design_path.write_text(json.dumps(design, indent=2) + '\n')
                audit = renderer.render(design, png)
                if audit['real_renderer_calls'] != 1 or audit['font_fallbacks'] or not audit['font_events']:
                    raise ValueError('Unqualified render: real font events required, fallback forbidden')
                with Image.open(png) as im:
                    im.resize((600, 200), Image.Resampling.NEAREST).save(png.with_name(png.stem + '-2x.png'))
                default = metrics(face, int(size), text)
                rows.append({'text': text, 'size': size, 'rotation': rotation,
                             'png': png.name, 'sha256': digest(png.read_bytes()),
                             'input_sha256': digest(design_path.read_bytes()),
                             'font_events': audit['font_events'],
                             'real_renderer_calls': audit['real_renderer_calls'],
                             'fallbacks': audit['font_fallbacks'], 'drawn_size': int(size),
                             **{k: v for k, v in default.items() if k not in ('size', 'policy')},
                             'float_wrap_metrics': metrics(face, size, text),
                             'diagnostic_metrics_only': [metrics(face, int(size), text, p)
                                 for p in ('subpixel', 'linear', 'unhinted')]})
    pairs = []
    for text in STRINGS:
        for rotation in ROTATIONS:
            for a, b in ((6, 6.67), (8, 8.15)):
                x, y = [next(r for r in rows if r['text'] == text and r['rotation'] == rotation and r['size'] == s) for s in (a, b)]
                pairs.append({'text': text, 'rotation': rotation, 'sizes': [a, b],
                              'png_identical': x['sha256'] == y['sha256']})
    report = {'host': platform.platform(), 'arch': platform.machine(),
              'python': platform.python_version(), 'upstream': actual,
              'renderer_text_sha256': digest(renderer_file.read_bytes()),
              'diagnostic_script_sha256': digest(Path(__file__).read_bytes()),
              'renderer_install': importlib.metadata.distribution('cr-renderer').read_text('direct_url.json'),
              'versions': {p: importlib.metadata.version(p) for p in ('skia-python', 'Pillow', 'numpy', 'fonttools')},
              'faces': faces, 'scope': 'Pinned same-string size and rotation diagnostic; renderer untouched',
              'rows': rows, 'fractional_integer_pairs': pairs,
              'limits': ['No human gap/readability judgment',
                         'Metric-policy observations are not renderer interventions or causal proof',
                         'Roomy isolated labels are not a full public-sample quality verdict',
                         'No engine workaround or global floor change']}
    (out / 'diagnosis.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=Path('reports/ci/python/spacing'))
    args = parser.parse_args()
    report = run(os.environ['CHAMELEON_UPSTREAM'], args.output)
    print(f"rendered {len(report['rows'])} pairs {len(report['fractional_integer_pairs'])}")
