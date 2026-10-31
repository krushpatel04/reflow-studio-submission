import { bounds, CANDIDATE_STRATEGIES, validateTarget, type Candidate, type Design, type Finding, type Element, type Rect, type Result, type Target, type TextElement } from './model';
import { fitText, layoutText, type Measure } from './typography';
import { evaluate } from './evaluate';
import { validateResources, BUNDLED_RESOURCES, type DesignResources } from './resources';
import { rankingTerms } from './ranking';
import { cacheMeasurements } from './measurement-cache';

type Unit = { elements: Element[]; box: Rect; image: boolean };

export function uniform(source: Design, target: Target): Design {
  const s = Math.min(target.width / source.width, target.height / source.height);
  const dx = (target.width - source.width * s) / 2, dy = (target.height - source.height * s) / 2;
  return { ...structuredClone(source), width: target.width, height: target.height,
    elements: source.elements.map(e => transform(e, s, dx, dy)) };
}
function transform(e: Element, scale: number, dx: number, dy: number): Element {
  const n = { ...structuredClone(e), x: e.x * scale + dx, y: e.y * scale + dy, width: e.width * scale, height: e.height * scale };
  if (n.type === 'text') n.fontSize *= scale;
  if (n.type === 'rect' && n.radius) n.radius *= scale;
  return n;
}
/** Full-bleed every ungrouped background, as assemble() does for the other candidates. Grouped backgrounds are left alone (the group travels as a unit). */
function bleed(design: Design, target: Target): Design {
  return { ...design, elements: design.elements.map(e => e.role === 'background' && !e.groupId ? { ...e, x: 0, y: 0, width: target.width, height: target.height } : e) };
}
function units(source: Design): Unit[] {
  const map = new Map<string, Element[]>();
  // Resolve explicit relationships before selecting a unit's layout role.
  for (const e of source.elements) {
    const key = e.groupId ? `group:${e.groupId}` : `element:${e.id}`;
    map.set(key, [...(map.get(key) ?? []), e]);
  }
  return [...map.values()].filter(elements => elements.some(e => e.role === 'content'))
    .map(elements => ({ elements, box: bounds(elements), image: elements.some(e => e.type === 'image') }))
    .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
}
function put(unit: Unit, cell: Rect, source: Design, target: Target, measure: Measure): Element[] {
  const scale = Math.min(cell.width / unit.box.width, cell.height / unit.box.height);
  const dx = cell.x + (cell.width - unit.box.width * scale) / 2 - unit.box.x * scale;
  const dy = cell.y + (cell.height - unit.box.height * scale) / 2 - unit.box.y * scale;
  const relative = Math.min(target.width, target.height) / Math.min(source.width, source.height);
  if (unit.elements.length === 1 && unit.elements[0].type === 'text') {
    const original = unit.elements[0];
    return [fitText({ ...original, ...cell }, original.fontSize * relative * 1.2, measure)];
  }
  if (unit.elements.length === 1 && unit.elements[0].type === 'image') return [{ ...structuredClone(unit.elements[0]), ...cell }];
  return unit.elements.map(original => {
    const n = transform(original, scale, dx, dy);
    return n.type === 'text' && original.type === 'text' ? fitText(n, Math.max(n.fontSize, original.fontSize * relative), measure) : n;
  });
}
function stack(items: Unit[], region: Rect, source: Design, target: Target, measure: Measure): Element[] {
  if (!items.length) return [];
  const gap = Math.min(target.width, target.height) * 0.025;
  const available = Math.max(region.height * 0.4, region.height - gap * (items.length - 1));
  const weights = items.map(u => Math.max(0.08, Math.min(1.25, u.box.height / u.box.width)) * (u.image ? 1.2 : 1));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let y = region.y;
  return items.flatMap((u, i) => {
    const height = available * weights[i] / total;
    const out = put(u, { x: region.x, y, width: region.width, height }, source, target, measure);
    y += height + gap;
    return out;
  });
}
function arranged(source: Design, target: Target, kind: 'stack' | 'split', measure: Measure, all: Unit[]): Design {
  const margin = Math.min(target.width, target.height) * 0.065;
  const region = { x: margin, y: margin, width: target.width - margin * 2, height: target.height - margin * 2 };
  let positioned: Element[];
  const images = all.filter(u => u.image), other = all.filter(u => !u.image);
  if (kind === 'split' && images.length && other.length) {
    const gap = margin * 0.6;
    positioned = [
      ...stack(images, { ...region, width: (region.width - gap) * 0.49 }, source, target, measure),
      ...stack(other, { ...region, x: region.x + (region.width - gap) * 0.49 + gap, width: (region.width - gap) * 0.51 }, source, target, measure),
    ];
  } else positioned = stack(all, region, source, target, measure);
  return assemble(source, target, positioned);
}
function assemble(source: Design, target: Target, positioned: Element[]): Design {
  const byId = new Map(positioned.map(e => [e.id, e]));
  const backdrop = uniform(source, target);
  return { ...backdrop, elements: backdrop.elements.map(e => {
    if (byId.has(e.id)) return byId.get(e.id)!;
    if (e.role === 'background' && !e.groupId) return { ...e, x: 0, y: 0, width: target.width, height: target.height };
    return e;
  }) };
}

/** A conservative whole-group band, not an inference that group contents may reflow.
 * Bookends consume measured height before products share the remaining space.
 * Ambiguous layering/sidebars keep the existing alternatives; no source IDs are special.
 */
function productGrids(source: Design, target: Target, measure: Measure, all: Unit[]): { strategy: Candidate['strategy']; design: Design }[] {
  const products = all.filter(u => u.image);
  const other = all.filter(u => !u.image);
  if (products.length < 2 || products.length > 6 || other.length > 4) return [];
  if (products.some(u => !u.elements[0].groupId || !u.elements.some(e => e.type === 'text' && e.role === 'content'))) return [];
  if (other.some(u => u.elements.length !== 1 || u.elements[0].type !== 'text' || u.elements[0].groupId)) return [];
  const placedIds = new Set(all.flatMap(u => u.elements.map(e => e.id)));
  if (source.elements.some(e => !placedIds.has(e.id) && !(e.role === 'background' && !e.groupId))) return [];
  const intersects = (a: Rect, b: Rect) => Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x) &&
    Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y);
  if (all.some((u, i) => all.slice(i + 1).some(v => intersects(u.box, v.box)))) return [];
  const band = bounds(products.map(u => u.box));
  const before = other.filter(u => u.box.y + u.box.height <= band.y);
  const after = other.filter(u => u.box.y >= band.y + band.height);
  if (before.length + after.length !== other.length) return [];

  const short = Math.min(target.width, target.height), margin = short * .065, gap = short * .025;
  const region = { x: margin, y: margin, width: target.width - margin * 2, height: target.height - margin * 2 };
  const relative = short / Math.min(source.width, source.height);
  const bookends = [...before, ...after].map(u => {
    const original = u.elements[0] as TextElement;
    const maximum = original.fontSize * relative * 1.2; // same preferred size as existing ungrouped text
    const layout = layoutText({ ...original, width: region.width * .995, fontSize: maximum }, measure);
    return { original, maximum, height: layout.height + .01, emergencyBreaks: layout.emergencyBreaks };
  });
  if (bookends.some(b => b.emergencyBreaks)) return [];
  const gridHeight = region.height - bookends.reduce((sum, b) => sum + b.height, 0) - gap * bookends.length;
  if (gridHeight <= 0) return [];
  let y = region.y;
  const positioned: Element[] = [];
  let gridY = y;
  for (let i = 0; i <= bookends.length; i++) {
    if (i === before.length) { gridY = y; y += gridHeight + (after.length ? gap : 0); }
    if (i === bookends.length) break;
    const b = bookends[i];
    positioned.push(fitText({ ...b.original, x: region.x, y, width: region.width, height: b.height }, b.maximum, measure));
    y += b.height + gap;
  }
  const alternatives: { strategy: Candidate['strategy']; design: Design }[] = [];
  for (const columns of [1, 2, 3, 4] as const) {
    if (columns > products.length) break;
    // A tall story has room for larger photos in multiple rows. Wider pages
    // may still prefer the source layout; let the source-aware ranker decide.
    if (columns === 4 && (products.length !== 4 || target.width / target.height < .8)) continue;
    const rows = Math.ceil(products.length / columns);
    const width = (region.width - gap * (columns - 1)) / columns;
    const height = (gridHeight - gap * (rows - 1)) / rows;
    if (height <= 0 || width <= 0) continue;
    const grouped = products.flatMap((u, i) => {
      const row = Math.floor(i / columns), col = i % columns;
      const inRow = Math.min(columns, products.length - row * columns);
      const inset = (columns - inRow) * (width + gap) / 2;
      return put(u, { x: region.x + inset + col * (width + gap), y: gridY + row * (height + gap), width, height }, source, target, measure);
    });
    alternatives.push({ strategy: `group-grid-${columns}`, design: assemble(source, target, [...structuredClone(positioned), ...grouped]) });
  }
  return alternatives;
}
/** Hard diagnostics first, then source-aware readability/composition. Omitting source
 * retains the previous comparator for callers and reproducible ranking ablations.
 */
export function compareCandidates(a: Candidate, b: Candidate, source?: Design) {
  const errors = a.metrics.errors - b.metrics.errors;
  if (errors) return errors;
  if (source) {
    const difference = rankingTerms(source, a.design).score - rankingTerms(source, b.design).score;
    if (Math.abs(difference) > 1e-12) return difference;
    // Deterministic source-preserving tie break, independent of candidate array order.
    return CANDIDATE_STRATEGIES.indexOf(a.strategy) - CANDIDATE_STRATEGIES.indexOf(b.strategy);
  }
  return a.metrics.warnings - b.metrics.warnings ||
    b.metrics.minReadingSize - a.metrics.minReadingSize || b.metrics.contentCoverage - a.metrics.contentCoverage;
}
/** Broken output, as opposed to unresolved layout findings (collision, overflow, occlusion...) that stay ranked and visible. */
const STRUCTURAL: Finding['kind'][] = ['invalid-design', 'missing-content', 'preservation', 'group-geometry'];
const MAX_REPORTED_FINDINGS = 20;
export class NoValidCandidateError extends Error {
  readonly code = 'no-valid-candidate';
  /** Deduplicated by kind+message and capped; `total` counts all structural findings across candidates. */
  readonly total: number;
  readonly findings: Finding[];
  constructor(all: Finding[]) { super('No structurally valid candidate was produced.'); this.name = 'NoValidCandidateError';
    this.total = all.length;
    this.findings = [...new Map(all.map(f => [`${f.kind}\0${f.message}`, f])).values()].slice(0, MAX_REPORTED_FINDINGS);
  }
}
export function selectCandidate(candidates: Candidate[], source: Design): Candidate {
  const structural = (c: Candidate) => c.metrics.findings.filter(f => STRUCTURAL.includes(f.kind));
  const eligible = candidates.filter(c => !structural(c).length);
  if (!eligible.length) throw new NoValidCandidateError(candidates.flatMap(structural));
  return eligible.sort((a, b) => compareCandidates(a, b, source))[0];
}
export function reflow(source: Design, target: Target, measure: Measure, resources: DesignResources = BUNDLED_RESOURCES): Result {
  validateResources(source, resources);
  validateTarget(target);
  const started = performance.now();
  const cachedMeasure = cacheMeasurements(measure);
  const candidate = (strategy: Candidate['strategy'], design: Design): Candidate => ({ strategy, design, metrics: evaluate(source, design, cachedMeasure, resources) });
  const same = source.width === target.width && source.height === target.height;
  // Identity keeps the source verbatim (a partial-canvas background must not move); every other uniform candidate bleeds its backgrounds like stack/split do.
  const baseline = candidate(same ? 'identity' : 'uniform', same ? uniform(source, target) : bleed(uniform(source, target), target));
  const candidates = [baseline];
  if (!same) {
    const all = units(source);
    const stacked = candidate('stack', arranged(source, target, 'stack', cachedMeasure, all));
    // Without both unit kinds, split uses exactly the stack path. Reuse completed
    // work but preserve independent public candidates for existing consumers.
    const split = all.some(u => u.image) && all.some(u => !u.image)
      ? candidate('split', arranged(source, target, 'split', cachedMeasure, all))
      : { ...structuredClone(stacked), strategy: 'split' as const };
    candidates.push(stacked, split);
    const seen = new Set(candidates.map(c => JSON.stringify(c.design)));
    for (const grid of productGrids(source, target, cachedMeasure, all)) {
      const signature = JSON.stringify(grid.design);
      if (seen.has(signature)) continue;
      seen.add(signature);
      candidates.push(candidate(grid.strategy, grid.design));
    }
  }
  const selected = selectCandidate(candidates, source);
  return { sourceId: source.id, target: { ...target }, baseline, selected, candidates, elapsedMs: performance.now() - started };
}
