/** Provisional internal format. This is NOT Adobe's challenge schema. */
export type Rect = { x: number; y: number; width: number; height: number };
export type Role = 'content' | 'background' | 'decoration';
type BaseElement = Rect & {
  id: string;
  groupId?: string;
  role: Role;
  opacity?: number;
};
export type TextElement = BaseElement & {
  type: 'text'; text: string; fontFamily: string;
  fontSize: number; fontWeight: number; color: string; lineHeight: number;
  align?: 'left' | 'center' | 'right';
};
export type ShapeElement = BaseElement & { color: string } & (
  { type: 'rect'; radius?: number } | { type: 'ellipse' }
);
export type ImageElement = BaseElement & {
  type: 'image'; assetId: string; fit: 'contain' | 'cover';
  focalPoint: { x: number; y: number };
};
export type Element = TextElement | ShapeElement | ImageElement;
export type Design = {
  schemaVersion: 'reflow.design.v0';
  id: string; name: string; description: string;
  provenance: string;
  width: number; height: number; background: string;
  groups: { id: string; label: string }[];
  /** Array order is paint order, back to front. */
  elements: Element[];
};
export type Target = { id: string; label: string; width: number; height: number };
export const TARGETS: Target[] = [
  { id: 'square', label: 'Square', width: 1080, height: 1080 },
  { id: 'story', label: 'Story', width: 1080, height: 1920 },
  { id: 'landscape', label: 'Landscape', width: 1920, height: 1080 },
];
export type Finding = {
  kind: 'group-geometry' | 'missing-content' | 'preservation' | 'invalid-design' | 'out-of-bounds' | 'text-overflow' | 'collision' | 'small-text' | 'unsupported-glyph' | 'occlusion' | 'low-contrast' | 'crop-loss';
  severity: 'error' | 'warning'; elementIds: string[]; message: string;
  /** Affected area in design coordinates, where the diagnostic can localize it. */
  region?: Rect;
};
export type Metrics = {
  errors: number; warnings: number; minReadingSize: number;
  contentCoverage: number; findings: Finding[];
};
export const CANDIDATE_STRATEGIES = ['identity', 'uniform', 'stack', 'split', 'group-grid-1', 'group-grid-2', 'group-grid-3', 'group-grid-4'] as const;
export type Candidate = {
  strategy: typeof CANDIDATE_STRATEGIES[number];
  design: Design; metrics: Metrics;
};
export type Result = {
  sourceId: string; target: Target; baseline: Candidate; selected: Candidate;
  candidates: Candidate[]; elapsedMs: number;
};

export type ValidationCategory = 'structure' | 'unsupported' | 'resource';
export class DesignValidationError extends Error {
  constructor(public readonly category: ValidationCategory, public readonly code: string,
    public readonly path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = 'DesignValidationError';
  }
}
function invalid(path: string, message: string, code = 'invalid-value'): never {
  throw new DesignValidationError('structure', code, path, message);
}
function object(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid(path, 'Expected a plain object.', 'invalid-type');
}
function fields(value: Record<string, unknown>, allowed: string[], path: string) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) {
    throw new DesignValidationError('unsupported', 'unsupported-field', `${path}.${key}`, 'Field is not supported by reflow.design.v0.');
  }
}
function string(value: unknown, path: string, nonempty = true): asserts value is string {
  if (typeof value !== 'string' || (nonempty && !value.trim())) invalid(path, nonempty ? 'Expected a nonempty string.' : 'Expected a string.', 'invalid-type');
}
function number(value: unknown, path: string, min = -Infinity, max = Infinity): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) invalid(path, `Expected a finite number between ${min} and ${max}.`);
}
function positive(value: unknown, path: string): asserts value is number {
  number(value, path);
  if (value <= 0) invalid(path, 'Expected a positive number.');
}
function choice(value: unknown, options: string[], path: string) {
  if (typeof value !== 'string' || !options.includes(value)) invalid(path, `Expected one of: ${options.join(', ')}.`);
}
function color(value: unknown, path: string) {
  if (typeof value !== 'string' || !/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) {
    invalid(path, 'Expected a hexadecimal RGB/RGBA color (#rgb, #rgba, #rrggbb or #rrggbbaa).');
  }
}
function array(value: unknown, path: string, min: number, max: number): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) invalid(path, `Expected an array with ${min}–${max} entries.`);
}
function uniqueId(value: unknown, path: string, ids: Set<string>) {
  string(value, path);
  if (ids.has(value)) invalid(path, 'IDs must be unique.', 'duplicate-id');
  ids.add(value);
}

/** Structure only. Use validateResources separately before measuring or rendering. */
export function validateDesign(input: unknown): asserts input is Design {
  object(input, '$');
  fields(input, ['schemaVersion', 'id', 'name', 'description', 'provenance', 'width', 'height', 'background', 'groups', 'elements'], '$');
  if (input.schemaVersion !== 'reflow.design.v0') throw new DesignValidationError('unsupported', 'unsupported-schema', '$.schemaVersion', 'Expected reflow.design.v0; other schemas need an adapter.');
  for (const key of ['id', 'name', 'provenance']) string(input[key], `$.${key}`);
  string(input.description, '$.description', false);
  number(input.width, '$.width', 1, 8000); number(input.height, '$.height', 1, 8000);
  color(input.background, '$.background');
  array(input.groups, '$.groups', 0, 100);
  const groups = new Set<string>(), ids = new Set<string>();
  for (const [i, group] of input.groups.entries()) {
    const path = `$.groups[${i}]`;
    object(group, path); fields(group, ['id', 'label'], path);
    uniqueId(group.id, `${path}.id`, groups); string(group.label, `${path}.label`, false);
  }
  array(input.elements, '$.elements', 1, 100);
  for (const [i, e] of input.elements.entries()) {
    const path = `$.elements[${i}]`;
    object(e, path);
    uniqueId(e.id, `${path}.id`, ids);
    if (typeof e.type !== 'string' || !['text', 'rect', 'ellipse', 'image'].includes(e.type)) {
      throw new DesignValidationError('unsupported', 'unsupported-element', `${path}.type`, 'Supported element types: text, rect, ellipse, image.');
    }
    const common = ['id', 'type', 'groupId', 'role', 'opacity', 'x', 'y', 'width', 'height'];
    const specific = e.type === 'text' ? ['text', 'fontFamily', 'fontSize', 'fontWeight', 'color', 'lineHeight', 'align'] :
      e.type === 'image' ? ['assetId', 'fit', 'focalPoint'] : e.type === 'rect' ? ['color', 'radius'] : ['color'];
    fields(e, [...common, ...specific], path);
    choice(e.role, ['content', 'background', 'decoration'], `${path}.role`);
    if (e.groupId !== undefined) {
      string(e.groupId, `${path}.groupId`);
      if (!groups.has(e.groupId)) invalid(`${path}.groupId`, `Unknown group: ${e.groupId}.`, 'unknown-group');
    }
    if (e.opacity !== undefined) number(e.opacity, `${path}.opacity`, 0, 1);
    number(e.x, `${path}.x`); number(e.y, `${path}.y`);
    positive(e.width, `${path}.width`); positive(e.height, `${path}.height`);
    if (!Number.isFinite(e.x + e.width)) invalid(`${path}.width`, 'Geometry endpoint must be finite.');
    if (!Number.isFinite(e.y + e.height)) invalid(`${path}.height`, 'Geometry endpoint must be finite.');
    if (e.type === 'image') {
      string(e.assetId, `${path}.assetId`); choice(e.fit, ['contain', 'cover'], `${path}.fit`);
      object(e.focalPoint, `${path}.focalPoint`); fields(e.focalPoint, ['x', 'y'], `${path}.focalPoint`);
      number(e.focalPoint.x, `${path}.focalPoint.x`, 0, 1); number(e.focalPoint.y, `${path}.focalPoint.y`, 0, 1);
    } else color(e.color, `${path}.color`);
    if (e.type === 'rect' && e.radius !== undefined) number(e.radius, `${path}.radius`, 0);
    if (e.type === 'text') {
      string(e.text, `${path}.text`, false);
      if (e.text.length > 10000) invalid(`${path}.text`, 'Text must contain at most 10000 UTF-16 code units.');
      string(e.fontFamily, `${path}.fontFamily`);
      if (!/^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u.test(e.fontFamily)) invalid(`${path}.fontFamily`, 'Expected a single font name using letters, numbers, spaces, underscore or hyphen.');
      positive(e.fontSize, `${path}.fontSize`); number(e.fontWeight, `${path}.fontWeight`, 1, 1000);
      number(e.lineHeight, `${path}.lineHeight`, 1);
      if (e.align !== undefined) choice(e.align, ['left', 'center', 'right'], `${path}.align`);
    }
  }
}
export function validateTarget(input: unknown): asserts input is Target {
  object(input, '$target'); fields(input, ['id', 'label', 'width', 'height'], '$target');
  string(input.id, '$target.id'); string(input.label, '$target.label');
  number(input.width, '$target.width', 1, 8000); number(input.height, '$target.height', 1, 8000);
}
export function validDimension(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 8000; }
export function bounds(elements: Rect[]): Rect {
  const x = Math.min(...elements.map(e => e.x)), y = Math.min(...elements.map(e => e.y));
  return { x, y, width: Math.max(...elements.map(e => e.x + e.width)) - x, height: Math.max(...elements.map(e => e.y + e.height)) - y };
}
export function overlap(a: Rect, b: Rect) {
  return Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}
