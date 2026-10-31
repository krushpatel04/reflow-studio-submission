import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES } from '../src/fixtures';
import { reflow } from '../src/engine';
import { evaluate } from '../src/evaluate';
import type { Measure } from '../src/typography';

const measure: Measure = (text, e) => ({ width: [...text].length * e.fontSize * 0.52, ascent: e.fontSize * 0.78, descent: e.fontSize * 0.2 });

test('evaluate reports the ticket-label arrow (U+2192) as an unsupported-glyph warning, not an error', () => {
  const source = FIXTURES.find(f => f.id === 'after-dark')!;
  const metrics = evaluate(source, source, measure);
  const findings = metrics.findings.filter(f => f.kind === 'unsupported-glyph');
  assert.equal(findings.length, 1, JSON.stringify(metrics.findings));
  assert.equal(findings[0].severity, 'warning');
  assert.deepEqual(findings[0].elementIds, ['ticket-label']);
  assert.match(findings[0].message, /ticket-label/);
  assert.equal(metrics.errors, 0);
  assert.equal(metrics.warnings, findings.length + metrics.findings.filter(f => f.severity === 'warning' && f.kind !== 'unsupported-glyph').length);
});

test('ordinary ASCII fixtures produce no unsupported-glyph findings (positive control)', () => {
  const source = FIXTURES.find(f => f.id === 'long-headline')!;
  const metrics = evaluate(source, source, measure);
  assert.equal(metrics.findings.filter(f => f.kind === 'unsupported-glyph').length, 0);
});

test('RTL content produces an unsupported-glyph warning naming bidirectional text', () => {
  const source = structuredClone(FIXTURES.find(f => f.id === 'long-headline')!);
  const eyebrow = source.elements.find(e => e.id === 'eyebrow');
  if (eyebrow?.type === 'text') eyebrow.text = 'مرحبا';
  const metrics = evaluate(source, source, measure);
  const findings = metrics.findings.filter(f => f.kind === 'unsupported-glyph');
  assert.equal(findings.length, 1, JSON.stringify(metrics.findings));
  assert.equal(findings[0].severity, 'warning');
  assert.deepEqual(findings[0].elementIds, ['eyebrow']);
  assert.match(findings[0].message, /bidirectional/);
});

test('an uncovered character is reported once per candidate metrics, not doubled by scanning source and output', () => {
  const source = FIXTURES.find(f => f.id === 'after-dark')!;
  const target = { id: 'square', label: 'Square', width: 1080, height: 1080 };
  const result = reflow(source, target, measure);
  for (const candidate of [result.baseline, result.selected, ...result.candidates]) {
    const findings = candidate.metrics.findings.filter(f => f.kind === 'unsupported-glyph' && f.elementIds.includes('ticket-label'));
    assert.equal(findings.length, 1, `${candidate.strategy}: ${JSON.stringify(candidate.metrics.findings)}`);
  }
});
