"""P12b: render.run() binds the task's own hash-verified faces into text_fit.faces(). Drives the real run(), not a copy.
Needs fontTools (PYTHONPATH=$R/lica-devdeps) and CHAMELEON_UPSTREAM; see docs/evidence/2026-10-07-p11/devenv.sh."""
import contextlib, json, os, tempfile, unittest
from pathlib import Path
from tests_python.test_lica_official import SCHEMA_FILE
from tests_python.render_font_fixture import build_tree

UPSTREAM = Path(os.environ.get('CHAMELEON_UPSTREAM', '/nonexistent'))


def run_tree(designs, files=None, refs=True):
    from scripts.lica_official import render
    from engine import text_fit
    schema = json.loads(SCHEMA_FILE.read_text())
    with tempfile.TemporaryDirectory() as temp:
        out, raw = build_tree(Path(temp), designs)
        with contextlib.redirect_stdout(open(os.devnull, 'w')):
            render.run(out, raw if refs else None, UPSTREAM, schema)
        if files is not None:
            files.update(str(p.relative_to(out / 'reports')) for p in (out / 'reports').rglob('*') if p.is_file())
        audits = {lid: json.loads((out / 'reports/results' / lid / 't300/audit.json').read_text()) for lid, *_ in designs}
        outputs = {lid: json.loads((out / 'reports/results' / lid / 't300/output.json').read_text()) for lid, *_ in designs}
    return audits, outputs


class RenderFontBinding(unittest.TestCase):
    def test_fit_font_hash_equals_renderer_font_hash(self):
        """D3: for every text element the fit measured the same bytes the renderer drew. RED on b7548b2."""
        audits, _ = run_tree([('fitnarrow', 'FitNarrow', 500), ('fitwide', 'FitWide', 800)])
        for lid, audit in audits.items():
            self.assertEqual(audit['exceptions'], [], lid)
            render_hashes = {e['sha256'] for e in audit['font_events']}
            self.assertTrue(audit['metrics'], f'{lid}: fit measured nothing')
            self.assertEqual({m['metric_sha256'] for m in audit['metrics']}, render_hashes, lid)

    def test_bold_threshold_and_italic_faces_are_bound(self):
        """Weight 600 is bold and italic is italic in the renderer; the fit must resolve the same single face, not warn unmeasured."""
        audits, _ = run_tree([('semibold', 'FitNarrow', 500, 600, 'normal'), ('slanted', 'FitWide', 800, 400, 'italic')])
        for lid, audit in audits.items():
            self.assertEqual(audit['engine_warnings'], [], lid)
            self.assertTrue(audit['metrics'], f'{lid}: fit measured nothing')
            self.assertEqual({m['metric_sha256'] for m in audit['metrics']}, {e['sha256'] for e in audit['font_events']}, lid)

    def test_box_width_follows_the_task_bytes(self):
        audits, outputs = run_tree([('fitnarrow', 'FitNarrow', 500), ('fitwide', 'FitWide', 800)])
        width = {lid: next(e for e in out['elements'] if e['id'] == 'title') for lid, out in outputs.items()}
        self.assertGreater(width['fitwide']['width'], width['fitnarrow']['width'])

    def test_caller_enters_once_per_task_with_renderer_records_and_exits(self):
        from engine import text_fit
        real, calls = text_fit.faces, []

        @contextlib.contextmanager
        def spy(records):
            calls.append(('enter', [dict(r) for r in records]))
            with real(records):
                yield
            calls.append(('exit', None))
        text_fit.faces = spy
        try:
            run_tree([('fitnarrow', 'FitNarrow', 500), ('fitwide', 'FitWide', 800)])
        finally:
            text_fit.faces = real
        self.assertEqual([c[0] for c in calls], ['enter', 'exit', 'enter', 'exit'])
        self.assertEqual([c[1][0]['family'] for c in calls if c[0] == 'enter'], ['FitNarrow', 'FitWide'])  # no leak across tasks
        for _, recs in (c for c in calls if c[0] == 'enter'):
            self.assertEqual(sorted(recs[0]), ['family', 'path', 'style', 'ttf_sha256', 'weight'])

    def test_context_is_reset_after_run(self):
        from engine import text_fit
        run_tree([('fitnarrow', 'FitNarrow', 500)])
        self.assertIsNone(text_fit._FACES.get())

    def test_without_faces_hook_run_still_works_and_says_unavailable(self):
        from engine import text_fit
        real = getattr(text_fit, 'faces', None)  # absent on main: the gate path is then the real one
        if real:
            del text_fit.faces
        try:
            audits, _ = run_tree([('fitnarrow', 'FitNarrow', 500)])
        finally:
            if real:
                text_fit.faces = real
        self.assertEqual(audits['fitnarrow']['font_binding'], 'unavailable')
        self.assertEqual(audits['fitnarrow']['exceptions'], [])

    def test_raw_none_skips_references_and_sources_sheet(self):
        with_refs, no_refs = set(), set()
        a1, _ = run_tree([('fitnarrow', 'FitNarrow', 500)], files=with_refs)
        a2, _ = run_tree([('fitnarrow', 'FitNarrow', 500)], files=no_refs, refs=False)
        self.assertIn('contact-sheets/sources.png', with_refs)
        self.assertNotIn('contact-sheets/sources.png', no_refs)
        self.assertEqual(with_refs - no_refs, {'contact-sheets/sources.png'})  # nothing else differs
        self.assertEqual(a1['fitnarrow']['metrics'], a2['fitnarrow']['metrics'])  # references feed no measurement

    def test_audit_says_bound_when_hook_present(self):
        audits, _ = run_tree([('fitnarrow', 'FitNarrow', 500)])
        self.assertEqual(audits['fitnarrow']['font_binding'], 'bound')


if __name__ == '__main__':
    unittest.main()
