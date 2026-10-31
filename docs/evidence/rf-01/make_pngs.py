"""Regenerate the RF-01 representative PNGs from the pinned renderer and re-inspect them from disk.
Run from the repo root: python docs/evidence/rf-01/make_pngs.py   (env as in README). Writes docs/evidence/rf-01/png/*.png and pngs.json."""
import hashlib, json, os, shutil, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scripts.quality import text_ink as T

OUT = Path(__file__).resolve().parent / 'png'
UP = Path(os.environ['CHAMELEON_UPSTREAM'])

def element(text, x, y, w, h, size, family='Solstice Sans', weight='regular'):
    return {'id': 't', 'type': 'text', 'x': x, 'y': y, 'width': w, 'height': h, 'z_index': 0, 'content': text, 'font_family': family,
            'font_size': size, 'font_weight': weight, 'color': 'rgba(0,0,0,1)', 'text_align': 'left', 'rotation': 0}

def render(name, canvas, el):
    with tempfile.TemporaryDirectory() as tmp:
        _, audit = T._render(tmp, canvas, el, UP, el['font_family'], el['font_weight'])
        shutil.copy(Path(tmp) / f'{canvas[0]}x{canvas[1]}.png', OUT / name)
    return audit

def annotate(src, dst, box, color=(220, 0, 0)):
    with Image.open(OUT / src) as im:
        im = im.convert('RGB'); ImageDraw.Draw(im).rectangle(box, outline=color, width=2); im.save(OUT / dst)

def ink(name):
    with Image.open(OUT / name) as im:
        mask = (np.asarray(im.convert('RGB')).astype(int) < 255).any(axis=2)
    ys, xs = np.nonzero(mask)
    return {'ink_px': int(mask.sum()), 'bbox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1] if mask.any() else None, 'size': list(mask.shape[::-1])}

OUT.mkdir(exist_ok=True)
C = (400, 200); PAD = 200
render('clip_failure_real.png', C, element('Hello world', -120, 20, 300, 80, 40))        # x=-120: left of the canvas edge
render('clip_failure_padded.png', (C[0] + 2 * PAD, C[1] + 2 * PAD), element('Hello world', -120 + PAD, 20 + PAD, 300, 80, 40))
render('clip_control_real.png', C, element('Hello world', 20, 20, 300, 80, 40))           # same text fully inside
M = dict(text='one two three four five six seven eight', size=24)
render('overflow_text.png', (400, 500), element(M['text'], 20, 20, 160, 40, 24))          # box h=40 and h=400 draw identical pixels
annotate('overflow_text.png', 'overflow_failure_boxed.png', (20, 20, 180, 60))           # element box h=40 drawn over the real pixels
annotate('overflow_text.png', 'overflow_control_boxed.png', (20, 20, 180, 420), (0, 130, 0))  # box h=400
W = dict(text='Supercalifragilistic', family='Solstice Sans', weight='regular', size=24, x=20, y=20, height=40, canvas=(400, 120), upstream=UP)
render('wrap_valid_wide_box.png', W['canvas'], element(W['text'], 20, 20, 360, 40, 24))
render('wrap_fail_narrow_box.png', W['canvas'], element(W['text'], 20, 20, 60, 40, 24))
assert (OUT / 'wrap_valid_wide_box.png').read_bytes() == (OUT / 'wrap_fail_narrow_box.png').read_bytes()  # overflow is NOT visible in the PNG
annotate('wrap_fail_narrow_box.png', 'wrap_fail_narrow_boxed.png', (20, 20, 80, 60))       # overlay makes the 60px box visible
overflow = {k: {f: T.probe(width=w, **W)[f] for f in ('overflow', 'overflow_px')} for k, w in (('wide_360', 360), ('narrow_60', 60))}
report = {n.name: {**ink(n.name), 'sha256': hashlib.sha256(n.read_bytes()).hexdigest()} for n in sorted(OUT.glob('*.png'))}
report['_probe_overflow'] = overflow
(OUT.parent / 'pngs.json').write_text(json.dumps(report, indent=1, sort_keys=True) + '\n')
print(json.dumps(report, indent=1, sort_keys=True))
(OUT.parent / 'SHA256SUMS').write_text(''.join(f'{v["sha256"]}  png/{k}\n' for k, v in sorted(report.items()) if k.endswith('.png')))
