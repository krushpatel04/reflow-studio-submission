import unittest
from scripts.lica_official.render import measure


def rect(id='a', x=20, y=20, width=20, height=30, **extra):
    return dict(id=id,type='shape',shape_type='rectangle',x=x,y=y,width=width,height=height,**extra)

def design(elements,w=100,h=100):
    return {'canvas':{'width':w,'height':h},'elements':elements}

class MeasurementTests(unittest.TestCase):
    def test_enclosing_box_includes_gaps(self):
        d=design([rect('a',10,10,10,10),rect('b',80,80,10,10)])
        self.assertAlmostEqual(measure(d,d)['all_elements_fraction'],0.64)
    def test_box_clipped_to_canvas(self):
        d=design([rect(x=-50,y=25,width=100,height=50)])
        self.assertAlmostEqual(measure(d,d)['all_elements_fraction'],0.25)
    def test_rotated_square(self):
        d=design([rect(x=40,y=40,width=20,height=20,rotation=45)])
        self.assertAlmostEqual(measure(d,d)['all_elements_fraction'],0.08)
    def test_generated_background_excluded_from_foreground(self):
        d=design([rect('__lica_background__',0,0,100,100),rect()])
        r=measure(d,d); self.assertEqual(r['all_elements_fraction'],1)
        self.assertAlmostEqual(r['foreground_fraction'],0.06)
        self.assertEqual(r['excluded_background_ids'],['__lica_background__'])
    def test_source_cover_image_excluded_grouped_cover_retained(self):
        d=design([dict(rect('i',0,0,100,100),type='image',fit='cover'),
                  dict(rect('g',0,0,100,100),type='image',fit='cover',group_id='group')])
        r=measure(d,d); self.assertEqual(r['excluded_background_ids'],['i'])
        self.assertEqual(r['foreground_fraction'],1)
    def test_exclusion_selected_from_source_not_output(self):
        source=design([dict(rect('i'),type='image',fit='cover')])
        output=design([dict(rect('i',0,0,100,100),type='image',fit='cover')])
        r=measure(source,output); self.assertEqual(r['excluded_background_ids'],[])
        self.assertEqual(r['foreground_fraction'],1)
    def test_native_render_glyph_font_truncated_to_integer(self):
        d=design([dict(rect('t'),type='text',content='Otoño',font_size=3.75),
                  dict(rect('u'),type='text',content='Title',font_size=9.9)])
        r=measure(d,d); self.assertEqual(r['min_rendered_text_px'],3)
        self.assertEqual(r['min_requested_text_px'],3.75)
        self.assertEqual(r['min_rendered_text_ids'],['t'])
    def test_no_nonempty_text(self):
        d=design([dict(rect('t'),type='text',content='\n  ',font_size=1),rect()])
        r=measure(d,d); self.assertIsNone(r['min_rendered_text_px'])
        self.assertIsNone(r['min_requested_text_px'])

if __name__=='__main__': unittest.main()
