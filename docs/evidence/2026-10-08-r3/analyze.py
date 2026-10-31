"""R3 analysis. usage: analyze.py <new reports dir> <old zip> <split: development|validation> <outdir>
Counts only: fit/renderer font-hash correspondence and geometry deltas vs the a305c22-era run (engine-to-engine difference, no verdict)."""
import csv, json, sys, zipfile
from pathlib import Path
new, zpath, split, out = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], Path(sys.argv[4])
z = zipfile.ZipFile(zpath)
man = json.loads(z.read('manifest.json'))
ids = {d['layout_id'] for d in man['designs'] if d['split'] == split}
ledger = [r for r in json.loads((new / 'task-ledger.json').read_text())]
old = {r['task_id']: r for r in json.loads(z.read('reports/task-ledger.json')) if r['layout_id'] in ids}
assert {r['layout_id'] for r in ledger} <= ids and len(ledger) == len(old), (len(ledger), len(old))
KEYS = ('x', 'y', 'width', 'height', 'font_size')
rows, geo = [], []
for r in ledger:
    mh = {m['metric_sha256'] for m in r['metrics']}
    rh = {e['sha256'] for e in r['font_events']}
    o = old[r['task_id']]
    warn = [w for w in r['engine_warnings'] if 'no exact font face' in w]
    state = 'not_measured' if not mh else ('equal' if mh <= rh else 'differs')
    rows.append({'task_id': r['task_id'], 'binding': r.get('font_binding'), 'state': state, 'metric_hashes': len(mh),
                 'renderer_hashes': len(rh), 'old_metric_hashes': len({m['metric_sha256'] for m in o['metrics']}),
                 'absent_face_warning': bool(warn), 'exceptions': len(r['exceptions']), 'real_render': r['real_render_success']})
    new_out = json.loads((new / r['output_json']).read_text())['elements']
    old_out = {e['id']: e for e in json.loads(z.read('reports/' + o['output_json']))['elements']}
    worst, changed = 0.0, False
    for e in new_out:
        oe = old_out.get(e['id'])
        if oe is None: changed = True; continue
        d = max(abs(float(e.get(k, 0)) - float(oe.get(k, 0))) for k in KEYS)
        worst = max(worst, d); changed |= d > 0
    changed |= {e['id'] for e in new_out} != set(old_out)
    geo.append({'task_id': r['task_id'], 'changed': changed, 'max_abs_delta': round(worst, 6)})
out.mkdir(parents=True, exist_ok=True)
for name, data in (('font-correspondence', rows), ('geometry-delta', geo)):
    with (out / f'{split[:3]}-{name}.csv').open('w', newline='') as h:
        w = csv.DictWriter(h, list(data[0])); w.writeheader(); w.writerows(data)
n = len(rows)
cnt = lambda s: sum(r['state'] == s for r in rows)
summary = {'split': split, 'tasks': n, 'bound': sum(r['binding'] == 'bound' for r in rows),
           'measured_nonempty_metrics': n - cnt('not_measured'), 'not_measured': cnt('not_measured'),
           'hash_equal_over_measured': cnt('equal'), 'hash_differs_over_measured': cnt('differs'),
           'absent_face_warning_tasks': sum(r['absent_face_warning'] for r in rows),
           'exceptions': sum(r['exceptions'] for r in rows), 'real_render_success': sum(r['real_render'] for r in rows),
           'old_run_tasks_with_metrics': sum(r['old_metric_hashes'] > 0 for r in rows),
           'geometry_changed_vs_a305c22': sum(g['changed'] for g in geo), 'geometry_unchanged_vs_a305c22': sum(not g['changed'] for g in geo),
           'max_abs_geometry_delta': max(g['max_abs_delta'] for g in geo),
           'note': 'geometry delta is an engine-to-engine difference (engine changes since a305c22), not a regression or improvement'}
(out / f'{split[:3]}-summary.json').write_text(json.dumps(summary, indent=2, sort_keys=True))
print(json.dumps(summary, indent=2))
