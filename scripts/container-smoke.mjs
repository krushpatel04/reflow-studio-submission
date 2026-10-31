import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const evidence = resolve(root, 'reports/ci/container-smoke');
const runtime = process.env.CONTAINER_RUNTIME || 'docker';
const image = process.env.REFLOW_SMOKE_IMAGE || 'reflow-offline:ci';
const fault = process.env.REFLOW_CONTAINER_SMOKE_FAULT || 'none';
const buildTimeoutMs = Number(process.env.REFLOW_SMOKE_BUILD_TIMEOUT_MS || 300_000);
const runTimeoutMs = Number(process.env.REFLOW_SMOKE_RUN_TIMEOUT_MS || 45_000);
const started = Date.now();
await mkdir(evidence, { recursive: true });

async function command(label, args, timeoutMs) {
  const commandStarted = Date.now();
  const child = spawn(runtime, args, { cwd: root, detached: process.platform !== 'win32' });
  let stdout = '', stderr = '', timedOut = false;
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  const timer = setTimeout(() => {
    timedOut = true;
    if (process.platform !== 'win32' && child.pid) {
      try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
    } else child.kill('SIGKILL');
  }, timeoutMs);
  const result = await new Promise((accept, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => accept({ code, signal }));
  }).finally(() => clearTimeout(timer));
  const record = { ...result, timedOut, durationMs: Date.now() - commandStarted, stdout, stderr };
  await Promise.all([
    writeFile(resolve(evidence, `${label}.stdout`), stdout),
    writeFile(resolve(evidence, `${label}.stderr`), stderr),
    writeFile(resolve(evidence, `${label}.json`), JSON.stringify({
      runtime, args, timeoutMs, code: result.code, signal: result.signal, timedOut,
      durationMs: record.durationMs,
    }, null, 2) + '\n'),
  ]);
  if (timedOut) throw new Error(`${label} exceeded its external ${timeoutMs} ms deadline`);
  return record;
}

const summary = {
  schemaVersion: 'reflow.container-smoke.v0', runtime, image, networkMode: 'none', fault,
  status: 'failed', startedAt: new Date(started).toISOString(),
};

try {
  const build = await command('build', ['build', '--tag', image, '.'], buildTimeoutMs);
  assert.equal(build.code, 0, `container build failed: ${build.stderr}`);

  const mount = `${root}:/workspace:ro`;
  const common = ['run', '--rm', '--network', 'none', '--memory', '768m', '--pids-limit', '64', '-v', mount, image];
  const valid = await command('valid', [...common, '--input', '/workspace/examples/cli-design.json', '--width', '1080', '--height', '1080'], runTimeoutMs);
  assert.equal(valid.code, 0, `valid smoke exited ${valid.code}: ${valid.stderr}`);
  assert.equal(valid.stderr, '', `valid smoke wrote stderr: ${valid.stderr}`);
  const actualPayload = JSON.parse(valid.stdout);
  await writeFile(resolve(evidence, 'valid-output.json'), JSON.stringify(actualPayload, null, 2) + '\n');
  const payload = structuredClone(actualPayload);
  if (fault === 'missing-content') payload.output.elements = payload.output.elements.filter(element => element.id !== 'headline');
  else assert.equal(fault, 'none', `unknown REFLOW_CONTAINER_SMOKE_FAULT: ${fault}`);

  assert.equal(payload.schemaVersion, 'reflow.cli.v0');
  assert.equal(payload.sourceId, 'cli-example');
  assert.deepEqual([payload.target.width, payload.target.height], [1080, 1080]);
  assert.equal(payload.output.schemaVersion, 'reflow.design.v0');
  assert.deepEqual([payload.output.width, payload.output.height], [1080, 1080]);
  const headline = payload.output.elements.find(element => element.id === 'headline');
  assert.ok(headline, 'expected editable output to retain headline element ID');
  assert.equal(headline.type, 'text');
  assert.equal(headline.text, 'A new size, same message');
  assert.equal(payload.output.elements.length, 1, 'expected complete one-element editable inventory');
  assert.equal(payload.diagnostics.errors, 0);
  assert.ok(Array.isArray(payload.diagnostics.findings));
  assert.equal(typeof payload.timing.processWallMs, 'number');

  const malformed = resolve(evidence, 'malformed.json');
  await writeFile(malformed, '{');
  const invalid = await command('invalid', [...common, '--input', '/workspace/reports/ci/container-smoke/malformed.json', '--width', '1080', '--height', '1080'], runTimeoutMs);
  assert.equal(invalid.code, 2, `malformed smoke exited ${invalid.code}: ${invalid.stderr}`);
  assert.equal(invalid.stdout, '', 'malformed smoke must not emit editable output');
  const error = JSON.parse(invalid.stderr).error;
  await writeFile(resolve(evidence, 'invalid-error.json'), JSON.stringify({ error }, null, 2) + '\n');
  assert.equal(error.category, 'input');
  assert.equal(error.code, 'invalid-json');

  Object.assign(summary, {
    status: 'passed', durationMs: Date.now() - started,
    valid: { sourceId: payload.sourceId, target: payload.target, strategy: payload.strategy,
      elementIds: payload.output.elements.map(element => element.id), diagnostics: payload.diagnostics },
    invalid: { exitCode: invalid.code, category: error.category, code: error.code },
  });
  console.log(`Container smoke passed with ${runtime}: editable output retained and invalid JSON rejected.`);
} catch (error) {
  Object.assign(summary, { durationMs: Date.now() - started, failure: error instanceof Error ? error.message : String(error) });
  throw error;
} finally {
  await writeFile(resolve(evidence, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
}
