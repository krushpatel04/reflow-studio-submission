import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cpus } from 'node:os';
import { reflow } from '../src/engine';
import { FIXTURES } from '../src/fixtures';
import { RANKING_VALIDATION } from '../tests/support/ranking-designs';
import { TARGETS } from '../src/model';
import { measure } from './native';

// The previous engine uses the same model/evaluator/generator dependencies as this
// ranking-only change. Assert every generated candidate is identical on every run.
const base = '920f6fc2928e048d63c92688c8614c7076aa8971';
const file = 'reports/stability/previous-engine.ts';
await mkdir('reports/stability', { recursive: true });
const code = execFileSync('git', ['show', `${base}:src/engine.ts`], { encoding: 'utf8' }).replaceAll("from './", "from '../../src/");
await writeFile(file, code);
try {
  const previous: typeof import('../src/engine') = await import(pathToFileURL(resolve(file)).href);
  const cases = [...FIXTURES, ...RANKING_VALIDATION].flatMap(source => TARGETS.map(target => ({ source, target })));
  for (const { source, target } of cases) { previous.reflow(source, target, measure); reflow(source, target, measure); }
  const rows: { source: string; corpus: string; target: string; round: number; previousMs: number; currentMs: number; previousStrategy: string; currentStrategy: string }[] = [];
  for (let round = 0; round < 3; round++) for (const [i, { source, target }] of cases.entries()) {
    const oldFirst = (round + i) % 2 === 0;
    const [first, second] = oldFirst ? [previous.reflow(source, target, measure), reflow(source, target, measure)] : [reflow(source, target, measure), previous.reflow(source, target, measure)];
    const old = oldFirst ? first : second, current = oldFirst ? second : first;
    assert.deepEqual(current.candidates, old.candidates, 'This comparison requires unchanged candidate generation and diagnostics');
    rows.push({ source: source.id, corpus: FIXTURES.includes(source) ? 'development' : 'additional', target: target.id, round,
      previousMs: old.elapsedMs, currentMs: current.elapsedMs, previousStrategy: old.selected.strategy, currentStrategy: current.selected.strategy });
  }
  const stats = (values: number[]) => { values.sort((a, b) => a - b); return { n: values.length, median: values[Math.floor(values.length / 2)], p95: values[Math.ceil(values.length * .95) - 1] }; };
  const summary = Object.fromEntries(['development', 'additional'].map(corpus => [corpus, Object.fromEntries(['previousMs', 'currentMs'].map(mode =>
    [mode, stats(rows.filter(r => r.corpus === corpus).map(r => r[mode as 'previousMs' | 'currentMs']))]))]));
  await writeFile('reports/stability/runtime.json', JSON.stringify({ base, generatedAt: new Date().toISOString(), node: process.version, cpu: cpus()[0]?.model,
    method: 'One warmup per engine/case, then three paired rounds alternating execution order. Same process/native fonts, candidate equality asserted on all 117 pairs. Excludes rendering/font loading. Local observation, not a enforced budget or cross-machine performance claim.', summary, rows }, null, 2));
  console.log(JSON.stringify(summary, null, 2));
} finally { await rm(file); }
