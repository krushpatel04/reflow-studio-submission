"""Synthetic renderer fixture bytes must depend on face inputs, not wall clock."""
import unittest
from unittest.mock import patch

from tests_python.render_font_fixture import make_face


class FontFixtureDeterminism(unittest.TestCase):
    def test_identical_face_is_stable_across_clock_boundaries(self):
        with patch('time.time', return_value=1700000000):
            first = make_face('FitNarrow', 500)
        with patch('time.time', return_value=1800000000):
            later = make_face('FitNarrow', 500)
        self.assertEqual(first, later)

    def test_different_metrics_still_produce_different_bytes(self):
        with patch('time.time', return_value=1700000000):
            narrow = make_face('FitNarrow', 500)
            wide = make_face('FitNarrow', 800)
        self.assertNotEqual(narrow, wide)
