import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cpus } from 'node:os';
import { reflow } from '../src/engine';
import { FIXTURES } from '../src/fixtures';
import { TARGETS, type Design, type Target } from '../src/model';
import { measure } from './native';

// Compare one engine-only change with its parent, using the same font/runtime.
// Base must be present locally (a normal clone contains it; shallow clones may not).
const base = '0757de5fe5b50c175cd00b2ec15add414c85de8d';
const out = 'reports/measurement-cache';
const file = `${out}/previous-engine.ts`;
await mkdir(out, { recursive: true });
const code = execFileSync('git', ['show', `${base}:src/engine.ts`], { encoding: 'utf8' }).replaceAll("from './", "from '../../src/");
await writeFile(file, code);
try {
  const previous: typeof import('../src/engine') = await import(pathToFileURL(resolve(file)).href);
  const run = (engine: typeof reflow, source: Design, target: Target) => {
    let calls = 0;
    const start = performance.now();
    const result = engine(source, target, (text, e) => { calls++; return measure(text, e); });
    return { result, calls, ms: performance.now() - start };
  };
  const rows: { source: string; target: string; corpus: string; round: number; previousMs: number; currentMs: number; previousCalls: number; currentCalls: number; errors: number; warnings: number }[] = [];
  const compare = (source: Design, target: Target, corpus: string, round: number, oldFirst: boolean) => {
    const [first, second] = oldFirst ? [run(previous.reflow, source, target), run(reflow, source, target)] : [run(reflow, source, target), run(previous.reflow, source, target)];
    const old = oldFirst ? first : second, current = oldFirst ? second : first;
    const stable = ({ elapsedMs: _elapsed, ...rest }: ReturnType<typeof reflow>) => rest;
    assert.deepEqual(stable(current.result), stable(old.result), `${source.id}: complete output changed`);
    rows.push({ source: source.id, target: target.id, corpus, round, previousMs: old.ms, currentMs: current.ms,
      previousCalls: old.calls, currentCalls: current.calls, errors: current.result.selected.metrics.errors, warnings: current.result.selected.metrics.warnings });
    return rows.at(-1)!;
  };
  const cases = FIXTURES.flatMap(source => TARGETS.map(target => ({ source, target })));
  for (const { source, target } of cases) { run(previous.reflow, source, target); run(reflow, source, target); }
  for (let round = 0; round < 3; round++) for (const [i, { source, target }] of cases.entries()) compare(source, target, 'fixtures', round, (round + i) % 2 === 0);
  console.log('90 paired fixture comparisons passed.');
  const template = FIXTURES[0].elements.find(e => e.id === 'headline');
  assert.ok(template?.type === 'text');
  // Exact source construction from review:stress. Single pair per size, not a latency distribution.
  for (const [i, count] of [1, 10, 40, 100].entries()) {
    const dense = structuredClone(FIXTURES[0]);
    dense.id = `dense-${count}`;
    dense.groups = [];
    dense.elements = Array.from({ length: count }, (_, n) => ({ ...template, id: `text-${n}`, groupId: undefined,
      text: 'Approved customer information and pricing '.repeat(25), x: 0, y: n * 10, width: 1000, height: 8, fontSize: 5 }));
    const row = compare(dense, { id: 'stress', label: 'Stress', width: 200, height: 2000 }, 'dense', 0, i % 2 === 0);
    console.log(JSON.stringify(row));
    await writeFile(`${out}/runtime-partial.json`, JSON.stringify(rows, null, 2));
  }
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const fixtureRows = rows.filter(row => row.corpus === 'fixtures');
  const summary = { fixturePairs: fixtureRows.length, previousMedianMs: median(fixtureRows.map(r => r.previousMs)), currentMedianMs: median(fixtureRows.map(r => r.currentMs)),
    previousCalls: fixtureRows.reduce((n, r) => n + r.previousCalls, 0), currentCalls: fixtureRows.reduce((n, r) => n + r.currentCalls, 0),
    unchangedCompleteResults: rows.length, dense: rows.filter(row => row.corpus === 'dense') };
  await writeFile(`${out}/runtime.json`, JSON.stringify({ base, generatedAt: new Date().toISOString(), node: process.version,
    cpu: cpus()[0]?.model, platform: `${process.platform}/${process.arch}`, summary,
    method: 'Same process/native fonts. One warmup per engine/fixture target, then 3 paired rounds alternating order (90 fixture pairs). Dense cases use one pair each, alternating order, without per-case warmup. Layout/validation time and native call counts only; excludes loading, parsing and rendering. Complete results excluding elapsedMs must match on every pair. Cache and duplicate-arrangement reuse combined; these are local observations, not a deadline or typical/p95 latency claim.', rows }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally { await rm(file); }
