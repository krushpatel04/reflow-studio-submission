import type { Design } from './model';
import { TEXT_METRIC_REFERENCE, type Measure } from './typography';
import { renderSvg, escapeHtml } from './render';
import { validateResources, BUNDLED_RESOURCES } from './resources';
import { findUncoveredText } from './font-coverage';

export type ExportFontFace = { family: string; weight: number; unicodeRange: string; url: string };

function covers(range: string, point: number): boolean {
  return range.split(',').some(part => {
    const match = /^\s*U\+([\da-f]+)(?:-([\da-f]+))?\s*$/i.exec(part);
    if (!match) throw new Error(`Unsupported bundled font Unicode range: ${part}`);
    return point >= parseInt(match[1], 16) && point <= parseInt(match[2] ?? match[1], 16);
  });
}

/** Keep preview fallback semantics, including overlapping subset declaration order. */
export function requiredLayoutFonts(design: Design, faces: readonly ExportFontFace[]): ExportFontFace[] {
  const needed = new Set<ExportFontFace>();
  for (const e of design.elements) {
    if (e.type !== 'text') continue;
    const candidates = faces.filter(f => f.family === e.fontFamily && f.weight === e.fontWeight);
    if (!candidates.length) throw new Error(`Bundled font unavailable: ${e.fontFamily} ${e.fontWeight}`);
    const points = [...new Set([...e.text].filter(char => !'\n\r\t'.includes(char)).map(char => char.codePointAt(0)!))];
    // Empty or unsupported copy can depend on fallback font box metrics. Keep all
    // matching subsets in those cases; strict export validation remains separate.
    const fallback = !points.length || points.some(point => !candidates.some(f => covers(f.unicodeRange, point)));
    // Wrapping also measures a stable line-height probe and normalized spaces.
    const measuredPoints = [...points, ...`${TEXT_METRIC_REFERENCE} `.split('').map(char => char.codePointAt(0)!)];
    for (const face of candidates) {
      if (fallback || measuredPoints.some(point => covers(face.unicodeRange, point))) needed.add(face);
    }
  }
  return faces.filter(face => needed.has(face));
}

/** CSS declares later matching subsets at higher priority (notably latin overlaps). */
export function requiredExportFonts(design: Design, faces: readonly ExportFontFace[]): ExportFontFace[] {
  validateResources(design);
  const uncovered = findUncoveredText(design);
  if (uncovered.length) throw new Error(uncovered[0].message);
  const needed = new Map<string, ExportFontFace>();
  for (const e of design.elements) {
    if (e.type !== 'text') continue;
    const candidates = faces.filter(f => f.family === e.fontFamily && f.weight === e.fontWeight).reverse();
    for (const char of e.text) {
      if ('\n\r\t'.includes(char)) continue;
      const face = candidates.find(f => covers(f.unicodeRange, char.codePointAt(0)!));
      if (!face) throw new Error(`Font "${e.fontFamily}" at weight ${e.fontWeight} is unavailable for SVG export.`);
      needed.set(`${face.family}|${face.weight}|${face.unicodeRange}|${face.url}`, face);
    }
  }
  // Preserve CSS order, including precedence for overlapping Unicode ranges.
  return [...needed.values()].sort((a, b) => faces.indexOf(a) - faces.indexOf(b));
}

/** Export is separate from preview rendering: no diagnostic metrics, only used resources. */
export async function exportSvg(
  design: Design, measure: Measure, faces: readonly ExportFontFace[],
  loadFont: (face: ExportFontFace) => Promise<string>,
): Promise<string> {
  const used = requiredExportFonts(design, faces);
  // Serialize the clicked snapshot before asynchronous I/O; later UI changes cannot change it.
  const svg = renderSvg(design, measure);
  const rules = await Promise.all(used.map(async face => {
    const data = await loadFont(face);
    if (!/^data:font\/woff2;base64,[A-Za-z0-9+/]+=*$/.test(data)) throw new Error(`Font "${face.family}" is unavailable for SVG export.`);
    return `@font-face{font-family:'${face.family}';font-style:normal;font-weight:${face.weight};unicode-range:${face.unicodeRange};src:url(${data}) format('woff2');}`;
  }));
  return svg.replace('><rect', `><defs><style>${escapeHtml(rules.join('\n'))}</style></defs><rect`);
}

/** Use the same bundled declarations as the preview, in their actual cascade order. */
export function browserExportFonts(): ExportFontFace[] {
  const faces: ExportFontFace[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    for (const rule of Array.from(sheet.cssRules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style.fontFamily.replace(/^['"]|['"]$/g, '');
      const weight = Number(rule.style.fontWeight);
      if (!BUNDLED_RESOURCES.supportsFont(family, weight)) continue;
      const source = /url\(["']?([^"')]+)["']?\)\s*format\(["']?woff2["']?\)/.exec(rule.style.getPropertyValue('src'));
      if (!source) continue;
      faces.push({ family, weight, unicodeRange: rule.style.getPropertyValue('unicode-range'), url: new URL(source[1], sheet.href ?? document.baseURI).href });
    }
  }
  return faces;
}

export async function loadBrowserExportFont(face: ExportFontFace): Promise<string> {
  const url = new URL(face.url, document.baseURI);
  if (url.origin !== location.origin) throw new Error(`Font "${face.family}" is unavailable locally for SVG export.`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font "${face.family}" is unavailable for SVG export (${response.status}).`);
  const bytes = await response.arrayBuffer();
  // A 200 HTML fallback or corrupt font must not produce a successful download.
  try { await new FontFace(face.family, bytes, { weight: String(face.weight) }).load(); }
  catch { throw new Error(`Font "${face.family}" is unavailable or invalid for SVG export.`); }
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Font "${face.family}" could not be read for SVG export.`));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(new Blob([bytes], { type: 'font/woff2' }));
  });
  return data;
}
