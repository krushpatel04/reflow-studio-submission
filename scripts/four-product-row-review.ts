import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { cpus } from 'node:os';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { reflow, compareCandidates } from '../src/engine';
import { rankingTerms } from '../src/ranking';
import { FIXTURES } from '../src/fixtures';
import { TARGETS } from '../src/model';
import { RANKING_VALIDATION } from '../tests/support/ranking-designs';
import { longHeadlineProductShelf, productShelf } from '../tests/support/product-designs';
import { measure, renderPng } from './native';

const base = 'b4ba15cf5a658003969f41ef4b08b8caa24e19be';
const out = 'reports/four-product-row';
await mkdir(`${out}/images`, { recursive: true });
const file = `${out}/previous-engine.ts`;
await writeFile(file, execFileSync('git', ['show', `${base}:src/engine.ts`], { encoding: 'utf8' }).replaceAll("from './", "from '../../src/"));
try {
  const previous: typeof import('../src/engine') = await import(pathToFileURL(resolve(file)).href);
  const originals = FIXTURES;
  const authored = [productShelf(), longHeadlineProductShelf()];
  const sources = [...originals, ...authored, ...RANKING_VALIDATION];
  const cases = sources.flatMap(source => TARGETS.map(target => ({ source, target })));
  const rows = cases.map(({ source, target }) => {
    const old = previous.reflow(source, target, measure), current = reflow(source, target, measure);
    const oldEntries = current.candidates.filter(c => c.strategy !== 'group-grid-4');
    assert.deepEqual(oldEntries, old.candidates, `${source.id}/${target.id}: previous alternatives changed`);
    const ablated = [...oldEntries].sort((a, b) => compareCandidates(a, b, source))[0];
    assert.deepEqual(ablated, old.selected, `${source.id}/${target.id}: four-column ablation changed previous selection`);
    assert.ok(current.candidates.length <= 7);
    const metrics = (r: typeof old) => ({ strategy: r.selected.strategy, errors: r.selected.metrics.errors, warnings: r.selected.metrics.warnings,
      minReadingSize: r.selected.metrics.minReadingSize, score: rankingTerms(source, r.selected.design).score });
    return { source: source.id, target: target.id, corpus: originals.includes(source) ? 'standard-development' : 'additional-development',
      previous: metrics(old), current: metrics(current), addedCandidates: current.candidates.length - old.candidates.length,
      candidates: current.candidates.map(c => ({ strategy: c.strategy, errors: c.metrics.errors, warnings: c.metrics.warnings,
        minReadingSize: c.metrics.minReadingSize, score: rankingTerms(source, c.design).score })),
      ...(authored.includes(source) ? { original: source, previousSelected: old.selected.design, currentCandidates: current.candidates, currentSelected: current.selected.design } : {}) };
  });
  const warm = (fn: typeof reflow, source: typeof sources[number], target: typeof TARGETS[number]) => {
    let calls = 0;
    const result = fn(source, target, (value, e) => { calls++; return measure(value, e); });
    return { ms: result.elapsedMs, calls };
  };
  for (const { source, target } of cases) { warm(previous.reflow, source, target); warm(reflow, source, target); }
  const runtime: { source: string; target: string; round: number; previous: { ms: number; calls: number }; current: { ms: number; calls: number } }[] = [];
  for (let round = 0; round < 3; round++) for (const [i, { source, target }] of cases.entries()) {
    const oldFirst = (round + i) % 2 === 0;
    const first = warm(oldFirst ? previous.reflow : reflow, source, target);
    const second = warm(oldFirst ? reflow : previous.reflow, source, target);
    runtime.push({ source: source.id, target: target.id, round, previous: oldFirst ? first : second, current: oldFirst ? second : first });
  }
  const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  const timing = (ids: string[]) => {
    const subset = runtime.filter(r => ids.includes(r.source));
    return { pairs: subset.length, previousMedianMs: median(subset.map(r => r.previous.ms)), currentMedianMs: median(subset.map(r => r.current.ms)),
      previousCalls: subset.reduce((n, r) => n + r.previous.calls, 0), currentCalls: subset.reduce((n, r) => n + r.current.calls, 0) };
  };
  const standard = rows.filter(r => r.corpus === 'standard-development');
  let unchangedDocuments = 0, unchangedPngs = 0;
  const compareArchived = async (name: string, design: typeof FIXTURES[number]) => {
    const currentDoc = await readFile(`reports/latest/designs/${name}.json`, 'utf8');
    assert.equal(currentDoc, JSON.stringify(design, null, 2), `${name}: editable document changed`);
    unchangedDocuments++;
    const currentPng = await readFile(`reports/latest/images/${name}.png`);
    assert.ok(currentPng.equals(renderPng(design)), `${name}: rendered PNG changed`);
    unchangedPngs++;
  };
  for (const source of originals) await compareArchived(source.id, source);
  for (const source of originals) for (const target of TARGETS) {
    const old = previous.reflow(source, target, measure);
    await compareArchived(`${source.id}-${target.id}-baseline`, old.baseline.design);
    await compareArchived(`${source.id}-${target.id}-selected`, old.selected.design);
  }
  const summary = { cases: rows.length, standardCases: standard.length,
    standardErrorsBefore: standard.reduce((n, r) => n + r.previous.errors, 0), standardErrorsAfter: standard.reduce((n, r) => n + r.current.errors, 0),
    standardWarningsBefore: standard.reduce((n, r) => n + r.previous.warnings, 0), standardWarningsAfter: standard.reduce((n, r) => n + r.current.warnings, 0),
    addedCandidates: rows.reduce((n, r) => n + r.addedCandidates, 0), unchangedDocuments, unchangedPngs,
    changes: rows.filter(r => r.previous.strategy !== r.current.strategy || r.previous.warnings !== r.current.warnings || r.previous.errors !== r.current.errors)
      .map(r => ({ source: r.source, target: r.target, previous: r.previous, current: r.current })),
    runtime: { standard: timing(originals.map(s => s.id)), authoredProducts: timing(authored.map(s => s.id)) } };
  const hashes = Object.fromEntries(await Promise.all(['src/engine.ts', 'src/model.ts', 'src/ranking.ts', 'src/typography.ts', 'scripts/native.ts', 'scripts/four-product-row-review.ts']
    .map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')])));
  await writeFile(`${out}/review.json`, JSON.stringify({ base, generatedAt: new Date().toISOString(), node: process.version,
    platform: `${process.platform}/${process.arch}`, cpu: cpus()[0]?.model,
    method: '45 authored development cases; all existing candidates and their diagnostics asserted equal to the previous engine, and four-column removal restores every old selection. Paired runtime: warm each case, three rounds alternating order. Excludes font load, parsing and PNG rendering; not a deadline. No independent human quality or Adobe validation.',
    hashes, summary, rows, runtime }, null, 2));
  for (const row of rows.filter(r => authored.some(s => s.id === r.source))) {
    const source = sources.find(s => s.id === row.source)!;
    const target = TARGETS.find(t => t.id === row.target)!;
    const old = previous.reflow(source, target, measure), current = reflow(source, target, measure);
    const variants = [{ name: `before-${old.selected.strategy}`, design: old.selected.design },
      { name: `after-${current.selected.strategy}`, design: current.selected.design },
      ...current.candidates.filter(c => c.strategy === 'group-grid-4').map(c => ({ name: 'new-four-column', design: c.design }))];
    const canvas = createCanvas(1200, 460), context = canvas.getContext('2d');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    for (const [i, variant] of variants.entries()) {
      const data = renderPng(variant.design), png = await loadImage(data);
      await writeFile(`${out}/images/${row.source}-${row.target}-${variant.name}.png`, data);
      const x = i * 400, scale = Math.min(375 / png.width, 415 / png.height);
      context.fillStyle = '#172b25'; context.font = '15px sans-serif'; context.fillText(variant.name, x + 12, 22);
      context.drawImage(png, x + 12 + (375 - png.width * scale) / 2, 30, png.width * scale, png.height * scale);
    }
    await writeFile(`${out}/images/${row.source}-${row.target}-comparison.png`, canvas.toBuffer('image/png'));
  }
  console.log(JSON.stringify(summary, null, 2));
} finally { await rm(file); }
