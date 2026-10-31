#!/usr/bin/env python3
"""Six bounded actual-container cases. Receipt unit tests are not hosted evidence."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import sys
import uuid

CASES = ('valid', 'malformed', 'unsupported', 'invalid-target', 'timeout', 'oom')
REASONS = {'malformed': 'JSONDecodeError:', 'unsupported': 'ValueError: source.elements[0].type:',
           'invalid-target': 'ValueError: target_canvas.width:'}
MEMORY = 64 * 1024 * 1024
OOM_PROBE = r'''
import json, pathlib, subprocess, sys
p = pathlib.Path('/sys/fs/cgroup/memory.events')
token = sys.argv[1]
def events():
    return {k: int(v) for k, v in (line.split() for line in p.read_text().splitlines())}
start = events()
safe = subprocess.run([sys.executable, '-c', "x=bytearray(8*1024*1024); print('SAFE_ALLOCATED',flush=True)"])
before = events()
child = subprocess.Popen([sys.executable, '-c', "import os,sys; print('ALLOCATING '+sys.argv[1]+' '+str(os.getpid()),flush=True); x=bytearray(1024*1024*1024)", token])
print('CHILD_STARTED '+token+' '+str(child.pid), flush=True)
child.wait()
after = events()
print('OOM_CONTROL ' + json.dumps({'token': token, 'child_pid': child.pid, 'memory_max': int(pathlib.Path('/sys/fs/cgroup/memory.max').read_text()), 'path': str(p), 'positive': {'returncode': safe.returncode, 'before': start, 'after': before}, 'before': before, 'after': after, 'child_returncode': child.returncode}), flush=True)
'''


def evaluate_case(name, r):
    failures = []
    if not isinstance(r, dict):
        return ['case receipt is not an object']
    if name not in CASES:
        return ['unknown case']
    for ok, reason in [
        (r.get('inspect_ok') is True, 'container inspect missing'),
        (r.get('container_identity_verified') is True, 'container identity mismatch'),
        (r.get('network') == 'none', 'runtime network is not none'),
        (r.get('input_readonly') is True, 'input mount not read-only'),
        (bool(r.get('inputs_before')) and r.get('inputs_before') == r.get('inputs_after'), 'input bytes changed or absent'),
        (r.get('image_id') == r.get('expected_image_id') and bool(r.get('image_id')), 'image identity mismatch'),
        (r.get('running') is False, 'owned container is not stopped'),
        (r.get('cleanup_exit') == 0 and r.get('absent') is True, 'owned container cleanup not proven'),
    ]:
        if not ok: failures.append(reason)
    if name == 'valid':
        if r.get('exit') != 0 or r.get('timed_out') or r.get('state_exit') != 0:
            failures.append('valid entrypoint failed')
        if sorted(r.get('output_files', [])) != ['task_output.json', 'task_output.png'] or r.get('output_problems'):
            failures.append('valid output incomplete or invalid')
    elif name in REASONS:
        if r.get('exit') != 1 or r.get('state_exit') != 1 or r.get('timed_out') or REASONS[name] not in r.get('stderr', ''):
            failures.append('negative case failed for wrong reason')
        if r.get('output_files'): failures.append('negative case wrote success-shaped outputs')
    elif name == 'timeout':
        if not r.get('timed_out') or not all(m in r.get('stdout', '') for m in ('PARENT_READY', 'CHILD_READY')):
            failures.append('timeout did not observe running parent and child')
        if r.get('kill_exit') != 0 or r.get('state_exit') != 137:
            failures.append('timeout termination not proven')
    elif name == 'oom':
        event = r.get('oom_control', {})
        if not isinstance(event, dict):
            return failures + ['OOM event receipt is not an object']
        positive = event.get('positive', {})
        before, after = event.get('before', {}), event.get('after', {})
        if not all(isinstance(v, dict) for v in (positive, before, after)):
            return failures + ['OOM event counters or positive control are not objects']
        prior, safe = positive.get('before', {}), positive.get('after', {})
        if not all(isinstance(v, dict) for v in (prior, safe)):
            return failures + ['OOM positive counters are not objects']
        event_proven = (r.get('exit') == r.get('state_exit') == 0
                        and event.get('path') == '/sys/fs/cgroup/memory.events'
                        and event.get('child_returncode') == -9
                        and event.get('token') == r.get('container') and bool(r.get('container'))
                        and type(event.get('child_pid')) is int and event['child_pid'] > 1
                        and event.get('memory_max') == MEMORY
                        and f"CHILD_STARTED {event.get('token')} {event.get('child_pid')}" in r.get('stdout', '').splitlines()
                        and f"ALLOCATING {event.get('token')} {event.get('child_pid')}" in r.get('stdout', '').splitlines()
                        and type(before.get('oom_kill')) is int and type(after.get('oom_kill')) is int
                        and after['oom_kill'] > before['oom_kill'] == 0
                        and positive.get('returncode') == 0
                        and type(prior.get('oom_kill')) is int and type(safe.get('oom_kill')) is int and prior.get('oom_kill') == safe.get('oom_kill') == before['oom_kill']
                        and 'SAFE_ALLOCATED' in r.get('stdout', ''))
        if r.get('timed_out') or not event_proven:
            failures.append('actual container OOM not proven')
        if r.get('memory') != MEMORY or r.get('memory_swap') != MEMORY or 'ALLOCATING' not in r.get('stdout', ''):
            failures.append('bounded allocation control not proven')
    return failures


def evaluate_matrix(cases):
    failures = []
    if set(cases) != set(CASES): failures.append('case set is incomplete or unexpected')
    for name, record in cases.items():
        failures.extend(f'{name}: {why}' for why in evaluate_case(name, record))
    return failures


def hashes(directory):
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(directory.iterdir()) if p.is_file()}


def execute_case(runtime, image, image_id, task, name, out):
    # Reuse bounded process-group execution and retain every actual command receipt.
    from qualify_python_submission import run
    out.mkdir(); inp = out / 'input'; inp.mkdir(); output = out / 'output'; output.mkdir()
    fixture = copy.deepcopy(task)
    if name == 'unsupported': fixture['source']['elements'][0]['type'] = 'unsupported-control'
    if name == 'invalid-target': fixture['target_canvas']['width'] = 0
    (inp / 'task.json').write_text('{' if name == 'malformed' else json.dumps(fixture))
    before = hashes(inp); container = 'reflow-fault-' + uuid.uuid4().hex
    limit = MEMORY if name == 'oom' else 512 * 1024 * 1024
    args = [runtime, 'run', '--name', container, '--network', 'none', '--memory', str(limit), '--memory-swap', str(limit),
            '--pids-limit', '64', '-v', f'{inp.resolve()}:/app/input:ro', '-v', f'{output.resolve()}:/app/output']
    timeout = 60
    if name == 'timeout':
        code = "import subprocess,sys,time; subprocess.Popen([sys.executable,'-c',\"import time; print('CHILD_READY',flush=True); time.sleep(300)\"]); print('PARENT_READY',flush=True); time.sleep(300)"
        args += ['--entrypoint', 'python', image, '-c', code]; timeout = 5
    elif name == 'oom':
        args += ['--entrypoint', 'python', image, '-c', OOM_PROBE, container]; timeout = 30
    else:
        args += [image]
    r = {'name': name, 'container': container, 'expected_image_id': image_id, 'inputs_before': before,
         'inspect_ok': False, 'input_readonly': False, 'running': None, 'cleanup_exit': None, 'absent': False, 'kill_exit': None}
    try:
        execution = run('run', args, timeout, out)
        r.update(exit=execution['code'], timed_out=execution['timed_out'], duration_s=execution['duration_s'],
                 stdout=(out/'run.stdout').read_text(), stderr=(out/'run.stderr').read_text())
        if name == 'oom':
            for line in r['stdout'].splitlines():
                if line.startswith('OOM_CONTROL '):
                    r['oom_control'] = json.loads(line.removeprefix('OOM_CONTROL '))
        if execution['timed_out']:
            killed = run('kill', [runtime, 'kill', container], 10, out); r['kill_exit'] = killed['code']
            run('wait', [runtime, 'wait', container], 10, out)
        inspected = run('inspect', [runtime, 'inspect', container], 10, out)
        if inspected['code'] == 0 and not inspected['timed_out']:
            info = json.loads((out/'inspect.stdout').read_text())[0]
            r.update(inspect_ok=True, container_identity_verified=info.get('Name') == '/'+container, image_id=info['Image'], network=info['HostConfig']['NetworkMode'],
                     memory=info['HostConfig']['Memory'], memory_swap=info['HostConfig']['MemorySwap'],
                     running=info['State']['Running'], oom_killed=info['State']['OOMKilled'], state_exit=info['State']['ExitCode'],
                     input_readonly=any(m['Destination']=='/app/input' and m['RW'] is False for m in info['Mounts']))
    finally:
        cleanup = run('remove', [runtime, 'rm', '-f', container], 10, out); r['cleanup_exit'] = cleanup['code']
        absent = run('absence', [runtime, 'inspect', container], 10, out)
        r['absent'] = absent['code'] == 1 and not absent['timed_out'] and any(t in (out/'absence.stderr').read_text().lower() for t in ('no such object', 'no such container'))  # Docker 29 prints lower case
        r['inputs_after'] = hashes(inp); r['outputs_sha256'] = hashes(output); r['output_files'] = sorted(p.name for p in output.iterdir()); r['output_problems'] = []
        if name == 'valid':
            try:
                actual = json.loads((output/'task_output.json').read_text())
                if [e['id'] for e in actual['elements']] != [e['id'] for e in task['source']['elements']]: r['output_problems'].append('source IDs changed')
                if not (output/'task_output.png').read_bytes().startswith(b'\x89PNG\r\n\x1a\n'): r['output_problems'].append('not PNG')
            except (OSError, ValueError, KeyError, TypeError) as e: r['output_problems'].append(str(e))
        r['failures'] = evaluate_case(name, r); r['pass'] = not r['failures']
        (out/'case.json').write_text(json.dumps(r, indent=2)+'\n')
    return r


def qualify(runtime, image, image_id, input_file, out):
    out = Path(out)
    if out.exists() or out.is_symlink(): raise ValueError(f'refusing existing matrix directory: {out}')
    out.mkdir(parents=True)
    result = {'image_id': image_id, 'cases': {}, 'pass': False, 'failures': []}
    try:
        task = json.loads(Path(input_file).read_text())
        for name in CASES:
            try: result['cases'][name] = execute_case(runtime, image, image_id, task, name, out/name)
            except Exception as e: result['cases'][name] = {'pass': False, 'error': f'{type(e).__name__}: {e}'}
        result['failures'] = evaluate_matrix(result['cases'])
    except Exception as e: result['failures'].append(f'{type(e).__name__}: {e}')
    result['pass'] = not result['failures']
    (out/'matrix.json').write_text(json.dumps(result, indent=2)+'\n')
    return 0 if result['pass'] else 1


def main():
    p=argparse.ArgumentParser();p.add_argument('--runtime',default='docker');p.add_argument('--image',required=True);p.add_argument('--image-id',required=True);p.add_argument('--input',required=True);p.add_argument('--out',required=True)
    a=p.parse_args();return qualify(a.runtime,a.image,a.image_id,a.input,a.out)

if __name__ == '__main__': sys.exit(main())
