import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cpus } from 'node:os';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { reflow, compareCandidates } from '../src/engine';
import { rankingTerms } from '../src/ranking';
import { FIXTURES } from '../src/fixtures';
import { TARGETS } from '../src/model';
import { productShelf } from '../tests/support/product-designs';
import { RANKING_VALIDATION } from '../tests/support/ranking-designs';
import { measure, renderPng, fontFiles } from './native';

const base = '36b31fa73ea0cc80d1e24a43ef9b67e433e84a92';
const out = 'reports/product-grid';
await mkdir(`${out}/images`, { recursive: true });
const file = `${out}/previous-engine.ts`;
await writeFile(file, execFileSync('git', ['show', `${base}:src/engine.ts`], { encoding: 'utf8' }).replaceAll("from './", "from '../../src/"));
try {
  const previous: typeof import('../src/engine') = await import(pathToFileURL(resolve(file)).href);
  const long = productShelf(); long.id = 'four-products-long-headline';
  const title = long.elements.find(e => e.id === 'title')!;
  assert.equal(title.type, 'text');
  title.text = 'Tools for a slower morning\nMade carefully for everyday rituals';
  const sources = [...FIXTURES, productShelf(), long, ...RANKING_VALIDATION];
  const cases = sources.flatMap(source => TARGETS.map(target => ({ source, target })));
  const rows = cases.map(({ source, target }) => {
    const old = previous.reflow(source, target, measure), current = reflow(source, target, measure);
    const legacy = current.candidates.filter(c => !c.strategy.startsWith('group-grid'));
    assert.deepEqual(legacy, old.candidates, 'Existing alternatives and metrics must remain unchanged');
    const ablated = [...legacy].sort((a, b) => compareCandidates(a, b, source))[0];
    assert.deepEqual(ablated, old.selected, 'Removing grids must restore the previous selection');
    const uniqueGrids = current.candidates.filter(c => c.strategy.startsWith('group-grid'));
    assert.equal(new Set(uniqueGrids.map(c => JSON.stringify(c.design))).size, uniqueGrids.length);
    assert.ok(current.candidates.length <= 6);
    return { source: source.id, corpus: FIXTURES.includes(source) ? 'original-development' : 'additional-development', target: target.id,
      previous: old, current, ablated: ablated.strategy,
      candidates: current.candidates.map(c => ({ strategy: c.strategy, ...c.metrics, ranking: rankingTerms(source, c.design) })) };
  });
  // Alternate engine order after one warmup, with actual native call counts.
  const run = (engine: typeof reflow, source: typeof sources[number], target: typeof TARGETS[number]) => {
    let calls = 0;
    const r = engine(source, target, (s, e) => { calls++; return measure(s, e); });
    return { ms: r.elapsedMs, calls };
  };
  for (const { source, target } of cases) { run(previous.reflow, source, target); run(reflow, source, target); }
  const runtime: { source: string; target: string; round: number; previous: { ms: number; calls: number }; current: { ms: number; calls: number } }[] = [];
  for (let round = 0; round < 3; round++) for (const [i, { source, target }] of cases.entries()) {
    const oldFirst = (round + i) % 2 === 0;
    const first = run(oldFirst ? previous.reflow : reflow, source, target);
    const second = run(oldFirst ? reflow : previous.reflow, source, target);
    runtime.push({ source: source.id, target: target.id, round, previous: oldFirst ? first : second, current: oldFirst ? second : first });
  }
  const median = (a: number[]) => [...a].sort((a, b) => a - b)[Math.floor(a.length / 2)];
  const timed = (ids: string[]) => {
    const subset = runtime.filter(r => ids.includes(r.source));
    return { pairs: subset.length, previousMedianMs: median(subset.map(r => r.previous.ms)), currentMedianMs: median(subset.map(r => r.current.ms)),
      previousCalls: subset.reduce((n, r) => n + r.previous.calls, 0), currentCalls: subset.reduce((n, r) => n + r.current.calls, 0) };
  };
  const nearby = sources.flatMap(source => [-2, -1, 1, 2].map(delta => {
    const r = reflow(source, { id: 'nearby', label: 'Nearby', width: source.width + delta, height: source.height }, measure);
    return { source: source.id, delta, strategy: r.selected.strategy, errors: r.selected.metrics.errors };
  }));
  const standard = rows.filter(r => r.corpus === 'original-development');
  const summary = {
    cases: rows.length, originalCases: standard.length,
    previousErrors: standard.reduce((n, r) => n + r.previous.selected.metrics.errors, 0),
    currentErrors: standard.reduce((n, r) => n + r.current.selected.metrics.errors, 0),
    previousWarnings: standard.reduce((n, r) => n + r.previous.selected.metrics.warnings, 0),
    currentWarnings: standard.reduce((n, r) => n + r.current.selected.metrics.warnings, 0),
    changes: rows.filter(r => JSON.stringify(r.previous.selected.design) !== JSON.stringify(r.current.selected.design)).map(r => ({ source: r.source, target: r.target,
      from: r.previous.selected.strategy, to: r.current.selected.strategy, previousWarnings: r.previous.selected.metrics.warnings, currentWarnings: r.current.selected.metrics.warnings,
      previousErrors: r.previous.selected.metrics.errors, currentErrors: r.current.selected.metrics.errors })),
    addedCandidates: rows.reduce((n, r) => n + r.current.candidates.length - r.previous.candidates.length, 0),
    allCandidateErrors: rows.flatMap(r => r.candidates.filter(c => c.errors).map(c => ({ source: r.source, target: r.target, strategy: c.strategy, errors: c.errors }))),
    nearbyRearrangements: nearby.filter(r => !['identity', 'uniform'].includes(r.strategy)),
    runtime: { original: timed(FIXTURES.map(s => s.id)), products: timed(['product-pairs', 'four-product-shelf', long.id]), additional: timed(sources.slice(FIXTURES.length).map(s => s.id)) },
  };
  const hashes = Object.fromEntries(await Promise.all(['src/engine.ts', 'src/model.ts', 'src/ranking.ts', 'src/typography.ts', 'scripts/native.ts', 'scripts/product-grid-review.ts', 'package-lock.json', ...fontFiles.map(f => f.path)].map(async path =>
    [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
  await writeFile(`${out}/review.json`, JSON.stringify({ base, generatedAt: new Date().toISOString(), node: process.version, platform: `${process.platform}/${process.arch}`, cpu: cpus()[0]?.model,
    method: 'Authored development cases only. All alternatives retained; removing grid candidates recovers previous selection with the same ranker. Existing alternatives and metrics compared exactly on every case. Runtime: one warmup then three paired rounds alternating engine order, excluding font loading/rendering. No independent human quality or hard runtime limit.',
    hashes, summary, rows, runtime, nearby }, null, 2));
  const galleries: string[] = [];
  for (const row of rows.filter(r => r.current.candidates.some(c => c.strategy.startsWith('group-grid')))) {
    const variants = [{ label: `Before: ${row.previous.selected.strategy}`, design: row.previous.selected.design },
      ...row.current.candidates.map(c => ({ label: `${c === row.current.selected ? 'Selected: ' : ''}${c.strategy} · ${c.metrics.errors}E/${c.metrics.warnings}W`, design: c.design }))];
    const canvas = createCanvas(1400, Math.ceil(variants.length / 4) * 440), ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const [i, variant] of variants.entries()) {
      const png = renderPng(variant.design), img = await loadImage(png);
      const x = i % 4 * 350, y = Math.floor(i / 4) * 440;
      ctx.fillStyle = '#172b25'; ctx.font = '14px sans-serif'; ctx.fillText(variant.label, x + 10, y + 22);
      const scale = Math.min(330 / img.width, 400 / img.height);
      ctx.drawImage(img, x + 10 + (330 - img.width * scale) / 2, y + 32, img.width * scale, img.height * scale);
      await writeFile(`${out}/images/${row.source}-${row.target}-${i}.png`, png);
    }
    const name = `${row.source}-${row.target}-candidates.png`;
    await writeFile(`${out}/images/${name}`, canvas.toBuffer('image/png'));
    galleries.push(`## ${row.source} / ${row.target}\n\n![All candidates](images/${name})\n`);
  }
  await writeFile(`${out}/gallery.md`, '# All product alternatives\n\nSynthetic development evidence; E/W are internal errors/warnings. The first panel is the previous selected layout; subsequent panels retain every generated candidate.\n\n' + galleries.join('\n'));
  console.log(JSON.stringify(summary, null, 2));
} finally { await rm(file); }
