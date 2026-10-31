import { test, expect } from '@playwright/test';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const MiB = 1024 * 1024;
const budgets = { raw: 2 * MiB, gzip: 1.5 * MiB, startup: 3000, feedback: 100, interactionLongTask: 50, heap: 64 * MiB, heapGrowth: 5 * MiB, summedRss: 1024 * MiB };
type Sample = { at: number; heap: number; summedRss: number; nodes: number };

test('built viewer works with external networking denied and records resource budgets', async ({ page, browser }) => {
  const out = 'reports/completion/C/production'; await mkdir(out, { recursive: true });
  const report: Record<string, any> = { budgets, sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), environment: { cpu: os.cpus()[0].model, memoryBytes: os.totalmem(), os: os.release(), chromium: browser.version(), node: process.version }, methods: { network: 'Browser context proxy http://127.0.0.1:9; loopback bypass; no request interception during measurements', startup: 'Node monotonic time around navigation/reload through html[data-ready=true], including Playwright overhead', memory: '250ms requested sampling; page JS heap excludes workers/native/browser; owned Chromium summed RSS double-counts shared pages; sampled maximum only', pairedGrowth: 'GC before baseline and after20 edits; same fixture/copy/mode/overlay restored', package: 'Raw and sum-of-per-file gzip bytes, not transferred bytes; embedded image bytes are part of JS totals' } };
  const files: { path: string; bytes: number; gzip: number; sha256: string }[] = [];
  async function inventory(dir: string) { for (const item of await readdir(dir, { withFileTypes: true })) { const path = `${dir}/${item.name}`; if (item.isDirectory()) await inventory(path); else { const bytes = await readFile(path); files.push({ path: path.slice(5), bytes: bytes.length, gzip: gzipSync(bytes).length, sha256: createHash('sha256').update(bytes).digest('hex') }); } } }
  await inventory('dist'); report.files = files;
  report.raw = files.reduce((n, f) => n + f.bytes, 0); report.gzip = files.reduce((n, f) => n + f.gzip, 0);
  expect(files.every(f => /^(index\.html|assets\/[^/]+\.(js|css|woff2?))$/.test(f.path))).toBe(true);
  const cdp = await page.context().newCDPSession(page), browserCdp = await browser.newBrowserCDPSession();
  await cdp.send('Performance.enable'); await cdp.send('Network.enable'); await cdp.send('Network.clearBrowserCache');
  await page.addInitScript(() => {
    (window as any).qualificationLongTasks = [];
    new PerformanceObserver(list => { for (const e of list.getEntries()) (window as any).qualificationLongTasks.push({ startTime: e.startTime, duration: e.duration }); }).observe({ type: 'longtask', buffered: true });
  });
  const networkFailures: { url: string; error: string }[] = [];
  const externalRequests: string[] = [];
  page.context().on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4188') externalRequests.push(request.url()); });
  page.on('requestfailed', request => networkFailures.push({ url: request.url(), error: request.failure()?.errorText ?? '' }));
  const samples: Sample[] = []; let sampling = false, sampleError: string | undefined;
  async function sample() {
    const [metrics, processes, dom] = await Promise.all([cdp.send('Performance.getMetrics'), browserCdp.send('SystemInfo.getProcessInfo'), cdp.send('Memory.getDOMCounters')]);
    const ids = processes.processInfo.map((p: { id: number }) => p.id).join(',');
    const rss = execFileSync('ps', ['-o', 'rss=', '-p', ids], { encoding: 'utf8' }).trim().split(/\s+/).reduce((n, v) => n + Number(v), 0) * 1024;
    const value = { at: performance.now(), heap: metrics.metrics.find((m: { name: string }) => m.name === 'JSHeapUsedSize')!.value, summedRss: rss, nodes: dom.nodes };
    samples.push(value); return value;
  }
  const timer = setInterval(() => { if (sampling) return; sampling = true; void sample().catch(error => { sampleError = String(error); }).finally(() => { sampling = false; }); }, 250);
  try {
    const startups: number[] = []; const startupLongTasks: unknown[] = [];
    for (let i = 0; i < 3; i++) { const start = performance.now(); if (i) await page.reload(); else await page.goto('/'); await page.locator('html[data-ready=true]').waitFor(); startups.push(performance.now() - start); startupLongTasks.push(await page.evaluate(() => (window as any).qualificationLongTasks)); }
    report.startups = startups; report.startupLongTasks = startupLongTasks; report.longTaskWindow = 'last reload through the post-ready interaction window; each startup separately retained above'; report.startupDefinitions = ['new context, HTTP cache cleared before navigation', 'same-context reload', 'same-context reload'];
    const interactionStart = await page.evaluate(() => performance.now());
    const fixtures = await page.evaluate(() => window.reflowLab.fixtures.map(f => ({ id: f.id, name: f.name })));
    for (const fixture of fixtures) { await page.locator('#fixture').selectOption(fixture.id); await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false'); await expect(page.locator('#design-title')).toHaveText(fixture.name); }
    await page.locator('#fixture').selectOption('type-pairing'); await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
    const edit = async (text: string) => { await page.locator('#headline').fill(text); const feedback = await page.evaluate(() => { const start = performance.now(); document.querySelector<HTMLElement>('#update-copy')!.click(); return document.querySelector('#request-status')!.textContent!.includes('Updating') ? performance.now() - start : Infinity; }); await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false'); return feedback; };
    const feedbacks = [await edit('Memory sample')];
    await cdp.send('HeapProfiler.collectGarbage'); const before = await sample(); const checkpoints = [before];
    for (let i = 0; i < 20; i++) { feedbacks.push(await edit(`Iteration ${String(i).padStart(2, '0')}`)); if ((i + 1) % 5 === 0) { await cdp.send('HeapProfiler.collectGarbage'); checkpoints.push(await sample()); } }
    feedbacks.push(await edit('Memory sample')); await cdp.send('HeapProfiler.collectGarbage'); const after = await sample();
    report.feedbacks = feedbacks; report.memoryCheckpoints = checkpoints; report.pairedMemory = { before, after, iterations: 20, restoredCopy: 'Memory sample', fixture: 'type-pairing', mode: 'selected', overlay: false };
    await page.locator('#mode-baseline').click(); await expect(page.locator('#mode-baseline')).toHaveAttribute('aria-pressed', 'true'); await page.locator('#mode-selected').click();
    const jsonDownload = page.waitForEvent('download'); await page.locator('#export').click();
    const campaignDownload = await jsonDownload;
    const campaign = JSON.parse(await readFile((await campaignDownload.path())!, 'utf8'));
    expect(campaign.source.elements.find((e: { id: string }) => e.id === 'headline').text).toBe('Memory sample'); expect(campaign.variants).toHaveLength(3);
    const svgDownload = page.waitForEvent('download'); await page.locator('.export-svg-btn').first().click(); const svg = await readFile((await (await svgDownload).path())!, 'utf8'); expect(svg).toContain('data:font/woff2;base64,');
    report.exports = { jsonVariants: campaign.variants.length, svgBytes: Buffer.byteLength(svg), embeddedFonts: true };
    report.longTasks = await page.evaluate(() => (window as any).qualificationLongTasks);
    report.interactionStart = interactionStart; report.interactionEnd = await page.evaluate(() => performance.now());
    report.interactionLongTasks = report.longTasks.filter((e: { startTime: number }) => e.startTime >= interactionStart);
    await page.screenshot({ path: `${out}/workbench.png` });
    clearInterval(timer); while (sampling) await new Promise(resolve => setTimeout(resolve, 10));
    report.samples = samples; report.sampleError = sampleError;
    report.maxHeap = Math.max(...samples.map(s => s.heap)); report.maxSummedRss = Math.max(...samples.map(s => s.summedRss)); report.heapGrowth = Math.max(0, after.heap - before.heap);
    report.functionalExternalRequests = [...externalRequests]; expect(externalRequests).toEqual([]);
    // Deliberate network negative: this must fail through the configured proxy.
    await page.evaluate(async () => { try { await fetch('https://example.invalid/qualification-probe'); } catch {} });
    expect(networkFailures.some(f => f.url.includes('example.invalid') && /PROXY|TUNNEL/.test(f.error))).toBe(true);
    report.forbiddenNetworkControl = networkFailures.filter(f => f.url.includes('example.invalid'));
    // Image resources are embedded; this checks unavailable runtime asset resolution.
    const original = await page.evaluate(() => { const f = window.reflowLab.fixtures.find(f => f.id === 'edge-subject')!; const original = structuredClone(f); f.elements.find(e => e.type === 'image')!.assetId = 'missing-production-asset'; return original; });
    await page.locator('#fixture').selectOption('edge-subject'); await expect(page.locator('#update-error')).toContainText('Update not applied');
    await page.evaluate(original => Object.assign(window.reflowLab.fixtures.find(f => f.id === original.id)!, original), original);
    await page.locator('#fixture').selectOption('edge-subject'); await expect(page.locator('#request-status')).toHaveText('Layout updated.'); report.missingAssetReferenceRecovered = true;
    await page.route('**/*.woff*', route => route.abort('failed')); await page.reload(); await expect(page.locator('h1')).toHaveText('Reflow Studio could not start');
    await page.unroute('**/*.woff*'); await page.reload(); await page.locator('html[data-ready=true]').waitFor(); report.missingFontRestartRecovered = true;
    await page.route('**/assets/layout-worker-*.js', route => route.abort('failed'));
    await page.locator('#fixture').selectOption('type-pairing'); await expect(page.locator('#update-error')).toContainText('Update not applied');
    await page.unroute('**/assets/layout-worker-*.js'); await page.locator('#retry-layout').click(); await expect(page.locator('#request-status')).toHaveText('Layout updated.'); report.missingWorkerRecovered = true;
    const violations = (raw = report.raw) => [raw > budgets.raw && 'raw package', report.gzip > budgets.gzip && 'gzip package', Math.max(...startups) > budgets.startup && 'startup', Math.max(...feedbacks) > budgets.feedback && 'feedback', report.interactionLongTasks.some((e: { duration: number }) => e.duration > budgets.interactionLongTask) && 'interaction long task', report.maxHeap > budgets.heap && 'page heap sampled maximum', report.maxSummedRss > budgets.summedRss && 'summed RSS sampled maximum', report.heapGrowth > budgets.heapGrowth && 'paired heap growth', sampleError && 'memory sampling error'].filter(Boolean);
    expect(violations(budgets.raw + 1)).toContain('raw package'); expect(violations()).not.toContain('raw package');
    report.intentionalBudgetControl = { exceededRawDetected: true, restoredRawPasses: true }; report.violations = violations();
    await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
    expect(report.violations).toEqual([]);
  } finally { clearInterval(timer); report.networkFailures = networkFailures; report.samples = samples; await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2)); }
});
