import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('presentation toggles reuse layouts while real copy edits recompute', async ({ page }) => {
  await page.goto('/');
  await page.locator('html[data-ready=true]').waitFor();
  const result = await page.evaluate(async () => {
    (Error as unknown as { stackTraceLimit: number }).stackTraceLimit = 100;
    const original = CanvasRenderingContext2D.prototype.measureText;
    const post = Worker.prototype.postMessage;
    let workerRequests = 0;
    Worker.prototype.postMessage = function(message: unknown, options?: Transferable[] | StructuredSerializeOptions) { workerRequests++; return post.call(this, message, options as StructuredSerializeOptions); };
    let layoutMeasures = 0;
    CanvasRenderingContext2D.prototype.measureText = function(text: string) {
      if (new Error().stack?.includes('reflowMany')) layoutMeasures++;
      return original.call(this, text);
    };
    try {
      document.querySelector<HTMLButtonElement>('#mode-baseline')!.click();
      const baseline = document.querySelector('#mode-baseline')!.getAttribute('aria-pressed') === 'true' && document.querySelector('#summary-description')!.textContent!.includes('Uniform scaling');
      document.querySelector<HTMLButtonElement>('#mode-selected')!.click();
      const toggle = document.querySelector<HTMLInputElement>('#show-issues')!;
      toggle.checked = true; toggle.dispatchEvent(new Event('change'));
      const presentation = layoutMeasures;
      document.querySelector<HTMLTextAreaElement>('#headline')!.value = 'A changed supported headline';
      document.querySelector<HTMLElement>('#update-copy')!.click();
      while (document.querySelector('#canvas-grid')!.getAttribute('aria-busy') === 'true') await new Promise(resolve => setTimeout(resolve, 10));
      const edit = layoutMeasures - presentation + workerRequests;
      let exported: Blob | undefined;
      const create = URL.createObjectURL;
      const click = HTMLAnchorElement.prototype.click;
      URL.createObjectURL = value => { if (value instanceof Blob) exported = value; return create(value); };
      HTMLAnchorElement.prototype.click = function() {};
      try {
        document.querySelector<HTMLElement>('#export')!.click();
        const campaign = JSON.parse(await exported!.text());
        const texts = [campaign.source, ...campaign.variants.map((variant: { design: unknown }) => variant.design)]
          .map((design: { elements: { id: string; text: string }[] }) => design.elements.find(e => e.id === 'headline')!.text);
        return { presentation, edit, baseline, texts };
      } finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
    } finally { CanvasRenderingContext2D.prototype.measureText = original; Worker.prototype.postMessage = post; }
  });
  await mkdir('reports/completion/C', { recursive: true });
  await writeFile('reports/completion/C/toggle-counts.json', JSON.stringify(result, null, 2));
  expect(result.edit, 'positive control: a real edit must recompute layouts').toBeGreaterThan(0);
  expect(result.presentation, 'presentation-only controls must not recompute layouts').toBe(0);
  expect(result.baseline).toBe(true);
  expect(result.texts.length).toBe(4);
  expect(result.texts.every(text => text === 'A changed supported headline')).toBe(true);
});

test('worker canvas matches main-thread bundled font metrics before request migration', async ({ page }) => {
  await page.goto('/');
  await page.locator('html[data-ready=true]').waitFor();
  const result = await page.evaluate(async () => {
    const modulePath = '/src/svg-export.ts';
    const { browserExportFonts } = await import(/* @vite-ignore */ modulePath) as typeof import('../../src/svg-export');
    const faces = browserExportFonts();
    const samples = faces.filter((face, i) => faces.findIndex(f => f.family === face.family && f.weight === face.weight) === i)
      .map(face => ({ font: `${face.weight} 32px "${face.family}"`, text: 'Headline Ångström café 123 Ελληνικά' }));
    await Promise.all(samples.map(sample => document.fonts.load(sample.font, sample.text)));
    const ctx = document.createElement('canvas').getContext('2d')!;
    const metrics = samples.map(sample => {
      ctx.font = sample.font;
      const m = ctx.measureText(sample.text);
      return [m.width, m.actualBoundingBoxAscent, m.actualBoundingBoxDescent, m.fontBoundingBoxAscent, m.fontBoundingBoxDescent];
    });
    const code = `onmessage = async ({ data }) => {
      try {
        for (const f of data.faces) {
          const face = new FontFace(f.family, 'url("' + f.url + '")', { weight: String(f.weight), unicodeRange: f.unicodeRange });
          await face.load(); fonts.add(face);
        }
        const ctx = new OffscreenCanvas(1,1).getContext('2d');
        postMessage({ metrics: data.samples.map(sample => {
          ctx.font = sample.font; const m = ctx.measureText(sample.text);
          return [m.width, m.actualBoundingBoxAscent, m.actualBoundingBoxDescent, m.fontBoundingBoxAscent, m.fontBoundingBoxDescent];
        }) });
      } catch (error) { postMessage({ error: String(error) }); }
    }`;
    const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
    const worker = new Worker(url);
    try {
      const reply = await new Promise<{ metrics?: number[][]; error?: string }>((resolve, reject) => {
        worker.onmessage = event => resolve(event.data); worker.onerror = reject;
        worker.postMessage({ faces, samples });
      });
      return { metrics, reply, samples, faceCount: faces.length };
    } finally { worker.terminate(); URL.revokeObjectURL(url); }
  });
  await mkdir('reports/completion/C', { recursive: true });
  await writeFile('reports/completion/C/worker-font-capability.json', JSON.stringify(result, null, 2));
  expect(result.reply.error).toBeUndefined();
  expect(result.reply.metrics).toEqual(result.metrics);
});

test('layout edits offer keyboard cancellation and preserve the committed export', async ({ page }) => {
  await page.goto('/');
  await page.locator('html[data-ready=true]').waitFor();
  await page.route('**/src/layout-worker.ts*', async route => { await new Promise(resolve => setTimeout(resolve, 1000)); await route.continue(); });
  await page.locator('#headline').fill('Pending revision should not be exported');
  await page.locator('#update-copy').click();
  await expect(page.locator('#cancel-layout')).toBeVisible();
  await page.locator('#cancel-layout').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#request-status')).toContainText('cancelled');
  await expect(page.locator('.original-card')).not.toContainText('Pending revision should not be exported');
});

for (const copy of ['Café Ā Ł Ω Ж ệ', 'ΩΩΩ', 'ЖЖЖ']) test(`actual layout worker preserves supported serif and non-Latin results: ${copy}`, async ({ page }) => {
  await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
  const result = await page.evaluate(async copy => {
    const paths = ['/src/svg-export.ts', '/src/reflow-targets.ts', '/src/typography.ts', '/src/evaluate.ts'];
    const [{ browserExportFonts }, { reflowMany }, { browserMeasure }, { evaluate }] = await Promise.all(paths.map(path => import(/* @vite-ignore */ path)));
    const source = structuredClone(window.reflowLab.fixtures.find(f => f.id === 'type-pairing')!);
    for (const e of source.elements) if (e.type === 'text') e.text = copy;
    await Promise.all(source.elements.filter(e => e.type === 'text').map(e => document.fonts.load(`${e.fontWeight} ${e.fontSize}px "${e.fontFamily}"`, `${e.text} Ágj`)));
    const measure = browserMeasure();
    const expected = { batch: reflowMany(source, window.reflowLab.targets, measure), originalMetrics: evaluate(source, source, measure) };
    const worker = new Worker('/src/layout-worker.ts', { type: 'module' });
    try {
      const actual = await new Promise<any>((resolve, reject) => {
        worker.onmessage = event => { if (event.data.error) reject(new Error(event.data.error)); else if (event.data.result) resolve(event.data.result); };
        worker.onerror = reject;
        worker.postMessage({ source, targets: window.reflowLab.targets, faces: browserExportFonts() });
      });
      const clean = (value: unknown) => JSON.parse(JSON.stringify(value, (key, value) => key === 'elapsedMs' ? undefined : value));
      return { expected: clean(expected), actual: clean(actual) };
    } finally { worker.terminate(); }
  }, copy);
  await mkdir('reports/completion/C', { recursive: true });
  await writeFile('reports/completion/C/actual-worker-parity.json', JSON.stringify(result, null, 2));
  expect(result.actual).toEqual(result.expected);
});

// Fixed before timing: 100 supported text elements × 1,000 characters, within schema bounds.
// Browser worker destruction is the stop oracle; UI acknowledgment alone cannot pass.
test('dense request cancellation destroys the computing worker and keeps controls responsive', async ({ page }) => {
  await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
  const original = await page.evaluate(() => {
    const fixture = window.reflowLab.fixtures.find(f => f.id === 'type-pairing')!;
    const original = structuredClone(fixture);
    const text = fixture.elements.find(e => e.type === 'text')!;
    fixture.groups = [];
    fixture.elements = Array.from({ length: 100 }, (_, i) => ({ ...text, id: i ? `dense-${i}` : 'headline', groupId: undefined, text: 'Supported local text '.repeat(50).slice(0, 1000) }));
    return original;
  });
  const samples: { feedbackMs: number; ackMs: number; destroyedMs: number }[] = [];
  for (let trial = 0; trial < 3; trial++) {
    const created = page.waitForEvent('worker');
    const feedbackMs = await page.evaluate(() => {
      const start = performance.now();
      const select = document.querySelector<HTMLSelectElement>('#fixture')!;
      select.value = 'type-pairing'; select.dispatchEvent(new Event('change'));
      return document.querySelector('#request-status')!.textContent!.includes('Updating') ? performance.now() - start : Infinity;
    });
    const worker = await created;
    await expect(page.locator('#request-status')).toContainText('Calculating');
    let closedAt = 0;
    const closed = new Promise<void>(resolve => worker.once('close', () => { closedAt = performance.now(); resolve(); }));
    const start = performance.now();
    const ackMs = await page.evaluate(() => {
      const start = performance.now();
      document.querySelector<HTMLButtonElement>('#cancel-layout')!.click();
      return document.querySelector('#request-status')!.textContent!.includes('cancelled') ? performance.now() - start : Infinity;
    });
    await closed;
    samples.push({ feedbackMs, ackMs, destroyedMs: closedAt - start });
    await expect(page.locator('#design-title')).not.toHaveText(original.name);
  }
  await page.evaluate(original => { Object.assign(window.reflowLab.fixtures.find(f => f.id === original.id)!, original); }, original);
  const healthyStart = performance.now();
  await page.locator('#fixture').selectOption(original.id);
  await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#design-title')).toHaveText(original.name);
  await expect(page.locator('#request-status')).toHaveText('Layout updated.');
  await mkdir('reports/completion/C', { recursive: true });
  await writeFile('reports/completion/C/dense-cancellation.json', JSON.stringify({ workload: { elements: 100, charactersEach: 1000 }, samples, healthyRecoveryMs: performance.now() - healthyStart, browser: page.context().browser()!.version() }, null, 2));
  for (const sample of samples) {
    expect(sample.feedbackMs).toBeLessThan(100);
    expect(sample.ackMs).toBeLessThan(250);
    expect(sample.destroyedMs).toBeLessThan(3000);
  }
});

test('worker destruction clock has an idle and busy control independent of layout', async ({ page }) => {
  await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
  const samples: { mode: string; closedMs: number }[] = [];
  for (const mode of ['idle', 'busy']) {
    const created = page.waitForEvent('worker');
    await page.evaluate(async mode => {
      const code = `postMessage('ready'); ${mode === 'busy' ? 'while(true) {}' : ''}`;
      const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      (window as any).probeWorker = new Worker(url);
      (window as any).probeUrl = url;
      await new Promise<void>(resolve => { (window as any).probeWorker.onmessage = () => resolve(); });
    }, mode);
    const worker = await created;
    const closed = new Promise<void>(resolve => worker.once('close', () => resolve()));
    const start = performance.now();
    await page.evaluate(() => { (window as any).probeWorker.terminate(); URL.revokeObjectURL((window as any).probeUrl); });
    await closed;
    samples.push({ mode, closedMs: performance.now() - start });
  }
  await writeFile('reports/completion/C/worker-destruction-clock.json', JSON.stringify(samples, null, 2));
});

test('no-terminate negative control acknowledges cancel but keeps computing', async ({ page }) => {
  await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
  await page.route('**/src/layout-worker.ts*', async route => {
    const response = await route.fetch();
    const probe = `let probeCalls=0; const probeMeasure=OffscreenCanvasRenderingContext2D.prototype.measureText;
      OffscreenCanvasRenderingContext2D.prototype.measureText=function(text){
        if(++probeCalls%1000===0) { const delay=performance.now()+2; while(performance.now()<delay) {} postMessage({__measurementProgress:probeCalls}); }
        return probeMeasure.call(this,text);
      };`;
    await route.fulfill({ response, body: probe + await response.text() });
  });
  await page.evaluate(() => {
    const fixture = window.reflowLab.fixtures.find(f => f.id === 'type-pairing')!;
    const text = fixture.elements.find(e => e.type === 'text')!;
    fixture.groups = [];
    fixture.elements = Array.from({ length: 100 }, (_, i) => ({ ...text, id: i ? `dense-${i}` : 'headline', groupId: undefined, text: 'Supported local text '.repeat(50).slice(0, 1000) }));
    const NativeWorker = window.Worker;
    const retained: Worker[] = [];
    (window as any).measurementProgress = [];
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options); retained.push(this);
        this.addEventListener('message', event => {
          if (event.data.__measurementProgress) {
            (window as any).measurementProgress.push({ at: performance.now(), calls: event.data.__measurementProgress });
            event.stopImmediatePropagation();
          }
        });
      }
      terminate() {}
    };
    (window as any).restoreTermination = () => { window.Worker = NativeWorker; retained.forEach(worker => NativeWorker.prototype.terminate.call(worker)); };
  });
  const created = page.waitForEvent('worker');
  await page.locator('#fixture').selectOption('type-pairing');
  const worker = await created;
  await expect(page.locator('#request-status')).toContainText('Calculating');
  let destroyed = false;
  worker.once('close', () => { destroyed = true; });
  const cancelledAt = await page.evaluate(() => { document.querySelector<HTMLButtonElement>('#cancel-layout')!.click(); return performance.now(); });
  await expect(page.locator('#request-status')).toContainText('cancelled');
  await page.waitForTimeout(3100);
  const progress = await page.evaluate(() => (window as any).measurementProgress as { at: number; calls: number }[]);
  const observed = { acknowledged: true, destroyedWithin3100ms: destroyed, deliberateControlDelay: '2ms per1000 measurements plus terminate disabled', cancelledAt, progressAfterCancel: progress.filter(sample => sample.at > cancelledAt) };
  await page.evaluate(() => (window as any).restoreTermination());
  await writeFile('reports/completion/C/no-terminate-control.json', JSON.stringify(observed, null, 2));
  expect(observed.destroyedWithin3100ms).toBe(false);
  expect(observed.progressAfterCancel.some(sample => sample.at > cancelledAt + 3000)).toBe(true);
});

test('healthy first and repeated requests record latency and latest revision wins', async ({ page }) => {
  const startupStart = performance.now();
  await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
  const freshContextStartupMs = performance.now() - startupStart;
  const samples: { trial: number; resourceCache: string; elapsedMs: number }[] = [];
  for (let trial = 0; trial < 4; trial++) {
    await page.locator('#headline').fill(`Healthy request ${trial}`);
    const start = performance.now();
    await page.locator('#update-copy').click();
    await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('.original-card')).toContainText(new RegExp(`Healthy\\s*request\\s*${trial}`));
    samples.push({ trial, resourceCache: trial ? 'repeated edit, same context, fresh worker' : 'first measured edit after app ready', elapsedMs: performance.now() - start });
  }
  await page.evaluate(() => {
    const input = document.querySelector<HTMLTextAreaElement>('#headline')!;
    input.value = 'Superseded revision'; document.querySelector<HTMLElement>('#update-copy')!.click();
    input.value = 'Latest revision'; document.querySelector<HTMLElement>('#update-copy')!.click();
  });
  await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.original-card')).toContainText(/Latest\s*revision/);
  await expect(page.locator('.original-card')).not.toContainText(/Superseded\s*revision/);
  await writeFile('reports/completion/C/healthy-latency.json', JSON.stringify({ freshContextStartupMs, samples, note: 'Fresh Playwright context for startup; server/OS caches are not reset. Four edit samples after app ready; each creates a fresh worker. Repeated edits reuse the browser context; cache hits are not directly measured. Timing includes Playwright interaction/expect overhead. No percentile or general runtime guarantee.' }, null, 2));
});

test('failed requests retry with the keyboard and cancelled edits revert all controls', async ({ page }) => {
  await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
  await page.route('**/src/layout-worker.ts*', route => route.abort('failed'));
  await page.locator('#fixture').selectOption('type-pairing');
  await expect(page.locator('#update-error')).toContainText('Update not applied');
  await expect(page.locator('[data-retained]')).toBeVisible();
  await page.unroute('**/src/layout-worker.ts*');
  await page.locator('#retry-layout').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#request-status')).toHaveText('Layout updated.');
  await expect(page.locator('#design-title')).toHaveText('Two voices, one design');
  const headline = await page.locator('#headline').inputValue();
  await page.evaluate(() => {
    document.querySelector<HTMLTextAreaElement>('#headline')!.value = 'Unapplied copy';
    document.querySelector<HTMLInputElement>('#custom-width')!.value = '123';
    document.querySelector<HTMLInputElement>('#custom-height')!.value = '456';
    document.querySelector<HTMLElement>('#custom-apply')!.click();
    document.querySelector<HTMLButtonElement>('#cancel-layout')!.click();
  });
  await page.locator('#revert-layout').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#headline')).toHaveValue(headline);
  await expect(page.locator('#custom-width')).toHaveValue('1600');
  await expect(page.locator('#custom-height')).toHaveValue('600');
  await expect(page.locator('#request-status')).toContainText('reverted');
  await page.screenshot({ path: 'reports/completion/C/recovered-workbench.png' });
});

test('newly loaded font subsets leave a reusable committed presentation cache', async ({ page }) => {
  await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
  await page.evaluate(() => {
    const fixture = window.reflowLab.fixtures.find(f => f.id === 'type-pairing')!;
    for (const e of fixture.elements) if (e.type === 'text') e.text = 'Café Ā Ł Ω Ж ệ';
  });
  await page.locator('#fixture').selectOption('type-pairing');
  await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
  const calls = await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => setTimeout(resolve, 0));
    (Error as unknown as { stackTraceLimit: number }).stackTraceLimit = 100;
    const original = CanvasRenderingContext2D.prototype.measureText;
    let calls = 0;
    CanvasRenderingContext2D.prototype.measureText = function(text) { if (new Error().stack?.includes('reflowMany')) calls++; return original.call(this, text); };
    try { document.querySelector<HTMLButtonElement>('#mode-baseline')!.click(); return calls; }
    finally { CanvasRenderingContext2D.prototype.measureText = original; }
  });
  await writeFile('reports/completion/C/font-boundary-cache.json', JSON.stringify({ layoutMeasurementsOnPresentation: calls }, null, 2));
  expect(calls).toBe(0);
});

test('real worker deadline stops busy computation, retains export, and retries', async ({ page }) => {
  await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
  const capture = () => page.evaluate(async () => {
    let blob: Blob | undefined; const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
    URL.createObjectURL = value => { if (value instanceof Blob) blob = value; return create(value); };
    HTMLAnchorElement.prototype.click = function() {};
    try { document.querySelector<HTMLElement>('#export')!.click(); return JSON.parse(await blob!.text()); }
    finally { URL.createObjectURL = create; HTMLAnchorElement.prototype.click = click; }
  });
  const before = await capture();
  await page.route('**/src/layout-worker.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `postMessage({stage:'deadline-control-busy'}); const stopAt=performance.now()+20000; while(performance.now()<stopAt) {}\n` + await response.text() });
  });
  const created = page.waitForEvent('worker');
  await page.locator('#headline').fill('Recovered after deadline');
  const started = performance.now();
  await page.locator('#update-copy').click();
  const worker = await created;
  const closed = new Promise<number>(resolve => worker.once('close', () => resolve(performance.now() - started)));
  await expect(page.locator('#request-status')).toContainText('deadline-control-busy');
  await expect(page.locator('#update-error')).toContainText('exceeded', { timeout: 16000 });
  await expect(page.locator('[data-retained]')).toBeVisible();
  const closedMs = await closed;
  expect(await capture()).toEqual(before);
  await page.screenshot({ path: 'reports/completion/C/deadline-retained.png' });
  await page.unroute('**/src/layout-worker.ts*');
  await page.locator('#retry-layout').click();
  await expect(page.locator('#request-status')).toHaveText('Layout updated.');
  expect((await capture()).source.elements.find((e: { id: string }) => e.id === 'headline').text).toBe('Recovered after deadline');
  await writeFile('reports/completion/C/actual-deadline.json', JSON.stringify({ deliberateBusyWorkMs: 20000, deadlineMs: 10000, observedWorkerCloseMs: closedMs, retainedExportEqual: true, retryRecovered: true }, null, 2));
  expect(closedMs).toBeLessThan(14000);
});

test('HTTP-cache-cleared and repeated healthy request latencies are recorded', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.clearBrowserCache');
  const startup = performance.now();
  await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
  const startupMs = performance.now() - startup;
  await cdp.send('Network.clearBrowserCache');
  const samples: { cacheState: string; elapsedMs: number }[] = [];
  for (let i = 0; i < 4; i++) {
    await page.locator('#headline').fill(`Timing ${i}`);
    const start = performance.now(); await page.locator('#update-copy').click();
    await expect(page.locator('#request-status')).toHaveText('Layout updated.');
    await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
    samples.push({ cacheState: i ? 'same context repeated request after preceding request' : 'browser HTTP cache explicitly cleared immediately before this edit', elapsedMs: performance.now() - start });
  }
  await writeFile('reports/completion/C/cold-warm-latency.json', JSON.stringify({ startupMs, startupState: 'new context; Network.clearBrowserCache before navigation', samples, method: 'CDP Network.clearBrowserCache before startup and first edit only. Fresh worker per edit. OS/server/compiled-code caches are not reset; no universal cold-machine or percentile claim. Timing includes Playwright overhead.' }, null, 2));
});
