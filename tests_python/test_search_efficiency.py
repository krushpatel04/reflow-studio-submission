"""Search must preserve complete layouts while avoiding identical failed trials."""
import copy
import unittest
from contextlib import ExitStack
from unittest import mock

from engine import text_fit as tf


def text(name, size, y=0, content="xx"):
    return {"id": name, "type": "text", "x": 0, "y": y,
            "width": 100, "height": 20, "content": content,
            "font_family": "Solstice Sans", "font_size": size,
            "color": "rgba(0,0,0,1)"}


class SearchEfficiency(unittest.TestCase):
    def run_search(self, elements, tw, th, *, constant=False, steps=None, image=False):
        source = {"canvas": {"width": 400, "height": 400}, "elements": elements}
        before = copy.deepcopy(source)
        out = copy.deepcopy(source)
        out["canvas"] = {"width": tw, "height": th}
        for e in out["elements"]:
            if e["type"] == "text":
                e["font_size"] = 1
            elif image:
                e.update(x=0, y=0, width=tw, height=th)
        initial = copy.deepcopy(out)

        class Font:
            def __init__(self, size):
                self.size = size

            def getlength(self, char):
                return 1.0 if constant else self.size

        with ExitStack() as stack:
            stack.enter_context(mock.patch.object(tf, "_fonts_dir", return_value="/metrics"))
            stack.enter_context(mock.patch.object(tf, "_font", side_effect=lambda path, size: Font(size)))
            stack.enter_context(mock.patch.object(tf, "_renderer_widths", side_effect=
                               lambda path, size, content: [1.0 if constant else size] * len(content)))
            pack = stack.enter_context(mock.patch.object(tf, "_pack", wraps=tf._pack))
            if steps is not None:
                stack.enter_context(mock.patch.object(tf, "MAX_STEPS", steps))
            accepted = tf._texts(source, out, tw, th)
        self.assertEqual(source, before, "search mutated its source")
        return accepted, out, initial, pack.call_args_list

    def test_exact_floor_candidate_is_tried_and_accepted(self):
        ok, out, expected, calls = self.run_search([text("copy", 12)], 14, 7.2)
        expected["elements"][0].update(x=0.0, y=0.0, width=14.0, height=6 * 1.2, font_size=6.0)
        self.assertTrue(ok)
        self.assertEqual(out, expected)
        self.assertEqual(len(calls), 8)

    def test_impossible_fit_preserves_output_without_repeating_floor(self):
        ok, out, initial, calls = self.run_search([text("copy", 12)], 1, 1)
        self.assertFalse(ok)
        self.assertEqual(out, initial)
        # 12,10.8,...,6: eight distinct vectors for each of two wrap caps.
        self.assertEqual(len(calls), 16)

    def test_equal_obstacle_policies_run_once_even_before_floor(self):
        ok, out, initial, calls = self.run_search([text("copy", 12)], 1, 1, steps=0)
        self.assertFalse(ok)
        self.assertEqual(out, initial)
        self.assertEqual(len(calls), 2, "same obstacle policy repeated for each cap")

    def test_equal_policies_with_existing_source_overlap_are_not_retried(self):
        image = {"id": "art", "type": "image", "x": 0, "y": 0,
                 "width": 50, "height": 50, "asset_id": "retained.png"}
        ok, out, initial, calls = self.run_search([text("copy", 12), image], 1, 1,
                                                steps=0, image=True)
        self.assertFalse(ok)
        self.assertEqual(out, initial)
        self.assertTrue(all(call.args[4] == [{0}] for call in calls))
        self.assertEqual(len(calls), 2)

    def test_mixed_sizes_continue_after_first_text_reaches_floor(self):
        ok, out, expected, calls = self.run_search([text("small", 6), text("large", 12, 40)], 14, 16.4)
        for e, y in zip(expected["elements"], [0.0, 9.2]):
            e.update(x=0.0, y=y, width=14.0, height=6 * 1.2, font_size=6.0)
        self.assertTrue(ok)
        self.assertEqual(out, expected)
        self.assertEqual(len(calls), 8)

    def test_floor_failure_does_not_skip_later_wrap_cap(self):
        # First cap permits a 147px line whose padded box is too wide. The
        # tightened cap wraps it; the 144px sibling must remain a single line.
        a = "x" * 73 + " " + "x" * 73
        b = "x" * 71 + " " + "x" * 72
        ok, out, expected, calls = self.run_search(
            [text("a", 6, content=a), text("b", 6, 100, b)], 150, 400, constant=True)
        expected["elements"][0].update(x=0.0, y=0.0, width=76.0, height=2 * 6 * 1.2, font_size=6.0)
        expected["elements"][1].update(x=0.0, y=16.4, width=148.0, height=6 * 1.2, font_size=6.0)
        self.assertTrue(ok)
        self.assertEqual(out, expected)
        self.assertEqual(len(calls), 2)

    def test_distinct_image_ignore_policy_remains_available(self):
        image = {"id": "art", "type": "image", "x": 200, "y": 200,
                 "width": 50, "height": 50, "asset_id": "retained.png"}
        ok, out, expected, calls = self.run_search([text("copy", 6), image], 20, 20, image=True)
        expected["elements"][0].update(x=0.0, y=0.0, width=14.0, height=6 * 1.2, font_size=6.0)
        self.assertTrue(ok)
        self.assertEqual(out, expected)
        self.assertEqual(calls[0].args[4], [set()])
        self.assertEqual(calls[-1].args[4], [{0}])
        self.assertEqual(len(calls), 2)


if __name__ == "__main__":
    unittest.main()
