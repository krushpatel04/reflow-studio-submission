import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES } from '../src/fixtures';
import { reflow, uniform } from '../src/engine';
import { evaluate } from '../src/evaluate';
import type { Design, Element } from '../src/model';
import type { Measure } from '../src/typography';
const measure: Measure = (text, e) => ({ width: [...text].length * e.fontSize * 0.52, ascent: e.fontSize * 0.78, descent: e.fontSize * 0.2 });
const protectedFindings = (source: Design, output: Design) => evaluate(source, output, measure).findings.filter(f => ['missing-content', 'preservation', 'invalid-design'].includes(f.kind));
const changes: [string, (d: Design) => void, string][] = [
  ['document ID', d => { d.id += '-changed'; }, '$.id'],
  ['name', d => { d.name += 'changed'; }, '$.name'],
  ['description', d => { d.description += 'changed'; }, '$.description'],
  ['provenance', d => { d.provenance = 'imported'; }, '$.provenance'],
  ['canvas color', d => { d.background = '#123456'; }, '$.background'],
  ['group label', d => { d.groups[0].label = 'new meaning'; }, '$.groups'],
  ['extra group', d => { d.groups.push({ id: 'extra', label: 'extra' }); }, '$.groups'],
  ['missing element', d => { d.elements.splice(0, 1); }, '$.elements'],
  ['extra decoration', d => { d.elements.push({ id: 'cover', type: 'rect', role: 'decoration', x: 0, y: 0, width: d.width, height: d.height, color: '#000' }); }, '$.elements'],
  ['duplicate element', d => { d.elements.push(structuredClone(d.elements[0])); }, '$.elements'],
  ['new ID', d => { d.elements[0].id = 'replaced'; }, '$.elements'],
  ['type', d => { const e = d.elements[0]; d.elements[0] = { id: e.id, type: 'rect', role: e.role, x: e.x, y: e.y, width: e.width, height: e.height, color: '#172b25' }; }, '$.elements[0]'],
  ['copy', d => { if (d.elements[0].type === 'text') d.elements[0].text += 'changed'; }, '$.elements[0].text'],
  ['asset ID', d => { if (d.elements[2].type === 'image') d.elements[2].assetId = 'product'; }, '$.elements[2].assetId'],
  ['role', d => { d.elements[0].role = 'decoration'; }, '$.elements[0].role'],
  ['group membership', d => { d.elements[0].groupId = d.groups[0].id; }, '$.elements[0].groupId'],
  ['opacity to invisible', d => { d.elements[0].opacity = 0; }, '$.elements[0].opacity'],
  ['paint order', d => { [d.elements[0], d.elements[1]] = [d.elements[1], d.elements[0]]; }, '$.elements'],
  ['text color', d => { if (d.elements[0].type === 'text') d.elements[0].color = '#ff0000'; }, '$.elements[0].color'],
  ['font family', d => { if (d.elements[0].type === 'text') d.elements[0].fontFamily = 'Source Serif 4'; }, '$.elements[0].fontFamily'],
  ['font weight', d => { if (d.elements[0].type === 'text') d.elements[0].fontWeight = 700; }, '$.elements[0].fontWeight'],
  ['line height', d => { if (d.elements[0].type === 'text') d.elements[0].lineHeight = 1.2; }, '$.elements[0].lineHeight'],
  ['align', d => { if (d.elements[0].type === 'text') d.elements[0].align = 'right'; }, '$.elements[0].align'],
  ['image fit', d => { if (d.elements[2].type === 'image') d.elements[2].fit = 'contain'; }, '$.elements[2].fit'],
  ['image focal point', d => { if (d.elements[2].type === 'image') d.elements[2].focalPoint.x = 0; }, '$.elements[2].focalPoint'],
  ['rectangle color', d => { if (d.elements[5].type === 'rect') d.elements[5].color = '#f00'; }, '$.elements[5].color'],
];
for (const [label, change, path] of changes) test(`detect protected ${label} independently`, () => {
  const source = structuredClone(FIXTURES[0]), output = structuredClone(source);
  change(output);
  const findings = protectedFindings(source, output);
  assert.ok(findings.some(f => f.severity === 'error' && f.message.includes(path)), `${label}: expected a protected-field error at ${path}, got ${JSON.stringify(findings)}`);
});
test('protect ellipse styling and content across decoration/background roles', () => {
  for (const role of ['decoration', 'background'] as const) {
    const source = structuredClone(FIXTURES.find(f => f.id === 'layered-art')!);
    source.elements[0].role = role;
    for (const change of [(e: Element) => { e.opacity = 0; }, (e: Element) => { if (e.type === 'ellipse') e.color = '#000'; }]) {
      const output = structuredClone(source); change(output.elements[0]);
      assert.ok(protectedFindings(source, output).some(f => f.elementIds.includes(source.elements[0].id)));
    }
  }
});
test('optional defaults are equivalent in either direction and zero source opacity stays legal', () => {
  const source = structuredClone(FIXTURES[0]);
  const output = structuredClone(source);
  for (const e of output.elements) { e.opacity ??= 1; if (e.type === 'text') e.align ??= 'left'; }
  assert.deepEqual(protectedFindings(source, output), []);
  assert.deepEqual(protectedFindings(output, source), []);
  source.elements[0].opacity = 0;
  assert.deepEqual(protectedFindings(source, structuredClone(source)), []);
  const visible = structuredClone(source); visible.elements[0].opacity = 1;
  assert.ok(protectedFindings(source, visible).length);
});
test('only the enumerated layout fields may change and group definition order is immaterial', () => {
  const source = structuredClone(FIXTURES[0]), output = structuredClone(source);
  output.width = 2000; output.height = 2000; output.groups.reverse();
  for (const e of output.elements) {
    e.x += 10; e.y += 12; e.width *= 0.8; e.height *= 0.9;
    if (e.type === 'text') e.fontSize *= 0.8;
    if (e.type === 'rect') e.radius = 10;
  }
  assert.deepEqual(protectedFindings(source, output), []);
});
test('all candidates preserve contract, intentional layering and source immutability', () => {
  const strategies = new Set<string>();
  for (const fixture of FIXTURES) {
    const source = structuredClone(fixture), before = structuredClone(fixture);
    for (const [width, height] of [[source.width, source.height], [777, 777], [420, 1600], [1440, 480]]) {
      const result = reflow(source, { id: 'test', label: 'Test', width, height }, measure);
      for (const candidate of result.candidates) {
        strategies.add(candidate.strategy);
        assert.deepEqual(protectedFindings(source, candidate.design), []);
      }
      if (width === source.width && height === source.height) assert.deepEqual(result.selected.design, source);
    }
    assert.deepEqual(source, before);
    const output = uniform(source, { id: 'small', label: 'Small', width: source.width / 2, height: source.height / 2 });
    assert.deepEqual(protectedFindings(source, output), []);
  }
  assert.deepEqual([...strategies].sort(), ['group-grid-1', 'group-grid-2', 'group-grid-3', 'identity', 'split', 'stack', 'uniform']);
  for (const id of ['intentional-overlap', 'layered-art']) {
    const source = FIXTURES.find(f => f.id === id)!;
    assert.equal(evaluate(source, source, measure).errors, 0);
  }
});
test('malformed candidate data returns invalid-design findings before text measurement', () => {
  for (const mutate of [(d: any) => { d.elements[0].text = null; }, (d: any) => { d.elements[0].width = NaN; }, (d: any) => { d.elements[2].focalPoint = null; }]) {
    const output = structuredClone(FIXTURES[0]); mutate(output);
    const metrics = evaluate(FIXTURES[0], output, () => { throw new Error('must not measure'); });
    assert.ok(metrics.errors > 0);
    assert.ok(metrics.findings.some(f => f.kind === 'invalid-design'));
    assert.ok(Number.isFinite(metrics.contentCoverage));
  }
});

test('deleting non-default protected values and group definitions is detected', () => {
  const source = structuredClone(FIXTURES[0]); source.elements[0].opacity = 0.5;
  for (const change of [
    (d: Design) => { delete d.elements[0].opacity; },
    (d: Design) => { if (d.elements[6].type === 'text') delete d.elements[6].align; },
    (d: Design) => { delete d.elements[6].groupId; },
    (d: Design) => { d.groups.pop(); },
  ]) {
    const output = structuredClone(source); change(output);
    assert.ok(protectedFindings(source, output).length);
  }
});
test('validation and evaluation accept a deeply frozen source', () => {
  function freeze(value: any): any { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
  const source = freeze(structuredClone(FIXTURES[0]));
  const before = structuredClone(source);
  const result = reflow(source, { id: 'small', label: 'Small', width: 540, height: 675 }, measure);
  assert.deepEqual(protectedFindings(source, result.selected.design), []);
  assert.deepEqual(source, before);
});
