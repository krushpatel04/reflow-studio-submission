"""Synthetic receipt checks are not hosted measurements."""
import copy, sys, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'scripts'))

def good_profile():
    expected={'a_output.json':'a'*64,'a_output.png':'b'*64}
    steps=[]
    for i in range(6):
        steps.append({'name':f'container-{i}','image_id':'sha256:test','network':'none','input_readonly':True,
          'memory':536870912,'memory_swap':536870912,'running':False,'exit':0,'timed_out':False,'cleanup_exit':0,'absent':True,
          'outer_s':1.0,'import_s':0.1,'pid':1,'iterations':[
          {'iteration':j,'rc':0,'elapsed_s':0.2,'rss_peak_bytes':10000000,'rss_scope':'process cumulative high-water',
           'cgroup_peak_bytes':11000000,'cgroup_limit_bytes':536870912,'cgroup_path':'/sys/fs/cgroup/memory.peak','cgroup_available':True,
           'real':1,'fallback':0,'outputs':expected} for j in range(1 if i<5 else 10)]})
    return {'image_id':'sha256:test','fresh_process_count':5,'same_process_iterations':10,
       'inputs_before':{'a.json':'c'*64},'inputs_after':{'a.json':'c'*64},'expected_outputs':expected,'steps':steps,
       'calibration':{'delay_s':0.101,'requested_delay_s':0.1,'allocation_bytes':33554432,'rss_before':10000000,'rss_after':44000000,
                      'exit':0,'timed_out':False,'image_id':'sha256:test','network':'none','input_readonly':True,
                      'memory':536870912,'memory_swap':536870912,'running':False,'cleanup_exit':0,'absent':True,
                      'name':'calibration','outer_s':0.3}}

class ResourceOracle(unittest.TestCase):
    def evaluate(self,p):
        import submission_resource_probe as m
        return m.evaluate(p)
    def test_complete_positive_and_explicit_partial_cgroup_coverage(self):
        p=good_profile();self.assertEqual(self.evaluate(p),[])
        for s in p['steps']:
            for r in s['iterations']:r.update(cgroup_available=False,cgroup_peak_bytes=None)
        self.assertEqual(self.evaluate(p),[])
    def test_missing_trial_failed_or_changed_output_is_rejected(self):
        for mutate in [lambda p:p['steps'].pop(),lambda p:p['steps'][-1]['iterations'].pop(),
                       lambda p:p['steps'][0]['iterations'][0].update(rc=1),
                       lambda p:p['steps'][0]['iterations'][0].update(outputs={})]:
            p=good_profile();mutate(p);self.assertTrue(self.evaluate(p))
    def test_invalid_measurements_and_scope_rejected(self):
        for k,v in [('elapsed_s',float('nan')),('elapsed_s',-1),('elapsed_s',True),('rss_peak_bytes',0),
                    ('rss_scope','per iteration'),('cgroup_peak_bytes',None),('cgroup_limit_bytes',999),('cgroup_available',False),('real',0),('fallback',1)]:
            p=good_profile();p['steps'][0]['iterations'][0][k]=v;self.assertTrue(self.evaluate(p),(k,v))
    def test_identity_input_cleanup_and_calibration_fail_closed(self):
        for change in [lambda p:p.update(inputs_after={}),lambda p:p['steps'][0].update(image_id='wrong'),
                       lambda p:p['steps'][0].update(absent=False),lambda p:p['steps'][0].update(input_readonly=False),
                       lambda p:p['calibration'].update(delay_s=0.01),lambda p:p['calibration'].update(rss_after=10000000),
                       lambda p:p['calibration'].update(exit=1)]:
            p=good_profile();change(p);self.assertTrue(self.evaluate(p))
    def test_malformed_nested_evidence_returns_failures(self):
        for key in ['steps','calibration','inputs_before','expected_outputs']:
            p=good_profile();p[key]=None;self.assertTrue(self.evaluate(p))


class WrapperBehavior(unittest.TestCase):
    def test_same_process_repeats_real_entrypoint_and_archives_each_output(self):
        self.run_wrapper(False)

    def test_later_iteration_cannot_reuse_stale_output_file(self):
        self.run_wrapper(True)

    def run_wrapper(self, omit_later):
        # Only absolute mount paths are redirected. Fake engine is explicit: this
        # checks the wrapper protocol and repeat semantics, not image rendering.
        import tempfile, subprocess, json
        import submission_resource_probe as m
        with tempfile.TemporaryDirectory() as td:
            root=Path(td);app=root/'app';profile=root/'profile';profile.mkdir()
            (app/'output').mkdir(parents=True);(app/'engine').mkdir()
            (app/'renderer'/'converter').mkdir(parents=True)
            (app/'renderer'/'converter'/'convert.py').write_text('def render_design_to_png(*args): pass\n')
            (app/'engine'/'main.py').write_text('''from pathlib import Path
import time
from renderer.converter.convert import render_design_to_png
CALLS=0
def _fallback_render(*args): pass
def main():
    global CALLS
    CALLS+=1
    time.sleep(0.003)
    render_design_to_png(None,None,None)
    Path('output/a_output.json').write_text('{}')
    Path('output/a_output.png').write_bytes(b'PNG')
    return 0
'''.replace('from renderer.converter.convert import render_design_to_png','import renderer.converter.convert as conv').replace('    render_design_to_png(None,None,None)','    conv.render_design_to_png(None,None,None)'))
            if omit_later:
                f=app/'engine'/'main.py'
                f.write_text(f.read_text().replace("    Path('output/a_output.png').write_bytes(b'PNG')", "    if CALLS==1: Path('output/a_output.png').write_bytes(b'PNG')"))
            wrapper=root/'wrapper.py';wrapper.write_text(m.WRAPPER.replace("'/app/output'",repr(str(app/'output'))).replace("'/profile'",repr(str(profile))).replace("'/app'",repr(str(app))))
            r=subprocess.run([sys.executable,str(wrapper),'10'],cwd=app,capture_output=True,text=True,timeout=10)
            self.assertEqual(r.returncode,0,r.stderr)
            receipt=json.loads(next(l[9:] for l in r.stdout.splitlines() if l.startswith('RESOURCE ')))
            rows=receipt['iterations'];self.assertEqual(len(rows),10)
            self.assertEqual([x['iteration'] for x in rows],list(range(10)))
            self.assertTrue(all(x['elapsed_s']>=0.002 and x['real']==1 and x['fallback']==0 for x in rows))
            if omit_later:
                self.assertIn('a_output.png',rows[0]['outputs'])
                self.assertNotIn('a_output.png',rows[1]['outputs'],'later iteration reused prior output')
            else:self.assertTrue(all(x['outputs']==rows[0]['outputs'] for x in rows))
            self.assertEqual(len(list(profile.glob('iteration-*'))),10)

if __name__=='__main__':unittest.main()
