import assert from 'node:assert/strict';
import { FIXTURES } from '../src/fixtures';
import { TARGETS } from '../src/model';
import { reflow } from '../src/engine';
import { evaluate } from '../src/evaluate';
import { measure, renderPng } from './native';

let cases = 0;
for (const source of FIXTURES) {
  const sourceMetrics = evaluate(source, source, measure);
  if (sourceMetrics.errors) console.log(`Source findings / ${source.id}: ${JSON.stringify(sourceMetrics.findings)}`);
  for (const target of TARGETS) {
    const result = reflow(source, target, measure);
    assert.ok(result.selected.metrics.errors <= result.baseline.metrics.errors, 'Selection must not regress error count');
    assert.ok(!result.selected.metrics.findings.some(f => f.kind === 'missing-content'));
    const png = renderPng(result.selected.design);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    cases++;
  }
}
console.log(`${cases} layouts verified with native font metrics and PNG rendering. This is not a browser or Adobe integration test.`);
