import { test, expect } from '@playwright/test';

test('unused broken fonts do not block layout; used missing fonts remain visible errors', async ({ page }) => {
  await page.goto('/'); await page.locator('html[data-ready=true]').waitFor();
  const result = await page.evaluate(async () => {
    const path = '/src/svg-export.ts';
    const { browserExportFonts } = await import(/* @vite-ignore */ path);
    const source = structuredClone(window.reflowLab.fixtures[0]);
    const faces = browserExportFonts();
    const run = async (faces: unknown[]) => {
      const worker = new Worker('/src/layout-worker.ts', { type: 'module' });
      try {
        return await new Promise<any>((resolve, reject) => {
          worker.onmessage = e => { if (e.data.result || e.data.error) resolve(e.data); };
          worker.onerror = reject;
          worker.postMessage({ source, targets: window.reflowLab.targets, faces });
        });
      } finally { worker.terminate(); }
    };
    const unused = { family: 'Unused', weight: 400, unicodeRange: 'U+0-10FFFF', url: `${location.origin}/missing-font.woff2` };
    const clean = (x: unknown) => JSON.parse(JSON.stringify(x, (k, v) => k === 'elapsedMs' ? undefined : v));
    return { baseline: clean(await run(faces)), unused: clean(await run([...faces, unused])), missing: await run([]), corrupt: await run(faces.map((f: any) => ({ ...f, url: `${location.origin}/missing-font.woff2` }))), external: await run(faces.map((f: any) => ({ ...f, url: 'https://example.invalid/font.woff2' }))) };
  });
  expect(result.unused.error).toBeUndefined();
  expect(result.unused).toEqual(result.baseline);
  expect(result.missing.error).toContain('Bundled font unavailable');
  expect(result.corrupt.error).toBeTruthy();
  expect(result.external.error).toBe('Layout font must be bundled locally');
});
