"""Font resources must come from the assembled kit or an explicit checkout."""
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from engine import text_fit


class FontResources(unittest.TestCase):
    def test_assembled_kit_wins_over_development_checkout(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'engine').mkdir()
            kit = root / 'brand_kit' / 'fonts'
            kit.mkdir(parents=True)
            with patch.object(text_fit, '_HERE', str(root / 'engine')), patch.dict(os.environ, {'CHAMELEON_UPSTREAM': '/unused'}):
                self.assertEqual(Path(text_fit._fonts_dir()).resolve(), kit.resolve())

    def test_explicit_development_checkout_is_supported(self):
        with tempfile.TemporaryDirectory() as temp:
            kit = Path(temp) / 'brand_kit' / 'fonts'
            kit.mkdir(parents=True)
            with patch.object(text_fit, '_HERE', '/missing/engine'), patch.dict(os.environ, {'CHAMELEON_UPSTREAM': temp}):
                self.assertEqual(Path(text_fit._fonts_dir()), kit)

    def test_missing_kit_cannot_be_masked_by_another_hosts_install(self):
        # Model a machine with the former private fallback present. No real host files are read.
        old = '/home/nala/.local/share/reflow-runtime/chameleon-a44a060/brand_kit/fonts'
        with patch.object(text_fit, '_HERE', '/missing/engine'), patch.dict(os.environ, {}, clear=True), patch('os.path.isdir', side_effect=lambda path: path == old):
            self.assertIsNone(text_fit._fonts_dir())


class FontMeasurementPolicy(unittest.TestCase):
    def test_metrics_match_explicit_basic_layout_at_fractional_sizes(self):
        from PIL import ImageFont
        path = os.path.join(text_fit._fonts_dir(), 'SolsticeSans-Regular.ttf')
        for size in (6.0, 11.7, 24.25):
            with self.subTest(size=size):
                expected = ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.BASIC)
                measured = text_fit._font(path, size)
                self.assertEqual(measured.getlength('AV fi Shop the Summer Line'),
                                 expected.getlength('AV fi Shop the Summer Line'))
