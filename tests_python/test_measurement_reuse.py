"""Reuse native measurements without skipping either wrap or mixing faces."""
import copy
import unittest
from unittest import mock

from engine import text_fit as tf


def element(name, content="aa aa", size=6, weight="regular", y=0):
    return dict(id=name, type="text", x=0, y=y, width=100, height=20,
                content=content, font_family="Solstice Sans", font_weight=weight,
                font_size=size, color="rgba(0,0,0,1)")


class MeasurementReuse(unittest.TestCase):
    def fit(self, elements, tw=100, th=100):
        source = dict(canvas=dict(width=200, height=200), elements=elements)
        before = copy.deepcopy(source)
        out = copy.deepcopy(source)
        out["canvas"] = dict(width=tw, height=th)
        for e in out["elements"]:
            e["font_size"] = 1
        expected = copy.deepcopy(out)
        calls = []

        class Font:
            def __init__(self, path, size):
                self.path, self.size = path, size

            def getlength(self, char):
                calls.append((self.path, self.size, char))
                return 2.0 if "Bold" in self.path else 1.0

        with mock.patch.object(tf, "_fonts_dir", return_value="/metrics"), \
                mock.patch.object(tf, "_font", side_effect=Font), \
                mock.patch.object(tf, "_renderer_widths", side_effect=lambda path, size, content:
                                  [2.0 if "Bold" in path else 1.0] * len(content)):
            ok = tf._texts(source, out, tw, th)
        self.assertEqual(source, before)
        return ok, out, expected, calls

    def test_returned_width_recount_does_not_repeat_native_advances(self):
        ok, out, expected, calls = self.fit([element("text")])
        expected["elements"][0].update(x=0.0, y=0.0, width=7.0, height=6 * 1.2, font_size=6.0)
        self.assertTrue(ok)
        self.assertEqual(out, expected)
        self.assertEqual(len(calls), 2, "two distinct characters should be measured once, not twice")

    def test_wrapped_result_still_uses_returned_width(self):
        ok, out, expected, calls = self.fit([element("text")], tw=6, th=20)
        expected["elements"][0].update(x=0.0, y=0.0, width=4.0, height=2 * 6 * 1.2, font_size=6.0)
        self.assertTrue(ok)
        self.assertEqual(out, expected)
        self.assertEqual(len(calls), 2)

    def test_faces_sizes_and_later_calls_are_isolated(self):
        elements = [element("regular"), element("bold", size=9, weight="bold", y=40)]
        for _ in range(2):
            ok, out, expected, calls = self.fit(elements)
            expected["elements"][0].update(x=0.0, y=0.0, width=7.0, height=6 * 1.2, font_size=6.0)
            expected["elements"][1].update(x=9.0, y=0.0, width=12.0, height=9 * 1.2, font_size=9.0)
            self.assertTrue(ok)
            self.assertEqual(out, expected)
            self.assertEqual(len(calls), 4)
            self.assertEqual({(p.rsplit("/",1)[-1], size) for p,size,_ in calls},
                             {("SolsticeSans-Regular.ttf", 6), ("SolsticeSans-Bold.ttf", 9)})

    def test_empty_text_keeps_existing_line_box_without_native_calls(self):
        ok, out, expected, calls = self.fit([element("empty", content="")])
        expected["elements"][0].update(x=0.0, y=0.0, width=1.0, height=6 * 1.2, font_size=6.0)
        self.assertTrue(ok)
        self.assertEqual(out, expected)
        self.assertEqual(calls, [])


if __name__ == "__main__":
    unittest.main()
