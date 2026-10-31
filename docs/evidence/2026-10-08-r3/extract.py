"""R3 extract: whitelist, zip-slip safe, fail closed. usage: extract.py <zip> <dest> <dev|val>
Writes manifest.json filtered to ONE split (the other split's sources/tasks/ledgers are never read or written)."""
import hashlib, json, sys, zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from scripts.lica_official import SEALED_TEMPLATE_IDS

zpath, dest, which = Path(sys.argv[1]), Path(sys.argv[2]).resolve(), sys.argv[3]
split, want = {'dev': ('development', (32, 224)), 'val': ('validation', (12, 84))}[which]
z = zipfile.ZipFile(zpath)
ROOT_FILES = {'input-ledger.json', 'package-size.json', 'ATTRIBUTION.md', 'FONT-LICENSES.md'}
manifest = json.loads(z.read('manifest.json'))
designs = [d for d in manifest['designs'] if d['split'] == split]
tasks = [t for d in designs for t in d['tasks']]
assert (len(designs), len(tasks)) == want, (len(designs), len(tasks))
assert not any(d['split'] != split for d in designs)
assert not any(d['template_id'] in SEALED_TEMPLATE_IDS for d in manifest['designs'])
mine = {d['layout_id'] for d in designs}
keep = {d['source'] for d in designs} | {t['file'] for t in tasks} | {f'conversion-ledgers/{l}.json' for l in mine}

def safe(name):
    p = (dest / name).resolve()
    assert not name.startswith('/') and '\\' not in name and '..' not in Path(name).parts and dest in p.parents, name
    return p

for info in z.infolist():
    n = info.filename
    if n.endswith('/') or (info.external_attr >> 28) == 0xA:  # dirs, symlinks
        assert not (info.external_attr >> 28) == 0xA, f'symlink {n}'
        continue
    if n in ROOT_FILES or n.startswith('resources/') or n in keep:
        p = safe(n); p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(z.read(n))
sub = {**manifest, 'designs': designs, 'categories': {}, 'splits': {split: len(designs)}}
for d in designs: sub['categories'][d['category']] = sub['categories'].get(d['category'], 0) + 1
(dest / 'manifest.json').write_text(json.dumps(sub, indent=2, sort_keys=True))
bad = [t['file'] for t in tasks if hashlib.sha256((dest / t['file']).read_bytes()).hexdigest() != t['sha256']]
blobs = [p for p in (dest / 'resources/blobs').iterdir() if hashlib.sha256(p.read_bytes()).hexdigest() != p.name and p.suffix == '']
assert not bad, bad
print(f'{which}: {len(designs)} designs {len(tasks)} tasks, task hashes OK, blobs {sum(1 for _ in (dest/"resources/blobs").iterdir())}, blob-hash-mismatch {len(blobs)}')
