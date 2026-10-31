import { loadImage } from '@napi-rs/canvas';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { checkManifest, type CorpusManifest, type CorpusResource } from '../src/corpus';
import { convertLica, type LicaConversion } from '../src/lica';
import { checkCorpusFiles } from './corpus-files';
import { loadSplitLock } from './corpus-split-files';
import { checkImportPreservation, checkSplitLock, reconcileLicaSplits } from './corpus-splits';
import {
  appendVisualChecks, attributionText, buildManifest, designFeatures, LICA_TARGETS, mergeManifest, parseBatchOptions, parseCsv,
  ratioClass, selectBatch, summarize, visualCheckTemplate, type ImportedSource, type PoolEntry,
} from './lica-batch';
import { fetchCached, fontsourceFont, fontsourceId, readLicaJson, sha256, writeCorpusFile } from './lica-files';
import { buildImportLedger, checkImportLedger, LICA_METADATA, type ScanObservation } from './lica-outcomes';
import { registerFont, renderPreview, sideBySide } from './lica-preview';

// Usage: npm run corpus:import-lica -- --lica <lica-data dir> [--max-layouts N] [--max-templates N] [--per-template N] [--approve-config-change --config-reason TEXT] [--approve-new-families] [--dry-run]
const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
const lica = arg('lica');
if (!lica) { console.error('Missing --lica <path to lica-data>.'); process.exit(1); }
const out = arg('out') ?? 'corpus';
const cache = resolve(arg('cache') ?? '.cache/lica-import');
const options = parseBatchOptions({ seed: arg('seed'), maxLayouts: arg('max-layouts'), maxTemplates: arg('max-templates'), perTemplate: arg('per-template') });
const seed = options.seed;
const maxMb = Number(arg('max-mb') ?? 25);
if (!Number.isFinite(maxMb) || maxMb <= 0 || maxMb > 100) throw Error('Invalid --max-mb: expected a number greater than 0 and at most 100.');
const maxBytes = maxMb * 1024 * 1024;
const dryRun = process.argv.includes('--dry-run');
const approveNewFamilies = process.argv.includes('--approve-new-families');
const approveConfigChange = process.argv.includes('--approve-config-change');
const review = approveConfigChange ? { reason: arg('config-reason') ?? '', date: new Date().toISOString().slice(0, 10) } : undefined;
if (approveConfigChange && !review!.reason.trim()) throw Error('--approve-config-change requires --config-reason.');
const previousManifestPath = join(out, 'manifest.json');
const previous: CorpusManifest | undefined = existsSync(previousManifestPath) ? JSON.parse(await readFile(previousManifestPath, 'utf8')) : undefined;
const pinnedIds = previous?.sources.filter(s => s.id.startsWith('lica-')).map(s => s.id.slice(5)) ?? [];
const pinned = new Set(pinnedIds);

// 1. Pool: every static layout (PNG render), converted. Animated layouts (MP4) are out of scope.
const metadata = await readFile(join(lica, 'metadata.csv'), 'utf8');
const rows = parseCsv(metadata);
const conversions = new Map<string, LicaConversion>();
const pool: PoolEntry[] = [];
const scans: ScanObservation[] = [];
const scanById = new Map<string, ScanObservation>();
for (const r of rows) {
  const observation: ScanObservation = { layoutId: r.layout_id, templateId: r.template_id, category: r.category, state: 'missing-render' };
  scans.push(observation);
  scanById.set(r.layout_id, observation);
  if (!existsSync(join(lica, 'images', r.template_id, `${r.layout_id}.png`))) {
    observation.state = existsSync(join(lica, 'images', r.template_id, `${r.layout_id}.mp4`)) ? 'animated' : 'missing-render';
    continue;
  }
  const layout = await readLicaJson(join(lica, 'layouts', r.template_id, `${r.layout_id}.json`));
  if (layout.kind === 'missing') { observation.state = 'missing-json'; continue; }
  if (layout.kind === 'invalid') { observation.state = 'invalid-json'; continue; }
  const c: LicaConversion = convertLica(layout.value, { layoutId: r.layout_id, templateId: r.template_id, category: r.category });
  observation.state = 'converted';
  observation.conversion = { status: c.status, losses: c.losses, blockers: c.blockers };
  conversions.set(r.layout_id, c);
  const missingFonts = c.status === 'unsupported' ? [] : c.fonts.filter(f => !fontsourceFont(f.family, f.weight, cache));
  if (missingFonts.length && !pinned.has(r.layout_id)) observation.unavailable = { code: 'missing-font', detail: missingFonts.map(f => `${f.family}-${f.weight}`).join(', ') };
  const available = c.status !== 'unsupported' && (!missingFonts.length || pinned.has(r.layout_id));
  pool.push({ layoutId: r.layout_id, templateId: r.template_id, category: r.category, width: c.design.width, height: c.design.height, status: c.status, available, features: designFeatures(c.design) });
}
const statusCounts: Record<string, number> = {};
for (const e of pool) statusCounts[e.status] = (statusCounts[e.status] ?? 0) + 1;
console.log(`Metadata layouts: ${rows.length}; converted static layouts: ${pool.length}. Status: ${JSON.stringify(statusCounts)}. Available (fonts found): ${pool.filter(e => e.available).length}.`);

// 2. Select, fetch images, drop layouts whose images fail, reselect.
const assets = new Map<string, Buffer>();
let batch: PoolEntry[] = [];
for (let round = 0; round < 5; round++) {
  batch = selectBatch(pool, options, pinnedIds);
  let failed = 0;
  for (const e of batch) {
    if (pinned.has(e.layoutId)) continue;
    for (const img of conversions.get(e.layoutId)!.images) {
      if (assets.has(img.assetId)) continue;
      try { const data = await fetchCached(img.src, cache); await loadImage(data); assets.set(img.assetId, data); }
      catch (error) {
        console.log(`Excluded ${e.layoutId}: image ${img.assetId} unavailable (${error instanceof Error ? error.message : String(error)}).`);
        e.available = false;
        scanById.get(e.layoutId)!.unavailable = { code: 'image-unavailable', detail: img.assetId };
        failed++;
        break;
      }
    }
  }
  if (!failed) break;
}
if (batch.some(e => !pinned.has(e.layoutId) && conversions.get(e.layoutId)!.images.some(i => !assets.has(i.assetId)))) { console.error('Images still missing after 5 rounds; stopping.'); process.exit(1); }
const splitLock = await loadSplitLock(out);
const frozen = reconcileLicaSplits(splitLock, batch.map(e => e.templateId), LICA_TARGETS, options, approveNewFamilies, review);

console.log(`Selection: seed ${seed}. Level 2 features first (overlap, opacity < 1, text over image, element count); >= ${options.minTextOverImage} text-over-image layouts; <= ${options.perTemplate} per template; <= ${options.maxTemplates} templates; category cap ${Math.floor(options.maxLayouts * options.categoryShare)}.`);
console.log('Pool, all static:', JSON.stringify(summarize(pool)));
console.log('Pool, convertible:', JSON.stringify(summarize(pool.filter(e => e.status !== 'unsupported'))));
console.log('Batch:', JSON.stringify(summarize(batch)));
console.log('New candidates:', JSON.stringify(batch.filter(e => !pinned.has(e.layoutId)).map(e => ({ layoutId: e.layoutId, templateId: e.templateId, render: join(lica, 'images', e.templateId, `${e.layoutId}.png`) }))));
const classes: Record<string, number> = {};
for (const e of batch) for (const t of LICA_TARGETS) { const k = ratioClass(e, t); classes[k] = (classes[k] ?? 0) + 1; }
console.log('Batch source x target ratio classes:', JSON.stringify(classes));

// 3. Plan every file in memory, then enforce the size limit before writing anything.
const planned = new Map<string, Buffer | string>();
const imported: ImportedSource[] = [];
const fontFiles = new Map<string, { family: string; woff2: string }>();
for (const e of batch) {
  if (pinned.has(e.layoutId)) continue;
  const c = conversions.get(e.layoutId)!;
  const resources: CorpusResource[] = [];
  for (const img of c.images) {
    const file = `lica/assets/${img.assetId}`;
    const data = assets.get(img.assetId)!;
    planned.set(file, data);
    resources.push({ kind: 'asset', id: img.assetId, file, sha256: sha256(data) });
  }
  for (const f of c.fonts) {
    const font = fontsourceFont(f.family, f.weight, cache)!;
    const file = `lica/fonts/${fontsourceId(f.family)}-${f.weight}.woff2`;
    const data = await readFile(font.woff2);
    planned.set(file, data);
    if (font.license) planned.set(`lica/fonts/${fontsourceId(f.family)}-LICENSE.txt`, await readFile(font.license));
    resources.push({ kind: 'font', id: `${f.family}-${f.weight}`, file, sha256: sha256(data) });
    fontFiles.set(file, { family: f.family, woff2: font.woff2 });
  }
  const designText = JSON.stringify(c.design, null, 1) + '\n';
  const file = `lica/designs/${e.layoutId}.json`;
  planned.set(file, designText);
  imported.push({ entry: e, file, sha256: sha256(designText), resources, losses: c.losses });
}
const manifest = mergeManifest(previous, buildManifest(imported, frozen.splits));
const ledger = buildImportLedger(scans, batch.map(e => e.layoutId), sha256(metadata));
const ledgerIssues = checkImportLedger(ledger, manifest, LICA_METADATA);
if (ledgerIssues.length) throw Error(`Import accounting failed: ${ledgerIssues.join('; ')}`);
planned.set('lica/import-outcomes.json', JSON.stringify(ledger, null, 1) + '\n');
for (const [file, data] of planned) {
  const path = join(out, file);
  if (!existsSync(path)) continue;
  const old = await readFile(path);
  if (old.equals(Buffer.isBuffer(data) ? data : Buffer.from(data))) planned.delete(file);
  else if (file !== 'lica/import-outcomes.json') throw Error(`Import would overwrite existing corpus file ${file}.`);
}
const total = [...planned.values()].reduce((n, d) => n + Buffer.byteLength(d), 0);
console.log(`Planned: ${batch.length} total designs from ${new Set(batch.map(e => e.templateId)).size} templates; ${imported.length} new designs, ${planned.size} new/updated files, ${(total / 1024 / 1024).toFixed(1)} MB to write.`);
if (total > maxBytes) { console.error(`Over the ${maxBytes / 1024 / 1024} MB limit; nothing written. Choose a smaller batch or a fetch script.`); process.exit(1); }

// 4. Write the corpus. Existing visual-check notes are retained; only new pending rows are appended.
const lockIssues = checkSplitLock(manifest, frozen.lock);
if (lockIssues.some(issue => issue.severity === 'error')) throw Error(`Split lock conflict: ${lockIssues.map(issue => issue.code).join(', ')}.`);
if (previous) {
  const preservationIssues = checkImportPreservation(previous, manifest);
  if (preservationIssues.length) throw Error(`Import would alter existing corpus evidence: ${preservationIssues.map(issue => `${issue.code} (${issue.message})`).join('; ')}.`);
}
if (dryRun) { console.log('Dry run: nothing written.'); process.exit(0); }
for (const [file, data] of planned) await writeCorpusFile(out, file, data);
if (imported.length) await writeCorpusFile(out, 'lica/ATTRIBUTION.md', attributionText(batch));
if (!existsSync(join(out, 'lica/VISUAL-CHECK.md'))) await writeCorpusFile(out, 'lica/VISUAL-CHECK.md', visualCheckTemplate(batch));
else if (imported.length) {
  const path = join(out, 'lica/VISUAL-CHECK.md');
  const current = await readFile(path, 'utf8');
  const next = appendVisualChecks(current, imported.map(a => a.entry));
  if (next !== current) await writeCorpusFile(out, 'lica/VISUAL-CHECK.md', next);
}
if (JSON.stringify(previous) !== JSON.stringify(manifest)) await writeCorpusFile(out, 'manifest.json', JSON.stringify(manifest, null, 1) + '\n');
if (JSON.stringify(splitLock) !== JSON.stringify(frozen.lock)) await writeCorpusFile(out, 'split-lock.json', JSON.stringify(frozen.lock, null, 1) + '\n');

// 5. Side-by-side previews for the visual check (git-ignored).
for (const f of fontFiles.values()) registerFont(f.woff2, f.family);
const decoded = new Map(await Promise.all([...assets].map(async ([id, data]) => [id, await loadImage(data)] as const)));
await mkdir('reports/corpus-import', { recursive: true });
for (const e of batch.filter(e => !pinned.has(e.layoutId))) {
  const c = conversions.get(e.layoutId)!;
  const reference = await readFile(join(lica, 'images', e.templateId, `${e.layoutId}.png`));
  const scale = Math.min(1, 600 / c.design.width, 800 / c.design.height);
  await writeFile(`reports/corpus-import/${e.layoutId}.png`, await sideBySide(reference, renderPreview(c.design, decoded, scale)));
}

// 6. Same checks as npm run corpus:check.
const issues = [...checkManifest(manifest), ...await checkCorpusFiles(manifest, out)];
for (const i of issues) console.log(`${i.severity.toUpperCase()} ${i.code} ${i.path}: ${i.message}`);
const errors = issues.filter(i => i.severity === 'error').length;
console.log(`${imported.length ? 'Updated' : 'Checked'} ${out}/manifest.json. ${errors} error(s).${imported.length ? ' Previews: reports/corpus-import/. Review new visual-check rows.' : ''}`);
process.exitCode = errors ? 1 : 0;
