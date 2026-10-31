import type { TextElement } from './model';

export type Measure = (text: string, element: TextElement) => { width: number; ascent: number; descent: number };
export type TextLayout = { lines: string[]; width: number; height: number; ascent: number; lineStep: number; emergencyBreaks: number };
/** Thrown for a measurement the layout cannot trust. Subclasses RangeError so existing `instanceof RangeError` callers keep working. */
export class InvalidMeasurementError extends RangeError {
  constructor(message: string) { super(message); this.name = 'InvalidMeasurementError'; }
}
export const TEXT_METRIC_REFERENCE = 'Ágj';
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

/** Wraps without dropping words or graphemes. Paragraph breaks are retained. */
export function layoutText(e: TextElement, rawMeasure: Measure): TextLayout {
  const measure: Measure = (text, el) => checkedMetrics(rawMeasure(text, el), el);
  const lines: string[] = [];
  let emergencyBreaks = 0;
  for (const paragraph of e.text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const combined = line ? `${line} ${word}` : word;
      if (measure(combined, e).width <= e.width) { line = combined; continue; }
      if (line) { lines.push(line); line = ''; }
      if (measure(word, e).width <= e.width) { line = word; continue; }
      emergencyBreaks++;
      for (const { segment } of segmenter.segment(word)) {
        if (line && measure(line + segment, e).width > e.width) { lines.push(line); line = ''; }
        line += segment;
      }
    }
    lines.push(line);
  }
  const reference = measure(TEXT_METRIC_REFERENCE, e);
  const lineStep = Math.max(e.fontSize * e.lineHeight, reference.ascent + reference.descent);
  const height = reference.ascent + reference.descent + Math.max(0, lines.length - 1) * lineStep;
  for (const [name, value] of [['lineStep', lineStep], ['height', height]] as const) {
    if (!Number.isFinite(value)) throw new InvalidMeasurementError(`Text element "${e.id}" has nonfinite derived layout ${name}.`);
  }
  return {
    lines, width: Math.max(0, ...lines.map(line => measure(line, e).width)),
    height, ascent: reference.ascent, lineStep, emergencyBreaks,
  };
}

/** Measure is finite nonnegative advance and baseline extents (zero, incl. -0, is valid for empty text). */
function checkedMetrics(m: ReturnType<Measure>, e: TextElement): ReturnType<Measure> {
  for (const name of ['width', 'ascent', 'descent'] as const) {
    const v: unknown = m?.[name];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      throw new InvalidMeasurementError(`Text element "${e.id}" has invalid ${name} measurement ${String(v)}; expected a finite nonnegative number.`);
    }
  }
  return m;
}

/** A size whose longest line ends flush against its box can wrap one way in the browser and
 * another in the native renderer, so a preview disagrees with its export. Fitted sizes keep a
 * proportional clearance instead of converging onto the wrap boundary.
 *
 * The value is measured, not assumed. Comparing Chromium against Skia over the font-parity
 * corpus, relative width differences for supported single-line text have a median of 0.01% but
 * reach 0.29% on strings dense with kern pairs, which Blink applies in `measureText` and Skia
 * does not. 0.5% clears the worst observed case with headroom; it refits one corpus element,
 * costing it 0.48px of font size. */
const FIT_CLEARANCE = 0.005;

export function fitText(e: TextElement, maximum: number, measure: Measure): TextElement {
  const fitWidth = e.width * (1 - FIT_CLEARANCE);
  let lo = Math.min(1, maximum), hi = maximum;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    const box = layoutText({ ...e, fontSize: mid }, measure);
    if (box.width <= fitWidth && box.height <= e.height + 0.01 && box.emergencyBreaks === 0) lo = mid;
    else hi = mid;
  }
  return { ...e, fontSize: Math.floor(lo * 100) / 100 };
}

export function browserMeasure(): Measure {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) throw new Error('Canvas text measurement is unavailable.');
  // Canvas advances depend on the resolved font and text, not artboard position.
  // Keep this browser-only cache bounded; a new font load may replace fallback metrics.
  const cache = new Map<string, ReturnType<Measure>>();
  let codeUnits = 0;
  const clear = () => { cache.clear(); codeUnits = 0; };
  for (const event of ['loading', 'loadingdone', 'loadingerror']) document.fonts.addEventListener(event, clear);
  return (text, e) => {
    ctx.font = `${e.fontWeight} ${e.fontSize}px "${e.fontFamily}"`;
    const key = JSON.stringify([ctx.font, text]);
    const reusable = document.fonts.status === 'loaded' && key.length <= 65536;
    const hit = reusable ? cache.get(key) : undefined;
    if (hit) return { ...hit };
    const m = ctx.measureText(text);
    const result = { width: m.width, ascent: Math.max(m.actualBoundingBoxAscent, m.fontBoundingBoxAscent), descent: Math.max(m.actualBoundingBoxDescent, m.fontBoundingBoxDescent) };
    if (reusable && Object.values(result).every(value => Number.isFinite(value) && value >= 0)) {
      while (cache.size >= 1024 || codeUnits + key.length > 65536) {
        const oldest = cache.keys().next().value!;
        cache.delete(oldest); codeUnits -= oldest.length;
      }
      cache.set(key, { ...result }); codeUnits += key.length;
    }
    return result;
  };
}
