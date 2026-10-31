import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES } from '../src/fixtures';
import { reflow } from '../src/engine';
import { evaluate } from '../src/evaluate';
import type { Design, TextElement } from '../src/model';
import { measure } from '../scripts/native';
import { longHeadlineProductShelf, productShelf } from './support/product-designs';

const square = { id: 'square', label: 'Square', width: 1080, height: 1080 };
const productText = (source: Design) => new Set(source.elements.filter(e => e.groupId && e.type === 'text').map(e => e.id));
const smallProducts = (source: Design, candidate: ReturnType<typeof reflow>['selected']) => {
  const ids = productText(source);
  return candidate.metrics.findings.filter(f => f.kind === 'small-text' && f.elementIds.some(id => ids.has(id)));
};

test('a valid long-headline square shelf gives four backed products readable labels and prices', () => {
  const source = longHeadlineProductShelf();
  assert.equal(evaluate(source, source, measure).errors, 0, 'The source must be a valid positive control');
  const original = structuredClone(source), result = reflow(source, square, measure);
  assert.equal(result.selected.metrics.errors, 0, JSON.stringify(result.selected.metrics.findings));
  assert.equal(smallProducts(source, result.selected).length, 0, 'Selected product labels and prices must clear the existing reading proxy');
  assert.ok(result.candidates.some(c => c.metrics.errors === 0 && smallProducts(source, c).length === 0), 'A feasible readable alternative must be generated');
  const title = result.selected.design.elements.find(e => e.id === 'title') as TextElement;
  const names = result.selected.design.elements.filter(e => e.type === 'text' && e.groupId) as TextElement[];
  assert.ok(title.fontSize >= 1.5 * Math.max(...names.map(e => e.fontSize)), 'The headline remains visibly prominent');
  assert.deepEqual(result.selected.design.elements.map(e => e.id), source.elements.map(e => e.id));
  for (const [index, e] of result.selected.design.elements.entries()) {
    const originalElement = source.elements[index];
    if (e.type === 'text' && originalElement.type === 'text') assert.equal(e.text, originalElement.text);
    if (e.type === 'image' && originalElement.type === 'image') assert.equal(e.assetId, originalElement.assetId);
  }
  assert.deepEqual(source, original);
});

test('healthy short-copy shelf and three-product fixture remain feasible and source-sized output stays exact', () => {
  for (const source of [productShelf(), longHeadlineProductShelf()]) {
    const squareResult = reflow(source, square, measure);
    assert.equal(squareResult.selected.metrics.errors, 0);
    assert.equal(smallProducts(source, squareResult.selected).length, 0);
    const identity = reflow(source, { id: 'source', label: 'Source', width: source.width, height: source.height }, measure);
    assert.equal(identity.candidates.length, 1);
    assert.deepEqual(identity.selected.design, source);
    for (const dw of [-1, 1]) assert.equal(reflow(source, { id: 'near', label: 'Near', width: source.width + dw, height: source.height }, measure).selected.strategy, 'uniform');
  }
  const three = FIXTURES.find(f => f.id === 'product-pairs')!;
  const result = reflow(three, square, measure);
  assert.equal(result.selected.metrics.errors, 0);
  assert.equal(smallProducts(three, result.selected).length, 0);
  assert.ok(!result.candidates.some(c => c.strategy === 'group-grid-4'), 'This alternative is for four groups only');
});

test('tall product variants retain adequately sized images instead of using a narrow four-column row', () => {
  for (const source of [productShelf(), longHeadlineProductShelf()]) {
    const story = reflow(source, { id: 'story', label: 'Story', width: 1080, height: 1920 }, measure);
    assert.equal(story.selected.metrics.errors, 0);
    const image = story.selected.design.elements.find(e => e.id === 'photo-0');
    assert.ok(image && image.width >= 260, `${source.id}: product photo uses only ${image?.width}px on a 1080px canvas`);
  }
});

test('dense four-product candidates keep price backing and copy attached at square and extreme sizes', () => {
  const source = longHeadlineProductShelf();
  for (const target of [square, { ...square, width: 320, height: 1800 }, { ...square, width: 1, height: 8000 }]) {
    const result = reflow(source, target, measure);
    assert.ok(result.candidates.length <= 7);
    for (const candidate of result.candidates) {
      assert.deepEqual(candidate.design.groups, source.groups);
      assert.deepEqual(candidate.design.elements.map(e => e.id), source.elements.map(e => e.id));
      assert.ok(!candidate.metrics.findings.some(f => ['preservation', 'group-geometry', 'missing-content'].includes(f.kind)));
      for (const group of source.groups) {
        const originals = source.elements.filter(e => e.groupId === group.id);
        const placed = candidate.design.elements.filter(e => e.groupId === group.id);
        const scale = placed[0].width / originals[0].width;
        for (const [i, e] of placed.entries()) {
          const s = originals[i];
          assert.ok(Math.abs(e.x - placed[0].x - (s.x - originals[0].x) * scale) < 1e-6);
          assert.ok(Math.abs(e.y - placed[0].y - (s.y - originals[0].y) * scale) < 1e-6);
          assert.ok(Math.abs(e.width - s.width * scale) < 1e-6);
          assert.ok(Math.abs(e.height - s.height * scale) < 1e-6);
          if (e.type === 'rect' && s.type === 'rect') assert.equal(e.color, s.color);
          if (e.type === 'text' && s.type === 'text') assert.deepEqual([e.text, e.color, e.fontFamily, e.fontWeight], [s.text, s.color, s.fontFamily, s.fontWeight]);
        }
      }
    }
  }
});

test('ambiguous associations and malformed targets do not gain a four-product row', () => {
  const ungrouped = longHeadlineProductShelf();
  ungrouped.groups = [];
  for (const e of ungrouped.elements) delete e.groupId;
  assert.ok(!reflow(ungrouped, square, measure).candidates.some(c => c.strategy === 'group-grid-4'));
  const bad = longHeadlineProductShelf();
  assert.throws(() => reflow(bad, { ...square, width: 0 }, () => { throw new Error('Reached measurement'); }), /width/);
});
