import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { Design } from '../src/model';
import { renderPreview, sideBySide } from '../scripts/lica-preview';

const design = (elements: Design['elements']): Design => ({
  schemaVersion: 'reflow.design.v0', id: 'p', name: 'p', description: '', provenance: 'test', width: 100, height: 50, background: '#ffffff', groups: [], elements,
});
async function pixel(png: Buffer, x: number, y: number) {
  const img = await loadImage(png);
  const ctx = createCanvas(img.width, img.height).getContext('2d');
  ctx.drawImage(img, 0, 0);
  return [...ctx.getImageData(x, y, 1, 1).data];
}

test('renders the canvas background and shapes at the design size', async () => {
  const png = renderPreview(design([{ id: 'r', type: 'rect', role: 'decoration', x: 0, y: 0, width: 50, height: 50, color: '#ff0000' }]), new Map());
  const img = await loadImage(png);
  assert.deepEqual([img.width, img.height], [100, 50]);
  assert.deepEqual(await pixel(png, 25, 25), [255, 0, 0, 255]);
  assert.deepEqual(await pixel(png, 75, 25), [255, 255, 255, 255]);
});

test('a missing image is an error, not a blank area', () => {
  const d = design([{ id: 'i', type: 'image', role: 'content', x: 0, y: 0, width: 10, height: 10, assetId: 'nope', fit: 'cover', focalPoint: { x: 0.5, y: 0.5 } }]);
  assert.throws(() => renderPreview(d, new Map()), /Missing image nope/);
});

test('side-by-side scales the reference to the converted height and adds a label strip', async () => {
  const left = createCanvas(100, 50).toBuffer('image/png');
  const right = createCanvas(60, 30).toBuffer('image/png');
  const img = await loadImage(await sideBySide(left, right));
  assert.deepEqual([img.width, img.height], [60 + 16 + 60, 30 + 24]);
});
