import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../src/evaluate';
import { reflow, uniform } from '../src/engine';
import { FIXTURES } from '../src/fixtures';
import { TARGETS, type Design, type Element, type Finding } from '../src/model';
import { measure } from '../scripts/native';
import { badge, imagePrice } from './support/grouped-designs';

// Paired controls: each injected defect has a legal counterpart that must stay clean.
const design = (elements: Element[], extra: Partial<Design> = {}): Design => ({
  schemaVersion: 'reflow.design.v0', id: 'layers', name: 'Layers', description: 'Layering probe', provenance: 'synthetic',
  width: 1000, height: 1000, background: '#ffffff', groups: [], elements, ...extra,
});
const headline = (extra: Partial<Element> = {}): Element => ({ id: 'headline', type: 'text', role: 'content', x: 100, y: 100, width: 800, height: 120,
  text: 'A clear headline here', fontFamily: 'Inter', fontSize: 64, fontWeight: 700, lineHeight: 1.1, color: '#111111', ...extra } as Element);
const sticker = (x: number, y: number, width: number, height: number, extra: Partial<Element> = {}): Element =>
  ({ id: 'sticker', type: 'rect', role: 'decoration', x, y, width, height, color: '#e34850', ...extra } as Element);
const move = (d: Design, id: string, patch: Partial<Element>) => {
  const out = structuredClone(d);
  Object.assign(out.elements.find(e => e.id === id)!, patch);
  return out;
};
const kinds = (findings: Finding[], kind: Finding['kind']) => findings.filter(f => f.kind === kind);
const at = (source: Design, width: number, height: number) => uniform(source, { id: 't', label: 't', width, height });

test('an opaque decoration moved over content is occlusion; the same decoration left clear is not', () => {
  const source = design([headline(), sticker(700, 700, 200, 200)]);
  const covered = evaluate(source, move(source, 'sticker', { x: 100, y: 100, width: 800, height: 120 }), measure).findings;
  assert.ok(kinds(covered, 'occlusion').some(f => f.severity === 'error' && f.elementIds.includes('headline') && f.elementIds.includes('sticker')), JSON.stringify(covered));
  for (const [w, h] of [[1000, 1000], [1001, 1000], [2000, 700], [500, 1800]]) {
    assert.deepEqual(kinds(evaluate(source, at(source, w, h), measure).findings, 'occlusion'), [], `${w}×${h}`);
  }
});

test('an originally slight overlap that becomes substantially more obstructive is detected; the same slight overlap is legal', () => {
  const source = design([headline(), sticker(60, 90, 80, 140)]);
  assert.deepEqual(evaluate(source, source, measure).findings, []);
  assert.deepEqual(kinds(evaluate(source, at(source, 1600, 900), measure).findings, 'occlusion'), []);
  const worse = evaluate(source, move(source, 'sticker', { x: 60, y: 90, width: 500, height: 140 }), measure).findings;
  assert.equal(kinds(worse, 'occlusion').length, 1, JSON.stringify(worse));
});

test('the opaque full-canvas decorative cover fault injection reports hidden content, not only an inventory change', () => {
  const source = FIXTURES[0], changed = structuredClone(source);
  changed.elements.push({ id: 'cover', type: 'rect', role: 'decoration', x: 0, y: 0, width: changed.width, height: changed.height, color: changed.background });
  const occluded = kinds(evaluate(source, changed, measure).findings, 'occlusion').flatMap(f => f.elementIds);
  for (const e of source.elements.filter(e => e.role === 'content')) assert.ok(occluded.includes(e.id), `${e.id} not reported hidden`);
});

test('semi-transparent layering: a legal translucent overlay is retained, a moved one that hides most of the text is reported', () => {
  const behind = design([sticker(80, 80, 840, 160, { type: 'ellipse', opacity: 0.55 }), headline()]);
  assert.deepEqual(evaluate(behind, at(behind, 1920, 1080), measure).findings, []);
  const tint = design([headline(), sticker(100, 100, 800, 120, { color: '#00000033' })]);
  assert.deepEqual(evaluate(tint, at(tint, 1080, 1920), measure).findings, [], 'unchanged source tint is intentional');
  const veil = design([headline(), sticker(700, 700, 200, 200, { opacity: 0.8 })]);
  assert.equal(kinds(evaluate(veil, move(veil, 'sticker', { x: 90, y: 90, width: 820, height: 140 }), measure).findings, 'occlusion').length, 1);
});

test('text that ends up under a later-painted image is occluded', () => {
  const photo: Element = { id: 'photo', type: 'image', role: 'content', assetId: 'landscape', fit: 'cover', focalPoint: { x: 0.5, y: 0.5 }, x: 100, y: 400, width: 800, height: 500 };
  const source = design([headline(), photo]);
  assert.deepEqual(evaluate(source, source, measure).findings, []);
  const changed = evaluate(source, move(source, 'photo', { y: 80 }), measure).findings;
  assert.ok(kinds(changed, 'occlusion').some(f => f.elementIds[0] === 'headline' && f.elementIds.includes('photo')), JSON.stringify(changed));
});

const plate = (extra: Partial<Element> = {}): Element => ({ id: 'plate', type: 'rect', role: 'decoration', x: 100, y: 100, width: 500, height: 200, color: '#16362a', ...extra } as Element);
const label = (extra: Partial<Element> = {}): Element => ({ id: 'label', type: 'text', role: 'content', x: 140, y: 160, width: 420, height: 70,
  text: 'CALL TODAY', fontFamily: 'Inter', fontSize: 40, fontWeight: 700, lineHeight: 1.1, color: '#ffffff', ...extra } as Element);

test('white text that leaves its dark backing is reported as low contrast; text kept on its backing is not', () => {
  const source = design([plate(), label()]);
  assert.deepEqual(evaluate(source, source, measure).findings, []);
  assert.deepEqual(evaluate(source, at(source, 600, 1200), measure).findings, []);
  const separated = evaluate(source, move(source, 'label', { y: 600 }), measure).findings;
  assert.ok(kinds(separated, 'low-contrast').some(f => f.severity === 'error' && f.elementIds[0] === 'label'), JSON.stringify(separated));
});

test('the grouped mixed-role separation is reported as invisible text, independently of the group check', () => {
  const source = badge(), changed = move(source, 'label', { y: 600 });
  const findings = evaluate(source, changed, measure).findings;
  assert.ok(kinds(findings, 'group-geometry').length);
  assert.ok(kinds(findings, 'low-contrast').some(f => f.elementIds.includes('label')), JSON.stringify(findings));
});

test('contrast is computed against a composited semi-transparent backing at nearby and extreme ratios', () => {
  // White over 60% black on white composites to #666666: 5.7:1, legible.
  const legible = design([plate({ color: '#000000', opacity: 0.6 }), label()]);
  for (const [w, h] of [[1000, 1000], [999, 1001], [3000, 400], [300, 3000]]) {
    assert.deepEqual(kinds(evaluate(legible, at(legible, w, h), measure).findings, 'low-contrast'), [], `${w}×${h}`);
  }
  const halfOff = evaluate(legible, move(legible, 'label', { x: 520 }), measure).findings;
  assert.equal(kinds(halfOff, 'low-contrast').length, 1, JSON.stringify(halfOff));
  // A source that is already faint (25% backing → about 1.7:1) is not a reflow defect when preserved.
  const faint = design([plate({ color: '#000000', opacity: 0.25 }), label({ color: '#ffffffee' })]);
  assert.deepEqual(kinds(evaluate(faint, at(faint, 1920, 1080), measure).findings, 'low-contrast'), []);
});

test('an intended overlap that grows substantially becomes a collision; the unchanged intentional overlap stays legal', () => {
  const photo: Element = { id: 'photo', type: 'image', role: 'content', assetId: 'orbit', fit: 'cover', focalPoint: { x: 0.5, y: 0.5 }, x: 100, y: 100, width: 800, height: 360 };
  const caption = headline({ id: 'caption', y: 450, height: 90, fontSize: 48 });
  const source = design([photo, caption]);
  assert.deepEqual(evaluate(source, at(source, 1400, 900), measure).findings, []);
  const grown = evaluate(source, move(source, 'caption', { y: 250 }), measure).findings;
  assert.ok(kinds(grown, 'collision').some(f => f.elementIds.includes('caption') && f.elementIds.includes('photo')), JSON.stringify(grown));
  const overlap = FIXTURES.find(f => f.id === 'intentional-overlap')!;
  for (const target of TARGETS) assert.deepEqual(kinds(evaluate(overlap, uniform(overlap, target), measure).findings, 'collision'), []);
});

test('an extreme cover crop reports the retained share of the source-visible image; matching frames and contain do not', () => {
  const photo = (extra: Partial<Element> = {}): Element => ({ id: 'photo', type: 'image', role: 'content', assetId: 'landscape', fit: 'cover', focalPoint: { x: 0.5, y: 0.5 }, x: 100, y: 100, width: 600, height: 400, ...extra } as Element);
  const source = design([photo()]);
  const narrow = evaluate(source, move(source, 'photo', { width: 100 }), measure).findings;
  const loss = kinds(narrow, 'crop-loss');
  assert.equal(loss.length, 1, JSON.stringify(narrow));
  assert.equal(loss[0].severity, 'warning');
  assert.deepEqual(loss[0].elementIds, ['photo']);
  assert.match(loss[0].message, /17%/); // 100×400 of a 3:2 asset keeps 200 of 1200 source columns.
  assert.deepEqual(evaluate(source, move(source, 'photo', { width: 300, height: 200 }), measure).findings, []);
  const contained = design([photo({ fit: 'contain' })]);
  assert.deepEqual(evaluate(contained, move(contained, 'photo', { width: 100 }), measure).findings, []);
});

// Contract: crop-loss covers "an image with known dimensions" of ANY role (decoration included: same geometry, same loss). Occlusion/contrast stay content-only.
for (const role of ['background', 'decoration'] as const) test(`crop-loss also covers a ${role}-role image; an unchanged frame and contain stay clean`, () => {
  const photo = (extra: Partial<Element> = {}): Element => ({ id: 'photo', type: 'image', role, assetId: 'landscape', fit: 'cover', focalPoint: { x: 0.5, y: 0.5 }, x: 0, y: 0, width: 600, height: 400, ...extra } as Element);
  const source = design([headline(), photo()]);
  const loss = kinds(evaluate(source, move(source, 'photo', { width: 100 }), measure).findings, 'crop-loss');
  assert.deepEqual(loss.map(f => [f.severity, f.elementIds]), [['warning', ['photo']]]);
  assert.match(loss[0].message, /17%/);
  assert.deepEqual(kinds(evaluate(source, source, measure).findings, 'crop-loss'), []);
  const contained = design([headline(), photo({ fit: 'contain' })]);
  assert.deepEqual(kinds(evaluate(contained, move(contained, 'photo', { width: 100 }), measure).findings, 'crop-loss'), []);
  assert.deepEqual(evaluate(source, move(source, 'photo', { width: 100 }), measure).findings.filter(f => f.kind === 'occlusion' || f.kind === 'low-contrast'), [], 'visibility checks other than crop-loss stay content-only');
});

test('unreadable asset dimensions skip crop diagnostics instead of guessing', () => {
  const source = design([{ id: 'photo', type: 'image', role: 'content', assetId: 'client', fit: 'cover', focalPoint: { x: 0.5, y: 0.5 }, x: 100, y: 100, width: 600, height: 400 }]);
  const resources = { resolveAsset: () => 'https://example.com/client.jpg', supportsFont: () => true };
  assert.deepEqual(evaluate(source, move(source, 'photo', { width: 50 }), measure, resources).findings, []);
});

const NEW_KINDS = new Set<Finding['kind']>(['occlusion', 'low-contrast']);
test('positive controls: fixtures and grouped designs add no occlusion or contrast errors across formats, nearby and extreme sizes', () => {
  for (const source of [...FIXTURES, badge(), badge('background'), imagePrice()]) {
    assert.deepEqual(evaluate(source, source, measure).findings.filter(f => NEW_KINDS.has(f.kind) || f.kind === 'crop-loss'), [], source.id);
    const sizes = [...TARGETS.map(t => [t.width, t.height]), [source.width + 1, source.height], [source.width - 8, source.height + 8], [1440, 480], [420, 1600]];
    for (const [width, height] of sizes) {
      const result = reflow(source, { id: 'probe', label: 'Probe', width, height }, measure);
      const bad = result.selected.metrics.findings.filter(f => NEW_KINDS.has(f.kind));
      assert.deepEqual(bad, [], `${source.id} ${width}×${height} selected ${result.selected.strategy}`);
    }
  }
});

test('occlusion, contrast, collision and crop findings name the affected region in design coordinates', () => {
  const inside = (r: { x: number; y: number; width: number; height: number } | undefined, box: { x: number; y: number; width: number; height: number }) =>
    !!r && r.width > 0 && r.height > 0 && r.x >= box.x - 1e-6 && r.y >= box.y - 1e-6 && r.x + r.width <= box.x + box.width + 1e-6 && r.y + r.height <= box.y + box.height + 1e-6;
  const covered = design([headline(), sticker(700, 700, 200, 200)]);
  const hidden = kinds(evaluate(covered, move(covered, 'sticker', { x: 100, y: 100, width: 300, height: 120 }), measure).findings, 'occlusion')[0];
  assert.ok(inside(hidden?.region, { x: 100, y: 100, width: 300, height: 120 }), JSON.stringify(hidden));
  const plated = design([plate(), label()]);
  const faint = kinds(evaluate(plated, move(plated, 'label', { y: 600 }), measure).findings, 'low-contrast')[0];
  assert.ok(inside(faint?.region, { x: 140, y: 600, width: 420, height: 70 }), JSON.stringify(faint));
  const photo: Element = { id: 'photo', type: 'image', role: 'content', assetId: 'orbit', fit: 'cover', focalPoint: { x: 0.5, y: 0.5 }, x: 100, y: 100, width: 800, height: 360 };
  const pair = design([photo, headline({ id: 'caption', y: 700, height: 90, fontSize: 48 })]);
  const collision = kinds(evaluate(pair, move(pair, 'caption', { y: 300 }), measure).findings, 'collision')[0];
  assert.deepEqual(collision?.region, { x: 100, y: 300, width: 800, height: 90 });
  const wide = design([{ ...photo, assetId: 'landscape', width: 600, height: 400 }]);
  const crop = kinds(evaluate(wide, move(wide, 'photo', { width: 100 }), measure).findings, 'crop-loss')[0];
  assert.deepEqual(crop?.region, { x: 100, y: 100, width: 100, height: 400 });
});
