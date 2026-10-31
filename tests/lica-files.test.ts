import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fontsourceId, readLicaJson, sha256, writeCorpusFile } from '../scripts/lica-files';

async function root(t: test.TestContext) {
  const dir = await mkdtemp(join(tmpdir(), 'reflow-lica-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

test('sha256 matches node crypto', () => {
  assert.equal(sha256('abc'), createHash('sha256').update('abc').digest('hex'));
});

test('writes nested corpus files and returns their relative path and hash', async t => {
  const dir = await root(t);
  const written = await writeCorpusFile(dir, 'lica/assets/a.png', Buffer.from('png bytes'));
  assert.deepEqual(written, { file: 'lica/assets/a.png', sha256: sha256('png bytes') });
  assert.equal(await readFile(join(dir, 'lica/assets/a.png'), 'utf8'), 'png bytes');
});

test('refuses paths outside the corpus directory', async t => {
  const dir = await root(t);
  await assert.rejects(writeCorpusFile(dir, '../escape.txt', 'x'), /outside/);
  await assert.rejects(writeCorpusFile(dir, '/tmp/escape.txt', 'x'), /outside/);
});

test('fontsource ids are lowercase and hyphenated', () => {
  assert.equal(fontsourceId('Public Sans'), 'public-sans');
  assert.equal(fontsourceId('Montserrat'), 'montserrat');
});

test('only absent or malformed JSON is classified as source data trouble', async t => {
  const dir = await root(t);
  const file = join(dir, 'layout.json');
  assert.deepEqual(await readLicaJson(file), { kind: 'missing' });
  await writeFile(file, '{broken');
  assert.deepEqual(await readLicaJson(file), { kind: 'invalid' });
  await writeFile(file, '{"name":"ok"}');
  assert.deepEqual(await readLicaJson(file), { kind: 'value', value: { name: 'ok' } });
  await assert.rejects(readLicaJson(dir), /EISDIR|directory/i);
});
