import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

// Runs the unmodified supervisor with child spawning replaced by scripted 'data' events,
// so chunk boundaries are exact regardless of OS pipe behavior.
const LIMIT = 20 * 1024 * 1024;
type Step = { s: 'out' | 'err'; parts: { b64: string; times?: number }[]; chunk?: number };
type Scenario = { steps: Step[]; code?: number | null; hang?: boolean; spawnError?: string };
const b64 = (data: string | Buffer) => Buffer.from(data).toString('base64');
const text = (s: 'out' | 'err', data: string | Buffer, chunk?: number): Step => ({ s, parts: [{ b64: b64(data) }], chunk });

function supervise(scenario: Scenario, args: string[] = []) {
  const dir = mkdtempSync(join(tmpdir(), 'reflow-cli-out-'));
  try {
    const input = join(dir, 'design.json'), file = join(dir, 'scenario.json');
    writeFileSync(input, '{}');
    writeFileSync(file, JSON.stringify(scenario));
    const r = spawnSync(process.execPath, ['--import', 'tsx', '--import', './tests/helpers/fake-worker-spawn.mjs',
      'scripts/reflow-cli.ts', '--input', input, '--width', '200', '--height', '100', ...args],
    { cwd: process.cwd(), encoding: 'utf8', timeout: 60000, maxBuffer: 128 * 1024 * 1024, env: { ...process.env, REFLOW_FAKE_SCENARIO: file } });
    return r;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const errorOf = (stderr: string) => JSON.parse(stderr).error as { category: string; code: string; path: string; message: string };

const SAMPLES = ['Café Zoë', 'é combining', '👩🏽‍💻 ZWJ', '日本語テキスト', 'ASCII only'];
const payload = (t: string) => JSON.stringify({ sourceId: t, output: { id: t, elements: [{ id: `id-${t}`, text: t }] }, timing: {} }) + '\n';

for (const sample of SAMPLES) {
  test(`stdout survives every two-chunk split and byte-at-a-time delivery: ${sample}`, () => {
    const bytes = Buffer.from(payload(sample));
    const cases: Step[][] = [];
    for (let i = 1; i < bytes.length; i++) cases.push([text('out', bytes.subarray(0, i)), text('out', bytes.subarray(i))]);
    cases.push([text('out', bytes, 1)]);
    // One subprocess per split is slow; run the full sweep as a single scripted delivery per split position.
    for (const steps of cases) {
      const r = supervise({ steps });
      assert.equal(r.status, 0, r.stderr);
      const out = JSON.parse(r.stdout);
      assert.equal(out.sourceId, sample);
      assert.equal(out.output.elements[0].id, `id-${sample}`);
      assert.equal(out.output.elements[0].text, sample);
    }
  });

  test(`stderr worker error survives every two-chunk split and byte-at-a-time delivery: ${sample}`, () => {
    const error = { category: 'input', code: 'invalid-json', path: `$.${sample}`, message: `bad ${sample}` };
    const bytes = Buffer.from(JSON.stringify({ error }) + '\n');
    const cases: Step[][] = [];
    for (let i = 1; i < bytes.length; i++) cases.push([text('err', bytes.subarray(0, i)), text('err', bytes.subarray(i))]);
    cases.push([text('err', bytes, 1)]);
    for (const steps of cases) {
      const r = supervise({ steps, code: 2 });
      assert.equal(r.status, 2);
      assert.equal(r.stdout, '');
      assert.deepEqual(JSON.parse(r.stderr), { error });
    }
  });
}

test('stdout and stderr keep independent decoder state when partial characters interleave', () => {
  const out = Buffer.from(payload('日本👩🏽‍💻é'));
  const error = { category: 'input', code: 'x', path: '$.é日', message: '👩🏽‍💻 é日' };
  const err = Buffer.from(JSON.stringify({ error }) + '\n');
  const steps: Step[] = [];
  for (let i = 0; i < Math.max(out.length, err.length); i++) {
    if (i < out.length) steps.push(text('out', out.subarray(i, i + 1)));
    if (i < err.length) steps.push(text('err', err.subarray(i, i + 1)));
  }
  const ok = supervise({ steps });
  assert.equal(ok.status, 0);
  assert.equal(JSON.parse(ok.stdout).output.id, '日本👩🏽‍💻é');
  const bad = supervise({ steps, code: 2 });
  assert.equal(bad.status, 2);
  assert.deepEqual(JSON.parse(bad.stderr), { error });
});

// JSON document of exactly `bytes` UTF-8 bytes; padding is mostly 2-byte characters so odd chunk sizes split them.
function sized(bytes: number): Buffer {
  const head = Buffer.from('{"timing":{},"pad":"'), tail = Buffer.from('"}');
  const fill = bytes - head.length - tail.length;
  assert.ok(fill >= 2);
  return Buffer.concat([head, Buffer.from('a'.repeat(fill % 2) + 'é'.repeat(Math.floor(fill / 2))), tail]);
}

for (const [name, size, ok] of [['limit-1', LIMIT - 1, true], ['limit', LIMIT, true], ['limit+1', LIMIT + 1, false]] as const) {
  test(`stdout byte ceiling ${name} with chunk boundaries splitting multibyte text`, () => {
    const r = supervise({ steps: [text('out', sized(size), 65537)] });
    if (ok) {
      assert.equal(r.status, 0, r.stderr.slice(0, 300));
      assert.equal(JSON.parse(r.stdout).pad.endsWith('é'), true);
    } else {
      assert.equal(r.status, 1);
      assert.equal(errorOf(r.stderr).code, 'output-limit');
    }
  });
}

test('limits apply per stream: two large streams below the ceiling both succeed', () => {
  const r = supervise({ steps: [text('err', 'é'.repeat(LIMIT / 4), 65537), text('out', sized(LIMIT / 2), 65537)] });
  assert.equal(r.status, 0, r.stderr.slice(0, 300));
});

test('stderr overflow reports output-limit', () => {
  const r = supervise({ steps: [text('err', Buffer.alloc(LIMIT + 1, 0x61), 1 << 20)], code: 2 });
  assert.equal(r.status, 1);
  assert.equal(errorOf(r.stderr).code, 'output-limit');
});

test('empty, malformed and truncated worker stdout keep structured failure', () => {
  for (const steps of [[], [text('out', '{"timing":{}')], [text('out', 'not json')], [text('out', Buffer.from([0x7b, 0xe6, 0x97]))]]) {
    const r = supervise({ steps });
    assert.equal(r.status, 1);
    assert.equal(r.stdout, '');
    assert.equal(errorOf(r.stderr).code, 'invalid-worker-output');
  }
});

test('genuinely malformed bytes use replacement semantics', () => {
  const r = supervise({ steps: [text('out', Buffer.concat([Buffer.from('{"timing":{},"v":"a'), Buffer.from([0xff]), Buffer.from('b"}')]), 1)] });
  assert.equal(r.status, 0);
  assert.equal(JSON.parse(r.stdout).v, 'a�b');
});

test('non-protocol stderr and non-zero exit give worker-failed', () => {
  const r = supervise({ steps: [text('err', 'Error: boom\n    at x\n')], code: 3 });
  assert.equal(r.status, 1);
  assert.equal(errorOf(r.stderr).code, 'worker-failed');
});

test('hung worker is terminated with deadline-exceeded and exit 124', () => {
  const r = supervise({ steps: [text('out', '{"partial')], hang: true }, ['--deadline-ms', '100']);
  assert.equal(r.status, 124);
  assert.equal(errorOf(r.stderr).code, 'deadline-exceeded');
});

test('real worker positive control: Unicode ids and text round-trip unchanged', () => {
  const dir = mkdtempSync(join(tmpdir(), 'reflow-cli-real-'));
  try {
    const path = join(dir, 'design.json');
    const text = 'Café Zoë 日本語 👩🏽‍💻 é';
    writeFileSync(path, JSON.stringify({ schemaVersion: 'reflow.design.v0', id: 'uni-ünï', name: 'Unicode', description: '', provenance: 'test',
      width: 100, height: 100, background: '#ffffff', groups: [],
      elements: [{ id: 'héadline-日本', type: 'text', role: 'content', text, fontFamily: 'Inter', fontWeight: 500, fontSize: 12,
        lineHeight: 1.1, color: '#000000', x: 5, y: 5, width: 90, height: 30 }] }));
    const r = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/reflow-cli.ts', '--input', path, '--width', '200', '--height', '100'],
      { cwd: process.cwd(), encoding: 'utf8', timeout: 30000 });
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.sourceId, 'uni-ünï');
    assert.deepEqual(out.output.elements.map((e: { id: string; text: string }) => [e.id, e.text]), [['héadline-日本', text]]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// Truncated UTF-8 (lone lead byte 0xe6) as the final byte at the exact ceiling: ceiling counts raw bytes,
// so LIMIT is not output-limit (malformed JSON -> invalid-worker-output); LIMIT+1 is output-limit.
test('truncated UTF-8 at the exact stdout ceiling: raw bytes decide output-limit, not decoder flush', () => {
  const body = (n: number) => Buffer.concat([sized(n - 1), Buffer.from([0xe6])]);
  const atLimit = supervise({ steps: [text('out', body(LIMIT), 65537)] });
  assert.equal(atLimit.status, 1);
  assert.equal(errorOf(atLimit.stderr).code, 'invalid-worker-output');
  const over = supervise({ steps: [text('out', body(LIMIT + 1), 65537)] });
  assert.equal(over.status, 1);
  assert.equal(errorOf(over.stderr).code, 'output-limit');
});

test('truncated UTF-8 at the exact stderr ceiling: not output-limit; worker-failed', () => {
  const diag = Buffer.concat([Buffer.alloc(LIMIT - 1, 0x61), Buffer.from([0xe6])]);
  const atLimit = supervise({ steps: [text('err', diag, 65537)], code: 3 });
  assert.equal(atLimit.status, 1);
  assert.equal(errorOf(atLimit.stderr).code, 'worker-failed');
  const over = supervise({ steps: [text('err', Buffer.concat([diag, Buffer.from([0x80])]), 65537)], code: 3 });
  assert.equal(over.status, 1);
  assert.equal(errorOf(over.stderr).code, 'output-limit');
});

// Structured-failure protocol audit: every malformed worker stream yields exactly one structured failure.
const expectFailure = (r: ReturnType<typeof supervise>, status: number, code: string) => {
  assert.equal(r.status, status, r.stderr.slice(0, 300));
  assert.equal(r.stdout, '');
  assert.equal(r.stderr.trim().split('\n').length, 1, 'exactly one stderr line');
  assert.equal(errorOf(r.stderr).code, code);
};

test('audit: exit 0 with JSON that is not a worker result is invalid-worker-output', () => {
  for (const body of ['null', '[]', '5', '"x"', '{}', '{"timing":5}', '{"timing":null}', '{"timing":{}} trailing', '{"timing":{}}\n{"timing":{}}']) {
    expectFailure(supervise({ steps: [text('out', body)] }), 1, 'invalid-worker-output');
  }
});

test('audit: non-zero exit with unusable diagnostics is worker-failed, never forwarded raw', () => {
  for (const body of ['null', '[]', '5', '{}', '{"error":null}', '{"error":{"code":"x"}}', '{"error":{"category":"y"}}', '{"error":"str"}', '{"error":{"code":"x","category":"y"}', 'x\n{"error":{"code":"x","category":"y"}}']) {
    expectFailure(supervise({ steps: [text('err', body)], code: 2 }), 1, 'worker-failed');
  }
});

test('audit: non-zero exit with valid stdout is worker-failed', () => {
  expectFailure(supervise({ steps: [text('out', '{"timing":{}}')], code: 7 }), 1, 'worker-failed');
});

test('audit: invalid UTF-8 inside an otherwise valid protocol line never crashes and yields one outcome', () => {
  const r = supervise({ steps: [text('err', Buffer.concat([Buffer.from('{"error":{"category":"input","code":"x","path":"$","message":"a'), Buffer.from([0xc3]), Buffer.from('"}}\n')]), 1)], code: 2 });
  assert.equal(r.status, 2);
  assert.equal(errorOf(r.stderr).message, 'a�');
});

test('audit: oversized single line on stdout with exit 0 is output-limit, not a crash', () => {
  expectFailure(supervise({ steps: [{ s: 'out', parts: [{ b64: b64('a'.repeat(1 << 20)), times: 21 }], chunk: 1 << 20 }] }), 1, 'output-limit');
});

test('audit: both streams oversized and worker still running at deadline: overflow wins deterministic single failure', () => {
  const r = supervise({ steps: [text('out', Buffer.alloc(LIMIT + 1, 0x61), 1 << 20), text('err', Buffer.alloc(LIMIT + 1, 0x61), 1 << 20)], hang: true });
  assert.equal(r.stderr.trim().split('\n').length, 1);
  assert.equal(errorOf(r.stderr).code, 'output-limit');
});

test('audit: worker killed by an external signal is worker-failed, spawn error is spawn-failed', () => {
  expectFailure(supervise({ steps: [text('out', '{"timing":{}')], code: null }), 1, 'worker-failed');
  expectFailure(supervise({ steps: [], spawnError: 'ENOENT boom' }), 1, 'spawn-failed');
});
