import copy
import unittest
from scripts.lica_official.render import compare_rules, off_canvas

def design(elements, width=100, height=100):
    return {'canvas': {'width': width, 'height': height}, 'elements': elements}

def box(id='a', **kw):
    return dict(id=id, type='shape', x=10, y=10, width=10, height=20, **kw)

class AuditTests(unittest.TestCase):
    def test_unchanged(self):
        d = design([box()]); self.assertTrue(all(not v for v in compare_rules(d, d).values()))
    def test_missing_duplicate_extra(self):
        a = design([box('a'), box('b')]); b = design([box('a'), box('a'), box('c')])
        r = compare_rules(a, b)
        self.assertEqual(r['missing_ids'], ['b']); self.assertEqual(r['duplicate_ids'], {'a': 2})
        self.assertEqual(r['extra_ids'], ['c'])
    def test_unicode_whitespace_font_asset(self):
        a = design([dict(box('t'), type='text', content='Otoño\n  invierno', font_family='Libre Baskerville'),
                    dict(box('i'), type='image', asset_id='own.png')]); b = copy.deepcopy(a)
        b['elements'][0].update(content='Otoño invierno', font_family='SolsticeSans')
        b['elements'][1]['asset_id'] = 'other.png'
        r = compare_rules(a, b)
        self.assertEqual([e['id'] for e in r['changed_text']], ['t'])
        self.assertEqual([e['id'] for e in r['changed_font_family']], ['t'])
        self.assertEqual([e['id'] for e in r['changed_image_asset']], ['i'])
    def test_geometry_changes_allowed(self):
        a = design([box()]); b = copy.deepcopy(a); b['elements'][0].update(x=90, width=9)
        self.assertTrue(all(not v for v in compare_rules(a, b).values()))
    def test_fully_outside_new_and_preexisting(self):
        a = design([dict(box('a'), x=10), dict(box('b'), x=110)])
        b = design([dict(box('a'), x=-10), dict(box('b'), x=110)])
        r = off_canvas(a, b)
        self.assertEqual([(e['id'], e['newly_pushed']) for e in r['fully_off_canvas']], [('a', True), ('b', False)])
    def test_partial_intersection_is_not_outside(self):
        a = design([dict(box(), x=-9)]); self.assertEqual(off_canvas(a, a)['fully_off_canvas'], [])
    def test_rotation_about_center(self):
        a = design([dict(box(), x=99, y=30, width=2, height=40, rotation=90)])
        self.assertEqual(off_canvas(a, a)['fully_off_canvas'], [])
    def test_zero_area_is_separate(self):
        a = design([dict(box(), width=0)])
        self.assertEqual(off_canvas(a, a)['fully_off_canvas'], [])
        self.assertEqual([e['id'] for e in off_canvas(a, a)['degenerate']], ['a'])

if __name__ == '__main__': unittest.main()
