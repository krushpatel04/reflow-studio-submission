"""Medium campaign changes require readable text and conservative fallbacks."""
import copy
import os
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

from engine.resize import resize
from scripts.quality.text_ink import probe, _render
from tests_python.test_campaign_robustness import source, by
from tests_python import test_campaign_robustness as checks
from tests_python.test_text_fit import overflow


class MediumCampaign(unittest.TestCase):
    def fallback(self, s, w, h):
        with patch('engine.composition._campaign', return_value=False):
            return resize(s, dict(width=w, height=h))

    def checked(self, s, w, h):
        baseline = self.fallback(s, w, h)
        out = checks.CampaignRobustness.checked(self, s, w, h)
        checks.CampaignRobustness.clear(self, out)
        for e in out['elements']:
            if e['type'] == 'text':
                self.assertGreaterEqual(e['font_size'], 9, e['id'])
                self.assertGreaterEqual(e['font_size'], by(baseline)[e['id']]['font_size'], e['id'])
        self.assertGreaterEqual(by(out)['product']['width'], by(baseline)['product']['width'])
        self.assertAlmostEqual(by(out)['product']['width']/by(out)['product']['height'],1)
        # Source-footer art stays after the product and never covers legal copy.
        self.assertGreater(by(out)['holiday_watermark']['y'],by(out)['product']['y']+by(out)['product']['height'])
        return out

    def test_medium_copy_and_labels_improve_without_smaller_headline(self):
        for w, h in [(300,250), (301,251), (320,250), (250,300), (600,500)]:
            with self.subTest(target=(w,h)):
                self.checked(source(), w, h)

    def test_all_medium_text_fits_independent_basic_metrics(self):
        for w,h in [(300,250),(320,250),(250,300),(600,500)]:
            out = resize(source(),dict(width=w,height=h))
            for e in out['elements']:
                if e['type'] == 'text':
                    with self.subTest(target=(w,h),element=e['id']):
                        self.assertFalse(overflow(e), 'independent BASIC metric overflow')

    def test_healthy_medium_and_same_canvas_are_unchanged(self):
        for w, h in [(1080,1350), (1000,1250), (2160,2700)]:
            with self.subTest(target=(w,h)):
                s = source()
                self.assertEqual(resize(s,dict(width=w,height=h)), self.fallback(s,w,h))

    def test_same_canvas_preserves_authored_small_type(self):
        s = source(); by(s)['legal_text']['font_size'] = 8
        self.assertEqual(resize(s,dict(width=1080,height=1350)),self.fallback(s,1080,1350))

    def test_unsupported_and_occluded_campaigns_keep_fallback(self):
        for change in ['tracking','style-runs','text-rotation','real-group','occluding-shape','too-small']:
            with self.subTest(change=change):
                s = source(); w,h = (20,20) if change == 'too-small' else (300,250)
                if change == 'tracking': by(s)['subhead']['letter_spacing'] = 1
                if change == 'style-runs': by(s)['headline']['style_runs'] = [dict(start=0,end=5,font_weight='bold')]
                if change == 'text-rotation': by(s)['subhead']['rotation'] = 20
                if change == 'real-group':
                    by(s)['headline']['group_id'] = 'real'; by(s)['subhead']['group_id'] = 'real'
                if change == 'occluding-shape':
                    s['elements'].append(dict(id='large',type='shape',shape_type='ellipse',x=0,y=0,width=1080,height=1350,fill_color='rgba(255,0,0,1)',z_index=99))
                self.assertEqual(resize(s,dict(width=w,height=h)), self.fallback(s,w,h))

    def test_singleton_anonymous_reversed_source_keeps_same_geometry(self):
        s = source(); by(s)['legal_text']['group_id'] = 'one-element'
        original = self.checked(s,300,250)
        names = {e['id']: f'element-{n}' for n,e in enumerate(s['elements'])}
        for e in s['elements']: e['id'] = names[e['id']]
        s['elements'].reverse()
        changed = resize(s,dict(width=300,height=250))
        for e in original['elements']:
            self.assertEqual({**e,'id':names[e['id']]},by(changed)[names[e['id']]])

    def test_nonoverlapping_decoration_and_label_plates_are_preserved(self):
        s = source()
        s['elements'].append(dict(id='dot',type='shape',shape_type='ellipse',x=20,y=20,width=5,height=5,fill_color='rgba(255,255,255,0.1)',z_index=1))
        out = self.checked(s,300,250)
        for e in out['elements']:
            if e['type'] != 'text' or not e.get('group_id'): continue
            plate = next(p for p in out['elements'] if p['type']=='shape' and p.get('group_id')==e['group_id'])
            self.assertAlmostEqual(e['x']+e['width']/2,plate['x']+plate['width']/2)
            self.assertAlmostEqual(e['y']+e['height']/2,plate['y']+plate['height']/2)
            self.assertLessEqual(e['width'],plate['width'])
            self.assertLessEqual(e['height'],plate['height'])

    def test_medium_text_has_real_ink_without_clipping(self):
        out = self.checked(source(),300,250)
        for e in out['elements']:
            if e['type'] != 'text': continue
            with self.subTest(element=e['id']):
                if e['id'] == 'headline':
                    # The generic probe's character-count pad exceeds its 60M
                    # pixel safety cap on this long headline. Render the full
                    # unchanged copy with a bounded border instead; require all
                    # ink inside its own box and identical on the padded canvas.
                    import numpy as np
                    ink_element = {**e, 'color': 'rgba(0,0,0,1)'}
                    with tempfile.TemporaryDirectory() as tmp:
                        real, _ = _render(tmp,(300,250),ink_element,Path(os.environ['CHAMELEON_UPSTREAM']),e['font_family'],e.get('font_weight','regular'))
                        padded, _ = _render(tmp,(556,506),{**ink_element,'x':e['x']+128,'y':e['y']+128},Path(os.environ['CHAMELEON_UPSTREAM']),e['font_family'],e.get('font_weight','regular'))
                    self.assertGreater(int(real.sum()),0)
                    self.assertEqual(int(real.sum()),int(padded.sum()))
                    self.assertTrue(np.array_equal(real,padded[128:378,128:428]))
                    ys,xs = np.nonzero(real)
                    self.assertGreaterEqual(xs.min(), e['x']-1)
                    self.assertLess(xs.max(), e['x']+e['width']+1)
                    self.assertGreaterEqual(ys.min(), e['y']-1)
                    self.assertLess(ys.max(), e['y']+e['height']+1)
                    continue
                ink = probe(e['content'],e['font_family'],e.get('font_weight','regular'),e['font_size'],
                            e['x'],e['y'],e['width'],e['height'],(300,250),
                            Path(os.environ['CHAMELEON_UPSTREAM']),e.get('rotation',0))
                self.assertGreater(ink['ink_px'],0)
                self.assertEqual((ink['lost_px'],ink['overflow_px']),(0,0))


if __name__ == '__main__': unittest.main()
