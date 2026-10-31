"""Source variations must not silently destroy campaign readability."""
import copy
import json
import os
from pathlib import Path
import unittest
from unittest.mock import patch

from engine.resize import resize
from engine.text_fit import aabb
from scripts.quality.text_ink import probe


def source():
    return json.loads((Path(os.environ['CHAMELEON_UPSTREAM']) / 'input/chameleon_sample_level3_advanced.json').read_text())['source']


def by(doc):
    return {e['id']: e for e in doc['elements']}


def overlaps(a, b):
    aa, bb = aabb(a), aabb(b)
    return aa[0] < bb[2] - 1e-6 and bb[0] < aa[2] - 1e-6 and aa[1] < bb[3] - 1e-6 and bb[1] < aa[3] - 1e-6


@unittest.skipUnless(os.environ.get('CHAMELEON_UPSTREAM'), 'set pinned CHAMELEON_UPSTREAM')
class CampaignRobustness(unittest.TestCase):
    def checked(self, s, w=728, h=90):
        before = copy.deepcopy(s)
        o = resize(s, dict(width=w, height=h))
        self.assertEqual(s, before)
        self.assertEqual(o['canvas'], dict(width=w, height=h))
        self.assertEqual([e['id'] for e in s['elements']], [e['id'] for e in o['elements']])
        mutable = {'x', 'y', 'width', 'height', 'font_size', 'letter_spacing', 'corner_radius', 'stroke_width'}
        for a, b in zip(s['elements'], o['elements']):
            self.assertEqual({k: v for k, v in a.items() if k not in mutable}, {k: v for k, v in b.items() if k not in mutable})
            x0, y0, x1, y1 = aabb(b)
            self.assertTrue(x0 >= -1e-6 and y0 >= -1e-6 and x1 <= w + 1e-6 and y1 <= h + 1e-6, b['id'])
        return o

    def readable(self, o):
        for e in o['elements']:
            if e['type'] != 'text':
                continue
            self.assertGreaterEqual(e['font_size'], 9, e['id'])

    def clear(self, o):
        fg = [e for e in o['elements'] if e['id'] != 'bg']
        for i, a in enumerate(fg):
            for b in fg[i+1:]:
                if a.get('group_id') and a.get('group_id') == b.get('group_id'):
                    continue
                self.assertFalse(overlaps(a, b), (a['id'], b['id']))

    def test_singleton_text_retains_group_without_losing_readability(self):
        for name in ['legal_text', 'headline', 'subhead']:
            s = source(); by(s)[name]['group_id'] = 'one-element'
            for w, h in [(728,90), (730,92), (160,600)]:
                with self.subTest(name=name, target=(w,h)):
                    o = self.checked(s,w,h)
                    self.readable(o); self.clear(o)
                    self.assertEqual(by(o)[name]['group_id'], 'one-element')

    def test_nonoverlapping_extra_shape_is_preserved_without_smaller_copy(self):
        for rotation in [0, 30]:
            s = source()
            s['elements'].append(dict(id='dot', type='shape', x=20, y=20, width=5, height=5, shape_type='ellipse', fill_color='rgba(255,255,255,0.1)', rotation=rotation, z_index=1))
            o = self.checked(s)
            self.readable(o); self.clear(o)
            self.assertGreater(by(o)['dot']['width'], 0)

    def test_real_group_is_not_flattened(self):
        s = source(); by(s)['legal_text']['group_id'] = 'genuine'; by(s)['subhead']['group_id'] = 'genuine'
        with patch('engine.composition._campaign', return_value=False):
            baseline = resize(s, dict(width=728,height=90))
        self.assertEqual(resize(s, dict(width=728,height=90)), baseline)

    def test_important_occluding_shape_keeps_conservative_fallback(self):
        s = source()
        s['elements'].append(dict(id='large', type='shape', x=0,y=0,width=1080,height=1350,shape_type='ellipse',fill_color='rgba(255,0,0,1)',z_index=9))
        with patch('engine.composition._campaign', return_value=False):
            baseline = resize(s, dict(width=728,height=90))
        o = resize(s, dict(width=728,height=90))
        self.assertEqual(o, baseline)
        self.assertEqual(by(o)['large']['fill_color'],'rgba(255,0,0,1)')

    def test_plain_supported_campaign_is_still_readable(self):
        self.readable(self.checked(source()))

    def test_anonymous_ids_and_reversed_elements_do_not_choose_layout(self):
        s = source(); by(s)['legal_text']['group_id'] = 'one-element'
        original = self.checked(s)
        names = {}
        for n, e in enumerate(s['elements']):
            names[e['id']] = f'element-{n}'
            e['id'] = names[e['id']]
        s['elements'].reverse()
        changed = self.checked(s)
        self.readable(changed)
        for e in original['elements']:
            self.assertEqual({**e, 'id': names[e['id']]}, by(changed)[names[e['id']]])

    def test_singleton_unsupported_typography_retains_fallback(self):
        for extra in [dict(letter_spacing=1), dict(rotation=20),
                      dict(style_runs=[dict(start=0,end=5,font_weight='bold')])]:
            with self.subTest(extra=extra):
                s = source(); by(s)['legal_text'].update(group_id='one-element', **extra)
                with patch('engine.composition._campaign', return_value=False):
                    baseline = resize(s, dict(width=728,height=90))
                self.assertEqual(resize(s, dict(width=728,height=90)), baseline)

    def test_singleton_real_ink_stays_inside_its_box_and_canvas(self):
        s = source(); by(s)['legal_text']['group_id'] = 'one-element'
        o = self.checked(s); self.readable(o)
        for name in ['legal_text', 'headline']:
            e = by(o)[name]
            ink = probe(e['content'], e['font_family'], e.get('font_weight', 'regular'),
                        e['font_size'], e['x'], e['y'], e['width'], e['height'],
                        (728,90), Path(os.environ['CHAMELEON_UPSTREAM']), e.get('rotation',0))
            self.assertGreater(ink['ink_px'], 0)
            self.assertEqual((ink['lost_px'], ink['overflow_px']), (0,0))

    def test_portraits_keep_existing_supporting_copy_size(self):
        for w,h,floor in [(160,600,10),(300,900,18)]:
            o = self.checked(source(),w,h)
            self.assertGreaterEqual(min(e['font_size'] for e in o['elements'] if e['type']=='text'), floor)

    def test_larger_banner_keeps_headline_emphasis_and_readable_support(self):
        for w,h in [(970,250), (971,251), (1600,400)]:
            s = source(); o = self.checked(s,w,h); self.readable(o); self.clear(o)
            self.assertGreater(by(o)['headline']['font_size'], by(o)['subhead']['font_size'])
            self.assertGreater(by(o)['subhead']['font_size'], by(o)['legal_text']['font_size'])

if __name__ == '__main__':
    unittest.main()
