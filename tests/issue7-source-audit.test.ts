import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { CorpusManifest } from '../src/corpus';
import type { Design, TextElement } from '../src/model';
import {
  HEIGHT_RATIO_THRESHOLD,
  auditSourceFidelity,
  classifyHeightRatio,
} from '../scripts/issue7-source-audit';

const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const text = (id: string, height: number): TextElement => ({
  id, type: 'text', role: 'content', x: 0, y: 0, width: 130, height,
  text: id === 'unknown' ? 'Audit → row' : 'A reproducible source measurement',
  fontFamily: 'Audit Poppins', fontSize: 20, fontWeight: 400,
  color: '#111111', lineHeight: 1.2,
});
const design = (id: string, elements: TextElement[]): Design => ({
  schemaVersion: 'reflow.design.v0', id, name: id, description: '', provenance: 'test',
  width: 300, height: 200, background: '#ffffff', groups: [], elements,
});

async function fixture(t: test.TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'reflow-source-audit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'designs'));
  await mkdir(join(root, 'fonts'));
  const fontPath = join(root, 'fonts/poppins-400.woff2');
  await copyFile(resolve('corpus/lica/fonts/poppins-400.woff2'), fontPath);
  const fontBytes = await readFile(fontPath);
  const first = JSON.stringify(design('first', [text('short-box', 10), text('unknown', 200)]));
  const second = JSON.stringify(design('second', [text('later-source', 200)]));
  await writeFile(join(root, 'designs/first.json'), first);
  await writeFile(join(root, 'designs/second.json'), second);
  const manifest: CorpusManifest = {
    schemaVersion: 'reflow.corpus.v0',
    targets: [{ id: 'square', label: 'Square', width: 100, height: 100 }],
    families: [{ id: 'family', split: 'development', description: '' }],
    sources: [
      {
        id: 'first', familyId: 'family', file: 'designs/first.json', sha256: hash(first),
        provenance: { kind: 'author', name: 'Test', permission: 'test' },
        resources: [
          { kind: 'font', id: 'Audit-Poppins-400', file: 'fonts/poppins-400.woff2', sha256: hash(fontBytes) },
          { kind: 'asset', id: 'missing.png', file: 'assets/missing.png', sha256: hash('absent') },
        ],
        conversion: { status: 'adapted', importer: 'test@1', losses: ['test loss'] },
      },
      {
        id: 'second', familyId: 'family', file: 'designs/second.json', sha256: hash(second),
        provenance: { kind: 'author', name: 'Test', permission: 'test' },
        resources: [{ kind: 'font', id: 'Audit-Poppins-400', file: 'fonts/poppins-400.woff2', sha256: hash(fontBytes) }],
        conversion: { status: 'supported', importer: 'test@1', losses: [] },
      },
    ],
  };
  const manifestPath = join(root, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest));
  return { manifestPath };
}

test('the 1.15 height ratio is an explicit strict triage boundary', () => {
  assert.equal(HEIGHT_RATIO_THRESHOLD, 1.15);
  assert.equal(classifyHeightRatio(1.15), 'within-threshold');
  assert.equal(classifyHeightRatio(1.150_001), 'over-threshold');
});

test('audits every source, resource, and measurable text without dropping later rows', async t => {
  const { manifestPath } = await fixture(t);
  const report = await auditSourceFidelity({ manifestPath });

  assert.equal(report.schemaVersion, 'reflow.source-fidelity-audit.v0');
  assert.deepEqual(report.accounting, {
    manifestSources: 2,
    sourceRows: 2,
    declaredResources: 3,
    resourceRows: 3,
    discoveredTextElements: 3,
    textRows: 3,
  });
  assert.equal(report.sources[0].status, 'failed');
  assert.equal(report.sources[1].status, 'ok');
  assert.equal(report.resources.find(row => row.id === 'missing.png')?.status, 'missing');
  assert.deepEqual(report.texts.map(row => row.elementId), ['short-box', 'unknown', 'later-source']);
  assert.equal(report.texts[0].heightClassification, 'over-threshold');
  assert.equal(report.texts[1].glyphCoverage.status, 'unknown');
  assert.equal(report.texts[1].glyphCoverage.missingCodepoints, null);
  assert.equal(report.summary.failedSources, 1);
  assert.equal(report.summary.auditPassed, false);
});

test('keeps invalid source JSON in accounting and continues to subsequent sources', async t => {
  const { manifestPath } = await fixture(t);
  const root = resolve(manifestPath, '..');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as CorpusManifest;
  const invalid = '{not json';
  await writeFile(join(root, manifest.sources[0].file), invalid);
  manifest.sources[0].sha256 = hash(invalid);
  await writeFile(manifestPath, JSON.stringify(manifest));

  const report = await auditSourceFidelity({ manifestPath });
  assert.equal(report.accounting.sourceRows, 2);
  assert.equal(report.sources[0].status, 'failed');
  assert.match(report.sources[0].errors.join(' '), /JSON/);
  assert.ok(report.texts.some(row => row.sourceId === 'second'));
});

test('reconciles historical and current observations without selecting an invented canonical count', async t => {
  const { manifestPath } = await fixture(t);
  const report = await auditSourceFidelity({ manifestPath });
  assert.deepEqual(report.reconciliation.historical.reported, {
    overThresholdTexts: 189, totalTexts: 293, affectedSources: 16, totalSources: 21,
  });
  assert.equal(report.reconciliation.historical.reproducibility, 'unreproduced-missing-per-element-rows-and-config');
  assert.equal(report.reconciliation.current.reported.overThresholdTexts, report.summary.overThresholdTexts);
  assert.equal(report.reconciliation.canonicalCount, null);
  assert.match(report.reconciliation.explanation, /not clipping counts/i);
});

test('sealed test declarations are accounted for without opening source or resource files', async t => {
  const root = await mkdtemp(join(tmpdir(), 'reflow-sealed-audit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const manifest: CorpusManifest = {
    schemaVersion: 'reflow.corpus.v0',
    targets: [{ id: 'square', label: 'Square', width: 100, height: 100 }],
    families: [{ id: 'sealed-family', split: 'test', description: 'Must stay sealed' }],
    sources: [{
      id: 'sealed-source', familyId: 'sealed-family', file: 'inaccessible/secret.json', sha256: hash('not available'),
      provenance: { kind: 'author', name: 'Test', permission: 'test' },
      resources: [{ kind: 'font', id: 'Secret-400', file: 'inaccessible/secret.woff2', sha256: hash('also unavailable') }],
      conversion: { status: 'supported', importer: 'test@1', losses: [] },
    }],
  };
  const manifestPath = join(root, 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest));

  const report = await auditSourceFidelity({ manifestPath });
  assert.equal(report.sources[0].status, 'excluded-sealed-test');
  assert.equal(report.sources[0].hashStatus, 'excluded-sealed-test');
  assert.match(report.sources[0].exclusionReason ?? '', /sealed test/i);
  assert.equal(report.resources[0].status, 'excluded-sealed-test');
  assert.equal(report.resources[0].actualSha256, null);
  assert.equal(report.accounting.sourceRows, 1);
  assert.equal(report.accounting.resourceRows, 1);
  assert.equal(report.accounting.textRows, 0);
  assert.equal(report.summary.excludedSealedSources, 1);
  assert.equal(report.summary.auditPassed, true);
});

test('content-hash font aliases make measurements stable across source order and repeated runs', async t => {
  const root = await mkdtemp(join(tmpdir(), 'reflow-font-alias-audit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'designs'));
  await mkdir(join(root, 'fonts'));
  const faces = [
    { id: 'poppins', source: resolve('corpus/lica/fonts/poppins-400.woff2') },
    { id: 'open-sans', source: resolve('corpus/lica/fonts/open-sans-400.woff2') },
  ];
  for (const face of faces) await copyFile(face.source, join(root, `fonts/${face.id}.woff2`));
  const value = 'MMMMMMMM iiiiiiii WWWWWWWW';
  const sources: CorpusManifest['sources'] = [];
  for (const face of faces) {
    const element = { ...text(`${face.id}-text`, 100), text: value, fontFamily: 'Audit Face', width: 1000 };
    const json = JSON.stringify(design(face.id, [element]));
    const fontBytes = await readFile(join(root, `fonts/${face.id}.woff2`));
    await writeFile(join(root, `designs/${face.id}.json`), json);
    sources.push({
      id: face.id, familyId: 'family', file: `designs/${face.id}.json`, sha256: hash(json),
      provenance: { kind: 'author', name: 'Test', permission: 'test' },
      resources: [{ kind: 'font', id: 'Audit-Face-400', file: `fonts/${face.id}.woff2`, sha256: hash(fontBytes) }],
      conversion: { status: 'supported', importer: 'test@1', losses: [] },
    });
  }
  const base: CorpusManifest = {
    schemaVersion: 'reflow.corpus.v0',
    targets: [{ id: 'square', label: 'Square', width: 100, height: 100 }],
    families: [{ id: 'family', split: 'development', description: '' }], sources,
  };
  const manifestPath = join(root, 'manifest.json');
  const widths = (report: Awaited<ReturnType<typeof auditSourceFidelity>>) => Object.fromEntries(report.texts.map(row => [row.sourceId, row.measurement?.width]));

  await writeFile(manifestPath, JSON.stringify(base));
  const forwardReport = await auditSourceFidelity({ manifestPath });
  const forward = widths(forwardReport);
  const repeated = widths(await auditSourceFidelity({ manifestPath }));
  await writeFile(manifestPath, JSON.stringify({ ...base, sources: [...sources].reverse() }));
  const reversed = widths(await auditSourceFidelity({ manifestPath }));

  assert.notEqual(forwardReport.resources[0].fontAlias, forwardReport.resources[1].fontAlias);
  assert.ok(forwardReport.resources.every(row => row.fontAlias?.includes(row.actualSha256 ?? 'missing')));
  assert.notEqual(forward.poppins, forward['open-sans']);
  assert.deepEqual(repeated, forward);
  assert.deepEqual(reversed, forward);
});
