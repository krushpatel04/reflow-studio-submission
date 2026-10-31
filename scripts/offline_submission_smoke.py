#!/usr/bin/env python3
"""Offline smoke for the Python submission image. Stdlib only.

Runs `python -m engine.main` in the image with --network none and the input dir mounted :ro,
then re-runs it under a provenance probe (same entrypoint code path, mounted read-only) to count
REAL (cr-renderer) vs FALLBACK (box) renders and RuntimeWarnings. Exit 0 only if every check holds.

  python3 scripts/offline_submission_smoke.py --image IMG --input DIR --work DIR [--runtime podman]

Writes WORK/case-ledger.json. Zero cases is a failure. This file does not build or fetch anything."""
import argparse, hashlib, json, os, re, subprocess, sys, tempfile, uuid
from pathlib import Path

PROBE = r'''
import json, socket, sys, warnings
warnings.simplefilter("always")
sys.path.insert(0, "/app")
try:
    socket.create_connection(("1.1.1.1", 53), timeout=3); net = "REACHABLE"
except OSError as e: net = "blocked"
import engine.main as em
ev = []
fb = em._fallback_render
em._fallback_render = lambda d, p: (ev.append(["FALLBACK", str(p)]), fb(d, p))[1]
import renderer.converter.convert as conv
o = conv.render_design_to_png
conv.render_design_to_png = lambda d, a, out: (ev.append(["REAL", str(out)]), o(d, a, out))[1]
rc = em.main()
print("PROBE " + json.dumps({"rc": rc, "net": net, "events": ev}))
'''

def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()

def hashes(d: Path) -> dict:
    return {p.name: sha(p) for p in sorted(d.iterdir()) if p.is_file()}

def parse_probe(stdout: str) -> dict | None:
    for line in stdout.splitlines():
        if line.startswith('PROBE '):
            return json.loads(line[6:])
    return None

def check_outputs(d: Path, stems: list) -> list:
    """Every case needs <stem>_output.json (valid JSON object) and <stem>_output.png (PNG signature); nothing else may appear."""
    f = []
    if not stems: return ['no cases']
    want = {f'{s}_output.{e}' for s in stems for e in ('json', 'png')}
    have = {p.name for p in Path(d).iterdir()} if Path(d).is_dir() else set()
    f += [f'missing {n}' for n in sorted(want - have)] + [f'unexpected {n}' for n in sorted(have - want)]
    for s in stems:
        j, g = Path(d) / f'{s}_output.json', Path(d) / f'{s}_output.png'
        if j.is_file():
            try: assert isinstance(json.loads(j.read_text()), dict)
            except Exception: f.append(f'{j.name} is not a JSON object')
        if g.is_file() and g.read_bytes()[:8] != b'\x89PNG\r\n\x1a\n': f.append(f'{g.name} is not a PNG')
    return f

def evaluate(n_inputs, before, after, probe, stderr, arch, outputs, entry_rc, output_problems=()):
    """Pure check. Returns list of failure strings (empty = pass)."""
    f = []
    if n_inputs == 0: f.append('zero input cases')
    if entry_rc != 0: f.append(f'entrypoint exit {entry_rc}')
    if before != after: f.append('input bytes changed')
    if arch != 'x86_64': f.append(f'arch {arch!r}, want x86_64')
    if probe is None:
        f.append('no probe result')
        m = re.search(r"ModuleNotFoundError: No module named '[\w.]+'", stderr)
        if m: f.append('probe stderr: ' + m.group(0))
        return f
    real = sum(e[0] == 'REAL' for e in probe['events']); fb = sum(e[0] == 'FALLBACK' for e in probe['events'])
    if probe['rc'] != 0: f.append(f'probe exit {probe["rc"]}')
    if probe['net'] != 'blocked': f.append('network reachable')
    if real != n_inputs: f.append(f'REAL {real} != cases {n_inputs}')
    if fb: f.append(f'FALLBACK {fb}')
    if 'RuntimeWarning' in stderr: f.append('RuntimeWarning in stderr')
    names = sorted(outputs)
    if len(names) != 2 * n_inputs: f.append(f'{len(names)} outputs, want {2 * n_inputs}')
    f += list(output_problems)
    return f

def ct_run(runtime, args, timeout, problems, inspect=None, cleanup_timeout=60, inspect_timeout=30):
    """`<runtime> run --name N ...` bounded by timeout. The container is always force-removed afterwards (also after a timeout).
    If inspect is a list, the container's HostConfig.NetworkMode is read from the runtime (real evidence, not a failed connect) and appended."""
    name = f'smoke-{os.getpid()}-{uuid.uuid4().hex[:8]}'
    cmd = [runtime, 'run', '--name', name] + args
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        problems.append(f'timed out after {timeout}s: {args[-1]}')
        r = subprocess.CompletedProcess(cmd, 124, '', '')
    except OSError as e:
        problems.append(f'cannot run {runtime}: {e}')
        r = subprocess.CompletedProcess(cmd, 127, '', str(e))
    try:
        if inspect is not None:
            try:
                i = subprocess.run([runtime, 'inspect', '--format', '{{.HostConfig.NetworkMode}}', name], capture_output=True, text=True, timeout=inspect_timeout)
                inspect.append(i.stdout.strip() or f'inspect failed rc={i.returncode}')
            except subprocess.TimeoutExpired:
                inspect.append('inspect timed out'); problems.append(f'inspect of container {name} timed out after {inspect_timeout}s')
            except OSError as e:
                inspect.append(f'inspect error: {e}')
    finally:
        try:
            c = subprocess.run([runtime, 'rm', '-f', name], capture_output=True, text=True, timeout=cleanup_timeout)
            if c.returncode != 0: problems.append(f'cleanup of container {name} failed (rm -f exit {c.returncode}): {c.stderr.strip()[-120:]}')
        except subprocess.TimeoutExpired: problems.append(f'cleanup of container {name} timed out after {cleanup_timeout}s')
        except OSError as e: problems.append(f'cleanup of container {name} could not run: {e}')
    return r

def image_id(runtime, image, timeout=30):
    """Image id from the runtime, or '' if it cannot be read (never guessed)."""
    try:
        r = subprocess.run([runtime, 'image', 'inspect', image, '--format', '{{.Id}}'], capture_output=True, text=True, timeout=timeout)
    except (subprocess.TimeoutExpired, OSError): return ''
    t = r.stdout.split()
    return t[0] if r.returncode == 0 and t else ''

def main(argv=None) -> int:
    a = argparse.ArgumentParser()
    a.add_argument('--image', required=True); a.add_argument('--input', required=True, type=Path)
    a.add_argument('--work', required=True, type=Path); a.add_argument('--control-mutate-input', action='store_true', help='negative control: flip one input byte after the run; smoke must then FAIL'); a.add_argument('--runtime', default='podman'); a.add_argument('--timeout', type=int, default=300, help='seconds per container run'); a.add_argument('--cleanup-timeout', type=int, default=60); a.add_argument('--inspect-timeout', type=int, default=30); a.add_argument('--control-rw-input', action='store_true', help='negative control: mount a disposable COPY of the input writable for the write attempt; smoke must then FAIL')
    a = a.parse_args(argv)
    inp = a.input.resolve(); work = a.work.resolve(); out1 = work / 'out-entrypoint'; out2 = work / 'out-probe'; out3 = work / 'out-repeat'
    for p in (out1, out2, out3, work / 'case-ledger.json'):
        if p.is_symlink() or (p.exists() and (p.name == 'case-ledger.json' or not p.is_dir() or any(p.iterdir()))):
            print(f'FAIL: refusing existing evidence at {p}', file=sys.stderr)
            return 1
    try:
        if not inp.is_dir():
            raise OSError('expected an existing input directory')
        cases = sorted(inp.glob('*.json'))
        before = hashes(inp)
    except OSError as e:
        failure = f'cannot read input directory {inp}: {e}'
        # No runtime was attempted; null/empty fields must not imply measured evidence.
        ledger = {'image': a.image, 'phase': 'input-preflight', 'cases_attempted': 0,
                  'inputs_sha256_before': {}, 'inputs_sha256_after': {}, 'outputs_sha256': {},
                  'probe': None, 'entrypoint_exit': None, 'failures': [failure], 'pass': False}
        work.mkdir(parents=True, exist_ok=True)
        (work / 'case-ledger.json').write_text(json.dumps(ledger, indent=2) + '\n')
        print('FAIL: ' + failure, file=sys.stderr)
        return 1
    for d in (out1, out2, out3): d.mkdir(parents=True, exist_ok=True)
    base = ['--network', 'none', '-v', f'{inp}:/app/input:ro']
    problems, nets, repeat_nets = [], [], []
    id_before = image_id(a.runtime, a.image, a.inspect_timeout)
    r1 = ct_run(a.runtime, base + ['-v', f'{out1}:/app/output', a.image], a.timeout, problems, nets, cleanup_timeout=a.cleanup_timeout, inspect_timeout=a.inspect_timeout)
    arch = ct_run(a.runtime, ['--network', 'none', '--entrypoint', 'python', a.image, '-c', 'import platform;print(platform.machine())'], a.timeout, problems, cleanup_timeout=a.cleanup_timeout, inspect_timeout=a.inspect_timeout).stdout.strip()
    # control: the :ro input mount must refuse a write, and for that reason (not some unrelated failure)
    wbase = base
    if a.control_rw_input:
        import shutil; rw = work / 'rw-input-copy'; shutil.copytree(inp, rw, dirs_exist_ok=True)
        wbase = ['--network', 'none', '-v', f'{rw}:/app/input:rw']
    w = ct_run(a.runtime, wbase + ['--entrypoint', 'python', a.image, '-c', "open('/app/input/.write-attempt','w')"], a.timeout, problems, cleanup_timeout=a.cleanup_timeout, inspect_timeout=a.inspect_timeout)
    wrote = w.returncode == 0 or not (w.returncode == 1 and 'Read-only file system' in w.stderr)
    write_attempt = {'refused': not wrote, 'exit': w.returncode, 'stderr_tail': w.stderr.strip()[-200:]}
    with tempfile.NamedTemporaryFile('w', suffix='.py', dir=work, delete=False) as t: t.write(PROBE)
    r2 = ct_run(a.runtime, base + ['-v', f'{out2}:/app/output', '-v', f'{t.name}:/probe.py:ro', '-w', '/app', '-e', 'PYTHONPATH=/app',
                                   '--entrypoint', 'python', a.image, '-W', 'always', '/probe.py'], a.timeout, problems, nets, cleanup_timeout=a.cleanup_timeout, inspect_timeout=a.inspect_timeout)
    # second ordinary entrypoint run: separate clean outdir, same image, same flags as the first
    r3 = ct_run(a.runtime, base + ['-v', f'{out3}:/app/output', a.image], a.timeout, problems, repeat_nets, cleanup_timeout=a.cleanup_timeout, inspect_timeout=a.inspect_timeout)
    id_after = image_id(a.runtime, a.image, a.inspect_timeout)
    if a.control_mutate_input and cases: cases[0].write_bytes(cases[0].read_bytes() + b' ')
    after = hashes(inp)
    probe = parse_probe(r2.stdout)
    o1, o2 = hashes(out1), hashes(out2)
    fails = evaluate(len(cases), before, after, probe, r1.stderr + r2.stderr, arch, o1, r1.returncode,
                     check_outputs(out1, [c.stem for c in cases]) + (['entrypoint output dir had no files'] if not o1 else []))
    if wrote: fails.append('write to :ro input was not refused with Read-only file system')
    fails += problems + [f'NetworkMode {n!r} != none' for n in nets if n != 'none']
    if o1 != o2: fails.append('entrypoint and probe outputs differ')
    o3 = hashes(out3); rfails = []
    if r3.returncode != 0: rfails.append(f'repeat: entrypoint exit {r3.returncode}')
    rfails += [f'repeat: {x}' for x in check_outputs(out3, [c.stem for c in cases])]
    rfails += [f'repeat: NetworkMode {n!r} != none' for n in repeat_nets if n != 'none'] + ([] if repeat_nets else ['repeat: NetworkMode not read'])
    if not id_before or not id_after: rfails.append('repeat: image id unreadable')
    elif id_before != id_after: rfails.append(f'repeat: image id changed {id_before!r} -> {id_after!r}')
    if o3 != o1: rfails.append('repeat: output hashes differ from first run')
    fails += rfails
    repeat = {'status': 'identical' if not rfails else 'BLOCKED', 'image_id_before': id_before, 'image_id_after': id_after,
              'entrypoint_exit': r3.returncode, 'network_inspect': repeat_nets, 'outputs_sha256_second': o3}
    ledger = {'image': a.image, 'arch': arch, 'cases_attempted': len(cases), 'inputs_sha256_before': before,
              'inputs_sha256_after': after, 'outputs_sha256': o1, 'probe': probe,
              'entrypoint_exit': r1.returncode, 'network_inspect': nets, 'write_attempt': write_attempt, 'repeat': repeat, 'failures': fails, 'pass': not fails}
    (work / 'case-ledger.json').write_text(json.dumps(ledger, indent=2) + '\n')
    (work / 'run.log').write_text(f'== entrypoint rc={r1.returncode}\n{r1.stdout}{r1.stderr}\n== probe rc={r2.returncode}\n{r2.stdout}{r2.stderr}\n')
    print('PASS' if not fails else 'FAIL: ' + '; '.join(fails))
    return 0 if not fails else 1

if __name__ == '__main__':
    sys.exit(main())
