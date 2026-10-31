import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { cpus, platform, arch } from 'node:os';
import { FIXTURES } from '../src/fixtures';
import { CANDIDATE_STRATEGIES, TARGETS } from '../src/model';
import { describeFailure, reflowTargets } from '../src/reflow-targets';
import { evaluate } from '../src/evaluate';
import { renderSvg, escapeHtml as esc } from '../src/render';
import { pathToFileURL } from 'node:url';
import type { Design, Target } from '../src/model';
import type * as Native from './native';

type Options = { fixtures?: Design[]; targets?: Target[]; native: typeof Native; out?: string };
/** One benchmark run. `native` is injected so importing this module registers no fonts and writes nothing. */
export async function runBenchmark({ fixtures = FIXTURES, targets = TARGETS, native, out = 'reports/latest' }: Options) {
  const { measure, renderPng, fontFiles, requiredFontFiles } = native;
  await mkdir(`${out}/images`, { recursive: true });
  await mkdir(`${out}/designs`, { recursive: true });
  const faceRules = new Map<string, string>();
  const faces = async (files: typeof fontFiles) => (await Promise.all(files.map(async f => {
    if (!faceRules.has(f.path)) faceRules.set(f.path, `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};unicode-range:${f.unicodeRange};src:url(data:font/woff2;base64,${(await readFile(f.path)).toString('base64')})`);
    return faceRules.get(f.path)!;
  }))).join('');
  // The report page itself only sets Inter for its own UI text.
  const fonts = await faces(fontFiles.filter(f => f.family === 'Inter' && f.subset === 'latin'));
  // #28: a known per-target failure becomes an explicit failed cell; source faults and unknown errors still throw.
  const cells = fixtures.flatMap(source => reflowTargets(source, targets, measure).map(outcome => ({ source, ...outcome })));
  const results = cells.flatMap(c => c.result ? [c.result] : []);
  const failures = cells.flatMap(c => c.error ? [{ sourceId: c.source.id, target: c.target, error: c.error }] : []);
  const sourceChecks = fixtures.map(source => ({ id: source.id, metrics: evaluate(source, source, measure) }));
  const times = results.map(r => r.elapsedMs).sort((a, b) => a - b);
  const summary = {
    cases: results.length, sourceErrors: sourceChecks.reduce((sum, s) => sum + s.metrics.errors, 0),
    baselineErrors: results.reduce((sum, r) => sum + r.baseline.metrics.errors, 0),
    selectedErrors: results.reduce((sum, r) => sum + r.selected.metrics.errors, 0),
    baselineWarnings: results.reduce((sum, r) => sum + r.baseline.metrics.warnings, 0),
    selectedWarnings: results.reduce((sum, r) => sum + r.selected.metrics.warnings, 0),
    selectedCasesWithErrors: results.filter(r => r.selected.metrics.errors).length,
    medianLayoutMs: times.length ? times[Math.floor(times.length / 2)] : null, p95LayoutMs: times.length ? times[Math.ceil(times.length * .95) - 1] : null,
    selections: Object.fromEntries(CANDIDATE_STRATEGIES.map(s => [s, results.filter(r => r.selected.strategy === s).length])),
    ...(failures.length ? { failedCases: failures.length } : {}),
  };
  const report = {
    schemaVersion: 'reflow.benchmark.v0', generatedAt: new Date().toISOString(),
    environment: { node: process.version, platform: platform(), architecture: arch(), cpu: cpus()[0]?.model },
    method: 'Ten authored synthetic fixtures; three fixed formats; one measured run per case including candidate layout and diagnostics, excluding rendering and font loading. Node/Skia with the bundled Inter and Source Serif 4 faces, registered per subset. Same heuristic chooses and evaluates candidates; this is not independent quality validation.',
    summary, sourceChecks, results, ...(failures.length ? { failures } : {}),
  };
  await writeFile(`${out}/results.json`, JSON.stringify(report, null, 2));
  const save = async (name: string, design: Design) => {
    const svg = renderSvg(design, measure).replace(/(<svg[^>]*>)/, `$1<style>${await faces(requiredFontFiles(design))}</style>`);
    await writeFile(`${out}/images/${name}.png`, renderPng(design));
    await writeFile(`${out}/images/${name}.svg`, svg);
    await writeFile(`${out}/designs/${name}.json`, JSON.stringify(design, null, 2));
  };
  for (const source of fixtures) await save(source.id, source);
  for (const r of results) for (const variant of ['baseline', 'selected'] as const) await save(`${r.sourceId}-${r.target.id}-${variant}`, r[variant].design);
  const figure = (file: string, label: string) => `<figure><figcaption>${esc(label)}</figcaption><a href="images/${file}.svg"><img loading="lazy" src="images/${file}.png" alt="${esc(label)}"></a><a href="designs/${file}.json">Editable document JSON</a></figure>`;
  const rows = results.map(r => `<section><h2>${esc(fixtures.find(f => f.id === r.sourceId)!.name)} / ${esc(r.target.label)}</h2><p>${r.target.width} × ${r.target.height} · selected: <b>${r.selected.strategy}</b> · ${r.elapsedMs.toFixed(1)} ms</p><div class="variants">${figure(r.sourceId, 'Original')}${figure(`${r.sourceId}-${r.target.id}-baseline`, `Uniform baseline · ${r.baseline.metrics.errors} errors / ${r.baseline.metrics.warnings} warnings`)}${figure(`${r.sourceId}-${r.target.id}-selected`, `Selected layout · ${r.selected.metrics.errors} errors / ${r.selected.metrics.warnings} warnings`)}</div><details><summary>Selected findings (${r.selected.metrics.findings.length})</summary><ul>${r.selected.metrics.findings.map(f => `<li>${esc(f.severity)}: ${esc(f.message)}</li>`).join('') || '<li>No issues detected. Visual review is still required.</li>'}</ul></details></section>`).join('');
  const alerts = failures.map(f => `<section role="alert"><h2>Failed: ${esc(f.sourceId)} / ${esc(f.target.id)}</h2><p>${f.target.width} × ${f.target.height} · <b>${esc(f.error.code)}</b>: ${esc(f.error.message)}${f.error.total === undefined ? '' : ` · ${f.error.total} structural findings`}</p><ul>${(f.error.findings ?? []).map(x => `<li>${esc(x.severity)}: ${esc(x.message)}</li>`).join('')}</ul></section>`).join('');
  await writeFile(`${out}/index.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reflow Studio — benchmark evidence</title><style>${fonts}*{box-sizing:border-box}body{font:14px/1.65 Inter,sans-serif;color:#24252b;background:#f5f5f8;max-width:1450px;margin:auto;padding:32px}h1{font-size:32px}h2{font-size:20px}a{color:#6140db}section{background:white;border:1px solid #ddd;border-radius:12px;padding:22px;margin:28px 0}.variants{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}figure{margin:0;min-width:0}figcaption{font-size:12px;margin:12px 0}img{display:block;width:100%;height:420px;object-fit:contain;background:#eaeaef}figure>a:last-child{font-size:11px}pre{white-space:pre-wrap;background:#eeebf5;padding:20px;border-radius:10px}@media(max-width:700px){body{padding:16px}.variants{grid-template-columns:1fr}img{height:360px}}</style><h1>Reflow Studio / first benchmark</h1><p>${esc(report.generatedAt)} · ${esc(report.environment.cpu)} · ${esc(report.environment.node)}</p><p>${esc(report.method)}</p><p>PNG previews use a separate Node canvas renderer; SVGs embed their fonts. Browser rendering can differ. Click a preview for its SVG. All data and candidate findings are in <a href="results.json">results.json</a>.</p><pre>${esc(JSON.stringify(summary, null, 2))}</pre><p>Known limitations: no aesthetic judge, no held-out corpus, no inferred relationships, no nested groups, and no Adobe document import yet. Clean geometry does not imply an attractive design. Sparse designs and product grids need human review.</p>${alerts}${rows}</html>`);
  console.log(JSON.stringify(summary, null, 2));
  for (const f of failures) console.error(`Failed cell ${describeFailure(fixtures.find(s => s.id === f.sourceId)!, f)}`);
  const files = fixtures.length + results.length * 2;
  console.log(`Report: ${out}/index.html (${files} PNGs, ${files} SVGs, ${files} editable documents)`);
  return report;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const report = await runBenchmark({ native: await import('./native') });
  if (report.failures) process.exitCode = 1; // report written first; failed cells stay a visible non-zero gate
}
