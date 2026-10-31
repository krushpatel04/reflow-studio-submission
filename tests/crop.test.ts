import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { assetSize, cropGeometry } from '../src/crop';
import { ASSETS } from '../src/assets';
import { FIXTURES } from '../src/fixtures';
import { renderSvg } from '../src/render';
import { measure, renderPng } from '../scripts/native';
import { cropProbes } from './support/crop-probes';

const close = (actual: number, expected: number, message?: string) => assert.ok(Math.abs(actual - expected) < 1e-9, `${message ?? ''} ${actual} ≠ ${expected}`);
const rect = (actual: { x: number; y: number; width: number; height: number }, expected: typeof actual, label = '') => {
  for (const key of ['x', 'y', 'width', 'height'] as const) close(actual[key], expected[key], `${label}.${key}`);
};

test('cover crops a wide asset continuously at left, center, right and intermediate focal points', () => {
  // A 1200×800 asset in a 100×200 frame scales by max(100/1200, 200/800) = 0.25 → 300×200 drawn.
  const frame = { x: 10, y: 20, width: 100, height: 200 }, asset = { width: 1200, height: 800 };
  for (const [fx, drawnX, sourceX] of [[0, 10, 0], [0.25, -40, 200], [0.5, -90, 400], [0.83, -156, 664], [1, -190, 800]]) {
    const crop = cropGeometry(frame, 'cover', { x: fx, y: 0.5 }, asset);
    rect(crop.drawn, { x: drawnX, y: 20, width: 300, height: 200 }, `drawn@${fx}`);
    rect(crop.visible, frame, `visible@${fx}`);
    rect(crop.source, { x: sourceX, y: 0, width: 400, height: 800 }, `source@${fx}`);
  }
});

test('contain letterboxes and positions the whole asset by its focal point without cropping', () => {
  // A 600×800 asset in a 400×100 frame scales by min(400/600, 100/800) = 0.125 → 75×100 drawn.
  const frame = { x: 0, y: 0, width: 400, height: 100 }, asset = { width: 600, height: 800 };
  for (const [fx, drawnX] of [[0, 0], [0.25, 81.25], [0.5, 162.5], [1, 325]]) {
    const crop = cropGeometry(frame, 'contain', { x: fx, y: 0.9 }, asset);
    rect(crop.drawn, { x: drawnX, y: 0, width: 75, height: 100 }, `drawn@${fx}`);
    rect(crop.visible, crop.drawn, `visible@${fx}`);
    rect(crop.source, { x: 0, y: 0, width: 600, height: 800 }, `source@${fx}`);
  }
});

test('scaling is uniform and a cover focal point is always inside the visible source region', () => {
  const assets = [{ width: 1200, height: 800 }, { width: 600, height: 800 }, { width: 37, height: 19 }];
  for (const asset of assets) for (const [width, height] of [[1, 900], [900, 1], [333, 333], [1080, 1920], [1920, 1080]]) {
    for (const fx of [0, 0.1, 0.34, 0.5, 0.66, 0.83, 1]) for (const fy of [0, 0.27, 0.5, 0.9, 1]) {
      for (const fit of ['cover', 'contain'] as const) {
        const crop = cropGeometry({ x: 5, y: 7, width, height }, fit, { x: fx, y: fy }, asset);
        assert.ok(Math.abs(crop.drawn.width / crop.drawn.height / (asset.width / asset.height) - 1) < 1e-9, 'asset stretched');
        if (fit === 'cover') {
          const s = crop.source;
          assert.ok(s.x - 1e-9 <= fx * asset.width && fx * asset.width <= s.x + s.width + 1e-9, `focal x outside crop ${fx} ${JSON.stringify(s)}`);
          assert.ok(s.y - 1e-9 <= fy * asset.height && fy * asset.height <= s.y + s.height + 1e-9, `focal y outside crop ${fy}`);
        }
      }
    }
  }
});

test('the edge-subject figure stays in view for cover frames from 1:4 to 2:1', () => {
  const hero = FIXTURES.find(f => f.id === 'edge-subject')!.elements.find(e => e.id === 'hero')!;
  if (hero.type !== 'image') throw new Error('Expected image');
  // The synthetic figure in src/assets.ts: head circle (950, 390) r48 and body ellipse (950, 580) rx74 ry125.
  const figure = { left: 876, right: 1024, top: 342, bottom: 705 };
  for (const aspect of [0.25, 0.3, 0.5, 1, 1230 / 710, 2]) {
    const crop = cropGeometry({ x: 0, y: 0, width: 400 * aspect, height: 400 }, hero.fit, hero.focalPoint, { width: 1200, height: 800 });
    const s = crop.source;
    assert.ok(s.x <= figure.left && figure.right <= s.x + s.width && s.y <= figure.top && figure.bottom <= s.y + s.height,
      `aspect ${aspect.toFixed(2)} crops the subject: visible ${JSON.stringify(s)}`);
  }
});

test('intrinsic asset dimensions are read from bundled SVG and PNG data URIs and match decoded images', async () => {
  for (const [id, uri] of Object.entries(ASSETS)) {
    const decoded = await loadImage(Buffer.from(decodeURIComponent(uri.slice(uri.indexOf(',') + 1))));
    assert.deepEqual(assetSize(uri), { width: decoded.width, height: decoded.height }, id);
  }
  const canvas = createCanvas(37, 19);
  assert.deepEqual(assetSize(`data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`), { width: 37, height: 19 });
  assert.deepEqual(assetSize(`data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 10"/>')}`), { width: 30, height: 10 });
  assert.equal(assetSize('https://example.com/unknown.jpg'), undefined);
  assert.equal(assetSize('data:image/svg+xml,%3Csvg%3E'), undefined);
});

const pixel = (data: Uint8ClampedArray, width: number, x: number, y: number) => [...data.subarray((y * width + x) * 4, (y * width + x) * 4 + 3)];
const hex = (color: string) => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));

test('malformed image data URIs use the unknown-size preview fallback', () => {
  const design = structuredClone(cropProbes[0].design);
  for (const uri of ['data:image/svg+xml,%ZZ', 'data:image/png;base64,%%%']) {
    assert.equal(assetSize(uri), undefined, uri);
    const svg = renderSvg(design, measure, undefined, { resolveAsset: () => uri, supportsFont: () => true });
    assert.match(svg, /preserveAspectRatio="xMaxYMid slice"/, uri);
  }
  assert.deepEqual(assetSize(`data:image/svg+xml,${encodeURIComponent('<svg width="30" height="10"/>')}`), { width: 30, height: 10 });
});

test('native PNG shows the hand-computed asset features inside each frame and clips to the element rectangle', async () => {
  for (const probe of cropProbes) {
    const image = await loadImage(renderPng(probe.design));
    const canvas = createCanvas(image.width, image.height), ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, image.width, image.height);
    for (const sample of probe.samples) {
      const actual = pixel(data, image.width, sample.x, sample.y), expected = hex(sample.color);
      assert.ok(actual.every((v, i) => Math.abs(v - expected[i]) <= 8), `${probe.design.id} ${sample.label} (${sample.x},${sample.y}): ${actual} vs ${sample.color}`);
    }
  }
});

test('SVG draws the same unstretched rectangle as the shared crop, clipped to its frame', () => {
  for (const probe of cropProbes) {
    const svg = renderSvg(probe.design, measure);
    for (const e of probe.design.elements) {
      if (e.type !== 'image') continue;
      const crop = cropGeometry(e, e.fit, e.focalPoint, assetSize(ASSETS[e.assetId])!);
      const group = new RegExp(`<g data-element-id="${e.id}"[^>]*>(.*?)</g>`).exec(svg)?.[1] ?? '';
      const image = /<image [^>]*>/.exec(group)?.[0] ?? '';
      const attr = (tag: string, name: string) => Number(new RegExp(` ${name}="([^"]+)"`).exec(tag)?.[1]);
      assert.match(image, /preserveAspectRatio="none"/, `${e.id}: expected explicit geometry`);
      for (const key of ['x', 'y', 'width', 'height'] as const) assert.ok(Math.abs(attr(image, key) - crop.drawn[key]) < 0.001, `${e.id}.${key}`);
      const clip = /<clipPath[^>]*><rect [^>]*>/.exec(group)?.[0] ?? '';
      for (const key of ['x', 'y', 'width', 'height'] as const) assert.ok(Math.abs(attr(clip.slice(clip.indexOf('<rect')), key) - e[key]) < 0.001, `${e.id} clip.${key}`);
    }
  }
});

test('an asset without readable dimensions still renders with the nearest alignment fallback', () => {
  const design = structuredClone(cropProbes[0].design);
  const uri = 'https://example.com/customer-photo.jpg';
  const resources = { resolveAsset: () => uri, supportsFont: () => true };
  const svg = renderSvg(design, measure, undefined, resources);
  assert.match(svg, /preserveAspectRatio="xMaxYMid slice"/);
});
