import test from 'node:test';
import assert from 'node:assert/strict';
import type { CorpusManifest } from '../src/corpus';
import { checkImportPreservation, checkSplitLock, freezeSplits, migrateSplitLock, reconcileLicaSplits } from '../scripts/corpus-splits';
import { DEFAULT_BATCH, LICA_TARGETS } from '../scripts/lica-batch';

const family = (id: string, split: 'development' | 'validation') => ({ id: `lica-${id}`, split, description: id });
const manifest = (): CorpusManifest => ({ schemaVersion: 'reflow.corpus.v0', targets: LICA_TARGETS, families: [family('a', 'development'), family('b', 'validation')], sources: [
  { id: 'a1', familyId: 'lica-a', file: 'a.json', sha256: 'a'.repeat(64), templateId: 'lica:a', provenance: { kind: 'dataset', name: 'LICA', license: 'CC-BY-4.0', attribution: 'LICA' }, resources: [], conversion: { status: 'supported', importer: 'lica-import@1', losses: [] } },
  { id: 'b1', familyId: 'lica-b', file: 'b.json', sha256: 'b'.repeat(64), templateId: 'lica:b', provenance: { kind: 'dataset', name: 'LICA', license: 'CC-BY-4.0', attribution: 'LICA' }, resources: [], conversion: { status: 'supported', importer: 'lica-import@1', losses: [] } },
] });

test('freezes existing families as seen and retains exact development and validation splits', () => {
  const lock = freezeSplits(manifest(), DEFAULT_BATCH);
  assert.deepEqual(lock.families, [
    { id: 'lica-a', split: 'development', templateId: 'lica:a', exposure: 'seen' },
    { id: 'lica-b', split: 'validation', templateId: 'lica:b', exposure: 'seen' },
  ]);
  assert.equal(lock.schemaVersion, 'reflow.corpus-splits.v1');
  assert.match(lock.targetsSha256, /^[0-9a-f]{64}$/);
  assert.match(lock.importConfigSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(checkSplitLock(manifest(), lock), []);
});

test('a known family keeps its split when a new family is approved and input order changes', () => {
  const lock = freezeSplits(manifest(), DEFAULT_BATCH);
  assert.throws(() => reconcileLicaSplits(lock, ['0', 'a', 'b'], LICA_TARGETS, DEFAULT_BATCH), /approve/i);
  assert.throws(() => reconcileLicaSplits(lock, ['0', 'a', 'b'], LICA_TARGETS, DEFAULT_BATCH, true), /review reason/i);
  const expanded = reconcileLicaSplits(lock, ['b', '0', 'a'], LICA_TARGETS, DEFAULT_BATCH, true, { reason: 'Reviewed new template 0 for duplicate risk', date: '2026-09-22' });
  assert.equal(expanded.splits.get('a'), 'development');
  assert.equal(expanded.splits.get('b'), 'validation');
  assert.ok(['development', 'validation'].includes(expanded.splits.get('0')!));
  assert.equal(expanded.lock.families.find(f => f.id === 'lica-0')?.exposure, 'seen');
  const repeated = reconcileLicaSplits(expanded.lock, ['a', 'b', '0'], LICA_TARGETS, DEFAULT_BATCH);
  assert.deepEqual([...repeated.splits].sort(), [...expanded.splits].sort());
  assert.deepEqual(repeated.lock, expanded.lock);
});

test('removing a family from the batch keeps its assignment for a later return', () => {
  const lock = freezeSplits(manifest(), DEFAULT_BATCH);
  const smaller = reconcileLicaSplits(lock, ['a'], LICA_TARGETS, DEFAULT_BATCH);
  assert.equal(smaller.lock.families.length, 2);
  assert.equal(reconcileLicaSplits(smaller.lock, ['b'], LICA_TARGETS, DEFAULT_BATCH).splits.get('b'), 'validation');
});

test('changed split, template identity and target list fail checking', () => {
  const lock = freezeSplits(manifest(), DEFAULT_BATCH);
  const moved = manifest(); moved.families[1].split = 'development';
  assert.ok(checkSplitLock(moved, lock).some(i => i.code === 'split-drift'));
  const reused = manifest(); reused.sources[1].templateId = 'lica:a';
  assert.ok(checkSplitLock(reused, lock).some(i => i.code === 'template-drift'));
  const resized = manifest(); resized.targets = [{ ...LICA_TARGETS[0], width: 1000 }];
  assert.ok(checkSplitLock(resized, lock).some(i => i.code === 'target-drift'));
});

test('changed import settings and duplicate templates cannot be silently approved', () => {
  const lock = freezeSplits(manifest(), DEFAULT_BATCH);
  assert.throws(() => reconcileLicaSplits(lock, ['a', 'b'], LICA_TARGETS, { ...DEFAULT_BATCH, seed: 1 }), /config/i);
  const corrupt = structuredClone(lock); corrupt.families[1].templateId = 'lica:a';
  assert.ok(checkSplitLock(manifest(), corrupt).some(i => i.code === 'duplicate-template-lock'));
});

test('reviewed config version allows bounded growth and detects tampered history', () => {
  const lock = freezeSplits(manifest(), DEFAULT_BATCH);
  const next = { ...DEFAULT_BATCH, maxLayouts: 40, maxTemplates: 12 };
  assert.throws(() => reconcileLicaSplits(lock, ['a', 'b'], LICA_TARGETS, next), /config/i);
  assert.throws(() => reconcileLicaSplits(lock, ['a', 'b'], LICA_TARGETS, next, false, { reason: '', date: '2026-09-22' }), /reason/i);
  const reviewed = reconcileLicaSplits(lock, ['a', 'b'], LICA_TARGETS, next, false, { reason: 'Review expansion candidates', date: '2026-09-22' });
  assert.equal(reviewed.lock.configVersions?.length, 2);
  assert.deepEqual(reviewed.lock.importConfig, next);
  assert.deepEqual(checkSplitLock(manifest(), reviewed.lock), []);
  const tampered = structuredClone(reviewed.lock); tampered.configVersions![0].config.maxLayouts = 99;
  assert.ok(checkSplitLock(manifest(), tampered).some(i => i.code === 'config-history-drift'));
  assert.deepEqual(reconcileLicaSplits(reviewed.lock, ['a', 'b'], LICA_TARGETS, next).lock, reviewed.lock);
});

test('a seen family cannot be presented as sealed test evidence', () => {
  const lock = freezeSplits(manifest(), DEFAULT_BATCH);
  const claimed = structuredClone(lock); claimed.families[1].split = 'test'; claimed.families[1].exposure = 'seen';
  const m = manifest(); m.families[1].split = 'test';
  assert.ok(checkSplitLock(m, claimed).some(i => i.code === 'seen-test-family'));
});

test('a LICA family cannot be assigned to test even if someone marks it sealed', () => {
  const lock = freezeSplits(manifest(), DEFAULT_BATCH);
  const claimed = structuredClone(lock); claimed.families[1].split = 'test'; claimed.families[1].exposure = 'sealed';
  const m = manifest(); m.families[1].split = 'test';
  assert.ok(checkSplitLock(m, claimed).some(i => i.code === 'lica-test-family'));
  assert.throws(() => reconcileLicaSplits(claimed, ['b'], LICA_TARGETS, DEFAULT_BATCH), /LICA.*test/i);
});

test('moving an exposed holdout retires its old identity and records the migration', () => {
  const lock = freezeSplits(manifest(), DEFAULT_BATCH);
  lock.families.push({ id: 'creator-a', split: 'test', templateId: 'creator:a', exposure: 'sealed' });
  const migrated = migrateSplitLock(lock, 'creator-a', 'creator-a-dev', 'development', 'Used to diagnose a crop failure', '2026-09-22');
  assert.deepEqual(migrated.migrations, [{ fromFamilyId: 'creator-a', toFamilyId: 'creator-a-dev', fromSplit: 'test', toSplit: 'development', fromExposure: 'sealed', reason: 'Used to diagnose a crop failure', date: '2026-09-22' }]);
  assert.equal(migrated.families.find(f => f.id === 'creator-a')?.retired, true);
  assert.deepEqual(migrated.families.find(f => f.id === 'creator-a-dev'), { id: 'creator-a-dev', split: 'development', templateId: 'creator:a', exposure: 'seen' });
  const current = manifest();
  current.families.push({ id: 'creator-a-dev', split: 'development', description: 'Creator A after exposure' });
  current.sources.push({ id: 'creator-source', familyId: 'creator-a-dev', file: 'creator.json', sha256: 'c'.repeat(64), templateId: 'creator:a', provenance: { kind: 'author', name: 'Creator A', permission: 'Granted' }, resources: [], conversion: { status: 'supported', importer: 'manual@1', losses: [] } });
  assert.deepEqual(checkSplitLock(current, migrated), []);
  assert.equal(reconcileLicaSplits(migrated, ['a', 'b'], LICA_TARGETS, DEFAULT_BATCH).splits.get('b'), 'validation');
});

test('migration rejects missing rationale, reused IDs and moves into sealed test', () => {
  const lock = freezeSplits(manifest(), DEFAULT_BATCH);
  assert.throws(() => migrateSplitLock(lock, 'lica-b', 'new', 'development', '', '2026-09-22'), /reason/i);
  assert.throws(() => migrateSplitLock(lock, 'lica-b', 'lica-a', 'development', 'Exposure', '2026-09-22'), /already/i);
  assert.throws(() => migrateSplitLock(lock, 'lica-b', 'new', 'test', 'Exposure', '2026-09-22'), /test/i);
});

test('a duplicate template without a valid retirement record is rejected', () => {
  const lock = freezeSplits(manifest(), DEFAULT_BATCH);
  lock.families.push({ id: 'b2', split: 'development', templateId: 'lica:b', exposure: 'seen' });
  assert.ok(checkSplitLock(manifest(), lock).some(i => i.code === 'duplicate-template-lock'));
});

test('an importer rerun cannot silently drop or replace existing corpus evidence', () => {
  const previous = manifest();
  const reordered = structuredClone(previous); reordered.sources.reverse(); reordered.families.reverse();
  assert.deepEqual(checkImportPreservation(previous, reordered), []);
  const removed = structuredClone(previous); removed.sources.pop(); removed.families.pop();
  assert.ok(checkImportPreservation(previous, removed).some(i => i.code === 'source-removed'));
  const changed = structuredClone(previous); changed.sources[0].sha256 = 'c'.repeat(64);
  assert.ok(checkImportPreservation(previous, changed).some(i => i.code === 'source-replaced'));
});

test('shared template markers allow same-family derivatives but reject separate family identities', () => {
  const derivatives = manifest();
  derivatives.sources.push({ ...structuredClone(derivatives.sources[0]), id: 'a2', file: 'a2.json', sha256: 'c'.repeat(64) });
  const lock = freezeSplits(derivatives, DEFAULT_BATCH);
  assert.deepEqual(checkSplitLock(derivatives, lock), []);
  assert.equal(lock.families.length, 2, 'multiple derivative files do not create an independent family');
  const duplicateFamily = structuredClone(derivatives);
  duplicateFamily.families.push(family('derivative', 'validation'));
  duplicateFamily.sources[2].familyId = 'lica-derivative';
  assert.throws(() => freezeSplits(duplicateFamily, DEFAULT_BATCH), /template.*multiple families/i);
});
