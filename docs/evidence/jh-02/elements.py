"""JH-02: per-text-element typography table for the three public sample outputs. Read-only.

Run from the repo root with the pinned env (see README):
  PYTHONPATH=. CHAMELEON_UPSTREAM=<a44a060 checkout> python docs/evidence/jh-02/elements.py <output_dir> > reports/jh-02/elements.json
Lines come from upstream's own char_widths/wrap_text (float size, as upstream wraps). Ink, clipping and overflow come
from the RF-01 probe (scripts/quality/text_ink.probe), which renders left-aligned. Controls repeat RF-01's clip pair.
"""
import hashlib, json, os, sys
from pathlib import Path

from scripts.quality import text_ink as T

UP = Path(os.environ['CHAMELEON_UPSTREAM'])
sys.path.insert(0, str(UP))
from renderer.converter.brand_fonts import load_brand_font_manager  # noqa: E402
from renderer.converter.wrap import char_widths, wrap_text  # noqa: E402

FM = load_brand_font_manager(str(UP / 'brand_kit/fonts'))
SAMPLES = ('level1_warmup', 'level2_core', 'level3_advanced')


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def lines(e):
    weight = 'bold' if str(e.get('font_weight', '')).lower() == 'bold' else 'regular'
    style = 'bold' if weight == 'bold' else 'regular'
    widths = char_widths(FM, e['font_family'], weight, style, float(e['font_size']), e['content'])
    return wrap_text(e['content'], widths, float(e['width'])).split('\n')


def row(e, canvas):
    weight = 'bold' if str(e.get('font_weight', '')).lower() == 'bold' else 'regular'
    p = T.probe(e['content'], e['font_family'], weight, float(e['font_size']), e['x'], e['y'], e['width'], e['height'],
                canvas, upstream=UP, rotation=float(e.get('rotation') or 0))
    return {'id': e['id'], 'content': e['content'], 'family': e['font_family'], 'weight': weight,
            'font_size': round(float(e['font_size']), 3), 'drawn_size': int(float(e['font_size'])),
            'box': [round(e['x'], 1), round(e['y'], 1), round(e['width'], 1), round(e['height'], 1)],
            'rotation': e.get('rotation') or 0, 'lines': lines(e),
            'clipped': p['clipped'], 'lost_px': p['lost_px'], 'overflow': p['overflow'], 'overflow_px': p['overflow_px'],
            'ink_bbox': p['ink_bbox'], 'notes': p['notes'],
            'pinned_face_used': True}  # probe raises on font fallback or hash mismatch


def controls():
    """RF-01's clip pair: the failure must be judged clipped, the control clean."""
    c = (400, 120)
    bad = T.probe('Hello world', 'Solstice Sans', 'regular', 24, -120, 40, 300, 40, c, upstream=UP)
    good = T.probe('Hello world', 'Solstice Sans', 'regular', 24, 20, 40, 300, 40, c, upstream=UP)
    return {'clip_failure_flagged': bad['clipped'] and bad['lost_px'] > 0, 'clip_control_clean': not good['clipped'] and not good['overflow']}


def main(out_dir):
    out_dir = Path(out_dir)
    report = {'upstream': os.popen(f'git -C {UP} rev-parse HEAD').read().strip(), 'controls': controls(), 'samples': {}}
    for s in SAMPLES:
        design = json.loads((out_dir / f'chameleon_sample_{s}_output.json').read_text())
        canvas = (design['canvas']['width'], design['canvas']['height'])
        report['samples'][s] = {
            'input_sha256': sha(UP / f'input/chameleon_sample_{s}.json'),
            'output_json_sha256': sha(out_dir / f'chameleon_sample_{s}_output.json'),
            'output_png_sha256': sha(out_dir / f'chameleon_sample_{s}_output.png'),
            'canvas': canvas,
            'texts': [row(e, canvas) for e in design['elements'] if e['type'] == 'text'],
        }
    print(json.dumps(report, indent=1, ensure_ascii=False))


if __name__ == '__main__':
    main(sys.argv[1])
