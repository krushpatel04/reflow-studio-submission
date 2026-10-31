"""Host-only tests for scripts/offline_submission_smoke.py. No container: a fake runtime executable stands in for podman."""
import importlib.util, json, os, stat, tempfile, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('smoke', ROOT / 'scripts' / 'offline_submission_smoke.py')
smoke = importlib.util.module_from_spec(spec); spec.loader.exec_module(smoke)
PNG = b'\x89PNG\r\n\x1a\n' + b'\0' * 16
STEMS = ['a', 'b', 'c']

def write_outputs(d: Path, stems=STEMS, png=PNG, js='{"ok": 1}'):
    d.mkdir(parents=True, exist_ok=True)
    for s in stems:
        (d / f'{s}_output.json').write_text(js); (d / f'{s}_output.png').write_bytes(png)

class CheckOutputs(unittest.TestCase):
    def setUp(self):
        self.t = Path(tempfile.mkdtemp()); self.addCleanup(__import__('shutil').rmtree, self.t, True)

    def test_complete_pairs_pass(self):
        write_outputs(self.t / 'o'); self.assertEqual(smoke.check_outputs(self.t / 'o', STEMS), [])

    def test_missing_png_fails(self):
        write_outputs(self.t / 'o'); (self.t / 'o' / 'b_output.png').unlink()
        self.assertTrue(smoke.check_outputs(self.t / 'o', STEMS))

    def test_missing_json_fails(self):
        write_outputs(self.t / 'o'); (self.t / 'o' / 'c_output.json').unlink()
        self.assertTrue(smoke.check_outputs(self.t / 'o', STEMS))

    def test_non_png_bytes_fail(self):
        write_outputs(self.t / 'o', png=b'not a png at all')
        self.assertTrue(smoke.check_outputs(self.t / 'o', STEMS))

    def test_empty_or_invalid_json_fails(self):
        write_outputs(self.t / 'o', js='{broken'); self.assertTrue(smoke.check_outputs(self.t / 'o', STEMS))

    def test_unexpected_extra_output_fails(self):
        write_outputs(self.t / 'o'); (self.t / 'o' / 'zzz.txt').write_text('x')
        self.assertTrue(smoke.check_outputs(self.t / 'o', STEMS))

    def test_zero_stems_fails(self):
        (self.t / 'o').mkdir(); self.assertTrue(smoke.check_outputs(self.t / 'o', []))

FAKE = r"""#!/usr/bin/env python3
import json, os, sys
from pathlib import Path
mode = os.environ['FAKE_MODE']; a = sys.argv[1:]
log = os.environ.get('FAKE_LOG')
if log: open(log, 'a').write(' '.join(a) + '\n')
def bump(key):
    # per-test call counter (FAKE_COUNT dir); lets a mode misbehave only on the Nth call of a kind
    d = os.environ.get('FAKE_COUNT')
    if not d: return 0
    f = Path(d) / key; n = int(f.read_text()) + 1 if f.exists() else 1; f.write_text(str(n)); return n
if a[:1] == ['inspect']:
    if mode == 'inspect_hang': import time; time.sleep(30)
    if mode == 'inspect_empty': sys.exit(0)
    if mode == 'inspect_fail': sys.exit(1)
    n = bump('inspect')
    print('bridge' if mode == 'netmode' or (mode == 'repeat_netmode' and n >= 3) else 'none'); sys.exit(0)
if a[:1] == ['build'] and mode != 'buildfail':
    f = a[a.index('-f') + 1]; ctx = a[-1]   # a real build needs the Dockerfile and the context's renderer/ to exist
    if not os.path.isfile(f) or not os.path.isdir(os.path.join(ctx, 'renderer')): print('build: missing Dockerfile or context renderer/', file=sys.stderr); sys.exit(1)
if a[:1] in (['build'], ['rmi']): sys.exit(0 if mode != 'buildfail' else 1)
if a[:2] == ['image', 'inspect']:
    if mode == 'imginspect_fail': print('Error: no such image', file=sys.stderr); sys.exit(1)
    if mode == 'imginspect_empty': sys.exit(0)
    if mode == 'imginspect_badarch': print('sha256:abc123 arm64 linux'); sys.exit(0)
    if mode == 'imginspect_badauos': print('sha256:abc123 amd64 windows'); sys.exit(0)
    if mode == 'imginspect_darwin': print('sha256:abc123 amd64 darwin'); sys.exit(0)
    n = bump('imgid'); print('sha256:abc123 amd64 linux' if not (mode == 'imgid_change' and n >= 2) else 'sha256:def456 amd64 linux'); sys.exit(0)
if a[:1] == ['rm']:
    if mode == 'rmhang': import time; time.sleep(30)
    if mode == 'rmfail': print('Error: no such container', file=sys.stderr); sys.exit(125)
    sys.exit(0)
if mode == 'hang' and '--entrypoint' not in a: import time; time.sleep(30)
def mount(dst):
    for i, x in enumerate(a):
        if x == '-v' and a[i + 1].split(':')[1] == dst: return Path(a[i + 1].split(':')[0])
if '--entrypoint' in a and '-c' in a and 'platform' in ' '.join(a): print('aarch64' if mode == 'badarch' else 'x86_64'); sys.exit(0)
if '--entrypoint' in a and '-c' in a and '/app/input/' in ' '.join(a):
    if mode == 'rwinput' or '/app/input:rw' in ' '.join(a): print('WROTE'); sys.exit(0)
    print('OSError: [Errno 30] Read-only file system', file=sys.stderr); sys.exit(1)
out = mount('/app/output'); inp = mount('/app/input')
ordinary = '/probe.py' not in ' '.join(a) and out is not None
nth = bump('ordinary') if ordinary else 0   # 1 = first ordinary entrypoint run, 2 = the repeat
stems = [p.stem for p in sorted(inp.glob('*.json'))]
if mode == 'mutate': (inp / (stems[0] + '.json')).write_text('changed')
if out is not None and mode != 'nooutput':
    for st in stems:
        (out / f'{st}_output.json').write_text('{"ok": 1}')
        (out / f'{st}_output.png').write_bytes(b'junk' if mode == 'badpng' else b'\x89PNG\r\n\x1a\n' + (b'\1' if mode == 'repeat_png' and nth == 2 and st == stems[0] else b'\0') * 8)
if mode == 'badpng_missing' and out is not None: next(out.glob('*.png')).unlink()
if mode == 'repeat_incomplete' and nth == 2: next(out.glob('*.png')).unlink()
if '/probe.py' in ' '.join(a):
    ev = [['FALLBACK' if mode == 'fallback' else 'REAL', s] for s in stems]
    if mode == 'noprobe': sys.exit(0)
    if any('norenderer' in x for x in a): print("ModuleNotFoundError: No module named 'renderer.converter'", file=sys.stderr); sys.exit(1)
    print('PROBE ' + json.dumps({'rc': 0, 'net': 'REACHABLE' if mode == 'net' else 'blocked', 'events': ev}))
    if mode == 'warn': print('RuntimeWarning: text_fit', file=sys.stderr)
sys.exit(3 if (mode == 'entryfail' and '/probe.py' not in ' '.join(a)) or (mode == 'repeat_fail' and nth == 2) else 0)
"""

class EndToEndWithFakeRuntime(unittest.TestCase):
    def setUp(self):
        self.t = Path(tempfile.mkdtemp()); self.addCleanup(__import__('shutil').rmtree, self.t, True)
        self.rt = self.t / 'fakert'; self.rt.write_text(FAKE); self.rt.chmod(self.rt.stat().st_mode | stat.S_IXUSR)
        self.inp = self.t / 'in'; self.inp.mkdir()
        for s in STEMS: (self.inp / f'{s}.json').write_text(f'{{"case": "{s}"}}')

    def run_mode(self, mode, inp=None):
        os.environ['FAKE_MODE'] = mode
        work = self.t / f'work-{mode}'
        rc = smoke.main(['--image', 'img', '--input', str(inp or self.inp), '--work', str(work), '--runtime', str(self.rt)])
        return rc, json.loads((work / 'case-ledger.json').read_text())

    def test_good_run_passes_and_ledger_honest(self):
        rc, l = self.run_mode('good')
        self.assertEqual((rc, l['pass'], l['cases_attempted']), (0, True, 3)); self.assertEqual(len(l['outputs_sha256']), 6)

    def test_each_defect_fails_with_nonzero_exit(self):
        for mode in ('fallback', 'warn', 'net', 'noprobe', 'badarch', 'badpng', 'nooutput', 'mutate', 'entryfail'):
            rc, l = self.run_mode(mode)
            self.assertEqual(rc, 1, mode); self.assertFalse(l['pass'], mode); self.assertTrue(l['failures'], mode)

    def test_zero_cases_fails_and_ledger_says_zero(self):
        empty = self.t / 'empty'; empty.mkdir()
        rc, l = self.run_mode('good', empty)
        self.assertEqual((rc, l['cases_attempted'], l['pass']), (1, 0, False))

class EvidencePreflight(unittest.TestCase):
    def setUp(self):
        EndToEndWithFakeRuntime.setUp(self)
        from unittest.mock import patch
        self.env = patch.dict(os.environ, {'FAKE_MODE': 'good', 'FAKE_LOG': str(self.t / 'runtime.log')})
        self.env.start(); self.addCleanup(self.env.stop)

    def invoke(self, work):
        return smoke.main(['--image', 'img', '--input', str(self.inp), '--work', str(work), '--runtime', str(self.rt)])

    def snapshot(self, work):
        return {str(p.relative_to(work)): (p.lstat().st_mtime_ns, os.readlink(p) if p.is_symlink() else p.read_bytes() if p.is_file() else None)
                for p in work.rglob('*')}

    def test_reused_good_outputs_cannot_pass_nooutput_or_overwrite_evidence(self):
        work = self.t / 'reuse'; self.assertEqual(self.invoke(work), 0)
        before = self.snapshot(work); log = (self.t / 'runtime.log').read_bytes()
        os.environ['FAKE_MODE'] = 'nooutput'
        self.assertNotEqual(self.invoke(work), 0)
        self.assertEqual(self.snapshot(work), before)
        self.assertEqual((self.t / 'runtime.log').read_bytes(), log)

    def test_fresh_good_and_fresh_nooutput_are_distinct_controls(self):
        self.assertEqual(self.invoke(self.t / 'good'), 0)
        os.environ['FAKE_MODE'] = 'nooutput'
        self.assertEqual(self.invoke(self.t / 'nooutput'), 1)
        self.assertFalse(json.loads((self.t / 'nooutput/case-ledger.json').read_text())['pass'])

    def test_all_child_paths_are_checked_before_any_creation_or_runtime(self):
        for name in ('out-entrypoint', 'out-probe', 'out-repeat', 'case-ledger.json'):
            for kind in ('file', 'nonempty', 'empty-symlink', 'dangling-symlink'):
                with self.subTest(name=name, kind=kind):
                    work = self.t / f'{name}-{kind}'; work.mkdir(); p = work / name
                    target = self.t / f'target-{name}-{kind}'
                    if kind == 'file': p.write_text('prior evidence')
                    elif kind == 'nonempty': p.mkdir(); (p / 'kept').write_text('prior evidence')
                    else:
                        if kind == 'empty-symlink': target.mkdir()
                        p.symlink_to(target, target_is_directory=True)
                    before = self.snapshot(work)
                    from unittest.mock import patch
                    import contextlib, io
                    diagnostic = io.StringIO()
                    with patch.object(smoke.subprocess, 'run', wraps=smoke.subprocess.run) as runtime, contextlib.redirect_stderr(diagnostic):
                        try: rc = self.invoke(work)
                        except OSError as e: self.fail(f'preflight raised instead of refusing: {e}')
                    self.assertNotEqual(rc, 0); runtime.assert_not_called()
                    self.assertIn(f'FAIL: refusing existing evidence at {work.resolve() / name}', diagnostic.getvalue())
                    self.assertEqual(self.snapshot(work), before)
                    if target.exists(): self.assertEqual(list(target.iterdir()), [])

    def test_invalid_input_writes_failure_ledger_without_runtime(self):
        from unittest.mock import patch
        import contextlib, io
        for kind in ('missing', 'file', 'unreadable'):
            with self.subTest(kind=kind):
                self.inp = self.t / kind
                if kind == 'file': self.inp.write_text('not a directory')
                if kind == 'unreadable': self.inp.mkdir()
                work = self.t / f'preflight-{kind}'
                diagnostic = io.StringIO()
                with patch.object(smoke.subprocess, 'run') as runtime, contextlib.redirect_stderr(diagnostic):
                    with patch.object(smoke, 'hashes', side_effect=PermissionError('controlled input read denial')) if kind == 'unreadable' else contextlib.nullcontext():
                        try: rc = self.invoke(work)
                        except OSError as e: self.fail(f'input preflight raised instead of recording failure: {e}')
                self.assertEqual(rc, 1); runtime.assert_not_called()
                ledger = json.loads((work / 'case-ledger.json').read_text())
                self.assertFalse(ledger['pass']); self.assertEqual(ledger['cases_attempted'], 0)
                self.assertEqual(ledger['phase'], 'input-preflight')
                self.assertIsNone(ledger['probe']); self.assertIsNone(ledger['entrypoint_exit'])
                self.assertEqual(ledger['outputs_sha256'], {})
                self.assertIn(str(self.inp.resolve()), ledger['failures'][0])
                self.assertIn(ledger['failures'][0], diagnostic.getvalue())
                self.assertFalse((work / 'out-entrypoint').exists())

    def test_invalid_input_never_overwrites_existing_ledger(self):
        work = self.t / 'prior'; work.mkdir()
        ledger = work / 'case-ledger.json'; ledger.write_text('prior accepted evidence')
        self.inp = self.t / 'missing'
        before = self.snapshot(work)
        self.assertEqual(self.invoke(work), 1)
        self.assertEqual(self.snapshot(work), before)
        self.assertFalse((self.t / 'runtime.log').exists())

    def test_empty_real_output_directories_are_allowed(self):
        work = self.t / 'empty'
        for name in ('out-entrypoint', 'out-probe', 'out-repeat'): (work / name).mkdir(parents=True)
        self.assertEqual(self.invoke(work), 0)

class RepeatHarnessAndControls(EndToEndWithFakeRuntime):
    """Slice A: ordinary same-image repeat run and controls."""
    def run_repeat(self, mode, extra=()):
        d = self.t / f'count-{mode}'; d.mkdir(exist_ok=True)
        for k in ('ordinary', 'inspect', 'imgid'): (d / k).write_text('0')
        os.environ['FAKE_COUNT'] = str(d)
        self.addCleanup(os.environ.pop, 'FAKE_COUNT', None)
        os.environ['FAKE_MODE'] = mode
        work = self.t / f'work-{mode}'
        rc = smoke.main(['--image', 'img', '--input', str(self.inp), '--work', str(work), '--runtime', str(self.rt), *extra])
        return rc, json.loads((work / 'case-ledger.json').read_text())

    def test_repeat_good_pass_and_ledger_records_identical(self):
        rc, l = self.run_repeat('good')
        self.assertEqual(rc, 0)
        self.assertTrue(l['pass'])
        self.assertEqual(l['repeat']['status'], 'identical')
        self.assertEqual(l['repeat']['outputs_sha256_second'], l['outputs_sha256'])

    def test_repeat_png_mutation_fails_as_blocked_with_both_hashes(self):
        rc, l = self.run_repeat('repeat_png')
        self.assertEqual(rc, 1)
        self.assertFalse(l['pass'])
        self.assertEqual(l['repeat']['status'], 'BLOCKED')
        self.assertNotEqual(l['repeat']['outputs_sha256_second'], l['outputs_sha256'])
        self.assertTrue(any('repeat' in f and 'differ' in f for f in l['failures']))

    def test_repeat_incomplete_outputs_fails(self):
        rc, l = self.run_repeat('repeat_incomplete')
        self.assertEqual(rc, 1); self.assertFalse(l['pass'])
        self.assertTrue(any('repeat' in f for f in l['failures']))

    def test_repeat_entrypoint_exit_nonzero_fails(self):
        rc, l = self.run_repeat('repeat_fail')
        self.assertEqual(rc, 1); self.assertFalse(l['pass'])
        self.assertTrue(any('repeat' in f for f in l['failures']))

    def test_repeat_network_mode_not_none_fails(self):
        rc, l = self.run_repeat('repeat_netmode')
        self.assertEqual(rc, 1); self.assertFalse(l['pass'])
        self.assertTrue(any('repeat' in f and 'NetworkMode' in f for f in l['failures']))

    def test_repeat_image_id_change_fails(self):
        rc, l = self.run_repeat('imgid_change')
        self.assertEqual(rc, 1); self.assertFalse(l['pass'])
        self.assertTrue(any('repeat' in f and 'image id' in f for f in l['failures']))

class ContainerHygiene(EndToEndWithFakeRuntime):
    """Slice 2a: named containers removed, bounded runs, network-none evidence read from inspect (not inferred from a failed connect)."""
    def run_logged(self, mode, extra=()):
        self.log = self.t / f'log-{mode}'; os.environ['FAKE_LOG'] = str(self.log); self.addCleanup(os.environ.pop, 'FAKE_LOG', None)
        os.environ['FAKE_MODE'] = mode; work = self.t / f'work-{mode}'
        rc = smoke.main(['--image', 'img', '--input', str(self.inp), '--work', str(work), '--runtime', str(self.rt), *extra])
        return rc, json.loads((work / 'case-ledger.json').read_text()), self.log.read_text().splitlines()

    def test_every_run_is_named_and_force_removed(self):
        rc, l, log = self.run_logged('good')
        names = [x.split('--name ')[1].split()[0] for x in log if x.startswith('run ') and '--name ' in x]
        self.assertEqual(len(names), 5); self.assertEqual(len(set(names)), 5)  # entrypoint, arch, write-attempt, probe, repeat entrypoint
        for n in names: self.assertIn(f'rm -f {n}', log)

    def test_network_none_comes_from_inspect_and_is_in_ledger(self):
        rc, l, log = self.run_logged('good')
        self.assertEqual(rc, 0); self.assertEqual(l['network_inspect'], ['none', 'none'])
        self.assertTrue(any(x.startswith('inspect ') and 'NetworkMode' in x for x in log))

    def test_non_none_network_mode_fails(self):
        rc, l, _ = self.run_logged('netmode')
        self.assertEqual(rc, 1); self.assertTrue(any('NetworkMode' in f for f in l['failures']), l['failures'])

    def test_hung_container_times_out_is_removed_and_fails(self):
        import time; t0 = time.time()
        rc, l, log = self.run_logged('hang', ['--timeout', '1'])
        self.assertLess(time.time() - t0, 20); self.assertEqual(rc, 1)
        self.assertTrue(any('timed out' in f for f in l['failures']), l['failures'])
        self.assertTrue(any(x.startswith('rm -f ') for x in log))

    def test_empty_or_failing_inspect_is_not_treated_as_none(self):
        for mode in ('inspect_empty', 'inspect_fail'):
            rc, l, _ = self.run_logged(mode)
            self.assertEqual(rc, 1, mode); self.assertTrue(any('NetworkMode' in f for f in l['failures']), (mode, l['failures']))
            self.assertNotIn('none', l['network_inspect'], mode)

    def test_cleanup_timeout_is_recorded_not_raised(self):
        rc, l, _ = self.run_logged('rmhang', ['--cleanup-timeout', '1'])
        self.assertEqual(rc, 1); self.assertTrue(any('cleanup' in f for f in l['failures']), l['failures'])

    def test_write_attempt_to_ro_input_must_be_refused_for_the_right_reason(self):
        rc, l, log = self.run_logged('good')
        self.assertEqual(rc, 0); self.assertEqual(l['write_attempt']['refused'], True)
        self.assertTrue(any('/app/input/' in x and '--entrypoint python' in x for x in log))
        rc, l, _ = self.run_logged('rwinput')
        self.assertEqual(rc, 1); self.assertTrue(any('write' in f and 'refused' in f for f in l['failures']), l['failures'])
        self.assertEqual(l['write_attempt']['refused'], False)

    def test_control_rw_input_mounts_writable_and_must_fail(self):
        rc, l, log = self.run_logged('rwinput', ['--control-rw-input'])
        w = [x for x in log if '/app/input/.write-attempt' in x or ('--entrypoint python' in x and '-c open(' in x)]
        self.assertTrue(w and all(':ro' not in x.split('/app/input')[1].split()[0] for x in w), w)
        self.assertEqual(rc, 1); self.assertFalse(l['write_attempt']['refused'])

    def test_inspect_timeout_still_writes_ledger_and_fails(self):
        rc, l, log = self.run_logged('inspect_hang', ['--inspect-timeout', '1'])
        self.assertEqual(rc, 1); self.assertTrue(any('inspect' in f and 'timed out' in f for f in l['failures']), l['failures'])
        self.assertNotIn('none', l['network_inspect']); self.assertTrue(any(x.startswith('rm -f ') for x in log), 'rm -f must still run')
        self.assertTrue((self.t / 'work-inspect_hang' / 'run.log').is_file())

    def test_rm_nonzero_is_recorded_and_artifacts_preserved(self):
        rc, l, _ = self.run_logged('rmfail')
        self.assertEqual(rc, 1); self.assertTrue(any('cleanup' in f and '125' in f for f in l['failures']), l['failures'])
        self.assertTrue((self.t / 'work-rmfail' / 'run.log').is_file()); self.assertTrue(l['outputs_sha256'])

    def test_missing_runtime_binary_still_writes_a_failing_ledger(self):
        work = self.t / 'work-nort'
        rc = smoke.main(['--image', 'img', '--input', str(self.inp), '--work', str(work), '--runtime', str(self.t / 'no-such-runtime')])
        self.assertEqual(rc, 1); l = json.loads((work / 'case-ledger.json').read_text())
        self.assertFalse(l['pass']); self.assertTrue(any(f.startswith('cannot run ') and 'no-such-runtime' in f for f in l['failures']), l['failures'])
        self.assertTrue((work / 'run.log').is_file())

    def ct_run_with_oserror_on(self, verb):
        """ct_run against a runtime where only `<verb>` raises OSError at exec time (a fake script cannot do that, so patch subprocess.run)."""
        import subprocess as sp; real = sp.run
        def fake(cmd, *a, **k):
            if cmd[1] == verb: raise OSError(f'boom-{verb}')
            return sp.CompletedProcess(cmd, 0, 'none\n' if cmd[1] == 'inspect' else '', '')
        self.addCleanup(setattr, smoke.subprocess, 'run', real); smoke.subprocess.run = fake
        problems, inspect = [], []
        smoke.ct_run('rt', ['img'], 5, problems, inspect)
        return problems, inspect

    def test_inspect_oserror_is_recorded_and_never_looks_like_none(self):
        problems, inspect = self.ct_run_with_oserror_on('inspect')
        self.assertEqual(len(inspect), 1); self.assertNotEqual(inspect[0], 'none'); self.assertIn('boom-inspect', inspect[0])
        self.assertEqual(problems, [])  # rm -f still ran cleanly; the NetworkMode check in main() rejects the non-'none' entry

    def test_rm_oserror_is_recorded_as_a_cleanup_problem(self):
        problems, _ = self.ct_run_with_oserror_on('rm')
        self.assertEqual(len(problems), 1); self.assertIn('could not run', problems[0]); self.assertIn('boom-rm', problems[0])

if __name__ == '__main__':
    unittest.main()
