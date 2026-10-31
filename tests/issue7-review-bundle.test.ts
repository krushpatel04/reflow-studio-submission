import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createCanvas } from '@napi-rs/canvas';
import {
  generateReviewBundle,
  type OutputArtifactInput,
  type ReviewBundleInput,
  type SourceArtifactInput,
} from '../scripts/issue7-review-bundle';

function artifact(id: string): SourceArtifactInput;
function artifact(id: string, method: string): OutputArtifactInput;
function artifact(id: string, method?: string): SourceArtifactInput | OutputArtifactInput {
  return {
    id,
    artifactHash: createHash('sha256').update(id).digest('hex'),
    inputPath: `/synthetic/${id}.png`,
    ...(method ? { method } : {}),
  };
}

function fixture(overrides: Partial<ReviewBundleInput> = {}): ReviewBundleInput {
  return {
    seed: 20260924,
    reviewerIds: ['jd', 'junho', 'krush'],
    reviewsPerCase: 2,
    hiddenReversedControlsPerReviewer: 1,
    cases: [
      {
        id: 'case-one', source: artifact('source-one'), status: 'eligible',
        outputs: [artifact('uniform-one', 'uniform'), artifact('reflow-one', 'current-reflow')],
      },
      {
        id: 'case-two', source: artifact('source-two'), status: 'eligible',
        outputs: [artifact('uniform-two', 'uniform'), artifact('reflow-two', 'current-reflow')],
      },
      {
        id: 'case-three', source: artifact('source-three'), status: 'eligible',
        outputs: [artifact('uniform-three', 'uniform'), artifact('reflow-three', 'current-reflow')],
      },
    ],
    ...overrides,
  };
}

test('creates deterministic blank reviewer records without method or input-path leakage', () => {
  const first = generateReviewBundle(fixture());
  const second = generateReviewBundle(fixture({ cases: [...fixture().cases].reverse() }));
  const changed = generateReviewBundle(fixture({
    cases: fixture().cases.map((item, index) => index === 0
      ? { ...item, source: { ...item.source, artifactHash: createHash('sha256').update('changed-source').digest('hex') } }
      : item),
  }));

  assert.deepEqual(first, second, 'input order must not alter a seeded bundle');
  assert.notEqual(first.reviewerBundle.bundleId, changed.reviewerBundle.bundleId, 'artifact changes require a new bundle identity');
  assert.deepEqual(first.reviewerBundle.rubric.acceptabilityChoices, ['yes', 'no', 'unsure']);
  assert.deepEqual(first.reviewerBundle.rubric.preferenceChoices, ['A', 'B', 'tie', 'neither', 'unsure']);
  assert.ok(first.reviewerBundle.assignments.every(assignment =>
    assignment.vote.acceptA === null
    && assignment.vote.acceptB === null
    && assignment.vote.preference === null));

  const reviewerJson = JSON.stringify(first.reviewerBundle);
  for (const forbidden of ['uniform', 'current-reflow', '/synthetic/', 'case-one', 'case-two', 'case-three']) {
    assert.equal(reviewerJson.includes(forbidden), false, `reviewer bundle leaked ${forbidden}`);
  }
  assert.match(JSON.stringify(first.privateDecode), /current-reflow/);
});

test('assigns every eligible case to distinct reviewers with balanced primary workloads', () => {
  const result = generateReviewBundle(fixture({
    hiddenReversedControlsPerReviewer: 0,
    cases: Array.from({ length: 8 }, (_, index) => ({
      id: `case-${index}`,
      source: artifact(`source-${index}`),
      outputs: [artifact(`uniform-${index}`, 'uniform'), artifact(`reflow-${index}`, 'current-reflow')],
      status: 'eligible' as const,
    })),
  }));

  const primary = result.reviewerBundle.assignments.filter(item =>
    !result.privateDecode.presentations[item.presentationId].controlOfPresentationId);
  const byCase = new Map<string, Set<string>>();
  for (const assignment of primary) {
    const caseId = result.privateDecode.presentations[assignment.presentationId].caseId;
    const reviewers = byCase.get(caseId) ?? new Set<string>();
    reviewers.add(assignment.reviewerId);
    byCase.set(caseId, reviewers);
  }
  assert.equal(byCase.size, 8);
  assert.ok([...byCase.values()].every(reviewers => reviewers.size === 2));

  const counts = new Map(result.reviewerBundle.reviewerIds.map(id => [id, 0]));
  for (const assignment of primary) counts.set(assignment.reviewerId, counts.get(assignment.reviewerId)! + 1);
  assert.ok(Math.max(...counts.values()) - Math.min(...counts.values()) <= 1);
});

test('adds one hidden reversed control per reviewer and decodes A/B to the opposite outputs', () => {
  const result = generateReviewBundle(fixture());
  const decode = result.privateDecode.presentations;
  const controls = result.reviewerBundle.assignments.filter(item => decode[item.presentationId].controlOfPresentationId);

  assert.equal(controls.length, 3);
  assert.deepEqual(new Set(controls.map(item => item.reviewerId)), new Set(['jd', 'junho', 'krush']));
  for (const control of controls) {
    assert.equal('isControl' in control, false, 'control marker must stay private');
    const controlDecode = decode[control.presentationId];
    const original = decode[controlDecode.controlOfPresentationId!];
    assert.equal(controlDecode.positionA.outputId, original.positionB.outputId);
    assert.equal(controlDecode.positionB.outputId, original.positionA.outputId);
  }
});

test('keeps excluded and failed cases out of review while retaining their exact reasons in accounting', () => {
  const result = generateReviewBundle(fixture({
    hiddenReversedControlsPerReviewer: 0,
    cases: [
      fixture().cases[0],
      {
        id: 'excluded-case', source: artifact('excluded-source'), status: 'excluded',
        outputs: [artifact('excluded-a', 'uniform'), artifact('excluded-b', 'current-reflow')],
        reason: 'source fidelity not qualified',
      },
      {
        id: 'failed-case', source: artifact('failed-source'), outputs: [], status: 'failed',
        reason: 'renderer timed out',
      },
    ],
  }));

  assert.deepEqual(result.accounting.summary, { requested: 3, eligible: 1, excluded: 1, failed: 1 });
  assert.deepEqual(result.accounting.ledger.map(row => [row.caseId, row.status, row.reason]), [
    ['excluded-case', 'excluded', 'source fidelity not qualified'],
    ['failed-case', 'failed', 'renderer timed out'],
  ]);
  assert.equal(JSON.stringify(result.reviewerBundle).includes('excluded-case'), false);
  assert.equal(JSON.stringify(result.reviewerBundle).includes('failed-case'), false);
});

test('rejects malformed, duplicate, and impossible inputs while accepting valid sparse failures', () => {
  assert.throws(() => generateReviewBundle(fixture({ reviewerIds: ['jd', 'jd'] })), /duplicate reviewer/i);
  assert.throws(() => generateReviewBundle(fixture({ reviewsPerCase: 4 })), /reviewsPerCase/i);
  assert.throws(() => generateReviewBundle(fixture({
    cases: [{
      id: 'bad', source: artifact('source'), status: 'eligible',
      outputs: [artifact('same', 'uniform'), artifact('same', 'current-reflow')],
    }],
  })), /duplicate artifact id/i);
  assert.throws(() => generateReviewBundle(fixture({
    cases: [{ id: 'excluded', source: artifact('source'), outputs: [], status: 'excluded' }],
  })), /reason/i);
  assert.throws(() => generateReviewBundle(fixture({
    cases: [{
      id: 'bad-hash', source: { ...artifact('source'), artifactHash: 'not-a-hash' },
      outputs: [artifact('a', 'uniform'), artifact('b', 'current-reflow')], status: 'eligible',
    }],
  })), /artifactHash/i);

  const sparse = generateReviewBundle(fixture({
    hiddenReversedControlsPerReviewer: 0,
    cases: [{ id: 'failed', source: artifact('source'), outputs: [], status: 'failed', reason: 'no output' }],
  }));
  assert.equal(sparse.reviewerBundle.assignments.length, 0);
  assert.equal(sparse.accounting.ledger.length, 1);
});

test('CLI writes physically separate reviewer, private-decode, and accounting manifests', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reflow-review-bundle-'));
  try {
    const inputPath = join(directory, 'input.json');
    const outputPath = join(directory, 'bundle');
    await writeFile(inputPath, JSON.stringify(fixture()), 'utf8');
    const run = spawnSync(process.execPath, [
      '--import', 'tsx', 'scripts/issue7-review-bundle.ts',
      '--input', inputPath, '--output-dir', outputPath,
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.deepEqual((await readdir(outputPath)).sort(), ['accounting.json', 'private', 'reviewer']);
    assert.deepEqual(await readdir(join(outputPath, 'reviewer')), ['manifest.json']);
    assert.deepEqual(await readdir(join(outputPath, 'private')), ['decode.json']);

    const reviewerText = await readFile(join(outputPath, 'reviewer', 'manifest.json'), 'utf8');
    const decodeText = await readFile(join(outputPath, 'private', 'decode.json'), 'utf8');
    assert.equal(reviewerText.includes('current-reflow'), false);
    assert.match(decodeText, /current-reflow/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+afoQAAAAASUVORK5CYII=', 'base64');

async function diskFixture(directory: string): Promise<ReviewBundleInput> {
  await writeFile(join(directory, 'neutral.png'), png);
  const source = { id: 'source', inputPath: 'neutral.png', artifactHash: createHash('sha256').update(png).digest('hex') };
  const outputs: OutputArtifactInput[] = [];
  for (const [id, color, method] of [['a', 'red', 'uniform'], ['b', 'blue', 'current-reflow']]) {
    const canvas = createCanvas(1, 1);
    const context = canvas.getContext('2d');
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const bytes = canvas.toBuffer('image/png');
    await writeFile(join(directory, `${id}.png`), bytes);
    outputs.push({ id, method, inputPath: `${id}.png`, artifactHash: createHash('sha256').update(bytes).digest('hex') });
  }
  return fixture({ cases: [
    { id: 'eligible', source, status: 'eligible', outputs },
    { id: 'sealed', source: { ...source, inputPath: 'sealed-must-not-be-opened.png' }, status: 'excluded', reason: 'sealed test family', outputs: [] },
    { id: 'failed', source: { ...source, inputPath: 'failed-missing.png' }, status: 'failed', reason: 'render failed', outputs: [] },
  ] });
}

function runBundle(inputPath: string, outputPath: string, extra: string[] = []) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'scripts/issue7-review-bundle.ts',
    '--input', inputPath, '--output-dir', outputPath, ...extra], { cwd: process.cwd(), encoding: 'utf8' });
}

test('materialize copies pinned eligible PNGs including controls and never reads excluded/failed paths', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reflow-review-export-'));
  try {
    const input = await diskFixture(directory);
    const inputPath = join(directory, 'input.json');
    const outputPath = join(directory, 'bundle');
    await writeFile(inputPath, JSON.stringify(input));
    const run = runBundle(inputPath, outputPath, ['--materialize']);
    assert.equal(run.status, 0, run.stderr);
    const manifest = JSON.parse(await readFile(join(outputPath, 'reviewer/manifest.json'), 'utf8'));
    const decode = JSON.parse(await readFile(join(outputPath, 'private/decode.json'), 'utf8')).presentations;
    const files = new Set<string>();
    for (const assignment of manifest.assignments) {
      assert.deepEqual(assignment.vote, { acceptA: null, acceptB: null, preference: null });
      for (const position of ['source', 'A', 'B']) {
        const artifact = assignment[position];
        assert.match(artifact.filename, /\.png$/);
        const bytes = await readFile(join(outputPath, 'reviewer', artifact.filename));
        const originalPath = position === 'source' ? decode[assignment.presentationId].sourceInputPath
          : decode[assignment.presentationId][`position${position}`].inputPath;
        assert.deepEqual(bytes, await readFile(join(directory, originalPath)));
        assert.equal(createHash('sha256').update(bytes).digest('hex'), artifact.artifactHash);
        files.add(artifact.filename);
      }
    }
    assert.ok(files.size > 3, 'reversed controls must have materialized artifacts');
    assert.equal((await readdir(join(outputPath, 'reviewer'))).length, files.size + 1);
    assert.deepEqual(JSON.parse(await readFile(join(outputPath, 'accounting.json'), 'utf8')).summary,
      { requested: 3, eligible: 1, excluded: 1, failed: 1 });
    const repeat = runBundle(inputPath, outputPath, ['--materialize']);
    assert.notEqual(repeat.status, 0, 'must refuse an existing directory');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

for (const defect of ['hash', 'missing', 'non-png', 'oversized'] as const) {
  test(`materialize rejects ${defect} before publishing any directory`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'reflow-review-invalid-'));
    try {
      const input = await diskFixture(directory);
      if (defect === 'hash') input.cases[0].source.artifactHash = '0'.repeat(64);
      if (defect === 'missing') input.cases[0].source.inputPath = 'missing.png';
      if (defect === 'non-png' || defect === 'oversized') {
        const bytes = defect === 'non-png' ? Buffer.from('not an image') : Buffer.alloc(16 * 1024 * 1024 + 1);
        await writeFile(join(directory, 'bad.png'), bytes);
        input.cases[0].source = { ...input.cases[0].source, inputPath: 'bad.png', artifactHash: createHash('sha256').update(bytes).digest('hex') };
      }
      const inputPath = join(directory, 'input.json');
      const outputPath = join(directory, 'bundle');
      await writeFile(inputPath, JSON.stringify(input));
      const run = runBundle(inputPath, outputPath, ['--materialize']);
      assert.notEqual(run.status, 0, 'invalid input must fail');
      assert.match(run.stderr, defect === 'hash' ? /hash mismatch/i : defect === 'missing' ? /ENOENT/ : defect === 'non-png' ? /PNG/ : /16 MiB/);
      assert.equal((await readdir(directory)).includes('bundle'), false);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}

test('CLI rejects unknown and duplicate options instead of silently ignoring intended mode', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reflow-review-args-'));
  try {
    const inputPath = join(directory, 'input.json');
    await writeFile(inputPath, JSON.stringify(fixture()));
    for (const extra of [['--materialise'], ['--input', inputPath], ['--materialize', '--materialize']]) {
      const run = runBundle(inputPath, join(directory, 'bundle'), extra);
      assert.notEqual(run.status, 0);
      assert.match(run.stderr, /unknown|duplicate/i);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

for (const chunkType of ['tEXt', 'zTXt', 'iTXt', 'eXIf']) {
  test(`materialize rejects identity-bearing ${chunkType} PNG metadata`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'reflow-review-metadata-'));
    try {
      const input = await diskFixture(directory);
      const data = Buffer.from('method\0current-reflow');
      const chunk = Buffer.alloc(data.length + 12);
      chunk.writeUInt32BE(data.length);
      chunk.write(chunkType, 4, 'ascii');
      data.copy(chunk, 8);
      // Valid PNG CRC for the type and payload, independent of the exporter.
      let crc = 0xffffffff;
      for (const byte of chunk.subarray(4, -4)) {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
      chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, chunk.length - 4);
      const bytes = Buffer.concat([png.subarray(0, -12), chunk, png.subarray(-12)]);
      await writeFile(join(directory, 'tagged.png'), bytes);
      input.cases[0].source = { ...input.cases[0].source, inputPath: 'tagged.png', artifactHash: createHash('sha256').update(bytes).digest('hex') };
      const inputPath = join(directory, 'input.json');
      await writeFile(inputPath, JSON.stringify(input));
      const run = runBundle(inputPath, join(directory, 'bundle'), ['--materialize']);
      assert.notEqual(run.status, 0, 'method-bearing metadata must not reach reviewers');
      assert.match(run.stderr, /PNG chunk.*not allowed/);
      assert.equal((await readdir(directory)).includes('bundle'), false);
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
}

test('materialize rejects directories and FIFOs without blocking', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reflow-review-special-'));
  try {
    const input = await diskFixture(directory);
    const fifo = join(directory, 'pipe.png');
    const made = spawnSync('mkfifo', [fifo], { encoding: 'utf8' });
    assert.equal(made.status, 0, made.stderr);
    for (const inputPath of [directory, fifo]) {
      input.cases[0].source.inputPath = inputPath;
      const manifestPath = join(directory, 'input.json');
      await writeFile(manifestPath, JSON.stringify(input));
      const run = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/issue7-review-bundle.ts',
        '--input', manifestPath, '--output-dir', join(directory, 'bundle'), '--materialize'],
      { cwd: process.cwd(), encoding: 'utf8', timeout: 5000 });
      assert.equal(run.error, undefined, 'special-file rejection must not time out');
      assert.notEqual(run.status, 0);
      assert.match(run.stderr, /regular file/);
      assert.equal((await readdir(directory)).includes('bundle'), false);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('failed manifest write removes the newly created partial export', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'reflow-review-write-failure-'));
  try {
    const inputPath = join(directory, 'input.json');
    await writeFile(inputPath, JSON.stringify(await diskFixture(directory)));
    const preload = join(directory, 'fail-write.mjs');
    await writeFile(preload, `
      import fs from 'node:fs/promises';
      import { syncBuiltinESMExports } from 'node:module';
      const write = fs.writeFile;
      fs.writeFile = async (path, ...args) => {
        if (String(path).endsWith('/reviewer/manifest.json')) throw new Error('injected disk failure');
        return write(path, ...args);
      };
      syncBuiltinESMExports();
    `);
    const run = spawnSync(process.execPath, ['--import', preload, '--import', 'tsx', 'scripts/issue7-review-bundle.ts',
      '--input', inputPath, '--output-dir', join(directory, 'bundle'), '--materialize'], { encoding: 'utf8', cwd: process.cwd() });
    assert.notEqual(run.status, 0);
    assert.match(run.stderr, /injected disk failure/);
    assert.equal((await readdir(directory)).includes('bundle'), false, 'partial artifact files must be removed');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
