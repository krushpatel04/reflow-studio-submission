"""Exact font resources are loaded once per resize, never reused across tasks."""
import builtins
import copy
from contextlib import nullcontext
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from engine.resize import resize
from engine import text_fit as tf
from tests_python.test_campaign_robustness import source


class RendererFaceReuse(unittest.TestCase):
    def test_full_outputs_equal_uncached_measurements_across_repeated_sizes(self):
        task = source()
        targets = [(728,90), (300,250), (250,300), (600,500), (320,250), (20,20)]
        with patch.object(tf, 'renderer_resources', nullcontext):
            expected = [resize(task, dict(width=w,height=h)) for w,h in targets]
        for _ in range(2):
            for (w,h), out in zip(targets, expected):
                with self.subTest(target=(w,h)):
                    self.assertEqual(resize(task, dict(width=w,height=h)), out)

    def test_repeated_exact_glyph_query_reuses_result_without_mixing_size_or_copy(self):
        path = str(Path(os.environ['CHAMELEON_UPSTREAM'])/'brand_kit/fonts/SolsticeSans-Regular.ttf')
        queries = [(13.25, 'Hello world'), (13.5, 'Hello world'), (13.25, 'Hello')]
        expected = [tf._renderer_widths(path, size, text) for size, text in queries]
        with patch.object(tf, '_renderer_data', wraps=tf._renderer_data) as reads:
            with tf.renderer_resources():
                for _ in range(2):
                    for (size, text), widths in zip(queries, expected):
                        actual = tf._renderer_widths(path, size, text)
                        self.assertEqual(actual, widths)
                        actual.clear()  # callers cannot mutate retained metrics
            self.assertEqual(reads.call_count, len(queries), 'duplicate native glyph query')

    def measured(self, s, target):
        reads = []
        original = builtins.open
        def opened(path, *args, **kwargs):
            if str(path).endswith('.ttf'):
                reads.append(str(path))
            return original(path, *args, **kwargs)
        before = copy.deepcopy(s)
        with patch('builtins.open', side_effect=opened):
            result = resize(s, target)
        self.assertEqual(s, before)
        return result, reads

    def test_campaign_reads_each_exact_face_once_per_resize(self):
        for w,h in [(300,250),(728,90),(250,300)]:
            with self.subTest(target=(w,h)):
                out, reads = self.measured(source(), dict(width=w,height=h))
                self.assertTrue(reads, 'positive control: actual fonts must be read')
                self.assertEqual(len(reads), len(set(reads)), 'repeated font decoding inside one resize')
                self.assertEqual([e['content'] for e in out['elements'] if e['type']=='text'],
                                 [e['content'] for e in source()['elements'] if e['type']=='text'])

    def test_later_resize_reads_fonts_again_and_preserves_output(self):
        a, first = self.measured(source(),dict(width=300,height=250))
        b, second = self.measured(source(),dict(width=300,height=250))
        self.assertEqual(a,b)
        self.assertTrue(first)
        self.assertEqual(set(first),set(second))

    def test_missing_resource_after_success_is_not_hidden_by_retention(self):
        resize(source(),dict(width=300,height=250))
        original = builtins.open
        def missing(path,*args,**kwargs):
            if str(path).endswith('.ttf'): raise FileNotFoundError('removed font')
            return original(path,*args,**kwargs)
        with patch('builtins.open',side_effect=missing):
            with self.assertRaises(FileNotFoundError): resize(source(),dict(width=300,height=250))
        self.assertEqual(resize(source(),dict(width=300,height=250))['canvas'],dict(width=300,height=250))

    def test_direct_measurements_do_not_keep_stale_font_bytes(self):
        kit = Path(os.environ['CHAMELEON_UPSTREAM'])/'brand_kit/fonts'
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'face.ttf'
            path.write_bytes((kit/'SolsticeSans-Regular.ttf').read_bytes())
            regular = tf._renderer_widths(str(path),13.25,'Hello world')
            path.write_bytes((kit/'SolsticeSans-Bold.ttf').read_bytes())
            bold = tf._renderer_widths(str(path),13.25,'Hello world')
            self.assertNotEqual(regular,bold)
            path.write_bytes(b'corrupt')
            with self.assertRaises(ValueError): tf._renderer_widths(str(path),13.25,'Hello world')

class RendererResourceBoundaries(unittest.TestCase):
    def test_byte_budget_and_file_count_bypass_without_changing_bytes(self):
        with tempfile.TemporaryDirectory() as tmp, tf.renderer_resources():
            for i in range(10):
                p=Path(tmp)/str(i); data=bytes([i])*300_000; p.write_bytes(data)
                self.assertEqual(tf._renderer_data(str(p)),data)
            cache=tf._RENDERER_BYTES.get()
            self.assertLessEqual(len(cache),8)
            self.assertLessEqual(sum(map(len,cache.values())),2*1024*1024)
            p=Path(tmp)/'large'; p.write_bytes(b'x'*(2*1024*1024+1))
            self.assertEqual(len(tf._renderer_data(str(p))),2*1024*1024+1)
            self.assertNotIn(str(p),cache)
        self.assertIsNone(tf._RENDERER_BYTES.get())
        self.assertIsNone(tf._RENDERER_WIDTHS.get())

    def test_width_budget_and_nested_failure_restore_outer_context(self):
        path=str(Path(os.environ['CHAMELEON_UPSTREAM'])/'brand_kit/fonts/SolsticeSans-Regular.ttf')
        with tf.renderer_resources():
            for i in range(140): tf._renderer_widths(path,12,f'text {i}')
            outer=tf._RENDERER_WIDTHS.get()
            self.assertEqual(len(outer),128)
            with self.assertRaises(RuntimeError):
                with tf.renderer_resources():
                    tf._renderer_widths(path,12,'a'*33000)
                    self.assertEqual(len(tf._RENDERER_WIDTHS.get()),0)
                    raise RuntimeError('interrupted')
            self.assertIs(tf._RENDERER_WIDTHS.get(),outer)
        self.assertIsNone(tf._RENDERER_WIDTHS.get())
        self.assertIsNone(tf._RENDERER_BYTES.get())
