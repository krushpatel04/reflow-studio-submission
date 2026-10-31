import test from 'node:test';
import assert from 'node:assert/strict';
import { reflow, compareCandidates } from '../src/engine';
import { evaluate } from '../src/evaluate';
import { compositionChange, readabilityDeficit } from '../src/ranking';
import { uniform } from '../src/engine';
import { RANKING_VALIDATION } from './support/ranking-designs';
import { measure as nativeMeasure } from '../scripts/native';
import { FIXTURES } from '../src/fixtures';
import { longHeadlineProductShelf, productShelf } from './support/product-designs';
import type { Candidate, Design } from '../src/model';
import type { Measure } from '../src/typography';

const measure: Measure = (text, e) => ({ width: [...text].length * e.fontSize * 0.52, ascent: e.fontSize * 0.78, descent: e.fontSize * 0.2 });
const target = (width: number, height: number) => ({ id: 'test', label: 'Test', width, height });
const drift = (a: Design, b: Design) => Math.max(0, ...a.elements.map((e, i) => {
  const f = b.elements[i];
  return Math.hypot((e.x + e.width / 2) / a.width - (f.x + f.width / 2) / b.width,
    (e.y + e.height / 2) / a.height - (f.y + f.height / 2) / b.height);
}));
const rescale = (source: Design, s: number): Design => ({ ...structuredClone(source), width: source.width * s, height: source.height * s,
  elements: source.elements.map(e => ({ ...e, x: e.x * s, y: e.y * s, width: e.width * s, height: e.height * s,
    ...(e.type === 'text' ? { fontSize: e.fontSize * s } : {}), ...(e.type === 'rect' && e.radius !== undefined ? { radius: e.radius * s } : {}) })) });

for (const source of FIXTURES) test(`${source.id}: nearby width/height sweep retains composition`, () => {
  for (const [dw, dh] of [[-8, 0], [-2, 0], [-1, 0], [1, 0], [2, 0], [8, 0], [0, -8], [0, -1], [0, 1], [0, 8], [8, -8]]) {
    const r = reflow(source, target(source.width + dw, source.height + dh), measure);
    assert.equal(r.baseline.metrics.errors, 0, 'Healthy baseline required for this regression');
    assert.equal(r.selected.metrics.errors, 0);
    assert.ok(drift(source, r.selected.design) < 0.02, `${dw},${dh}: ${r.selected.strategy} moved content by ${drift(source, r.selected.design)}`);
    for (const e of source.elements) {
      if (e.type !== 'image') continue;
      const f = r.selected.design.elements.find(f => f.id === e.id)!;
      assert.ok(Math.abs((f.width / f.height) / (e.width / e.height) - 1) < 0.01, 'Minor resize changed image framing');
    }
  }
});

test('large format change can trade composition for materially better reading size', () => {
  const r = reflow(FIXTURES[0], target(2200, 500), measure);
  assert.equal(r.baseline.metrics.errors, 0);
  assert.equal(r.selected.metrics.errors, 0);
  assert.notEqual(r.selected.strategy, 'uniform');
  assert.ok(r.selected.metrics.minReadingSize >= 9);
  assert.ok(r.selected.metrics.minReadingSize > r.baseline.metrics.minReadingSize + 1);
});

test('wide gallery becomes readable at a tall aspect ratio instead of retaining a tiny letterboxed caption', () => {
  const source = RANKING_VALIDATION.find(s => s.id === 'gallery-diptych')!;
  const r = reflow(source, target(1080, 1920), nativeMeasure);
  assert.ok(r.baseline.metrics.minReadingSize < 8);
  assert.equal(r.selected.metrics.errors, 0);
  assert.ok(r.selected.metrics.minReadingSize >= 9, 'Materially different format should use a feasible readable arrangement');
});

test('scale, metadata and ID changes do not change a nearby composition decision', () => {
  const source = FIXTURES.find(f => f.id === 'edge-subject')!;
  const r = reflow(source, target(source.width + 1, source.height), measure);
  const scaled = rescale(source, 2);
  scaled.id = 'unseen-source'; scaled.name = 'Renamed';
  for (const [i, e] of scaled.elements.entries()) e.id = `new-${i}`;
  const other = reflow(scaled, { ...target(scaled.width + 2, scaled.height), id: 'other', label: 'Other' }, measure);
  assert.equal(other.selected.strategy, r.selected.strategy);
  assert.ok(drift(r.selected.design, other.selected.design) < 1e-8);
});

test('text-free design preserves its composition instead of maximizing coverage', () => {
  const source: Design = { schemaVersion: 'reflow.design.v0', id: 'shapes', name: 'Shapes', description: 'No text', provenance: 'synthetic',
    width: 800, height: 800, background: '#ffffff', groups: [], elements: [
      { id: 'mark', type: 'ellipse', role: 'content', color: '#223344', x: 80, y: 110, width: 200, height: 170 },
      { id: 'accent', type: 'rect', role: 'decoration', color: '#aa6644', x: 300, y: 470, width: 200, height: 8 },
    ] };
  const original = structuredClone(source);
  const r = reflow(source, target(801, 800), measure);
  assert.ok(drift(source, r.selected.design) < .002);
  assert.deepEqual(source, original);
});

test('source-aware ranking prefers established relations over unnecessary font enlargement', () => {
  const source = FIXTURES.find(f => f.id === 'edge-subject')!;
  const original: Candidate = { strategy: 'uniform', design: structuredClone(source), metrics: evaluate(source, source, measure) };
  for (const mutation of ['alignment', 'spacing', 'hierarchy', 'crop'] as const) {
    const changed = structuredClone(original);
    const hero = changed.design.elements[0], title = changed.design.elements[1], footer = changed.design.elements[2];
    if (mutation === 'alignment') { title.x += 20; title.width -= 20; }
    if (mutation === 'spacing') { title.y -= 30; }
    if (mutation === 'hierarchy' && footer.type === 'text') footer.fontSize += 3;
    if (mutation === 'crop') { hero.height -= 100; }
    changed.metrics = evaluate(source, changed.design, measure);
    assert.equal(changed.metrics.errors, 0, mutation);
    assert.ok(compareCandidates(original, changed, source) < 0, mutation);
  }
});

test('hard preservation errors outrank a composition-perfect candidate', () => {
  const source = FIXTURES.find(f => f.id === 'edge-subject')!;
  const r = reflow(source, target(700, 1200), measure);
  const invalid = structuredClone(r.baseline);
  invalid.design.elements[0].opacity = 0;
  invalid.metrics = evaluate(source, invalid.design, measure);
  const valid = r.candidates.find(c => c.metrics.errors === 0)!;
  assert.ok(valid);
  assert.ok(compareCandidates(valid, invalid, source) < 0);
});

test('uniform scaling and letterboxing introduce no source-relation loss at any supported ratio', () => {
  for (const source of FIXTURES) for (const [width, height] of [[80, 3000], [8000, 1], [777, 777], [source.width, source.height]]) {
    const terms = compositionChange(source, uniform(source, target(width, height)));
    assert.ok(terms.loss < 1e-12, `${source.id} / ${width}x${height}: uniform transformation changed relations`);
    assert.ok(Object.values(terms).every(n => Number.isFinite(n) && n >= 0 && n <= 1));
  }
});

test('additional readable or empty text cannot hide an unreadable caption', () => {
  const source = structuredClone(FIXTURES.find(f => f.id === 'edge-subject')!);
  const caption = source.elements.find(e => e.id === 'footer')!;
  if (caption.type !== 'text') throw new Error('Expected caption');
  caption.fontSize = 12;
  const deficit = readabilityDeficit(source);
  source.elements.push({ ...caption, id: 'readable', fontSize: 90 });
  source.elements.push({ ...caption, id: 'empty', fontSize: .1, text: '' });
  assert.equal(readabilityDeficit(source), deficit);
  assert.ok(deficit > 0);
});

test('candidate order does not change a source-aware selection', () => {
  const source = FIXTURES[0];
  const r = reflow(source, target(2200, 500), measure);
  const reversed = [...r.candidates].reverse().sort((a, b) => compareCandidates(a, b, source));
  assert.equal(reversed[0].strategy, r.selected.strategy);
  const noContent = structuredClone(source);
  for (const e of noContent.elements) e.role = 'decoration';
  const empty = reflow(noContent, target(1000, 1000), measure);
  assert.equal([...empty.candidates].reverse().sort((a, b) => compareCandidates(a, b, noContent))[0].strategy, 'uniform');
});

test('a one-pixel move past square does not discard a healthy four-product row', () => {
  for (const source of [productShelf(), longHeadlineProductShelf()]) {
    const before = reflow(source, target(1350, 1080), nativeMeasure);
    const after = reflow(source, target(1351, 1080), nativeMeasure);
    assert.equal(before.selected.strategy, 'group-grid-4');
    assert.equal(after.selected.strategy, 'group-grid-4');
    assert.equal(after.selected.metrics.errors, 0);
    assert.equal(after.selected.metrics.warnings, 0);
    assert.ok(drift(before.selected.design, after.selected.design) < .01,
      'A 1px width change moved products between different rows');
  }
});

test('four-product row still yields to a larger-photo story and a source-like wide format', () => {
  const source = productShelf();
  const story = reflow(source, target(1080, 1920), nativeMeasure);
  assert.equal(story.selected.strategy, 'group-grid-3');
  assert.ok(!story.candidates.some(c => c.strategy === 'group-grid-4'));
  assert.equal(story.selected.metrics.errors, 0);
  assert.equal(story.selected.metrics.warnings, 0);
  const wide = reflow(source, target(1920, 1080), nativeMeasure);
  assert.equal(wide.selected.strategy, 'uniform');
  assert.equal(wide.selected.metrics.errors, 0);
  assert.equal(wide.selected.metrics.warnings, 0);
  assert.deepEqual(wide.selected.design, wide.baseline.design);
});
