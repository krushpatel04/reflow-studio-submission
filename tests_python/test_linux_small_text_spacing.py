"""Characterize the pinned real-renderer diagnostic, not aesthetic acceptance."""
import json
import hashlib
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


class SmallTextSpacing(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.tmp.cleanup)
        script = ROOT / os.environ.get('REFLOW_SPACING_SCRIPT',
            'scripts/quality/small_text_spacing.py')
        subprocess.run([sys.executable, str(script)], cwd=cls.tmp.name,
            env={**os.environ, 'PYTHONPATH': str(ROOT)}, check=True,
            capture_output=True, text=True)
        cls.out = Path(cls.tmp.name) / 'reports/ci/python/spacing'
        import shutil
        shutil.copytree(cls.out, ROOT / 'reports/ci/python/spacing', dirs_exist_ok=True)
        cls.report = json.loads((cls.out / 'diagnosis.json').read_text())

    def test_complete_denominator_and_real_pinned_fonts(self):
        rows = self.report['rows']
        self.assertEqual(len(rows), 50)
        self.assertEqual(len({(r['text'], r['size'], r['rotation']) for r in rows}), 50)
        self.assertEqual({r['size'] for r in rows}, {6, 6.67, 7, 8, 8.15})
        self.assertEqual({r['rotation'] for r in rows}, {0, -12})
        for row in rows:
            self.assertEqual(row['real_renderer_calls'], 1)
            self.assertFalse(row['fallbacks'])
            self.assertTrue(row['font_events'])
            png = self.out / row['png']
            self.assertEqual(hashlib.sha256(png.read_bytes()).hexdigest(), row['sha256'])
            with Image.open(png) as im:
                self.assertEqual(im.size, (300, 100))
                self.assertLess(min(im.convert('RGB').getextrema()[0]), 255)
                with Image.open(png.with_name(png.stem + '-2x.png')) as large:
                    self.assertEqual(large.tobytes(), im.resize((600, 200), Image.Resampling.NEAREST).tobytes())

    def test_fractional_and_integer_roomy_controls(self):
        pairs = self.report['fractional_integer_pairs']
        self.assertEqual(len(pairs), 20)
        self.assertTrue(all(p['png_identical'] for p in pairs))
        rows = self.report['rows']
        for row in rows:
            self.assertEqual(row['drawn_size'], int(row['size']))
            self.assertEqual(len(row['advances']), len(row['text']))
            self.assertTrue(all(g > 0 for g in row['glyphs']), row)
            self.assertTrue(all(a > 0 for a in row['advances']), row)
        # Positive sensitivity control: larger actual draw size changes the raster.
        for text in {r['text'] for r in rows}:
            hashes = {r['sha256'] for r in rows if r['text'] == text and r['rotation'] == 0 and r['size'] in (6, 7, 8)}
            self.assertEqual(len(hashes), 3)


if __name__ == '__main__':
    unittest.main()
