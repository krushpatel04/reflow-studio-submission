import { reflow } from './engine';
import { DesignValidationError, validateTarget, type Design, type Element, type Target } from './model';
import { BUNDLED_RESOURCES, type DesignResources, validateResources } from './resources';
import type { Measure } from './typography';

type JsonObject = Record<string, unknown>;
type OfficialRequest = { source: unknown; target_canvas: unknown };
export class OfficialAdapterError extends Error {
  constructor(public readonly code: string, public readonly path: string, message: string) { super(`${path}: ${message}`); this.name = 'OfficialAdapterError'; }
}
function object(value: unknown, path: string): asserts value is JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new OfficialAdapterError('invalid-input', path, 'Expected object.');
}
function reject(path: string, message: string): never { throw new OfficialAdapterError('unsupported', path, message); }
function color(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new OfficialAdapterError('invalid-input', path, 'Expected CSS rgba color.');
  const m = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d*\.?\d+)\s*\)$/.exec(value);
  if (!m) reject(path, 'Only rgba(r,g,b,a) colors are supported without loss.');
  const [r,g,b] = m.slice(1,4).map(Number), a = Number(m[4]);
  if ([r,g,b].some(n => n < 0 || n > 255) || !Number.isFinite(a) || a < 0 || a > 1) throw new OfficialAdapterError('invalid-input', path, 'Invalid rgba components.');
  const alpha = Math.round(a * 255), hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}${alpha === 255 ? '' : hex(alpha)}`;
}
function checkElement(e: JsonObject, i: number) {
  const p = `$.source.elements[${i}]`;
  if (typeof e.id !== 'string' || !e.id.trim()) throw new OfficialAdapterError('invalid-input', `${p}.id`, 'Expected nonempty ID.');
  for (const k of ['x','y','width','height']) if (typeof e[k] !== 'number' || !Number.isFinite(e[k])) throw new OfficialAdapterError('invalid-input', `${p}.${k}`, 'Expected finite number.');
  if (e.opacity !== undefined && (typeof e.opacity !== 'number' || !(e.opacity >= 0 && e.opacity <= 1))) throw new OfficialAdapterError('invalid-input', `${p}.opacity`, 'Expected number in [0,1].');
  // group_id only links elements that travel together; no role or meaning is inferred from its value.
  if (e.group_id !== undefined && e.group_id !== null && (typeof e.group_id !== 'string' || !e.group_id.trim())) throw new OfficialAdapterError('invalid-input', `${p}.group_id`, 'Expected nonempty string or null.');
  if ((e.rotation ?? 0) !== 0) reject(`${p}.rotation`, 'Nonzero rotation is unsupported.');
  if ((e.letter_spacing ?? 0) !== 0) reject(`${p}.letter_spacing`, 'Nonzero letter spacing is unsupported.');
  if (e.type === 'text') {
    if (e.font_weight !== undefined && !['regular', 'bold'].includes(String(e.font_weight))) throw new OfficialAdapterError('invalid-input', `${p}.font_weight`, 'Expected regular or bold.');
    if (e.text_align !== undefined && !['left', 'center', 'right'].includes(String(e.text_align))) throw new OfficialAdapterError('invalid-input', `${p}.text_align`, 'Unsupported text alignment.');
    checkStyleRuns(e, p);
    if (e.font_style !== undefined && e.font_style !== 'normal') reject(`${p}.font_style`, 'Italic is unsupported.');
    if (e.max_lines !== undefined && e.max_lines !== null) reject(`${p}.max_lines`, 'Finite max_lines is unsupported.');
    for (const k of ['content','font_family','font_size','color']) if (e[k] === undefined) throw new OfficialAdapterError('invalid-input', `${p}.${k}`, 'Required text field missing.');
  } else if (e.type === 'shape') {
    if (e.shape_type !== 'rectangle' && e.shape_type !== 'ellipse') reject(`${p}.shape_type`, 'Only rectangle and ellipse shapes are supported.');
    if (e.stroke_color !== undefined && e.stroke_color !== null) reject(`${p}.stroke_color`, 'Strokes are unsupported.');
    if (e.stroke_width !== undefined && e.stroke_width !== 0) reject(`${p}.stroke_width`, 'Strokes are unsupported.');
    if (e.corner_radius !== undefined) {
      if (typeof e.corner_radius !== 'number' || !Number.isFinite(e.corner_radius) || e.corner_radius < 0) throw new OfficialAdapterError('invalid-input', `${p}.corner_radius`, 'Expected finite number >= 0.');
      if (e.shape_type !== 'rectangle' && e.corner_radius !== 0) reject(`${p}.corner_radius`, 'corner_radius applies to rectangles only.');
    }
    if (e.fill_color === undefined) throw new OfficialAdapterError('invalid-input', `${p}.fill_color`, 'Required shape field missing.');
    color(e.fill_color, `${p}.fill_color`);
  } else if (e.type === 'image') {
    if (typeof e.asset_id !== 'string' || !e.asset_id.trim()) throw new OfficialAdapterError('invalid-input', `${p}.asset_id`, 'Expected nonempty asset_id.');
    if (e.fit !== undefined && e.fit !== 'contain' && e.fit !== 'cover') reject(`${p}.fit`, 'Only fit "contain" and "cover" are supported; "fill" distorts the asset.');
  } else reject(`${p}.type`, 'Unsupported element type.');
}
/**
 * Fixed role for EVERY admitted official element (text and image alike). The official schema carries no semantic role,
 * and we do not infer one from id, position or size. Conservative: backgrounds and logos are NOT distinguished from
 * content, so no claim of correct reflow semantics for them is made.
 */
export const OFFICIAL_ELEMENT_ROLE = 'content' as const;
/** Color-only, non-overlapping runs are passed through verbatim; they cannot change glyph widths, and content is never rewritten. */
function checkStyleRuns(e: JsonObject, p: string) {
  if (e.style_runs === undefined) return;
  if (!Array.isArray(e.style_runs)) throw new OfficialAdapterError('invalid-input', `${p}.style_runs`, 'Expected array.');
  const length = [...String(e.content ?? '')].length; // code points: never looser than UTF-16 indices
  const runs = e.style_runs.map((r, j) => {
    const rp = `${p}.style_runs[${j}]`;
    object(r, rp);
    for (const k of ['font_weight', 'font_style']) if (r[k] !== undefined) reject(`${rp}.${k}`, 'Only color style runs are supported.');
    // style_runs end semantics are UNCONFIRMED: the schema text says "0-based, end-exclusive", but the starter level2 sample has end 16 on a 15-char headline (inclusive, or an overshoot). We tolerate end > length, never rewrite content, and pass runs through verbatim. start must land inside the text.
    if (!Number.isInteger(r.start) || !Number.isInteger(r.end) || (r.start as number) < 0 || (r.start as number) >= (r.end as number) || (r.start as number) >= length) throw new OfficialAdapterError('invalid-input', rp, `Expected integer 0 <= start < end and start < ${length}.`);
    if (r.color !== undefined) color(r.color, `${rp}.color`);
    return { j, start: r.start as number, end: Math.min(r.end as number, length) };
  }).sort((a, b) => a.start - b.start || a.j - b.j);
  for (let k = 1; k < runs.length; k++) if (runs[k].start < runs[k - 1].end) throw new OfficialAdapterError('invalid-input', `${p}.style_runs[${runs[k].j}]`, 'Style runs overlap.');
}
function convertColorOnElement(e: Element, raw: JsonObject, path: string): Element {
  if (e.type === 'text') return { ...e, color: color(raw.color, `${path}.color`) };
  throw new OfficialAdapterError('unsupported', `${path}.type`, 'Text-only adapter received non-text element.');
}
function officialFields(original: JsonObject, placed: Element): JsonObject {
  const out = structuredClone(original);
  out.x = placed.x; out.y = placed.y; out.width = placed.width; out.height = placed.height;
  if (placed.type === 'text') out.font_size = placed.fontSize;
  return out;
}
export type OfficialOutput = { canvas: { width: number; height: number }; elements: JsonObject[]; [key: string]: unknown };
export type OfficialRole = 'content' | 'background';
export type OfficialOptions = {
  /**
   * Caller-supplied element-id -> role map, per call only. Nothing is inferred from id, name, position or size, and nothing persists.
   * Unlisted elements keep OFFICIAL_ELEMENT_ROLE. CALLER RESPONSIBILITY: a wrong map yields wrong geometry (e.g. marking a logo
   * 'background' stretches it to the whole canvas). Only 'content' | 'background' are admitted: the engine gives 'decoration' no
   * distinct handling (an unplaced non-background element voids the candidate), so it is rejected rather than half-supported.
   * The engine full-bleeds a 'background' only when it has no group_id; a grouped background is accepted but not stretched.
   * At least one element must remain 'content'; otherwise the engine silently ignores the map, so we reject.
   */
  roles?: Record<string, OfficialRole>;
  /**
   * Opt in (literal `true` only) to a sidecar `report` on the outcome: the engine's diagnostics for the SELECTED candidate, copied from
   * existing result fields. ADVISORY: strategy names are engine-internal and may change; the report is not a quality verdict and makes no
   * visual claim. `output` is identical with or without it, and without the option the outcome has no `report` key at all.
   * An empty crop-loss list is not crop assurance: images with unknown intrinsic size are not checked.
   */
  report?: true;
};
export type OfficialFinding = { kind: string; severity: 'error' | 'warning'; elementIds: string[]; message: string; region?: { x: number; y: number; width: number; height: number } };
export type OfficialReport = {
  strategy: string; errors: number; warnings: number; minReadingSize: number; contentCoverage: number;
  findings: OfficialFinding[]; candidates: { strategy: string; errors: number; warnings: number }[];
};
export type OfficialOutcome = { output?: OfficialOutput; unsupported: { path: string; message: string }[]; report?: OfficialReport };
/** Explicit subset adapter. Keeps the request/source immutable; unsupported semantics fail before reflow. */
export function adaptOfficial(input: unknown, measure: Measure, resources: DesignResources = BUNDLED_RESOURCES, options: OfficialOptions = {}): OfficialOutcome {
  object(input, '$');
  const req = input as OfficialRequest;
  object(req.source, '$.source'); object((req.source as JsonObject).canvas, '$.source.canvas');
  const source = req.source as JsonObject, canvas = source.canvas as JsonObject;
  if (!Array.isArray(source.elements) || !source.elements.length) throw new OfficialAdapterError('invalid-input', '$.source.elements', 'Expected nonempty elements array.');
  const target = req.target_canvas as Target; object(target, '$.target_canvas');
  const seen = new Set<string>(), originals: JsonObject[] = [];
  const elements = source.elements.map((raw, i) => {
    object(raw, `$.source.elements[${i}]`); checkElement(raw, i);
    const e = raw as JsonObject;
    if (seen.has(e.id as string)) throw new OfficialAdapterError('invalid-input', `$.source.elements[${i}].id`, 'Duplicate ID.'); seen.add(e.id as string);
    originals.push(e);
    const gid = typeof e.group_id === 'string' ? { groupId: e.group_id } : {};
    if (e.type === 'image') {
      const asset = resources.resolveAsset(e.asset_id as string);
      if (typeof asset !== 'string' || !asset.trim()) throw new OfficialAdapterError('missing-asset', `$.source.elements[${i}].asset_id`, `Asset "${e.asset_id}" is unavailable; supply it through resolveAsset.`);
      return { id: e.id as string, type: 'image', role: OFFICIAL_ELEMENT_ROLE, x: e.x as number, y: e.y as number, width: e.width as number, height: e.height as number,
        assetId: e.asset_id as string, fit: (e.fit as 'contain' | 'cover' | undefined) ?? 'contain', focalPoint: { x: .5, y: .5 }, ...gid,
        ...(e.opacity === undefined ? {} : { opacity: e.opacity as number }) } as Element;
    }
    if (e.type === 'shape') {
      const base = { id: e.id as string, role: OFFICIAL_ELEMENT_ROLE, x: e.x as number, y: e.y as number, width: e.width as number, height: e.height as number, color: color(e.fill_color, `$.source.elements[${i}].fill_color`),
        ...gid, ...(e.opacity === undefined ? {} : { opacity: e.opacity as number }) };
      return (e.shape_type === 'ellipse' ? { ...base, type: 'ellipse' } : { ...base, type: 'rect', ...(e.corner_radius ? { radius: e.corner_radius as number } : {}) }) as Element;
    }
    if (e.type !== 'text') reject(`$.source.elements[${i}].type`, `${e.type} elements are unsupported by the adapter.`);
    const local: Element = { id: e.id as string, type: 'text', role: OFFICIAL_ELEMENT_ROLE, x: e.x as number, y: e.y as number, width: e.width as number, height: e.height as number,
      text: e.content as string, fontFamily: e.font_family as string, fontSize: e.font_size as number, fontWeight: e.font_weight === 'bold' ? 700 : 400,
      color: '#000000', lineHeight: (e.line_height as number | undefined) ?? 1.2, align: (e.text_align as 'left'|'center'|'right'|undefined) ?? 'left', ...gid, ...(e.opacity === undefined ? {} : { opacity: e.opacity as number }) };
    return convertColorOnElement(local, e, `$.source.elements[${i}]`);
  });
  if (!Number.isInteger(canvas.width) || !Number.isInteger(canvas.height)) throw new OfficialAdapterError('invalid-input', '$.source.canvas', 'Canvas dimensions must be integers.');
  if (options.report !== undefined && options.report !== true) throw new OfficialAdapterError('invalid-input', '$.options.report', 'Expected literal true.');
  const roles = options.roles;
  if (roles !== undefined) {
    if (!roles || typeof roles !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(roles))) throw new OfficialAdapterError('invalid-input', '$.options.roles', 'Expected object mapping element id to role.');
    for (const key of Object.keys(roles)) {
      if (!seen.has(key)) throw new OfficialAdapterError('invalid-input', `$.options.roles.${key}`, 'No source element has this id.');
      if (roles[key] !== 'content' && roles[key] !== 'background') throw new OfficialAdapterError('invalid-input', `$.options.roles.${key}`, 'Role must be "content" or "background".');
    }
    for (const el of elements) el.role = Object.hasOwn(roles, el.id) ? roles[el.id] : el.role;
    if (!elements.some(el => el.role === 'content')) throw new OfficialAdapterError('invalid-input', '$.options.roles', 'At least one element must remain "content".');
  }
  // Internal array order is paint order (back to front); sort stably by z_index. Output below follows SOURCE order, so this never leaks.
  const z = new Map(originals.map(o => [o.id as string, typeof o.z_index === 'number' ? o.z_index : 0]));
  const painted = elements.map((el, k) => ({ el, k })).sort((a, b) => z.get(a.el.id)! - z.get(b.el.id)! || a.k - b.k).map(x => x.el);
  const groupIds = [...new Set(painted.flatMap(el => el.groupId ? [el.groupId] : []))]; // label = id: no semantics inferred from the name
  const internal: Design = { schemaVersion: 'reflow.design.v0', id: 'official-input', name: 'Official input', description: '', provenance: 'official-schema-v0.9',
    width: canvas.width as number, height: canvas.height as number, background: '#ffffff', groups: groupIds.map(id => ({ id, label: id })), elements: painted };
  try { validateResources(internal, resources); } catch (e) { if (e instanceof DesignValidationError) reject(e.path, e.message); throw e; }
  validateTarget({ id: 'official-target', label: 'Official target', width: target.width, height: target.height });
  const result = reflow(internal, { id: 'official-target', label: 'Official target', width: target.width, height: target.height }, measure, resources);
  const positioned = new Map(result.selected.design.elements.map(e => [e.id, e]));
  const outcome: OfficialOutcome = { output: { ...structuredClone(source), canvas: { width: target.width, height: target.height }, elements: originals.map((e, i) => officialFields(e, positioned.get(e.id as string)!)) }, unsupported: [] };
  if (options.report === true) {
    const m = result.selected.metrics;
    outcome.report = structuredClone({ strategy: result.selected.strategy, errors: m.errors, warnings: m.warnings, minReadingSize: m.minReadingSize, contentCoverage: m.contentCoverage,
      findings: m.findings, candidates: result.candidates.map(c => ({ strategy: c.strategy, errors: c.metrics.errors, warnings: c.metrics.warnings })) });
  }
  return outcome;
}
