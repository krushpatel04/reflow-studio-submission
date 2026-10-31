import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES } from '../src/fixtures';
import { bounds, type Design, type TextElement } from '../src/model';
import { reflow, compareCandidates } from '../src/engine';
import { layoutText } from '../src/typography';
import { measure } from '../scripts/native';
import { productShelf } from './support/product-designs';
import { badge } from './support/grouped-designs';

const products = FIXTURES.find(f => f.id === 'product-pairs')!;
const square = { id: 'square', label: 'Square', width: 1080, height: 1080 };
const text = (d: Design, id: string) => d.elements.find(e => e.id === id) as TextElement;
const grids = (d: Design, target = square) => reflow(d, target, measure).candidates.filter(c => c.strategy.startsWith('group-grid'));

test('square products gain readable labels and prices without losing headline hierarchy', () => {
  const r = reflow(products, square, measure);
  const smallProducts = r.selected.metrics.findings.filter(f => f.kind === 'small-text' && f.elementIds.some(id => /^(label|price)-/.test(id)));
  assert.ok(smallProducts.length <= 2, `Expected at least four of six product warnings resolved, found ${smallProducts.length}`);
  assert.equal(r.selected.metrics.errors, 0);
  const labels = r.selected.design.elements.filter(e => e.type === 'text' && e.groupId) as TextElement[];
  assert.ok(text(r.selected.design, 'headline').fontSize >= 2 * Math.max(...labels.map(e => e.fontSize)));
  assert.ok(r.candidates.some(c => c.strategy.startsWith('group-grid') && c.metrics.errors === 0));
});

test('four backed product groups can occupy two columns with readable text and legal overlaps', () => {
  const source = productShelf();
  const candidate = grids(source).find(c => {
    const a = c.design.elements.find(e => e.id === 'photo-0')!, b = c.design.elements.find(e => e.id === 'photo-1')!;
    const next = c.design.elements.find(e => e.id === 'photo-2')!;
    return Math.abs(a.y - b.y) < 1 && b.x > a.x + a.width && next.y > a.y + a.height;
  });
  assert.ok(candidate, 'No two-column whole-group alternative was generated');
  assert.equal(candidate.metrics.errors, 0, JSON.stringify(candidate.metrics.findings));
  for (const e of candidate.design.elements.filter(e => e.type === 'text')) {
    assert.ok(e.fontSize * 360 / 1080 >= 9, `${e.id}: ${e.fontSize}`);
  }
});

test('bookend space follows measured wrapping before group space is allocated', () => {
  const short = productShelf(), long = structuredClone(short);
  text(long, 'title').text = 'Tools for a slower morning\nMade carefully for everyday rituals';
  const a = grids(short), b = grids(long);
  assert.ok(a.length && b.length, 'Expected alternatives for both supported shelves');
  for (const before of a) {
    const after = b.find(c => c.strategy === before.strategy)!;
    assert.ok(after);
    const title = text(after.design, 'title');
    assert.ok(title.height > text(before.design, 'title').height);
    assert.equal(title.fontSize, text(before.design, 'title').fontSize, 'Allocate height before shrinking the headline');
    assert.ok(layoutText(title, measure).height <= title.height + 0.01);
    const grouped = after.design.elements.filter(e => e.groupId);
    assert.ok(bounds(grouped).y >= title.y + title.height);
  }
});

for (const source of [products, productShelf()]) test(`grid candidates preserve all source content and rigid geometry: ${source.id}`, () => {
  const original = structuredClone(source);
  for (const [width, height] of [[1080, 1080], [1080, 1920], [1920, 1080], [320, 1800], [8000, 1]]) {
    const r = reflow(source, { ...square, width, height }, measure);
    assert.ok(r.candidates.length <= 7, 'At most four bounded extra alternatives');
    for (const c of r.candidates) {
      assert.deepEqual(c.design.groups, source.groups);
      assert.deepEqual(c.design.elements.map(e => e.id), source.elements.map(e => e.id));
      assert.ok(!c.metrics.findings.some(f => ['preservation', 'group-geometry', 'missing-content'].includes(f.kind)));
      for (const group of source.groups) {
        const originals = source.elements.filter(e => e.groupId === group.id);
        const placed = c.design.elements.filter(e => e.groupId === group.id);
        const scale = placed[0].width / originals[0].width;
        for (const [i, e] of placed.entries()) {
          const s = originals[i];
          assert.ok(Math.abs(e.x - placed[0].x - (s.x - originals[0].x) * scale) < 1e-6);
          assert.ok(Math.abs(e.y - placed[0].y - (s.y - originals[0].y) * scale) < 1e-6);
          assert.ok(Math.abs(e.width - s.width * scale) < 1e-6);
          assert.ok(Math.abs(e.height - s.height * scale) < 1e-6);
        }
      }
      for (const e of c.design.elements) assert.ok([e.x, e.y, e.width, e.height].every(Number.isFinite));
    }
    assert.deepEqual([...r.candidates].reverse().sort((a, b) => compareCandidates(a, b, source))[0], r.selected);
  }
  assert.deepEqual(source, original);
});

test('identity and healthy nearby product composition remain stable', () => {
  for (const source of [products, productShelf()]) {
    assert.deepEqual(reflow(source, { ...square, width: source.width, height: source.height }, measure).selected.design, source);
    for (const delta of [-1, 1]) {
      const r = reflow(source, { ...square, width: source.width + delta, height: source.height }, measure);
      assert.equal(r.selected.strategy, 'uniform');
    }
  }
});

test('ambiguous associations and cross-group overlaps keep the existing conservative alternatives', () => {
  const ungrouped = structuredClone(products);
  ungrouped.groups = [];
  ungrouped.elements.forEach(e => { delete e.groupId; });
  const overlap = structuredClone(products);
  overlap.elements.filter(e => e.groupId === 'product-1').forEach(e => { e.x -= 100; });
  const sidebar = structuredClone(products);
  text(sidebar, 'footer').y = 500;
  for (const source of [ungrouped, overlap, sidebar, badge(), FIXTURES.find(f => f.id === 'quiet-brand')!]) {
    assert.equal(grids(source).length, 0, source.id);
  }
});

test('invalid product input fails before requesting native measurements', () => {
  const fail = () => { assert.fail('Invalid input reached measurement'); };
  const malformed = productShelf(); malformed.elements[1].width = -1;
  assert.throws(() => reflow(malformed, square, fail), /width/);
  assert.throws(() => reflow(products, { ...square, height: 0 }, fail), /height/);
});

test('all returned grid documents own their bookends and do not alias other candidates', () => {
  const r = reflow(products, square, measure);
  const frozen = structuredClone(r.candidates);
  const grid = r.candidates.find(c => c.strategy.startsWith('group-grid'))!;
  assert.ok(grid);
  text(grid.design, 'headline').text = 'Changed by a caller';
  for (const [i, c] of r.candidates.entries()) if (c !== grid) assert.deepEqual(c, frozen[i]);
});

test('impossible bookends retain visible legacy findings and do not create overflowing grids', () => {
  const source = productShelf();
  text(source, 'title').text = Array(100).fill('A full line of required copy').join('\n');
  const r = reflow(source, square, measure);
  assert.equal(r.candidates.filter(c => c.strategy.startsWith('group-grid')).length, 0);
  assert.ok(r.selected.metrics.warnings + r.selected.metrics.errors > 0);
  assert.equal(text(r.selected.design, 'title').text, text(source, 'title').text);
});

test('the supported two/six-group boundaries use geometry regardless of source and element names', () => {
  for (const count of [2, 6, 7]) {
    const source = productShelf();
    const members = source.elements.filter(e => e.groupId === 'item-0');
    source.width = 160 + count * 420;
    source.groups = Array.from({ length: count }, (_, i) => ({ id: `renamed-${i}`, label: 'A product' }));
    source.elements = [text(source, 'title'), ...source.groups.flatMap((g, i) => members.map((e, j) => ({
      ...structuredClone(e), id: `anonymous-${i}-${j}`, groupId: g.id, x: e.x + i * 420,
    }))), text(source, 'footer')];
    for (const e of source.elements.filter(e => !e.groupId)) e.width = source.width - 160;
    source.id = `unknown-${count}`;
    const alternatives = grids(source, { ...square, height: 1920 });
    if (count === 7) assert.equal(alternatives.length, 0, 'Above the bounded slice remains conservative');
    else {
      assert.ok(alternatives.length >= 2 && alternatives.length <= 3);
      for (const c of alternatives) assert.equal(c.metrics.errors, 0, JSON.stringify(c.metrics.findings));
    }
  }
});
