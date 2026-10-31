import test from 'node:test';
import assert from 'node:assert/strict';
import { reflow } from '../src/engine';
import { FIXTURES } from '../src/fixtures';
import { type Measure } from '../src/typography';
import { type TextElement } from '../src/model';

const measure: Measure = (text, e) => ({ width: [...text].length * e.fontSize * .52, ascent: e.fontSize * .78, descent: e.fontSize * .2 });
const target = { id: 'story', label: 'Story', width: 1080, height: 1920 };

test('reflow avoids redundant calls to the font measurer during repeated-copy fitting', () => {
  const source = structuredClone(FIXTURES[0]);
  const text = source.elements.find(e => e.type === 'text')!;
  source.groups = [];
  source.elements = [{ ...text, text: 'Repeat words repeat words repeat words repeat words', width: 600, height: 100 }];
  const seen = new WeakMap<TextElement, Set<string>>();
  let duplicates = 0, calls = 0;
  const result = reflow(source, target, (value, e) => {
    calls++;
    let queries = seen.get(e);
    if (!queries) seen.set(e, queries = new Set());
    if (queries.has(value)) duplicates++;
    queries.add(value);
    return measure(value, e);
  });
  assert.ok(calls > 0, 'Must use the caller\'s actual font measurer');
  assert.equal(result.selected.design.elements[0].type, 'text');
  assert.equal((result.selected.design.elements[0] as TextElement).text, (source.elements[0] as TextElement).text);
  assert.equal(duplicates, 0, 'Repeated requests for unchanged text and element should reuse metrics');
});

test('each invocation measures fresh font state, preserves content and leaves inputs unchanged', () => {
  const source = structuredClone(FIXTURES[0]), before = structuredClone(source);
  let factor = .25, calls = 0;
  const changingFonts: Measure = (text, e) => { calls++; return { width: text.length * e.fontSize * factor, ascent: e.fontSize, descent: e.fontSize * .2 }; };
  const narrow = reflow(source, target, changingFonts);
  calls = 0; factor = 3;
  const wide = reflow(source, target, changingFonts);
  assert.ok(calls > 0);
  assert.notDeepEqual(wide.candidates, narrow.candidates, 'Fresh measurements must affect layout');
  for (const candidate of wide.candidates) {
    assert.deepEqual(candidate.design.elements.map(e => e.id), source.elements.map(e => e.id));
    assert.deepEqual(candidate.design.elements.filter(e => e.type === 'text').map(e => e.text), source.elements.filter(e => e.type === 'text').map(e => e.text));
  }
  assert.deepEqual(source, before);
});

test('malformed or unresolved input is still rejected before font measurement', () => {
  const fail: Measure = () => { assert.fail('Invalid input reached font measurement'); };
  assert.throws(() => reflow(FIXTURES[0], { ...target, width: 0 }, fail), /width/);
  const unsupported = structuredClone(FIXTURES[0]);
  const text = unsupported.elements.find(e => e.type === 'text')!;
  text.fontFamily = 'Unavailable';
  assert.throws(() => reflow(unsupported, target, fail), /unavailable/i);
});

test('equivalent stack/split arrangements are measured once and returned as independent candidates', () => {
  const source = structuredClone(FIXTURES[0]);
  const text = source.elements.find(e => e.type === 'text')!;
  source.groups = [];
  source.elements = [{ ...text, text: 'Read this repeated caption', width: 600, height: 100 }];
  const contexts = new Map<string, Set<TextElement>>();
  const result = reflow(source, target, (value, e) => {
    const key = JSON.stringify([value, e]);
    let objects = contexts.get(key);
    if (!objects) contexts.set(key, objects = new Set());
    objects.add(e);
    return measure(value, e);
  });
  assert.equal(result.candidates.length, 3);
  const [, stack, split] = result.candidates;
  assert.deepEqual(stack.design, split.design);
  assert.deepEqual(stack.metrics, split.metrics);
  assert.notEqual(stack.design, split.design);
  assert.notEqual(stack.design.elements[0], split.design.elements[0]);
  assert.notEqual(stack.metrics.findings, split.metrics.findings);
  const duplicates = [...contexts.values()].filter(objects => objects.size > 1);
  assert.equal(duplicates.length, 0, 'Identical completed arrangements should not repeat fitting/evaluation');
});

test('mixed image/text units retain a genuinely different split candidate', () => {
  const result = reflow(FIXTURES[0], target, measure);
  const [, stack, split] = result.candidates;
  assert.equal(split.strategy, 'split');
  assert.notDeepEqual(split.design, stack.design);
});
