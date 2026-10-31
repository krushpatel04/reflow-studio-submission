"""Host-only tests for submission/fingerprint.py. Works on a temp COPY of the packaging inputs; never mutates the real repo."""
import importlib.util, json, shutil, subprocess, sys, tempfile, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / 'submission' / 'fingerprint.py'
FILES = ['Dockerfile.python-submission', 'requirements-python-submission.txt', 'constraints-python-submission.txt', 'submission/assemble_context.sh']

class Fingerprint(unittest.TestCase):
    def setUp(self):
        self.t = Path(tempfile.mkdtemp()).resolve(); self.addCleanup(shutil.rmtree, self.t, True)
        self.repo = self.t / 'repo'
        shutil.copytree(ROOT / 'engine', self.repo / 'engine', ignore=shutil.ignore_patterns('__pycache__'))
        for f in FILES:
            (self.repo / f).parent.mkdir(parents=True, exist_ok=True); shutil.copy(ROOT / f, self.repo / f)
        shutil.copy(SCRIPT, self.repo / 'submission' / 'fingerprint.py')
        self.inp = self.t / 'in'; self.inp.mkdir()
        for n in ('l1', 'l2', 'l3'): (self.inp / f'{n}.json').write_text(f'{{"case": "{n}"}}')
        self.man = self.t / 'm.json'

    def cli(self, *a):
        return subprocess.run([sys.executable, str(self.repo / 'submission' / 'fingerprint.py'), *a], capture_output=True, text=True)

    def write(self):
        r = self.cli('write', '--inputs', str(self.inp), str(self.man)); self.assertEqual(r.returncode, 0, r.stderr); return json.loads(self.man.read_text())

    def verify(self):
        return self.cli('verify', str(self.man), '--inputs', str(self.inp))

    def test_manifest_content_and_determinism(self):
        m = self.write()
        self.assertEqual(m['schema_version'], 1)
        self.assertEqual(m['upstream_pin'], 'a44a06046b0413f0785e7203955c3822e0acbc32')
        self.assertRegex(m['base_image_digest'], r'^sha256:[0-9a-f]{64}$')
        self.assertIn('engine/text_fit.py', m['files']); self.assertIn('constraints-python-submission.txt', m['files'])
        self.assertEqual(sorted(m['inputs']), ['l1.json', 'l2.json', 'l3.json'])
        first = self.man.read_text(); self.write(); self.assertEqual(first, self.man.read_text())

    def test_unchanged_tree_verifies(self):
        self.write(); r = self.verify(); self.assertEqual(r.returncode, 0, r.stderr)

    def test_drift_is_detected_and_named(self):
        for rel, key in (('engine/resize.py', 'engine/resize.py'), ('constraints-python-submission.txt', 'constraints-python-submission.txt'),
                         ('Dockerfile.python-submission', 'Dockerfile.python-submission')):
            self.write(); p = self.repo / rel; orig = p.read_bytes(); p.write_bytes(orig + b'\n# drift\n')
            r = self.verify(); self.assertNotEqual(r.returncode, 0, rel); self.assertIn(key, r.stderr); p.write_bytes(orig)
        self.write(); (self.inp / 'l2.json').write_text('changed'); r = self.verify()
        self.assertNotEqual(r.returncode, 0); self.assertIn('l2.json', r.stderr)

    def test_missing_engine_module_or_input_fails(self):
        self.write(); (self.repo / 'engine' / 'text_fit.py').unlink(); r = self.verify()
        self.assertNotEqual(r.returncode, 0); self.assertIn('engine/text_fit.py', r.stderr)

    def test_added_engine_module_or_input_fails(self):
        self.write(); (self.repo / 'engine' / 'extra.py').write_text('x=1'); self.assertNotEqual(self.verify().returncode, 0)
        (self.repo / 'engine' / 'extra.py').unlink(); (self.inp / 'l4.json').write_text('{}'); self.assertNotEqual(self.verify().returncode, 0)

    def test_zero_inputs_or_missing_input_dir_fails(self):
        for f in self.inp.glob('*.json'): f.unlink()
        self.assertNotEqual(self.cli('write', '--inputs', str(self.inp), str(self.man)).returncode, 0)
        shutil.rmtree(self.inp)
        self.assertNotEqual(self.cli('write', '--inputs', str(self.inp), str(self.man)).returncode, 0)

    def test_schema_version_and_digest_pin_mismatch_fail(self):
        m = self.write(); m['schema_version'] = 2; self.man.write_text(json.dumps(m)); self.assertNotEqual(self.verify().returncode, 0)
        m['schema_version'] = 1; m['base_image_digest'] = 'sha256:' + '0' * 64; self.man.write_text(json.dumps(m)); self.assertNotEqual(self.verify().returncode, 0)
        m = self.write(); m['upstream_pin'] = 'f' * 40; self.man.write_text(json.dumps(m)); self.assertNotEqual(self.verify().returncode, 0)

    def test_missing_manifest_and_garbage_fail(self):
        self.assertNotEqual(self.verify().returncode, 0)
        self.man.write_text('not json'); self.assertNotEqual(self.verify().returncode, 0)

if __name__ == '__main__':
    unittest.main()
