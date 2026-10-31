import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { preflightCorpus } from '../scripts/corpus-preflight';
import { digest, resourceFixture } from './support/corpus-resource-fixture';

const cli = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', resolve('scripts/corpus-preflight.ts'), ...args], { encoding: 'utf8', timeout: 10000 });

test('complete source-target accounting preserves source IDs, metadata and resource evidence without payloads', async t => {
  const f = await resourceFixture(t);
  const before = await readFile(f.manifestPath);
  const report = await preflightCorpus(f.manifestPath);
  assert.equal(report.state, 'complete');
  assert.equal(report.manifest.sha256, digest(before));
  assert.equal(report.sources.length, 1);
  assert.equal(report.sources[0].sourceId, 'manifest-source');
  assert.equal(report.sources[0].designId, 'editable-source');
  assert.deepEqual(report.sources[0].provenance, f.source.provenance);
  assert.deepEqual(report.cases.map(row => [row.sourceId, row.target.id, row.status]), [['manifest-source', 'square', 'catalog-ready'], ['manifest-source', 'story', 'catalog-ready']]);
  assert.deepEqual(report.counts, { sources: 1, cases: 2, byStatus: { 'catalog-ready': 2, blocked: 0, 'skipped-test': 0, 'unsupported-conversion': 0 } });
  assert.equal(report.sources[0].verified?.files.length, 2);
  assert.equal(report.sources[0].verified?.fonts[0].sha256, digest(f.font));
  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes('data:image') && !serialized.includes('"type":"Buffer"'));
  assert.deepEqual(await readFile(f.manifestPath), before);
  assert.equal(report.evidence.engineExecution, 'not-run');
  assert.equal(report.evidence.fontRegistrationAndCoverage, 'unverified');
  assert.equal(report.evidence.sourceFidelity, 'unverified');
  assert.equal(report.evidence.humanAcceptance, 'unverified');
});

test('adapted losses remain visible with stable case identifiers across runs', async t => {
  const f = await resourceFixture(t);
  f.source.conversion = { status: 'adapted', importer: 'test@1', losses: ['rotation removed'] }; await f.saveManifest();
  const first = await preflightCorpus(f.manifestPath), second = await preflightCorpus(f.manifestPath);
  assert.deepEqual(first.sources[0].conversion, f.source.conversion);
  assert.deepEqual(first.cases, second.cases);
  assert.equal(new Set(first.cases.map(row => row.id)).size, 2);
});

test('a broken source retains every target outcome and does not stop later valid sources', async t => {
  const f = await resourceFixture(t);
  const bad = { ...structuredClone(f.source), id: 'broken', file: 'absent.json' };
  f.manifest.sources.unshift(bad); await f.saveManifest();
  const report = await preflightCorpus(f.manifestPath);
  assert.equal(report.sources[0].error?.code, 'missing-file');
  assert.equal(report.sources[1].status, 'catalog-ready');
  assert.equal(report.cases.length, 4);
  assert.equal(report.counts.byStatus.blocked, 2);
  assert.equal(report.counts.byStatus['catalog-ready'], 2);
});

test('sealed test and unsupported source files are never loaded; both remain in denominator', async t => {
  const f = await resourceFixture(t);
  f.manifest.families.push({ id: 'sealed', split: 'test', description: 'Do not open' });
  f.manifest.sources.push({ ...structuredClone(f.source), id: 'sealed-source', familyId: 'sealed', file: 'never-open.json', sha256: 'a'.repeat(64), provenance: { kind: 'author', name: 'Author', permission: 'Test-only permission record' } });
  f.manifest.sources.push({ ...structuredClone(f.source), id: 'unsupported', file: 'also-absent.json', conversion: { status: 'unsupported', importer: 'test', losses: ['unsupported rotation'] } });
  await f.saveManifest();
  const report = await preflightCorpus(f.manifestPath);
  assert.deepEqual(report.sources.map(s => s.status), ['catalog-ready', 'skipped-test', 'unsupported-conversion']);
  assert.ok(!report.sources[1].error && !report.sources[1].verified);
  assert.equal(report.cases.length, 6);
  assert.equal(report.counts.byStatus['skipped-test'], 2);
  assert.equal(report.counts.byStatus['unsupported-conversion'], 2);
});

test('validation families are included and independently identified', async t => {
  const f = await resourceFixture(t);
  f.manifest.families[0].split = 'validation';
  f.source.provenance = { kind: 'author', name: 'Author', permission: 'Test fixture' }; await f.saveManifest();
  const report = await preflightCorpus(f.manifestPath);
  assert.equal(report.sources[0].split, 'validation');
  assert.equal(report.cases.length, 2);
});

test('all manifest errors stop file loading, including duplicate IDs and cross-split leakage', async t => {
  const f = await resourceFixture(t);
  f.manifest.targets.push(f.manifest.targets[0]);
  f.manifest.families.push({ id: 'validation', split: 'validation', description: 'Validation' });
  f.manifest.sources.push({ ...structuredClone(f.source), id: 'leak', familyId: 'validation', provenance: { kind: 'author', name: 'A', permission: 'Fixture' } });
  await rm(join(f.root, f.source.file)); await f.saveManifest();
  const report = await preflightCorpus(f.manifestPath);
  assert.equal(report.state, 'invalid-manifest');
  assert.deepEqual(report.sources, []); assert.deepEqual(report.cases, []);
  assert.ok(report.manifestIssues.some(i => i.code === 'duplicate-id'));
  assert.ok(report.manifestIssues.some(i => i.code === 'cross-split-duplicate'));
});

test('malformed and oversized manifests fail with explicit errors', async t => {
  const f = await resourceFixture(t);
  await writeFile(f.manifestPath, '{');
  await assert.rejects(preflightCorpus(f.manifestPath), { code: 'invalid-json' });
  await writeFile(f.manifestPath, Buffer.alloc(8 * 1024 * 1024 + 1, 32));
  await assert.rejects(preflightCorpus(f.manifestPath), { code: 'file-byte-limit' });
});

test('matrix count limit rejects oversized work before opening any source', async t => {
  const f = await resourceFixture(t);
  f.manifest.sources = Array.from({ length: 257 }, (_, i) => ({ ...f.source, id: `source-${i}`, file: 'absent.json' }));
  await f.saveManifest();
  const report = await preflightCorpus(f.manifestPath);
  assert.equal(report.state, 'invalid-manifest');
  assert.ok(report.manifestIssues.some(i => i.code === 'preflight-count-limit'));
  assert.deepEqual(report.cases, []);
});

test('resource failures carry precise codes, and manifest warnings survive', async t => {
  const f = await resourceFixture(t);
  await writeFile(join(f.root, 'art.svg'), 'changed');
  const report = await preflightCorpus(f.manifestPath);
  assert.equal(report.sources[0].error?.code, 'hash-mismatch');
  assert.equal(report.cases[0].status, 'blocked');
  assert.ok(report.manifestIssues.some(i => i.code === 'too-few-test-families'));
});

test('CLI emits JSON only, with nonzero exit for failed cases and malformed inputs', async t => {
  const f = await resourceFixture(t);
  const good = cli('--manifest', f.manifestPath);
  assert.equal(good.status, 0, good.stderr);
  assert.equal(JSON.parse(good.stdout).cases.length, 2);
  await rm(join(f.root, 'art.svg'));
  const bad = cli('--manifest', f.manifestPath);
  assert.equal(bad.status, 1);
  assert.equal(JSON.parse(bad.stdout).sources[0].error.code, 'missing-file');
  const missing = cli('--manifest', join(f.root, 'none.json'));
  assert.equal(missing.status, 1); assert.equal(missing.stdout, '');
  assert.equal(JSON.parse(missing.stderr).error.code, 'missing-file');
});

test('CLI rejects unknown, repeated or incomplete options and supports help', () => {
  for (const args of [['--bogus'], ['--manifest'], ['--manifest', 'x', '--manifest', 'y'], ['--help', '--bogus']]) {
    const bad = cli(...args);
    assert.equal(bad.status, 2);
    assert.equal(JSON.parse(bad.stderr).error.code, 'invalid-arguments');
  }
  const help = cli('--help'); assert.equal(help.status, 0); assert.match(help.stdout, /preflight/);
});
