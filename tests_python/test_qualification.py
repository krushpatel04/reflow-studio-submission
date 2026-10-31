"""OF-01 slice 1: hosted-Docker qualification harness. Host-only; a fake runtime executable stands in for docker. Not image proof."""
import json, os, re, stat, subprocess, sys, tempfile, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
WORKFLOW = ROOT / '.github' / 'workflows' / 'python-submission.yml'

def fake_runtime(d: Path, body: str) -> Path:
    p = d / 'fakedocker'; p.write_text('#!/bin/sh\n' + body); p.chmod(p.stat().st_mode | stat.S_IEXEC); return p

def matrix_stub(destination, image_id='sha256:abc123', fault=None):
    # Isolate original smoke tests from the matrix subprocess. Matrix verdict tests
    # and hosted execution separately establish its controls.
    from tests_python.test_offline_failure_matrix import CASES, good
    cases = {name: good(name) for name in CASES}
    for record in cases.values():
        record['image_id'] = record['expected_image_id'] = image_id
    if fault == 'wrong-reason': cases['oom']['oom_control']['after']['oom_kill'] = 0
    result = {'pass': True, 'failures': [], 'image_id': image_id, 'cases': cases}
    p = Path(destination) / 'failure-matrix'; p.mkdir()
    (p / 'matrix.json').write_text(json.dumps(result))
    return {'code': 0, 'timed_out': False}

class Workflow(unittest.TestCase):
    def text(self):
        self.assertTrue(WORKFLOW.is_file(), 'python-submission.yml missing')
        return WORKFLOW.read_text()

    def test_triggers_pull_request_first_dispatch_supplementary(self):
        t = self.text()
        self.assertRegex(t, r'(?m)^  pull_request:'); self.assertRegex(t, r'(?m)^  workflow_dispatch:')

    def test_least_privilege_and_hosted_runner(self):
        t = self.text()
        self.assertRegex(t, r'(?m)^permissions:\s*\n  contents: read\s*$')
        self.assertNotRegex(t, r'(?i)write-all|contents:\s*write|self-hosted')
        self.assertIn('runs-on: ubuntu-24.04', t)

    def test_artifacts_uploaded_even_on_failure_and_pinned(self):
        t = self.text()
        self.assertRegex(t, r'if: always\(\)[\s\S]*actions/upload-artifact@[0-9a-f]{40}')
        self.assertIn('reports/of-01', t)
        self.assertRegex(t, r'(?m)^    timeout-minutes:\s*\d+')  # job level; step level alone would not bound a hung setup step

    def test_image_job_pins_upstream_runs_on_exact_sha_and_uploads_always(self):
        t = self.text()
        self.assertRegex(t, r'(?m)^  image:'); self.assertIn('a44a06046b0413f0785e7203955c3822e0acbc32', t)
        self.assertRegex(t, r'qualify_python_submission\.py image[^\n]*--runtime docker')
        self.assertRegex(t, r'(?m)^    needs: capability')
        img = t[t.index('\n  image:'):]
        self.assertRegex(img, r'(?m)^    timeout-minutes:\s*\d+'); self.assertRegex(img, r'if: always\(\)[\s\S]*upload-artifact@[0-9a-f]{40}')
        self.assertRegex(img, r'name: python-submission-image-')
        self.assertNotRegex(img, r'--network\s+host|--privileged')

    def test_pull_request_is_scoped_to_owned_paths(self):
        t = self.text()
        for f in ('.github/workflows/python-submission.yml', 'scripts/qualify_python_submission.py', 'scripts/offline_submission_smoke.py', 'tests_python/test_qualification.py', 'tests_python/test_offline_smoke.py'):
            self.assertIn(f'      - {f}', t, f)
        self.assertNotRegex(t, r'(?m)^\s+pull_request_target')

class Capability(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix='qual-')); self.out = self.tmp / 'out'
        self.addCleanup(__import__('shutil').rmtree, self.tmp, True)

    def test_run_bounded_records_exit_code_and_output(self):
        import qualify_python_submission as q
        r = q.run('ok', ['sh', '-c', 'echo hi; echo err >&2; exit 3'], 10, self.out)
        self.assertEqual((r['code'], r['timed_out']), (3, False))
        j = json.loads((self.out / 'ok.json').read_text())
        self.assertEqual(j['code'], 3); self.assertEqual((self.out / 'ok.stdout').read_text(), 'hi\n'); self.assertEqual((self.out / 'ok.stderr').read_text(), 'err\n')

    def test_run_timeout_kills_process_group_and_is_recorded(self):
        import qualify_python_submission as q, time
        marker = self.tmp / 'child-survived'
        t0 = time.time()
        r = q.run('slow', ['sh', '-c', f'(sleep 3; touch {marker}) & sleep 30'], 1, self.out)
        self.assertTrue(r['timed_out']); self.assertLess(time.time() - t0, 10)
        time.sleep(3.5); self.assertFalse(marker.exists(), 'grandchild outlived the timeout')
        self.assertTrue(json.loads((self.out / 'slow.json').read_text())['timed_out'])

    def test_missing_executable_is_a_recorded_failure_not_a_crash(self):
        import qualify_python_submission as q
        r = q.run('nope', [str(self.tmp / 'does-not-exist')], 5, self.out)
        self.assertIsNone(r['code']); self.assertIn('error', r)

    def test_capability_records_runtime_and_platform_and_fails_closed(self):
        import qualify_python_submission as q
        rt = fake_runtime(self.tmp, 'case "$1" in version) echo "Server: 27.0 linux/amd64";; info) echo "Architecture: x86_64";; *) exit 9;; esac\n')
        rc = q.capability(str(rt), self.out)
        self.assertEqual(rc, 0)
        c = json.loads((self.out / 'capability.json').read_text())
        self.assertEqual(c['runtime_ok'], True); self.assertIn('machine', c); self.assertIn('version', c['steps'])
        bad = fake_runtime(self.tmp, 'exit 1\n')
        self.assertNotEqual(q.capability(str(bad), self.tmp / 'out2'), 0)
        self.assertFalse(json.loads((self.tmp / 'out2' / 'capability.json').read_text())['runtime_ok'])

    def test_cli_exit_code_follows_capability(self):
        rt = fake_runtime(self.tmp, 'exit 1\n')
        r = subprocess.run([sys.executable, str(ROOT / 'scripts' / 'qualify_python_submission.py'), 'capability', '--runtime', str(rt), '--out', str(self.out)], capture_output=True, text=True)
        self.assertNotEqual(r.returncode, 0); self.assertTrue((self.out / 'capability.json').is_file())

class ControlVerdicts(unittest.TestCase):
    """A control passes only if the smoke FAILED and for its stated reason; failing for any other reason is not evidence."""
    def led(self, *f, passed=False): return {'pass': passed, 'failures': list(f)}

    def test_each_control_accepts_only_its_reason(self):
        import qualify_python_submission as q
        good = {'renderer-absent': ('no probe result', "probe stderr: ModuleNotFoundError: No module named 'renderer'"), 'mutated-input': 'input bytes changed', 'zero-input': 'zero input cases',
                'write-attempt': 'write to :ro input was not refused'}
        for name, reason in good.items():
            reason = (reason,) if isinstance(reason, str) else reason
            self.assertTrue(q.control_verdict(name, self.led(*reason))[0], name)
            self.assertFalse(q.control_verdict(name, self.led('arch \'aarch64\', want x86_64'))[0], name)   # wrong reason
            self.assertFalse(q.control_verdict(name, self.led(*reason, passed=True))[0], name)               # smoke passed: control did not bite
            self.assertFalse(q.control_verdict(name, self.led())[0], name)
        self.assertFalse(q.control_verdict('unknown', self.led('x'))[0])

    def test_renderer_absent_needs_genuine_absence_evidence_not_any_missing_probe(self):
        import qualify_python_submission as q
        ok = lambda *f: q.control_verdict('renderer-absent', self.led(*f))[0]
        self.assertTrue(ok('no probe result', "probe stderr: ModuleNotFoundError: No module named 'renderer.converter'"))
        self.assertFalse(ok('no probe result'), 'probe died for an unrelated reason')
        self.assertFalse(ok('no probe result', "probe stderr: ModuleNotFoundError: No module named 'x'"), 'a different missing module is not renderer absence')
        self.assertFalse(ok('no probe result', 'probe stderr: PermissionError: [Errno 13] denied'))
        self.assertFalse(ok('FALLBACK 3'), 'FALLBACK alone, without REAL 0, is not renderer absence')
        self.assertFalse(ok('REAL 0 != cases 3'), 'REAL 0 alone is not renderer absence')

    def test_renderer_absent_also_accepts_fallback_evidence(self):
        import qualify_python_submission as q
        self.assertTrue(q.control_verdict('renderer-absent', self.led('REAL 0 != cases 3', 'FALLBACK 3'))[0])

# Stand-in for submission/assemble_context.sh (which needs the pinned starter): builds the context layout the orchestrator consumes.
FAKE_ASSEMBLE = ("import sys; from pathlib import Path; c = Path(sys.argv[1]); (c / 'renderer').mkdir(parents=True); "
                 "(c / 'renderer' / '__init__.py').write_text(''); (c / 'Dockerfile.python-submission').write_text('FROM scratch\\n')")

class QualifyImage(unittest.TestCase):
    """Orchestrator against the fake runtime from test_offline_smoke and a temp-dir starter fixture. Proves wiring and fail-closed
    behaviour, not an image, and needs neither the Nala host nor a pinned starter checkout (the assembler boundary is replaced)."""

    def setUp(self):
        sys.path.insert(0, str(ROOT)); from tests_python import test_offline_smoke as so
        import qualify_python_submission as q
        self.tmp = Path(tempfile.mkdtemp(prefix='qimg-')); self.addCleanup(__import__('shutil').rmtree, self.tmp, True)
        self.rt = self.tmp / 'fakert'; self.rt.write_text(so.FAKE); self.rt.chmod(0o755); self.out = self.tmp / 'out'
        self.UP = self.tmp / 'starter'; (self.UP / 'input').mkdir(parents=True)
        for st in ('a', 'b', 'c'): (self.UP / 'input' / f'{st}.json').write_text(f'{{"case": "{st}"}}')
        orig = q.run; self.addCleanup(setattr, q, 'run', orig)
        def run(label, args, *r, **k):
            if label == 'failure-matrix': return matrix_stub(r[1])
            if label == 'resource-profile': return resource_stub(r[1])
            return orig(label, [sys.executable, '-c', FAKE_ASSEMBLE, args[2]] if label == 'assemble' else args, *r, **k)
        q.run = run

    def go(self, mode, **kw):
        import qualify_python_submission as q
        os.environ['FAKE_MODE'] = mode; self.addCleanup(os.environ.pop, 'FAKE_MODE', None)
        rc = q.image(str(self.rt), self.UP, self.out, build_timeout=60, smoke_timeout=60, require_clean=False, **kw)
        return rc, json.loads((self.out / 'qualification.json').read_text())

    def test_good_run_passes_with_all_controls_biting(self):
        rc, q = self.go('good')
        self.assertEqual(rc, 0, q); self.assertTrue(q['pass'])
        self.assertEqual(sorted(q['controls']), ['mutated-input', 'renderer-absent', 'write-attempt', 'zero-input'])
        self.assertTrue(all(c['ok'] for c in q['controls'].values()), q['controls'])
        self.assertTrue(q['smoke']['pass']); self.assertEqual(q['fingerprint_verify_exit'], 0); self.assertIn('git_sha', q)

    def test_successful_image_requires_actual_container_failure_matrix(self):
        rc, result = self.go('good')
        self.assertIn('failure_matrix', result, 'image success must account for actual container fault cases')
        self.assertTrue(result['failure_matrix']['pass'], result)
        self.assertEqual(set(result['failure_matrix']['cases']), {
            'valid', 'malformed', 'unsupported', 'invalid-target', 'timeout', 'oom'})

    def test_matrix_wrong_reason_rejected_even_with_passing_producer_boolean(self):
        import qualify_python_submission as q
        orig = q.run
        def wrapped(label, args, *a, **kw):
            if label == 'failure-matrix': return matrix_stub(a[1], fault='wrong-reason')
            return orig(label, args, *a, **kw)
        q.run = wrapped
        rc, result = self.go('good')
        self.assertNotEqual(rc, 0)
        self.assertIn('failure matrix evidence rejected', ' '.join(result['failures']))

    def test_failed_matrix_subprocess_cannot_accept_passing_ledger(self):
        self._wrap_run('failure-matrix', after=None)
        import qualify_python_submission as q
        orig = q.run
        def wrapped(label, args, *a, **kw):
            result = orig(label, args, *a, **kw)
            if label == 'failure-matrix': result = {**result, 'code': 1}
            return result
        q.run = wrapped
        rc, result = self.go('good')
        self.assertNotEqual(rc, 0)
        self.assertIn('failure matrix exit 1', ' '.join(result['failures']))

    def test_existing_matrix_directory_is_preserved_and_fails(self):
        old = self.out / 'failure-matrix'; old.mkdir(parents=True)
        (old / 'matrix.json').write_text('old evidence')
        rc, result = self.go('good')
        self.assertNotEqual(rc, 0)
        self.assertIn('refusing existing failure matrix directory', result['failures'])
        self.assertEqual((old / 'matrix.json').read_text(), 'old evidence')

    def test_successful_image_records_descriptive_resource_profile(self):
        rc, result = self.go('good')
        self.assertIn('resource_profile', result, 'image receipt needs source-bound resource observations')
        self.assertTrue(result['resource_profile']['pass'])
        self.assertEqual(result['resource_profile']['fresh_process_count'], 5)
        self.assertEqual(result['resource_profile']['same_process_iterations'], 10)

    def test_resource_bad_measurement_rejected_despite_pass_flag(self):
        def corrupt():
            p=self.out/'resource-profile'/'profile.json';d=json.loads(p.read_text())
            d['steps'][0]['iterations'][0]['elapsed_s']=-1;p.write_text(json.dumps(d))
        self._wrap_run('resource-profile',after=corrupt)
        rc,result=self.go('good');self.assertNotEqual(rc,0)
        self.assertIn('resource profile evidence rejected',' '.join(result['failures']))

    def test_resource_subprocess_failure_rejects_passing_receipt(self):
        import qualify_python_submission as q
        original=q.run
        def wrapped(label,args,*a,**kw):
            result=original(label,args,*a,**kw)
            return {**result,'code':1} if label=='resource-profile' else result
        q.run=wrapped
        rc,result=self.go('good');self.assertNotEqual(rc,0)
        self.assertIn('resource profile exit 1',' '.join(result['failures']))

    def test_resource_existing_evidence_preserved(self):
        d=self.out/'resource-profile';d.mkdir(parents=True);(d/'profile.json').write_text('old')
        rc,result=self.go('good');self.assertNotEqual(rc,0)
        self.assertEqual((d/'profile.json').read_text(),'old')

    def test_build_failure_fails_closed_and_skips_nothing_silently(self):
        rc, q = self.go('buildfail')
        self.assertNotEqual(rc, 0); self.assertFalse(q['pass']); self.assertIn('build', ' '.join(q['failures']))

    def test_a_control_that_does_not_bite_fails_the_qualification(self):
        import qualify_python_submission as q
        orig = q.CONTROL_REASONS['mutated-input']; self.addCleanup(q.CONTROL_REASONS.__setitem__, 'mutated-input', orig)
        q.CONTROL_REASONS['mutated-input'] = ('a reason the smoke will never give',)
        rc, r = self.go('good')
        self.assertNotEqual(rc, 0); self.assertFalse(r['controls']['mutated-input']['ok']); self.assertFalse(r['pass'])

    def test_images_are_removed_and_qualification_written_even_if_the_orchestrator_raises(self):
        import qualify_python_submission as q
        log = self.tmp / 'rtlog'; os.environ['FAKE_LOG'] = str(log); self.addCleanup(os.environ.pop, 'FAKE_LOG', None)
        orig = q.control_verdict; self.addCleanup(setattr, q, 'control_verdict', orig)
        def boom(*a, **k): raise RuntimeError('injected')
        q.control_verdict = boom
        rc, r = self.go('good')
        self.assertNotEqual(rc, 0); self.assertFalse(r['pass']); self.assertTrue(any('injected' in f for f in r['failures']), r['failures'])
        self.assertGreaterEqual(sum(1 for x in log.read_text().splitlines() if x.startswith('rmi ')), 2, 'both images must be removed')

    def _wrap_run(self, label, after=None, args=None):
        import qualify_python_submission as q
        orig = q.run; self.addCleanup(setattr, q, 'run', orig)
        def wrapped(lbl, a, *r, **k):
            res = orig(lbl, args if lbl == label and args else a, *r, **k)
            if lbl == label and after: after()
            return res
        q.run = wrapped

    def test_main_smoke_failure_fails_the_qualification(self):
        # everything else is good; only the main smoke ledger says pass=False
        self._wrap_run('smoke-main', after=lambda: (self.out / 'smoke-main' / 'case-ledger.json').write_text(
            json.dumps({'pass': False, 'failures': ['injected main failure']})))
        rc, r = self.go('good')
        self.assertNotEqual(rc, 0); self.assertFalse(r['pass']); self.assertFalse(r['smoke']['pass'])
        self.assertTrue(any(f.startswith('smoke failed') and 'injected main failure' in f for f in r['failures']), r['failures'])
        self.assertTrue(all(c['ok'] for c in r['controls'].values()), 'controls must still be independently green')

    def test_fingerprint_verify_failure_fails_the_qualification(self):
        self._wrap_run('fingerprint-verify', args=[sys.executable, '-c', 'raise SystemExit(3)'])
        rc, r = self.go('good')
        self.assertNotEqual(rc, 0); self.assertFalse(r['pass']); self.assertEqual(r['fingerprint_verify_exit'], 3)
        self.assertIn('fingerprint verify failed', r['failures'])
        self.assertTrue(r['smoke']['pass'] and all(c['ok'] for c in r['controls'].values()))

    def test_image_inspect_is_checked_and_recorded(self):
        rc, r = self.go('good')
        self.assertEqual(r['build_exit'], 0)  # the fake build only succeeds if the stand-in assembler produced Dockerfile.python-submission and renderer/
        self.assertEqual(rc, 0, r); self.assertEqual(r['image'], {'id': 'sha256:abc123', 'arch': 'amd64', 'os': 'linux'})

    def test_failed_empty_or_wrong_arch_image_inspect_fails_the_qualification(self):
        for mode, why in (('imginspect_fail', 'exit'), ('imginspect_empty', 'unparseable'), ('imginspect_badarch', 'arm64'), ('imginspect_badauos', 'amd64/windows'), ('imginspect_darwin', 'amd64/darwin')):
            self.out = self.tmp / f'out-{mode}'
            rc, r = self.go(mode)
            self.assertNotEqual(rc, 0, mode); self.assertFalse(r['pass'], mode)
            self.assertTrue(any('image inspect' in f and why in f for f in r['failures']), (mode, r['failures']))

    def test_dirty_tree_is_refused_when_required(self):
        import qualify_python_submission as q
        d = self.tmp / 'notrepo'; d.mkdir()
        rc = q.image(str(self.rt), self.UP, self.out, build_timeout=5, smoke_timeout=5, require_clean=True, repo=d)
        self.assertNotEqual(rc, 0)
        self.assertFalse(json.loads((self.out / 'qualification.json').read_text())['pass'])

class SmokeEvidenceReceipts(unittest.TestCase):
    """Actual orchestrator, receipt stubs only; no build, fingerprint or runtime executes."""
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix='receipt-')); self.addCleanup(__import__('shutil').rmtree, self.tmp, True)
        self.up = self.tmp / 'up'; (self.up / 'input').mkdir(parents=True); (self.up / 'input/a.json').write_text('{}')
        self.reasons = {'renderer-absent': ['no probe result', "probe stderr: ModuleNotFoundError: No module named 'renderer.converter'"],
                        'mutated-input': ['input bytes changed'], 'zero-input': ['zero input cases'],
                        'write-attempt': ['write to :ro input was not refused with Read-only file system']}

    def exercise(self, out, bad=None, existing=None):
        import qualify_python_submission as q
        from unittest.mock import patch
        calls = []
        def run(label, args, timeout, destination):
            d = Path(destination); calls.append(label); code = 0; timed = False; stdout = ''
            if label == 'git-head': stdout = 'a' * 40
            elif label == 'assemble': (Path(args[2]) / 'renderer').mkdir(parents=True)
            elif label == 'image-inspect': stdout = 'sha256:fake amd64 linux'
            elif label == 'failure-matrix': matrix_stub(d, 'sha256:fake')
            elif label == 'resource-profile': resource_stub(d, 'sha256:fake')
            elif label.startswith('smoke-'):
                control = label.removeprefix('smoke-'); code = 0 if control == 'main' else 1
                ledger = {'pass': control == 'main', 'failures': [] if control == 'main' else self.reasons[control]}
                if control == 'main':
                    from tests_python.test_submission_resource_probe import good_profile
                    example=good_profile()
                    ledger.update(inputs_sha256_before=example['inputs_before'],outputs_sha256=example['expected_outputs'])
                if bad and label == bad[0]: code, timed = bad[1:]
                if label != existing:
                    w = d / label; w.mkdir(exist_ok=True); (w / 'case-ledger.json').write_text(json.dumps(ledger))
            rec = {'label': label, 'args': args, 'timeout_s': timeout, 'timed_out': timed, 'code': code}
            (d / f'{label}.stdout').write_text(stdout); (d / f'{label}.stderr').write_text('')
            (d / f'{label}.json').write_text(json.dumps(rec)); return rec
        with patch.object(q, 'run', side_effect=run): rc = q.image('fake', self.up, out, repo=self.tmp)
        return rc, json.loads((out / 'qualification.json').read_text()), calls

    def test_fresh_main_and_four_current_exit_one_controls_pass(self):
        rc, result, calls = self.exercise(self.tmp / 'fresh')
        self.assertEqual(rc, 0, result); self.assertTrue(result['pass'])
        self.assertTrue(all(c['ok'] for c in result['controls'].values()))
        self.assertEqual(sum(x.startswith('smoke-') for x in calls), 5)

    def test_current_main_bad_receipt_cannot_accept_new_passing_ledger(self):
        for code, timed in ((1, False), (-9, True), (0, True)):
            with self.subTest(code=code, timed=timed):
                out = self.tmp / f'main-{code}-{timed}'
                rc, result, _ = self.exercise(out, ('smoke-main', code, timed))
                self.assertTrue(json.loads((out / 'smoke-main/case-ledger.json').read_text())['pass'])
                self.assertNotEqual(rc, 0); self.assertFalse(result['pass'])
                self.assertTrue(any('smoke' in f for f in result['failures']))

    def test_current_control_bad_receipt_cannot_accept_new_reason_ledger(self):
        for code, timed in ((0, False), (3, False), (-9, True), (1, True)):
            with self.subTest(code=code, timed=timed):
                out = self.tmp / f'control-{code}-{timed}'
                rc, result, _ = self.exercise(out, ('smoke-mutated-input', code, timed))
                self.assertEqual(json.loads((out / 'smoke-mutated-input/case-ledger.json').read_text())['failures'], ['input bytes changed'])
                self.assertNotEqual(rc, 0); self.assertFalse(result['pass'])
                self.assertFalse(result['controls']['mutated-input']['ok'])

    def test_existing_ledgers_are_preserved_and_smoke_is_not_launched(self):
        for label in ('smoke-main', 'smoke-mutated-input'):
            for kind in ('file', 'empty-symlink', 'dangling-symlink'):
                with self.subTest(label=label, kind=kind):
                    out = self.tmp / f'{label}-{kind}'; w = out / label; w.mkdir(parents=True)
                    ledger = w / 'case-ledger.json'; marker = w / 'old-output.png'; marker.write_bytes(b'prior output')
                    target = self.tmp / f'target-{label}-{kind}'
                    old = json.dumps({'pass': label == 'smoke-main', 'failures': [] if label == 'smoke-main' else ['input bytes changed']})
                    if kind == 'file': ledger.write_text(old)
                    else:
                        if kind == 'empty-symlink': target.write_text('')
                        ledger.symlink_to(target)
                    before = (ledger.lstat().st_mtime_ns, marker.read_bytes(), marker.stat().st_mtime_ns,
                              os.readlink(ledger) if ledger.is_symlink() else ledger.read_bytes())
                    rc, result, calls = self.exercise(out, existing=label)
                    self.assertNotEqual(rc, 0); self.assertFalse(result['pass']); self.assertNotIn(label, calls)
                    self.assertTrue(any(f'refusing existing ledger at {ledger}' in f for f in result['failures']))
                    self.assertEqual((ledger.lstat().st_mtime_ns, marker.read_bytes(), marker.stat().st_mtime_ns,
                                      os.readlink(ledger) if ledger.is_symlink() else ledger.read_bytes()), before)
                    if kind == 'empty-symlink': self.assertEqual(target.read_bytes(), b'')
                    if kind == 'dangling-symlink': self.assertFalse(target.exists())

@unittest.skipUnless(os.environ.get('CHAMELEON_UPSTREAM') and (Path(os.environ.get('CHAMELEON_UPSTREAM', '/nonexistent')) / '.git').exists(),
                     'SKIPPED (not host-only evidence): real assemble_context.sh integration needs CHAMELEON_UPSTREAM=<starter checkout at a44a060>')
class RealStarterAssemble(unittest.TestCase):
    """Integration, separate from the host-only tests: the real assembler on the real pinned starter (no docker)."""
    def test_real_assembler_builds_a_context_the_orchestrator_can_use(self):
        out = Path(tempfile.mkdtemp(prefix='qreal-')) / 'ctx'; self.addCleanup(__import__('shutil').rmtree, out.parent, True)
        r = subprocess.run(['sh', str(ROOT / 'submission' / 'assemble_context.sh'), str(out), os.environ['CHAMELEON_UPSTREAM']], capture_output=True, text=True, timeout=120)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertTrue((out / 'Dockerfile.python-submission').is_file()); self.assertTrue((out / 'renderer').is_dir())



def resource_stub(out,image_id='sha256:abc123'):
    from tests_python.test_submission_resource_probe import good_profile
    out=Path(out);profile=good_profile();smoke=json.loads((out/'smoke-main'/'case-ledger.json').read_text())
    profile['image_id']=image_id
    profile['inputs_before']=profile['inputs_after']=smoke['inputs_sha256_before']
    profile['expected_outputs']=smoke['outputs_sha256']
    for step in [profile['calibration'],*profile['steps']]:step['image_id']=profile['image_id']
    for step in profile['steps']:
        for row in step['iterations']:row.update(outputs=profile['expected_outputs'],real=len(profile['inputs_before']))
    profile.update(pass_=True,failures=[]);profile['pass']=profile.pop('pass_')
    d=out/'resource-profile';d.mkdir();(d/'profile.json').write_text(json.dumps(profile))
    return {'code':0,'timed_out':False}

if __name__ == '__main__':
    unittest.main()
