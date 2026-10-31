"""Rebuild the approved LICA batch, then optionally render and audit it."""
import argparse
from collections import Counter
import copy
import csv
import json
from pathlib import Path

from . import SEALED_TEMPLATE_IDS, convert_layout
from .resources import Resources, digest
from .schema import assert_schema_valid

SCHEMA_SHA256 = '14d97d48c4f00357f7f27d2e8000ef9cc8778cac7cd5a621ed7e1261f949820d'
ROOT = Path(__file__).resolve().parents[2]


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + '\n')


def package_size(output):
    files = [p for p in output.rglob('*') if p.is_file() and 'reports' not in p.relative_to(output).parts
             and p.name != 'package-size.json']
    tasks = sum(p.stat().st_size for p in files if p.parent == output / 'tasks')
    blobs = sum(p.stat().st_size for p in files if p.parent == output / 'resources/blobs')
    value = {'tasks_bytes': tasks, 'shared_blob_bytes': blobs, 'tasks_plus_resources_bytes': tasks + blobs,
             'metadata_bytes': sum(p.stat().st_size for p in files) - tasks - blobs,
             'bundle_bytes': sum(p.stat().st_size for p in files), 'shared_blobs': len(list((output / 'resources/blobs').iterdir())),
             'storage_proposal': 'corpus/lica-official/' if tasks + blobs <= 25_000_000 else 'private GitHub release ZIP',
             'size_definition': 'Input bundle only; reports excluded. bundle_bytes includes this size ledger.'}
    # Include this ledger's own bytes without timestamps or machine-dependent paths.
    base = value['bundle_bytes']
    for _ in range(10):
        write(output / 'package-size.json', value)
        total = base + (output / 'package-size.json').stat().st_size
        if total == value['bundle_bytes']:
            break
        value['bundle_bytes'] = total
    return value


def rebuild(args):
    output = args.output
    output.mkdir(parents=True, exist_ok=True)
    selection = json.loads(args.selection.read_text())
    schema_bytes = (args.upstream / 'chameleon_design_schema_v0.9.json').read_bytes()
    if digest(schema_bytes) != SCHEMA_SHA256:
        raise ValueError('Pinned official schema hash mismatch')
    schema = json.loads(schema_bytes)
    metadata_file = args.lica_data / 'metadata.csv'
    if selection.get('metadata_sha256') and digest(metadata_file.read_bytes()) != selection['metadata_sha256']:
        raise ValueError('Selected dataset metadata hash mismatch')
    selected = {d['layout_id']: d for d in selection['layouts']}
    if len(selected) != len(selection['layouts']):
        raise ValueError('Duplicate selected layout ID')
    resources = Resources(output, args.asset_cache, args.font_cache, args.offline)
    ledger, converted = [], {}
    with metadata_file.open(newline='') as handle:
        for row in csv.DictReader(handle):
            lid, tid = row['layout_id'], row['template_id']
            record = {'layout_id': lid, 'template_id': tid}
            # These gates deliberately precede opening JSON or resource files.
            if tid in SEALED_TEMPLATE_IDS:
                ledger.append({**record, 'status': 'excluded', 'reason': 'sealed-template'})
                continue
            if lid in selection['exclusions']:
                ledger.append({**record, 'status': 'excluded', 'reason': selection['exclusions'][lid]})
                continue
            if lid not in selected:
                ledger.append({**record, 'status': 'unselected'})
                continue
            spec = selected[lid]
            if (tid, row['category']) != (spec['template_id'], spec['category']):
                raise ValueError(f'Selection metadata changed: {lid}')
            source_bytes = (args.lica_data / 'layouts' / tid / f'{lid}.json').read_bytes()
            if digest(source_bytes) != spec['source_sha256']:
                raise ValueError(f'Selected source hash mismatch: {lid}')
            result = convert_layout(json.loads(source_bytes), layout_id=lid, template_id=tid,
                                    category=row['category'], split=spec['split'],
                                    target_canvas={'width': 1080, 'height': 1080})
            write(output / 'conversion-ledgers' / f'{lid}.json', result['ledger'])
            if result['status'] != 'converted':
                write(output / 'input-ledger.json', ledger + [{**record, 'status': 'failed', 'reasons': result['ledger']['reasons']}])
                raise ValueError(f'Approved source conversion failed: {lid}: {result["ledger"]["reasons"]}')
            source = result['task']['source']
            asset_urls = {a['element_id']: a['source'] for a in result['ledger']['assets']}
            font_hashes = []
            for element in source['elements']:
                if element['type'] == 'image':
                    element['asset_id'] = resources.asset(asset_urls[element['id']],
                                                         {k: element[k] for k in ('width', 'height')})
                elif element['type'] == 'text':
                    font_hashes.append(resources.font(element))
            converted[lid] = (source, {**spec, 'font_sha256': sorted(set(font_hashes))})
            ledger.append({**record, 'status': 'converted', 'source_sha256': digest(source_bytes)})
    expected = set(selected) - set(selection['exclusions'])
    if set(converted) != expected:
        raise ValueError(f'Selected sources missing or sealed: {sorted(expected - set(converted))}')
    rasterized = resources.rasterize()
    designs = []
    for spec in selection['layouts']:
        lid = spec['layout_id']
        if lid not in converted:
            continue
        source, info = converted[lid]
        for element in source['elements']:
            if element['type'] == 'image':
                element['asset_id'] = rasterized.get(element['asset_id'], element['asset_id'])
        assert_schema_valid(source, schema)
        source_path = f'sources/{lid}.json'
        write(output / source_path, source)
        tasks = []
        for target in selection['targets']:
            canvas = {k: target[k] for k in ('width', 'height')}
            task = {'task_id': f'lica-{lid}-{target["width"]}x{target["height"]}',
                    'source': copy.deepcopy(source), 'target_canvas': canvas}
            file = f'tasks/{task["task_id"]}.json'
            write(output / file, task)
            tasks.append({'target': target['id'], 'file': file, 'sha256': digest((output / file).read_bytes())})
        designs.append({**info, 'source': source_path, 'tasks': tasks})
    manifest = {'version': selection['version'], 'schema_sha256': SCHEMA_SHA256, 'targets': selection['targets'],
                'designs': designs, 'categories': dict(Counter(d['category'] for d in designs)),
                'splits': dict(Counter(d['split'] for d in designs)), 'exclusions': selection['exclusions']}
    write(output / 'manifest.json', manifest)
    write(output / 'input-ledger.json', ledger)
    write(output / 'resources/index.json', resources.index())
    (output / 'ATTRIBUTION.md').write_text(
        '# Attribution\n\nLICA WORLD dataset: https://github.com/purvanshi/lica-dataset\n\n'
        'Licensed CC BY 4.0: https://creativecommons.org/licenses/by/4.0/\n\n'
        'Modifications: official schema conversion, displayed text transforms, agreed weight mapping, '
        'justified text mapped left, SVG rasterization, deterministic missing IDs, and generated resize targets. '
        'Original template/layout IDs and source hashes are in manifest.json; element changes are in conversion-ledgers/.\n\n'
        'Fonts retain their separate licenses, copyright and source URLs in resources/index.json; '
        'license texts, WOFF2 originals and TTF derivatives are stored by hash in resources/blobs/. '
        'Each asset URL, original hash and raster derivative hash/size is recorded there. '
        'The dataset does not separately document rights for embedded photos.\n')
    size = package_size(output)
    print(f'{len(designs)} designs, {sum(len(d["tasks"]) for d in designs)} tasks; '
          f'tasks + shared resources: {size["tasks_plus_resources_bytes"]:,} bytes', flush=True)
    if not args.tasks_only:
        from .render import run
        run(output, args.lica_data, args.upstream, schema)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--lica-data', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--upstream', type=Path, required=True)
    parser.add_argument('--selection', type=Path, default=Path(__file__).with_name('batch-selection.json'))
    parser.add_argument('--asset-cache', type=Path, default=ROOT / '.cache/lica-import/assets')
    parser.add_argument('--font-cache', type=Path, default=ROOT / '.cache/lica-import/fonts')
    parser.add_argument('--offline', action='store_true', help='Refuse missing cached fonts or assets')
    parser.add_argument('--tasks-only', action='store_true', help='Prepare/schema-check input bundle without rendering')
    rebuild(parser.parse_args())


if __name__ == '__main__':
    main()
