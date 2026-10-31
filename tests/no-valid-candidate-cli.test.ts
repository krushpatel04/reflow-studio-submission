import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const design = (width: number) => ({ schemaVersion: 'reflow.design.v0', id: 'overflow', name: 'overflow', description: '', provenance: 'test',
  width: 1, height: 1, background: '#ffffff', groups: [], elements: [
    { id: 'copy', type: 'text', role: 'content', x: 0, y: 0, width: 1, height: 1, text: 'a', fontFamily: 'Inter', fontSize: 0.5, fontWeight: 400, color: '#000000', lineHeight: 1.2 },
    { id: 'wash', type: 'rect', role: 'decoration', x: 0, y: 0, width, height: 1, color: '#ff0000' }] });
function cli(input: unknown) {
  const dir = mkdtempSync(join(tmpdir(), 'reflow-nvc-')), path = join(dir, 'd.json');
  writeFileSync(path, JSON.stringify(input));
  try {
    return spawnSync(process.execPath, ['--import', 'tsx', 'scripts/reflow-cli.ts', '--input', path, '--width', '8000', '--height', '8000'],
      { cwd: process.cwd(), encoding: 'utf8', timeout: 30000 });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
test('CLI reports numeric overflow as structured no-valid-candidate failure, never as success JSON', () => {
  const r = cli(design(1e308));
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout, '');
  const { error } = JSON.parse(r.stderr);
  assert.equal(error.code, 'no-valid-candidate');
  assert.equal(error.category, 'engine');
  assert.ok(error.findings.length > 0 && error.findings.length <= 20);
  assert.ok(error.total >= error.findings.length, 'total counts every structural finding, not just the reported ones');
});
test('CLI control: finite geometry of the same shape still succeeds with finite output', () => {
  const r = cli(design(1));
  assert.equal(r.status, 0, r.stderr);
  assert.ok(JSON.parse(r.stdout).output.elements.every((e: { width: number }) => Number.isFinite(e.width)));
});
