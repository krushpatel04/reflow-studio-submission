"""Pillow (engine/text_fit) vs upstream renderer metrics (skia widths + wrap_text) for the re-fit L3 texts, plus rendered ink rows. Geometry only."""
import json, sys
sys.path.insert(0, sys.argv[1])
from PIL import Image
from renderer.converter.brand_fonts import load_brand_font_manager
from renderer.converter.wrap import char_widths, wrap_text
from engine import text_fit as tf
out = json.load(open(sys.argv[2])); png = Image.open(sys.argv[3]).convert("RGB")
fonts = tf._fonts_dir(); fm = load_brand_font_manager(fonts)
import skia
print("id | px | pillow(Solstice TTF) lines,maxw | skia(Solstice TTF) unwrapped total w | renderer-lookup(fallback) lines,maxw | box wxh | ink rows in box (rendered)")
for e in out["elements"]:
    if e["type"] != "text" or e.get("group_id"): continue
    w = "bold" if e.get("font_weight") == "bold" else "regular"; b, it = e.get("font_weight") == "bold", e.get("font_style") == "italic"; st = "bolditalic" if b and it else "bold" if b else "italic" if it else "regular"
    cw = char_widths(fm, e["font_family"], w, st, e["font_size"], e["content"]); wr = wrap_text(e["content"], cw, e["width"])
    sk = wr.split("\n"); sw = max(sum(cw[i] for i in range(s, s + len(l))) for l, s in zip(sk, [0] + [i + 1 for i, c in enumerate(wr) if c == "\n"]))
    pw, pn = tf._block(tf._font(tf._path(fonts, e), e["font_size"]), e["content"], e["width"])
    sf = skia.Font(skia.Typeface.MakeFromFile(tf._path(fonts, e)), e["font_size"]); sk_same = sf.measureText(e["content"])
    x0, y0, x1, y1 = int(e["x"]), int(e["y"]), int(e["x"] + e["width"]) + 1, int(e["y"] + e["height"]) + 1
    # estimate bg as the corner pixel; count rows whose ink differs from it
    reg = png.crop((x0, y0, min(x1, png.width), min(y1, png.height))); bg = reg.getpixel((0, 0))
    rows = sum(1 for yy in range(reg.height) if any(sum(abs(a - b) for a, b in zip(reg.getpixel((xx, yy)), bg)) > 90 for xx in range(reg.width)))
    print(f"{e['id']} | {e['font_size']:.2f} | {pn},{pw:.1f} | {sk_same:.1f} | {len(sk)},{sw:.1f} | {e['width']:.1f}x{e['height']:.1f} | {rows}")
