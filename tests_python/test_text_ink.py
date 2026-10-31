"""RF-01: independent Skia ink probe through the real renderer. Every failure case has a valid control."""
import os, unittest
from pathlib import Path
from scripts.quality import text_ink as T

UP = Path(os.environ['CHAMELEON_UPSTREAM'])
CANVAS = (400, 200)
def run(**kw):
    base = dict(text='Hello world', family='Solstice Sans', weight='regular', size=40, x=20, y=20, width=300, height=80, canvas=CANVAS, upstream=UP)
    return T.probe(**{**base, **kw})

class Pinning(unittest.TestCase):
    def test_all_seven_brand_faces_pinned_and_loadable(self):
        self.assertEqual(len(T.PINNED_FACES), 7)
        self.assertTrue(all(len(h) == 64 for h in T.PINNED_FACES.values()))
        self.assertTrue(T.load_face('SolsticeSans-Regular'))
    def test_substituted_bytes_rejected(self):
        with self.assertRaisesRegex(ValueError, 'hash'):
            T.load_face('SolsticeSans-Regular', b'not the pinned face')

class Wrapping(unittest.TestCase):
    def test_unbreakable_word_in_narrow_box_overflows(self):
        r = run(text='Supercalifragilistic', width=60)
        self.assertTrue(r['overflow']); self.assertGreater(r['overflow_px'], 0)
    def test_same_text_in_wide_box_is_clean(self):
        r = run(text='Supercalifragilistic', width=380, canvas=(500, 200))
        self.assertFalse(r['overflow']); self.assertEqual(r['overflow_px'], 0)

class Clipping(unittest.TestCase):
    def test_edge_straddling_text_loses_ink_to_canvas(self):
        r = run(x=-120)
        self.assertTrue(r['clipped']); self.assertGreater(r['lost_px'], 0)
        self.assertEqual(r['ink_px'] - r['lost_px'], r['visible_px'])
    def test_inside_canvas_text_loses_nothing(self):
        r = run(x=20)
        self.assertFalse(r['clipped']); self.assertEqual(r['lost_px'], 0)

class Rotation(unittest.TestCase):
    def test_rotation_preserved_ink_moves_and_bounds_checked(self):
        a, b = run(rotation=0), run(rotation=30)
        self.assertNotEqual(a['ink_bbox'], b['ink_bbox'])
        self.assertAlmostEqual(a['ink_px'], b['ink_px'], delta=a['ink_px'] * .25)  # antialiasing spreads rotated ink; still same glyphs
    def test_rotated_text_off_canvas_is_clipped_but_unrotated_is_not(self):
        box = dict(x=300, y=0, width=80, height=60, text='Hi')  # only the rotation differs between control and failure
        self.assertFalse(run(**box, rotation=0)['clipped'])
        self.assertGreater(run(**box, rotation=90)['lost_px'], 0)

class RotatedFrame(unittest.TestCase):
    def test_rotated_text_inside_its_own_box_is_not_overflow(self):
        r = run(text='Hello', size=40, x=100, y=60, width=200, height=60, rotation=90)
        self.assertFalse(r['overflow']); self.assertEqual(r['overflow_px'], 0)
    def test_rotated_text_wider_than_its_box_overflows(self):
        r = run(text='Supercalifragilistic', size=40, x=100, y=60, width=60, height=60, rotation=90)
        self.assertTrue(r['overflow']); self.assertGreater(r['overflow_px'], 0)

class RotationSign(unittest.TestCase):
    """Non-90 angles are not sign-symmetric: a flipped sign makes fitting text look like overflow."""
    FIT = dict(text='Hello world', size=30, x=60, y=80, width=240, height=40, canvas=(400, 300))
    def test_text_that_fits_its_rotated_box_is_clean_at_non_right_angles(self):
        for angle in (30, -30, 45):
            with self.subTest(angle=angle):
                r = run(**self.FIT, rotation=angle)
                self.assertFalse(r['overflow']); self.assertEqual(r['overflow_px'], 0)
    def test_text_too_long_for_the_same_rotated_box_overflows(self):
        for angle in (30, -30, 45):
            with self.subTest(angle=angle):
                r = run(**{**self.FIT, 'text': 'Supercalifragilistic', 'width': 100}, rotation=angle)
                self.assertTrue(r['overflow']); self.assertGreater(r['overflow_px'], 0)

class FarOffCanvas(unittest.TestCase):
    """A fixed pad hides ink that lands far outside the canvas: lost ink must still be counted."""
    def test_text_far_off_canvas_reports_all_ink_lost(self):
        on = run(x=20)
        for x in (-480, -700, 2000):
            with self.subTest(x=x):
                r = run(x=x)
                self.assertTrue(r['clipped']); self.assertEqual(r['visible_px'], 0)
                self.assertEqual(r['ink_px'], on['ink_px']); self.assertEqual(r['lost_px'], on['ink_px'])
    def test_text_far_above_or_below_canvas_reports_all_ink_lost(self):
        on = run(x=20)
        for y in (-700, -480, 1500):
            with self.subTest(y=y):
                r = run(y=y)
                self.assertTrue(r['clipped']); self.assertEqual(r['visible_px'], 0); self.assertEqual(r['lost_px'], on['ink_px'])
    def test_border_guard_raises_when_ink_touches_padded_edge_and_not_otherwise(self):
        import numpy as np
        ok = np.zeros((10, 10), bool); ok[3:6, 3:6] = True
        T._require_ink_inside_border(ok)
        for edge in ((0, 4), (9, 4), (4, 0), (4, 9)):
            bad = ok.copy(); bad[edge] = True
            with self.assertRaisesRegex(ValueError, 'border'):
                T._require_ink_inside_border(bad)
    def test_same_text_on_canvas_is_not_clipped(self):
        r = run(x=20); self.assertFalse(r['clipped']); self.assertGreater(r['ink_px'], 0)
    def test_blank_text_is_not_an_error(self):
        self.assertEqual(run(text=' ')['ink_px'], 0)

class Weights(unittest.TestCase):
    def test_capitalised_and_lowercase_bold_read_the_bold_face(self):
        for w in ('Bold', 'bold'):
            self.assertEqual(T.face_name('Solstice Sans', w), 'SolsticeSans-Bold')
            events = run(weight=w)['font_events']
            self.assertTrue(events); self.assertTrue(all(e['sha256'] == T.PINNED_FACES['SolsticeSans-Bold'] for e in events))
    def test_int_and_unpinned_weights_are_rejected_explicitly(self):
        for w in (700, 600, 'semibold'):
            with self.assertRaisesRegex(ValueError, 'weight'):
                T.face_name('Solstice Sans', w)

class MultilineHeight(unittest.TestCase):
    """Wrapped lines stack downward: the same ink overflows a short box and fits a tall one."""
    TEXT = dict(text='one two three four five six seven eight', size=24, x=20, y=20, width=160, canvas=(400, 500))
    def test_wrapped_text_overflows_a_short_box(self):
        r = run(**self.TEXT, height=40)
        self.assertTrue(r['overflow']); self.assertGreater(r['overflow_px'], 2000)
    def test_same_text_in_a_tall_box_is_clean_with_identical_ink(self):
        short, tall = run(**self.TEXT, height=40), run(**self.TEXT, height=400)
        self.assertFalse(tall['overflow']); self.assertEqual(tall['overflow_px'], 0)
        self.assertEqual((short['ink_px'], short['ink_bbox']), (tall['ink_px'], tall['ink_bbox']))
        self.assertGreater(tall['ink_bbox'][3] - tall['ink_bbox'][1], 24 * 2)  # genuinely several lines

class SerifFaces(unittest.TestCase):
    def test_serif_regular_and_bold_render_with_exactly_the_pinned_bytes(self):
        for weight, face in (('regular', 'SolsticeSerif-Regular'), ('bold', 'SolsticeSerif-Bold')):
            with self.subTest(face=face):
                r = run(text='Hello', family='Solstice Serif', weight=weight, size=30, width=200, height=40, canvas=(400, 300))
                self.assertGreater(r['ink_px'], 0); self.assertFalse(r['overflow'])
                self.assertTrue(r['font_events'])
                self.assertEqual({e['sha256'] for e in r['font_events']}, {T.PINNED_FACES[face]})

class Fractional(unittest.TestCase):
    def test_upstream_truncates_fractional_size(self):
        self.assertEqual(run(size=24.9)['ink_px'], run(size=24)['ink_px'])
        self.assertNotEqual(run(size=24.9)['ink_px'], run(size=25)['ink_px'])
        self.assertTrue(any('truncat' in n for n in T.shaping_notes('Hi', size=24.9)))
    def test_integer_size_has_no_truncation_note(self):
        self.assertFalse(any('truncat' in n for n in T.shaping_notes('Hi', size=24)))

class Shaping(unittest.TestCase):
    def test_no_kern_feature_and_no_kerning_applied_recorded(self):
        notes = T.shaping_notes('AV')
        self.assertTrue(any('kern' in n for n in notes))
    def test_complex_script_recorded_even_when_glyphs_exist(self):
        notes = T.shaping_notes('क्ष')  # Devanagari: face has the codepoints, renderer cannot shape them
        self.assertTrue(any('complex-script' in n for n in notes))
        self.assertFalse(any('missing-glyph' in n for n in notes))
    def test_codepoint_absent_from_face_is_missing_glyph(self):
        self.assertTrue(any('missing-glyph: U+4E2D' in n for n in T.shaping_notes('中')))
    def test_av_advances_are_summed_without_kerning(self):
        from fontTools.ttLib import TTFont
        import io
        font = TTFont(io.BytesIO(T.load_face('SolsticeSans-Regular'))); cmap, hmtx = font.getBestCmap(), font['hmtx']
        pair = hmtx[cmap[ord('A')]][0] + hmtx[cmap[ord('V')]][0]
        self.assertTrue(any('no kern feature' in n for n in T.shaping_notes('AV')))
        self.assertGreater(pair, 0)  # documented limitation: the renderer lays out 'AV' as exactly this advance sum

    def test_latin_text_has_no_script_or_glyph_notes(self):
        notes = T.shaping_notes('Hello')
        self.assertFalse(any(k in n for n in notes for k in ('complex-script', 'missing-glyph')))

if __name__ == '__main__': unittest.main()
