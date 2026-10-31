import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const text = (id: string, content: string, extra: object = {}) => ({ id, type: 'text', x: 10, y: 10, width: 180, height: 40, rotation: 0, opacity: 1, z_index: 1,
  group_id: null, content, font_family: 'Inter', font_size: 14, font_weight: 'regular', font_style: 'normal', color: 'rgba(0,0,0,1)', text_align: 'left',
  line_height: 1.2, letter_spacing: 0, max_lines: null, style_runs: [], ...extra });
const image = (id: string, asset: string) => ({ id, type: 'image', x: 0, y: 0, width: 200, height: 100, z_index: 0, asset_id: asset, fit: 'cover' });
const request = (elements: object[], target = { width: 300, height: 150 }) => ({ source: { canvas: { width: 200, height: 100 }, elements }, target_canvas: target });

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'official-cli-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'assets', 'photo.png'), PNG);
  const put = (name: string, value: unknown) => { const p = join(dir, name); writeFileSync(p, typeof value === 'string' ? value : JSON.stringify(value)); return p; };
  return { dir, put, assets: join(dir, 'assets'), out: join(dir, 'out.json'), clean: () => rmSync(dir, { recursive: true, force: true }) };
}
const cli = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', resolve('scripts/official-cli.ts'), ...args], { encoding: 'utf8', timeout: 60000 });
const failure = (r: ReturnType<typeof cli>) => (JSON.parse(r.stderr) as { error: { category: string; code: string; path: string; message: string } }).error;
const base = () => request([image('bg', 'photo.png'), text('title', 'Keep this copy')]);

test('success: official-shaped output, ids/order/canvas kept, source bytes unchanged', () => {
  const s = setup();
  try {
    const input = s.put('req.json', base()), before = readFileSync(input);
    const r = cli('--input', input, '--output', s.out, '--assets', s.assets);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(readFileSync(s.out, 'utf8'));
    assert.deepEqual(out.canvas, { width: 300, height: 150 });
    assert.deepEqual(out.elements.map((e: { id: string }) => e.id), ['bg', 'title']);
    assert.equal(out.elements[1].content, 'Keep this copy');
    assert.deepEqual(readFileSync(input), before);
    assert.deepEqual(readdirSync(s.dir).sort(), ['assets', 'out.json', 'req.json']);
  } finally { s.clean(); }
});

test('same-size Unicode round trip keeps ids and text', () => {
  const s = setup();
  try {
    const req = request([text('héadline-日本', 'Café Zoë 日本語 👩🏽‍💻')], { width: 200, height: 100 });
    const r = cli('--input', s.put('req.json', req), '--output', s.out);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(JSON.parse(readFileSync(s.out, 'utf8')), req.source);
  } finally { s.clean(); }
});

test('--roles is honored and --report writes a sidecar without changing the output', () => {
  const s = setup();
  try {
    const input = s.put('req.json', base());
    const plain = cli('--input', input, '--output', s.out, '--assets', s.assets);
    assert.equal(plain.status, 0, plain.stderr);
    const plainOut = readFileSync(s.out, 'utf8');
    assert.ok(!existsSync(s.out + '.report.json'));
    const withReport = cli('--input', input, '--output', s.out, '--assets', s.assets, '--report');
    assert.equal(withReport.status, 0, withReport.stderr);
    assert.equal(readFileSync(s.out, 'utf8'), plainOut);
    const report = JSON.parse(readFileSync(s.out + '.report.json', 'utf8'));
    assert.equal(typeof report.strategy, 'string');
    assert.ok(Array.isArray(report.findings));
    const roles = s.put('roles.json', { bg: 'background' });
    const withRoles = cli('--input', input, '--output', s.out, '--assets', s.assets, '--roles', roles, '--report');
    assert.equal(withRoles.status, 0, withRoles.stderr);
    const bad = cli('--input', input, '--output', s.out, '--assets', s.assets, '--roles', s.put('r2.json', { nope: 'background' }));
    assert.equal(bad.status, 2);
    assert.equal(failure(bad).path, '$.options.roles.nope');
  } finally { s.clean(); }
});

test('rejection leaves no output and keeps a pre-existing output byte-identical', () => {
  const s = setup();
  try {
    const rotated = request([text('t', 'x', { rotation: 15 })]);
    const input = s.put('req.json', rotated);
    const fresh = cli('--input', input, '--output', s.out);
    assert.equal(fresh.status, 2);
    const e = failure(fresh);
    assert.equal(e.category, 'adapter');
    assert.match(e.path, /^\$\.source\.elements\[0\]/);
    assert.ok(!existsSync(s.out));
    writeFileSync(s.out, 'precious');
    assert.equal(cli('--input', input, '--output', s.out).status, 2);
    assert.equal(readFileSync(s.out, 'utf8'), 'precious');
    assert.deepEqual(readdirSync(s.dir).sort(), ['assets', 'out.json', 'req.json']);
  } finally { s.clean(); }
});

test('missing, traversing, absolute and escaping-symlink assets are rejected as missing-asset', () => {
  const s = setup();
  try {
    writeFileSync(join(s.dir, 'secret.png'), PNG);
    symlinkSync(join(s.dir, 'secret.png'), join(s.assets, 'escape.png'));
    symlinkSync(join(s.assets, 'photo.png'), join(s.assets, 'inside.png'));
    for (const asset of ['absent.png', '../secret.png', join(s.dir, 'secret.png'), 'escape.png', 'sub/x.png', 'a\\b.png', 'notes.txt']) {
      const r = cli('--input', s.put('req.json', request([image('bg', asset), text('t', 'x')])), '--output', s.out, '--assets', s.assets);
      assert.equal(r.status, 2, `${asset}: ${r.stderr}`);
      const e = failure(r);
      assert.equal(e.code, 'missing-asset', asset);
      assert.equal(e.path, '$.source.elements[0].asset_id');
      assert.ok(!existsSync(s.out));
    }
    const ok = cli('--input', s.put('ok.json', request([image('bg', 'inside.png'), text('t', 'x')])), '--output', s.out, '--assets', s.assets);
    assert.equal(ok.status, 0, ok.stderr);
    const noAssets = cli('--input', s.put('na.json', base()), '--output', s.out);
    assert.equal(failure(noAssets).code, 'missing-asset');
  } finally { s.clean(); }
});

test('argument and input errors exit 2 with no output', () => {
  const s = setup();
  try {
    const input = s.put('req.json', base());
    const cases: string[][] = [[], ['--input', input], ['--output', s.out], ['--bogus', 'x'], ['--input', input, '--input', input, '--output', s.out],
      ['--input', join(s.dir, 'none.json'), '--output', s.out], ['--input', s.put('bad.json', '{'), '--output', s.out],
      ['--input', input, '--output', s.out, '--assets', 'one', '--assets', 'two'],
      ['--input', input, '--output', s.out, '--assets', join(s.dir, 'nodir')],
      ['--input', input, '--output', s.out, '--roles', s.put('roles.json', '{')],
      ['--input', input, '--output', s.out, '--roles', s.put('roles2.json', { bg: 'wrong' })],
      ['--input', input, '--output', s.out, '--roles', s.put('roles3.json', [])],
      ['--input', s.put('big.json', ' '.repeat(2 * 1024 * 1024 + 1)), '--output', s.out], ['--input', s.dir, '--output', s.out]];
    for (const args of cases) {
      const r = cli(...args);
      assert.equal(r.status, 2, `${args.join(' ')}: ${r.stderr}`);
      assert.equal(r.stdout, '');
      assert.ok(failure(r).code);
      assert.ok(!existsSync(s.out));
    }
  } finally { s.clean(); }
});

test('output may not alias the input, even through a symlink, nor live inside the assets dir', () => {
  const s = setup();
  try {
    const input = s.put('req.json', base()), before = readFileSync(input);
    symlinkSync(input, join(s.dir, 'link.json'));
    mkdirSync(join(s.dir, 'dirlink-parent'));
    symlinkSync(s.dir, join(s.dir, 'dirlink-parent', 'up'));
    for (const out of [input, join(s.dir, 'link.json'), join(s.dir, 'dirlink-parent', 'up', 'req.json'), join(s.assets, 'out.json'), join(s.dir, 'dirlink-parent', 'up', 'assets', 'out.json')]) {
      const r = cli('--input', input, '--output', out, '--assets', s.assets);
      assert.equal(r.status, 2, `${out}: ${r.stderr}`);
      assert.deepEqual(readFileSync(input), before);
    }
    assert.ok(!existsSync(join(s.assets, 'out.json')));
  } finally { s.clean(); }
});

test('report write failure removes the output so no half pair remains', () => {
  const s = setup();
  try {
    mkdirSync(s.out + '.report.json'); // a directory occupies the report path
    const r = cli('--input', s.put('req.json', base()), '--output', s.out, '--assets', s.assets, '--report');
    assert.notEqual(r.status, 0);
    assert.ok(failure(r).code);
    assert.ok(!existsSync(s.out), 'OUT.json must not remain');
    assert.deepEqual(readdirSync(s.dir).sort(), ['assets', 'out.json.report.json', 'req.json']);
  } finally { s.clean(); }
});

test('a font the bundled measurer lacks is a path-qualified rejection, not a crash or a guessed measurement', () => {
  const s = setup();
  try {
    const r = cli('--input', s.put('req.json', request([text('t', 'x', { font_family: 'Solstice Serif' })])), '--output', s.out);
    assert.equal(r.status, 2, r.stderr);
    const e = failure(r);
    assert.equal(e.category, 'adapter');
    assert.equal(e.code, 'unsupported');
    assert.equal(e.path, '$.elements[0].fontFamily'); // adapter's own path (internal design coordinates)
    assert.ok(!existsSync(s.out));
  } finally { s.clean(); }
});

// --- Q10: transactional write, scrubbed errors, --roles probes (subprocess) ---
const noLeftovers = (dir: string, expected: string[]) => assert.deepEqual(readdirSync(dir).sort(), expected);

test('a non-regular report path is rejected before any write; pre-existing OUT.json keeps its bytes', () => {
  const s = setup();
  try {
    writeFileSync(s.out, 'OLD-OUT');
    mkdirSync(s.out + '.report.json');
    const r = cli('--input', s.put('req.json', base()), '--output', s.out, '--assets', s.assets, '--report');
    assert.equal(r.status, 2, r.stderr);
    assert.deepEqual([failure(r).code, failure(r).path], ['output-not-regular', '$args.output']);
    assert.equal(readFileSync(s.out, 'utf8'), 'OLD-OUT');
    noLeftovers(s.dir, ['assets', 'out.json', 'out.json.report.json', 'req.json']);
  } finally { s.clean(); }
});

test('an existing symlink or directory at OUT.json is rejected and left untouched', () => {
  const s = setup();
  try {
    const input = s.put('req.json', base()), victim = s.put('victim.txt', 'VICTIM');
    symlinkSync(victim, s.out);
    let r = cli('--input', input, '--output', s.out, '--assets', s.assets);
    assert.deepEqual([r.status, failure(r).code, failure(r).path], [2, 'output-not-regular', '$args.output']);
    assert.equal(readFileSync(victim, 'utf8'), 'VICTIM');
    rmSync(s.out);
    mkdirSync(s.out);
    r = cli('--input', input, '--output', s.out, '--assets', s.assets);
    assert.deepEqual([r.status, failure(r).code, failure(r).path], [2, 'output-not-regular', '$args.output']);
    noLeftovers(s.dir, ['assets', 'out.json', 'req.json', 'victim.txt']);
  } finally { s.clean(); }
});

test('stderr never embeds an absolute path (tmpdir) across the error table', () => {
  const s = setup();
  try {
    const input = s.put('req.json', base());
    const cases: string[][] = [
      ['--input', join(s.dir, 'none.json'), '--output', s.out],
      ['--input', input, '--output', join(s.dir, 'no-such-dir', 'out.json')],
      ['--input', s.dir, '--output', s.out],
      ['--input', input, '--output', input],
      ['--input', input, '--output', s.out, '--assets', join(s.dir, 'nodir')],
      ['--input', input, '--output', s.out, '--roles', join(s.dir, 'none-roles.json')],
      ['--input', input, '--output', s.out],
      ['--input', s.put('rot.json', request([text('t', 'x', { rotation: 15 })])), '--output', s.out],
    ];
    for (const args of cases) {
      const r = cli(...args);
      assert.ok(r.status === 1 || r.status === 2, `${args.join(' ')}: ${r.status}`);
      for (const needle of [s.dir, tmpdir()]) assert.ok(!r.stderr.includes(needle), `${args.join(' ')}: ${r.stderr}`);
      assert.ok(failure(r).code);
    }
    assert.equal(failure(cli(...cases[0])).code, 'ENOENT');
    assert.equal(failure(cli(...cases[0])).path, '$args.input');
  } finally { s.clean(); }
});

test('--roles probes: bad JSON, array, bad role value, over 64 KiB, unreadable', () => {
  const s = setup();
  try {
    const input = s.put('req.json', base());
    const run = (rolesPath: string) => { const r = cli('--input', input, '--output', s.out, '--assets', s.assets, '--roles', rolesPath); assert.equal(r.status, 2, r.stderr); return failure(r); };
    let e = run(s.put('r1.json', '{'));
    assert.deepEqual([e.code, e.path], ['invalid-json', '$args.roles']);
    e = run(s.put('r2.json', []));
    assert.deepEqual([e.code, e.path], ['invalid-argument', '$args.roles']);
    e = run(s.put('r3.json', { bg: 'wrong' }));
    assert.deepEqual([e.category, e.path], ['adapter', '$.options.roles.bg']);
    e = run(s.put('r4.json', ' '.repeat(64 * 1024 + 1)));
    assert.deepEqual([e.code, e.path], ['invalid-argument', '$args.roles']);
    e = run(join(s.dir, 'absent-roles.json'));
    assert.deepEqual([e.code, e.path], ['ENOENT', '$args.roles']);
    assert.ok(!existsSync(s.out));
  } finally { s.clean(); }
});

test('--roles unreadable file reports a code at $args.roles', { skip: process.getuid?.() === 0 ? 'running as uid 0: chmod 000 does not block reads' : false }, () => {
  const s = setup();
  try {
    const roles = s.put('locked.json', { bg: 'background' });
    chmodSync(roles, 0);
    const r = cli('--input', s.put('req.json', base()), '--output', s.out, '--assets', s.assets, '--roles', roles);
    assert.equal(r.status, 2, r.stderr);
    assert.deepEqual([failure(r).code, failure(r).path], ['EACCES', '$args.roles']);
    assert.ok(!r.stderr.includes(s.dir));
  } finally { s.clean(); }
});

// --- Q10: in-process rollback via an injected rename (default ops are the real fs) ---
import { renameSync } from 'node:fs';
const load = async () => (await import('../scripts/official-cli')) as { commitFiles: (files: [string, string][], ops?: { rename: typeof renameSync }) => void };
const failingRename = (failOn: (call: number, from: string, to: string) => boolean) => { let n = 0; return { rename: ((from: string, to: string) => { if (failOn(++n, String(from), String(to))) throw Object.assign(new Error('injected'), { code: 'EIO' }); return renameSync(from, to); }) as typeof renameSync }; };

test('commitFiles: report-rename failure restores BOTH pre-existing files byte-identically and leaves no tmp/bak', async () => {
  const { commitFiles } = await load();
  const s = setup();
  try {
    const report = s.out + '.report.json';
    writeFileSync(s.out, 'OLD-OUT'); writeFileSync(report, 'OLD-REPORT');
    assert.throws(() => commitFiles([[s.out, 'NEW-OUT'], [report, 'NEW-REPORT']], failingRename(n => n === 2)), /injected/);
    assert.equal(readFileSync(s.out, 'utf8'), 'OLD-OUT');
    assert.equal(readFileSync(report, 'utf8'), 'OLD-REPORT');
    noLeftovers(s.dir, ['assets', 'out.json', 'out.json.report.json']);
  } finally { s.clean(); }
});

test('commitFiles: failure with nothing pre-existing leaves both finals absent and no tmp/bak', async () => {
  const { commitFiles } = await load();
  const s = setup();
  try {
    assert.throws(() => commitFiles([[s.out, 'NEW-OUT'], [s.out + '.report.json', 'NEW-REPORT']], failingRename(n => n === 2)), /injected/);
    noLeftovers(s.dir, ['assets']);
  } finally { s.clean(); }
});

test('commitFiles: success replaces both and removes every tmp/bak', async () => {
  const { commitFiles } = await load();
  const s = setup();
  try {
    writeFileSync(s.out, 'OLD-OUT');
    commitFiles([[s.out, 'NEW-OUT'], [s.out + '.report.json', 'NEW-REPORT']]);
    assert.equal(readFileSync(s.out, 'utf8'), 'NEW-OUT');
    assert.equal(readFileSync(s.out + '.report.json', 'utf8'), 'NEW-REPORT');
    noLeftovers(s.dir, ['assets', 'out.json', 'out.json.report.json']);
  } finally { s.clean(); }
});

test('commitFiles: if the restore itself fails, the ORIGINAL error is rethrown and the surviving .bak is named on stderr', async () => {
  const { commitFiles } = await load();
  const s = setup();
  const written: string[] = [], realWrite = process.stderr.write.bind(process.stderr);
  try {
    writeFileSync(s.out, 'OLD-OUT');
    // calls: 1 = out, 2 = report (fails), 3 = restore of out from its .bak (fails too)
    process.stderr.write = ((chunk: string | Uint8Array) => { written.push(String(chunk)); return true; }) as typeof process.stderr.write;
    let thrown: unknown;
    try { commitFiles([[s.out, 'NEW-OUT'], [s.out + '.report.json', 'NEW-REPORT']], failingRename(n => n >= 2)); } catch (e) { thrown = e; } finally { process.stderr.write = realWrite; }
    assert.match(String((thrown as Error).message), /injected/);
    const bak = readdirSync(s.dir).filter(f => f.endsWith('.bak'));
    assert.equal(bak.length, 1, readdirSync(s.dir).join());
    assert.equal(readFileSync(join(s.dir, bak[0]), 'utf8'), 'OLD-OUT');
    assert.ok(written.join('').includes(bak[0]), written.join(''));
    assert.ok(!written.join('').includes(s.dir), 'stderr names the .bak by basename, not an absolute path');
  } finally { process.stderr.write = realWrite; s.clean(); }
});

// --- Q10b: entry detection must survive symlinked invocation paths (silent exit 0 with no output was the defect) ---
test('CLI runs when invoked through a symlinked directory or a symlinked file, with output equal to direct invocation', () => {
  const s = setup();
  try {
    const input = s.put('req.json', base());
    const direct = join(s.dir, 'direct.json');
    const d = cli('--input', input, '--output', direct, '--assets', s.assets);
    assert.equal(d.status, 0, d.stderr);
    const script = resolve('scripts/official-cli.ts');
    // (a) symlinked directory: the script's own imports ('../src/...') resolve through the real path.
    const dirLink = join(s.dir, 'scripts-link');
    symlinkSync(resolve('scripts'), dirLink);
    // (b) symlinked file next to a real scripts dir cannot resolve ../src, so link the file inside the real scripts directory's sibling via a dir that mirrors it.
    const fileLink = join(resolve('scripts'), `.q10b-link-${process.pid}.ts`);
    symlinkSync(script, fileLink);
    try {
      for (const [name, entry] of [['dir-link', join(dirLink, 'official-cli.ts')], ['file-link', fileLink]] as const) {
        const out = join(s.dir, `${name}.json`);
        const r = spawnSync(process.execPath, ['--import', 'tsx', entry, '--input', input, '--output', out, '--assets', s.assets], { encoding: 'utf8', timeout: 60000 });
        assert.equal(r.status, 0, `${name}: ${r.stderr}`);
        assert.ok(existsSync(out), `${name}: exit 0 but no output was written (silent false success)`);
        assert.equal(readFileSync(out, 'utf8'), readFileSync(direct, 'utf8'), name);
      }
    } finally { rmSync(fileLink, { force: true }); }
  } finally { s.clean(); }
});
