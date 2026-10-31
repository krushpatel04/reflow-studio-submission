"""URL/box provenance contract. Mocked transport is not renderer fidelity evidence."""
import copy
import io
import json
import math
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from PIL import Image
from scripts.lica_official.resources import Resources, digest


SVG = b'<svg xmlns="http://www.w3.org/2000/svg"><rect width="3" height="2"/></svg>'
BOX = {'width': 3, 'height': 2}


def png(size=(6, 4), color=(1, 2, 3, 255)):
    stream = io.BytesIO()
    Image.new('RGBA', size, color).save(stream, format='PNG')
    return stream.getvalue()


def missing_bindings(index, requests, resolved):
    """Check public evidence, independently of job IDs and private queue state."""
    assets = {entry['url']: entry for entry in index['assets']}
    missing = []
    for url, original, box, reference in requests:
        entry = assets[url]
        matches = [d for d in entry['derivatives']
                   if d['sha256'] == resolved[reference] and d['source_box'] == box]
        if entry['original_sha256'] != digest(original) or len(matches) != 1:
            missing.append(url)
    return missing


class SvgDerivativeProvenance(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.cache = self.root / 'cache'
        self.cache.mkdir()
        self.resources = Resources(self.root / 'output', self.cache, self.root / 'fonts', offline=True)
        self.requests = []
        self.job_counts = []

    def request(self, url, data=SVG, box=None):
        box = dict(BOX if box is None else box)
        (self.cache / digest(url.encode())).write_bytes(data)
        reference = self.resources.asset(url, box)
        self.requests.append((url, data, copy.deepcopy(box), reference))
        return reference

    def response(self, command, *, input, text, capture_output):
        jobs = json.loads(input)
        self.job_counts.append(len(jobs))
        records = []
        for job in jobs:
            size = {axis: max(1, math.ceil(job['box'][axis] * 2)) for axis in ('width', 'height')}
            # Actual valid PNG blobs; this transport stub does not render SVG content.
            color = tuple(bytes.fromhex(digest(Path(job['original_path']).read_bytes()))[:3]) + (255,)
            data = png((size['width'], size['height']), color)
            key = digest(data)
            (Path(job['blob_dir']) / key).write_bytes(data)
            records.append({'id': job['id'], 'sha256': key, 'size': size, 'chromium_version': 'mock-only'})
        return subprocess.CompletedProcess(command, 0, json.dumps(records), '')

    def run_raster(self, transform=None):
        def response(*args, **kwargs):
            result = self.response(*args, **kwargs)
            if transform:
                records = json.loads(result.stdout)
                transformed = transform(records)
                result.stdout = json.dumps(records if transformed is None else transformed)
            return result
        with patch('scripts.lica_official.resources.subprocess.run', side_effect=response):
            return self.resources.rasterize()

    def assert_complete(self, resolved):
        index = self.resources.index()
        self.assertEqual(missing_bindings(index, self.requests, resolved), [])
        for entry in index['assets']:
            for derivative in entry['derivatives']:
                data = (self.resources.store.root / derivative['sha256']).read_bytes()
                self.assertEqual(digest(data), derivative['sha256'])
                with Image.open(io.BytesIO(data)) as image:
                    self.assertEqual(image.size, (derivative['pixels']['width'], derivative['pixels']['height']))

    def test_single_url(self):
        self.request('https://example.test/a.svg')
        self.assert_complete(self.run_raster())
        self.assertEqual(self.job_counts, [1])

    def test_aliases_share_one_render_and_each_receive_binding(self):
        refs = [self.request('https://example.test/' + name) for name in ('a.svg', 'b.svg')]
        self.assertEqual(refs[0], refs[1])
        self.assert_complete(self.run_raster())
        self.assertEqual(self.job_counts, [1])

    def test_reversed_alias_order_is_equally_complete(self):
        for name in ('b.svg', 'a.svg'):
            self.request('https://example.test/' + name)
        self.assert_complete(self.run_raster())
        self.assertEqual(self.job_counts, [1])

    def test_repeated_requests_are_one_association(self):
        for _ in range(3):
            self.request('https://example.test/a.svg')
        self.assert_complete(self.run_raster())
        self.assertEqual(self.job_counts, [1])

    def test_repeated_rasterize_does_not_duplicate_evidence(self):
        self.request('https://example.test/a.svg')
        first = self.run_raster()
        self.assertEqual(self.run_raster(), first)
        self.assert_complete(first)

    def test_late_alias_gets_binding_on_next_rasterize(self):
        self.request('https://example.test/a.svg')
        self.run_raster()
        self.request('https://example.test/b.svg')
        self.assert_complete(self.run_raster())

    def test_distinct_bytes_and_distinct_boxes_do_not_cross_link(self):
        self.request('https://example.test/a.svg')
        self.request('https://example.test/b.svg', SVG.replace(b'3', b'4'))
        self.request('https://example.test/c.svg', box={'width': 4, 'height': 2})
        self.assert_complete(self.run_raster())
        self.assertEqual(self.job_counts, [3])
        self.assertTrue(all(len(a['derivatives']) == 1 for a in self.resources.index()['assets']))

    def test_same_url_multiple_boxes_has_both_exact_bindings(self):
        self.request('https://example.test/a.svg')
        self.request('https://example.test/a.svg', box={'width': 3, 'height': 3})
        self.assert_complete(self.run_raster())
        self.assertEqual(self.job_counts, [2])
        self.assertEqual(len(self.resources.index()['assets'][0]['derivatives']), 2)

    def test_zero_and_fractional_boxes_keep_existing_raster_sizing(self):
        self.request('https://example.test/a.svg', box={'width': 0, 'height': 1.25})
        self.assert_complete(self.run_raster())
        self.assertEqual(self.resources.index()['assets'][0]['derivatives'][0]['pixels'], {'width': 1, 'height': 3})

    def test_raster_original_is_unchanged_and_needs_no_derivative(self):
        data = png()
        reference = self.request('https://example.test/a.png', data)
        self.assertEqual(reference, digest(data))
        self.assertEqual(self.run_raster(), {})
        self.assertEqual(self.job_counts, [])
        self.assertEqual(self.resources.index()['assets'][0]['derivatives'], [])

    def test_audit_detects_removed_alias_even_when_all_blob_hashes_pass(self):
        self.request('https://example.test/a.svg')
        self.request('https://example.test/b.svg')
        resolved = self.run_raster()
        index = self.resources.index()
        # Independent positive control built from observed request and verified output.
        index = copy.deepcopy(index)
        index['assets'][1]['derivatives'] = copy.deepcopy(index['assets'][0]['derivatives'])
        self.assertEqual(missing_bindings(index, self.requests, resolved), [])
        index['assets'][1]['derivatives'] = []
        self.assertEqual(missing_bindings(index, self.requests, resolved), ['https://example.test/b.svg'])
        for key in index['blobs']:
            self.assertEqual(digest((self.resources.store.root / key).read_bytes()), key)

    def test_incomplete_results_rejected_before_any_binding(self):
        self.request('https://example.test/a.svg')
        self.request('https://example.test/b.svg', box={'width': 4, 'height': 2})
        with self.assertRaises(ValueError):
            self.run_raster(lambda records: records[:1])
        self.assertTrue(all(not a['derivatives'] for a in self.resources.index()['assets']))

    def test_hash_mismatch_cannot_acquire_binding(self):
        self.request('https://example.test/a.svg')
        def corrupt(records):
            (self.resources.store.root / records[0]['sha256']).write_bytes(png(color=(9, 8, 7, 255)))
        with self.assertRaises(ValueError):
            self.run_raster(corrupt)
        self.assertEqual(self.resources.index()['assets'][0]['derivatives'], [])

    def test_non_png_result_cannot_acquire_binding(self):
        self.request('https://example.test/a.svg')
        def corrupt(records):
            data = b'not a PNG'
            key = digest(data)
            (self.resources.store.root / key).write_bytes(data)
            records[0]['sha256'] = key
        with self.assertRaises((ValueError, OSError)):
            self.run_raster(corrupt)
        self.assertEqual(self.resources.index()['assets'][0]['derivatives'], [])

    def test_missing_blob_cannot_acquire_binding(self):
        self.request('https://example.test/a.svg')
        def remove(records):
            (self.resources.store.root / records[0]['sha256']).unlink()
        with self.assertRaises(FileNotFoundError):
            self.run_raster(remove)
        self.assertEqual(self.resources.index()['assets'][0]['derivatives'], [])

    def test_wrong_pixel_dimensions_cannot_acquire_binding(self):
        self.request('https://example.test/a.svg')
        def wrong(records):
            records[0]['size']['width'] += 1
        with self.assertRaises(ValueError):
            self.run_raster(wrong)
        self.assertEqual(self.resources.index()['assets'][0]['derivatives'], [])

    def test_duplicate_results_rejected_before_any_binding(self):
        self.request('https://example.test/a.svg')
        with self.assertRaises(ValueError):
            self.run_raster(lambda records: records + [copy.deepcopy(records[0])])
        self.assertTrue(all(not a['derivatives'] for a in self.resources.index()['assets']))

    def test_unexpected_results_rejected_before_any_binding(self):
        self.request('https://example.test/a.svg')
        def wrong(records):
            extra = copy.deepcopy(records[0])
            extra['id'] = 'unknown-job'
            return records + [extra]
        with self.assertRaises((ValueError, KeyError)):
            self.run_raster(wrong)
        self.assertTrue(all(not a['derivatives'] for a in self.resources.index()['assets']))

    def test_missing_last_browser_version_does_not_publish_partial_bindings(self):
        self.request('https://example.test/a.svg')
        self.request('https://example.test/b.svg', box={'width': 4, 'height': 2})
        def missing_version(records):
            del records[-1]['chromium_version']
        with self.assertRaises(KeyError):
            self.run_raster(missing_version)
        index = self.resources.index()
        self.assertTrue(all(not a['derivatives'] for a in index['assets']))
        self.assertTrue(all('asset-raster' not in b['kinds'] for b in index['blobs'].values()))
        self.assertIsNone(index['chromium_version'])

    def test_process_failure_cannot_acquire_binding(self):
        self.request('https://example.test/a.svg')
        with patch('scripts.lica_official.resources.subprocess.run', return_value=subprocess.CompletedProcess([], 1, '', 'mock browser failure')) as run:
            with self.assertRaisesRegex(RuntimeError, 'mock browser failure'):
                self.resources.rasterize()
        self.assertEqual(run.call_count, 2)
        self.assertEqual(self.resources.index()['assets'][0]['derivatives'], [])


if __name__ == '__main__':
    unittest.main()
