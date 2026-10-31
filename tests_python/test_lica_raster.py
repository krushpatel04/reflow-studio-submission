"""Literal dimension controls for the shared Chromium rasterizer."""
import json
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parent.parent


class RasterDimensions(unittest.TestCase):
    def size(self, width, height):
        code = "const {rasterSize}=require('./scripts/lica_official/rasterize.cjs');console.log(JSON.stringify(rasterSize(...JSON.parse(process.argv[1]))));"
        result = subprocess.run(['node', '-e', code, json.dumps([width, height])], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_fractional_source_box_rounds_up_once(self):
        self.assertEqual(self.size(118.064, 2), {'width': 237, 'height': 4})
        self.assertEqual(self.size(5.01, 7.01), {'width': 11, 'height': 15})

    def test_zero_and_subpixel_dimensions_have_one_pixel_minimum(self):
        self.assertEqual(self.size(0, 0), {'width': 1, 'height': 1})
        self.assertEqual(self.size(0.1, 0.1), {'width': 1, 'height': 1})

    def test_integer_source_box_is_exactly_doubled(self):
        self.assertEqual(self.size(160, 90), {'width': 320, 'height': 180})


class RasterContentCoverage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        result = subprocess.run(['node', 'tests_python/lica_raster_probe.cjs'], cwd=ROOT,
                                capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError(f'Chromium raster probe failed: {result.stderr}')
        cls.probe = json.loads(result.stdout)

    def test_fixed_root_without_viewbox_fills_both_output_dimensions(self):
        capture = self.probe['captures']['fixed']
        self.assertEqual(capture['size'], {'width': 48, 'height': 24})
        self.assertEqual(capture['bounds'], [0, 0, 48, 24])

    def test_viewbox_full_box_positive_control(self):
        self.assertEqual(self.probe['captures']['viewbox']['bounds'], [0, 0, 48, 24])

    def test_non_scaling_stroke_preserves_source_thickness_at_two_times(self):
        capture = self.probe['captures']['stroke']
        self.assertEqual(capture['bounds'], [0, 0, 48, 24])
        self.assertEqual(capture['alphaAtTopCenter'], [255, 255, 255, 255, 0, 0])
