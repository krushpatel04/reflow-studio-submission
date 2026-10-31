"""Entry-point and content-addressed resource controls using synthetic data."""
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from PIL import Image
from tests_python.test_lica_official import image,layout,SEALED_TEMPLATES

ROOT=Path(__file__).resolve().parent.parent
UPSTREAM=Path(os.environ.get('CHAMELEON_UPSTREAM',ROOT.parent/'reflow-studio-spikes/chameleon-official'))

class BatchSmoke(unittest.TestCase):
    def command(self,*args):
        return subprocess.run([sys.executable,'-m','scripts.lica_official.batch',*args],cwd=ROOT,capture_output=True,text=True)

    def test_entrypoint_help(self):
        r=self.command('--help'); self.assertEqual(r.returncode,0,r.stderr)
        self.assertIn('--lica-data',r.stdout); self.assertIn('--tasks-only',r.stdout)

    def test_fixture_rebuild_deduplicates_assets_and_keeps_sealed_unopened(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp); raw=root/'lica-data'; raw.mkdir(); cache=root/'cache';cache.mkdir(); output=root/'batch'
            lid,tid='fixture','allowed-template'; folder=raw/'layouts'/tid;folder.mkdir(parents=True)
            url='https://storage.googleapis.com/lica-video/fixture.png'
            data=layout(image('one',src=url),image('two',src=url))
            raw_file=folder/f'{lid}.json';raw_file.write_text(json.dumps(data)); original=raw_file.read_bytes()
            with (raw/'metadata.csv').open('w',newline='') as f:
                w=csv.DictWriter(f,fieldnames=['layout_id','template_id','category']);w.writeheader()
                w.writerows([{'layout_id':lid,'template_id':tid,'category':'Posters'},
                             {'layout_id':'sealed','template_id':SEALED_TEMPLATES[0],'category':'Posters'},
                             {'layout_id':'unselected','template_id':'other','category':'Posters'}])
            config={'version':'fixture','layouts':[{'layout_id':lid,'template_id':tid,'category':'Posters','split':'development',
                'source_sha256':hashlib.sha256(original).hexdigest(),'existing':False,'rotation_only':False,'pair':1}],
                'exclusions':{},'targets':json.loads((ROOT/'scripts/lica_official/batch-selection.json').read_text())['targets']}
            config_file=root/'selection.json';config_file.write_text(json.dumps(config))
            buffer=io.BytesIO();Image.new('RGB',(2,2),'red').save(buffer,format='PNG')
            (cache/hashlib.sha256(url.encode()).hexdigest()).write_bytes(buffer.getvalue())
            args=['--lica-data',str(raw),'--output',str(output),'--upstream',str(UPSTREAM),
                  '--selection',str(config_file),'--asset-cache',str(cache),'--offline','--tasks-only']
            r=self.command(*args);self.assertEqual(r.returncode,0,r.stderr)
            manifest=json.loads((output/'manifest.json').read_text());self.assertEqual(len(manifest['designs']),1)
            tasks=sorted((output/'tasks').glob('*.json'));self.assertEqual(len(tasks),7)
            asset_ids=set()
            for path in tasks:
                task=json.loads(path.read_text());els=task['source']['elements']
                self.assertEqual([e['id'] for e in els],['one','two'])
                asset_ids.update(e['asset_id'] for e in els)
            self.assertEqual(len(asset_ids),1)
            blobs=list((output/'resources/blobs').iterdir());self.assertEqual(len(blobs),1)
            self.assertEqual(blobs[0].read_bytes(),buffer.getvalue());self.assertEqual(blobs[0].name,next(iter(asset_ids)))
            ledger=json.loads((output/'input-ledger.json').read_text())
            self.assertEqual([r['status'] for r in ledger],['converted','excluded','unselected'])
            self.assertEqual(ledger[1]['reason'],'sealed-template')
            self.assertEqual(raw_file.read_bytes(),original)
            before={str(p.relative_to(output)):hashlib.sha256(p.read_bytes()).hexdigest() for p in output.rglob('*') if p.is_file()}
            r=self.command(*args);self.assertEqual(r.returncode,0,r.stderr)
            after={str(p.relative_to(output)):hashlib.sha256(p.read_bytes()).hexdigest() for p in output.rglob('*') if p.is_file()}
            self.assertEqual(after,before)
            size=json.loads((output/'package-size.json').read_text())
            self.assertEqual(size['tasks_bytes'],sum(p.stat().st_size for p in tasks))
            self.assertEqual(size['shared_blob_bytes'],len(buffer.getvalue()))
            self.assertFalse(any('/Users/' in p.read_text() for p in output.rglob('*.json')))

    def test_blob_store_identical_bytes_has_one_file(self):
        from scripts.lica_official.resources import BlobStore
        with tempfile.TemporaryDirectory() as temp:
            store=BlobStore(Path(temp));a=store.put(b'same bytes','font');b=store.put(b'same bytes','asset')
            self.assertEqual(a,b);self.assertEqual(len(list(store.root.iterdir())),1)

    def test_existing_corrupt_blob_is_refused(self):
        from scripts.lica_official.resources import BlobStore
        with tempfile.TemporaryDirectory() as temp:
            store=BlobStore(Path(temp));value=store.put(b'correct','asset');(store.root/value).write_bytes(b'corrupt')
            with self.assertRaisesRegex(ValueError,'hash'):store.put(b'correct','asset')

if __name__=='__main__':unittest.main()
