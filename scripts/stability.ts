import { mkdir, writeFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import { FIXTURES } from '../src/fixtures';
import { RANKING_VALIDATION } from '../tests/support/ranking-designs';
import { reflow, compareCandidates } from '../src/engine';
import { compositionChange, rankingTerms } from '../src/ranking';
import { evaluate } from '../src/evaluate';
import { CANDIDATE_STRATEGIES, TARGETS, type Candidate, type Design, type Result } from '../src/model';
import { measure, renderPng } from './native';

const out = 'reports/stability';
await mkdir(`${out}/images`, { recursive: true });
const sources = [...FIXTURES, ...RANKING_VALIDATION];
const order = CANDIDATE_STRATEGIES;
const layoutKind = (c: Candidate) => c.strategy === 'identity' ? 'uniform' : c.strategy;
const cache = new Map<string, Result>();
const run = (s: Design, width: number, height: number) => {
  const key = `${s.id}:${width}:${height}`;
  if (!cache.has(key)) cache.set(key, reflow(s, { id: `${width}x${height}`, label: `${width} × ${height}`, width, height }, measure));
  return cache.get(key)!;
};
const pick = (s: Design, r: Result) => {
  const terms = new Map(r.candidates.map(c => [c, rankingTerms(s, c.design)]));
  const ablated = [...r.candidates].sort((a, b) => {
    const errors = a.metrics.errors - b.metrics.errors;
    if (errors) return errors;
    const difference = (terms.get(a)!.score - terms.get(a)!.compositionPenalty) - (terms.get(b)!.score - terms.get(b)!.compositionPenalty);
    return Math.abs(difference) > 1e-12 ? difference : order.indexOf(a.strategy) - order.indexOf(b.strategy);
  })[0];
  return { previous: [...r.candidates].sort((a, b) => compareCandidates(a, b))[0], current: r.selected, ablated };
};
function motion(a: Design, b: Design) {
  const byId = new Map(b.elements.map(e => [e.id, e]));
  const values = a.elements.map(e => {
    const f = byId.get(e.id)!;
    return Math.hypot((e.x + e.width / 2) / a.width - (f.x + f.width / 2) / b.width,
      (e.y + e.height / 2) / a.height - (f.y + f.height / 2) / b.height);
  });
  return { mean: values.reduce((sum, n) => sum + n, 0) / values.length, max: Math.max(...values) };
}
const describe = (s: Design, c: Candidate) => ({ strategy: c.strategy, metrics: c.metrics, terms: rankingTerms(s, c.design), movementFromSource: motion(s, c.design),
  imageFrames: c.design.elements.filter(e => e.type === 'image').map(e => ({ id: e.id, aspectRatio: e.width / e.height })) });
const rows: unknown[] = [], nearby: { source: string; modes: ReturnType<typeof pick> }[] = [];
const transitions: unknown[] = [], visuals: { name: string; source: string; width: number; height: number; note: string }[] = [];
const standard: { source: string; target: string; previous: Candidate; current: Candidate; ablated: Candidate }[] = [];
const record = (s: Design, r: Result, kind: string) => {
  const modes = pick(s, r);
  rows.push({ source: s.id, corpus: FIXTURES.includes(s) ? 'original-development' : 'additional-development', kind, width: r.target.width, height: r.target.height,
    elapsedMs: r.elapsedMs, modes: Object.fromEntries(Object.entries(modes).map(([k, c]) => [k, describe(s, c)])),
    candidates: r.candidates.map(c => ({ strategy: c.strategy, metrics: c.metrics, terms: rankingTerms(s, c.design) })) });
  return modes;
};
async function show(s: Design, r: Result, name: string, note: string) {
  visuals.push({ name, source: s.id, width: r.target.width, height: r.target.height, note });
  await writeFile(`${out}/images/${name}-source.png`, renderPng(s));
  for (const [mode, candidate] of Object.entries(pick(s, r))) {
    await writeFile(`${out}/images/${name}-${mode}.png`, renderPng(candidate.design));
    await writeFile(`${out}/images/${name}-${mode}.json`, JSON.stringify(candidate.design, null, 2));
  }
}
for (const s of sources) {
  for (const offset of [-8, -2, -1, 0, 1, 2, 8]) for (const axis of ['width', 'height'] as const) {
    const r = run(s, s.width + (axis === 'width' ? offset : 0), s.height + (axis === 'height' ? offset : 0));
    nearby.push({ source: s.id, modes: record(s, r, `nearby-${axis}`) });
  }
  for (const axis of ['width', 'height'] as const) {
    let previous: Result | undefined;
    for (let step = 7; step <= 50; step++) {
      const size = Math.round(s[axis] * step / 20);
      const r = run(s, axis === 'width' ? size : s.width, axis === 'height' ? size : s.height);
      record(s, r, `sweep-${axis}`);
      if (previous && layoutKind(previous.selected) !== layoutKind(r.selected)) {
        // Enumerate the entire observed transition bracket; no assumption of monotonicity.
        let neighbor = previous;
        for (let pixel = previous.target[axis] + 1; pixel <= size; pixel++) {
          const next = run(s, axis === 'width' ? pixel : s.width, axis === 'height' ? pixel : s.height);
          record(s, next, `transition-${axis}`);
          if (layoutKind(neighbor.selected) !== layoutKind(next.selected)) {
            transitions.push({ source: s.id, axis, before: neighbor.target, after: next.target,
              from: describe(s, neighbor.selected), to: describe(s, next.selected), adjacentMovement: motion(neighbor.selected.design, next.selected.design),
              adjacentCropRisk: compositionChange(neighbor.selected.design, next.selected.design).cropRisk });
            if (visuals.filter(v => v.note.startsWith('Transition')).length < 6) {
              const name = `transition-${s.id}-${axis}-${pixel}`;
              await show(s, neighbor, `${name}-before`, 'Transition: preceding pixel');
              await show(s, next, `${name}-after`, 'Transition: following pixel');
            }
          }
          neighbor = next;
        }
      }
      previous = r;
    }
  }
  for (const t of TARGETS) {
    const r = run(s, t.width, t.height), modes = record(s, r, `standard-${t.id}`);
    standard.push({ source: s.id, target: t.id, ...modes });
  }
  if (['edge-subject', 'quiet-brand'].includes(s.id) || RANKING_VALIDATION.includes(s)) {
    await show(s, run(s, s.width + 1, s.height), `nearby-${s.id}`, 'One-pixel width increase');
    await show(s, run(s, 1080, 1920), `story-${s.id}`, 'Substantial format change');
  }
  console.log(`Swept ${s.id}: ${cache.size} distinct cases so far`);
}
const modes = ['previous', 'current', 'ablated'] as const;
const aggregate = (items: typeof standard) => Object.fromEntries(modes.map(mode => [mode, {
  errors: items.reduce((n, x) => n + x[mode].metrics.errors, 0), warnings: items.reduce((n, x) => n + x[mode].metrics.warnings, 0),
  selections: Object.fromEntries(order.map(strategy => [strategy, items.filter(x => x[mode].strategy === strategy).length])),
}]));
const times = [...cache.values()].map(r => r.elapsedMs).sort((a, b) => a - b);
const summary = {
  distinctCases: cache.size, nearbySamples: nearby.length,
  nearby: Object.fromEntries(modes.map(mode => [mode, { rearranged: nearby.filter(r => !['identity', 'uniform'].includes(r.modes[mode].strategy)).length,
    maxMovement: Math.max(...nearby.map(r => motion(sources.find(s => s.id === r.source)!, r.modes[mode].design).max)),
    maxCropRisk: Math.max(...nearby.map(r => compositionChange(sources.find(s => s.id === r.source)!, r.modes[mode].design).cropRisk)),
  }])),
  standardDevelopment: aggregate(standard.filter(x => FIXTURES.some(s => s.id === x.source))),
  standardAdditional: aggregate(standard.filter(x => RANKING_VALIDATION.some(s => s.id === x.source))),
  standardChanges: standard.filter(x => x.current.strategy !== x.previous.strategy || x.current.metrics.warnings !== x.previous.metrics.warnings).map(x => ({
    source: x.source, target: x.target, from: x.previous.strategy, to: x.current.strategy, errorsDelta: x.current.metrics.errors - x.previous.metrics.errors,
    warningsDelta: x.current.metrics.warnings - x.previous.metrics.warnings,
  })),
  transitionCount: transitions.length,
  medianLayoutMs: times[Math.floor(times.length / 2)], p95LayoutMs: times[Math.ceil(times.length * .95) - 1],
};
await writeFile(`${out}/results.json`, JSON.stringify({ generatedAt: new Date().toISOString(), node: process.version, cpu: cpus()[0]?.model,
  method: 'Fixed 0.35–2.5 axis scales in 0.05 steps plus nearby ±1/2/8px and every integer in observed current-strategy transition brackets; identity/uniform are one layout family. Previous uses unchanged candidates with the pre-change comparator. Ablation removes only the weighted composition penalty, retaining the new deficit and deterministic tie break. Timings include generation/evaluation/current ranking, excluding report generation, font loading and rendering. Additional authored families were promoted to development regressions after a visual failure; no independent held-out quality evidence. Crop risk is frame-aspect change, not measured pixel/subject loss.',
  sourceChecks: sources.map(s => ({ source: s.id, metrics: evaluate(s, s, measure) })), summary, transitions, visuals, rows,
}, null, 2));
await writeFile(`${out}/index.html`, `<!doctype html><meta charset="utf-8"><title>Source-aware ranking evidence</title><style>body{font:16px system-ui;margin:24px;background:#eee}section{background:white;padding:20px;margin:24px 0}.row{display:flex;gap:16px}figure{width:24%;margin:0}img{width:100%;height:420px;object-fit:contain}pre{white-space:pre-wrap}</style><h1>Source-aware ranking / engineering evidence</h1><p>Source, previous, current, and composition ablation. Frame crop risk is a proxy; images require inspection. No independent human quality result.</p><pre>${JSON.stringify(summary, null, 2)}</pre>${visuals.map(v => `<section><h2>${v.name} / ${v.width} × ${v.height}</h2><p>${v.note}</p><div class="row">${['source', ...modes].map(mode => `<figure><figcaption>${mode}</figcaption><img src="images/${v.name}-${mode}.png"></figure>`).join('')}</div></section>`).join('')}`);
console.log(JSON.stringify(summary, null, 2));
