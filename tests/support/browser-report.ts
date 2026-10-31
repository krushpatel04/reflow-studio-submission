import assert from 'node:assert/strict';

// Minimum contract, so a blank/partial acceptance page cannot produce a green CI run.
export const REQUIRED_BROWSER_CHECKS = [
  'All ten fixtures render four preview cards',
  'Baseline toggle changes comparison mode and selected state',
  'Edited copy reaches every variant and the JSON export',
  'Custom dimensions reject zero and accept 1600 × 600',
  'Theme toggle updates both workspace and Spectrum theme',
  'Issue overlay renders diagnostics for oversized source copy',
  'Browser benchmark completes all thirty rows',
  'Nearby resizes preserve composition and image frames with browser fonts',
  'Mixed-role badge glyphs remain inside their dark backing',
  'Independent SVG glyph bounds remain inside selected text boxes',
  'Browser and native font engines agree on layoutText line breaks for the font-parity probe corpus',
  'Browser SVG and native PNG crops agree on hand-computed image samples and clip to the frame',
  'Browser and native rendered visibility reach the same verdict on every defect-pack case',
  'No startup errors, uncaught exceptions, or error overlay',
] as const;

type BrowserReport = { generatedAt: string; browser: string; passed: number; total: number;
  checks: { name: string; passed: boolean; detail?: string }[]; errors: unknown[]; inkFindings: unknown[];
  lineBreakFindings: unknown[]; fontParityDeltas: unknown[]; cropFindings: unknown[]; renderedFindings: unknown[] };

export function assertBrowserReport(value: unknown): asserts value is BrowserReport {
  assert.ok(value && typeof value === 'object', 'Missing browser report');
  const report = value as Partial<BrowserReport>;
  assert.ok(typeof report.generatedAt === 'string' && Number.isFinite(Date.parse(report.generatedAt)), 'Missing report timestamp');
  assert.ok(typeof report.browser === 'string' && report.browser.length > 0, 'Missing browser identity');
  assert.ok(Array.isArray(report.checks), 'Missing browser checks');
  assert.ok(report.checks.every(c => c && typeof c.name === 'string' && c.passed === true),
    `Browser acceptance failed: ${JSON.stringify(report.checks.filter(c => !c || c.passed !== true))}`);
  const names = report.checks.map(c => c.name);
  assert.equal(new Set(names).size, names.length, 'Duplicate browser checks');
  for (const name of REQUIRED_BROWSER_CHECKS) assert.ok(names.includes(name), `Missing required browser check: ${name}`);
  assert.equal(report.total, names.length, 'Incomplete check count');
  assert.equal(report.passed, report.total, 'Not all checks passed');
  assert.deepEqual(report.errors, [], 'Browser reported uncaught errors');
  assert.deepEqual(report.inkFindings, [], 'Browser reported glyph-bound failures');
  assert.ok(Array.isArray(report.fontParityDeltas), 'Missing font-parity delta observations');
  assert.deepEqual(report.lineBreakFindings, [], 'Browser and native font engines disagreed on line breaks');
  assert.deepEqual(report.cropFindings, [], 'Browser and native crops disagreed');
  assert.deepEqual(report.renderedFindings, [], 'Browser and native rendered visibility disagreed');
}
