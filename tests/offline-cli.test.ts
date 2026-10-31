import { strict as assert } from 'node:assert';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { Design } from '../src/model';

const valid: Design = {
  schemaVersion: 'reflow.design.v0', id: 'cli-sample', name: 'CLI sample', description: '', provenance: 'test',
  width: 100, height: 100, background: '#ffffff', groups: [],
  elements: [{ id: 'headline', type: 'text', role: 'content', text: 'Keep this copy', fontFamily: 'Inter',
    fontWeight: 500, fontSize: 12, lineHeight: 1.1, color: '#000000', x: 5, y: 5, width: 90, height: 30 }],
};

function run(input: unknown, args: string[] = []) {
  const dir = mkdtempSync(join(tmpdir(), 'reflow-cli-'));
  const path = join(dir, 'design.json');
  writeFileSync(path, typeof input === 'string' ? input : JSON.stringify(input));
  try {
    return spawnSync(process.execPath, ['--import', 'tsx', 'scripts/reflow-cli.ts', '--input', path,
      ...(!args.includes('--width') ? ['--width', '200'] : []),
      ...(!args.includes('--height') ? ['--height', '100'] : []), ...args],
    { cwd: process.cwd(), encoding: 'utf8', timeout: 15000 });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function runPath(path: string, args: string[] = []) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'scripts/reflow-cli.ts', '--input', path,
    '--width', '200', '--height', '100', ...args], { cwd: process.cwd(), encoding: 'utf8', timeout: 15000 });
}

async function runPathWithIndependentTimeout(path: string) {
  const child = spawn(process.execPath, ['--import', 'tsx', 'scripts/reflow-cli.ts', '--input', path,
    '--width', '200', '--height', '100', '--deadline-ms', '120000'],
  { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
  let timer: NodeJS.Timeout | undefined;
  try {
    const status = await Promise.race([
      new Promise<number | null>((resolve, reject) => {
        child.once('error', reject);
        child.once('close', resolve);
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error('CLI did not reject the FIFO before the independent 2000ms test timeout.'));
        }, 2000);
      }),
    ]);
    return { status, stdout, stderr };
  } finally {
    if (timer) clearTimeout(timer);
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
}

test('CLI emits deterministic editable output with diagnostics and retained content', () => {
  const first = run(valid);
  assert.equal(first.status, 0, first.stderr);
  const second = run(valid);
  assert.equal(second.status, 0, second.stderr);
  const a = JSON.parse(first.stdout), b = JSON.parse(second.stdout);
  assert.equal(a.schemaVersion, 'reflow.cli.v0');
  assert.deepEqual(a.output.elements.map((e: { id: string; text?: string }) => [e.id, e.text]), [['headline', 'Keep this copy']]);
  assert.equal(a.output.width, 200);
  assert.equal(a.output.height, 100);
  assert.equal(typeof a.diagnostics.errors, 'number');
  assert.equal(typeof a.timing.elapsedMs, 'number');
  assert.ok(a.timing.processWallMs >= a.timing.layoutMs);
  assert.ok(a.timing.peakRssKiB > 0);
  delete a.timing; delete b.timing;
  assert.deepEqual(a, b);
});

test('CLI rejects malformed JSON, bad dimensions and unsupported resources with structured errors', () => {
  for (const [input, args, code] of [
    ['{', [], 'invalid-json'],
    [valid, ['--width', '0'], 'invalid-argument'],
    [{ ...valid, elements: [{ ...valid.elements[0], fontFamily: 'Missing Font' }] }, [], 'unsupported-font'],
    [{ ...valid, elements: [{ id: 'photo', type: 'image', role: 'content', assetId: 'missing', fit: 'cover',
      focalPoint: { x: .5, y: .5 }, x: 0, y: 0, width: 100, height: 100 }] }, [], 'missing-asset'],
  ] as const) {
    const result = run(input, [...args]);
    assert.equal(result.status, 2, `${code}: ${result.stderr}`);
    assert.equal(result.stdout, '');
    assert.equal(JSON.parse(result.stderr).error.code, code);
  }
});

test('CLI enforces external deadline and reports explicit failure', () => {
  const result = run(valid, ['--deadline-ms', '1']);
  assert.equal(result.status, 124, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(JSON.parse(result.stderr).error.code, 'deadline-exceeded');
});

test('CLI stops dense synchronous layout at the process deadline', () => {
  const dense = { ...valid, elements: Array.from({ length: 100 }, (_, i) => ({
    ...valid.elements[0], id: `text-${i}`, text: 'Approved customer information and pricing '.repeat(25),
    x: 0, y: i * 10, width: 1000, height: 8, fontSize: 5,
  })) };
  const result = run(dense, ['--width', '200', '--height', '2000', '--deadline-ms', '500']);
  assert.equal(result.status, 124, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(JSON.parse(result.stderr).error.code, 'deadline-exceeded');
});

test('CLI accepts bundled image resources and reports findings at an extreme valid target', () => {
  const image = { ...valid, elements: [{ id: 'photo', type: 'image', role: 'content', assetId: 'orbit', fit: 'cover',
    focalPoint: { x: .5, y: .5 }, x: 0, y: 0, width: 100, height: 100 }] };
  const result = run(image, ['--width', '8000', '--height', '1']);
  assert.equal(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.output.elements[0].assetId, 'orbit');
  assert.equal(payload.output.width, 8000);
  assert.equal(payload.output.height, 1);
  assert.ok(Array.isArray(payload.diagnostics.findings));
});

test('CLI rejects an oversized input before starting layout', () => {
  const result = run(' '.repeat(2 * 1024 * 1024 + 1));
  assert.equal(result.status, 2, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(JSON.parse(result.stderr).error.code, 'invalid-argument');
});

test('CLI rejects a FIFO without a writer before a blocking read', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'reflow-cli-fifo-'));
  const path = join(dir, 'design.pipe');
  execFileSync('mkfifo', [path]);
  try {
    const result = await runPathWithIndependentTimeout(path);
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stdout, '');
    const error = JSON.parse(result.stderr).error;
    assert.equal(error.category, 'input');
    assert.equal(error.code, 'unsupported-input-type');
    assert.match(error.message, /regular file/i);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('CLI accepts a regular file through a symlink and rejects a directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'reflow-cli-types-'));
  const file = join(dir, 'design.json'), link = join(dir, 'linked-design.json');
  writeFileSync(file, JSON.stringify(valid));
  symlinkSync(file, link);
  try {
    for (const path of [file, link]) {
      const result = runPath(path);
      assert.equal(result.status, 0, `${path}: ${result.stderr}`);
      assert.equal(JSON.parse(result.stdout).output.elements[0].text, 'Keep this copy');
    }
    const directory = runPath(dir);
    assert.equal(directory.status, 2, directory.stderr);
    assert.equal(directory.stdout, '');
    assert.equal(JSON.parse(directory.stderr).error.code, 'unsupported-input-type');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
