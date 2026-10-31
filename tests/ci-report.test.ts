import test from 'node:test';
import assert from 'node:assert/strict';
import { assertBrowserReport, REQUIRED_BROWSER_CHECKS } from './support/browser-report';

const healthy = (): { generatedAt: string; browser: string; total: number; passed: number; checks: { name: string; passed: boolean }[]; errors: string[]; inkFindings: unknown[]; lineBreakFindings: unknown[]; fontParityDeltas: unknown[]; cropFindings: unknown[]; renderedFindings: unknown[] } => ({ generatedAt: new Date(0).toISOString(), browser: 'Chromium test',
  total: REQUIRED_BROWSER_CHECKS.length, passed: REQUIRED_BROWSER_CHECKS.length,
  checks: REQUIRED_BROWSER_CHECKS.map(name => ({ name, passed: true })), errors: [], inkFindings: [], lineBreakFindings: [], fontParityDeltas: [], cropFindings: [], renderedFindings: [] });

test('browser gate accepts a complete healthy report and additional passing checks', () => {
  const report = healthy();
  assertBrowserReport(report);
  report.checks.push({ name: 'Another actual acceptance check', passed: true }); report.total++; report.passed++;
  assertBrowserReport(report);
});
for (const [name, mutate] of [
  ['empty success', (r: ReturnType<typeof healthy>) => { r.checks = []; r.passed = r.total = 0; }],
  ['failed glyph check hidden by summary', (r: ReturnType<typeof healthy>) => { r.checks[8].passed = false; }],
  ['missing required check', (r: ReturnType<typeof healthy>) => { r.checks.pop(); r.total--; r.passed--; }],
  ['duplicate check', (r: ReturnType<typeof healthy>) => { r.checks.push(r.checks[0]); r.total++; r.passed++; }],
  ['wrong count', (r: ReturnType<typeof healthy>) => { r.total++; }],
] as const) test(`browser gate rejects ${name}`, () => {
  const report = healthy(); mutate(report); assert.throws(() => assertBrowserReport(report));
});
test('browser gate rejects uncaught errors, ink findings and malformed reports', () => {
  for (const report of [null, {}, { ...healthy(), errors: ['Uncaught exception'] }, { ...healthy(), inkFindings: [{ element: 'label' }] },
    { ...healthy(), lineBreakFindings: [{ id: 'probe/repeated-whitespace' }] },
    { ...healthy(), cropFindings: [{ probe: 'cover-tall-edge-subject' }] }, { ...healthy(), cropFindings: undefined },
    { ...healthy(), renderedFindings: [{ case: 'label-off-plate' }] }, { ...healthy(), renderedFindings: undefined },
    { ...healthy(), checks: 'not checks' }, { ...healthy(), errors: undefined }, { ...healthy(), browser: '' }]) {
    assert.throws(() => assertBrowserReport(report));
  }
});
