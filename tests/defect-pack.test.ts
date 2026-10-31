import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDefectPack } from '../scripts/defect-pack';

const pack = buildDefectPack();
const rect = (r: unknown) => !!r && typeof r === 'object' && ['x', 'y', 'width', 'height'].every(k => Number.isFinite((r as Record<string, number>)[k]));

test('the pack is versioned, frozen and explicit that labels are not independent review', () => {
  assert.equal(pack.schemaVersion, 'reflow.defect-pack.v1');
  assert.match(pack.status, /author-labelled/);
  assert.match(pack.status, /independent review pending/);
  assert.match(pack.frozen.engineCommit, /^[0-9a-f]{40}$/);
  assert.match(pack.frozen.renderer, /^@napi-rs\/canvas@\d+\.\d+\.\d+$/);
  assert.ok(pack.frozen.fonts.length > 0 && pack.frozen.fonts.every(f => /^[0-9a-f]{64}$/.test(f.sha256) && /@fontsource\/.+@\d/.test(f.package)));
  assert.deepEqual(pack.frozen.assets.map(a => a.id).sort(), ['landscape', 'orbit', 'product']);
  assert.ok(pack.frozen.assets.every(a => /^[0-9a-f]{64}$/.test(a.sha256)));
  for (const c of pack.cases) for (const side of [c.source, c.output]) assert.match(side.sha256, /^[0-9a-f]{64}$/, c.id);
});

test('defects cover clipping, occlusion, contrast, crop and glyph failures; controls include overlays, transparency and attractive corruptions', () => {
  const defects = pack.cases.filter(c => c.label === 'defect'), legal = pack.cases.filter(c => c.label === 'legal');
  for (const category of ['clipping', 'occlusion', 'contrast', 'contrast-over-image', 'crop', 'glyph']) assert.ok(defects.some(c => c.category === category), category);
  assert.ok(defects.filter(c => c.attractive).length >= 2, 'attractive-looking corrupted negatives');
  for (const category of ['legal-overlay', 'transparency', 'faint-source', 'legal-crop', 'engine-output']) assert.ok(legal.some(c => c.category === category), category);
  assert.ok(legal.filter(c => c.category === 'engine-output').length >= 3);
});

test('every defect is tied to an element and a region from the evaluator or the rendered check', () => {
  for (const c of pack.cases.filter(c => c.label === 'defect')) {
    const regions = [...c.evaluator.findings.map(f => f.region), ...c.rendered.elements.map(e => e.region)].filter(Boolean);
    assert.ok(c.elements.length && (regions.length || c.method === 'none'), `${c.id}: no element/region evidence`);
    assert.ok(regions.every(rect), c.id);
  }
});

test('rendered verdicts agree with author labels; evaluator disagreements are listed rather than hidden', () => {
  for (const c of pack.cases) if (c.rendered.verdict !== 'not-measured') {
    assert.notEqual(c.rendered.verdict, 'no-verdict', `${c.id}: no rendered evidence`);
    assert.equal(c.rendered.verdict === 'defect', c.label === 'defect', `${c.id}: rendered ${c.rendered.verdict}`);
  }
  const listed = new Set(pack.disagreements.map(d => d.id));
  for (const c of pack.cases) assert.equal(listed.has(c.id), (c.evaluator.verdict === 'flagged') !== (c.label === 'defect'), c.id);
  // Known limits of the geometric evaluator, recorded as disagreements.
  assert.ok(listed.has('caption-onto-matching-photo-region'));
  assert.ok(listed.has('subject-kept-narrow-crop'));
});
