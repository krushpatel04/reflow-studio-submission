const { chromium } = require('@playwright/test');
const { rasterizeSvg } = require('../scripts/lica_official/rasterize.cjs');

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ deviceScaleFactor: 1 });
    const page = await context.newPage();
    const results = { version: browser.version(), captures: {} };
    const fixtures = {
      fixed: '<svg xmlns="http://www.w3.org/2000/svg" style="width:24px;height:12px"><rect width="24" height="12" fill="blue"/></svg>',
      viewbox: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 12"><rect width="24" height="12" fill="green"/></svg>',
      stroke: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 12"><rect x="1" y="1" width="22" height="10" fill="none" stroke="red" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>',
    };
    for (const [name, svg] of Object.entries(fixtures)) {
      const { png, size } = await rasterizeSvg(page, Buffer.from(svg), { width: 24, height: 12 });
      const pixels = await page.evaluate(async encoded => {
        const image = new Image();
        image.src = 'data:image/png;base64,' + encoded;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          if (data[(y * canvas.width + x) * 4 + 3] > 0) {
            left = Math.min(left, x); top = Math.min(top, y);
            right = Math.max(right, x + 1); bottom = Math.max(bottom, y + 1);
          }
        }
        return { bounds: [left, top, right, bottom],
          alphaAtTopCenter: Array.from({ length: 6 }, (_, y) => data[(y * canvas.width + canvas.width / 2) * 4 + 3]) };
      }, png.toString('base64'));
      results.captures[name] = { size, ...pixels };
    }
    process.stdout.write(JSON.stringify(results));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
