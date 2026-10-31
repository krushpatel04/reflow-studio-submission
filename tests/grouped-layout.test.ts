import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { badge, imagePrice } from './support/grouped-designs';
import { FIXTURES } from '../src/fixtures';
import { reflow, uniform } from '../src/engine';
import { evaluate } from '../src/evaluate';
import type { Design, Element } from '../src/model';
import { measure, renderPng } from '../scripts/native';

function close(actual: number, expected: number, label: string) {
  assert.ok(Math.abs(actual - expected) <= 1e-7 * Math.max(1, Math.abs(expected)), `${label}: ${actual} != ${expected}`);
}
function coherent(source: Design, output: Design) {
  for (const group of source.groups) {
    const members = source.elements.filter(e => e.groupId === group.id);
    if (members.length < 2) continue;
    const original = members[0], anchor = output.elements.find(e => e.id === original.id)!;
    const scale = anchor.width / original.width;
    for (const e of members) {
      const placed = output.elements.find(n => n.id === e.id)!;
      close(placed.x, anchor.x + (e.x - original.x) * scale, `${e.id}.x`);
      close(placed.y, anchor.y + (e.y - original.y) * scale, `${e.id}.y`);
      close(placed.width, e.width * scale, `${e.id}.width`);
      close(placed.height, e.height * scale, `${e.id}.height`);
    }
  }
}
const examples = [badge(), badge('background'), badge('background', 'decoration'), imagePrice(), FIXTURES.find(f => f.id === 'intentional-overlap')!];
for (const source of examples) test(`every candidate transforms all group roles coherently: ${source.id}`, () => {
  const before = structuredClone(source);
  for (const [width, height] of [[1001, 1000], [600, 1200], [1600, 400], [80, 3000], [8000, 1]]) {
    const result = reflow(source, { id: 'test', label: 'Test', width, height }, measure);
    for (const c of result.candidates) {
      coherent(source, c.design);
      assert.deepEqual(c.design.elements.map(e => e.id), source.elements.map(e => e.id));
      assert.deepEqual(c.design.groups, source.groups);
    }
  }
  assert.deepEqual(source, before);
});
for (const [name, change] of [
  ['move inside backing', (e: Element) => { e.x += 8; }],
  ['resize one member', (e: Element) => { e.height *= 0.9; }],
] as const) test(`evaluator diagnoses changed group geometry: ${name}`, () => {
  const source = badge(), output = structuredClone(source); change(output.elements[1]);
  const findings = evaluate(source, output, measure).findings;
  assert.ok(findings.some(f => String(f.kind) === 'group-geometry' && f.elementIds.includes('label') && f.elementIds.includes('plate')), JSON.stringify(findings));
});
test('uniform scale, translation, optional declaration order and fitted font sizes are legal', () => {
  const source = imagePrice(); source.groups.push({ id: 'unused', label: '' });
  for (const factor of [0.001, 0.5, 1, 7.9]) {
    const output = uniform(source, { id: 't', label: 'T', width: source.width * factor, height: source.height * factor });
    output.groups.reverse();
    for (const e of output.elements) { e.x += 0.123; e.y += 0.456; if (e.type === 'text') e.fontSize *= 0.9; }
    coherent(source, output);
    assert.ok(!evaluate(source, output, measure).findings.some(f => String(f.kind) === 'group-geometry'));
  }
});
test('group geometry is checked across non-content roles, without constraining ungrouped elements', () => {
  const source = badge('background', 'decoration'), output = structuredClone(source);
  output.elements[1].x += 10;
  assert.ok(evaluate(source, output, measure).findings.some(f => String(f.kind) === 'group-geometry'));
  source.groups = []; output.groups = [];
  for (const d of [source, output]) for (const e of d.elements) delete e.groupId;
  assert.ok(!evaluate(source, output, measure).findings.some(f => String(f.kind) === 'group-geometry'));
});
test('ungrouped canvas backgrounds still fill arranged outputs; identity remains exact', () => {
  const source = badge(); source.elements.unshift({ id: 'canvas', type: 'rect', role: 'background', x: 0, y: 0, width: 1000, height: 1000, color: '#fff' });
  assert.deepEqual(reflow(source, { id: 'identity', label: 'Identity', width: 1000, height: 1000 }, measure).selected.design, source);
  for (const c of reflow(source, { id: 'tall', label: 'Tall', width: 600, height: 1200 }, measure).candidates.filter(c => c.strategy !== 'uniform')) {
    const bg = c.design.elements[0]; assert.deepEqual([bg.x, bg.y, bg.width, bg.height], [0, 0, 600, 1200]);
  }
});
test('native pixels show white glyphs inside the dark backing in every ordinary candidate', async () => {
  const source = badge();
  for (const c of reflow(source, { id: 'tall', label: 'Tall', width: 600, height: 1200 }, measure).candidates) {
    const png = await loadImage(renderPng(c.design));
    const canvas = createCanvas(png.width, png.height), ctx = canvas.getContext('2d'); ctx.drawImage(png, 0, 0);
    const plate = c.design.elements.find(e => e.id === 'plate')!;
    const scale = Math.min(1, 720 / c.design.width, 900 / c.design.height);
    const x = Math.ceil((plate.x + 5) * scale), y = Math.ceil((plate.y + 5) * scale);
    const width = Math.floor((plate.width - 10) * scale), height = Math.floor((plate.height - 10) * scale);
    const data = ctx.getImageData(x, y, width, height).data;
    let white = 0, dark = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 220 && data[i + 1] > 220 && data[i + 2] > 220) white++;
      if (data[i] < 50 && data[i + 1] < 80 && data[i + 2] < 70) dark++;
    }
    assert.ok(dark > width * height * 0.5, `${c.strategy}: dark backing missing`);
    assert.ok(white >= 40, `${c.strategy}: visible white glyph ink missing inside backing (${white} pixels)`);
  }
});
