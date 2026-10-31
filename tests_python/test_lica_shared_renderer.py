"""The shared font store must never substitute a different face."""
import os
from pathlib import Path
import tempfile
import unittest
from PIL import Image
from scripts.lica_official.resources import digest

ROOT=Path(__file__).resolve().parents[1]
UPSTREAM=Path(os.environ.get('CHAMELEON_UPSTREAM',ROOT.parent/'reflow-studio-spikes/chameleon-official'))

class SharedRendererControls(unittest.TestCase):
    def test_missing_exact_face_refuses_fallback(self):
        from scripts.lica_official.render import RealRenderer
        with tempfile.TemporaryDirectory() as temp:
            renderer=RealRenderer(Path(temp),UPSTREAM,[])
            with self.assertRaisesRegex(ValueError,'Exact font'):
                renderer.manager.lookup('Unknown','regular','regular')

    def test_shared_font_bytes_render_at_native_size(self):
        from scripts.lica_official.render import RealRenderer
        from tests_python.test_lica_official import text,layout
        from scripts.lica_official import convert_layout
        from fontTools.fontBuilder import FontBuilder
        from fontTools.pens.ttGlyphPen import TTGlyphPen
        import io
        # Synthetic face: the test needs no downloaded fonts or dependency cache.
        builder=FontBuilder(1000,isTTF=True)
        names=['.notdef','space','H','e','l','o'];builder.setupGlyphOrder(names)
        builder.setupCharacterMap({32:'space',72:'H',101:'e',108:'l',111:'o'})
        glyphs={}
        for name in names:
            pen=TTGlyphPen(None)
            if name!='space':
                pen.moveTo((50,0));pen.lineTo((450,0));pen.lineTo((450,700));pen.lineTo((50,700));pen.closePath()
            glyphs[name]=pen.glyph()
        builder.setupGlyf(glyphs);builder.setupHorizontalMetrics({n:(500,50) for n in names})
        builder.setupHorizontalHeader(ascent=800,descent=-200)
        builder.setupNameTable({'familyName':'Fixture','styleName':'Regular','uniqueFontIdentifier':'Fixture-Regular',
                               'fullName':'Fixture Regular','psName':'Fixture-Regular','version':'Version 1.0'})
        builder.setupOS2(sTypoAscender=800,sTypoDescender=-200,usWinAscent=800,usWinDescent=200)
        builder.setupPost();builder.setupMaxp();buffer=io.BytesIO();builder.save(buffer)
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);data=buffer.getvalue()
            record={'family':'Fixture','weight':400,'style':'normal','ttf_sha256':digest(data)}
            (root/digest(data)).write_bytes(data)
            renderer=RealRenderer(root,UPSTREAM,[record])
            raw=layout(text('title',fontFamily='Fixture',fontWeight=400,text='Hello'))
            source=convert_layout(raw,layout_id='synthetic',template_id='allowed',category='Posters',split='development',target_canvas={'width':100,'height':100})['task']['source']
            png=root/'render.png';audit=renderer.render(source,png)
            self.assertEqual(audit['real_renderer_calls'],1);self.assertEqual(audit['font_fallbacks'],[])
            self.assertTrue(audit['font_events']);self.assertTrue(all(e['sha256']==digest(data) for e in audit['font_events']))
            with Image.open(png) as image:self.assertEqual(image.size,(source['canvas']['width'],source['canvas']['height']))

if __name__=='__main__':unittest.main()
