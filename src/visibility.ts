import type { Design, Element, Rect } from './model';
import { layoutText, type Measure } from './typography';
import { assetSize, cropGeometry, type Size } from './crop';
import type { DesignResources } from './resources';

/** Rendered-visibility proxies computed from document geometry, not from pixels.
 * Text is sampled over its laid-out line boxes (not glyph ink); images are treated as opaque
 * inside their drawn region and as an unknown backing colour. See docs/design-contract.md. */
type Point = [number, number];
type RGBA = [number, number, number, number];
const GRID = 16;

export function parseColor(hex: string): RGBA {
  const digits = hex.slice(1), short = digits.length <= 4;
  const channel = (i: number) => short ? parseInt(digits[i] + digits[i], 16) : parseInt(digits.slice(i * 2, i * 2 + 2), 16);
  const alpha = (short ? digits.length === 4 : digits.length === 8) ? channel(3) / 255 : 1;
  return [channel(0), channel(1), channel(2), alpha];
}
const intersect = (a: Rect, b: Rect): Rect | undefined => {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x, height = Math.min(a.y + a.height, b.y + b.height) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : undefined;
};

export type Imagery = (e: Element & { type: 'image' }) => Size | undefined;
export const imagery = (resources: DesignResources): Imagery => {
  const sizes = new Map<string, Size | undefined>();
  return e => {
    if (!sizes.has(e.assetId)) { const uri = resources.resolveAsset(e.assetId); sizes.set(e.assetId, uri ? assetSize(uri) : undefined); }
    return sizes.get(e.assetId);
  };
};
/** The painted region of an image: its visible drawn rectangle when the asset size is known. */
function imageRegion(e: Element & { type: 'image' }, size: Imagery): Rect | undefined {
  const known = size(e);
  return known ? cropGeometry(e, e.fit, e.focalPoint, known).visible : e;
}
/** A non-text element's painted area, precomputed once per design. Text is not a layer:
 * sparse glyphs over content are handled by the collision check. */
export type Layer = { id: string; image: boolean; color: RGBA; bounds: Rect; alpha: (p: Point) => number };
export function layer(e: Element, size: Imagery): Layer | undefined {
  const opacity = e.opacity ?? 1;
  if (e.type === 'text' || opacity <= 0) return undefined;
  if (e.type === 'image') {
    const r = imageRegion(e, size);
    return r && { id: e.id, image: true, color: [0, 0, 0, 1], bounds: r, alpha: () => opacity };
  }
  const color = parseColor(e.color), alpha = opacity * color[3];
  let inside = (_: Point) => true;
  if (e.type === 'ellipse') inside = ([px, py]) => ((px - e.x - e.width / 2) / (e.width / 2)) ** 2 + ((py - e.y - e.height / 2) / (e.height / 2)) ** 2 <= 1;
  else if (e.radius) {
    const r = Math.min(e.radius, e.width / 2, e.height / 2);
    inside = ([px, py]) => {
      const cx = Math.min(Math.max(px, e.x + r), e.x + e.width - r), cy = Math.min(Math.max(py, e.y + r), e.y + e.height - r);
      return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
    };
  }
  return { id: e.id, image: false, color, bounds: e, alpha: p => inside(p) ? alpha : 0 };
}
const contains = (r: Rect, [px, py]: Point) => px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
const alphaAt = (l: Layer, p: Point) => contains(l.bounds, p) ? l.alpha(p) : 0;
const extent = (points: Point[]): Rect => {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
};
const touching = (layers: (Layer | undefined)[], points: Point[]) => {
  const r = extent(points);
  return layers.filter((l): l is Layer => !!l && l.bounds.x <= r.x + r.width && r.x <= l.bounds.x + l.bounds.width &&
    l.bounds.y <= r.y + r.height && r.y <= l.bounds.y + l.bounds.height);
};

/** Deterministic sample points over the area where an element's content is painted. */
export function samplePoints(e: Element, measure: Measure, size: Imagery): Point[] {
  const grid = (r: Rect, cols: number, rows: number, keep: (p: Point) => boolean = () => true): Point[] => {
    const out: Point[] = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const p: Point = [r.x + (i + 0.5) * r.width / cols, r.y + (j + 0.5) * r.height / rows];
      if (keep(p)) out.push(p);
    }
    return out;
  };
  if (e.type === 'text') {
    const layout = layoutText(e, measure);
    const descent = layout.height - layout.ascent - Math.max(0, layout.lines.length - 1) * layout.lineStep;
    const rows = Math.max(1, Math.ceil(GRID / layout.lines.length));
    return layout.lines.flatMap((line, i) => {
      const width = measure(line, e).width;
      const x = e.align === 'center' ? e.x + (e.width - width) / 2 : e.align === 'right' ? e.x + e.width - width : e.x;
      const box = width > 0 ? intersect({ x, y: e.y + i * layout.lineStep, width, height: layout.ascent + descent }, e) : undefined;
      return box ? grid(box, GRID, rows) : [];
    });
  }
  if (e.type === 'image') { const r = imageRegion(e, size); return r ? grid(r, GRID, GRID) : []; }
  const shape = layer({ ...e, opacity: 1, color: '#000' }, size)!;
  return grid(e, GRID, GRID, p => shape.alpha(p) > 0);
}

/** Mean share of an element's samples hidden by later-painted layers, each layer's share, and the
 * extent of samples at least half hidden. */
export function obstruction(layers: (Layer | undefined)[], index: number, points: Point[]) {
  const later = touching(layers.slice(index + 1), points);
  const byLayer = new Map<string, number>(), hidden: Point[] = [];
  let total = 0;
  if (!later.length) return { total, byLayer, region: undefined };
  for (const p of points) {
    let clear = 1;
    for (const o of later) {
      const a = alphaAt(o, p);
      if (!a) continue;
      clear *= 1 - a;
      byLayer.set(o.id, (byLayer.get(o.id) ?? 0) + a / points.length);
    }
    total += (1 - clear) / points.length;
    if (clear <= 0.5) hidden.push(p);
  }
  return { total, byLayer, region: hidden.length ? extent(hidden) : undefined };
}

const luminance = ([r, g, b]: RGBA) => {
  const lin = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const over = (top: RGBA, alpha: number, bottom: RGBA): RGBA => [0, 1, 2].map(i => top[i] * alpha + bottom[i] * (1 - alpha)).concat(1) as RGBA;
export const MIN_CONTRAST = 3;

/** Share of text samples whose composited backing is known and gives ≥ 3:1 contrast, and the extent
 * of the illegible ones. Backings under images are unknown and excluded; undefined means no verdict. */
export function legibleShare(design: Design, layers: (Layer | undefined)[], index: number, points: Point[]): { share: number; region?: Rect } | undefined {
  const text = design.elements[index];
  if (text.type !== 'text') return undefined;
  const [tr, tg, tb, ta] = parseColor(text.color), alpha = ta * (text.opacity ?? 1);
  const earlier = touching(layers.slice(0, index), points), background = parseColor(design.background);
  const readable = new Map<string, boolean>(), illegible: Point[] = [];
  let known = 0, legible = 0;
  for (const p of points) {
    let backing: RGBA | undefined = background;
    for (const o of earlier) {
      const a = alphaAt(o, p);
      if (!a) continue;
      if (o.image) backing = undefined;
      else if (a >= 1) backing = o.color;
      else if (backing) backing = over(o.color, a, backing);
    }
    if (!backing) continue;
    known++;
    const key = backing.join();
    if (!readable.has(key)) {
      const [hi, lo] = [luminance(over([tr, tg, tb, 1], alpha, backing)), luminance(backing)].sort((a, b) => b - a);
      readable.set(key, (hi + 0.05) / (lo + 0.05) >= MIN_CONTRAST);
    }
    if (readable.get(key)) legible++;
    else illegible.push(p);
  }
  return known ? { share: legible / known, region: illegible.length ? extent(illegible) : undefined } : undefined;
}
