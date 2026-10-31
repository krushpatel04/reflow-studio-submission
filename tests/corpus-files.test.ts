import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FIXTURES } from '../src/fixtures';
import type { CorpusManifest } from '../src/corpus';
import { checkCorpusFiles } from '../scripts/corpus-files';

const sha = (data: string) => createHash('sha256').update(data).digest('hex');
const design = JSON.stringify(FIXTURES[0]);
const font = 'font bytes';

async function corpus(t: test.TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'reflow-corpus-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'designs')); await mkdir(join(root, 'fonts'));
  await writeFile(join(root, 'designs/poster.json'), design);
  await writeFile(join(root, 'fonts/inter.woff2'), font);
  const manifest: CorpusManifest = {
    schemaVersion: 'reflow.corpus.v0',
    targets: [{ id: 'square', label: 'Square', width: 1080, height: 1080 }],
    families: [{ id: 'poster', split: 'development', description: '' }],
    sources: [{
      id: 'poster-1', familyId: 'poster', file: 'designs/poster.json', sha256: sha(design),
      provenance: { kind: 'author', name: 'Creator', permission: 'Signed release' },
      resources: [{ kind: 'font', id: 'Inter-500', file: 'fonts/inter.woff2', sha256: sha(font) }],
      conversion: { status: 'supported', importer: 'manual@0', losses: [] },
    }],
  };
  return { root, manifest };
}
const found = (issues: { code: string; path: string }[]) => issues.map(i => [i.code, i.path]);

test('files matching their recorded hashes pass', async t => {
  const { root, manifest } = await corpus(t);
  assert.deepEqual(await checkCorpusFiles(manifest, root), []);
});
test('in-root names beginning with two dots are allowed, but parent traversal is not', async t => {
  const { root, manifest } = await corpus(t);
  await mkdir(join(root, '..draft'));
  await writeFile(join(root, '..draft/poster.json'), design);
  manifest.sources[0].file = '..draft/poster.json';
  assert.deepEqual(await checkCorpusFiles(manifest, root), []);
  manifest.sources[0].file = '../outside.json';
  assert.deepEqual(found(await checkCorpusFiles(manifest, root)), [['file-outside-corpus', '$.sources[0].file']]);
});
test('a missing design or resource file is reported', async t => {
  const { root, manifest } = await corpus(t);
  manifest.sources[0].file = 'designs/absent.json';
  manifest.sources[0].resources[0].file = 'fonts/absent.woff2';
  assert.deepEqual(found(await checkCorpusFiles(manifest, root)), [
    ['missing-file', '$.sources[0].file'], ['missing-file', '$.sources[0].resources[0].file'],
  ]);
});
test('a design edited after it was recorded fails its hash', async t => {
  const { root, manifest } = await corpus(t);
  await writeFile(join(root, 'designs/poster.json'), design.replace('Design', 'Desigm'));
  assert.deepEqual(found(await checkCorpusFiles(manifest, root)), [['hash-mismatch', '$.sources[0].sha256']]);
});
test('a changed resource fails its hash', async t => {
  const { root, manifest } = await corpus(t);
  await writeFile(join(root, 'fonts/inter.woff2'), 'other font bytes');
  assert.deepEqual(found(await checkCorpusFiles(manifest, root)), [['hash-mismatch', '$.sources[0].resources[0].sha256']]);
});
test('a convertible source whose design fails validation is reported', async t => {
  const { root, manifest } = await corpus(t);
  const broken = JSON.stringify({ ...FIXTURES[0], elements: [] });
  await writeFile(join(root, 'designs/poster.json'), broken);
  manifest.sources[0].sha256 = sha(broken);
  const issues = await checkCorpusFiles(manifest, root);
  assert.deepEqual(found(issues), [['invalid-design', '$.sources[0].file']]);
  assert.match(issues[0].message, /elements/);
});
test('an unparseable design is reported for adapted sources', async t => {
  const { root, manifest } = await corpus(t);
  await writeFile(join(root, 'designs/poster.json'), '{not json');
  manifest.sources[0].sha256 = sha('{not json');
  manifest.sources[0].conversion = { status: 'adapted', importer: 'manual@0', losses: ['Shadow removed'] };
  assert.deepEqual(found(await checkCorpusFiles(manifest, root)), [['invalid-design', '$.sources[0].file']]);
});
test('an unsupported source is not required to contain a valid design', async t => {
  const { root, manifest } = await corpus(t);
  await writeFile(join(root, 'designs/poster.json'), 'original export, not converted');
  manifest.sources[0].sha256 = sha('original export, not converted');
  manifest.sources[0].conversion = { status: 'unsupported', importer: 'manual@0', losses: ['Rotated text'] };
  assert.deepEqual(await checkCorpusFiles(manifest, root), []);
});
for (const file of ['../outside.json', '/etc/hosts']) test(`a file path outside the corpus (${file}) is rejected without reading it`, async t => {
  const { root, manifest } = await corpus(t);
  manifest.sources[0].file = file;
  assert.deepEqual(found(await checkCorpusFiles(manifest, root)), [['file-outside-corpus', '$.sources[0].file']]);
});
