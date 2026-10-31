"""Issue #147: actual pinned renderer must retain public legal copy.

These are pixel assertions, not Pillow-fit assertions. Missing renderer/fonts fail.
"""
import copy
import json
import os
import sys
from pathlib import Path
import unittest

from engine.resize import resize
from scripts.quality.text_ink import probe

UP = Path(os.environ.get('CHAMELEON_UPSTREAM', '/nonexistent'))


def sample():
    return json.loads((UP / 'input/chameleon_sample_level3_advanced.json').read_text())


def ink(e, canvas):
    return probe(e['content'], e['font_family'], e.get('font_weight', 'regular'),
                 e['font_size'], e['x'], e['y'], e['width'], e['height'],
                 (canvas['width'], canvas['height']), upstream=UP,
                 rotation=e.get('rotation', 0))


class LegalLineFit(unittest.TestCase):
    def test_public_legal_copy_is_fully_visible(self):
        task = sample()
        out = resize(task['source'], task['target_canvas'])
        legal = next(e for e in out['elements'] if e['id'] == 'legal_text')
        result = ink(legal, out['canvas'])
        self.assertGreater(result['ink_px'], 0)
        self.assertFalse(result['clipped'], result)
        self.assertFalse(result['overflow'], result)

    def test_same_copy_with_ample_width_is_clean_positive_control(self):
        task = sample()
        out = resize(task['source'], task['target_canvas'])
        legal = next(e for e in out['elements'] if e['id'] == 'legal_text')
        result = ink({**legal, 'x': 10, 'y': 20, 'width': 700, 'height': 30}, out['canvas'])
        self.assertGreater(result['ink_px'], 0)
        self.assertFalse(result['clipped'])
        self.assertFalse(result['overflow'])

    def test_source_and_protected_fields_are_preserved(self):
        task = sample(); before = copy.deepcopy(task)
        out = resize(task['source'], task['target_canvas'])
        self.assertEqual(task, before)
        self.assertEqual([e['id'] for e in out['elements']], [e['id'] for e in task['source']['elements']])
        geometry = {'x', 'y', 'width', 'height', 'font_size', 'letter_spacing', 'corner_radius', 'stroke_width'}
        for source, result in zip(task['source']['elements'], out['elements']):
            self.assertEqual({k:v for k,v in source.items() if k not in geometry},
                             {k:v for k,v in result.items() if k not in geometry})

    def test_all_public_text_is_unclipped(self):
        for path in sorted((UP / 'input').glob('chameleon_sample_*.json')):
            task = json.loads(path.read_text())
            out = resize(task['source'], task['target_canvas'])
            for e in out['elements']:
                if e['type'] == 'text':
                    with self.subTest(sample=path.name, element=e['id']):
                        result = ink(e, out['canvas'])
                        self.assertGreater(result['ink_px'], 0)
                        self.assertFalse(result['clipped'], result)
        self.assertEqual(len(list((UP / 'input').glob('chameleon_sample_*.json'))), 3)

    def test_wrap_transition_has_capacity_for_actual_lines(self):
        sys.path.insert(0, str(UP))
        from renderer.converter.brand_fonts import load_brand_font_manager
        from renderer.converter.wrap import char_widths, wrap_text
        fm = load_brand_font_manager(str(UP / 'brand_kit/fonts'))
        legal = next(e for e in sample()['source']['elements'] if e['id'] == 'legal_text')
        source = {'canvas': {'width': 1200, 'height': 1200}, 'elements': [
            {**legal, 'id': 'ordinary-disclosure', 'x': 100, 'y': 1100,
             'width': 1000, 'height': 40, 'font_size': 12}]}
        counts = []
        for width in (180, 360, 728):
            with self.subTest(width=width):
                out = resize(source, {'width': width, 'height': 120})
                e = out['elements'][0]
                widths = char_widths(fm, e['font_family'], 'regular', 'regular', e['font_size'], e['content'])
                n = len(wrap_text(e['content'], widths, e['width']).split('\n'))
                counts.append(n)
                self.assertGreaterEqual(e['height'] + 1e-9, n * e['font_size'] * e.get('line_height', 1.2))
                self.assertEqual(e['content'], legal['content'])
                self.assertFalse(ink(e, out['canvas'])['clipped'])
        self.assertGreater(counts[0], counts[-1], 'control must actually cross a wrap boundary')

    def test_clip_probe_rejects_same_copy_off_canvas(self):
        task = sample(); out = resize(task['source'], task['target_canvas'])
        legal = next(e for e in out['elements'] if e['id'] == 'legal_text')
        result = ink({**legal, 'y': 100}, out['canvas'])
        self.assertTrue(result['clipped'])
        self.assertGreater(result['lost_px'], 0)


if __name__ == '__main__':
    unittest.main()
