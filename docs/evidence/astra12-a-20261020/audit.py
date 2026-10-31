"""Read-only retained-evidence audit; does not rerender or judge readability."""
import hashlib
import io
import json
from pathlib import Path
import platform
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
PACKET = ROOT / 'docs/evidence/2026-10-15-linux-spacing'
def digest(data):
    return hashlib.sha256(data).hexdigest()

manifest = (PACKET / 'SHA256SUMS').read_text().splitlines()
for line in manifest:
    expected, name = line.split(maxsplit=1)
    assert digest((PACKET / name).read_bytes()) == expected, name
results = {}
for host in ('linux', 'macos'):
    diagnosis = json.loads((PACKET / f'{host}-diagnosis.json').read_text())
    rows = diagnosis['rows']
    assert len(rows) == len({(r['text'], r['size'], r['rotation']) for r in rows}) == 50
    assert {r['size'] for r in rows} == {6, 6.67, 7, 8, 8.15}
    assert {r['rotation'] for r in rows} == {0, -12}
    assert len(diagnosis['fractional_integer_pairs']) == 20
    assert all(p['png_identical'] for p in diagnosis['fractional_integer_pairs'])
    with zipfile.ZipFile(PACKET / f'{host}-renders.zip') as archive:
        assert json.loads(archive.read('diagnosis.json')) == diagnosis
        for row in rows:
            name = Path(row['png'])
            raw = archive.read(str(name))
            assert digest(raw) == row['sha256']
            assert digest(archive.read(str(name.with_suffix('.json')))) == row['input_sha256']
            assert row['real_renderer_calls'] == 1 and not row['fallbacks'] and row['font_events']
            assert all(g > 0 for g in row['glyphs']) and all(a > 0 for a in row['advances'])
            with Image.open(io.BytesIO(raw)) as image:
                with Image.open(io.BytesIO(archive.read(name.stem + '-2x.png'))) as enlarged:
                    assert enlarged.tobytes() == image.resize((600, 200), Image.Resampling.NEAREST).tobytes()
        for text in {r['text'] for r in rows}:
            assert len({r['sha256'] for r in rows if r['text'] == text and r['rotation'] == 0 and r['size'] in (6, 7, 8)}) == 3
    results[host] = {'rows': len(rows), 'verified_2x_views': len(rows),
                     'fractional_integer_controls': 20, 'archive_sha256': digest((PACKET / f'{host}-renders.zip').read_bytes())}
print(json.dumps({'audit_host': platform.platform(), 'manifest_files': len(manifest),
                  'results': results, 'fresh_renders': 0, 'human_verdict': None}, indent=2))
