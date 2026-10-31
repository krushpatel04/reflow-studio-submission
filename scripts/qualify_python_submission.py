#!/usr/bin/env python3
"""OF-01 hosted-Docker qualification harness. Stdlib only.

  qualify_python_submission.py capability --runtime docker --out reports/of-01

Slice 1: records runner/runtime capability. Every subprocess is bounded and its exit code, duration and output are kept
whether it passes, fails or times out. This is NOT image proof: it builds and renders nothing."""
import argparse, json, os, platform, signal, subprocess, sys, time
from pathlib import Path

def run(label, args, timeout, out):
    """Run args in its own process group, killed whole on timeout. Always writes <label>.{json,stdout,stderr}; never raises."""
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    t0, rec, so, se = time.time(), {'label': label, 'args': list(args), 'timeout_s': timeout, 'timed_out': False, 'code': None}, '', ''
    try:
        p = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
        try: so, se = p.communicate(timeout=timeout)
        except subprocess.TimeoutExpired:
            rec['timed_out'] = True
            try: os.killpg(p.pid, signal.SIGKILL)
            except ProcessLookupError: pass
            so, se = p.communicate()
        rec['code'] = p.returncode
    except OSError as e:
        rec['error'] = f'{type(e).__name__}: {e}'
    rec['duration_s'] = round(time.time() - t0, 3)
    (out / f'{label}.stdout').write_text(so or ''); (out / f'{label}.stderr').write_text(se or '')
    (out / f'{label}.json').write_text(json.dumps(rec, indent=2) + '\n')
    return rec

def capability(runtime, out, timeout=60):
    """Record the runtime version/info and host platform. Returns 0 only if every probe exited 0."""
    out = Path(out); steps = {n: run(n, [runtime, n], timeout, out) for n in ('version', 'info')}
    ok = all(s['code'] == 0 and not s['timed_out'] for s in steps.values())
    cap = {'runtime': runtime, 'runtime_ok': ok, 'machine': platform.machine(), 'system': platform.platform(),
           'python': sys.version.split()[0], 'github_sha': os.environ.get('GITHUB_SHA'), 'runner_os': os.environ.get('RUNNER_OS'),
           'steps': {n: {'code': s['code'], 'timed_out': s['timed_out']} for n, s in steps.items()}}
    (out / 'capability.json').write_text(json.dumps(cap, indent=2) + '\n')
    return 0 if ok else 1

# Each control must make the smoke FAIL, and for its stated reason. A smoke failure for any other reason proves nothing.
CONTROL_REASONS = {
    'renderer-absent': (),  # special-cased in control_verdict: needs genuine renderer-absence evidence
    'mutated-input': ('input bytes changed',),
    'zero-input': ('zero input cases',),
    'write-attempt': ('write to :ro input was not refused',),
}

def control_verdict(name, ledger):
    """(ok, why). ok only if the smoke did not pass and at least one failure matches the control's stated reason."""
    reasons = CONTROL_REASONS.get(name)
    if reasons is None: return False, f'unknown control {name!r}'
    if ledger.get('pass'): return False, 'smoke passed: the control did not bite'
    if name == 'renderer-absent': return _renderer_absent(ledger.get('failures', []))
    hit = [f for f in ledger.get('failures', []) if any(r in f for r in reasons)]
    return (True, hit[0]) if hit else (False, f'failed for the wrong reason: {ledger.get("failures")}')

def _renderer_absent(fails):
    """Genuine absence only: the probe produced no result AND its stderr names the missing renderer module, or the smoke saw zero REAL and only FALLBACK renders.
    A bare 'no probe result' (probe died for any reason) or REAL-0 / FALLBACK alone proves nothing."""
    j = ' | '.join(fails)
    if 'no probe result' in j and "No module named 'renderer" in j:
        return True, next((f for f in fails if "No module named 'renderer" in f), j)
    if any(f.startswith('REAL 0 != ') for f in fails) and any(f.startswith('FALLBACK ') for f in fails):
        return True, next(f for f in fails if f.startswith('FALLBACK '))
    return False, f'failed for the wrong reason (no genuine renderer-absence evidence): {fails}'
REPO = Path(__file__).resolve().parent.parent

def image(runtime, upstream, out, build_timeout=900, smoke_timeout=300, require_clean=True, repo=REPO):
    """Qualify one exact SHA: assemble, fingerprint write, bounded build, smoke, four controls, fingerprint verify.
    Fail closed: any failed step, a control that does not bite for its stated reason, or a dirty tree makes pass False. Returns 0 only on pass.
    Slice 2b qualifies the packet SHA only; the final integrated SHA must be re-run."""
    import shutil, tempfile
    out = Path(out); out.mkdir(parents=True, exist_ok=True); repo = Path(repo)
    q = {'runtime': runtime, 'failures': [], 'controls': {}, 'machine': platform.machine(), 'pass': False}
    def finish():
        q['pass'] = not q['failures']; (out / 'qualification.json').write_text(json.dumps(q, indent=2) + '\n'); return 0 if q['pass'] else 1
    head = run('git-head', ['git', '-C', str(repo), 'rev-parse', 'HEAD'], 30, out)
    q['git_sha'] = (out / 'git-head.stdout').read_text().strip() if head['code'] == 0 else None
    if q['git_sha'] is None: q['failures'].append('cannot read git HEAD (not a repo?)')
    if require_clean:
        st = run('git-status', ['git', '-C', str(repo), 'status', '--porcelain'], 30, out)
        if st['code'] != 0 or (out / 'git-status.stdout').read_text().strip(): q['failures'].append('tree is dirty or unreadable: refusing to qualify')
    if q['failures'] and require_clean: return finish()
    work = Path(tempfile.mkdtemp(prefix='qimg-')); ctx = work / 'ctx'; inputs = work / 'in'; inputs.mkdir()
    tags = []
    try:
        for f in sorted((Path(upstream) / 'input').glob('*.json')): shutil.copy(f, inputs)
        a = run('assemble', ['sh', str(repo / 'submission' / 'assemble_context.sh'), str(ctx), str(upstream)], 300, out)
        fp = run('fingerprint-write', [sys.executable, str(repo / 'submission' / 'fingerprint.py'), 'write', str(out / 'fingerprint.json'), '--inputs', str(inputs)], 60, out)
        for n, r in (('assemble', a), ('fingerprint write', fp)):
            if r['code'] != 0: q['failures'].append(f'{n} failed (exit {r["code"]})')
        if q['failures']: return finish()
        tag = f'of01-{(q["git_sha"] or "x")[:12]}'; tags.append(tag)
        b = run('build', [runtime, 'build', '-f', str(ctx / 'Dockerfile.python-submission'), '-t', tag, str(ctx)], build_timeout, out)
        q['build_exit'] = b['code']
        if b['code'] != 0 or b['timed_out']: q['failures'].append(f'build failed (exit {b["code"]}, timed_out {b["timed_out"]})'); return finish()
        ii = run('image-inspect', [runtime, 'image', 'inspect', tag, '--format', '{{.Id}} {{.Architecture}} {{.Os}}'], 60, out)
        parts = (out / 'image-inspect.stdout').read_text().split() if ii['code'] == 0 else []
        if ii['code'] != 0 or ii['timed_out']: q['failures'].append(f'image inspect failed (exit {ii["code"]}, timed_out {ii["timed_out"]})'); return finish()
        if len(parts) != 3: q['failures'].append(f'image inspect output unparseable: {parts!r}'); return finish()
        q['image'] = dict(zip(('id', 'arch', 'os'), parts))
        if parts[1] not in ('amd64', 'x86_64') or parts[2] != 'linux': q['failures'].append(f'image inspect arch/os {parts[1]}/{parts[2]}, want amd64/linux'); return finish()
        smoke = str(repo / 'scripts' / 'offline_submission_smoke.py')
        def smoke_run(label, img, inp, *extra):
            w = out / f'smoke-{label}'; ledger = w / 'case-ledger.json'
            if ledger.exists() or ledger.is_symlink():
                return {'pass': False, 'failures': [f'smoke {label}: refusing existing ledger at {ledger}']}
            w.mkdir(exist_ok=True)
            r = run(f'smoke-{label}', [sys.executable, smoke, '--image', img, '--input', str(inp), '--work', str(w), '--runtime', runtime,
                                       '--timeout', str(smoke_timeout), *extra], smoke_timeout * 4 + 120, out)
            expected = 0 if label == 'main' else 1
            if r['code'] != expected or r['timed_out']:
                return {'pass': False, 'failures': [f'smoke {label}: exit {r["code"]}, expected {expected}, timed_out {r["timed_out"]}']}
            try: return json.loads(ledger.read_text())
            except (OSError, ValueError): return {'pass': False, 'failures': [f'no ledger (exit {r["code"]})']}
        q['smoke'] = smoke_run('main', tag, inputs)
        if not q['smoke']['pass']: q['failures'].append(f'smoke failed: {q["smoke"]["failures"]}')
        # controls run on disposable copies and must each fail for their stated reason
        c_in = work / 'c-in'; shutil.copytree(inputs, c_in); empty = work / 'empty'; empty.mkdir()
        # renderer-absent: same context without renderer/, built as a separate image
        ctx2 = work / 'ctx2'; shutil.copytree(ctx, ctx2); shutil.rmtree(ctx2 / 'renderer'); (ctx2 / 'renderer').mkdir()
        tag2 = tag + '-norenderer'; tags.append(tag2)
        b2 = run('build-norenderer', [runtime, 'build', '-f', str(ctx2 / 'Dockerfile.python-submission'), '-t', tag2, str(ctx2)], build_timeout, out)
        ledgers = {'renderer-absent': smoke_run('renderer-absent', tag2, c_in) if b2['code'] == 0 else {'pass': False, 'failures': [f'control build failed (exit {b2["code"]})']},
                   'mutated-input': smoke_run('mutated-input', tag, c_in, '--control-mutate-input'),
                   'zero-input': smoke_run('zero-input', tag, empty),
                   'write-attempt': smoke_run('write-attempt', tag, c_in, '--control-rw-input')}
        for name, led in ledgers.items():
            ok, why = control_verdict(name, led); q['controls'][name] = {'ok': ok, 'why': why}
            if not ok: q['failures'].append(f'control {name}: {why}')
        # Actual-container fault cases are distinct from the four smoke controls.
        matrix_dir = out / 'failure-matrix'
        if matrix_dir.exists() or matrix_dir.is_symlink():
            q['failures'].append('refusing existing failure matrix directory')
        else:
            samples = sorted(inputs.glob('*.json'))
            if not samples:
                q['failures'].append('failure matrix requires a public input')
            else:
                mr = run('failure-matrix', [sys.executable, str(repo / 'scripts' / 'offline_failure_matrix.py'),
                         '--runtime', runtime, '--image', tag, '--image-id', q['image']['id'],
                         '--input', str(samples[0]), '--out', str(matrix_dir)], 600, out)
                if mr['code'] != 0 or mr['timed_out']:
                    q['failures'].append(f'failure matrix exit {mr["code"]}, timed_out {mr["timed_out"]}')
                try:
                    from offline_failure_matrix import evaluate_matrix
                    q['failure_matrix'] = json.loads((matrix_dir / 'matrix.json').read_text())
                    matrix_failures = evaluate_matrix(q['failure_matrix']['cases'])
                    if (not q['failure_matrix']['pass'] or q['failure_matrix']['failures'] or matrix_failures
                            or q['failure_matrix']['image_id'] != q['image']['id']):
                        q['failures'].append(f'failure matrix evidence rejected: {matrix_failures}')
                except (OSError, ValueError, KeyError, TypeError) as e:
                    q['failures'].append(f'failure matrix evidence unreadable: {e}')
        profile_dir = out / 'resource-profile'
        if profile_dir.exists() or profile_dir.is_symlink():
            q['failures'].append('refusing existing resource profile directory')
        else:
            pr = run('resource-profile', [sys.executable, str(repo / 'scripts' / 'submission_resource_probe.py'),
                     '--runtime', runtime, '--image', tag, '--image-id', q['image']['id'],
                     '--input', str(inputs), '--out', str(profile_dir),
                     '--expected', str(out / 'smoke-main' / 'case-ledger.json')], 1500, out)
            if pr['code'] != 0 or pr['timed_out']:
                q['failures'].append(f'resource profile exit {pr["code"]}, timed_out {pr["timed_out"]}')
            try:
                from submission_resource_probe import evaluate as evaluate_profile
                q['resource_profile'] = json.loads((profile_dir / 'profile.json').read_text())
                profile = q['resource_profile']
                failures = evaluate_profile(profile)
                if (not profile['pass'] or profile['failures'] or failures or profile['image_id'] != q['image']['id']
                        or profile['inputs_before'] != q['smoke']['inputs_sha256_before']
                        or profile['expected_outputs'] != q['smoke']['outputs_sha256']):
                    q['failures'].append(f'resource profile evidence rejected: {failures}')
            except (OSError, ValueError, KeyError, TypeError) as e:
                q['failures'].append(f'resource profile evidence unreadable: {e}')
        v = run('fingerprint-verify', [sys.executable, str(repo / 'submission' / 'fingerprint.py'), 'verify', str(out / 'fingerprint.json'), '--inputs', str(inputs)], 60, out)
        q['fingerprint_verify_exit'] = v['code']
        if v['code'] != 0: q['failures'].append('fingerprint verify failed')
        return finish()
    except Exception as e:
        q['failures'].append(f'orchestrator error: {type(e).__name__}: {e}')
        return finish()
    finally:
        for t_ in tags:
            try: run(f'rmi-{t_}', [runtime, 'rmi', '-f', t_], 120, out)
            except Exception: pass
        shutil.rmtree(work, True)

def main(argv=None):
    a = argparse.ArgumentParser(); sub = a.add_subparsers(dest='cmd', required=True)
    c = sub.add_parser('capability'); c.add_argument('--runtime', default='docker'); c.add_argument('--out', type=Path, default=Path('reports/of-01'))
    i = sub.add_parser('image'); i.add_argument('--runtime', default='docker'); i.add_argument('--out', type=Path, default=Path('reports/of-01'))
    i.add_argument('--upstream', type=Path, required=True); i.add_argument('--build-timeout', type=int, default=900); i.add_argument('--smoke-timeout', type=int, default=300)
    a = a.parse_args(argv)
    if a.cmd == 'image': return image(a.runtime, a.upstream, a.out, a.build_timeout, a.smoke_timeout)
    return capability(a.runtime, a.out)

if __name__ == '__main__':
    sys.exit(main())
