import type { Design, Element, Rect } from './model';
import { layoutText, type Measure } from './typography';
import { cropGeometry, type Size } from './crop';

/** Rendered visibility measured on actual pixels, shared by the native and browser checks.
 * Independent of src/visibility.ts: no sampling, compositing or backing inference. For one element:
 * - core pixels: where the element alone at full opacity renders the same over black and white
 *   (≤ 64 per channel apart, i.e. ≥ ~75% coverage). Text is drawn in fixed black ink at its full
 *   laid-out height and the same wrap width, so glyphs clipped by its own box still count;
 * - visible: text core pixels with ≥ 3:1 contrast between the full render and the render without
 *   the element; other core pixels that differ there by ≥ 32 in some channel.
 * Canvas-edge clipping is not measured here (see `out-of-bounds`). */
export type Pixels = { width: number; height: number; data: Uint8ClampedArray | Uint8Array };
export type Variants = { full: Design; without: Design; black: Design; white: Design; text: boolean; bounds: Rect };
export type Share = { core: number; visible: number; share?: number; hidden?: Rect };
export type RenderedVerdict = 'defect' | 'ok' | 'no-verdict';
export const RENDERED_DROP = 0.1, MIN_CORE_PIXELS = 20, SUBJECT_KEPT = 0.9;

/** Raster scale of the inspection renderers: at most 720 × 900, never enlarged. */
export const rasterScale = (d: Rect | Design) => Math.min(1, 720 / d.width, 900 / d.height);

const opaque = (color: string) => color.length === 5 ? color.slice(0, 4) : color.length === 9 ? color.slice(0, 7) : color;
export function visibilityVariants(design: Design, id: string, measure: Measure): Variants {
  const index = design.elements.findIndex(e => e.id === id);
  if (index < 0) throw new Error(`Unknown element: ${id}`);
  const e = design.elements[index];
  let alone: Element = { ...structuredClone(e), opacity: 1 };
  // Renderers antialias glyphs with colour-dependent gamma, so text coverage uses fixed black ink.
  if (alone.type === 'text') alone.color = '#000000';
  else if (alone.type !== 'image') alone.color = opaque(alone.color);
  if (alone.type === 'text') alone = { ...alone, height: Math.max(alone.height, layoutText(alone, measure).height) + alone.fontSize };
  const isolated = (background: string): Design => ({ ...design, background, elements: [alone] });
  return { full: design, without: { ...design, elements: design.elements.filter((_, i) => i !== index) },
    black: isolated('#000000'), white: isolated('#ffffff'), text: e.type === 'text',
    bounds: { x: alone.x, y: alone.y, width: alone.width, height: alone.height } };
}

const luminance = (d: Pixels['data'], i: number) => {
  const lin = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
};
/** Core pixels only exist inside the isolated element, so `bounds` (design units) limits the scan. */
export function shareFromPixels(p: Record<'full' | 'without' | 'black' | 'white', Pixels>, text: boolean, scale: number, bounds: Rect): Share {
  const { width, height } = p.full;
  const top = Math.max(0, Math.floor(bounds.y * scale) - 1), bottom = Math.min(height, Math.ceil((bounds.y + bounds.height) * scale) + 1);
  const left = Math.max(0, Math.floor(bounds.x * scale) - 1), right = Math.min(width, Math.ceil((bounds.x + bounds.width) * scale) + 1);
  let core = 0, visible = 0, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
    const i = (y * width + x) * 4, b = p.black.data, w = p.white.data;
    if (Math.abs(w[i] - b[i]) > 64 || Math.abs(w[i + 1] - b[i + 1]) > 64 || Math.abs(w[i + 2] - b[i + 2]) > 64) continue;
    core++;
    const a = p.full.data, o = p.without.data;
    let seen: boolean;
    if (text) {
      const [hi, lo] = [luminance(a, i), luminance(o, i)].sort((m, n) => n - m);
      seen = (hi + 0.05) / (lo + 0.05) >= 3;
    } else seen = Math.max(Math.abs(a[i] - o[i]), Math.abs(a[i + 1] - o[i + 1]), Math.abs(a[i + 2] - o[i + 2])) >= 32;
    if (seen) { visible++; continue; }
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1);
  }
  return { core, visible, share: core >= MIN_CORE_PIXELS ? visible / core : undefined,
    hidden: x1 > x0 ? { x: x0 / scale, y: y0 / scale, width: (x1 - x0) / scale, height: (y1 - y0) / scale } : undefined };
}
export function renderedVerdict(source: Share, output: Share): RenderedVerdict {
  if (source.share === undefined || output.share === undefined) return 'no-verdict';
  return source.share - output.share > RENDERED_DROP ? 'defect' : 'ok';
}

/** Rendered pixels of a known subject colour inside an image frame, in asset pixels² so that
 * source and output frames at different scales compare directly. */
export function subjectArea(p: Pixels, design: Design, id: string, asset: Size, color: string, tolerance = 12): number {
  const e = design.elements.find(e => e.id === id);
  if (e?.type !== 'image') throw new Error(`Expected image: ${id}`);
  const scale = rasterScale(design), rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  let count = 0;
  for (let y = Math.max(0, Math.floor(e.y * scale)); y < Math.min(p.height, Math.ceil((e.y + e.height) * scale)); y++) {
    for (let x = Math.max(0, Math.floor(e.x * scale)); x < Math.min(p.width, Math.ceil((e.x + e.width) * scale)); x++) {
      const i = (y * p.width + x) * 4;
      if (rgb.every((c, k) => Math.abs(p.data[i + k] - c) <= tolerance)) count++;
    }
  }
  return count / (cropGeometry(e, e.fit, e.focalPoint, asset).scale * scale) ** 2;
}
export function subjectVerdict(source: number, output: number): RenderedVerdict {
  return source > 0 ? (output / source < SUBJECT_KEPT ? 'defect' : 'ok') : 'no-verdict';
}
