"""R3 driver: render.run() on an extracted bundle with NO reference images. usage: driver.py <bundle> <schema> <upstream> [limit]
limit = probe only: runs on a symlinked copy with the first N designs; reports land in <bundle>-probe/."""
import json, os, sys
from pathlib import Path
bundle, schema, upstream = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from scripts.lica_official import render
if len(sys.argv) > 4:
    probe = Path(str(bundle) + '-probe'); probe.mkdir(exist_ok=True)
    for n in os.listdir(bundle):
        if n not in ('manifest.json', 'reports') and not (probe / n).exists(): (probe / n).symlink_to(bundle / n)
    m = json.loads((bundle / 'manifest.json').read_text()); m['designs'] = m['designs'][:int(sys.argv[4])]
    (probe / 'manifest.json').write_text(json.dumps(m)); bundle = probe
render.run(bundle, None, upstream, json.loads(schema.read_text()))
