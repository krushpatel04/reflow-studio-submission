import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Design } from '../src/model';
import { ASSETS } from '../src/assets';
import { validateResources } from '../src/resources';
import { cropGeometry } from '../src/crop';
import { rasterScale } from '../src/rendered-visibility';
import { layoutText, type Measure } from '../src/typography';

/**
 * @napi-rs/canvas's GlobalFonts does NOT merge multiple files registered under the same
 * family name: for a given (family, weight) pair, only the FIRST registration is ever
 * consulted for glyph resolution — later registrations are silently shadowed, not unioned
 * as fallback. This was verified empirically (see docs/plans/typography-font-parity.md):
 * registering all seven Inter subset files under one family name measured identically to
 * registering the latin file alone. A plain comma-separated font-family fallback list (the
 * next thing tried) does resolve non-Latin glyphs correctly for single-script strings, but
 * for a string that mixes scripts it picks ONE font to shape the entire string (based on
 * whichever family in the list first matches the string's leading character) and naively
 * substitutes glyphs for the rest, which measures wrong widths for the substituted portion
 * (confirmed: a Vietnamese sentence starting with a Latin-covered character mismeasured its
 * Vietnamese-only glyphs even though a Vietnamese family was later in the fallback list).
 *
 * The approach here instead registers each fontsource subset file under its own private
 * alias, and `measure`/`renderPng` split text into runs by which subset's declared
 * unicode-range covers each code point, measuring/drawing each run against its own
 * single-family font string. This reproduces real union coverage without depending on
 * Skia's (absent) unicode-range-aware font matching.
 */

const SUBSET_ORDER: Record<string, string[]> = {
  // 'latin' listed first: it is the overwhelmingly common case, and every text element that
  // resolves entirely within it measures byte-identical to the original single-file registration.
  Inter: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'greek-ext', 'vietnamese'],
  'Source Serif 4': ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext', 'greek', 'vietnamese'],
};
/** Repo root from this module's location, so bundled fonts resolve regardless of process.cwd(). Exported `path` strings stay repo-relative. */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES: Record<string, string> = { Inter: 'inter', 'Source Serif 4': 'source-serif-4' };
const WEIGHTS: Record<string, number[]> = { Inter: [400, 500, 600, 700], 'Source Serif 4': [600] };

type CodepointRange = [number, number];
function parseUnicodeRange(declaration: string): CodepointRange[] {
  return declaration.split(',').map(token => {
    const m = /^\s*U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?\s*$/.exec(token);
    if (!m) throw new Error(`Could not parse unicode-range token: "${token}"`);
    const start = parseInt(m[1], 16);
    return [start, m[2] ? parseInt(m[2], 16) : start];
  });
}
/** Reads the actual @fontsource stylesheet rather than hand-copying ranges, so a dependency
 * bump that changes subsetting is reflected here instead of silently drifting. */
function subsetRanges(family: string): Record<string, CodepointRange[]> {
  const pkg = PACKAGES[family];
  const css = readFileSync(join(ROOT, `node_modules/@fontsource/${pkg}/${WEIGHTS[family][0]}.css`), 'utf8');
  const ranges: Record<string, CodepointRange[]> = {};
  for (const subset of SUBSET_ORDER[family]) {
    const base = `${pkg}-${subset}-${WEIGHTS[family][0]}-normal`;
    const block = new RegExp(`/\\* ${base} \\*/[\\s\\S]*?unicode-range:\\s*([^;]+);`).exec(css);
    if (!block) throw new Error(`Could not find a unicode-range declaration for ${base} in ${pkg}'s stylesheet`);
    ranges[subset] = parseUnicodeRange(block[1]);
  }
  return ranges;
}
const RANGES: Record<string, Record<string, CodepointRange[]>> = Object.fromEntries(Object.keys(SUBSET_ORDER).map(family => [family, subsetRanges(family)]));

const alias = (family: string, subset: string) => `${family}::${subset}`;

/** Every subset file the corresponding @fontsource stylesheet loads (see src/main.ts's imports),
 * with the true family name and each face's declared unicode-range — used to embed correct
 * per-subset @font-face rules in the standalone SVG (scripts/benchmark.ts). */
export const fontFiles = Object.keys(SUBSET_ORDER).flatMap(family =>
  WEIGHTS[family].flatMap(weight => SUBSET_ORDER[family].map(subset => ({
    family, weight, subset,
    path: `node_modules/@fontsource/${PACKAGES[family]}/files/${PACKAGES[family]}-${subset}-${weight}-normal.woff2`,
    unicodeRange: RANGES[family][subset].map(([a, b]) => a === b ? `U+${a.toString(16).toUpperCase()}` : `U+${a.toString(16).toUpperCase()}-${b.toString(16).toUpperCase()}`).join(','),
  }))));
for (const f of fontFiles) {
  if (!GlobalFonts.registerFromPath(resolve(ROOT, f.path), alias(f.family, f.subset))) throw new Error(`Could not register ${f.path}`);
}

/** Which registered subset (of `family`) covers `codePoint`, in SUBSET_ORDER priority; falls
 * back to the first (latin) subset — matching prior behavior — when no subset covers it, which
 * reproduces Skia's normal notdef/fallback glyph for genuinely unsupported content (e.g. U+2192). */
function resolveSubset(family: string, codePoint: number): string {
  const order = SUBSET_ORDER[family];
  for (const subset of order) if (RANGES[family][subset].some(([a, b]) => codePoint >= a && codePoint <= b)) return subset;
  return order[0];
}
/** Splits text into maximal runs that resolve to the same subset, so each run can be measured
 * or drawn against the single font that actually covers it. */
function segments(text: string, family: string): { text: string; subset: string }[] {
  const out: { text: string; subset: string }[] = [];
  let current = '', currentSubset = '';
  for (const ch of text) {
    const subset = resolveSubset(family, ch.codePointAt(0)!);
    if (subset !== currentSubset) { if (current) out.push({ text: current, subset: currentSubset }); current = ''; currentSubset = subset; }
    current += ch;
  }
  if (current) out.push({ text: current, subset: currentSubset });
  return out;
}
const fontString = (family: string, weight: number, size: number, subset: string) => `${weight} ${size}px "${alias(family, subset)}"`;

/** The registered faces a design's text actually resolves to, so embedded font data stays
 * proportional to the content instead of shipping every subset with every file. */
export function requiredFontFiles(design: Design) {
  const needed = new Set<string>();
  for (const e of design.elements) {
    if (e.type !== 'text') continue;
    for (const seg of segments(e.text, e.fontFamily)) needed.add(`${e.fontFamily}|${e.fontWeight}|${seg.subset}`);
  }
  return fontFiles.filter(f => needed.has(`${f.family}|${f.weight}|${f.subset}`));
}

const metrics = createCanvas(1, 1).getContext('2d');
export const measure: Measure = (text, e) => {
  // Ascent/descent come from the font's hhea/OS/2 metrics, which are identical across a family's
  // subsets (verified empirically), so any one subset's face supplies them for the whole string.
  const runs = segments(text, e.fontFamily);
  const vertical = runs.length === 1 ? runs[0].subset : SUBSET_ORDER[e.fontFamily][0];
  let width = 0;
  if (runs.length > 1) for (const seg of runs) {
    metrics.font = fontString(e.fontFamily, e.fontWeight, e.fontSize, seg.subset);
    width += metrics.measureText(seg.text).width;
  }
  metrics.font = fontString(e.fontFamily, e.fontWeight, e.fontSize, vertical);
  const m = metrics.measureText(text);
  // Single-run text is the overwhelmingly common case: one measurement supplies both its width
  // and its vertical metrics, so the hot path costs what it did before per-subset registration.
  return { width: runs.length > 1 ? width : m.width, ascent: Math.max(m.actualBoundingBoxAscent, m.fontBoundingBoxAscent), descent: Math.max(m.actualBoundingBoxDescent, m.fontBoundingBoxDescent) };
};
const images = new Map<string, Awaited<ReturnType<typeof loadImage>>>();
for (const [id, uri] of Object.entries(ASSETS)) images.set(id, await loadImage(Buffer.from(decodeURIComponent(uri.slice(uri.indexOf(',') + 1)))));

/** Separate raster renderer for inspection; browser SVG metrics may differ slightly. */
export function renderPng(design: Design): Buffer {
  return renderCanvas(design).toBuffer('image/png');
}
/** The canvas behind renderPng, for synchronous pixel inspection. */
export function renderCanvas(design: Design) {
  validateResources(design);
  const scale = rasterScale(design);
  const canvas = createCanvas(Math.ceil(design.width * scale), Math.ceil(design.height * scale));
  const ctx = canvas.getContext('2d'); ctx.scale(scale, scale);
  ctx.fillStyle = design.background; ctx.fillRect(0, 0, design.width, design.height);
  for (const e of design.elements) {
    ctx.save(); ctx.globalAlpha = e.opacity ?? 1;
    if (e.type === 'rect') { ctx.fillStyle = e.color; ctx.beginPath(); ctx.roundRect(e.x, e.y, e.width, e.height, e.radius ?? 0); ctx.fill(); }
    if (e.type === 'ellipse') { ctx.fillStyle = e.color; ctx.beginPath(); ctx.ellipse(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, e.height / 2, 0, 0, Math.PI * 2); ctx.fill(); }
    if (e.type === 'image') {
      const asset = images.get(e.assetId); if (!asset) throw new Error(`Missing image ${e.assetId}`);
      ctx.beginPath(); ctx.rect(e.x, e.y, e.width, e.height); ctx.clip();
      const { drawn } = cropGeometry(e, e.fit, e.focalPoint, asset);
      ctx.drawImage(asset, drawn.x, drawn.y, drawn.width, drawn.height);
    }
    if (e.type === 'text') {
      const layout = layoutText(e, measure);
      ctx.beginPath(); ctx.rect(e.x, e.y, e.width, e.height); ctx.clip();
      ctx.fillStyle = e.color; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      layout.lines.forEach((line, i) => {
        const lineWidth = measure(line, e).width;
        let x = e.align === 'center' ? e.x + (e.width - lineWidth) / 2 : e.align === 'right' ? e.x + e.width - lineWidth : e.x;
        const y = e.y + layout.ascent + i * layout.lineStep;
        for (const seg of segments(line, e.fontFamily)) {
          ctx.font = fontString(e.fontFamily, e.fontWeight, e.fontSize, seg.subset);
          ctx.fillText(seg.text, x, y);
          x += ctx.measureText(seg.text).width;
        }
      });
    }
    ctx.restore();
  }
  return canvas;
}
