import test from 'node:test';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const helper = resolve('.github/scripts/ci-evidence.mjs');
const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const run = (cwd: string, args: string[]) => spawnSync(process.execPath, [helper, ...args], { cwd, encoding: 'utf8', maxBuffer: 40 * 1024 * 1024 });
function fixture(t: { after: (fn: () => void) => void }) {
  const dir = mkdtempSync(join(tmpdir(), 'reflow-evidence-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'reports', 'sample', 'nested dir'), { recursive: true });
  writeFileSync(join(dir, 'reports', 'sample', 'result.json'), '{"tests":3,"failed":0}\n');
  writeFileSync(join(dir, 'reports', 'sample', 'nested dir', 'preview.png'), Buffer.from([137,80,78,71,0,255,13,10]));
  return dir;
}

for (const name of ['python', 'container', 'viewer']) test(`workflow quota fallback preserves ${name} evidence after uploader rejection`, t => {
  const cwd = fixture(t);
  const steps = workflow.split(/(?=^      - )/m);
  const fallback = steps.find(s => s.startsWith(`      - name: Recover ${name} evidence in job log\n`));
  // Model an uploader quota rejection. Only an actual configured fallback can retain this report.
  assert.ok(fallback, 'Artifact quota rejection currently leaves no recoverable evidence route');
  assert.match(fallback, /if:.*always\(\).*steps\.retain_evidence\.outcome == 'failure'/);
  const cmd = fallback.match(/run: node \.github\/scripts\/ci-evidence\.mjs emit --name ([a-z-]+) (.+)/);
  assert.ok(cmd, 'The configured fallback must execute the archive, not just print a success message');
  const paths = cmd[2].trim().split(/\s+/);
  // Preserve the real workflow paths, populated with a representative report per root.
  for (const p of paths) {
    mkdirSync(join(cwd, p), { recursive: true });
    writeFileSync(join(cwd, p, 'control.json'), '{"retained":true}\n');
  }
  const emitted = run(cwd, ['emit', '--name', cmd[1], ...paths]);
  assert.equal(emitted.status, 0, emitted.stderr);
  writeFileSync(join(cwd, 'job.log'), emitted.stdout);
  const recovered = run(cwd, ['recover', '--name', cmd[1], '--log', 'job.log', '--out', 'recovered.tgz']);
  assert.equal(recovered.status, 0, recovered.stderr);
  mkdirSync(join(cwd, 'extracted'));
  const tar = spawnSync('tar', ['-xzf', 'recovered.tgz', '-C', 'extracted'], { cwd, encoding: 'utf8' });
  assert.equal(tar.status, 0, tar.stderr);
  for (const p of paths) assert.equal(readFileSync(join(cwd, 'extracted', p, 'control.json'), 'utf8'), '{"retained":true}\n');
});

test('binary and nested evidence round-trips from timestamped logs without changing inputs', t => {
  const cwd = fixture(t);
  const before = readFileSync(join(cwd, 'reports/sample/nested dir/preview.png'));
  const emitted = run(cwd, ['emit', '--name', 'check', 'reports/sample']);
  assert.equal(emitted.status, 0, emitted.stderr);
  const log = emitted.stdout.trimEnd().split('\n').map(line => `job\tstep\t2026-10-27T00:00:00Z ${line}`).join('\n');
  writeFileSync(join(cwd, 'job.log'), log);
  const recovered = run(cwd, ['recover', '--name', 'check', '--log', 'job.log', '--out', 'out.tgz']);
  assert.equal(recovered.status, 0, recovered.stderr);
  mkdirSync(join(cwd, 'unpacked'));
  assert.equal(spawnSync('tar', ['-xzf', 'out.tgz', '-C', 'unpacked'], { cwd }).status, 0);
  assert.deepEqual(readFileSync(join(cwd, 'unpacked/reports/sample/nested dir/preview.png')), before);
  assert.deepEqual(readFileSync(join(cwd, 'reports/sample/nested dir/preview.png')), before);
});

for (const kind of ['missing', 'empty', 'outside', 'traversal', 'symlink', 'parent-symlink']) test(`unsafe or absent evidence fails visibly: ${kind}`, t => {
  const cwd = fixture(t); let path = 'reports/sample';
  if (kind === 'missing') path = 'reports/missing';
  if (kind === 'empty') { path = 'reports/empty'; mkdirSync(join(cwd, path)); }
  if (kind === 'outside') path = '.';
  if (kind === 'traversal') path = 'reports/../reports/sample';
  if (kind === 'symlink') symlinkSync(join(cwd, 'reports/sample/result.json'), join(cwd, 'reports/sample/link'));
  if (kind === 'parent-symlink') { symlinkSync(join(cwd, 'reports/sample'), join(cwd, 'reports/link')); path = 'reports/link/nested dir'; }
  const result = run(cwd, ['emit', '--name', 'check', path]);
  assert.notEqual(result.status, 0); assert.doesNotMatch(result.stdout, /REFLOW_EVIDENCE_BEGIN/);
});

test('archive budget rejects oversize without printing partial payload and accepts exact boundary', t => {
  const cwd = fixture(t);
  const original = run(cwd, ['emit', '--name', 'check', 'reports/sample']); assert.equal(original.status, 0, original.stderr);
  const header = JSON.parse(original.stdout.match(/REFLOW_EVIDENCE_BEGIN (.+)/)![1]);
  const tooSmall = run(cwd, ['emit', '--name', 'check', '--max-bytes', '1', 'reports/sample']);
  assert.notEqual(tooSmall.status, 0); assert.doesNotMatch(tooSmall.stdout, /REFLOW_EVIDENCE_BEGIN/);
  assert.equal(run(cwd, ['emit', '--name', 'check', '--max-bytes', String(header.bytes), 'reports/sample']).status, 0);
});

for (const damage of ['truncate', 'corrupt', 'no-footer', 'duplicate', 'reorder']) test(`recovery rejects ${damage} instead of certifying lost evidence`, t => {
  const cwd = fixture(t); const result = run(cwd, ['emit', '--name', 'check', 'reports/sample']);
  assert.equal(result.status, 0, result.stderr); let lines = result.stdout.trimEnd().split('\n');
  if (damage === 'truncate') lines = lines.filter((l, i) => !(l.startsWith('REFLOW_EVIDENCE_DATA') && i === 1));
  if (damage === 'corrupt') lines = lines.map(l => l.startsWith('REFLOW_EVIDENCE_DATA') ? l.replace(/ ([A-Za-z0-9+/])([A-Za-z0-9+/=]*)$/, (_all, first, rest) => ' ' + (first === 'A' ? 'B' : 'A') + rest) : l);
  if (damage === 'no-footer') lines = lines.filter(l => !l.startsWith('REFLOW_EVIDENCE_END'));
  if (damage === 'duplicate') lines.push(...lines);
  if (damage === 'reorder') lines = lines.map(l => l.replace('REFLOW_EVIDENCE_DATA check 0 ', 'REFLOW_EVIDENCE_DATA check 2 '));
  writeFileSync(join(cwd, 'broken.log'), lines.join('\n'));
  const r = run(cwd, ['recover', '--name', 'check', '--log', 'broken.log', '--out', 'out.tgz']);
  assert.notEqual(r.status, 0); assert.equal(existsSync(join(cwd, 'out.tgz')), false);
});

test('recovery never overwrites an existing archive', t => {
  const cwd = fixture(t); const r = run(cwd, ['emit', '--name', 'check', 'reports/sample']); assert.equal(r.status, 0, r.stderr);
  writeFileSync(join(cwd, 'job.log'), r.stdout); writeFileSync(join(cwd, 'out.tgz'), 'retain me');
  assert.notEqual(run(cwd, ['recover', '--name', 'check', '--log', 'job.log', '--out', 'out.tgz']).status, 0);
  assert.equal(readFileSync(join(cwd, 'out.tgz'), 'utf8'), 'retain me');
});

test('evidence recovery does not mask a failing product command; valid control stays successful', t => {
  const cwd = fixture(t);
  for (const code of [0, 19]) {
    const shell = spawnSync('bash', ['-c', 'set +e; (exit "$1"); product=$?; "$2" "$3" emit --name check reports/sample; retention=$?; if [ "$product" -ne 0 ]; then exit "$product"; fi; exit "$retention"', 'test', String(code), process.execPath, helper], { cwd, encoding: 'utf8' });
    assert.equal(shell.status, code, shell.stderr); assert.match(shell.stdout, /REFLOW_EVIDENCE_END check/);
  }
  for (const s of workflow.split(/(?=^      - )/m)) {
    if (s.includes('continue-on-error: true')) assert.match(s, /uses: actions\/upload-artifact@/, 'Only the uploader may continue on error');
  }
});

 test('partial setup retains existing report roots and explicitly records absent ones', t => {
  const cwd = fixture(t);
  const emitted = run(cwd, ['emit', '--name', 'partial', 'reports/sample', 'reports/not-created']);
  assert.equal(emitted.status, 0, emitted.stderr);
  const header = JSON.parse(emitted.stdout.match(/REFLOW_EVIDENCE_BEGIN (.+)/)![1]);
  assert.deepEqual(header.absent, ['reports/not-created']);
  assert.deepEqual(header.roots, ['reports/sample']);
});

test('failure traces larger than 16 MiB remain recoverable without omission', t => {
  const cwd = fixture(t);
  const trace = randomBytes(17 * 1024 * 1024);
  writeFileSync(join(cwd, 'reports/sample/failing-browser-trace.bin'), trace);
  const emitted = run(cwd, ['emit', '--name', 'failed-browser', 'reports/sample']);
  assert.equal(emitted.status, 0, 'A realistic failure archive above 16MiB must be retained: ' + emitted.stderr);
  writeFileSync(join(cwd, 'job.log'), emitted.stdout);
  const recovered = run(cwd, ['recover', '--name', 'failed-browser', '--log', 'job.log', '--out', 'trace.tgz']);
  assert.equal(recovered.status, 0, recovered.stderr);
  mkdirSync(join(cwd, 'trace-output'));
  assert.equal(spawnSync('tar', ['-xzf', 'trace.tgz', '-C', 'trace-output'], { cwd }).status, 0);
  assert.deepEqual(readFileSync(join(cwd, 'trace-output/reports/sample/failing-browser-trace.bin')), trace);
});
