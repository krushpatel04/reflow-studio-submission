import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES } from '../src/fixtures';
import { reflow } from '../src/engine';
import { renderSvg } from '../src/render';
import { renderPng } from '../scripts/native';
import { validateDesign, type Design } from '../src/model';
import type { Measure } from '../src/typography';
const measure: Measure = (text, e) => ({ width: text.length * e.fontSize * 0.52, ascent: e.fontSize * 0.78, descent: e.fontSize * 0.2 });
const target = { id: 'x', label: 'X', width: 600, height: 800 };
function problem(run: () => unknown, category: string, path: string) {
  assert.throws(run, (e: any) => e.name === 'DesignValidationError' && e.category === category && e.path === path);
}
for (const assetId of ['unavailable-art', 'constructor', '__proto__']) test(`bundled reflow diagnoses missing asset ${assetId} before measuring`, () => {
  const input = structuredClone(FIXTURES[0]);
  if (input.elements[2].type === 'image') input.elements[2].assetId = assetId;
  assert.doesNotThrow(() => validateDesign(input)); // Structurally legal reference.
  let calls = 0;
  problem(() => reflow(input, target, (...args) => { calls++; return measure(...args); }), 'resource', '$.elements[2].assetId');
  assert.equal(calls, 0);
});
for (const [family, weight] of [['Absent Family', 500], ['Source Serif 4', 500], ['Inter', 450]] as const) test(`bundled reflow diagnoses unsupported font ${family}/${weight}`, () => {
  const input = structuredClone(FIXTURES[0]); const text = input.elements[0];
  if (text.type === 'text') { text.fontFamily = family; text.fontWeight = weight; }
  assert.doesNotThrow(() => validateDesign(input));
  problem(() => reflow(input, target, measure), 'resource', '$.elements[0].fontFamily');
});
test('SVG and native entry points report structure/resource failures rather than renderer exceptions', () => {
  const input = structuredClone(FIXTURES[0]);
  if (input.elements[2].type === 'image') input.elements[2].assetId = 'missing';
  for (const render of [(d: Design) => renderSvg(d, measure), renderPng]) {
    problem(() => render(input), 'resource', '$.elements[2].assetId');
    const malformed = structuredClone(FIXTURES[0]); malformed.elements[0].opacity = -1;
    problem(() => render(malformed), 'structure', '$.elements[0].opacity');
  }
});
test('caller-provided non-fixture resources work for reflow and SVG without mutating inputs', () => {
  const input = structuredClone(FIXTURES[0]); input.id = 'permissioned-poster'; input.provenance = 'permissioned: author supplied';
  for (const e of input.elements) {
    if (e.type === 'image') e.assetId = 'client-art';
    if (e.type === 'text') e.fontFamily = 'Client Sans';
  }
  const uri = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/%3E';
  const resources = { resolveAsset: (id: string) => id === 'client-art' ? uri : undefined, supportsFont: (family: string, weight: number) => family === 'Client Sans' && [500, 700].includes(weight) };
  const before = structuredClone(input);
  const output = reflow(input, target, measure, resources);
  assert.equal(output.selected.design.elements[2].type, 'image');
  const svg = renderSvg(output.selected.design, measure, undefined, resources);
  assert.ok(svg.includes('Client Sans'));
  assert.ok(svg.includes('data:image/svg+xml,'));
  assert.deepEqual(input, before);
  problem(() => reflow(input, target, measure), 'resource', '$.elements[0].fontFamily');
});
test('supplied capabilities are honored even for bundled IDs and family names', () => {
  const resources = { resolveAsset: () => undefined, supportsFont: () => false };
  problem(() => reflow(FIXTURES[0], target, measure, resources), 'resource', '$.elements[0].fontFamily');
});
test('every bundled fixture still renders and reflows with default resources', () => {
  for (const input of FIXTURES) {
    const output = reflow(input, target, measure);
    assert.ok(renderSvg(output.selected.design, measure).startsWith('<svg'));
  }
});
