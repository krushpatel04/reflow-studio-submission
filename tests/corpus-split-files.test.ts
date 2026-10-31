import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkCorpusSplitFile, loadSplitLock } from '../scripts/corpus-split-files';
import { freezeSplits, migrateSplitLock, reconcileLicaSplits } from '../scripts/corpus-splits';
import { DEFAULT_BATCH, LICA_TARGETS } from '../scripts/lica-batch';
import type { CorpusManifest } from '../src/corpus';

const manifest: CorpusManifest = { schemaVersion: 'reflow.corpus.v0', targets: LICA_TARGETS, families: [{ id: 'lica-a', split: 'development', description: '' }], sources: [{ id: 'a', familyId: 'lica-a', file: 'a.json', sha256: 'a'.repeat(64), templateId: 'lica:a', provenance: { kind: 'dataset', name: 'LICA', license: 'CC-BY-4.0', attribution: 'LICA' }, resources: [], conversion: { status: 'supported', importer: 'lica-import@1', losses: [] } }] };

test('checker rejects a missing or malformed split lock and accepts a valid one', async t => {
  const root = await mkdtemp(join(tmpdir(), 'reflow-split-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.deepEqual((await checkCorpusSplitFile(manifest, root)).map(i => i.code), ['missing-split-lock']);
  await writeFile(join(root, 'split-lock.json'), '{broken');
  assert.deepEqual((await checkCorpusSplitFile(manifest, root)).map(i => i.code), ['invalid-split-lock']);
  await writeFile(join(root, 'split-lock.json'), JSON.stringify(freezeSplits(manifest, DEFAULT_BATCH)));
  assert.deepEqual(await checkCorpusSplitFile(manifest, root), []);
});

test('checker finds split drift in the persisted lock', async t => {
  const root = await mkdtemp(join(tmpdir(), 'reflow-split-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'split-lock.json'), JSON.stringify(freezeSplits(manifest, DEFAULT_BATCH)));
  const moved = structuredClone(manifest); moved.families[0].split = 'validation';
  assert.ok((await checkCorpusSplitFile(moved, root)).some(i => i.code === 'split-drift'));
});

test('serialized restart preserves reviewed additions, omitted families and reordered inputs', async t => {
  const root = await mkdtemp(join(tmpdir(), 'reflow-split-restart-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const initial = freezeSplits(manifest, DEFAULT_BATCH);
  const review = { reason: 'Synthetic test approval marker; not real family admission', date: '2026-10-20' };
  const config = { ...DEFAULT_BATCH, maxTemplates: 12 };
  const expanded = reconcileLicaSplits(initial, ['new', 'a', 'new'], LICA_TARGETS, config, true, review);
  const reordered = reconcileLicaSplits(initial, ['a', 'new'], LICA_TARGETS, config, true, review);
  assert.deepEqual(expanded.lock, reordered.lock);
  assert.deepEqual(initial, freezeSplits(manifest, DEFAULT_BATCH), 'approval must not mutate the prior lock');
  await writeFile(join(root, 'split-lock.json'), JSON.stringify(expanded.lock));

  const loaded = await loadSplitLock(root);
  assert.deepEqual(loaded, expanded.lock, 'version, fingerprints, review and exposure survive reload');
  assert.deepEqual(loaded.families.find(f => f.id === 'lica-a'), initial.families[0]);
  assert.equal(loaded.families.find(f => f.id === 'lica-new')?.exposure, 'seen');
  assert.deepEqual(loaded.configVersions?.at(-1), {
    version: 2, config, sha256: loaded.importConfigSha256, ...review,
  });
  const omitted = reconcileLicaSplits(loaded, ['new'], LICA_TARGETS, config);
  await writeFile(join(root, 'split-lock.json'), JSON.stringify(omitted.lock));
  const returned = reconcileLicaSplits(await loadSplitLock(root), ['new', 'a'], LICA_TARGETS, config);
  assert.equal(returned.splits.get('a'), 'development');
  assert.deepEqual([...returned.splits], [...expanded.splits]);
  assert.deepEqual(returned.lock, expanded.lock, 'omission and return must not rewrite assignment history');
  assert.deepEqual(await checkCorpusSplitFile(manifest, root), []);
});

test('serialized synthetic exposure migration retains retirement and rejects falsified prior exposure', async t => {
  const root = await mkdtemp(join(tmpdir(), 'reflow-split-exposure-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const initial = freezeSplits(manifest, DEFAULT_BATCH);
  // This is invented test metadata, not access to a real sealed source.
  initial.families.push({ id: 'test-only-external', split: 'test', templateId: 'test-only:composition', exposure: 'sealed' });
  const migrated = migrateSplitLock(initial, 'test-only-external', 'test-only-exposed', 'development',
    'Synthetic test exposure record', '2026-10-20');
  await writeFile(join(root, 'split-lock.json'), JSON.stringify(migrated));
  const loaded = await loadSplitLock(root);
  assert.deepEqual(loaded, migrated);
  assert.equal(loaded.families.find(f => f.id === 'test-only-external')?.retired, true);
  assert.equal(loaded.families.find(f => f.id === 'test-only-exposed')?.exposure, 'seen');
  assert.deepEqual(loaded.migrations, [{
    fromFamilyId: 'test-only-external', toFamilyId: 'test-only-exposed',
    fromSplit: 'test', toSplit: 'development', fromExposure: 'sealed',
    reason: 'Synthetic test exposure record', date: '2026-10-20',
  }]);
  assert.deepEqual(await checkCorpusSplitFile(manifest, root), []);
  const resurrected = structuredClone(manifest);
  resurrected.families.push({ id: 'test-only-external', split: 'test', description: 'Invalid resurrection' });
  assert.ok((await checkCorpusSplitFile(resurrected, root)).some(i => i.code === 'retired-family'));
  loaded.migrations[0].fromExposure = 'seen';
  await writeFile(join(root, 'split-lock.json'), JSON.stringify(loaded));
  assert.ok((await checkCorpusSplitFile(manifest, root)).some(i => i.code === 'invalid-migration'));
});
