import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, symlink, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { loadCorpusSource } from '../scripts/corpus-resources';
import { validateResources } from '../src/resources';
import { reflow } from '../src/engine';
import { renderSvg } from '../src/render';
import { assetSize } from '../src/crop';
import { measure } from '../scripts/native';
import { digest, resourceFixture } from './support/corpus-resource-fixture';

const code = (wanted: string) => (error: unknown) => {
  assert.equal((error as { code: string }).code, wanted);
  return true;
};

test('hash-verified external assets reach the real engine and SVG using an explicitly matching measurer', async t => {
  const f = await resourceFixture(t);
  const original = structuredClone(f.source);
  assert.throws(() => validateResources(f.design), code('missing-asset'));
  const loaded = await loadCorpusSource(f.root, f.source);
  const output = reflow(loaded.design, { id: 'identity', label: 'Identity', width: 600, height: 800 }, measure, loaded.resources);
  assert.deepEqual(output.selected.design, f.design);
  const svg = renderSvg(output.selected.design, measure, undefined, loaded.resources);
  assert.ok(svg.includes('data:image/svg+xml,'));
  assert.ok(svg.includes('Cafe launch'));
  assert.deepEqual(assetSize(loaded.resources.resolveAsset('external-art')!), { width: 100, height: 100 });
  assert.deepEqual(f.source, original);
  assert.deepEqual(JSON.parse(await readFile(join(f.root, f.source.file), 'utf8')), f.design);
  assert.deepEqual(loaded.fonts.map(font => [font.family, font.weight, font.sha256]), [['Inter', 400, digest(f.font)]]);
  assert.deepEqual(loaded.fonts[0].bytes, f.font);
  assert.equal(loaded.resources.supportsFont('Inter', 700), false);
  assert.equal(loaded.resources.resolveAsset('orbit'), undefined);
  assert.equal(loaded.resources.resolveAsset('__proto__'), undefined);
});

test('font family/weight bindings use the requested family including hyphens', async t => {
  const f = await resourceFixture(t);
  const text = f.design.elements[1]; assert.equal(text.type, 'text');
  if (text.type !== 'text') return;
  text.fontFamily = 'Brand-Sans'; f.source.resources[1].id = 'Brand-Sans-400'; await f.saveDesign();
  const loaded = await loadCorpusSource(f.root, f.source);
  assert.equal(loaded.resources.supportsFont('Brand-Sans', 400), true);
  assert.equal(loaded.resources.supportsFont('Brand', 400), false);
  assert.equal(loaded.fonts[0].family, 'Brand-Sans');
});

for (const kind of ['source', 'asset', 'font'] as const) test(`${kind} hash drift is rejected`, async t => {
  const f = await resourceFixture(t);
  const file = kind === 'source' ? f.source.file : f.source.resources[kind === 'asset' ? 0 : 1].file;
  await writeFile(join(f.root, file), 'changed bytes');
  await assert.rejects(loadCorpusSource(f.root, f.source), code('hash-mismatch'));
});

test('missing files, undeclared assets and unbound font weights stay explicit', async t => {
  const f = await resourceFixture(t);
  const missing = structuredClone(f.source); missing.resources[0].file = 'absent.svg';
  await assert.rejects(loadCorpusSource(f.root, missing), code('missing-file'));
  const noAsset = structuredClone(f.source); noAsset.resources.shift();
  await assert.rejects(loadCorpusSource(f.root, noAsset), code('missing-asset'));
  const noWeight = structuredClone(f.source); noWeight.resources[1].id = 'Inter-700';
  await assert.rejects(loadCorpusSource(f.root, noWeight), code('unsupported-font'));
});

test('same resource bytes can be shared; conflicting duplicate IDs fail', async t => {
  const f = await resourceFixture(t);
  f.source.resources.push(structuredClone(f.source.resources[0]));
  const loaded = await loadCorpusSource(f.root, f.source);
  assert.equal(loaded.files.length, 2);
  const replacement = Buffer.from(f.asset.toString().replace('#4353ff', '#000000'));
  await writeFile(join(f.root, 'different.svg'), replacement);
  f.source.resources[2] = { ...f.source.resources[0], file: 'different.svg', sha256: digest(replacement) };
  await assert.rejects(loadCorpusSource(f.root, f.source), code('conflicting-resource'));
});

for (const file of ['../outside.svg', '/etc/hosts', 'https://example.com/art.svg']) test(`external path rejected: ${file}`, async t => {
  const f = await resourceFixture(t); f.source.resources[0].file = file;
  await assert.rejects(loadCorpusSource(f.root, f.source), code('file-outside-corpus'));
});

test('contained symlinks and dot-prefixed names work; escaping symlinks fail', async t => {
  const f = await resourceFixture(t);
  await symlink('art.svg', join(f.root, 'alias.svg'));
  f.source.resources[0].file = 'alias.svg';
  assert.ok((await loadCorpusSource(f.root, f.source)).resources.resolveAsset('external-art'));
  await writeFile(join(f.root, '..art.svg'), f.asset); f.source.resources[0].file = '..art.svg';
  await loadCorpusSource(f.root, f.source);
  await writeFile(join(f.base, 'outside.svg'), f.asset);
  await symlink('../outside.svg', join(f.root, 'escape.svg')); f.source.resources[0].file = 'escape.svg';
  await assert.rejects(loadCorpusSource(f.root, f.source), code('file-outside-corpus'));
});

test('directories and FIFOs fail before any blocking resource read', { timeout: 4000 }, async t => {
  const f = await resourceFixture(t);
  await mkdir(join(f.root, 'directory')); f.source.resources[0].file = 'directory';
  await assert.rejects(loadCorpusSource(f.root, f.source), code('unsupported-file-type'));
  if (process.platform !== 'win32') {
    execFileSync('mkfifo', [join(f.root, 'pipe')]); f.source.resources[0].file = 'pipe';
    await assert.rejects(loadCorpusSource(f.root, f.source), code('unsupported-file-type'));
  }
});

test('exact byte budgets pass; one extra byte fails and duplicate paths are read once', async t => {
  const f = await resourceFixture(t); const sourceBytes = await f.saveDesign();
  const total = sourceBytes + f.font.byteLength + f.asset.byteLength;
  f.source.resources.push(structuredClone(f.source.resources[0]));
  const loaded = await loadCorpusSource(f.root, f.source, { maxSourceBytes: sourceBytes, maxResourceBytes: f.font.byteLength, maxTotalBytes: total });
  assert.equal(loaded.totalBytes, total);
  await assert.rejects(loadCorpusSource(f.root, f.source, { maxSourceBytes: sourceBytes - 1 }), code('file-byte-limit'));
  await assert.rejects(loadCorpusSource(f.root, f.source, { maxResourceBytes: f.font.byteLength - 1 }), code('file-byte-limit'));
  await assert.rejects(loadCorpusSource(f.root, f.source, { maxTotalBytes: total - 1 }), code('total-byte-limit'));
});

test('invalid limits and excessive resource lists fail visibly', async t => {
  const f = await resourceFixture(t);
  for (const maxTotalBytes of [0, -1, NaN, Infinity, 1.5]) await assert.rejects(loadCorpusSource(f.root, f.source, { maxTotalBytes }), code('invalid-limit'));
  await assert.rejects(loadCorpusSource(f.root, f.source, { maxResources: 1 }), code('resource-count-limit'));
});

test('malformed design and unsupported resource envelopes fail without capabilities', async t => {
  const f = await resourceFixture(t);
  await writeFile(join(f.root, f.source.file), '{}'); f.source.sha256 = digest('{}');
  await assert.rejects(loadCorpusSource(f.root, f.source), code('invalid-design'));
  await f.saveDesign();
  await writeFile(join(f.root, 'font.woff2'), 'invalid font'); f.source.resources[1].sha256 = digest('invalid font');
  await assert.rejects(loadCorpusSource(f.root, f.source), code('unsupported-font-format'));
  await writeFile(join(f.root, 'font.woff2'), f.font); f.source.resources[1].sha256 = digest(f.font);
  await writeFile(join(f.root, 'art.svg'), 'not an image'); f.source.resources[0].sha256 = digest('not an image');
  await assert.rejects(loadCorpusSource(f.root, f.source), code('unsupported-asset-format'));
});

test('asset URIs preserve verified PNG bytes and SVG text', async t => {
  const f = await resourceFixture(t);
  const { createCanvas } = await import('@napi-rs/canvas');
  const bytes = createCanvas(8, 9).toBuffer('image/png');
  await writeFile(join(f.root, 'art.png'), bytes);
  f.source.resources[0] = { ...f.source.resources[0], file: 'art.png', sha256: digest(bytes) };
  const loaded = await loadCorpusSource(f.root, f.source);
  const uri = loaded.resources.resolveAsset('external-art')!;
  assert.deepEqual(Buffer.from(uri.split(',')[1], 'base64'), bytes);
  assert.deepEqual(assetSize(uri), { width: 8, height: 9 });
});

test('unsupported SVG external dependencies are reported rather than fetched or erased', async t => {
  const f = await resourceFixture(t);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><image href="https://example.com/a.png"/></svg>';
  await writeFile(join(f.root, 'art.svg'), svg); f.source.resources[0].sha256 = digest(svg);
  await assert.rejects(loadCorpusSource(f.root, f.source), code('external-svg-dependency'));
});

test('unsupported conversions are not loaded even if their source is absent', async t => {
  const f = await resourceFixture(t);
  f.source.conversion = { status: 'unsupported', importer: 'test', losses: ['rotation'] };
  await rm(join(f.root, f.source.file));
  await assert.rejects(loadCorpusSource(f.root, f.source), code('unsupported-conversion'));
});

for (const format of ['jpeg', 'webp'] as const) test(`actual ${format} bytes take priority over a misleading .png filename`, async t => {
  const f = await resourceFixture(t);
  const { createCanvas } = await import('@napi-rs/canvas');
  const bytes = createCanvas(8, 9).toBuffer(format === 'jpeg' ? 'image/jpeg' : 'image/webp');
  await writeFile(join(f.root, 'misnamed.png'), bytes);
  f.source.resources[0] = { ...f.source.resources[0], file: 'misnamed.png', sha256: digest(bytes) };
  const loaded = await loadCorpusSource(f.root, f.source);
  const uri = loaded.resources.resolveAsset('external-art')!;
  assert.ok(uri.startsWith(`data:image/${format};base64,`));
  assert.deepEqual(Buffer.from(uri.split(',')[1], 'base64'), bytes);
  assert.equal(loaded.assets[0].intrinsicSize, undefined);
  assert.equal(loaded.assets[0].dimensions, 'unverified');
});

test('CSS-sized SVG bytes and internal clip references are preserved with unknown intrinsic dimensions explicit', async t => {
  const f = await resourceFixture(t);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" style="width: 798.822px; height: 2px"><defs><clipPath id="local"><rect width="8" height="2"/></clipPath></defs><path d="M0,1L8,1" clip-path="url(#local)"/></svg>';
  await writeFile(join(f.root, 'art.svg'), svg); f.source.resources[0].sha256 = digest(svg);
  const loaded = await loadCorpusSource(f.root, f.source);
  assert.equal(decodeURIComponent(loaded.resources.resolveAsset('external-art')!.split(',')[1]), svg);
  assert.equal(loaded.assets[0].dimensions, 'unverified');
});

for (const dependency of ['style="fill:url(https://example.com/x.svg)"', 'style="fill:url( &quot;https://example.com/x.svg&quot; )"', 'href="&#104;ttps://example.com/x.svg"']) test(`SVG dependency stays unsupported: ${dependency}`, async t => {
  const f = await resourceFixture(t);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><image ${dependency}/></svg>`;
  await writeFile(join(f.root, 'art.svg'), svg); f.source.resources[0].sha256 = digest(svg);
  await assert.rejects(loadCorpusSource(f.root, f.source), code('external-svg-dependency'));
});
