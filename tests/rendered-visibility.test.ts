import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../src/evaluate';
import { uniform } from '../src/engine';
import type { Design, Element } from '../src/model';
import { nativeRenderedVerdict, nativeShare, nativeSubjectVerdict } from '../scripts/rendered-visibility';
import { DEFECT_CASES } from './support/defect-cases';

// Pixel evidence from the native renderer, independent of src/visibility.ts sampling.
const byId = (id: string) => DEFECT_CASES.find(c => c.id === id)!;

test('native rendered verdicts match every author-labelled pixel case', () => {
  for (const c of DEFECT_CASES.filter(c => c.method === 'pixels')) {
    const verdicts = c.elements.map(id => nativeRenderedVerdict(c.source, c.output, id));
    const expected = c.label === 'defect' ? 'defect' : 'ok';
    const actual = verdicts.some(v => v.verdict === 'defect') ? 'defect' : verdicts.every(v => v.verdict === 'no-verdict') ? 'no-verdict' : 'ok';
    assert.equal(actual, expected, `${c.id}: ${JSON.stringify(verdicts.map(v => [v.source.share, v.output.share, v.verdict]))}`);
  }
});

test('rendered subject pixels separate a cut-off figure from a narrow crop that keeps it', () => {
  for (const c of DEFECT_CASES.filter(c => c.method === 'subject')) {
    assert.equal(nativeSubjectVerdict(c.source, c.output, c.elements[0]).verdict, c.label === 'defect' ? 'defect' : 'ok', c.id);
  }
});

test('text moved onto a same-coloured photo region escapes the geometric evaluator but not the rendered check', () => {
  const c = byId('caption-onto-matching-photo-region');
  const findings = evaluate(c.source, c.output, (text, e) => ({ width: text.length * e.fontSize * 0.6, ascent: e.fontSize * 0.8, descent: e.fontSize * 0.2 })).findings;
  assert.deepEqual(findings, [], 'documented evaluator gap: image backings have no contrast verdict');
  const rendered = nativeRenderedVerdict(c.source, c.output, 'caption');
  assert.equal(rendered.verdict, 'defect');
  assert.ok(rendered.output.hidden, 'the rendered check names the hidden region');
});

const plated = (textColor: string, plateColor: string, size = 40): Design => ({
  schemaVersion: 'reflow.design.v0', id: 'plated', name: 'plated', description: '', provenance: 'synthetic', width: 1000, height: 1000,
  background: '#ffffff', groups: [], elements: [
    { id: 'plate', type: 'rect', role: 'decoration', x: 100, y: 100, width: 500, height: 200, color: plateColor },
    { id: 'label', type: 'text', role: 'content', x: 140, y: 160, width: 420, height: Math.max(70, size * 1.5), text: 'CALL TODAY', fontFamily: 'Inter', fontSize: size, fontWeight: 700, lineHeight: 1.1, color: textColor } as Element,
  ],
});

test('rendered shares are scale-invariant under uniform resizing', () => {
  const source = plated('#ffffff', '#16362a'), base = nativeShare(source, 'label');
  assert.ok(base.core > 200 && base.share! > 0.95, JSON.stringify(base));
  for (const [w, h] of [[500, 500], [2000, 2000], [1000, 3000]]) {
    const share = nativeShare(uniform(source, { id: 't', label: 't', width: w, height: h }), 'label').share!;
    assert.ok(Math.abs(share - base.share!) < 0.05, `${w}×${h}: ${share}`);
  }
});

test('core glyph pixels do not depend on text or backing colour', () => {
  const light = nativeShare(plated('#ffffff', '#000000'), 'label').core, dark = nativeShare(plated('#000000', '#ffffff'), 'label').core;
  assert.ok(Math.abs(light - dark) / light < 0.02, `${light} vs ${dark}`);
});

test('text too small to have solid pixels yields no verdict rather than a pass', () => {
  const tiny = plated('#ffffff', '#16362a', 2);
  const result = nativeRenderedVerdict(tiny, tiny, 'label');
  assert.equal(result.source.share, undefined);
  assert.equal(result.verdict, 'no-verdict');
});
