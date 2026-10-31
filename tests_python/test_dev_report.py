"""RF04 preflight contracts; synthetic bytes, no renderer or remote bundle."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/quality/dev_report.py'

def digest(data):
    return hashlib.sha256(data).hexdigest()

class Preflight(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name); self.bundle = self.root / 'bundle'; self.bundle.mkdir()
        self.assertTrue(SCRIPT.is_file(), 'RF04 consumer must exist and report the frozen task inventory')
        spec = importlib.util.spec_from_file_location('dev_report', SCRIPT)
        self.mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(self.mod)
        self.manifest = {'version': 'fixture', 'status': 'historical-pending', 'versions': []}
        for version in ('v3', 'v4'):
            def desc(name, extra=None):
                name = version + '/' + name; data = name.encode()
                p = self.bundle / name; p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(data)
                return {'file': name, 'sha256': digest(data), 'bytes': len(data), **(extra or {})}
            src = {'layout_id': 'same-layout', 'original': desc('originals/s.json'),
                   'converted': desc('sources/s.json'),
                   'blobs': [desc('resources/blobs/asset', {'kinds':['asset-original']}),
                             desc('resources/blobs/font', {'kinds':['font-ttf']})],
                   'tasks':[desc('tasks/'+t+'.json', {'task_id':t,'target':t}) for t in ('square','wide')]}
            self.manifest['versions'].append({'version':version,'producer_commit':'a'*40,'sources':[src]})
        self.path = self.root / 'manifest.json'; self.save()

    def save(self):
        self.path.write_text(json.dumps(self.manifest)); self.sha = digest(self.path.read_bytes())

    def report(self):
        return self.mod.build_report(self.path, self.sha, self.bundle)

    def test_valid_inventory_is_unattempted_not_success(self):
        before = {str(p):p.read_bytes() for p in self.bundle.rglob('*') if p.is_file()}
        r = self.report()
        self.assertEqual(r['summary']['expected_tasks'],4)
        self.assertEqual(r['summary']['outcomes'],{'unattempted':4})
        self.assertFalse(r['execution_complete']); self.assertTrue(r['inputs_complete'])
        self.assertEqual(len({row['identity'] for row in r['tasks']}),4)
        for row in r['tasks']:
            self.assertEqual(row['geometry'],'unmeasured'); self.assertEqual(row['render'],'unrendered')
            self.assertEqual(row['quality'],'unreviewed'); self.assertEqual(row['source_fidelity'],'unchecked')
        self.assertEqual(before,{str(p):p.read_bytes() for p in self.bundle.rglob('*') if p.is_file()})
        self.assertEqual(r,self.report())

    def test_missing_dependencies_preserve_all_rows(self):
        for label in ('original','converted','asset','font','task'):
            with self.subTest(label=label):
                src=self.manifest['versions'][0]['sources'][0]
                d={'original':src['original'],'converted':src['converted'],'asset':src['blobs'][0],
                   'font':src['blobs'][1],'task':src['tasks'][0]}[label]
                p=self.bundle/d['file']; data=p.read_bytes(); p.unlink()
                r=self.report(); p.write_bytes(data)
                self.assertEqual(len(r['tasks']),4)
                self.assertEqual(r['summary']['outcomes']['blocked'],1 if label=='task' else 2)
                self.assertTrue(all(any(x['file']==d['file'] for x in row['blocked_inputs']) for row in r['tasks'] if row['outcome']=='blocked'))
                self.assertFalse(r['inputs_complete'])

    def test_same_size_corruption_blocks_dependency(self):
        d=self.manifest['versions'][0]['sources'][0]['blobs'][0];p=self.bundle/d['file']
        p.write_bytes(b'x'*d['bytes']);r=self.report()
        self.assertEqual(r['summary']['outcomes']['blocked'],2)
        self.assertIn('sha256 mismatch',str(r['tasks'][0]['blocked_inputs']))

    def test_all_missing_is_full_blocked_inventory(self):
        for p in self.bundle.rglob('*'):
            if p.is_file():p.unlink()
        r=self.report();self.assertEqual(r['summary']['outcomes'],{'blocked':4})
        self.assertEqual(r['summary']['real_renders'],0);self.assertEqual(r['summary']['geometry_measured'],0)

    def test_wrong_manifest_pin_rejected(self):
        with self.assertRaises(ValueError):self.mod.build_report(self.path,'0'*64,self.bundle)

    def test_invalid_manifest_rejected_before_partial_report(self):
        baseline=copy.deepcopy(self.manifest)
        for mutation in ('duplicate','mixed','escape','conflict','empty','bad-size','bad-sha'):
            with self.subTest(mutation=mutation):
                self.manifest=copy.deepcopy(baseline);s=self.manifest['versions'][0]['sources'][0]
                if mutation=='duplicate':s['tasks'].append(copy.deepcopy(s['tasks'][0]))
                if mutation=='mixed':s['tasks'][0]['file']='v4/tasks/square.json'
                if mutation=='escape':s['original']['file']='../outside'
                if mutation=='conflict':s['blobs'].append({**s['blobs'][0],'sha256':'0'*64})
                if mutation=='empty':self.manifest['versions']=[]
                if mutation=='bad-size':s['original']['bytes']=-1
                if mutation=='bad-sha':s['original']['sha256']='oops'
                self.save()
                with self.assertRaises(ValueError):self.report()

    def test_symlink_dependency_not_read_as_bundle_bytes(self):
        d=self.manifest['versions'][0]['sources'][0]['blobs'][0];p=self.bundle/d['file']
        outside=self.root/'outside';outside.write_bytes(p.read_bytes());p.unlink();p.symlink_to(outside)
        r=self.report();self.assertEqual(r['summary']['outcomes']['blocked'],2)
        self.assertIn('symlink',str(r['tasks'][0]['blocked_inputs']))

    def test_textless_source_requires_no_font(self):
        source=self.manifest['versions'][0]['sources'][0]
        font=source['blobs'].pop();(self.bundle/font['file']).unlink();self.save()
        self.assertTrue(self.report()['inputs_complete'])

    def test_no_resource_blobs_is_valid(self):
        self.manifest['versions'][0]['sources'][0]['blobs']=[];self.save()
        self.assertTrue(self.report()['inputs_complete'])

    def test_task_target_metadata_preserved(self):
        task=self.manifest['versions'][0]['sources'][0]['tasks'][0]
        task['target_canvas']={'width':1080,'height':1080};self.save()
        row=self.report()['tasks'][0]
        self.assertEqual(row.get('target'),task['target'])
        self.assertEqual(row.get('target_canvas'),task['target_canvas'])

    def test_parent_symlink_and_wrong_size_block(self):
        import shutil
        parent=self.bundle/'v3/resources';outside=self.root/'resources'
        shutil.move(str(parent),str(outside));parent.symlink_to(outside,target_is_directory=True)
        r=self.report();self.assertEqual(r['summary']['outcomes']['blocked'],2)
        parent.unlink();shutil.move(str(outside),str(parent))
        p=self.bundle/'v3/tasks/square.json';p.write_bytes(b'')
        r=self.report();self.assertEqual(r['summary']['outcomes']['blocked'],1)
        self.assertIn('byte size mismatch',str(r['tasks'][0]['blocked_inputs']))

    def test_malformed_json_cli_has_no_report(self):
        self.path.write_text('{broken');self.sha=digest(self.path.read_bytes())
        out=self.root/'invalid.json';result=self.invoke(out)
        self.assertEqual(result.returncode,2);self.assertFalse(out.exists())
        self.assertIn('RF04 preflight',result.stderr)

    def invoke(self,out):
        return subprocess.run([sys.executable,str(SCRIPT),'--manifest',str(self.path),'--manifest-sha256',self.sha,
                               '--bundle',str(self.bundle),'--out',str(out)],capture_output=True,text=True)

    def test_cli_complete_then_blocked_and_preserves_evidence(self):
        out=self.root/'report.json';self.assertEqual(self.invoke(out).returncode,0)
        before=out.read_bytes();self.assertEqual(self.invoke(out).returncode,2);self.assertEqual(out.read_bytes(),before)
        (self.bundle/'v3/tasks/square.json').unlink()
        blocked=self.root/'blocked.json';self.assertEqual(self.invoke(blocked).returncode,1)
        self.assertEqual(json.loads(blocked.read_text())['summary']['expected_tasks'],4)

    def test_cli_forbids_bundle_output_and_missing_manifest(self):
        out=self.bundle/'new.json';self.assertEqual(self.invoke(out).returncode,2);self.assertFalse(out.exists())
        self.path.unlink();self.assertEqual(self.invoke(self.root/'out.json').returncode,2)

if __name__=='__main__':unittest.main()
