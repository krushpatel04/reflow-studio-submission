import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';

// The bundled-font reads in scripts/native.ts must resolve from the module location, not process.cwd().
const NATIVE = resolve('scripts/native.ts'), CLI = resolve('scripts/official-cli.ts'), TSX = ['--import', pathToFileURL(createRequire(import.meta.url).resolve('tsx')).href]; // absolute: the child's cwd is outside the repo

test('importing the native measurer from a cwd outside the repo works and measures', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'native-cwd-'));
  try {
    const code = `import { measure, fontFiles } from ${JSON.stringify(NATIVE)};
      const e = { id: 't', type: 'text', role: 'content', x: 0, y: 0, width: 100, height: 20, text: 'x', fontFamily: 'Inter', fontSize: 16, fontWeight: 400, color: '#000000', lineHeight: 1.2, align: 'left' };
      const m = measure('Hello', e); console.log(JSON.stringify({ w: m.width > 0, n: fontFiles.length, p: fontFiles[0].path }));`;
    const file = join(cwd, 'probe.mts');
    writeFileSync(file, code);
    const r = spawnSync(process.execPath, [...TSX, file], { cwd, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.w, true);
    assert.equal(out.p, 'node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2', 'exported path strings stay repo-relative');
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('official-cli runs from a cwd outside the repo root', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'native-cwd-'));
  try {
    const text = { id: 't', type: 'text', x: 10, y: 10, width: 180, height: 40, rotation: 0, opacity: 1, z_index: 1, group_id: null, content: 'Hello', font_family: 'Inter', font_size: 14,
      font_weight: 'regular', font_style: 'normal', color: 'rgba(0,0,0,1)', text_align: 'left', line_height: 1.2, letter_spacing: 0, max_lines: null, style_runs: [] };
    const input = join(cwd, 'req.json'), out = join(cwd, 'out.json');
    writeFileSync(input, JSON.stringify({ source: { canvas: { width: 200, height: 100 }, elements: [text] }, target_canvas: { width: 300, height: 150 } }));
    const r = spawnSync(process.execPath, [...TSX, CLI, '--input', input, '--output', out], { cwd, encoding: 'utf8', timeout: 60000 });
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(r.stdout).unsupported, []);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
