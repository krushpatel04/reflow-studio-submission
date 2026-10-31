"""Content-addressed fonts and assets, with source and license provenance."""
import hashlib
import io
import json
import math
from pathlib import Path
import subprocess
from urllib.request import urlopen


def digest(data):
    return hashlib.sha256(data).hexdigest()


class BlobStore:
    def __init__(self, resources):
        self.root = Path(resources) / 'blobs'
        self.root.mkdir(parents=True, exist_ok=True)
        self.entries = {}

    def put(self, data, kind):
        key = digest(data)
        path = self.root / key
        if path.exists():
            if digest(path.read_bytes()) != key:
                raise ValueError(f'Existing blob hash mismatch: {key}')
        else:
            path.write_bytes(data)
        entry = self.entries.setdefault(key, {'bytes': len(data), 'kinds': []})
        if kind not in entry['kinds']:
            entry['kinds'].append(kind)
            entry['kinds'].sort()
        return key


def acquire(url, candidates, offline, expected=None):
    """Cache first; at most two acquisition attempts for a missing resource."""
    data = None
    for candidate in candidates:
        if candidate.is_file():
            data = candidate.read_bytes()
            break
    if data is None:
        if offline:
            raise FileNotFoundError(f'Offline resource unavailable: {url}')
        for attempt in range(2):
            try:
                with urlopen(url, timeout=60) as response:
                    data = response.read()
                break
            except OSError:
                if attempt == 1:
                    raise
    if expected and digest(data) != expected:
        raise ValueError(f'Source hash mismatch: {url}')
    return data


class Resources:
    def __init__(self, output, asset_cache, font_cache, offline=False):
        self.store = BlobStore(Path(output) / 'resources')
        self.asset_cache = Path(asset_cache)
        self.font_cache = Path(font_cache)
        self.offline = offline
        self.assets = {}
        self.fonts = {}
        self.svg_jobs = {}
        self.svg_request_urls = {}
        self.browser_version = None
        self.font_sources = json.loads(Path(__file__).with_name('font-sources.json').read_text())

    def asset(self, url, box):
        if url not in self.assets:
            cache = self.asset_cache / digest(url.encode())
            candidates = [cache] + (sorted(cache.iterdir()) if cache.is_dir() else [])
            data = acquire(url, candidates, self.offline)
            key = self.store.put(data, 'asset-original')
            svg = data.lstrip().startswith(b'<') and b'<svg' in data[:4096]
            if not svg:
                from PIL import Image
                with Image.open(io.BytesIO(data)) as image:
                    image.verify()
            self.assets[url] = {'url': url, 'original_sha256': key, 'svg': svg, 'derivatives': []}
        entry = self.assets[url]
        if not entry['svg']:
            return entry['original_sha256']
        box = dict(box)
        key = digest(json.dumps([entry['original_sha256'], box], sort_keys=True).encode())
        self.svg_jobs.setdefault(key, {'id': key, 'original_path': str(self.store.root / entry['original_sha256']),
                                       'box': box, 'blob_dir': str(self.store.root), 'url': url})
        self.svg_request_urls.setdefault(key, set()).add(url)
        return 'svg:' + key

    def font(self, element):
        weight = 700 if element['font_weight'] == 'bold' else 400
        key = (element['font_family'], weight, element['font_style'])
        if key not in self.fonts:
            from fontTools.ttLib import TTFont
            records = [f for f in self.font_sources if (f['family'], f['weight'], f['style']) == key]
            if len(records) != 1:
                raise ValueError(f'Unrecorded font face: {key}')
            record = dict(records[0]); folder = self.font_cache / record['font_id'] / 'package'
            filename = record['source_url'].rsplit('/', 1)[1]
            woff = acquire(record['source_url'], [folder / 'files' / filename], self.offline, record['woff2_sha256'])
            license_bytes = acquire(record['license_url'], [folder / 'LICENSE'], self.offline, record['license_sha256'])
            font = TTFont(io.BytesIO(woff), recalcTimestamp=False); font.flavor = None
            buffer = io.BytesIO(); font.save(buffer); ttf = buffer.getvalue()
            if digest(ttf) != record['ttf_sha256']:
                raise ValueError(f'Converted font hash mismatch: {key}')
            self.store.put(woff, 'font-woff2'); self.store.put(ttf, 'font-ttf'); self.store.put(license_bytes, 'font-license')
            self.fonts[key] = (record, font.getBestCmap())
        record, cmap = self.fonts[key]
        missing = sorted({c for c in element['content'] if not c.isspace() and ord(c) not in cmap})
        if missing:
            raise ValueError(f'Missing glyphs for {key}: {missing}')
        return record['ttf_sha256']

    def rasterize(self):
        if not self.svg_jobs:
            return {}
        command = ['node', str(Path(__file__).with_name('rasterize.cjs'))]
        # A browser/tool failure stops after the second attempt. Data/code errors
        # remain visible to the caller and are repaired with regression controls.
        for attempt in range(2):
            result = subprocess.run(command, input=json.dumps(list(self.svg_jobs.values())), text=True,
                                    capture_output=True)
            if result.returncode == 0:
                break
            if attempt == 1:
                raise RuntimeError(result.stderr)
        records = json.loads(result.stdout)
        # Validate the whole response before publishing any provenance links.
        ids = [record['id'] for record in records]
        if len(ids) != len(set(ids)) or set(ids) != set(self.svg_jobs):
            raise ValueError('Raster results must cover each requested job exactly once')
        verified = []
        from PIL import Image
        for record in records:
            job = self.svg_jobs[record['id']]
            key = record['sha256']
            if len(key) != 64 or any(c not in '0123456789abcdef' for c in key):
                raise ValueError('Invalid raster SHA256')
            data = (self.store.root / key).read_bytes()
            if digest(data) != key:
                raise ValueError(f'Raster blob hash mismatch: {key}')
            expected = {axis: max(1, math.ceil(job['box'][axis] * 2))
                        for axis in ('width', 'height')}
            with Image.open(io.BytesIO(data)) as image:
                if (image.format != 'PNG' or record['size'] != expected or
                        image.size != (expected['width'], expected['height'])):
                    raise ValueError(f'Raster dimensions or format mismatch: {key}')
                image.verify()
            derivative = {'sha256': key, 'source_box': dict(job['box']),
                          'pixels': dict(record['size'])}
            for url in self.svg_request_urls[record['id']]:
                existing = self.assets[url]['derivatives']
                if any(d['source_box'] == job['box'] and d != derivative for d in existing):
                    raise ValueError(f'Conflicting raster result for requested URL and box: {url}')
            verified.append((record, data, derivative, record['chromium_version']))
        resolved = {}
        for record, data, derivative, browser_version in verified:
            key = self.store.put(data, 'asset-raster')
            self.browser_version = browser_version
            for url in sorted(self.svg_request_urls[record['id']]):
                derivatives = self.assets[url]['derivatives']
                if derivative not in derivatives:
                    derivatives.append(dict(derivative))
                    derivatives.sort(key=lambda d: json.dumps(d, sort_keys=True))
            resolved['svg:' + record['id']] = key
        return resolved

    def index(self):
        return {'blobs': dict(sorted(self.store.entries.items())),
                'fonts': [v[0] for _, v in sorted(self.fonts.items())],
                'assets': [v for _, v in sorted(self.assets.items())], 'chromium_version': self.browser_version}
