import json, socket, warnings, sys
warnings.simplefilter("always")
import sys; sys.path.insert(0, "/app")
import engine.resize as r
print("engine.resize.__file__ =", r.__file__)
try:
    import engine.text_fit; print("text_fit present")
except ImportError: print("text_fit absent (not in main)")
try:
    socket.create_connection(("1.1.1.1", 53), timeout=3); print("NETWORK REACHABLE")
except OSError as e: print("network blocked:", e)
import engine.main as em
ev = []
fb = em._fallback_render
em._fallback_render = lambda d, p: (ev.append(["FALLBACK", str(p)]), fb(d, p))[1]
import renderer.converter.convert as conv
o = conv.render_design_to_png
conv.render_design_to_png = lambda d, a, out: (ev.append(["REAL", str(out)]), o(d, a, out))[1]
rc = em.main()
print("exit", rc, "REAL", sum(e[0]=="REAL" for e in ev), "FALLBACK", sum(e[0]=="FALLBACK" for e in ev))
