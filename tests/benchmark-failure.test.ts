import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FIXTURES } from '../src/fixtures';
import { NoValidCandidateError, reflow } from '../src/engine';
import { DesignValidationError, TARGETS, type Design } from '../src/model';
import * as native from '../scripts/native';
import { runBenchmark } from '../scripts/benchmark';

// Issue #28: one failing benchmark cell must not abort the run. Construction from tests/engine.test.ts:100-105, distinct ids.
const tiny = (width: number, fontSize = 0.5): Design => ({ schemaVersion: 'reflow.design.v0', id: 'overflow', name: 'overflow', description: '', provenance: 'test',
  width: 1, height: 1, background: '#ffffff', groups: [], elements: [
    { id: 'copy', type: 'text', role: 'content', x: 0, y: 0, width: 1, height: 1, text: 'a', fontFamily: 'Inter', fontSize, fontWeight: 400, color: '#000000', lineHeight: 1.2 },
    { id: 'wash', type: 'rect', role: 'decoration', x: 0, y: 0, width, height: 1, color: '#ff0000' }] });
const huge = { id: 'huge', label: 'Huge', width: 8000, height: 8000 };
const overflow = tiny(1e308), finite = { ...tiny(1), id: 'finite', name: 'finite' };

const dirs: string[] = [];
after(() => dirs.forEach(d => rmSync(d, { recursive: true, force: true })));
async function bench(fixtures: Design[], targets = [TARGETS[0], huge], nat: typeof native = native) {
  const out = mkdtempSync(join(tmpdir(), 'reflow-bench-')), before = structuredClone({ fixtures, targets });
  dirs.push(out);
  const run = runBenchmark({ fixtures, targets, native: nat, out });
  return { run, read: async () => {
    await run;
    assert.deepEqual({ fixtures, targets }, before, 'inputs unchanged');
    return { json: JSON.parse(readFileSync(join(out, 'results.json'), 'utf8')), html: readFileSync(join(out, 'index.html'), 'utf8') };
  }, written: async () => { await run.catch(() => {}); return existsSync(join(out, 'results.json')); } };
}
const stable = ({ elapsedMs, ...r }: { elapsedMs: number }) => r;

test('a failing cell is reported explicitly while every sibling cell keeps its result', async () => {
  const fixtures = [FIXTURES[0], overflow, finite], targets = [TARGETS[0], huge];
  const { json, html } = await (await bench(fixtures, targets)).read();
  const cells = fixtures.flatMap(s => targets.map(t => `${s.id}/${t.id}`));
  const done = json.results.map((r: any) => `${r.sourceId}/${r.target.id}`), failed = (json.failures ?? []).map((f: any) => `${f.sourceId}/${f.target.id}`);
  assert.ok(failed.includes('overflow/huge'), 'the known no-valid-candidate cell is visible');
  assert.deepEqual([...done, ...failed].sort(), [...cells].sort(), 'every cell is either a result or a failure, exactly once');
  assert.deepEqual(done, cells.filter(c => done.includes(c)), 'successes keep benchmark order');
  for (const r of json.results) {
    const direct = reflow(fixtures.find(s => s.id === r.sourceId)!, targets.find(t => t.id === r.target.id)!, native.measure);
    assert.deepEqual(stable(r), JSON.parse(JSON.stringify(stable(direct as any))), `${r.sourceId}/${r.target.id} unchanged`);
  }
  for (const f of json.failures) {
    assert.throws(() => reflow(fixtures.find(s => s.id === f.sourceId)!, targets.find(t => t.id === f.target.id)!, native.measure), NoValidCandidateError);
    assert.equal(f.error.code, 'no-valid-candidate');
    assert.ok(f.error.findings.length > 0 && f.error.total >= f.error.findings.length);
    assert.ok(html.includes(`${f.sourceId} / ${f.target.id}`) && html.includes(f.error.code), `${f.sourceId}/${f.target.id} in HTML`);
  }
  assert.equal(json.summary.cases, json.results.length);
  assert.equal(json.summary.failedCases, json.failures.length);
  assert.equal(html.match(/role="alert"/g)?.length, json.failures.length);
});

test('all-failure run still writes a report: null timings, one alert, no figures', async () => {
  const { json, html } = await (await bench([overflow], [huge])).read();
  assert.deepEqual(json.results, []);
  assert.equal(json.summary.cases, 0);
  assert.equal(json.summary.failedCases, 1);
  assert.equal(json.summary.medianLayoutMs, null);
  assert.equal(json.summary.p95LayoutMs, null);
  assert.equal(html.match(/role="alert"/g)?.length, 1);
  assert.doesNotMatch(html, /<figure>/);
});

test('all-success run keeps the existing report keys', async () => {
  const { json, html } = await (await bench([finite], [huge])).read();
  assert.deepEqual(Object.keys(json).sort(), ['environment', 'generatedAt', 'method', 'results', 'schemaVersion', 'sourceChecks', 'summary']);
  assert.equal('failedCases' in json.summary, false);
  assert.equal(json.summary.cases, 1);
  assert.doesNotMatch(html, /role="alert"/);
});

test('unknown errors, invalid sources and source-preview faults propagate instead of becoming cells', async () => {
  const throwing = { ...native, measure: () => { throw new TypeError('measure bug'); } } as typeof native;
  const unknown = await bench([finite], [huge], throwing);
  await assert.rejects(unknown.run, TypeError);
  assert.equal(await unknown.written(), false);
  const bad = { ...finite, id: 'bad-font', elements: finite.elements.map(e => e.type === 'text' ? { ...e, fontFamily: 'No Such Face' } : e) } as Design;
  const invalid = await bench([FIXTURES[0], bad], [huge]);
  await assert.rejects(invalid.run, (e: unknown) => e instanceof DesignValidationError && e.code === 'unsupported-font');
  assert.equal(await invalid.written(), false);
  const preview = { ...native, renderPng: () => { throw new Error('preview failed'); } } as typeof native;
  await assert.rejects((await bench([finite], [huge], preview)).run, /preview failed/);
});
