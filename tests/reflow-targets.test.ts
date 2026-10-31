import test from 'node:test';
import assert from 'node:assert/strict';
import { reflow } from '../src/engine';
import { FIXTURES } from '../src/fixtures';
import type { Design, Target } from '../src/model';
import { describeFailure, reflowMany, reflowTargets } from '../src/reflow-targets';
import type { Measure } from '../src/typography';

const measure: Measure = (text, e) => ({ width: [...text].length * e.fontSize * 0.52, ascent: e.fontSize * 0.78, descent: e.fontSize * 0.2 });
const overflowing: Design = { schemaVersion: 'reflow.design.v0', id: 'overflow', name: 'overflow', description: '', provenance: 'test', width: 1, height: 1,
  background: '#ffffff', groups: [], elements: [
    { id: 'copy', type: 'text', role: 'content', x: 0, y: 0, width: 1, height: 1, text: 'a', fontFamily: 'Inter', fontSize: 0.5, fontWeight: 400, color: '#000000', lineHeight: 1.2 },
    { id: 'wash', type: 'rect', role: 'decoration', x: 0, y: 0, width: 1e308, height: 1, color: '#ff0000' }] };
const same: Target = { id: 'same', label: 'Same', width: 1, height: 1 }, huge: Target = { id: 'huge', label: 'Huge', width: 8000, height: 8000 };

test('one unrepresentable target does not abort sibling targets and its error stays visible', () => {
  const before = structuredClone(overflowing);
  const outcomes = reflowTargets(overflowing, [same, huge, same], measure);
  assert.deepEqual(outcomes.map(o => o.target.id), ['same', 'huge', 'same']);
  assert.ok(outcomes[0].result && !outcomes[0].error);
  assert.equal(outcomes[1].result, undefined);
  assert.equal(outcomes[1].error?.code, 'no-valid-candidate');
  assert.ok(outcomes[2].result);
  assert.deepEqual(overflowing, before);
});
test('control: all-valid targets yield results identical to direct reflow()', () => {
  const targets: Target[] = [{ id: 'a', label: 'A', width: 1080, height: 1080 }, { id: 'b', label: 'B', width: 1080, height: 1920 }];
  const outcomes = reflowTargets(FIXTURES[0], targets, measure);
  outcomes.forEach((o, i) => {
    assert.equal(o.error, undefined);
    const direct = reflow(FIXTURES[0], targets[i], measure);
    assert.deepEqual(o.result?.selected.design, direct.selected.design);
  });
});

test('a source-level fault fails once, loudly, instead of one identical row per target', () => {
  const broken = { ...structuredClone(FIXTURES[0]), width: 0 } as Design;
  assert.throws(() => reflowTargets(broken, [same, huge], measure), (e: any) => e.name === 'DesignValidationError' && e.path === '$.width');
  const unknownAsset = structuredClone(FIXTURES.find(f => f.elements.some(e => e.type === 'image'))!);
  for (const e of unknownAsset.elements) if (e.type === 'image') e.assetId = 'not-a-bundled-asset';
  assert.throws(() => reflowTargets(unknownAsset, [same], measure), (e: any) => e.name === 'DesignValidationError');
});
test('an invalid target is a per-target error and does not hide valid siblings', () => {
  const outcomes = reflowTargets(FIXTURES[0], [{ id: 'bad', label: 'Bad', width: 0, height: 10 }, { id: 'ok', label: 'Ok', width: 1080, height: 1080 }], measure);
  assert.match(outcomes[0].error?.code ?? '', /invalid-value/);
  assert.ok(outcomes[1].result);
});
test('invalid text measurements (#27) are per-target runtime errors with the measurement message', () => {
  const nan: Measure = (text, e) => ({ ...measure(text, e), width: NaN });
  const [outcome] = reflowTargets(FIXTURES[0], [{ id: 'a', label: 'A', width: 1080, height: 1080 }], nan);
  assert.equal(outcome.error?.code, 'runtime');
  assert.match(outcome.error?.message ?? '', /invalid width measurement/);
});
test('programming errors and non-Error throws are not masked as target outcomes', () => {
  const bug: Measure = () => { throw new TypeError('measure bug'); };
  assert.throws(() => reflowTargets(FIXTURES[0], [{ id: 'a', label: 'A', width: 1080, height: 1080 }], bug), TypeError);
  const text: Measure = () => { throw 'plain string'; };
  assert.throws(() => reflowTargets(FIXTURES[0], [{ id: 'a', label: 'A', width: 1080, height: 1080 }], text), (e: unknown) => e === 'plain string');
});
test('no-valid-candidate outcome carries the capped findings and total so a UI can explain why', () => {
  const [outcome] = reflowTargets(overflowing, [huge], measure);
  assert.ok(outcome.error?.findings && outcome.error.findings.length > 0 && outcome.error.findings.length <= 20);
  assert.ok((outcome.error?.total ?? 0) >= (outcome.error?.findings?.length ?? 1));
});

test('reflowMany keeps sibling results in order and reports each failed target explicitly', () => {
  const { results, failures } = reflowMany(overflowing, [same, huge, same], measure);
  assert.deepEqual(results.map(r => r.target.id), ['same', 'same']);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].target.id, 'huge');
  assert.equal(failures[0].error.code, 'no-valid-candidate');
  assert.match(describeFailure(overflowing, failures[0]), /overflow\/huge: no-valid-candidate/);
});
test('control: reflowMany with all-valid targets reports no failures', () => {
  const { results, failures } = reflowMany(FIXTURES[0], [same.id ? { id: 'a', label: 'A', width: 1080, height: 1080 } : same], measure);
  assert.equal(results.length, 1);
  assert.deepEqual(failures, []);
});

test('reflowMany retains original interleaving order across successful and failed target outcomes', () => {
  const many = reflowMany(overflowing, [same, huge, same], measure);
  assert.deepEqual(many.outcomes.map(o => o.target.id), ['same', 'huge', 'same']);
  assert.deepEqual(many.outcomes.map(o => o.result ? 'ok' : 'failed'), ['ok', 'failed', 'ok']);
});
