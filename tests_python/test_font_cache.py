"""Finite native-font retention with unchanged reload metrics and face isolation."""
import hashlib
import os
from pathlib import Path
import unittest

from engine import text_fit as tf


class FontCache(unittest.TestCase):
    def setUp(self):
        root = Path(os.environ.get("CHAMELEON_UPSTREAM", ".cache/chameleon"))
        self.regular = str((root / "brand_kit/fonts/SolsticeSans-Regular.ttf").resolve())
        self.bold = str((root / "brand_kit/fonts/SolsticeSans-Bold.ttf").resolve())
        self.assertTrue(Path(self.regular).is_file(), "pinned test font required")
        self.assertTrue(Path(self.bold).is_file(), "pinned test font required")
        tf._font.cache_clear()
        self.addCleanup(tf._font.cache_clear)

    def test_varied_sizes_have_a_finite_retention_limit(self):
        for index in range(145):
            tf._font(self.regular, 14 + index / 32)
        self.assertLessEqual(tf._font.cache_info().currsize, 128)

    def test_recent_fonts_reuse_and_faces_sizes_stay_distinct(self):
        regular = tf._font(self.regular, 20)
        bold = tf._font(self.bold, 20)
        larger = tf._font(self.regular, 21)
        self.assertIs(tf._font(self.regular, 20), regular)
        self.assertIs(tf._font(self.bold, 20), bold)
        self.assertIsNot(regular, bold)
        self.assertIsNot(regular, larger)
        self.assertNotEqual(regular.getlength("Readable copy"), bold.getlength("Readable copy"))
        self.assertEqual(tf._font.cache_info().currsize, 3)

    def test_evicted_font_reloads_with_identical_metrics(self):
        original = tf._font(self.regular, 14)
        text = "Café e\u0301 Ω中 🙂\nhello  world"
        expected = [(original.getlength(char), original.getbbox(char)) for char in text]
        for index in range(129):
            tf._font(self.bold if index % 2 else self.regular, 20 + index / 32)
        reloaded = tf._font(self.regular, 14)
        self.assertIsNot(reloaded, original, "oldest font must be evicted from the bounded cache")
        self.assertEqual([(reloaded.getlength(char), reloaded.getbbox(char)) for char in text], expected)
        self.assertEqual([(original.getlength(char), original.getbbox(char)) for char in text], expected,
                         "eviction must not invalidate an active font object")

    def test_exact_face_context_clears_entry_and_exit(self):
        tf._font(self.regular, 20)
        record = dict(family="Solstice Sans", weight=400, style="normal", path=self.regular,
                      ttf_sha256=hashlib.sha256(Path(self.regular).read_bytes()).hexdigest())
        with tf.faces([record]):
            self.assertEqual(tf._font.cache_info().currsize, 0)
            self.assertEqual(tf._resolve(dict(font_family="Solstice Sans", font_weight="regular")), self.regular)
            tf._font(self.regular, 20)
            self.assertEqual(tf._font.cache_info().currsize, 1)
        self.assertEqual(tf._font.cache_info().currsize, 0)


if __name__ == "__main__":
    unittest.main()
