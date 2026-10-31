import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIXTURES } from '../src/fixtures';
import { type Design, type TextElement } from '../src/model';
import { exportSvg, requiredExportFonts, type ExportFontFace } from '../src/svg-export';

const measure = (text: string) => ({ width: text.length * 10, ascent: 18, descent: 5 });
const faces: ExportFontFace[] = [];
for (const [family, pkg, weights] of [['Inter', 'inter', [400, 500, 600, 700]], ['Source Serif 4', 'source-serif-4', [600]]] as const) {
  for (const weight of weights) {
    const css = readFileSync(`node_modules/@fontsource/${pkg}/${weight}.css`, 'utf8');
    for (const block of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
      faces.push({ family, weight, unicodeRange: /unicode-range:\s*([^;]+)/.exec(block[1])![1], url: /url\(([^)]+)\)/.exec(block[1])![1] });
    }
  }
}
function textDesign(text: string, family = 'Inter', weight = 500): Design {
  const design = structuredClone(FIXTURES[0]);
  const element = design.elements.find(e => e.type === 'text') as TextElement;
  design.elements = [{ ...element, text, fontFamily: family, fontWeight: weight }];
  design.groups = [];
  return design;
}
const data = 'data:font/woff2;base64,d09GMg=='; // Stub bytes: real-font decode is covered in the browser.

test('ASCII selects only the used weight and latin subset once across duplicate elements', async () => {
  const design = textDesign('HELLO');
  design.elements.push({ ...design.elements[0], id: 'second' });
  const used = requiredExportFonts(design, faces);
  assert.equal(used.length, 1);
  assert.match(used[0].url, /inter-latin-500-normal.woff2/);
  const loaded: string[] = [];
  const svg = await exportSvg(design, measure, faces, async face => { loaded.push(face.url); return data; });
  assert.equal(loaded.length, 1);
  assert.equal((svg.match(/@font-face/g) ?? []).length, 1);
  assert.match(svg, /HELLO/);
  assert.match(svg, /data-element-id="second"/);
  assert.equal(design.elements.length, 2);
});

for (const [family, weight] of [['Inter', 400], ['Inter', 500], ['Inter', 600], ['Inter', 700], ['Source Serif 4', 600]] as const) {
  test(`supported Latin, extended Latin, Greek, Cyrillic, Vietnamese: ${family} ${weight}`, async () => {
    const design = textDesign('Café Ā Ω Ж ệ', family, weight);
    const used = requiredExportFonts(design, faces);
    assert.equal(used.length, 5);
    assert.ok(used.every(f => f.family === family && f.weight === weight));
    for (const subset of ['latin-', 'latin-ext-', 'greek-', 'cyrillic-', 'vietnamese-']) assert.ok(used.some(f => f.url.includes(subset)), subset);
    const svg = await exportSvg(design, measure, faces, async () => data);
    for (const glyph of ['Café', 'Ā', 'Ω', 'Ж', 'ệ']) assert.ok(svg.includes(glyph));
  });
}

test('missing face, unsupported text/weight, invalid bytes and missing asset fail explicitly', async () => {
  await assert.rejects(exportSvg(textDesign('Hello'), measure, [], async () => data), /font.*unavailable/i);
  await assert.rejects(exportSvg(textDesign('Hello', 'Inter', 900), measure, faces, async () => data), /unavailable/i);
  await assert.rejects(exportSvg(textDesign('Hello 😀'), measure, faces, async () => data), /coverage|unsupported/i);
  await assert.rejects(exportSvg(textDesign('Hello'), measure, faces, async () => ''), /font.*unavailable/i);
  const design = structuredClone(FIXTURES[0]);
  const image = design.elements.find(e => e.type === 'image')!;
  if (image.type === 'image') image.assetId = 'missing';
  await assert.rejects(exportSvg(design, measure, faces, async () => data), /unavailable/i);
});

test('no text needs no fonts; embedded bundled asset remains byte-preserved', async () => {
  const design = structuredClone(FIXTURES[0]);
  design.elements = design.elements.filter(e => e.type !== 'text').map(e => ({ ...e, groupId: undefined }));
  design.groups = [];
  const svg = await exportSvg(design, measure, [], async () => { throw new Error('unused font load'); });
  assert.ok(!svg.includes('@font-face'));
  assert.match(svg, /data:image\/svg\+xml/);
  assert.match(svg, /data-element-id="hero"/);
});
