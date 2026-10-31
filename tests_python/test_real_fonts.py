"""P12: text_fit measures with the renderer's real faces when a caller passes them (text_fit.faces); default-off."""
import hashlib, io, os, tempfile, unittest, warnings
from engine import text_fit
from engine.resize import resize

LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

def face(advance):
    """Constructed TTF, every glyph `advance`/1000 em wide (500 vs 800 = clearly different metrics)."""
    from fontTools.fontBuilder import FontBuilder
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    b = FontBuilder(1000, isTTF=True)
    names = [".notdef", "space"] + list(LETTERS)
    b.setupGlyphOrder(names)
    b.setupCharacterMap({32: "space", **{ord(c): c for c in LETTERS}})
    g = {}
    for n in names:
        p = TTGlyphPen(None)
        if n != "space":
            p.moveTo((50, 0)); p.lineTo((450, 0)); p.lineTo((450, 700)); p.lineTo((50, 700)); p.closePath()
        g[n] = p.glyph()
    b.setupGlyf(g); b.setupHorizontalMetrics({n: (advance, 50) for n in names}); b.setupHorizontalHeader(ascent=800, descent=-200)
    b.setupNameTable({"familyName": "F", "styleName": "Regular", "uniqueFontIdentifier": f"F{advance}", "fullName": f"F{advance}", "psName": f"F{advance}", "version": "1.0"})
    b.setupOS2(sTypoAscender=800, sTypoDescender=-200, usWinAscent=800, usWinDescent=200)
    b.setupPost(); b.setupMaxp()
    buf = io.BytesIO(); b.save(buf)
    return buf.getvalue()

def record(tmp, family, adv, weight=400, style="normal", name=None):
    data = face(adv); sha = hashlib.sha256(data).hexdigest()
    path = os.path.join(tmp, name or sha)
    if os.path.exists(path):
        os.remove(path)  # new inode: FreeType reads lazily, a truncated-in-place file would change under a cached font
    with open(path, "wb") as f:
        f.write(data)
    return {"family": family, "weight": weight, "style": style, "path": path, "ttf_sha256": sha}

def source(family="Wide", weight="regular", style="normal"):
    t = {"id": "t", "type": "text", "x": 10, "y": 10, "width": 400, "height": 60, "content": "Alpha Beta Gamma Delta", "font_family": family,
         "font_size": 40, "font_weight": weight, "font_style": style, "color": "#000000"}
    return {"canvas": {"width": 1000, "height": 400}, "elements": [t]}

TARGET = {"width": 120, "height": 90}

def run(src, recs=None):
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        if recs is None:
            out = resize(src, TARGET)
        else:
            with text_fit.faces(recs):
                out = resize(src, TARGET)
    return out["elements"][0], [str(x.message) for x in w if issubclass(x.category, RuntimeWarning)]

@unittest.skipUnless(text_fit._fonts_dir(), "brand kit fonts not found")
class RealFaces(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup); self.t = self.tmp.name

    def test_distinct_face_changes_the_fit_and_path_is_the_verified_blob(self):
        wide, narrow = record(self.t, "Wide", 800), record(self.t, "Narrow", 500)
        a, _ = run(source("Wide"), [wide]); b, _ = run(source("Narrow"), [narrow])
        self.assertNotEqual((a["font_size"], a["width"]), (b["font_size"], b["width"]))  # 800 vs 500 em advance
        with text_fit.faces([wide]):
            self.assertEqual(text_fit._path("", source("Wide")["elements"][0]), wide["path"])  # D3: metric sha == blob sha

    def test_no_context_is_unchanged_and_path_signature_kept(self):
        a, _ = run(source("Wide"))
        run(source("Wide"), [record(self.t, "Wide", 800)])
        b, _ = run(source("Wide"))
        self.assertEqual(a, b)
        self.assertTrue(text_fit._path(text_fit._fonts_dir(), source("Wide")["elements"][0]).endswith("SolsticeSans-Regular.ttf"))

    def test_hash_mismatch_raises_before_measuring(self):
        r = record(self.t, "Wide", 800); r["ttf_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "hash mismatch"):
            run(source("Wide"), [r])

    def test_state_resets_after_exit_and_after_exception(self):
        base, _ = run(source("Wide"))
        run(source("Wide"), [record(self.t, "Wide", 800)])
        with self.assertRaises(RuntimeError):
            with text_fit.faces([record(self.t, "Wide", 800)]):
                raise RuntimeError
        self.assertIsNone(text_fit._FACES.get())
        self.assertEqual(run(source("Wide"))[0], base)

    def test_same_path_rewritten_bytes_does_not_leak_across_tasks(self):
        r = record(self.t, "Wide", 800, name="same.bin")
        a, _ = run(source("Wide"), [r])
        r2 = record(self.t, "Wide", 500, name="same.bin")  # same path, different bytes
        b, _ = run(source("Wide"), [r2])
        self.assertNotEqual((a["font_size"], a["width"]), (b["font_size"], b["width"]))

    def test_weight_600_is_bold_and_picks_the_bold_face(self):
        reg, bold = record(self.t, "Wide", 500), record(self.t, "Wide", 800, weight=700)
        with text_fit.faces([reg, bold]):
            self.assertEqual(text_fit._path("", source("Wide", "bold")["elements"][0]), bold["path"])
            self.assertEqual(text_fit._path("", source("Wide", "regular")["elements"][0]), reg["path"])
        semi = record(self.t, "Wide", 800, weight=600)
        with text_fit.faces([reg, semi]):
            self.assertEqual(text_fit._path("", source("Wide", "bold")["elements"][0]), semi["path"])

    def test_italic_style_picks_italic_face(self):
        reg, it = record(self.t, "Wide", 500), record(self.t, "Wide", 800, style="italic")
        with text_fit.faces([reg, it]):
            self.assertEqual(text_fit._path("", source("Wide", "regular", "italic")["elements"][0]), it["path"])

    def test_last_word_weight_rule(self):  # renderer get_font_weight: "Foo Bold" reads weight from the name
        r = record(self.t, "Foo Bold", 800, weight=700)
        with text_fit.faces([r]):
            self.assertEqual(text_fit._path("", source("Foo Bold", "bold")["elements"][0]), r["path"])
            self.assertEqual(text_fit._path("", source("Foo Bold", "regular")["elements"][0]), r["path"])

    def test_identical_sha_duplicate_is_not_ambiguous_but_distinct_bytes_is(self):
        a = record(self.t, "Wide", 800)
        out, w = run(source("Wide"), [a, dict(a)])
        self.assertEqual(w, []); self.assertGreater(out["font_size"], 0)
        b = record(self.t, "Wide", 500)
        out, w = run(source("Wide"), [a, b])
        self.assertTrue(any("no exact font face" in m for m in w))
        uni, _ = run(source("Wide"), [])  # empty table: every face absent -> unmeasured too
        self.assertEqual(out, uni)

    def test_absent_family_is_unmeasured_warning_and_uniform_never_substituted(self):
        out, w = run(source("Times Serif"), [record(self.t, "Wide", 800)])
        self.assertTrue(any("no exact font face" in m for m in w))
        self.assertEqual(out, run(source("Times Serif"), [])[0])
        # the uniform result is the plain scaled geometry: font 40 * min(120/1000, 90/400) = 4.8
        self.assertAlmostEqual(out["font_size"], 4.8)

    def test_missing_style_is_unmeasured(self):
        out, w = run(source("Wide", "bold"), [record(self.t, "Wide", 800)])  # only regular provided
        self.assertTrue(w)

    def test_family_name_is_normalised_like_the_renderer(self):  # "_" -> space, title case
        r = record(self.t, "my_font", 800)
        with text_fit.faces([r]):
            self.assertEqual(text_fit._path("", source("My Font")["elements"][0]), r["path"])
            self.assertEqual(text_fit._path("", source("MY FONT")["elements"][0]), r["path"])

    def test_font_cache_does_not_serve_old_bytes_for_same_path_and_size(self):
        el = source("Wide")["elements"][0]; got = []
        for adv in (800, 500):
            r = record(self.t, "Wide", adv, name="same.bin")
            with text_fit.faces([r]):
                got.append(text_fit._font(text_fit._path("", el), 100).getlength("AAAA"))
        self.assertAlmostEqual(got[0] / got[1], 800 / 500, places=2)

if __name__ == "__main__":
    unittest.main()
