"""Host protocol tests; fake engines/synthetic receipts are not measured canonical results."""
import copy,json,sys,tempfile,time,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'scripts'))

class WorkloadFamilies(unittest.TestCase):
    def test_families_are_deterministic_bounded_and_preserve_seed(self):
        import submission_workload_profile as m
        seed={'source':{'canvas':{'width':1080,'height':1080},'elements':[{'id':'headline','type':'text','content':'Hello','font_family':'Solstice Serif','font_size':24,'font_weight':'bold','x':1,'y':2,'width':100,'height':40,'z_index':0,'color':'#ffffff'}]},'target_canvas':{'width':1080,'height':1350}}
        before=copy.deepcopy(seed)
        a=m.synthetic_families(seed);self.assertEqual(a,m.synthetic_families(seed));self.assertEqual(seed,before)
        self.assertEqual(set(a),{'dense16','dense100','tall','wide','invalid-target','infeasible'})
        for name,n,length in [('dense16',16,128),('dense100',100,1000)]:
            self.assertEqual(a[name]['target_canvas'],{'width':400,'height':600},'dense case must exercise resize, not identity')
            els=a[name]['source']['elements'];self.assertEqual(len(els),n);self.assertEqual(len({e['id'] for e in els}),n)
            self.assertTrue(all(len(e['content'])==length and e['font_family']=='Solstice Serif' for e in els))
        self.assertEqual(a['tall']['target_canvas'],{'width':128,'height':2048})
        self.assertEqual(a['wide']['target_canvas'],{'width':2048,'height':128})

class PhaseTiming(unittest.TestCase):
    def test_real_delay_is_attributed_to_named_function_and_nested_time_not_summed(self):
        import workload_phase_probe as p
        def parse():time.sleep(.025)
        def layout():parse()
        result=p.profile_call(layout,{'parse':parse,'layout':layout,'unused':lambda:None})
        self.assertGreaterEqual(result['phases']['parse']['cumulative_s'],.020)
        self.assertGreaterEqual(result['phases']['layout']['cumulative_s'],.020)
        self.assertLess(result['elapsed_s'],sum(result['phases'][n]['cumulative_s'] for n in ['parse','layout']))
        self.assertFalse(result['phases']['unused']['observed']);self.assertIsNone(result['phases']['unused']['cumulative_s'])
    def test_exception_retains_partial_profile_and_error(self):
        import workload_phase_probe as p
        def fail():time.sleep(.01);raise ValueError('declared failure')
        r=p.profile_call(fail,{'parse':fail});self.assertEqual(r['entry_exit'],1);self.assertIn('declared failure',r['error']);self.assertTrue(r['phases']['parse']['observed'])

class PairOracle(unittest.TestCase):
    def good(self):
        def row():return {'exit':0,'timed_out':False,'image_id':'image','network':'none','input_readonly':True,'running':False,'cleanup_exit':0,'absent':True,'inputs_before':{'task.json':'in'},'inputs_after':{'task.json':'in'},'outputs':{'task_output.json':'json','task_output.png':'png'},'output_problems':[],'memory':536870912,'memory_swap':536870912,'name':'a','state_exit':0,'outer_s':.2,'pids_limit':64}
        a=row();b=row();b['name']='b';b['phase']={'entry_exit':0,'elapsed_s':.1,'phases':{'parse':{'observed':True,'calls':1,'self_s':.001,'cumulative_s':.001}},'real':1,'fallback':0,'error':None}
        return a,b
    def test_matched_positive(self):
        import submission_workload_profile as m
        self.assertEqual(m.evaluate_pair(*self.good(),'image'),[])
    def test_byte_change_missing_phase_bad_metric_or_cleanup_fail(self):
        import submission_workload_profile as m
        changes=[lambda a,b:b.update(outputs={}),lambda a,b:b['phase'].update(phases={}),lambda a,b:b['phase']['phases']['parse'].update(cumulative_s=float('nan')),lambda a,b:b.update(absent=False),lambda a,b:b.update(image_id='wrong'),lambda a,b:b.update(inputs_after={}),lambda a,b:b.update(timed_out=True)]
        for change in changes:
            a,b=self.good();change(a,b);self.assertTrue(m.evaluate_pair(a,b,'image'))
    def test_actual_pid_exit_and_missing_resource_mount_checks(self):
        import submission_workload_profile as m
        for key,value in [('pids_limit',0),('state_exit',1)]:
            a,b=self.good();b[key]=value;self.assertTrue(m.evaluate_pair(a,b,'image'),key)
        a,b=self.good();a.update(diagnostic='missing-assets',empty_dir='/owned/empty',mounts=[{'Source':'/owned/empty','Destination':'/app/brand_kit/assets','RW':False}])
        self.assertEqual(m.container_failures(a,'image'),[])
        for key,value in [('Source','/wrong'),('Destination','/app/brand_kit/fonts'),('RW',True)]:
            bad=copy.deepcopy(a);bad['mounts'][0][key]=value;self.assertTrue(m.container_failures(bad,'image'),key)

    def test_delay_control_wrong_attribution_rejected(self):
        import submission_workload_profile as m
        a,b=self.good();b['phase']['phases']['parse']['cumulative_s']=.051
        self.assertEqual(m.evaluate_pair(a,b,'image',delay_phase='parse'),[])
        b['phase']['phases']['layout']=b['phase']['phases'].pop('parse')
        self.assertTrue(m.evaluate_pair(a,b,'image',delay_phase='parse'))
    def test_missing_resource_silent_success_is_gap_not_accepted_failure(self):
        import submission_workload_profile as m
        a,b=self.good();a.update(stdout='',stderr='')
        self.assertEqual(m.diagnostic_verdict('missing-assets',a,b),'silent-success-unaccepted')
        a.update(exit=1,stderr='FileNotFoundError: missing asset')
        self.assertEqual(m.diagnostic_verdict('missing-assets',a,b),'explicit-error')


class ReportEvidence(unittest.TestCase):
    def test_instrumentation_failure_is_not_merely_a_behavioral_finding(self):
        import submission_workload_profile as m
        for mutation in ['outputs','parse','nonfinite','exit']:
            r=complete_report();p=r['pairs'][0];b=p['instrumented']
            if mutation=='outputs':b['outputs']['task_output.png']='changed'
            elif mutation=='parse':b['phase']['phases'].pop('parse')
            elif mutation=='nonfinite':b['phase']['phases']['parse']['cumulative_s']=float('nan')
            else:b.update(exit=1,state_exit=1)
            p['failures']=m.evaluate_pair(p['ordinary'],b,r['image_id'])
            self.assertTrue(m.evaluate_report(r),mutation)


class DiagnosticSpecificity(unittest.TestCase):
    def test_unrelated_warning_or_wrong_condition_never_satisfies_diagnostic(self):
        import submission_workload_profile as m
        incidental = 'Fontconfig warning: "05-reset-dirs-sample.conf", line 6: unknown element "reset-dirs"'
        for family in ('missing-assets', 'missing-fonts', 'invalid-target', 'infeasible'):
            for message in (incidental, 'warning: diagnostics enabled', 'Error loading optional telemetry'):
                with self.subTest(family=family, message=message):
                    ordinary = {'exit': 0, 'timed_out': False, 'stdout': '[task.json] OK', 'stderr': message}
                    self.assertEqual(m.diagnostic_verdict(family, ordinary, {}), 'silent-success-unaccepted')
        ordinary = {'exit': 0, 'stderr': 'RuntimeWarning: text_fit: no candidate meets the floor for ids headline'}
        self.assertEqual(m.diagnostic_verdict('missing-assets', ordinary, {}), 'silent-success-unaccepted')

    def test_condition_specific_findings_are_valid_on_either_ordinary_stream(self):
        import submission_workload_profile as m
        messages = {
            'missing-assets': "Missing asset 'solstice_logo_lockup.png' for element 'logo' - rendered a placeholder.",
            'missing-fonts': 'RuntimeWarning: text_fit: unsupported text id headline: no exact font face; keeping uniform scaling',
            'invalid-target': 'ValueError: target_canvas.width must be finite and positive',
            'infeasible': 'RuntimeWarning: text_fit: no candidate meets the floor for ids headline,cta',
        }
        for family, message in messages.items():
            for stream in ('stdout', 'stderr'):
                with self.subTest(family=family, stream=stream):
                    self.assertEqual(m.diagnostic_verdict(family, {'exit': 0, stream: message}, {}), 'visible-findings')

    def test_probe_only_findings_and_unfinished_invocations_are_not_visible_success(self):
        import submission_workload_profile as m
        probe = {'phase': {'renderer_findings': ["Missing asset 'logo.png' for element 'logo'"]}}
        self.assertEqual(m.diagnostic_verdict('missing-assets', {'exit': 0}, probe), 'silent-success-unaccepted')
        self.assertEqual(m.diagnostic_verdict('missing-assets', {'exit': None}, probe), 'unclassified')
        self.assertEqual(m.diagnostic_verdict('missing-assets', {'exit': -9, 'timed_out': True}, probe), 'bounded-timeout')
        self.assertEqual(m.diagnostic_verdict('missing-assets', {'exit': 1}, probe), 'explicit-error')

    def test_report_cannot_hide_one_diagnostic_gap_behind_another(self):
        import submission_workload_profile as m
        report = complete_report()
        self.assertEqual(m.evaluate_report(report), [])
        report['behavioral_findings'] = [f for f in report['behavioral_findings'] if f['family'] != 'missing-assets']
        self.assertTrue(m.evaluate_report(report), 'remaining findings must not conceal the removed asset gap')

    def test_report_rejects_invented_or_duplicate_behavioral_findings(self):
        import submission_workload_profile as m
        for mutation in ('duplicate', 'wrong_verdict'):
            report = complete_report()
            if mutation == 'duplicate': report['behavioral_findings'].append(copy.deepcopy(report['behavioral_findings'][0]))
            else: report['behavioral_findings'][0]['verdict'] = 'invented'
            self.assertTrue(m.evaluate_report(report), mutation)

    def test_report_preserves_consistent_bounded_timeouts_as_behavioral_gaps(self):
        import submission_workload_profile as m
        report = complete_report(); pair = next(p for p in report['pairs'] if p['family'] == 'dense100')
        for mode in ('ordinary', 'instrumented'):
            row = pair[mode]; row.update(exit=-9, state_exit=137, timed_out=True, outputs={}, output_problems=['missing outputs'])
            row.pop('phase', None)
        pair['failures'] = m.evaluate_pair(pair['ordinary'], pair['instrumented'], report['image_id'])
        report['behavioral_findings'].insert(0, {'family': pair['family'], 'trial': pair['trial'], 'failures': pair['failures']})
        self.assertEqual(m.evaluate_report(report), [])
        report['pairs'].remove(pair)
        self.assertTrue(m.evaluate_report(report), 'timeout pair must remain in the denominator')


class DriverCoverage(unittest.TestCase):
    def test_all_pairs_and_both_controls_use_distinct_raw_directories(self):
        from unittest.mock import patch
        import submission_workload_profile as m
        with tempfile.TemporaryDirectory() as td:
            root=Path(td);inputs=root/'public';inputs.mkdir()
            seed={'source':{'canvas':{'width':1080,'height':1080},'elements':[{'id':'x','type':'text','content':'Hi','font_family':'Solstice Serif','font_size':12,'x':0,'y':0,'width':100,'height':100}]},'target_canvas':{'width':1080,'height':1350}}
            for i in range(1,4):(inputs/f'level{i}.json').write_text(json.dumps(seed))
            def execute(runtime,image,image_id,inp,out,instrumented,deadline,diagnostic=None,delay_phase=None):
                out.mkdir(parents=True) # Real executor refuses existing raw evidence too.
                a,b=PairOracle().good();row=b if instrumented else a;row['name']=str(out)
                if instrumented and delay_phase:row['phase']['phases'][delay_phase]={'observed':True,'calls':1,'self_s':.051,'cumulative_s':.051}
                row.update(stdout='',stderr='',inputs_before=m.hashes(inp),inputs_after=m.hashes(inp))
                return row
            with patch.object(m,'execute',side_effect=execute):rc=m.qualify('fake','image','image',inputs,root/'result')
            r=json.loads((root/'result/profile.json').read_text())
            self.assertEqual(rc,0,r['evidence_failures']);self.assertEqual(len(r['pairs']),21);self.assertEqual(len(r['controls']),2)
            self.assertFalse(r['behavioral_acceptance'],'silent diagnostic success must stay unaccepted')
            with patch.object(m,'TOTAL_SECONDS',0),patch.object(m,'execute') as never:
                self.assertEqual(m.qualify('fake','image','image',inputs,root/'expired'),1)
                never.assert_not_called()
            expired=json.loads((root/'expired/profile.json').read_text())
            self.assertEqual(len(expired['pairs']),21)
            self.assertEqual(len(expired['diagnostics']),4)
            self.assertEqual(len(expired['controls']),2)
            self.assertTrue(all(not p['attempted'] for k in ['pairs','diagnostics','controls'] for p in expired[k]))


def complete_report():
    valid=['public-level1','public-level2','public-level3','dense16','dense100','tall','wide'];diagnostics=['missing-fonts','missing-assets','invalid-target','infeasible']
    r={'image_id':'sha256:abc123','families':{n:{'input_hashes':{'task.json':'in'}} for n in valid+diagnostics},'pairs':[],'diagnostics':[],'controls':[],'behavioral_findings':[],'evidence_failures':[],'evidence_complete':True,'behavioral_acceptance':True}
    def pair(name,i,suffix=''):
        a,b=PairOracle().good()
        for label,row in [('ordinary',a),('instrumented',b)]:row.update(image_id=r['image_id'],name=name+str(i)+suffix+label,stdout='',stderr='')
        return {'family':name,'trial':i,'attempted':True,'ordinary':a,'instrumented':b,'failures':[]}
    for name in valid:
        for i in range(3):r['pairs'].append(pair(name,i))
    for name in diagnostics:
        p=pair(name,0);p['verdict']='silent-success-unaccepted';r['diagnostics'].append(p);r['behavioral_findings'].append({'family':name,'verdict':p['verdict']})
    for delay in ['parse','render_export']:
        p=pair('public-level1',0,delay);p['delay_phase']=delay;p['instrumented']['phase']['phases'][delay]={'observed':True,'calls':1,'self_s':.051,'cumulative_s':.051};r['controls'].append(p)
    r['behavioral_acceptance']=False
    return r

if __name__=='__main__':unittest.main()
