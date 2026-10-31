#!/usr/bin/env python3
"""Versioned fingerprint of the exact packaging inputs. Stdlib only, host-only.

  fingerprint.py write --inputs DIR OUT.json     record engine/*.py, packaging files, base digest, upstream pin, public inputs
  fingerprint.py verify MANIFEST --inputs DIR    exit 1 and name every drifted, missing or unexpected key

Repo root is the parent of this file's directory. Any difference fails; there is no tolerance and no fallback."""
import argparse, hashlib, json, re, subprocess, sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SCHEMA_VERSION = 1
PACKAGING = ['Dockerfile.python-submission', 'requirements-python-submission.txt', 'constraints-python-submission.txt', 'submission/assemble_context.sh']

def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()

def one(pattern: str, text: str, what: str) -> str:
    m = re.search(pattern, text, re.M)
    if not m: raise SystemExit(f'cannot find {what}')
    return m.group(1)

def git(*a) -> str:
    try: return subprocess.run(['git', '-C', str(REPO), *a], capture_output=True, text=True, check=True).stdout.strip()
    except Exception: return 'unknown'

def collect(inputs: Path) -> dict:
    if not inputs.is_dir(): raise SystemExit(f'input dir missing: {inputs}')
    ins = sorted(inputs.glob('*.json'))
    if not ins: raise SystemExit(f'no public input cases in {inputs}')
    engine = sorted((REPO / 'engine').glob('*.py'))
    if not engine: raise SystemExit('no engine modules')
    files = {f'engine/{p.name}': sha(p) for p in engine}
    for f in PACKAGING:
        if not (REPO / f).is_file(): raise SystemExit(f'missing packaging file: {f}')
        files[f] = sha(REPO / f)
    return {
        'schema_version': SCHEMA_VERSION,
        'base_image_digest': one(r'^FROM .*@(sha256:[0-9a-f]{64})\b', (REPO / PACKAGING[0]).read_text(), 'base image digest in Dockerfile.python-submission FROM'),
        'upstream_pin': one(r'^PIN=([0-9a-f]{40})$', (REPO / PACKAGING[3]).read_text(), 'PIN in assemble_context.sh'),
        'files': files,
        'inputs': {p.name: sha(p) for p in ins},
        'git_head': git('rev-parse', 'HEAD'),
        'git_dirty': bool(git('status', '--porcelain')),
    }

# git_head/git_dirty are provenance notes, not drift keys: committing the manifest itself must not invalidate it.
def diff(old: dict, new: dict) -> list:
    d = []
    for k in ('schema_version', 'base_image_digest', 'upstream_pin'):
        if old.get(k) != new[k]: d.append(f'{k}: manifest {old.get(k)!r} != tree {new[k]!r}')
    for k in ('files', 'inputs'):
        o, n = old.get(k), new[k]
        if not isinstance(o, dict): d.append(f'{k}: missing in manifest'); continue
        for name in sorted(set(o) | set(n)):
            if name not in n: d.append(f'{k}/{name}: in manifest, missing in tree')
            elif name not in o: d.append(f'{k}/{name}: unexpected, not in manifest')
            elif o[name] != n[name]: d.append(f'{k}/{name}: hash changed')
    return d

def main(argv=None) -> int:
    a = argparse.ArgumentParser(); sub = a.add_subparsers(dest='cmd', required=True)
    w = sub.add_parser('write'); w.add_argument('out', type=Path); w.add_argument('--inputs', required=True, type=Path)
    v = sub.add_parser('verify'); v.add_argument('manifest', type=Path); v.add_argument('--inputs', required=True, type=Path)
    a = a.parse_args(argv)
    cur = collect(a.inputs)
    if a.cmd == 'write':
        a.out.write_text(json.dumps(cur, indent=2, sort_keys=True) + '\n'); print(f'wrote {a.out}'); return 0
    try: old = json.loads(a.manifest.read_text())
    except Exception as e: print(f'cannot read manifest: {e}', file=sys.stderr); return 1
    if not isinstance(old, dict): print('manifest is not an object', file=sys.stderr); return 1
    d = diff(old, cur)
    for line in d: print('DRIFT ' + line, file=sys.stderr)
    print('OK' if not d else f'FAIL: {len(d)} drift(s)'); return 1 if d else 0

if __name__ == '__main__':
    sys.exit(main())
