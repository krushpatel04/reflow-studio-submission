#!/usr/bin/env python3
"""Read-only RF04 inventory/preflight. Does not execute, render or grade designs."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sys


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def build_report(manifest_path, expected_sha256, bundle):
    """Freeze a pinned inventory, then mark each task blocked or unattempted.

    Invalid metadata raises ValueError; unavailable payloads remain explicit rows.
    Availability never establishes source fidelity, execution or quality.
    """
    raw = Path(manifest_path).read_bytes()
    if not re.fullmatch(r'[0-9a-f]{64}', expected_sha256) or sha256(raw) != expected_sha256:
        raise ValueError('manifest SHA256 does not match the required pin')
    manifest = json.loads(raw)
    files, sources, tasks = {}, [], []
    identities, source_ids = set(), set()

    def descriptor(d, namespace):
        name = d['file']; p = PurePosixPath(name)
        if (not isinstance(name, str) or not name or p.is_absolute() or '..' in p.parts
                or '\\' in name or str(p) != name or len(p.parts) < 2 or p.parts[0] != namespace):
            raise ValueError(f'invalid or mixed-version payload path: {name!r}')
        if type(d['bytes']) is not int or d['bytes'] < 0 or not re.fullmatch(r'[0-9a-f]{64}', d['sha256']):
            raise ValueError(f'invalid payload hash/size: {name}')
        record = {'sha256': d['sha256'], 'bytes': d['bytes']}
        if name in files and files[name] != record:
            raise ValueError(f'conflicting descriptor: {name}')
        files[name] = record
        return name

    try:
        for version in manifest['versions']:
            version_id = version['version']; producer = version['producer_commit']
            if not isinstance(version_id, str) or not version_id or not re.fullmatch(r'[0-9a-f]{40}', producer):
                raise ValueError('invalid version/producer identity')
            for source in version['sources']:
                namespace = PurePosixPath(source['converted']['file']).parts[0]
                layout = source['layout_id']
                if not isinstance(layout, str) or not layout:
                    raise ValueError('invalid layout identity')
                sid = json.dumps([version_id, namespace, layout], separators=(',', ':'))
                if sid in source_ids:
                    raise ValueError('duplicate source identity')
                source_ids.add(sid)
                original = descriptor(source['original'], namespace)
                converted = descriptor(source['converted'], namespace)
                deps = [original, converted]
                for blob in source['blobs']:
                    if not blob['kinds'] or any(not k.startswith(('asset-', 'font-')) for k in blob['kinds']):
                        raise ValueError('invalid resource kind')
                    deps.append(descriptor(blob, namespace))
                sources.append({'source_id':sid, 'version':version_id, 'namespace':namespace,
                                'producer_commit':producer, 'layout_id':layout,
                                'original_sha256':files[original]['sha256'],
                                'source_sha256':files[converted]['sha256']})
                if not source['tasks']:
                    raise ValueError('source has no expected tasks')
                for task in source['tasks']:
                    tid = task['task_id']
                    if not isinstance(tid, str) or not tid:
                        raise ValueError('invalid task identity')
                    identity = json.dumps([sid, tid], separators=(',', ':'))
                    if identity in identities:
                        raise ValueError('duplicate task identity')
                    identities.add(identity)
                    path = descriptor(task, namespace)
                    tasks.append({'identity':identity, 'task_id':tid, 'source_id':sid,
                                  'task_sha256':files[path]['sha256'], 'task_file':path,
                                  'target':task.get('target'), 'target_canvas':task.get('target_canvas'),
                                  'dependencies':sorted(set(deps + [path]))})
        if not tasks:
            raise ValueError('manifest has no expected tasks')
    except (KeyError, TypeError, IndexError, AttributeError) as e:
        raise ValueError(f'malformed manifest: {e}') from e

    # Validate all metadata before reading any payload. Never follow a payload symlink.
    root = Path(bundle).resolve()
    observations = {}
    for name, declared in sorted(files.items()):
        p = root.joinpath(*PurePosixPath(name).parts)
        try:
            if any(x.is_symlink() for x in (p, *p.parents) if x != root and root in x.parents):
                raise OSError('symlink payload path refused')
            if not p.is_file():
                raise OSError('missing or non-file payload')
            data = p.read_bytes()
            if len(data) != declared['bytes']:
                raise OSError('byte size mismatch')
            if sha256(data) != declared['sha256']:
                raise OSError('sha256 mismatch')
            observations[name] = {'status':'verified', **declared}
        except OSError as e:
            observations[name] = {'status':'blocked', 'reason':str(e), **declared}
    for row in tasks:
        row['blocked_inputs'] = [{'file':name, 'reason':observations[name]['reason']}
                                 for name in row['dependencies'] if observations[name]['status']=='blocked']
        row.update(outcome='blocked' if row['blocked_inputs'] else 'unattempted',
                   geometry='unmeasured', clipping='unmeasured', render='unrendered',
                   quality='unreviewed', source_fidelity='unchecked')
    outcomes = dict(sorted(Counter(t['outcome'] for t in tasks).items()))
    return {'schema_version':1, 'phase':'input-preflight', 'manifest_sha256':expected_sha256,
            'manifest_status':manifest.get('status'), 'execution_complete':False,
            'inputs_complete':all(o['status']=='verified' for o in observations.values()),
            'sources':sources, 'tasks':tasks, 'payloads':observations,
            'summary':{'expected_tasks':len(tasks), 'reported_tasks':len(tasks), 'outcomes':outcomes,
                       'geometry_measured':0, 'clipping_measured':0, 'real_renders':0,
                       'fallback_renders':0, 'quality_reviewed':0}}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--manifest-sha256', required=True)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        output = args.out.resolve(); root = args.bundle.resolve()
        if output == root or root in output.parents or output == args.manifest.resolve():
            raise ValueError('report output must be outside the bundle and manifest')
        if args.out.exists() or args.out.is_symlink():
            raise ValueError('refusing existing report evidence')
        report = build_report(args.manifest, args.manifest_sha256, args.bundle)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        with args.out.open('x') as handle:
            json.dump(report, handle, indent=2); handle.write('\n')
        return 0 if report['inputs_complete'] else 1
    except (OSError, ValueError) as e:
        print(f'RF04 preflight: {e}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
