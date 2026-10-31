// Shared SVG sizing and Chromium capture used by the resource preparation driver.
function rasterSize(width, height) {
  for (const value of [width, height]) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new Error('SVG source dimensions must be finite nonnegative numbers');
    }
  }
  return { width: Math.max(1, Math.ceil(width * 2)), height: Math.max(1, Math.ceil(height * 2)) };
}

async function rasterizeSvg(page, bytes, box) {
  const size = rasterSize(box.width, box.height);
  await page.setViewportSize(size);
  if (await page.evaluate(() => window.devicePixelRatio) !== 1) {
    throw new Error('SVG rasterization requires deviceScaleFactor 1');
  }
  const sourceWidth = box.width || 1;
  const sourceHeight = box.height || 1;
  const svg = await page.evaluate(({ xml, width, height }) => {
    const document = new DOMParser().parseFromString(xml, 'image/svg+xml');
    const root = document.documentElement;
    if (root.localName !== 'svg' || document.querySelector('parsererror')) {
      throw new Error('Invalid SVG document');
    }
    if (!root.hasAttribute('viewBox')) root.setAttribute('viewBox', `0 0 ${width} ${height}`);
    root.setAttribute('width', '100%'); root.setAttribute('height', '100%');
    root.style.setProperty('width', '100%', 'important');
    root.style.setProperty('height', '100%', 'important');
    root.setAttribute('preserveAspectRatio', 'none');
    return new XMLSerializer().serializeToString(root);
  }, { xml: bytes.toString('utf8'), width: sourceWidth, height: sourceHeight });
  const src = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  // Scale the source viewport as a whole so non-scaling strokes also double.
  const scaleX = size.width / sourceWidth;
  const scaleY = size.height / sourceHeight;
  await page.setContent(`<html><head><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}img{display:block;width:${sourceWidth}px;height:${sourceHeight}px;object-fit:fill;transform-origin:0 0;transform:scale(${scaleX},${scaleY})}</style></head><body><img src="${src}"></body></html>`);
  await page.locator('img').evaluate(async image => { await image.decode(); });
  const png = await page.screenshot({ omitBackground: true, scale: 'css' });
  const actual = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
  if (actual.width !== size.width || actual.height !== size.height) {
    throw new Error(`Wrong raster dimensions ${JSON.stringify(actual)}; expected ${JSON.stringify(size)}`);
  }
  return { png, size };
}

module.exports = { rasterSize, rasterizeSvg };

// Batch stdin/stdout interface; requiring this module still has no side effects.
if (require.main === module) {
  const fs = require('node:fs');
  const crypto = require('node:crypto');
  const path = require('node:path');
  const { chromium } = require('@playwright/test');
  (async () => {
    const jobs = JSON.parse(fs.readFileSync(0, 'utf8'));
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ deviceScaleFactor: 1 });
      const records = [];
      for (const job of jobs) {
        const { png, size } = await rasterizeSvg(page, fs.readFileSync(job.original_path), job.box);
        const sha256 = crypto.createHash('sha256').update(png).digest('hex');
        const target = path.join(job.blob_dir, sha256);
        if (fs.existsSync(target)) {
          if (crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex') !== sha256) {
            throw new Error(`Existing blob hash mismatch: ${sha256}`);
          }
        } else fs.writeFileSync(target, png);
        records.push({ id: job.id, sha256, size, chromium_version: browser.version() });
      }
      process.stdout.write(JSON.stringify(records));
    } finally { await browser.close(); }
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
