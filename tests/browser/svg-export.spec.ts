import { test, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const out = 'reports/two-hour/C';

test('actual UI download preserves glyph geometry with no app CSS or network', async ({ page, browser }) => {
  await mkdir(out, { recursive: true });
  await page.goto('/');
  await page.locator('.design-card').first().waitFor();
  await page.locator('#fixture').selectOption('type-pairing');
  await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
  await page.evaluate(() => document.fonts.ready);
  const original = page.locator('.design-card').first();
  // Compare at identical SVG scale: Chromium glyph hinting changes getBBox at thumbnail scale.
  await original.locator('.stage > svg').evaluate(node => {
    const svg = node as SVGSVGElement;
    svg.style.width = `${svg.width.baseVal.value}px`; svg.style.height = `${svg.height.baseVal.value}px`;
    svg.style.flexShrink = '0';
  });
  const preview = await original.locator('svg text').evaluateAll(nodes => nodes.map(node => {
    const e = node as SVGTextElement, b = e.getBBox();
    return { text: e.textContent, x: b.x, y: b.y, width: b.width, height: b.height };
  }));
  const pending = page.waitForEvent('download');
  await original.locator('.export-svg-btn').click();
  const download = await pending;
  const path = `${out}/actual-original.svg`;
  await download.saveAs(path);
  const svg = await readFile(path, 'utf8');
  const clean = await browser.newContext();
  const requests: string[] = [];
  await clean.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
  const reopened = await clean.newPage();
  try {
    await reopened.goto(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
    await reopened.evaluate(async () => { await document.fonts.ready; });
    const actual = await reopened.locator('svg text').evaluateAll(nodes => nodes.map(node => {
      const e = node as SVGTextElement, b = e.getBBox();
      return { text: e.textContent, x: b.x, y: b.y, width: b.width, height: b.height };
    }));
    await reopened.screenshot({ path: `${out}/actual-original-offline.png` });
    await writeFile(`${out}/download-geometry.json`, JSON.stringify({ preview, actual, requests, bytes: Buffer.byteLength(svg), sha256: createHash('sha256').update(svg).digest('hex') }, null, 2));
    expect(actual.map(x => x.text)).toEqual(preview.map(x => x.text));
    expect(requests).toEqual([]);
    for (let i = 0; i < preview.length; i++) {
      expect(actual[i].width, `offline glyph width for ${preview[i].text}`).toBeCloseTo(preview[i].width, 2);
      expect(actual[i].height, `offline glyph height for ${preview[i].text}`).toBeCloseTo(preview[i].height, 2);
    }
  } finally { await clean.close(); }
});

test('missing used font is visible and creates no download; available font remains a positive control', async ({ page }) => {
  await page.goto('/');
  await page.locator('.design-card').first().waitFor();
  await page.locator('#fixture').selectOption('type-pairing');
  await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
  await page.evaluate(() => document.fonts.ready);
  const downloads: string[] = [];
  page.on('download', download => downloads.push(download.suggestedFilename()));
  // Remove declarations after preview rendering: an installed/cached face must not mask
  // the absence of exportable bytes. Existing 700 faces are left intact as controls.
  await page.evaluate(() => {
    for (const sheet of Array.from(document.styleSheets)) {
      for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
        const rule = sheet.cssRules[i];
        if (rule instanceof CSSFontFaceRule && rule.style.fontWeight === '500') sheet.deleteRule(i);
      }
    }
  });
  await page.locator('.export-svg-btn').first().click();
  await expect(page.locator('[data-export-error]').first()).toContainText(/font.*unavailable|missing.*font/i);
  expect(downloads).toEqual([]);
});

test('a delayed font load retains the clicked source filename and artwork', async ({ page }) => {
  await page.goto('/');
  await page.locator('.design-card').first().waitFor();
  await page.locator('#fixture').selectOption('type-pairing');
  await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
  await page.evaluate(() => document.fonts.ready);
  let release!: () => void, requested!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { requested = resolve; });
  await page.route('**/*inter-latin-500-normal.woff2', async route => {
    requested(); await gate; await route.continue();
  });
  const pending = page.waitForEvent('download');
  await page.locator('.export-svg-btn').first().click();
  await started;
  await page.locator('#fixture').selectOption('quiet-brand');
  release();
  await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
  const download = await pending;
  expect(download.suggestedFilename()).toBe('type-pairing-Original.svg');
  const path = await download.path();
  const svg = await readFile(path!, 'utf8');
  expect(svg).toContain('Words');
  expect(svg).not.toContain('Less,');
});

// Exercise the real card handler; comparisons use identical intrinsic scale in each context.
async function checkDownload(page: import('@playwright/test').Page, browser: import('@playwright/test').Browser, name: string, cardIndex = 0) {
  await mkdir(out, { recursive: true });
  const card = page.locator('.design-card').nth(cardIndex);
  const expected = await card.locator('.stage > svg').evaluate(node => {
    const svg = node as SVGSVGElement;
    svg.style.width = `${svg.width.baseVal.value}px`; svg.style.height = `${svg.height.baseVal.value}px`; svg.style.flexShrink = '0';
    return {
      text: Array.from(svg.querySelectorAll('text')).map(e => { const b = e.getBBox(); return { text: e.textContent, x: b.x, y: b.y, width: b.width, height: b.height }; }),
      images: Array.from(svg.querySelectorAll('image')).map(e => e.getAttribute('href')),
      ids: Array.from(svg.querySelectorAll('[data-element-id]')).map(e => e.getAttribute('data-element-id')),
    };
  });
  const pending = page.waitForEvent('download');
  await card.locator('.export-svg-btn').click();
  const download = await pending;
  await download.saveAs(`${out}/${name}.svg`);
  const svg = await readFile(`${out}/${name}.svg`, 'utf8');
  const context = await browser.newContext();
  const requests: string[] = [];
  await context.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
  const clean = await context.newPage();
  await clean.setViewportSize({ width: 1440, height: 1600 });
  try {
    await clean.goto(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
    await clean.evaluate(async () => { await document.fonts.ready; });
    const actual = await clean.locator('svg').evaluate(svg => ({
      text: Array.from(svg.querySelectorAll('text')).map(e => { const b = e.getBBox(); return { text: e.textContent, x: b.x, y: b.y, width: b.width, height: b.height }; }),
      images: Array.from(svg.querySelectorAll('image')).map(e => e.getAttribute('href')),
      ids: Array.from(svg.querySelectorAll('[data-element-id]')).map(e => e.getAttribute('data-element-id')),
      fontStatuses: Array.from(document.fonts).map(f => ({ family: f.family, weight: f.weight, status: f.status })),
    }));
    expect(actual.ids).toEqual(expected.ids);
    expect(actual.images).toEqual(expected.images);
    expect(actual.text.map(t => t.text)).toEqual(expected.text.map(t => t.text));
    for (const [i, t] of expected.text.entries()) for (const key of ['x', 'y', 'width', 'height'] as const) {
      expect(actual.text[i][key], `${name}: ${t.text} ${key}`).toBeCloseTo(t[key], 2);
    }
    expect(actual.fontStatuses.every(f => f.status === 'loaded')).toBe(true);
    expect(requests).toEqual([]);
    expect(svg).not.toContain('stroke-dasharray');
    expect(actual.images.every(src => src?.startsWith('data:image/'))).toBe(true);
    await clean.screenshot({ path: `${out}/${name}.png`, fullPage: false, timeout: 5000 });
    const faces = [...svg.matchAll(/@font-face\{[^}]+\}/g)].map(([encodedRule]) => {
      const rule = encodedRule.replaceAll('&#39;', "'");
      const bytes = Buffer.from(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/.exec(rule)![1], 'base64');
      return { family: /font-family:([^;]+)/.exec(rule)![1].replaceAll("'", ''), weight: Number(/font-weight:(\d+)/.exec(rule)![1]), unicodeRange: /unicode-range:([^;]+)/.exec(rule)![1], bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    });
    const evidence = { name, filename: download.suggestedFilename(), expected, actual, requests, faces, bytes: Buffer.byteLength(svg), sha256: createHash('sha256').update(svg).digest('hex') };
    await writeFile(`${out}/${name}.json`, JSON.stringify(evidence, null, 2));
    return { svg, faces };
  } finally { await context.close(); }
}

test('actual baseline and selected downloads retain assets and are overlay-independent', async ({ page, browser }) => {
  await page.goto('/');
  await page.locator('.design-card').first().waitFor();
  await page.locator('#fixture').selectOption('product-pairs');
  await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
  const normalise = (svg: string) => svg.replace(/design-\d+-/g, 'design-N-');
  for (const mode of ['baseline', 'selected']) {
    await page.locator(`#mode-${mode}`).click();
    await page.locator('#show-issues').uncheck();
    const off = await checkDownload(page, browser, `${mode}-overlays-off`, 1);
    await page.locator('#show-issues').check();
    const on = await checkDownload(page, browser, `${mode}-overlays-on`, 1);
    expect(normalise(on.svg)).toBe(normalise(off.svg));
    expect(off.faces.map(f => `${f.family}:${f.weight}`).sort()).toEqual(['Inter:500', 'Inter:700', 'Source Serif 4:600']);
    // Independently bind the embedded bytes to exactly the expected bundled Latin files.
    for (const f of off.faces) {
      const pkg = f.family === 'Inter' ? 'inter' : 'source-serif-4';
      const bytes = await readFile(`node_modules/@fontsource/${pkg}/files/${pkg}-latin-${f.weight}-normal.woff2`);
      expect(f.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    }
    // Asset visibility positive control: removing images changes actual rendered pixels.
    const context = await browser.newContext();
    await context.route('**/*', route => route.abort());
    const clean = await context.newPage();
  await clean.setViewportSize({ width: 1440, height: 1600 });
    await clean.goto(`data:image/svg+xml;base64,${Buffer.from(off.svg).toString('base64')}`);
    await clean.evaluate(async () => { await document.fonts.ready; });
    const before = await clean.screenshot();
    await clean.locator('image').evaluateAll(images => images.forEach(image => image.remove()));
    const after = await clean.screenshot();
    expect(before.equals(after), 'embedded images must affect visible pixels').toBe(false);
    await context.close();
  }
});

for (const [family, weight] of [['Inter', 400], ['Inter', 500], ['Inter', 600], ['Inter', 700], ['Source Serif 4', 600]] as const) {
  test(`actual offline Unicode download: ${family} ${weight}`, async ({ page, browser }) => {
    await page.goto('/');
    await page.locator('html[data-ready=true]').waitFor();
    // Public workbench fixture hook: no production fixture or source file is modified.
    await page.evaluate(async ({ family, weight }) => {
      const fixture = window.reflowLab.fixtures.find(f => f.id === 'type-pairing')!;
      for (const e of fixture.elements) if (e.type === 'text') {
        e.text = 'Café Ā Ł Ω Ж ệ'; e.fontFamily = family; e.fontWeight = weight; e.fontSize = 32;
      }
      await document.fonts.load(`${weight} 32px "${family}"`, 'Café Ā Ł Ω Ж ệ');
    }, { family, weight });
    await page.locator('#fixture').selectOption('type-pairing');
  await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
    const { faces } = await checkDownload(page, browser, `unicode-${family.replaceAll(' ', '-')}-${weight}`);
    expect(faces).toHaveLength(5);
    expect(faces.every(f => f.family === family && f.weight === weight)).toBe(true);
    const pkg = family === 'Inter' ? 'inter' : 'source-serif-4';
    const expected = await Promise.all(['latin', 'latin-ext', 'greek', 'cyrillic', 'vietnamese'].map(async subset => {
      const bytes = await readFile(`node_modules/@fontsource/${pkg}/files/${pkg}-${subset}-${weight}-normal.woff2`);
      return createHash('sha256').update(bytes).digest('hex');
    }));
    expect(faces.map(f => f.sha256).sort()).toEqual(expected.sort());
  });
}

test('unsupported default glyph fails visibly and switching to supported design recovers', async ({ page }) => {
  await page.goto('/');
  await page.locator('.design-card').first().waitFor();
  const downloads: string[] = [];
  page.on('download', d => downloads.push(d.suggestedFilename()));
  await page.locator('.export-svg-btn').first().click();
  await expect(page.locator('[data-export-error]')).toContainText('U+2192');
  await expect(page.locator('[data-export-error]')).toContainText('Inter');
  expect(downloads).toEqual([]);
  await page.locator('#fixture').selectOption('type-pairing');
  await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
  const pending = page.waitForEvent('download');
  await page.locator('.export-svg-btn').first().click();
  expect((await pending).suggestedFilename()).toBe('type-pairing-Original.svg');
  expect(downloads).toHaveLength(1);
});

for (const failure of ['404', 'invalid-font']) {
  test(`unavailable bytes (${failure}) fail visibly without download`, async ({ page }) => {
    await page.goto('/');
    await page.locator('.design-card').first().waitFor();
    await page.locator('#fixture').selectOption('type-pairing');
  await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
    await page.evaluate(() => document.fonts.ready);
    const downloads: string[] = [];
    page.on('download', d => downloads.push(d.suggestedFilename()));
    await page.route('**/*inter-latin-500-normal.woff2', route => route.fulfill({ status: failure === '404' ? 404 : 200, body: '<html>unavailable</html>' }));
    await page.locator('.export-svg-btn').first().click();
    await expect(page.locator('[data-export-error]')).toContainText(/Font "Inter".*unavailable/);
    expect(downloads).toEqual([]);
  });
}

test('missing asset after preview fails visibly without download and can recover', async ({ page }) => {
  await page.goto('/');
  await page.locator('.design-card').first().waitFor();
  await page.locator('#fixture').selectOption('edge-subject');
  await expect(page.locator('#canvas-grid')).toHaveAttribute('aria-busy', 'false');
  const asset = await page.evaluate(async () => {
    const path = '/src/assets.ts';
    const { ASSETS } = await import(path);
    const old = ASSETS.landscape; delete ASSETS.landscape; return old as string;
  });
  const downloads: string[] = [];
  page.on('download', d => downloads.push(d.suggestedFilename()));
  await page.locator('.export-svg-btn').first().click();
  await expect(page.locator('[data-export-error]')).toContainText('Asset "landscape" is unavailable');
  expect(downloads).toEqual([]);
  await page.evaluate(async asset => {
    const path = '/src/assets.ts'; const { ASSETS } = await import(path); ASSETS.landscape = asset;
  }, asset);
  const pending = page.waitForEvent('download');
  await page.locator('.export-svg-btn').first().click();
  expect((await pending).suggestedFilename()).toBe('edge-subject-Original.svg');
  await expect(page.locator('[data-export-error]')).toHaveCount(0);
});
