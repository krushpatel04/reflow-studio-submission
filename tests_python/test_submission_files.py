"""Static checks on the Python submission image inputs. Reads files only: no build, no network, no Docker.
Run: python3 -m unittest discover -s tests_python -v
COPY sources (renderer/, brand_kit/, input/, schema) are not in this repo yet, so existence is not asserted."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCKERFILE = ROOT / 'Dockerfile.python-submission'
REQUIREMENTS = ROOT / 'requirements-python-submission.txt'
CR_RENDERER_REF = 'a17e1fb9a732959dd6c21ae168d5ee09d74bd64f'  # resolved by the A1 reproduction, docs/evidence/2026-10-06-adobe-a1/versions.txt


def instructions(text: str) -> list[str]:
    """Dockerfile instructions with comments dropped and line continuations joined."""
    lines = [l for l in text.replace('\\\n', ' ').splitlines() if l.strip() and not l.lstrip().startswith('#')]
    return [' '.join(l.split()) for l in lines]


class SubmissionFiles(unittest.TestCase):
    def test_files_exist_and_existing_node_dockerfile_is_not_reused(self):
        self.assertTrue(DOCKERFILE.is_file(), 'Dockerfile.python-submission is missing')
        self.assertTrue(REQUIREMENTS.is_file(), 'requirements-python-submission.txt is missing')
        self.assertNotEqual(DOCKERFILE.name, 'Dockerfile')

    def test_base_image_and_platform(self):
        ins = instructions(DOCKERFILE.read_text())
        self.assertEqual(ins[0], 'FROM --platform=linux/amd64 python:3.11-slim@sha256:e529028263dbe6910a2d96f7d2b8f5266385e917fd45d286ef166977c094a51e')
        self.assertEqual(sum(i.startswith('FROM ') for i in ins), 1, 'single stage only')

    def test_no_node_toolchain_anywhere(self):
        text = '\n'.join(instructions(DOCKERFILE.read_text())) + '\n' + '\n'.join(l for l in REQUIREMENTS.read_text().splitlines() if not l.lstrip().startswith('#'))
        self.assertIsNone(re.search(r'\b(node|nodejs|npm|npx|tsx|yarn|pnpm)\b', text, re.I))

    def test_entrypoint_is_the_adobe_module(self):
        ins = instructions(DOCKERFILE.read_text())
        self.assertEqual([i for i in ins if i.startswith('ENTRYPOINT')], ['ENTRYPOINT ["python", "-m", "engine.main"]'])
        self.assertFalse([i for i in ins if i.startswith('CMD')])

    def test_system_libraries_for_skia(self):
        apt = ' '.join(i for i in instructions(DOCKERFILE.read_text()) if 'apt-get install' in i)
        for lib in ('libgl1', 'libegl1', 'libglib2.0-0', 'fontconfig'):
            self.assertRegex(apt, rf'\b{re.escape(lib)}\b')

    def test_copy_set_is_exactly_the_documented_one(self):
        copies = [i.split()[1:] for i in instructions(DOCKERFILE.read_text()) if i.startswith('COPY ')]
        sources = sorted(s for c in copies for s in c[:-1])
        self.assertEqual(sources, sorted(['requirements-python-submission.txt', 'constraints-python-submission.txt', 'chameleon_design_schema_v0.9.json', 'brand_kit/', 'renderer/', 'engine/']))
        for c in copies:
            self.assertFalse(any(s.startswith(('/', '..')) or s in ('.', './') for s in c[:-1]), c)

    def test_input_and_output_are_volumes_not_baked_in(self):
        ins = instructions(DOCKERFILE.read_text())
        self.assertFalse([i for i in ins if i.startswith('COPY ') and re.search(r'\binput/?\s|\boutput/?\s', i + ' ')])
        self.assertTrue([i for i in ins if i.startswith('RUN mkdir') and 'input' in i and 'output' in i])

    def test_pins_are_exact(self):
        reqs = [l.strip() for l in REQUIREMENTS.read_text().splitlines() if l.strip() and not l.lstrip().startswith('#')]
        self.assertEqual(sorted(reqs), sorted([
            'Pillow==12.3.0',
            'skia-python==144.0.post2',
            f'git+https://github.com/CyberAgentAILab/cr-renderer@{CR_RENDERER_REF}',
        ]))

    def test_requirements_documents_provenance(self):
        text = REQUIREMENTS.read_text()
        self.assertIn('a44a06046b0413f0785e7203955c3822e0acbc32', text)
        self.assertIn('2026-10-06', text)


class OfflinePackaging(unittest.TestCase):
    def test_pip_constraints_exact_and_used(self):
        c = [l.strip() for l in (ROOT / 'constraints-python-submission.txt').read_text().splitlines() if l.strip() and not l.startswith('#')]
        self.assertGreater(len(c), 30)
        self.assertTrue(all(re.fullmatch(r'[A-Za-z0-9_.-]+==[^=\s]+', l) for l in c), c)
        self.assertIn('pillow==12.3.0', c)
        self.assertIn('-c constraints-python-submission.txt', ' '.join(instructions(DOCKERFILE.read_text())))
        self.assertIn('constraints-python-submission.txt', (ROOT / 'submission' / 'assemble_context.sh').read_text())

    def test_header_not_stale_and_pins_context_script(self):
        text = DOCKERFILE.read_text()
        self.assertNotIn('not yet built unmodified', text)
        self.assertIn('submission/assemble_context.sh', text)
        self.assertNotIn('moving tag', text)
        self.assertRegex(text, r'FROM --platform=linux/amd64 python:3\.11-slim@sha256:[0-9a-f]{64}')

    def test_assemble_script_pins_upstream_and_commits_no_upstream_files(self):
        sh = (ROOT / 'submission' / 'assemble_context.sh').read_text()
        self.assertIn('PIN=a44a06046b0413f0785e7203955c3822e0acbc32', sh)
        for d in ('renderer', 'brand_kit'):
            self.assertFalse((ROOT / d).exists(), f'{d}/ must not be committed (no upstream LICENSE)')

    def test_smoke_evaluate_controls(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location('smoke', ROOT / 'scripts' / 'offline_submission_smoke.py')
        m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        h = {'a.json': 'x'}
        real = lambda n: {'rc': 0, 'net': 'blocked', 'events': [['REAL', 'o']] * n}
        outs = {f'{i}.{e}': 'h' for i in range(3) for e in ('json', 'png')}
        ok = lambda **k: m.evaluate(**{**dict(n_inputs=3, before=h, after=h, probe=real(3), stderr='', arch='x86_64', outputs=outs, entry_rc=0), **k})
        self.assertEqual(ok(), [])
        self.assertTrue(ok(n_inputs=0, probe=real(0), outputs={}))                 # zero cases fails
        self.assertTrue(ok(after={'a.json': 'y'}))                                 # altered input fails
        self.assertTrue(ok(probe={'rc': 0, 'net': 'blocked', 'events': [['FALLBACK', 'o']] * 3}))  # renderer absent fails
        self.assertTrue(ok(stderr='x RuntimeWarning: y'))
        self.assertTrue(ok(arch='aarch64'))
        self.assertTrue(ok(probe=real(3) | {'net': 'REACHABLE'}))
        self.assertTrue(ok(probe=None))

PIN = 'a44a06046b0413f0785e7203955c3822e0acbc32'
LOCAL_UP = Path(__import__('os').environ.get('CHAMELEON_UPSTREAM', '/nonexistent'))
ASSEMBLE = ROOT / 'submission' / 'assemble_context.sh'

@unittest.skipUnless((LOCAL_UP / '.git').is_dir(), 'pinned local upstream checkout absent')
class AssembleContext(unittest.TestCase):
    """Behavioral controls for submission/assemble_context.sh. Temp dirs only; the real repo and checkout are never an OUT."""
    def setUp(self):
        import tempfile, shutil, subprocess
        self.sp, self.shutil = subprocess, shutil
        self.tmp = Path(tempfile.mkdtemp(prefix='asm-test-')).resolve()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.up = self.tmp / 'upstream'
        shutil.copytree(LOCAL_UP, self.up, symlinks=True)

    def run_asm(self, out, up=None, env=None, cwd=None):
        e = {**__import__('os').environ, **(env or {})}
        args = ['sh', str(ASSEMBLE), str(out)] + ([str(up)] if up is not None else [])
        return self.sp.run(args, capture_output=True, text=True, env=e, cwd=cwd)

    def manifest(self, d):
        import hashlib
        return {str(p.relative_to(d)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(Path(d).rglob('*')) if p.is_file()}

    def assertRefused(self, r, what):
        self.assertNotEqual(r.returncode, 0, f'{what}: expected refusal, got success\n{r.stdout}{r.stderr}')

    def test_good_assembly_has_expected_files(self):
        out = self.tmp / 'out'
        r = self.run_asm(out, self.up)
        self.assertEqual(r.returncode, 0, r.stderr)
        for f in ('Dockerfile.python-submission', 'requirements-python-submission.txt', 'constraints-python-submission.txt',
                  'chameleon_design_schema_v0.9.json', 'engine/main.py', 'engine/resize.py', 'engine/text_fit.py', 'renderer', 'brand_kit'):
            self.assertTrue((out / f).exists(), f)
        self.assertFalse(list(out.rglob('__pycache__')))

    def test_two_assemblies_have_identical_manifests(self):
        a, b = self.tmp / 'a', self.tmp / 'b'
        self.assertEqual(self.run_asm(a, self.up).returncode, 0)
        self.assertEqual(self.run_asm(b, self.up).returncode, 0)
        self.assertEqual(self.manifest(a), self.manifest(b))
        self.assertGreater(len(self.manifest(a)), 10)

    # --- OUT collision guards. REPO below is a temp COPY, never the real repo: the script resolves its repo from its own path. ---
    def temp_repo(self):
        repo = self.tmp / 'repocopy'
        for f in ('engine', 'submission', 'Dockerfile.python-submission', 'requirements-python-submission.txt', 'constraints-python-submission.txt'):
            src = ROOT / f
            (self.shutil.copytree if src.is_dir() else self.shutil.copy)(src, repo / f) if True else None
        self.sp.run(['git', 'init', '-q', str(repo)], check=True)
        return repo

    def run_in(self, repo, out, up=None, env=None):
        e = {**__import__('os').environ, **(env or {})}
        args = ['sh', str(repo / 'submission' / 'assemble_context.sh'), str(out)] + ([str(up)] if up is not None else [])
        return self.sp.run(args, capture_output=True, text=True, env=e)

    def test_out_equal_to_repo_or_ancestor_or_upstream_is_refused_and_preserved(self):
        repo = self.temp_repo()
        sentinel = repo / 'engine' / 'resize.py'; before = sentinel.read_bytes()
        usent = self.up / 'renderer'
        for name, out in (('repo', repo), ('repo ancestor', self.tmp), ('upstream', self.up), ('upstream child', self.up / 'renderer'),
                          ('repo child', repo / 'engine')):
            r = self.run_in(repo, out, self.up)
            self.assertRefused(r, name)
            self.assertTrue(sentinel.is_file() and sentinel.read_bytes() == before, f'{name}: repo file destroyed')
            self.assertTrue(usent.is_dir(), f'{name}: upstream destroyed')
            self.assertTrue((self.up / '.git').is_dir(), f'{name}: upstream .git destroyed')

    def test_out_root_home_empty_and_dot_are_refused(self):
        repo = self.temp_repo()
        home = self.tmp / 'fakehome'; home.mkdir(); (home / 'keep.txt').write_text('x')
        for name, out, env in (('/', '/', None), ('HOME', home, {'HOME': str(home)}), ('empty', '', None), ('dot', '.', None)):
            r = self.sp.run(['sh', str(repo / 'submission' / 'assemble_context.sh'), str(out), str(self.up)], capture_output=True, text=True,
                            env={**__import__('os').environ, **(env or {})}, cwd=home)
            self.assertRefused(r, name)
        self.assertEqual((home / 'keep.txt').read_text(), 'x')

    def test_symlink_out_escaping_to_protected_dirs_is_refused(self):
        repo = self.temp_repo()
        for name, target in (('repo', repo), ('upstream', self.up), ('ancestor', self.tmp)):
            link = self.tmp / f'link-{name}'; link.symlink_to(target)
            r = self.run_in(repo, link, self.up)
            self.assertRefused(r, f'symlink->{name}')
        self.assertTrue((repo / 'engine' / 'resize.py').is_file() and (self.up / 'renderer').is_dir())
        # symlink as a path component, not just the leaf
        link = self.tmp / 'linkdir'; link.symlink_to(repo)
        self.assertRefused(self.run_in(repo, link / 'engine', self.up), 'symlinked parent component')
        self.assertTrue((repo / 'engine' / 'resize.py').is_file())

    def test_nonempty_unrelated_out_is_not_silently_deleted(self):
        out = self.tmp / 'precious'; out.mkdir(); (out / 'notes.txt').write_text('mine')
        r = self.run_asm(out, self.up)
        self.assertRefused(r, 'nonempty unrelated OUT without marker')
        self.assertEqual((out / 'notes.txt').read_text(), 'mine')

    def test_previous_assembly_is_replaced_atomically_and_failure_preserves_it(self):
        out = self.tmp / 'ctx'
        self.assertEqual(self.run_asm(out, self.up).returncode, 0)
        good = self.manifest(out)
        # rerun over its own previous output works
        self.assertEqual(self.run_asm(out, self.up).returncode, 0)
        self.assertEqual(self.manifest(out), good)
        # missing upstream file -> failure; previous output intact
        (self.up / 'chameleon_design_schema_v0.9.json').unlink()
        self.sp.run(['git', '-C', str(self.up), 'checkout', '-q', '--', '.'], check=True); (self.up / 'chameleon_design_schema_v0.9.json').unlink()
        r = self.run_asm(out, self.up)
        self.assertRefused(r, 'dirty/missing upstream')
        self.assertEqual(self.manifest(out), good, 'previous good OUT must survive a failed assembly')

    def test_wrong_pin_refused_and_leaves_no_partial_out(self):
        self.sp.run(['git', '-C', str(self.up), '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '--allow-empty', '-qm', 'x'], check=True)
        out = self.tmp / 'newout'
        self.assertRefused(self.run_asm(out, self.up), 'wrong pin')
        self.assertFalse(out.exists(), 'no partial OUT')
        self.assertEqual([p.name for p in self.tmp.iterdir() if p.name.startswith(('newout.', '.newout'))], [], 'no leaked temp sibling')

    # --- required upstream resources. Real git, no shim: a checkout at the pin whose status is clean yet whose worktree lacks a resource
    # (sparse-checkout / skip-worktree), which is how a partial checkout looks in practice. ---
    def partial_upstream(self, name, rel, empty_dir=False):
        """Copy of the pinned checkout where `rel` is excluded from the worktree but `git status` stays clean and HEAD stays at the pin."""
        up = self.tmp / name; self.shutil.copytree(self.up, up, symlinks=True)
        g = lambda *a: self.sp.run(['git', '-C', str(up), *a], check=True, capture_output=True, text=True).stdout
        tracked = g('ls-files', '-z', '--', rel).split('\0')[:-1]
        self.assertTrue(tracked, f'{rel} must be tracked at the pin')
        self.sp.run(['git', '-C', str(up), 'update-index', '--skip-worktree', '-z', '--stdin'], input='\0'.join(tracked) + '\0', text=True, check=True)
        self.shutil.rmtree(up / rel)
        if empty_dir: (up / rel).mkdir()
        self.assertEqual(g('rev-parse', 'HEAD').strip(), PIN); self.assertEqual(g('status', '--porcelain'), '', 'fixture must look clean to git')
        return up

    def test_valid_pinned_checkout_assembles_with_all_required_resources_non_empty(self):
        out = self.tmp / 'valid'; r = self.run_asm(out, self.up)
        self.assertEqual(r.returncode, 0, r.stderr)
        for d in ('renderer/converter', 'brand_kit/fonts', 'brand_kit/assets'):
            self.assertTrue(any((out / d).iterdir()), f'{d} must be non-empty in a valid context')
        for f in ('chameleon_design_schema_v0.9.json', 'engine/main.py'): self.assertGreater((out / f).stat().st_size, 0, f)

    def test_partial_checkout_missing_a_required_resource_is_refused_naming_it(self):
        for rel in ('brand_kit/fonts', 'brand_kit/assets', 'renderer/converter'):
            for empty_dir in (False, True):
                with self.subTest(rel=rel, empty_dir=empty_dir):
                    up = self.partial_upstream('up-' + rel.replace('/', '_') + str(empty_dir), rel, empty_dir)
                    out = self.tmp / ('out-' + rel.replace('/', '_') + str(empty_dir))
                    r = self.run_asm(out, up)
                    self.assertRefused(r, f'missing {rel}')
                    self.assertIn(rel, r.stderr); self.assertNotIn('Traceback', r.stderr)
                    self.assertFalse(out.exists(), 'failure must leave no half-assembled OUT')
                    self.assertEqual([p.name for p in self.tmp.iterdir() if p.name.startswith(out.name + '.')], [], 'no leaked temp sibling')

    def test_refused_partial_checkout_keeps_a_previous_good_context_byte_identical(self):
        out = self.tmp / 'ctx'; self.assertEqual(self.run_asm(out, self.up).returncode, 0); good = self.manifest(out)
        up = self.partial_upstream('up-fonts', 'brand_kit/fonts')
        self.assertRefused(self.run_asm(out, up), 'partial checkout over a good OUT')
        self.assertEqual(self.manifest(out), good)
        self.assertEqual([p.name for p in self.tmp.iterdir() if p.name.startswith('ctx.')], [], 'no leaked temp sibling')

    def test_interrupted_assembly_leaves_no_partial_out_and_no_temp_leak(self):
        import os, signal, time
        out = self.tmp / 'intr'
        shim = self.tmp / 'shim'; shim.mkdir()
        real_cp = self.sp.run(['which', 'cp'], capture_output=True, text=True).stdout.strip()
        (shim / 'cp').write_text(f'#!/bin/sh\nsleep 0.4\nexec {real_cp} "$@"\n'); (shim / 'cp').chmod(0o755)
        tdir = self.tmp / 'tmpdir'; tdir.mkdir()
        env = {**os.environ, 'PATH': f'{shim}:{os.environ["PATH"]}', 'TMPDIR': str(tdir)}
        p = self.sp.Popen(['sh', str(ASSEMBLE), str(out), str(self.up)], env=env, stdout=self.sp.PIPE, stderr=self.sp.PIPE, start_new_session=True)
        time.sleep(0.6); os.killpg(p.pid, signal.SIGTERM); p.wait(timeout=10)
        self.assertFalse(out.exists(), 'interrupted assembly must not leave OUT')
        self.assertEqual([x.name for x in self.tmp.iterdir() if x.name.startswith(('intr.', '.intr'))], [], 'no leaked temp sibling')
        self.assertEqual(list(tdir.iterdir()), [], 'no leaked mktemp dirs')



class DependencyConsistency(unittest.TestCase):
    """Host-only checks tying requirements, constraints and the Dockerfile together. Nothing is installed or fetched."""
    @staticmethod
    def pins(path):
        out = {}
        for l in path.read_text().splitlines():
            l = l.strip()
            if l and not l.startswith('#'):
                m = re.fullmatch(r'([A-Za-z0-9_.-]+)==(\S+)', l)
                if m: out[m.group(1).lower().replace('_', '-')] = m.group(2)
        return out

    def test_requirement_pins_agree_with_constraints(self):
        req, con = self.pins(REQUIREMENTS), self.pins(ROOT / 'constraints-python-submission.txt')
        self.assertTrue(req)
        for k, v in req.items(): self.assertEqual(con.get(k), v, f'{k} pinned differently in constraints')

    def test_constraints_have_no_duplicates_and_no_unpinned_lines(self):
        lines = [l.strip() for l in (ROOT / 'constraints-python-submission.txt').read_text().splitlines() if l.strip() and not l.startswith('#')]
        names = [re.split('==', l)[0].lower().replace('_', '-') for l in lines]
        self.assertEqual(len(names), len(set(names)), 'duplicate constraint')
        for l in lines: self.assertRegex(l, r'^[A-Za-z0-9_.-]+==\S+$', f'not an exact pin: {l}')

    def test_constraints_cover_the_renderer_stack_and_no_node(self):
        con = self.pins(ROOT / 'constraints-python-submission.txt')
        for need in ('pillow', 'skia-python', 'numpy', 'pydantic'): self.assertIn(need, con)
        self.assertFalse([k for k in con if k in ('nodejs', 'playwright', 'puppeteer')])

    def test_every_dockerfile_python_dependency_install_uses_constraints(self):
        installs = [i for i in instructions(DOCKERFILE.read_text()) if 'pip install' in i]
        self.assertTrue(installs)
        for i in installs: self.assertIn('-c constraints-python-submission.txt', i)
        self.assertNotRegex(' '.join(installs), r'--index-url|--extra-index-url|--trusted-host')

    def test_cr_renderer_pin_is_a_full_commit_and_matches_dockerfile_evidence(self):
        text = REQUIREMENTS.read_text()
        self.assertRegex(text, r'cr-renderer@[0-9a-f]{40}\b')
        self.assertIn(CR_RENDERER_REF, text)

    def test_base_digest_is_the_verified_value(self):
        self.assertIn('python:3.11-slim@sha256:e529028263dbe6910a2d96f7d2b8f5266385e917fd45d286ef166977c094a51e', DOCKERFILE.read_text())


class TruthfulScope(unittest.TestCase):
    """Static checks on the evidence wording and the validate.sh wiring. These are NOT proof that the container works."""
    EV = ROOT / 'docs' / 'evidence' / '2026-10-06-offline-channel'

    def test_limitations_scope_statements(self):
        t = (self.EV / 'limitations.md').read_text()
        self.assertIn('## Current status', t)
        for needle in ('fd73cbcd', 'BLOCKED', 'current main is unproven', 'AppArmor', 'uid-mapping', 'fingerprint.py verify', 'untested until the container runs'):
            self.assertIn(needle, t, needle)
        self.assertRegex(t, r'(?i)not a quality claim|no quality claim')

    def test_admin_note_never_suggests_disabling_the_sysctl(self):
        t = (self.EV / 'limitations.md').read_text() + (self.EV / 'README.md').read_text()
        self.assertNotRegex(t, r'sysctl\s+-w|apparmor_restrict_unprivileged_userns\s*=\s*0')
        self.assertIn('never disable', t.lower())

    def test_readme_points_to_current_status(self):
        t = (self.EV / 'README.md').read_text()
        self.assertIn('Current status', t); self.assertIn('limitations.md', t)

    def test_validate_sh_wires_fingerprint_and_parses(self):
        import subprocess
        v = self.EV / 'validate.sh'; t = v.read_text()
        self.assertRegex(t, r'fingerprint\.py write')
        self.assertRegex(t, r'fingerprint\.py verify')
        self.assertLess(t.index('fingerprint.py write'), t.index('== BUILD'), 'fingerprint must be written before the build')
        self.assertGreater(t.index('fingerprint.py verify'), t.index('== SMOKE'), 'fingerprint must be verified after the run')
        r = subprocess.run(['sh', '-n', str(v)], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)  # syntax only; the wiring has not been executed
class ContextEngineInterface(unittest.TestCase):
    """Assembled build context vs what engine/*.py needs at runtime. Host-only; the pinned local upstream is read, never written.
    Not a container claim: it checks files and import statements, not that the image builds or renders."""
    STDLIB_OK = set(__import__('sys').stdlib_module_names)
    FORBIDDEN = {'subprocess', 'socket', 'urllib', 'http', 'requests', 'httpx', 'aiohttp', 'ftplib', 'smtplib', 'telnetlib', 'ssl', 'asyncio', 'multiprocessing', 'ctypes'}

    @classmethod
    def setUpClass(cls):
        import tempfile, shutil, subprocess
        cls.tmp = Path(tempfile.mkdtemp(prefix='ctx-iface-')).resolve()
        cls.ctx = cls.tmp / 'ctx'
        r = subprocess.run(['sh', str(ASSEMBLE), str(cls.ctx), str(LOCAL_UP)], capture_output=True, text=True)
        if r.returncode: raise AssertionError(r.stderr)
        cls.addClassCleanup(shutil.rmtree, cls.tmp, True)

    def font_names(self):
        import sys, itertools
        sys.path.insert(0, str(ROOT))
        try: from engine import text_fit
        finally: sys.path.remove(str(ROOT))
        names = {Path(text_fit._path('', {'font_family': f, 'font_weight': w, 'font_style': s})).name
                 for f, w, s in itertools.product(('SolsticeSans', 'SolsticeSerif'), ('regular', 'bold'), ('normal', 'italic'))}
        return names

    def test_font_name_set_is_what_the_kit_ships(self):
        n = self.font_names()
        self.assertEqual(len(n), 7, n)  # 2 families x 4 styles, serif BoldItalic -> Bold
        self.assertNotIn('SolsticeSerif-BoldItalic.ttf', n)
        self.assertIn('SolsticeSans-BoldItalic.ttf', n)

    def test_every_producible_font_file_exists_in_context(self):
        d = self.ctx / 'brand_kit' / 'fonts'
        missing = sorted(n for n in self.font_names() if not (d / n).is_file() or (d / n).stat().st_size == 0)
        self.assertEqual(missing, [])

    def probe(self, ctx):
        """Child process with no explicit development checkout: only assembled resources count."""
        import subprocess, os, sys
        code = ('import os,sys\nsys.path.insert(0,os.getcwd())\n'
                'from engine import text_fit\nprint(text_fit._fonts_dir())\n')
        env = {k: v for k, v in os.environ.items() if k != 'CHAMELEON_UPSTREAM'}
        r = subprocess.run([sys.executable, '-c', code], cwd=ctx, env=env, capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        return r.stdout.strip()

    def test_font_lookup_resolves_inside_context_without_host_fallback(self):
        self.assertEqual(Path(self.probe(self.ctx)).resolve(), (self.ctx / 'brand_kit' / 'fonts').resolve())

    def test_control_missing_fonts_do_not_resolve_to_host_path(self):
        import shutil
        bare = self.tmp / 'bare'
        shutil.copytree(self.ctx, bare); shutil.rmtree(bare / 'brand_kit' / 'fonts')
        self.assertEqual(self.probe(bare), 'None')

    def third_party_and_forbidden(self, engine_dir):
        import ast
        found = {}
        for f in sorted(Path(engine_dir).glob('*.py')):
            for n in ast.walk(ast.parse(f.read_text())):
                mods = [a.name for a in n.names] if isinstance(n, ast.Import) else [n.module or ''] if isinstance(n, ast.ImportFrom) and n.level == 0 else []
                for m in mods:
                    top = m.split('.')[0]
                    if top: found.setdefault(f.name, set()).add(top)
        local = {p.name for p in Path(engine_dir).parent.iterdir() if p.is_dir()}  # packages shipped in the context itself: engine, renderer
        third = {top for tops in found.values() for top in tops if top not in self.STDLIB_OK and top not in local}
        bad = {top for tops in found.values() for top in tops if top in self.FORBIDDEN}
        return third, bad

    def test_engine_imports_are_stdlib_plus_declared_requirements(self):
        decl = {l.split('==')[0].split('>=')[0].strip().lower() for l in REQUIREMENTS.read_text().splitlines() if l.strip() and not l.startswith('#') and not l.startswith('git+')}
        self.assertIn('pillow', decl)
        self.assertIn('skia-python', decl)  # directly imported by engine text fitting
        third, bad = self.third_party_and_forbidden(self.ctx / 'engine')
        modules = {'pillow': 'PIL', 'skia-python': 'skia'}
        self.assertLessEqual(third, {module for dist, module in modules.items() if dist in decl}, third)
        self.assertEqual(bad, set())

    def test_control_scan_catches_injected_imports(self):
        d = self.tmp / 'inj' / 'engine'; d.mkdir(parents=True)
        (d / 'a.py').write_text('import requests\nfrom subprocess import run\nimport yaml\n')
        third, bad = self.third_party_and_forbidden(d)
        self.assertEqual(third, {'requests', 'yaml'}); self.assertEqual(bad, {'requests', 'subprocess'})

    def test_overlay_keeps_upstream_main_and_repo_engine(self):
        e = self.ctx / 'engine'
        self.assertTrue((e / 'main.py').is_file())
        self.assertEqual((e / 'main.py').read_bytes(), (LOCAL_UP / 'engine' / 'main.py').read_bytes())
        for f in (ROOT / 'engine').glob('*.py'):
            self.assertEqual((e / f.name).read_bytes(), f.read_bytes(), f.name)
        self.assertFalse((ROOT / 'engine' / 'main.py').exists(), 'repo main.py would shadow the upstream entrypoint in the overlay')

class RunbookScope(unittest.TestCase):
    """README runbook for the future admin-enabled container proof. Static wording checks only: they prove the text, not any run."""
    README = ROOT / 'docs' / 'evidence' / '2026-10-06-offline-channel' / 'README.md'
    STEPS = ('## Run after admin enables userns',
             '1. **Precheck**', '2. **Record**', '3. **Clean owned state**', '4. **Run once**', '5. **Reviewer checks**', '6. **Status update**')

    def section(self):
        t = self.README.read_text(); i = t.index(self.STEPS[0])
        return t[i:]

    def test_steps_present_in_order(self):
        s = self.section(); pos = [s.find(h) for h in self.STEPS]
        self.assertNotIn(-1, pos, pos); self.assertEqual(pos, sorted(pos))

    def test_precheck_stop_and_no_retry(self):
        s = self.section()
        self.assertIn('unshare --user --map-root-user true', s)
        self.assertRegex(s, r'(?i)exit(s)? 0'); self.assertRegex(s, r'(?i)stop'); self.assertRegex(s, r'(?i)no retr')

    def test_one_flock_validate_command_and_record_steps(self):
        s = self.section()
        self.assertEqual(s.count('flock /tmp/quoroum-full-validation.lock unshare --user --map-root-user --mount sh docs/evidence/2026-10-06-offline-channel/validate.sh'), 1)
        for needle in ('git fetch', 'submission/fingerprint.py write', 'offline-ch', 'podman-wrap.sh images', 'podman-wrap.sh'): self.assertIn(needle, s, needle)
        self.assertNotIn('`podman images`', s)

    def test_reviewer_artifacts_and_status_rules(self):
        s = self.section()
        for needle in ('build.log', 'run.log', 'case-ledger.json', 'controls.log', 'fingerprint.py verify', 'zero FALLBACK', 'zero RuntimeWarning', 'fd73cbcd'):
            self.assertIn(needle, s, needle)
        self.assertRegex(s, r'(?i)no run has (happened|been)')
        self.assertRegex(s, r'(?i)stays? labell?ed as.is')
        self.assertRegex(s, r'(?i)re-?state')

    def test_no_dangerous_advice(self):
        t = self.section() + (ROOT / 'docs/evidence/2026-10-06-offline-channel/limitations.md').read_text()
        self.assertNotRegex(t, r'(?i)\bsudo\b|sysctl\s+-w|apparmor_restrict_unprivileged_userns\s*=\s*0|podman system (reset|prune)|rm -rf\s+(/|~|\$HOME)')
        self.assertIn('never disable', self.section().lower())

    def test_limitations_points_to_runbook(self):
        t = (ROOT / 'docs/evidence/2026-10-06-offline-channel/limitations.md').read_text()
        self.assertIn('Run after admin enables userns', t)

if __name__ == '__main__':
    unittest.main()
