import test from 'node:test';
import assert from 'node:assert/strict';
import { cacheMeasurements } from '../src/measurement-cache';
import { FIXTURES } from '../src/fixtures';
import type { Measure } from '../src/typography';

const element = FIXTURES[0].elements.find(e => e.type === 'text')!;
const metrics = { width: 10, ascent: 8, descent: 2 };

test('reuses all metrics for empty, ordinary and Unicode queries without conflating elements', () => {
  let calls = 0;
  const cached = cacheMeasurements((text, e) => {
    calls++;
    return { width: text.length + e.width, ascent: e.fontSize, descent: e.fontWeight };
  });
  for (const text of ['', 'Ágj', 'e\u0301👩‍🎨', 'some copy']) {
    const first = cached(text, element);
    assert.deepEqual(cached(text, element), first);
  }
  assert.equal(calls, 4);
  const other = { ...element, width: element.width + 20, fontSize: 12, fontWeight: 600 };
  assert.deepEqual(cached('Ágj', other), { width: 3 + other.width, ascent: 12, descent: 600 });
  cached('Ágj', { ...element });
  assert.equal(calls, 6, 'Distinct objects are distinct callback contexts, even with the same ID');
});

test('retained and returned metrics cannot be mutated through callback or caller aliases', () => {
  const shared = { ...metrics };
  let calls = 0;
  const cached = cacheMeasurements(() => { calls++; return shared; });
  const first = cached('a', element);
  first.width = 100;
  shared.ascent = 100;
  assert.deepEqual(cached('a', element), metrics);
  assert.equal(calls, 1);
});

test('entry capacity includes empty strings and evicts old queries across element contexts', () => {
  let calls = 0;
  const cached = cacheMeasurements(() => { calls++; return metrics; }, { entries: 2, codeUnits: 100 });
  const other = { ...element };
  cached('', element); cached('b', other);
  cached('', element); cached('b', other);
  assert.equal(calls, 2, 'Exact capacity must retain both entries');
  cached('c', other); cached('', element);
  assert.equal(calls, 4, 'Oldest entry should have been evicted');
});

test('query text ceiling counts UTF-16 units and bypasses oversized entries without flushing useful data', () => {
  let calls = 0;
  const cached = cacheMeasurements(() => { calls++; return metrics; }, { entries: 10, codeUnits: 4 });
  cached('ab', element); cached('😀', element);
  cached('ab', element); cached('😀', element);
  assert.equal(calls, 2);
  cached('12345', element); cached('12345', element);
  cached('ab', element);
  assert.equal(calls, 4);
  cached('c', element); cached('ab', element);
  assert.equal(calls, 6, 'Adding another character evicts enough old text');
});

for (const limits of [{ entries: 0, codeUnits: 100 }, { entries: 10, codeUnits: 0 }]) {
  test(`zero capacity disables caching: ${JSON.stringify(limits)}`, () => {
    let calls = 0;
    const cached = cacheMeasurements(() => { calls++; return metrics; }, limits);
    cached('', element); cached('', element);
    assert.equal(calls, 2);
  });
}

for (const value of [-1, .5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
  test(`invalid capacity rejected: ${value}`, () => {
    assert.throws(() => cacheMeasurements(() => metrics, { entries: value, codeUnits: 10 }), /capacity/i);
    assert.throws(() => cacheMeasurements(() => metrics, { entries: 10, codeUnits: value }), /capacity/i);
  });
}

test('measurement exceptions propagate and are not cached', () => {
  let calls = 0;
  const failure = new Error('Font setup failed');
  const cached = cacheMeasurements(() => { if (++calls === 1) throw failure; return metrics; });
  assert.throws(() => cached('a', element), error => error === failure);
  assert.deepEqual(cached('a', element), metrics);
  cached('a', element);
  assert.equal(calls, 2);
});

test('nonfinite or negative metrics pass through without poisoning later measurements', () => {
  for (const field of ['width', 'ascent', 'descent'] as const) for (const value of [NaN, Infinity, -1]) {
    let calls = 0;
    const raw: Measure = () => ++calls === 1 ? { ...metrics, [field]: value } : metrics;
    const cached = cacheMeasurements(raw);
    assert.deepEqual(cached('a', element), { ...metrics, [field]: value });
    assert.deepEqual(cached('a', element), metrics);
    cached('a', element);
    assert.equal(calls, 2);
  }
});
