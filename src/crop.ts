import type { ImageElement, Rect } from './model';

export type Size = { width: number; height: number };
/** `drawn`: where the whole scaled asset lands. `visible`: drawn ∩ frame, in design units.
 * `source`: the visible part of the asset, in asset pixels. */
export type Crop = { drawn: Rect; visible: Rect; source: Rect; scale: number };

/** Shared by SVG, PNG and diagnostics. Uniform scale only; the focal point follows CSS
 * `object-position: fx fy` semantics, so 0/0.5/1 match xMin/xMid/xMax and a cover focal
 * point is always inside the visible source region at its original relative position. */
export function cropGeometry(frame: Rect, fit: ImageElement['fit'], focal: ImageElement['focalPoint'], asset: Size): Crop {
  const scale = (fit === 'cover' ? Math.max : Math.min)(frame.width / asset.width, frame.height / asset.height);
  const width = asset.width * scale, height = asset.height * scale;
  const drawn = { x: frame.x + (frame.width - width) * focal.x, y: frame.y + (frame.height - height) * focal.y, width, height };
  const x = Math.max(frame.x, drawn.x), y = Math.max(frame.y, drawn.y);
  const visible = { x, y, width: Math.min(frame.x + frame.width, drawn.x + width) - x, height: Math.min(frame.y + frame.height, drawn.y + height) - y };
  const source = { x: (x - drawn.x) / scale, y: (y - drawn.y) / scale, width: visible.width / scale, height: visible.height / scale };
  return { drawn, visible, source, scale };
}

const positive = (value: number) => Number.isFinite(value) && value > 0;
/** Intrinsic size from a data URI without I/O: SVG width/height (else viewBox) or a base64 PNG
 * header. Anything else is unknown; callers must fall back visibly rather than guess. */
export function assetSize(uri: string): Size | undefined {
  const comma = uri.indexOf(',');
  if (!uri.startsWith('data:') || comma < 0) return undefined;
  const header = uri.slice(5, comma), body = uri.slice(comma + 1);
  if (header.startsWith('image/svg+xml') && !header.includes(';base64')) {
    let decoded: string;
    try { decoded = decodeURIComponent(body); } catch (error) { if (error instanceof URIError) return undefined; throw error; }
    const root = /<svg\b[^>]*>/.exec(decoded)?.[0];
    if (!root) return undefined;
    const attr = (name: string) => new RegExp(`\\s${name}=["']([^"']*)["']`).exec(root)?.[1];
    const width = Number(attr('width')), height = Number(attr('height'));
    if (positive(width) && positive(height)) return { width, height };
    const box = attr('viewBox')?.trim().split(/[\s,]+/).map(Number);
    return box?.length === 4 && positive(box[2]) && positive(box[3]) ? { width: box[2], height: box[3] } : undefined;
  }
  if (header === 'image/png;base64') {
    let bytes: string;
    try { bytes = atob(body.slice(0, 32)); } catch (error) { if (error instanceof DOMException && error.name === 'InvalidCharacterError') return undefined; throw error; }
    if (bytes.slice(1, 4) !== 'PNG' || bytes.slice(12, 16) !== 'IHDR') return undefined;
    const u32 = (i: number) => ((bytes.charCodeAt(i) << 24) | (bytes.charCodeAt(i + 1) << 16) | (bytes.charCodeAt(i + 2) << 8) | bytes.charCodeAt(i + 3)) >>> 0;
    const width = u32(16), height = u32(20);
    return positive(width) && positive(height) ? { width, height } : undefined;
  }
  return undefined;
}
