import type { Candidate, Design, Finding } from '../src/model';
import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES } from '../src/fixtures';
import { reflow, compareCandidates, selectCandidate, NoValidCandidateError } from '../src/engine';
import { evaluate } from '../src/evaluate';
import { layoutText, type Measure } from '../src/typography';
import { validateDesign, TARGETS } from '../src/model';
import { renderSvg } from '../src/render';
import { fitText } from '../src/typography';
import { badge } from './support/grouped-designs';

// Deterministic fixture measurer for invariant tests. Browser verification uses real fonts.
const measure: Measure = (text, e) => ({ width: [...text].length * e.fontSize * 0.52, ascent: e.fontSize * 0.78, descent: e.fontSize * 0.2 });

test('identity resize preserves the original document exactly', () => {
  for (const source of FIXTURES) {
    const result = reflow(source, { id: 'identity', label: 'Identity', width: source.width, height: source.height }, measure);
    assert.deepEqual(result.selected.design, source);
    assert.equal(result.candidates.length, 1);
  }
});
test('all source content, IDs, groups and styles survive several unseen aspect ratios without input mutation', () => {
  for (const source of FIXTURES) {
    const before = structuredClone(source);
    for (const [width, height] of [[1440, 480], [420, 1600], [777, 777], [20, 3000]]) {
      const result = reflow(source, { id: 'test', label: 'Test', width, height }, measure);
      for (const candidate of result.candidates) {
        assert.equal(candidate.design.width, width);
        assert.equal(candidate.design.height, height);
        assert.deepEqual(candidate.design.groups, source.groups);
        assert.deepEqual(candidate.design.elements.map(e => e.id), source.elements.map(e => e.id));
        candidate.design.elements.forEach((e, i) => {
          const s = source.elements[i];
          assert.equal(e.type, s.type); assert.equal(e.groupId, s.groupId); assert.equal(e.opacity, s.opacity);
          if (e.type === 'text' && s.type === 'text') {
            assert.equal(e.text, s.text); assert.equal(e.fontFamily, s.fontFamily); assert.equal(e.fontWeight, s.fontWeight); assert.equal(e.color, s.color);
          }
          if (e.type === 'image' && s.type === 'image') { assert.equal(e.assetId, s.assetId); assert.deepEqual(e.focalPoint, s.focalPoint); }
          assert.ok([e.x, e.y, e.width, e.height].every(Number.isFinite));
        });
      }
      assert.deepEqual(source, before);
    }
  }
});
test('long unbroken text wraps without dropping characters or splitting a grapheme', () => {
  const e = FIXTURES[0].elements.find(e => e.type === 'text')!;
  if (e.type !== 'text') throw new Error('Expected text fixture');
  const content = 'Supercalifragilisticexpialidocious👩‍🎨e\u0301';
  const out = layoutText({ ...e, text: content, width: 60, fontSize: 20 }, measure);
  assert.equal(out.lines.join(''), content);
  assert.ok(out.lines.some(line => line.includes('👩‍🎨')));
  assert.ok(out.lines.some(line => line.includes('e\u0301')));
});
test('intentional source image/text overlap is allowed, new unrelated overlap is detected', () => {
  const source = FIXTURES.find(f => f.id === 'intentional-overlap')!;
  assert.equal(evaluate(source, source, measure).findings.filter(f => f.kind === 'collision').length, 0);
  const changed = structuredClone(source);
  const description = changed.elements.find(e => e.id === 'description')!;
  const footer = changed.elements.find(e => e.id === 'footer')!;
  footer.x = description.x; footer.y = description.y;
  assert.ok(evaluate(source, changed, measure).findings.some(f => f.kind === 'collision' && f.elementIds.includes('footer')));
});
test('detectors catch a removed element, changed copy, off-canvas placement and clipping', () => {
  const source = FIXTURES[0], changed = structuredClone(source);
  changed.elements = changed.elements.filter(e => e.id !== 'hero');
  const headline = changed.elements.find(e => e.id === 'headline')!;
  if (headline.type !== 'text') throw new Error('Expected headline');
  headline.text += ' More words'; headline.height = 1; headline.x = -100;
  const findings = evaluate(source, changed, measure).findings;
  for (const kind of ['missing-content', 'out-of-bounds', 'text-overflow']) assert.ok(findings.some(f => f.kind === kind));
});
test('invalid schema and target geometry fail explicitly', () => {
  assert.throws(() => reflow(FIXTURES[0], { id: 'bad', label: 'Bad', width: NaN, height: 500 }, measure));
  assert.throws(() => reflow(FIXTURES[0], { id: 'bad', label: 'Bad', width: 0, height: 500 }, measure));
  const source = structuredClone(FIXTURES[0]); source.elements[1].id = source.elements[0].id;
  assert.throws(() => validateDesign(source), /unique/);
});
test('feasibility takes precedence over readability in candidate selection', () => {
  const result = reflow(FIXTURES[0], { id: 'test', label: 'Test', width: 1080, height: 1920 }, measure);
  const valid = structuredClone(result.baseline), invalid = structuredClone(result.baseline);
  valid.metrics.errors = 0; valid.metrics.warnings = 20;
  invalid.metrics.errors = 1; invalid.metrics.warnings = 0; invalid.metrics.minReadingSize = 100;
  assert.ok(compareCandidates(valid, invalid) < 0);
});

test('fitting reduces font size before splitting an otherwise ordinary word', () => {
  const source = FIXTURES[0].elements.find(e => e.type === 'text')!;
  if (source.type !== 'text') throw new Error('Expected text');
  const fitted = fitText({ ...source, text: 'Made for everyday.', width: 100, height: 300 }, 40, measure);
  assert.equal(layoutText(fitted, measure).emergencyBreaks, 0);
  assert.ok(fitted.fontSize < 40);
});

test('SVG font family containing a number is quoted as a CSS string', () => {
  const serif = FIXTURES.find(f => f.id === 'type-pairing')!;
  assert.ok(renderSvg(serif, measure).includes('font-family="\'Source Serif 4\'"'));
});

// Issue #26: structurally invalid generated output must never be reported as success.
const tiny = (width: number, fontSize = 0.5): Design => ({ schemaVersion: 'reflow.design.v0', id: 'overflow', name: 'overflow', description: '', provenance: 'test',
  width: 1, height: 1, background: '#ffffff', groups: [], elements: [
    { id: 'copy', type: 'text', role: 'content', x: 0, y: 0, width: 1, height: 1, text: 'a', fontFamily: 'Inter', fontSize, fontWeight: 400, color: '#000000', lineHeight: 1.2 },
    { id: 'wash', type: 'rect', role: 'decoration', x: 0, y: 0, width, height: 1, color: '#ff0000' }] });
const huge = { id: 'huge', label: 'Huge', width: 8000, height: 8000 };

test('numeric-overflow candidates fail explicitly with source unchanged', () => {
  const source = tiny(1e308), before = structuredClone(source);
  assert.throws(() => reflow(source, huge, measure), (e: any) => e instanceof NoValidCandidateError && e.code === 'no-valid-candidate' &&
    e.findings.length > 0 && e.findings.every((f: any) => f.kind === 'invalid-design'));
  assert.deepEqual(source, before);
});
test('control: same shape with finite scaled geometry still succeeds', () => {
  const result = reflow(tiny(1), huge, measure);
  assert.equal(result.selected.design.elements.every(e => Number.isFinite(e.width)), true);
});
test('control: legitimate warnings and intentional overlap are not disqualifying', () => {
  const overlap = FIXTURES.find(f => f.id === 'intentional-overlap')!;
  const r = reflow(overlap, { id: 'tall', label: 'Tall', width: 420, height: 1600 }, measure);
  assert.ok(r.selected.design.elements.length === overlap.elements.length);
  const small = reflow(tiny(1, 0.01), huge, measure);
  assert.ok(small.selected.metrics.warnings > 0 && small.selected.metrics.errors === 0, 'small-text warning remains visible and non-fatal');
});
test('selection skips structurally invalid candidates even with a lower error count', () => {
  const r = reflow(tiny(1), huge, measure);
  const make = (kind: Finding['kind'], errors: number): Candidate => ({ ...structuredClone(r.baseline),
    metrics: { ...r.baseline.metrics, errors, findings: errors ? [{ kind, severity: 'error', elementIds: [], message: kind }] : [] } });
  const broken = make('group-geometry', 1), laidOut = make('collision', 5);
  assert.equal(selectCandidate([broken, laidOut], tiny(1)), laidOut);
  for (const kind of ['invalid-design', 'missing-content', 'preservation', 'group-geometry'] as const) {
    assert.throws(() => selectCandidate([make(kind, 1)], tiny(1)), NoValidCandidateError, kind);
  }
});

test('control: a real reflow whose only candidate has layout errors is still returned, errors visible', () => {
  const t = (id: string): Design['elements'][number] => ({ id, type: 'text', role: 'content', x: 0, y: 0, width: 1, height: 1, text: 'a', fontFamily: 'Inter', fontSize: 0.5, fontWeight: 400, color: '#000000', lineHeight: 1.2 });
  const source = { ...tiny(1), elements: [t('one'), t('two')] };
  const r = reflow(source, { id: 'same', label: 'Same', width: 1, height: 1 }, measure);
  assert.ok(r.selected.metrics.errors > 0 && r.selected.metrics.findings.every(f => f.kind === 'collision' || f.kind === 'text-overflow'));
});
test('no-valid-candidate payload is deduplicated and capped, with the total preserved', () => {
  const many: Finding[] = Array.from({ length: 50 }, (_, i) => ({ kind: 'invalid-design', severity: 'error', elementIds: [], message: `m${i % 30}` }));
  const error = new NoValidCandidateError(many);
  assert.equal(error.total, 50);
  assert.equal(error.findings.length, 20);
  assert.equal(new Set(error.findings.map(f => f.message)).size, 20);
});

test('control: structural gate never rejects any bundled fixture across standard and extreme targets', () => {
  const targets = [...TARGETS, { id: 'wide', label: 'Wide', width: 1440, height: 480 }, { id: 'thin', label: 'Thin', width: 20, height: 3000 }, { id: 'odd', label: 'Odd', width: 777, height: 777 }];
  for (const source of FIXTURES) for (const target of targets) {
    const result = reflow(source, target, measure);
    assert.deepEqual(result.selected.metrics.findings.filter(f => ['invalid-design', 'missing-content', 'preservation', 'group-geometry'].includes(f.kind)), [], `${source.id} ${target.id}`);
  }
});

// Issue #26 criterion 1: real generated underflow/degenerate geometry. Characterization; valid fallbacks are allowed.
const STRUCTURAL_KINDS = ['invalid-design', 'missing-content', 'preservation', 'group-geometry'];
const square = TARGETS.find(t => t.id === 'square')!;
const boundary = (elements: Design['elements'], groups: Design['groups'] = []): Design => ({ schemaVersion: 'reflow.design.v0', id: 'boundary', name: 'boundary',
  description: '', provenance: 'test', width: 8000, height: 8000, background: '#ffffff', groups, elements });
const copy = (over: Partial<Design['elements'][number]> = {}) => ({ id: 'copy', type: 'text', role: 'content', x: 4000, y: 6000, width: 2000, height: 400,
  text: 'Copy', fontFamily: 'Inter', fontSize: 200, fontWeight: 400, color: '#000000', lineHeight: 1.2, ...over }) as Design['elements'][number];
const box = (id: string, role: 'content' | 'background' | 'decoration', over: Partial<Design['elements'][number]> = {}) =>
  ({ id, type: 'rect', role, x: 0, y: 0, width: 5e-324, height: 100, color: '#ff0000', ...over }) as Design['elements'][number];
function rejected(source: Design) {
  const before = structuredClone(source);
  assert.throws(() => reflow(source, square, measure), (e: any) => e instanceof NoValidCandidateError &&
    e.findings.length > 0 && e.findings.every((f: Finding) => f.kind === 'invalid-design'));
  assert.deepEqual(source, before);
}
function accepted(source: Design) {
  const before = structuredClone(source);
  const result = reflow(source, square, measure);
  validateDesign(result.selected.design);
  assert.deepEqual(result.selected.metrics.findings.filter(f => STRUCTURAL_KINDS.includes(f.kind)), []);
  assert.ok(result.selected.design.elements.every(e => [e.x, e.y, e.width, e.height].every(Number.isFinite) && e.width > 0 && e.height > 0));
  assert.deepEqual(source, before);
  return result;
}

test('U1: an ungrouped decoration that underflows to zero width in every candidate is rejected', () => {
  rejected(boundary([copy(), box('wash', 'decoration')]));
});
test('U1+: the same subnormal rect as an ungrouped background bleeds and succeeds', () => {
  accepted(boundary([copy(), box('wash', 'background')]));
});
test('U2: subnormal content text keeps a structurally valid alternative to the invalid baseline', () => {
  const result = accepted(boundary([copy({ width: 5e-324, height: 100 })]));
  assert.notEqual(result.selected.strategy, result.baseline.strategy);
  assert.ok(result.baseline.metrics.findings.some(f => f.kind === 'invalid-design'));
});
test('D1: a fully subnormal content rect degenerates in every candidate and is rejected', () => {
  rejected(boundary([copy(), box('dot', 'content', { width: 5e-324, height: 5e-324 })]));
});
const plateGroup = (labelWidth: number) => boundary([
  box('plate', 'content', { groupId: 'g', x: 1000, y: 1000, width: 2000, height: 2000 }),
  box('label', 'decoration', { groupId: 'g', x: 1000, y: 1000, width: labelWidth, height: 100 })], [{ id: 'g', label: 'g' }]);
test('G1: a grouped decoration underflowing to zero width is rejected as invalid-design (before groupGeometry)', () => {
  rejected(plateGroup(5e-324));
});
test('G1+: the same group with a normal label succeeds inside the target', () => {
  const result = accepted(plateGroup(1));
  for (const e of result.selected.design.elements.filter(e => e.groupId === 'g')) {
    assert.ok(e.x >= -0.5 && e.y >= -0.5 && e.x + e.width <= square.width + 0.5 && e.y + e.height <= square.height + 0.5, e.id);
  }
});

// Issue #26 grouped bounds at the joined component boundary (root-adjudicated): real generated candidates, one finite
// test-authored group shift, production evaluate findings, production selectCandidate. Not a whole-reflow() generation claim.
// badge has no image unit, so split is a byte-identical clone of stack (engine.ts:201-203) and no group-grid exists.
test('grouped bounds: a group-broken generated candidate is never selected; a valid fallback or explicit failure follows', () => {
  const source = badge(), before = structuredClone(source);
  const r = reflow(source, square, measure);
  const others = r.candidates.filter(c => c !== r.selected);
  const structural = (c: Candidate) => c.metrics.findings.filter(f => STRUCTURAL_KINDS.includes(f.kind));
  const shift = (c: Candidate): Candidate => {
    const design = structuredClone(c.design);
    design.elements.find(e => e.id === 'label')!.x += 10;
    return { ...structuredClone(c), design, metrics: evaluate(source, design, measure) };
  };
  // Precondition.
  for (const c of r.candidates) assert.deepEqual(structural(c), [], c.strategy);
  assert.ok(others.length >= 1);
  // P0: unmutated control.
  for (const c of r.candidates) assert.deepEqual(evaluate(source, c.design, measure), c.metrics, c.strategy);
  assert.equal(selectCandidate(r.candidates, source), r.selected);
  // P1: one faulted candidate, valid fallback.
  const m = shift(r.selected);
  validateDesign(m.design);
  assert.deepEqual(structural(m).map(f => [f.kind, [...f.elementIds].sort()]), [['group-geometry', ['label', 'plate']]]);
  const picked = selectCandidate([m, ...others], source);
  assert.notEqual(picked, m);
  assert.equal(picked, selectCandidate(others, source));
  validateDesign(picked.design);
  assert.deepEqual(structural(picked), []);
  // P2: every candidate faulted.
  for (const c of r.candidates) assert.deepEqual(structural(c), [], c.strategy);
  assert.throws(() => selectCandidate(r.candidates.map(shift), source), (e: any) => e instanceof NoValidCandidateError &&
    e.findings.length > 0 && e.findings.every((f: Finding) => f.kind === 'group-geometry'));
  assert.deepEqual(source, before);
});
