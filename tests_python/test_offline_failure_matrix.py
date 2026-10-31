"""Receipt controls for the real-container matrix; these tests are not container proof."""
import copy
import unittest
from scripts.offline_failure_matrix import CASES, evaluate_case, evaluate_matrix


def good(name):
    r = {'container':'unique-test-token','container_identity_verified':True,'exit': 0 if name == 'valid' else 137 if name in ('timeout', 'oom') else 1,
            'timed_out': name == 'timeout', 'stdout': 'PARENT_READY CHILD_READY ALLOCATING',
            'stderr': {'malformed': 'json.decoder.JSONDecodeError:', 'unsupported': "ValueError: source.elements[0].type: expected one of", 'invalid-target': 'ValueError: target_canvas.width: expected integer'}.get(name, ''),
            'image_id': 'sha256:abc', 'expected_image_id': 'sha256:abc', 'network': 'none',
            'running': False, 'oom_killed': name == 'oom', 'state_exit': 137 if name in ('timeout', 'oom') else 0 if name == 'valid' else 1,
            'memory': 67108864 if name == 'oom' else 536870912, 'memory_swap': 67108864 if name == 'oom' else 536870912,
            'input_readonly': True, 'inputs_before': {'task.json': 'abc'}, 'inputs_after': {'task.json': 'abc'},
            'kill_exit': 0 if name == 'timeout' else None, 'cleanup_exit': 0, 'absent': True,
            'inspect_ok': True, 'output_problems': [], 'output_files': ['task_output.json', 'task_output.png'] if name == 'valid' else []}
    if name == 'oom':
        r.update(exit=0,state_exit=0,oom_killed=False,stdout='SAFE_ALLOCATED\nCHILD_STARTED unique-test-token 12\nALLOCATING unique-test-token 12',
            oom_control={'token':'unique-test-token','child_pid':12,'memory_max':67108864,'path':'/sys/fs/cgroup/memory.events','positive':{'returncode':0,'before':{'oom_kill':0},'after':{'oom_kill':0}},'before':{'oom_kill':0},'after':{'oom_kill':1},'child_returncode':-9})
    return r


class Verdict(unittest.TestCase):
    def test_all_six_correct_receipts_pass(self):
        self.assertEqual(evaluate_matrix({n: good(n) for n in CASES}), [])

    def test_missing_extra_and_empty_case_sets_fail(self):
        for cases in ({}, {'valid': good('valid')}, {**{n:good(n) for n in CASES}, 'extra':good('valid')}):
            self.assertTrue(evaluate_matrix(cases))

    def test_wrong_error_reason_or_success_does_not_count_as_negative(self):
        for name in ('malformed', 'unsupported', 'invalid-target'):
            for key, value in [('stderr','Docker daemon unavailable'),('exit',0),('timed_out',True),('output_files',['task_output.json'])]:
                r=good(name);r[key]=value
                with self.subTest(name=name,key=key):self.assertTrue(evaluate_case(name,r))

    def test_exit137_alone_is_not_oom_and_memory_limit_must_be_enforced(self):
        for key,value in [('oom_control',{}),('memory',0),('memory_swap',-1),('stdout',''),('timed_out',True),('state_exit',1)]:
            r=good('oom');r[key]=value
            with self.subTest(key=key):self.assertTrue(evaluate_case('oom',r))

    def test_cgroup_oom_event_with_killed_child_is_independent_resource_evidence(self):
        r=good('oom');r.update(exit=0,state_exit=0,oom_killed=False,
            stdout='SAFE_ALLOCATED\nCHILD_STARTED unique-test-token 12\nALLOCATING unique-test-token 12',
            oom_control={'token':'unique-test-token','child_pid':12,'memory_max':67108864,'path':'/sys/fs/cgroup/memory.events','positive':{'returncode':0,'before':{'oom_kill':0},'after':{'oom_kill':0}},'before':{'oom_kill':0},'after':{'oom_kill':1},'child_returncode':-9})
        self.assertEqual(evaluate_case('oom',r),[])

    def test_cgroup_event_requires_increment_killed_child_and_safe_positive_control(self):
        r=good('oom');r.update(exit=0,state_exit=0,oom_killed=False,stdout='SAFE_ALLOCATED\nCHILD_STARTED unique-test-token 12\nALLOCATING unique-test-token 12',
            oom_control={'token':'unique-test-token','child_pid':12,'memory_max':67108864,'path':'/sys/fs/cgroup/memory.events','positive':{'returncode':0,'before':{'oom_kill':0},'after':{'oom_kill':0}},'before':{'oom_kill':0},'after':{'oom_kill':1},'child_returncode':-9})
        for mutation in ('no-increment','child-success','missing-counter','wrong-path','positive-failed','positive-oom','wrong-token','wrong-pid','wrong-limit','stale-counter'):
            x=copy.deepcopy(r);e=x['oom_control']
            if mutation=='no-increment':e['after']['oom_kill']=0
            elif mutation=='child-success':e['child_returncode']=0
            elif mutation=='missing-counter':e['before']={}
            elif mutation=='wrong-path':e['path']='/fake'
            elif mutation=='positive-failed':e['positive']['returncode']=137
            elif mutation=='positive-oom':e['positive']['before']['oom_kill']=1
            elif mutation=='wrong-token':e['token']='reused'
            elif mutation=='wrong-pid':e['child_pid']=13
            elif mutation=='wrong-limit':e['memory_max']=0
            else:e['before']['oom_kill']=1
            with self.subTest(mutation=mutation):self.assertTrue(evaluate_case('oom',x))

    def test_malformed_oom_receipt_shapes_and_counter_types_fail_without_raising(self):
        paths = [('oom_control',), ('oom_control','positive'), ('oom_control','before'),
                 ('oom_control','after'), ('oom_control','positive','before'), ('oom_control','positive','after')]
        for path in paths:
            for value in (None, [], 'malformed'):
                r=good('oom'); node=r
                for key in path[:-1]: node=node[key]
                node[path[-1]]=value
                with self.subTest(path=path,value=value):self.assertTrue(evaluate_case('oom',r))
        for path in paths[2:]:
            for value in (True, 1.0, '1'):
                r=good('oom');node=r
                for key in path:node=node[key]
                node['oom_kill']=value
                with self.subTest(path=path,value=value):self.assertTrue(evaluate_case('oom',r))
        self.assertTrue(evaluate_case('oom', None))

    def test_timeout_requires_started_child_kill_and_stopped_state(self):
        for key,value in [('timed_out',False),('stdout','PARENT_READY'),('kill_exit',1),('running',True),('state_exit',0)]:
            r=good('timeout');r[key]=value
            with self.subTest(key=key):self.assertTrue(evaluate_case('timeout',r))

    def test_every_case_requires_actual_inspection_isolation_input_and_cleanup(self):
        for name in CASES:
            for key,value in [('container_identity_verified',False),('inspect_ok',False),('network','bridge'),('input_readonly',False),('inputs_after',{}),('cleanup_exit',1),('absent',False),('image_id','sha256:other'),('running',True)]:
                r=good(name);r[key]=value
                with self.subTest(name=name,key=key):self.assertTrue(evaluate_case(name,r))

    def test_positive_control_requires_complete_outputs_and_success(self):
        for key,value in [('exit',1),('output_files',[]),('output_problems',['IDs changed']),('timed_out',True)]:
            r=good('valid');r[key]=value
            with self.subTest(key=key):self.assertTrue(evaluate_case('valid',r))

    def test_unknown_case_is_refused(self):
        self.assertTrue(evaluate_case('unknown',good('valid')))


class DriverControls(unittest.TestCase):
    def test_timeout_is_killed_inspected_removed_and_verified_absent(self):
        import tempfile
        from pathlib import Path
        from unittest.mock import patch
        from scripts.offline_failure_matrix import execute_case
        import sys
        sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
        import qualify_python_submission as q
        import json
        calls = []
        def run(label, args, timeout, out):
            calls.append((label,args,timeout)); so='';se='';code=0
            if label == 'run': so='PARENT_READY CHILD_READY';code=-9
            if label == 'inspect':
                so=json.dumps([{'Name':'/'+args[-1],'Image':'sha256:abc','HostConfig':{'NetworkMode':'none','Memory':536870912,'MemorySwap':536870912},'State':{'Running':False,'OOMKilled':False,'ExitCode':137},'Mounts':[{'Destination':'/app/input','RW':False}]}])
            if label == 'absence': code=1;se='Error: No such object'
            (out/(label+'.stdout')).write_text(so);(out/(label+'.stderr')).write_text(se)
            return {'code':code,'timed_out':label=='run','duration_s':0.01}
        with tempfile.TemporaryDirectory() as d, patch.object(q,'run',side_effect=run):
            r=execute_case('docker','image','sha256:abc',{'source':{'elements':[]},'target_canvas':{}},'timeout',Path(d)/'case')
        self.assertTrue(r['pass'],r)
        self.assertEqual([x[0] for x in calls],['run','kill','wait','inspect','remove','absence'])
        self.assertIn('--memory',calls[0][1]);self.assertIn('--pids-limit',calls[0][1])

    def test_absence_proof_accepts_docker_wordings_and_rejects_other_errors(self):
        """#35: Docker 29 prints 'error: no such object: <name>' in lower case; removal must still be proven. Other exit-1 errors are not proof."""
        import tempfile, json, sys
        from pathlib import Path
        from unittest.mock import patch
        from scripts.offline_failure_matrix import execute_case
        sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
        import qualify_python_submission as q
        cases = {'Error: No such object: c': True, 'error: no such object: c': True,
                 'Error response from daemon: No such container: c': True,
                 'error during connect: permission denied': False, '': False}
        for text, gone in cases.items():
            def run(label, args, timeout, out, text=text):
                so, se, code = '', '', 0
                if label == 'run': so = 'PARENT_READY CHILD_READY'; code = -9
                if label == 'inspect':
                    so = json.dumps([{'Name': '/' + args[-1], 'Image': 'sha256:abc', 'HostConfig': {'NetworkMode': 'none', 'Memory': 536870912, 'MemorySwap': 536870912},
                                      'State': {'Running': False, 'OOMKilled': False, 'ExitCode': 137}, 'Mounts': [{'Destination': '/app/input', 'RW': False}]}])
                if label == 'absence': code = 1; se = text
                (out / (label + '.stdout')).write_text(so); (out / (label + '.stderr')).write_text(se)
                return {'code': code, 'timed_out': label == 'run', 'duration_s': 0.01}
            with self.subTest(stderr=text), tempfile.TemporaryDirectory() as d, patch.object(q, 'run', side_effect=run):
                r = execute_case('docker', 'image', 'sha256:abc', {'source': {'elements': []}, 'target_canvas': {}}, 'timeout', Path(d) / 'case')
                self.assertIs(r['absent'], gone, r)
                self.assertIs(r['pass'], gone, r)

    def test_existing_matrix_output_is_never_overwritten(self):
        import tempfile
        from pathlib import Path
        from scripts.offline_failure_matrix import qualify
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);(p/'matrix.json').write_text('old')
            with self.assertRaisesRegex(ValueError,'refusing existing'):qualify('docker','image','sha256:abc','unused',p)
            self.assertEqual((p/'matrix.json').read_text(),'old')
