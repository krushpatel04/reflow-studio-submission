import test from 'node:test';
import assert from 'node:assert/strict';
import { cacheMeasurements } from '../src/measurement-cache';
import { evaluate } from '../src/evaluate';
import { FIXTURES } from '../src/fixtures';
import { fitText, layoutText, type Measure } from '../src/typography';

const base = FIXTURES[0].elements.find(e => e.type === 'text')!;
const e = { ...base, text: 'alpha beta gamma', width: 60, height: 200, fontSize: 10, lineHeight: 1.2 };
const ok = { width: 5, ascent: 8, descent: 2 };
const bad: Array<[string, unknown]> = [['NaN', NaN], ['Infinity', Infinity], ['-Infinity', -Infinity], ['-1', -1], ['string', '5']];
const metrics = ['width', 'ascent', 'descent'] as const;
const wrappers: Array<[string, (m: Measure) => Measure]> = [
  ['uncached', m => m], ['cached', m => cacheMeasurements(m)], ['zero-capacity', m => cacheMeasurements(m, { entries: 0, codeUnits: 0 })],
];
// Poison the nth measurement call (or all calls matching a text predicate).
const poison = (metric: typeof metrics[number], value: unknown, when: (text: string) => boolean): Measure =>
  text => ({ ...ok, width: text.length, ...(when(text) ? { [metric]: value } : {}) } as typeof ok);

for (const [wrapName, wrap] of wrappers) for (const metric of metrics) for (const [label, value] of bad) {
  const name = `${wrapName}: ${metric}=${label} rejected`;
  test(`${name} in layout`, () => {
    assert.throws(() => layoutText(e, wrap(poison(metric, value, () => true))), new RegExp(`${metric}`));
  });
  test(`${name} in fit and evaluate`, () => {
    assert.throws(() => fitText(e, 20, wrap(poison(metric, value, () => true))), new RegExp(metric));
    const d = { ...FIXTURES[0], elements: FIXTURES[0].elements.map(x => x.id === e.id ? { ...x, ...e } : x) };
    assert.throws(() => evaluate(d, d, wrap(poison(metric, value, () => true))), new RegExp(metric));
  });
}

test('later measurements are validated: wrapping fallback, grapheme split, reference, final line, empty line', () => {
  const sites: Array<[string, TextElementLike, (t: string) => boolean]> = [
    ['combined', e, t => t === 'alpha beta'],
    ['word fallback', { ...e, width: 3 }, t => t === 'alpha'],
    ['grapheme', { ...e, width: 3 }, t => t === 'alph'],
    ['reference', e, t => t === 'Ágj'],
    ['final line', e, t => t === 'alpha beta' || t === 'gamma'],
    ['empty line', { ...e, text: '' }, t => t === ''],
  ];
  for (const [site, el, when] of sites) for (const metric of metrics)
    assert.throws(() => layoutText(el, poison(metric, NaN, when)), new RegExp(metric), `${site}/${metric}`);
});
type TextElementLike = typeof e;

test('error names the element and metric', () => {
  assert.throws(() => layoutText(e, poison('ascent', -1, () => true)), (err: Error) => err.message.includes(`"${e.id}"`) && err.message.includes('ascent'));
});

test('overflow of derived height is rejected', () => {
  const huge = Number.MAX_VALUE;
  assert.throws(() => layoutText({ ...e, width: 1e9 }, () => ({ width: 1, ascent: huge, descent: huge })), /nonfinite derived layout/);
  assert.throws(() => layoutText({ ...e, width: 1e9, fontSize: huge, lineHeight: huge }, () => ({ width: 1, ascent: 1, descent: 1 })), /nonfinite derived layout/);
});

test('valid zero, empty, negative-zero and normal metrics still lay out', () => {
  assert.deepEqual(layoutText({ ...e, text: '' }, () => ({ width: 0, ascent: 0, descent: 0 })).lines, ['']);
  const nz = layoutText(e, () => ({ width: -0, ascent: -0, descent: -0 }));
  assert.equal(nz.height, 0);
  const normal = layoutText(e, t => ({ ...ok, width: t.length * 5 }));
  assert.deepEqual(normal.lines, ['alpha beta', 'gamma']);
  assert.ok(fitText(e, 20, t => ({ ...ok, width: t.length })).fontSize >= 1);
  assert.equal(layoutText({ ...e, text: 'a  \n' }, () => ({ width: 0, ascent: 8, descent: 2 })).lines.length, 2);
});

// Real CLI + worker child processes; native measureText is poisoned only via a test-owned preload.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function cli(poisonExpr: string | null) {
  const dir = mkdtempSync(join(tmpdir(), 'reflow-typo-'));
  try {
    const design = { schemaVersion: 'reflow.design.v0', id: 'd', name: 'd', description: '', provenance: 'test', width: 100, height: 100, background: '#ffffff', groups: [],
      elements: [{ id: 'headline', type: 'text', role: 'content', text: 'Keep this copy', fontFamily: 'Inter', fontWeight: 500, fontSize: 12, lineHeight: 1.1, color: '#000000', x: 5, y: 5, width: 90, height: 30 }] };
    writeFileSync(join(dir, 'in.json'), JSON.stringify(design));
    const preload = join(dir, 'poison.mjs');
    const canvas = pathToFileURL(resolve('node_modules/@napi-rs/canvas/index.js')).href;
    writeFileSync(preload, `import { createCanvas } from ${JSON.stringify(canvas)};
const proto = Object.getPrototypeOf(createCanvas(1, 1).getContext('2d'));
const real = proto.measureText;
proto.measureText = function (t) { const m = real.call(this, t); return ${poisonExpr ?? 'm'}; };\n`);
    return spawnSync(process.execPath, ['--import', 'tsx', 'scripts/reflow-cli.ts', '--input', join(dir, 'in.json'), '--width', '200', '--height', '100'],
      { cwd: process.cwd(), encoding: 'utf8', timeout: 30000, env: { ...process.env, NODE_OPTIONS: `--import ${pathToFileURL(preload).href}` } });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('native CLI control: unpoisoned measurement succeeds', () => {
  const r = cli(null);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(JSON.parse(r.stdout));
});

for (const [label, metric, value, expr] of [
  ['NaN width', 'width', 'NaN', '({ width: NaN, actualBoundingBoxAscent: m.actualBoundingBoxAscent, fontBoundingBoxAscent: m.fontBoundingBoxAscent, actualBoundingBoxDescent: m.actualBoundingBoxDescent, fontBoundingBoxDescent: m.fontBoundingBoxDescent })'],
  ['Infinity ascent', 'ascent', 'Infinity', '({ width: m.width, actualBoundingBoxAscent: Infinity, fontBoundingBoxAscent: 1, actualBoundingBoxDescent: 0, fontBoundingBoxDescent: 0 })'],
  ['negative descent', 'descent', '-5', '({ width: m.width, actualBoundingBoxAscent: 1, fontBoundingBoxAscent: 1, actualBoundingBoxDescent: -5, fontBoundingBoxDescent: -5 })'],
] as const) test(`native CLI structural failure: ${label}`, () => {
  const r = cli(expr);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.equal(r.stdout, '');
  const err = JSON.parse(r.stderr.trim().split('\n').pop()!);
  assert.deepEqual(Object.keys(err), ['error']);
  assert.deepEqual({ ...err.error, message: undefined }, { category: 'runtime', code: 'worker-failed', path: '$', message: undefined });
  assert.match(err.error.message, new RegExp(`^Text element "headline" has invalid ${metric} measurement ${value};`));
});

test('cache consistency: invalid values are never retained; valid zero/empty are cached and reused', () => {
  let calls = 0, invalid = true;
  const cached = cacheMeasurements(() => { calls++; return invalid ? { width: NaN, ascent: 1, descent: 1 } : { width: 0, ascent: 0, descent: 0 }; });
  for (let i = 0; i < 2; i++) assert.throws(() => layoutText({ ...e, text: 'a' }, cached), /width/);
  assert.equal(calls, 2, 'each failing layout re-measures on its first call; nothing cached');
  invalid = false;
  const el = { ...e, text: '' };
  const first = layoutText(el, cached), before = calls;
  assert.deepEqual(layoutText(el, cached), first);
  assert.equal(calls, before, 'valid zero metrics hit the cache on repeat');
});

test('measurement cache never stores NaN, Infinity or negative results, per metric', () => {
  for (const metric of metrics) for (const [label, value] of bad.slice(0, 4)) {
    let calls = 0;
    const cached = cacheMeasurements(() => { calls++; return { ...ok, [metric]: value } as typeof ok; });
    cached('x', e); cached('x', e);
    assert.equal(calls, 2, `${metric}=${label} must not be cached`);
  }
  let calls = 0;
  const cached = cacheMeasurements(() => { calls++; return { width: 0, ascent: -0, descent: 0 }; });
  cached('', e); cached('', e);
  assert.equal(calls, 1, 'valid zero/-0 metrics are cached');
});

import { reflowTargets } from '../src/reflow-targets';
import { InvalidMeasurementError } from '../src/typography';

test('reflowTargets reports invalid measurements per target as runtime outcomes', () => {
  const targets = [{ id: 'a', label: 'A', width: 1080, height: 1080 }];
  const [outcome] = reflowTargets(FIXTURES[0], targets, () => ({ width: NaN, ascent: 1, descent: 1 }));
  assert.equal(outcome.error?.code, 'runtime');
  assert.match(outcome.error!.message, /invalid width measurement NaN/);
  assert.throws(() => layoutText(e, () => ({ width: NaN, ascent: 1, descent: 1 })), InvalidMeasurementError);
});

// An unrelated RangeError (e.g. stack overflow) must propagate, not be reported as a target outcome.
test('reflowTargets rethrows unrelated RangeErrors', () => {
  const targets = [{ id: 'a', label: 'A', width: 1080, height: 1080 }];
  assert.throws(() => reflowTargets(FIXTURES[0], targets, () => { throw new RangeError('Maximum call stack size exceeded'); }), /Maximum call stack/);
});
