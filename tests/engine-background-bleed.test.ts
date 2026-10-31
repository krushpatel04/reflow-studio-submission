import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reflow, uniform } from '../src/engine';
import type { Design, Element } from '../src/model';
import { measure } from '../scripts/native';
import { DESIGNS, TARGETS, hasUngroupedBackground, snapshot } from './support/bleed-snapshot';

const res = { resolveAsset: () => 'local:a', supportsFont: () => true };
const text = (id: string, y: number, extra: Partial<Element> = {}): Element => ({ id, type: 'text', role: 'content', x: 100, y, width: 800, height: 80, text: 'Hello world',
  fontFamily: 'Inter', fontSize: 40, fontWeight: 400, color: '#000000', lineHeight: 1.2, ...extra }) as Element;
const bgImage = (extra: Partial<Element> = {}): Element => ({ id: 'bg', type: 'image', role: 'background', x: 0, y: 0, width: 1000, height: 1000, assetId: 'a', fit: 'cover', focalPoint: { x: .5, y: .5 }, ...extra }) as Element;
const design = (elements: Element[], groups: { id: string; label: string }[] = []): Design => ({ schemaVersion: 'reflow.design.v0', id: 'bleed', name: 'bleed', description: '', provenance: 'test',
  width: 1000, height: 1000, background: '#ffffff', groups, elements });
const box = (e: Element) => [e.x, e.y, e.width, e.height];
const run = (d: Design, w: number, h: number) => reflow(d, { id: 't', label: 'T', width: w, height: h }, measure, res);
const TALL = [[1000, 1250], [1600, 400], [400, 1600], [728, 90]] as const;

test('R2 uniform candidate stretches an ungrouped background to the full target', () => {
  for (const [w, h] of TALL) {
    const c = run(design([bgImage(), text('t1', 400)]), w, h).candidates.find(c => c.strategy === 'uniform')!;
    assert.deepEqual(box(c.design.elements.find(e => e.id === 'bg')!), [0, 0, w, h], `${w}x${h}`);
  }
});

test('N1 non-background geometry in the uniform candidate equals pure uniform() scaling', () => {
  const src = design([bgImage(), text('t1', 400), text('t2', 700)]);
  for (const [w, h] of TALL) {
    const got = run(src, w, h).candidates.find(c => c.strategy === 'uniform')!.design, want = uniform(src, { id: 't', label: 'T', width: w, height: h });
    for (const e of want.elements.filter(e => e.id !== 'bg')) assert.deepEqual(got.elements.find(g => g.id === e.id), e, e.id);
    assert.deepEqual(got.elements.map(e => e.id), src.elements.map(e => e.id));
    assert.deepEqual(got.groups, src.groups);
  }
});

test('N2 a grouped background is NOT stretched in the uniform candidate', () => {
  const src = design([bgImage({ groupId: 'g' }), text('t1', 400, { groupId: 'g' })], [{ id: 'g', label: 'g' }]);
  for (const [w, h] of TALL) {
    const got = run(src, w, h).candidates.find(c => c.strategy === 'uniform')!.design, want = uniform(src, { id: 't', label: 'T', width: w, height: h });
    assert.deepEqual(got.elements, want.elements, `${w}x${h}`);
  }
});

test('N3 same-size target (identity) keeps a partial-canvas background where it is', () => {
  const src = design([bgImage({ x: 100, y: 100, width: 500, height: 500 }), text('t1', 700)]);
  const r = run(src, 1000, 1000), id = r.candidates.find(c => c.strategy === 'identity')!;
  assert.deepEqual(box(id.design.elements[0]), [100, 100, 500, 500]);
  assert.deepEqual(id.design.elements, uniform(src, { id: 't', label: 'T', width: 1000, height: 1000 }).elements);
});

test('N4 no-role designs: every fixture x target result is byte-identical to the base-SHA snapshot', () => {
  const base = JSON.parse(readFileSync(new URL('./fixtures/bleed-base-snapshot.json', import.meta.url), 'utf8'));
  const now = snapshot();
  assert.deepEqual(Object.keys(now), Object.keys(base));
  assert.equal(Object.keys(now).length, DESIGNS().length * TARGETS.length);
  for (const k of Object.keys(base)) assert.deepEqual(now[k], base[k], k);
});

test('N4b the snapshot designs contain no ungrouped background, so it proves "no change when the feature does not apply" only', () => {
  assert.equal(DESIGNS().filter(hasUngroupedBackground).length, 0);
});

// SCOPE: N5 probed a FULL-CANVAS background only (one design, 5 targets) and found no selection flip. A PARTIAL-CANVAS background can change which candidate wins
// by design (Coordinator's run: 8 of 300; not reproduced here). This test pins the output shape only, not selection stability.
test('N5 selected design carries the full-bleed background and every id once', () => {
  const withBg = run(design([bgImage(), text('t1', 400)]), 1000, 1250), without = run(design([text('t1', 400)]), 1000, 1250);
  for (const r of [withBg, without]) assert.deepEqual(r.selected.design.elements.map(e => e.id).filter(id => id === 't1'), ['t1']);
  assert.deepEqual(box(withBg.selected.design.elements.find(e => e.id === 'bg')!), [0, 0, 1000, 1250]);
});
