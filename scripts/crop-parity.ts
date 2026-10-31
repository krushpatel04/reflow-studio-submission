/**
 * Writes native (Skia) PNG pixels for the shared crop probes to
 * reports/crop-parity/native-samples.json. tests/browser-checks.ts rasterizes the SVG of the same
 * probes in the browser and compares both against each other and the hand-derived colours.
 * Schema "reflow.crop-parity.v1": { probes: [{ id, samples: [{ label, x, y, expected, native: [r, g, b] }] }] }.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { cropProbes } from '../tests/support/crop-probes';
import { renderPng } from './native';

const probes = [];
for (const { design, samples } of cropProbes) {
  const image = await loadImage(renderPng(design));
  assert.equal(image.width, design.width, 'Probe PNGs must be rendered at 1:1 scale');
  const ctx = createCanvas(image.width, image.height).getContext('2d');
  ctx.drawImage(image, 0, 0);
  probes.push({ id: design.id, samples: samples.map(s => ({ label: s.label, x: s.x, y: s.y, expected: s.color, native: [...ctx.getImageData(s.x, s.y, 1, 1).data.subarray(0, 3)] })) });
}
await mkdir('reports/crop-parity', { recursive: true });
await writeFile('reports/crop-parity/native-samples.json', JSON.stringify({ schemaVersion: 'reflow.crop-parity.v1', generatedAt: new Date().toISOString(), probes }, null, 2));
console.log(`Crop parity: ${probes.reduce((n, p) => n + p.samples.length, 0)} native samples from ${probes.length} probes → reports/crop-parity/native-samples.json`);
