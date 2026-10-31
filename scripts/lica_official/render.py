"""Independent output audit. Does not call or modify engine geometry helpers."""
from collections import Counter
import math
import contextlib
import copy
import csv
import hashlib
import importlib
import json
import os
from pathlib import Path
from statistics import median
import subprocess
import sys
import warnings


def compare_rules(source, output):
    a, b = source['elements'], output['elements']
    ac = Counter(e['id'] for e in a); bc = Counter(e['id'] for e in b)
    r = {'missing_ids': sorted(ac.keys() - bc.keys()),
         'duplicate_ids': {k: v for k, v in bc.items() if v > 1},
         'extra_ids': sorted(bc.keys() - ac.keys()),
         'changed_text': [], 'changed_font_family': [], 'changed_image_asset': []}
    before = {e['id']: e for e in a}
    for e in b:
        old = before.get(e['id'])
        if old is None: continue
        for typ, field, key in [('text', 'content', 'changed_text'),
                                ('text', 'font_family', 'changed_font_family'),
                                ('image', 'asset_id', 'changed_image_asset')]:
            if old['type'] == typ and old.get(field) != e.get(field):
                r[key].append({'id': e['id'], 'before': old.get(field), 'after': e.get(field)})
    return r


def polygon(e):
    cx, cy = e['x'] + e['width']/2, e['y'] + e['height']/2
    r = math.radians(e.get('rotation', 0) or 0); c, s = math.cos(r), math.sin(r)
    return [(cx + dx*c - dy*s, cy + dx*s + dy*c)
            for dx, dy in [(-e['width']/2, -e['height']/2), (e['width']/2, -e['height']/2),
                           (e['width']/2, e['height']/2), (-e['width']/2, e['height']/2)]]


def aabb(e):
    p = polygon(e)
    return [min(x for x,y in p), min(y for x,y in p), max(x for x,y in p), max(y for x,y in p)]


def intersects(e, canvas):
    if e['width'] <= 0 or e['height'] <= 0: return False
    p = polygon(e)
    # Clip the rotated rectangle against the four canvas half-planes.
    for axis, boundary, keep_greater in [(0,0,True), (0,canvas['width'],False),
                                         (1,0,True), (1,canvas['height'],False)]:
        def inside(pt): return pt[axis] >= boundary if keep_greater else pt[axis] <= boundary
        out = []
        for prev, cur in zip(p[-1:] + p[:-1], p):
            pi, ci = inside(prev), inside(cur)
            if pi != ci:
                t = (boundary-prev[axis])/(cur[axis]-prev[axis])
                out.append(tuple(prev[j]+t*(cur[j]-prev[j]) for j in (0,1)))
            if ci: out.append(cur)
        p = out
        if not p: return False
    area = abs(sum(x*v-u*y for (x,y),(u,v) in zip(p,p[1:]+p[:1])))/2
    return area > 1e-9


def off_canvas(source, output):
    old = {e['id']:e for e in source['elements']}; r = {'fully_off_canvas': [], 'degenerate': []}
    for e in output['elements']:
        if e['width'] <= 0 or e['height'] <= 0:
            r['degenerate'].append({'id': e['id'], 'type': e['type']}); continue
        if not intersects(e, output['canvas']):
            original = old.get(e['id'])
            was_on = original is not None and intersects(original, source['canvas'])
            r['fully_off_canvas'].append({'id': e['id'], 'type': e['type'], 'newly_pushed': was_on,
                 'source_aabb': aabb(original) if original else None, 'output_aabb': aabb(e)})
    return r


def background_ids(source):
    w,h=source['canvas']['width'],source['canvas']['height']
    ids=[]
    for e in source['elements']:
        covers=e['x']<=0 and e['y']<=0 and e['x']+e['width']>=w and e['y']+e['height']>=h
        kind=(e['type']=='image' and e.get('fit')=='cover') or (e['type']=='shape' and e.get('shape_type')=='rectangle')
        if e['id']=='__lica_background__' or (kind and not e.get('group_id') and covers): ids.append(e['id'])
    return ids


def bounding_fraction(elements,canvas):
    boxes=[aabb(e) for e in elements if e['width']>0 and e['height']>0]
    if not boxes: return None,0.0
    bounds=[min(e[0] for e in boxes),min(e[1] for e in boxes),max(e[2] for e in boxes),max(e[3] for e in boxes)]
    left,top=max(0,bounds[0]),max(0,bounds[1]); right,bottom=min(canvas['width'],bounds[2]),min(canvas['height'],bounds[3])
    area=max(0,right-left)*max(0,bottom-top)
    return bounds,area/(canvas['width']*canvas['height'])


def measure(source,output):
    excluded=background_ids(source)
    all_box,all_fraction=bounding_fraction(output['elements'],output['canvas'])
    fg=[e for e in output['elements'] if e['id'] not in excluded]
    fg_box,fg_fraction=bounding_fraction(fg,output['canvas'])
    text=[e for e in output['elements'] if e['type']=='text' and e.get('content','').strip()]
    requested=min((e['font_size'] for e in text),default=None)
    # cr_renderer.text_utils.make_text_blob constructs skia.Font(typeface, int(fontSize)).
    rendered=min((int(e['font_size']) for e in text),default=None)
    return {'all_elements_aabb':all_box,'all_elements_fraction':all_fraction,
            'foreground_aabb':fg_box,'foreground_fraction':fg_fraction,'excluded_background_ids':excluded,
            'foreground_element_count':len(fg),'nonempty_text_elements':len(text),
            'min_requested_text_px':requested,'min_rendered_text_px':rendered,
            'min_rendered_text_ids':[e['id'] for e in text if int(e['font_size'])==rendered]}


class RealRenderer:
    """The upstream converter and renderer with exact, hash-verified faces."""
    def __init__(self, blobs, upstream, faces):
        from .resources import digest
        sys.path.insert(0, str(upstream.resolve()))
        import cr_renderer
        from cr_renderer.fonts import FontManager, normalize_family, get_font_weight, get_font_style
        import renderer.converter.convert as converter
        if Path(converter.__file__).resolve() != upstream.resolve() / 'renderer/converter/convert.py':
            raise ValueError('Unexpected upstream converter module')
        self.blobs = blobs
        self.events = []

        owner = self
        class ExactManager(FontManager):
            def lookup(self, family, weight='regular', style='regular'):
                ew, es = get_font_weight(family, weight), get_font_style(family, style)
                exact = [f for f in self._fonts.get(normalize_family(family), [])
                         if f['fontWeight'] == ew and f['fontStyle'] == es]
                if len(exact) != 1:
                    raise ValueError(f'Exact font unavailable: {family} / {ew} / {es}')
                value = super().lookup(family, weight, style)
                if value != exact[0]['bytes']:
                    raise ValueError(f'Font substitution: {family}')
                owner.events.append({'family': family, 'effective_weight': ew, 'effective_style': es,
                                     'sha256': digest(value)})
                return value

        self.manager = ExactManager.__new__(ExactManager)
        self.manager._fonts = {}
        self.records = []  # the exact faces the renderer holds, handed to text_fit.faces() so fit and render share one key
        for face in faces:
            data = (blobs / face['ttf_sha256']).read_bytes()
            if digest(data) != face['ttf_sha256']:
                raise ValueError('Font blob hash mismatch')
            weight = 'bold' if face['weight'] >= 600 else 'regular'
            style = ('bolditalic' if weight == 'bold' else 'italic') if face['style'] == 'italic' else weight
            entry = {'fontFamily': face['family'], 'fontWeight': weight, 'fontStyle': style, 'bytes': data}
            group = self.manager._fonts.setdefault(normalize_family(face['family']), [])
            group.append(entry)
            # text_fit.faces() wants the resource style (normal|italic); it derives bold/bolditalic and the trailing-weight-word key itself.
            self.records.append({'family': face['family'], 'weight': weight, 'style': face['style'],
                                 'path': str(blobs / face['ttf_sha256']), 'ttf_sha256': face['ttf_sha256']})
            # The renderer interprets the last word in Archivo Black as a weight.
            effective_weight = get_font_weight(face['family'], weight)
            if effective_weight != weight:
                group.append({**entry, 'fontWeight': effective_weight})
        self.converter = converter
        self.renderer = cr_renderer.CrelloV5Renderer.__new__(cr_renderer.CrelloV5Renderer)
        self.renderer.features = converter._STUB_FEATURES
        self.renderer.font_manager = self.manager

    def render(self, design, png):
        from PIL import Image
        for e in design['elements']:
            if e['type'] == 'image':
                asset = self.blobs / e['asset_id']
                if hashlib.sha256(asset.read_bytes()).hexdigest() != e['asset_id']:
                    raise ValueError('Asset blob hash mismatch')
                with Image.open(asset) as image:
                    image.verify()
        self.events.clear()
        before = copy.deepcopy(design)
        example, messages = self.converter.convert_chameleon_to_crello(design, self.manager, str(self.blobs))
        if messages:
            raise ValueError(f'Renderer converter warnings: {messages}')
        data = self.renderer.render(example, max_size=max(design['canvas'].values()), format='png')
        png.parent.mkdir(parents=True, exist_ok=True)
        png.write_bytes(data)
        with Image.open(png) as image:
            if image.size != (design['canvas']['width'], design['canvas']['height']):
                raise ValueError('Native render size mismatch')
        if before != design:
            raise ValueError('Renderer mutated input design')
        return {'real_converter_calls': 1, 'real_renderer_calls': 1, 'fallback_renderer_calls': 0,
                'font_events': list(self.events), 'font_fallbacks': [], 'missing_assets': [], 'warnings': messages}


def contact_sheet(pairs, path):
    """Labelled source/output pairs; image-only resizing for the review sheet."""
    from PIL import Image, ImageDraw, ImageFont, ImageOps
    width, cell_height, columns = 760, 260, 2
    sheet = Image.new('RGB', (width * columns, cell_height * math.ceil(len(pairs) / columns)), '#ededed')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default(size=13)
    for i, (label, left, right) in enumerate(pairs):
        x, y = (i % columns) * width, (i // columns) * cell_height
        draw.text((x + 10, y + 6), label, font=font, fill='black')
        for j, source in enumerate((left, right)):
            with Image.open(source) as image:
                small = ImageOps.contain(image.convert('RGBA'), (360, 220))
                xx, yy = x + j * 380 + (380 - small.width) // 2, y + 30 + (220 - small.height) // 2
                sheet.paste(small, (xx, yy), small)
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)


def run(output, raw, upstream, schema):
    from .batch import write
    from .schema import assert_schema_valid
    repo = Path(__file__).resolve().parents[2]
    os.environ['CHAMELEON_UPSTREAM'] = str(upstream.resolve())
    # Local engine must win over the upstream starter's engine package.
    sys.path.insert(0, str(repo))
    engine_resize = importlib.import_module('engine.resize')
    text_fit = importlib.import_module('engine.text_fit')
    if Path(engine_resize.__file__).resolve() != repo / 'engine/resize.py':
        raise ValueError('Unexpected engine module')
    engine_hashes = {str(p.relative_to(repo)): hashlib.sha256(p.read_bytes()).hexdigest()
                     for p in sorted((repo / 'engine').rglob('*.py'))}
    head = subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip()
    manifest = json.loads((output / 'manifest.json').read_text())
    resources = json.loads((output / 'resources/index.json').read_text())
    reports = output / 'reports'
    source_records, records, rows = [], [], []
    consecutive_render_failures = 0
    source_pairs = []
    metric_original = text_fit._path
    bind = getattr(text_fit, 'faces', None)  # absent until the engine ships it; then behaviour is unchanged
    for design in manifest['designs']:
        lid = design['layout_id']
        source = json.loads((output / design['source']).read_text())
        assert_schema_valid(source, schema)
        faces = [f for f in resources['fonts'] if f['ttf_sha256'] in design['font_sha256']]
        renderer = RealRenderer(output / 'resources/blobs', upstream, faces)
        source_png = reports / 'sources' / f'{lid}.png'
        try:
            audit = renderer.render(source, source_png)
            consecutive_render_failures = 0
        except Exception:
            consecutive_render_failures += 1
            if consecutive_render_failures >= 2:
                raise
            # Source rendering is a required gate; do not proceed to engine tasks.
            audit = renderer.render(source, source_png)
            consecutive_render_failures = 0
        source_records.append({'layout_id': lid, **audit, 'png': str(source_png.relative_to(reports))})
        if raw is not None:  # raw=None: no reference images (R3 bundle ships none); they only feed the sources contact sheet
            reference = raw / 'images' / design['template_id'] / f'{lid}.png'
            if not reference.is_file():
                raise FileNotFoundError(f'Reference image missing: {lid}')
            source_pairs.append((f'Pair {design["pair"]} {lid}: LICA / official source', reference, source_png))
        for task in design['tasks']:
            input_file = output / task['file']
            if hashlib.sha256(input_file.read_bytes()).hexdigest() != task['sha256']:
                raise ValueError('Task hash mismatch')
            data = json.loads(input_file.read_text())
            folder = reports / 'results' / lid / task['target']
            record = {'task_id': data['task_id'], 'layout_id': lid, 'target': task['target'],
                      'font_binding': 'bound' if bind else 'unavailable', 'exceptions': [],
                      'engine_warnings': [], 'metrics': [], 'rules': {}, 'off_canvas': {}, 'real_render_success': False}
            metric_counts = Counter()
            def metric_path(d, e):
                value = metric_original(d, e)
                metric_counts[(e['id'], e['font_family'], value)] += 1
                return value
            text_fit._path = metric_path
            stage = 'engine'
            try:
                before = copy.deepcopy(data)
                with warnings.catch_warnings(record=True) as captured:
                    warnings.simplefilter('always')
                    with (bind(renderer.records) if bind else contextlib.nullcontext()):
                        result = engine_resize.resize(data['source'], data['target_canvas'])
                record['engine_warnings'] = [str(w.message) for w in captured]
                if before != data:
                    raise ValueError('Engine mutated task input')
                record['rules'] = compare_rules(data['source'], result)
                record['off_canvas'] = off_canvas(data['source'], result)
                assert_schema_valid(result, schema)
                if result['canvas'] != data['target_canvas']:
                    raise ValueError('Wrong target canvas')
                write(folder / 'output.json', result)
                stage = 'renderer'
                record.update(renderer.render(result, folder / 'output.png'))
                record['real_render_success'] = True
                consecutive_render_failures = 0
                record['output_json'] = str((folder / 'output.json').relative_to(reports))
                record['output_png'] = str((folder / 'output.png').relative_to(reports))
                rows.append({'task_id': data['task_id'], 'layout_id': lid, 'pair': design['pair'],
                             'category': design['category'], 'split': design['split'], 'target': task['target'],
                             **measure(data['source'], result)})
            except Exception as error:
                record['exceptions'].append({'stage': stage, 'type': type(error).__name__, 'message': str(error)})
                if stage == 'renderer':
                    consecutive_render_failures += 1
            finally:
                text_fit._path = metric_original
            record['metrics'] = [{'element_id': k[0], 'requested_family': k[1], 'metric_font': Path(k[2]).name,
                                  'metric_sha256': hashlib.sha256(Path(k[2]).read_bytes()).hexdigest(), 'calls': count}
                                 for k, count in metric_counts.items()]
            write(folder / 'audit.json', record)
            records.append(record)
            write(reports / 'task-ledger.json', records)
            print(f'{len(records)}: {data["task_id"]} real={record["real_render_success"]} exceptions={len(record["exceptions"])}', flush=True)
            if consecutive_render_failures >= 2:
                raise RuntimeError('Stopped after two renderer failures; see task-ledger.json')
    write(reports / 'source-render-ledger.json', source_records)
    write(reports / 'output-measurements.json', rows)
    fields = ['task_id', 'pair', 'category', 'split', 'target', 'all_elements_fraction', 'foreground_fraction',
              'min_requested_text_px', 'min_rendered_text_px']
    with (reports / 'output-measurements.csv').open('w', newline='') as handle:
        writer = csv.DictWriter(handle, fields, extrasaction='ignore'); writer.writeheader(); writer.writerows(rows)
    if raw is not None:
        contact_sheet(source_pairs, reports / 'contact-sheets/sources.png')
    aggregate = {}
    for target in manifest['targets']:
        rr = [r for r in rows if r['target'] == target['id']]
        if not rr:
            continue
        coverage = [r['foreground_fraction'] for r in rr]
        sizes = [r['min_rendered_text_px'] for r in rr if r['min_rendered_text_px'] is not None]
        aggregate[target['id']] = {'outputs': len(rr), 'foreground_coverage': dict(zip(('min','median','max'),
                                  (min(coverage), median(coverage), max(coverage)))),
                                  'min_rendered_text_px': dict(zip(('min','median','max'), (min(sizes), median(sizes), max(sizes)))) if sizes else None}
        pairs = [(f'Pair {r["pair"]} {r["layout_id"]}: source / {target["label"]}',
                  reports / 'sources' / f'{r["layout_id"]}.png',
                  reports / 'results' / r['layout_id'] / target['id'] / 'output.png') for r in rr]
        contact_sheet(pairs, reports / 'contact-sheets' / f'{target["id"]}.png')
    write(reports / 'measurement-summary.json', aggregate)
    summary = {'engine_head': head, 'designs': len(source_records), 'tasks': len(records),
               'real_source_renders': len(source_records), 'real_output_renders': sum(r['real_render_success'] for r in records),
               'exceptions': sum(len(r['exceptions']) for r in records),
               'rule_violations': sum(sum(len(v) for v in r['rules'].values()) for r in records),
               'fully_off_canvas': sum(len(r['off_canvas'].get('fully_off_canvas', [])) for r in records),
               'font_lookups': sum(len(r.get('font_events', [])) for r in records),
               'missing_assets': sum(len(r.get('missing_assets', [])) for r in records),
               'font_fallbacks': sum(len(r.get('font_fallbacks', [])) for r in records),
               'fallback_renderer_calls': sum(r.get('fallback_renderer_calls', 0) for r in records),
               'metric_tasks': sum(bool(r['metrics']) for r in records),
               'floor_warning_tasks': sum(any('floor' in w for w in r['engine_warnings']) for r in records),
               'engine_files_unchanged': all(hashlib.sha256((repo / p).read_bytes()).hexdigest() == h for p,h in engine_hashes.items()),
               'engine_hashes': engine_hashes}
    write(reports / 'summary.json', summary)
    lines = ['# LICA official batch\n', 'No quality judgment. Measurements are geometry and renderer font sizes.\n',
             '```json\n' + json.dumps(summary, indent=2) + '\n```\n',
             f'Categories: {manifest["categories"]}. Splits: {manifest["splits"]}.\n',
             '## Exclusions\n']
    lines += [f'- `{lid}`: {reason}' for lid,reason in manifest['exclusions'].items()]
    lines += ['\n## Measurement definitions\n', 'Coverage is the enclosing rotated element box clipped to the canvas, including gaps; '
              'it is not occupied ink or the union of element areas. All elements and foreground are both recorded. '
              'Foreground excludes backgrounds chosen from the source. Text size is int(font_size), as used by the real renderer. '
              'N/A means no editable nonempty text. Text inside raster artwork is not measured.\n']
    for target in manifest['targets']:
        lines += [f'\n## {target["label"]}\n', f'[Contact sheet](contact-sheets/{target["id"]}.png)\n',
                  '| Pair | Layout | All box % | Foreground box % | Smallest text px |', '|---|---|---:|---:|---:|']
        for row in [r for r in rows if r['target'] == target['id']]:
            lines.append(f'| {row["pair"]} | {row["layout_id"]} | {row["all_elements_fraction"]*100:.1f} | '
                         f'{row["foreground_fraction"]*100:.1f} | {row["min_rendered_text_px"] if row["min_rendered_text_px"] is not None else "N/A"} |')
    lines += ['\n## Accepted source fidelity limits\n',
              'Displayed text and font families are preserved; weights ≥600 map to bold and lower weights to regular. '
              'Renderer wrapping/weight differences and artwork found only in the reference PNG (when one was supplied) are accepted. '
              'Justified text maps left. Every conversion decision is in the input bundle ledgers.\n',
              '\n## Reproduction\n', 'See scripts/lica_official/README.md in the repo for the single rebuild command. '
              'Input bundle resources/index.json contains sources, licenses and Chromium version; task-ledger.json contains '
              'every warning, exception and measured metric face.\n']
    (reports / 'README.md').write_text('\n'.join(lines) + '\n')
    gallery = '<!doctype html><meta charset="utf-8"><title>LICA pairs</title><h1>LICA pairs</h1>'
    for name in (['sources'] if raw is not None else []) + [t['id'] for t in manifest['targets']]:
        gallery += f'<h2>{name}</h2><a href="{name}.png"><img src="{name}.png" style="width:100%;max-width:1520px"></a>'
    (reports / 'contact-sheets/gallery.html').write_text(gallery)
    print(json.dumps(summary, indent=2), flush=True)
