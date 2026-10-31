"""Whitespace line slots through the actual resize caller, pinned upstream wrap oracle."""
import copy
import hashlib
import json
import os
from pathlib import Path
import sys
import unittest

from engine.resize import resize
from engine import text_fit

UP = Path(os.environ['CHAMELEON_UPSTREAM'])
sys.path.insert(0, str(UP))
from renderer.converter.wrap import wrap_text

FONT_SHA = '4500567b25fc1af2983cee01c1e57e01a0108b8b3844c182936d14c7dec7f69c'


def source(text):
    return {'canvas': {'width': 400, 'height': 400}, 'elements': [
        {'id': 't', 'type': 'text', 'x': 20, 'y': 20, 'width': 300, 'height': 80,
         'font_size': 24, 'font_family': 'Solstice Sans', 'font_weight': 'regular',
         'color': 'rgba(0,0,0,1)', 'content': text, 'line_height': 1.2, 'rotation': 0,
         'style_runs': [{'start': 1, 'end': 5, 'color': 'rgba(0,0,0,1)'}]}]}


class CallerWhitespace(unittest.TestCase):
    def check_case(self, text, target):
        import skia
        original = source(text)
        before = copy.deepcopy(original)
        data = (UP / 'brand_kit/fonts/SolsticeSans-Regular.ttf').read_bytes()
        self.assertEqual(hashlib.sha256(data).hexdigest(), FONT_SHA)
        output = resize(original, target)
        self.assertEqual(original, before)
        self.assertIsNot(output, original)
        self.assertIsNot(output['elements'][0], original['elements'][0])
        e = output['elements'][0]
        self.assertEqual(e['content'], text)
        self.assertEqual(e['style_runs'], before['elements'][0]['style_runs'])
        self.assertIsNot(e['style_runs'], original['elements'][0]['style_runs'])
        face = skia.Typeface.MakeFromData(data)  # data stays alive through measurement
        self.assertIsNotNone(face)
        font = skia.Font(face, e['font_size'])
        widths = list(font.getWidths(font.textToGlyphs(text)))
        wrapped = wrap_text(text, widths, e['width'])
        lines = len(wrapped.split('\n'))
        needed = lines * e['font_size'] * e['line_height']
        print(json.dumps({'input': original, 'target': target, 'returned': e,
                          'wrapped': wrapped, 'line_slots': lines, 'needed_height': needed}, sort_keys=True), flush=True)
        self.assertGreaterEqual(e['height'] + 1e-9, needed, 'returned box undercounts upstream line slots')

    def test_leading_space_caller_allocates_all_upstream_line_slots(self):
        self.check_case(' Hello world', {'width': 72, 'height': 60})

    def test_ordinary_space_control(self):
        self.check_case('Hello world', {'width': 72, 'height': 60})

    def test_wide_identity_control(self):
        self.check_case(' Hello world', {'width': 400, 'height': 400})

    def test_explicit_newline_control(self):
        self.check_case('Hello\nworld', {'width': 72, 'height': 60})


class HelperBoundaries(unittest.TestCase):
    def test_retained_whitespace_boundaries_match_pinned_upstream(self):
        import skia
        data = (UP / 'brand_kit/fonts/SolsticeSans-Regular.ttf').read_bytes()
        self.assertEqual(hashlib.sha256(data).hexdigest(), FONT_SHA)
        face = skia.Typeface.MakeFromData(data)
        font = skia.Font(face, 24)
        for text, cap in [(' Hello world', 70), ('Hello  world', 70), ('Hello world ', 70),
                          ('Hello world', 70), ('Hello\nworld', 70), ('', 70), (' Hello world', 0)]:
            with self.subTest(text=text, cap=cap):
                widths = list(font.getWidths(font.textToGlyphs(text)))
                wrapped = wrap_text(text, widths, cap)
                lines, start = [], 0
                for i, c in enumerate(wrapped + '\n'):
                    if c == '\n':
                        lines.append(sum(widths[start:i])); start = i + 1
                # Compare the wrap algorithms with identical measured inputs.
                # Pillow BASIC and Skia advances differ on macOS; equating their
                # numeric widths confounded measurement policy with wrapping.
                advances = dict(zip(text, widths))
                class Measured:
                    def getlength(self, char):
                        return advances[char]
                self.assertEqual(text_fit._block(Measured(), text, cap), (max(lines), len(lines)))


if __name__ == '__main__':
    unittest.main()
