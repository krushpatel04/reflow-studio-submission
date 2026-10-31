"""Run `python -m engine.main` unchanged, with call tracing on the real renderer path and the fallback.
Usage: trace_run.py [--fail-import]  (fault control: make renderer.converter.convert import raise ImportError)"""
import sys, runpy, json, builtins
fail = '--fail-import' in sys.argv
events = []
if fail:
    real_import = builtins.__import__
    def guarded(name, globals=None, locals=None, fromlist=(), level=0):
        if name == 'cr_renderer' or name.startswith('cr_renderer.'): raise ImportError('forced fault: cr_renderer unavailable')
        return real_import(name, globals, locals, fromlist, level)
    builtins.__import__ = guarded
import engine.main as em
orig_fb = em._fallback_render
def fb(design, png_path): events.append(['FALLBACK', str(png_path)]); return orig_fb(design, png_path)
em._fallback_render = fb
if not fail:
    import renderer.converter.convert as conv, cr_renderer
    orig = conv.render_design_to_png
    def traced(design, assets_dir, out):
        events.append(['REAL', 'renderer.converter.convert.render_design_to_png', conv.__file__, cr_renderer.__file__, str(out)])
        return orig(design, assets_dir, out)
    conv.render_design_to_png = traced
    import cr_renderer as c; orig_r = c.CrelloV5Renderer.render if hasattr(c.CrelloV5Renderer, 'render') else None
    if orig_r:
        def r(self, *a, **k): events.append(['CrelloV5Renderer.render']); return orig_r(self, *a, **k)
        c.CrelloV5Renderer.render = r
rc = em.main()
json.dump(events, open(sys.argv[sys.argv.index('--events') + 1], 'w'), indent=1)
sys.exit(rc)
