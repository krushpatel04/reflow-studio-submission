import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, symlink, copyFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('browser command generates current native parity data in a clean checkout and replaces stale data', async () => {
  // Isolate generated state from the developer's reports and other test workers.
  const root = resolve('.');
  await mkdir('reports', { recursive: true });
  const cwd = await mkdtemp(resolve('reports/browser-prerequisite-'));
  try {
    await copyFile('package.json', join(cwd, 'package.json'));
    for (const path of ['node_modules', 'scripts', 'src', 'tests', 'playwright.config.ts']) {
      await symlink(join(root, path), join(cwd, path));
    }
    const run = () => execFileSync('npm', ['run', 'verify:browser', '--', '--list'], {
      cwd, encoding: 'utf8', timeout: 60000, env: { ...process.env, npm_config_ignore_scripts: 'false' },
    });
    run(); // Lists the real suite without launching Chromium; lifecycle prerequisites still run.
    const reference = join(cwd, 'reports/font-parity/native-metrics.json');
    const first = await readFile(reference, 'utf8').catch(() => '');
    assert.ok(first, 'browser command must generate its native reference from empty reports');
    const report = JSON.parse(first);
    assert.equal(report.schemaVersion, 'reflow.font-parity.v1');
    assert.equal(report.probes.length, 150);
    assert.ok(report.probes.some((p: { id: string }) => p.id === 'product-pairs/square/label-0'));
    await writeFile(reference, '{"stale":true}');
    run();
    assert.equal(await readFile(reference, 'utf8'), first, 'each invocation must replace stale measurements');
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
