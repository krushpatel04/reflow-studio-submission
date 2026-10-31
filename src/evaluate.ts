import { overlap, validateDesign, DesignValidationError, type Element, type Design, type Finding, type Metrics } from './model';
import { layoutText, type Measure } from './typography';
import { findUncoveredText } from './font-coverage';
import { BUNDLED_RESOURCES, type DesignResources } from './resources';
import { cropGeometry } from './crop';
import { imagery, layer, legibleShare, obstruction, samplePoints, type Imagery } from './visibility';

/** Explicit protected fields: adding a schema field requires a preservation decision here. */
function protectedFields(e: Element): Record<string, unknown> {
  const base = { role: e.role, groupId: e.groupId, opacity: e.opacity ?? 1 };
  if (e.type === 'text') return { ...base, text: e.text, fontFamily: e.fontFamily,
    fontWeight: e.fontWeight, color: e.color, lineHeight: e.lineHeight, align: e.align ?? 'left' };
  if (e.type === 'image') return { ...base, assetId: e.assetId, fit: e.fit, focalPoint: [e.focalPoint.x, e.focalPoint.y] };
  return { ...base, color: e.color };
}
function preservation(source: Design, output: Design): Finding[] {
  const findings: Finding[] = [];
  const changed = (path: string, elementIds: string[], kind: Finding['kind'] = 'preservation') => {
    findings.push({ kind, severity: 'error', elementIds, message: `${path}: protected source value changed or missing.` });
  };
  for (const key of ['schemaVersion', 'id', 'name', 'description', 'provenance', 'background'] as const) {
    if (source[key] !== output[key]) changed(`$.${key}`, []);
  }
  // Group definition order carries no paint semantics; membership and labels do.
  const groups = (d: Design) => d.groups.map(g => [g.id, g.label]).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  if (JSON.stringify(groups(source)) !== JSON.stringify(groups(output))) changed('$.groups', []);
  const originals = new Map(source.elements.map(e => [e.id, e]));
  const outputs = new Map(output.elements.map((e, i) => [e.id, { e, i }]));
  for (const original of source.elements) {
    const match = outputs.get(original.id);
    if (!match) { changed('$.elements', [original.id], 'missing-content'); continue; }
    const { e, i } = match;
    if (e.type !== original.type) { changed(`$.elements[${i}].type`, [e.id], 'missing-content'); continue; }
    const before = protectedFields(original), after = protectedFields(e);
    for (const key of Object.keys(before)) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changed(`$.elements[${i}].${key}`, [e.id], key === 'text' || key === 'assetId' ? 'missing-content' : 'preservation');
      }
    }
  }
  for (const e of output.elements) if (!originals.has(e.id)) changed('$.elements', [e.id], 'missing-content');
  if (source.elements.length === output.elements.length && source.elements.some((e, i) => e.id !== output.elements[i].id)) {
    findings.push({ kind: 'preservation', severity: 'error', elementIds: output.elements.filter((e, i) => e.id !== source.elements[i].id).map(e => e.id), message: '$.elements: paint order changed.' });
  }
  return findings;
}

/** All members of an explicit group share one rectangle transform, irrespective of role.
 * Font fitting inside those rectangles remains legal. This does not detect general occlusion.
 */
function groupGeometry(source: Design, output: Design): Finding[] {
  const outputs = new Map(output.elements.map(e => [e.id, e]));
  const findings: Finding[] = [];
  for (const group of source.groups) {
    const members = source.elements.filter(e => e.groupId === group.id);
    if (members.length < 2 || members.some(e => !outputs.has(e.id))) continue;
    const original = members[0], anchor = outputs.get(original.id)!;
    const scale = anchor.width / original.width;
    // Compare in source units so target size and translation do not loosen the policy.
    const tolerance = Math.max(1, ...members.flatMap(e => [e.width, e.height, Math.abs(e.x - original.x), Math.abs(e.y - original.y)])) * 1e-6;
    const different = (actual: number, expected: number) => !Number.isFinite(actual) || Math.abs(actual - expected) > tolerance;
    const changed = !Number.isFinite(scale) || scale <= 0 || members.some(e => {
      const placed = outputs.get(e.id)!;
      return different((placed.x - anchor.x) / scale, e.x - original.x) ||
        different((placed.y - anchor.y) / scale, e.y - original.y) ||
        different(placed.width / scale, e.width) || different(placed.height / scale, e.height);
    });
    if (changed) findings.push({ kind: 'group-geometry', severity: 'error', elementIds: members.map(e => e.id),
      message: `Group "${group.id}": member rectangles no longer share a uniform scale and translation.` });
  }
  return findings;
}

/** Provisional engineering thresholds, not calibrated aesthetics. Each compares output with
 * source, so layering, contrast and crops present in the source are never reported. */
const OCCLUSION_INCREASE = 0.1, LEGIBLE_DECREASE = 0.1, OVERLAP_GROWTH = 0.1, MIN_CROP_RETAINED = 0.5;
const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Newly obscured content, newly illegible text and image crops that drop most of the
 * source-visible region. Tied to element IDs so a candidate generator can repair them. */
function visibility(source: Design, output: Design, measure: Measure, size: Imagery): Finding[] {
  const findings: Finding[] = [];
  const sourceIndex = new Map(source.elements.map((e, i) => [e.id, i]));
  const sourceLayers = source.elements.map(e => layer(e, size)), outputLayers = output.elements.map(e => layer(e, size));
  output.elements.forEach((e, i) => {
    const si = sourceIndex.get(e.id);
    if (si === undefined) return;
    const s = source.elements[si];
    if (s.type !== e.type) return;
    // Occlusion and contrast concern content; crop-loss below applies to an image of any role ("an image with known dimensions").
    const points = e.role === 'content' ? samplePoints(e, measure, size) : [], sourcePoints = e.role === 'content' ? samplePoints(s, measure, size) : [];
    if (points.length && sourcePoints.length) {
      const after = obstruction(outputLayers, i, points), before = obstruction(sourceLayers, si, sourcePoints);
      if (after.total - before.total > OCCLUSION_INCREASE) {
        const layers = [...after.byLayer].filter(([id, share]) => share > (before.byLayer.get(id) ?? 0) + 1e-9).map(([id]) => id);
        findings.push({ kind: 'occlusion', severity: 'error', elementIds: [e.id, ...layers], region: after.region,
          message: `${e.id} is ${pct(after.total)} obscured by later layers (${layers.join(', ')}); ${pct(before.total)} in the source.` });
      }
      const legible = legibleShare(output, outputLayers, i, points), sourceLegible = legibleShare(source, sourceLayers, si, sourcePoints);
      if (legible && sourceLegible && sourceLegible.share - legible.share > LEGIBLE_DECREASE) {
        findings.push({ kind: 'low-contrast', severity: 'error', elementIds: [e.id], region: legible.region,
          message: `${e.id} keeps 3:1 contrast over ${pct(legible.share)} of its text area against its backing; ${pct(sourceLegible.share)} in the source.` });
      }
    }
    if (e.type === 'image' && s.type === 'image') {
      const known = size(e);
      if (!known) return;
      const kept = cropGeometry(s, s.fit, s.focalPoint, known).source, shown = cropGeometry(e, e.fit, e.focalPoint, known).source;
      const retained = overlap(kept, shown) / (kept.width * kept.height);
      if (retained < MIN_CROP_RETAINED) findings.push({ kind: 'crop-loss', severity: 'warning', elementIds: [e.id], region: { x: e.x, y: e.y, width: e.width, height: e.height },
        message: `${e.id} shows ${pct(retained)} of the image region visible in the source.` });
    }
  });
  return findings;
}

/** Engineering diagnostics, not an Adobe score or an aesthetic quality oracle.
 * Source must be valid. Malformed candidates are infeasible without reaching measurement.
 * Resource availability is checked separately at reflow/rendering boundaries.
 */
export function evaluate(source: Design, output: Design, measure: Measure, resources: DesignResources = BUNDLED_RESOURCES): Metrics {
  validateDesign(source);
  try { validateDesign(output); } catch (error) {
    if (!(error instanceof DesignValidationError)) throw error;
    const kind = error.code === 'duplicate-id' && error.path.startsWith('$.elements') ? 'missing-content' : 'invalid-design';
    return { errors: 1, warnings: 0, minReadingSize: 0, contentCoverage: 0,
      findings: [{ kind, severity: 'error', elementIds: [], message: error.message }] };
  }
  const findings = [...preservation(source, output), ...groupGeometry(source, output), ...visibility(source, output, measure, imagery(resources))];
  // Text content is a protected field preserved from source into output, so scanning
  // only `output` reports each real uncovered-glyph problem once per Metrics call
  // rather than once for source and again for the (typically identical) candidate text.
  for (const glyph of findUncoveredText(output)) {
    findings.push({ kind: 'unsupported-glyph', severity: 'warning', elementIds: [glyph.elementId], message: glyph.message });
  }
  const originals = new Map(source.elements.map(e => [e.id, e]));
  const content = output.elements.filter(e => e.role === 'content');
  let minReadingSize = Infinity;
  for (const e of content) {
    if (e.x < -0.5 || e.y < -0.5 || e.x + e.width > output.width + 0.5 || e.y + e.height > output.height + 0.5) {
      findings.push({ kind: 'out-of-bounds', severity: 'error', elementIds: [e.id], message: `${e.id} extends outside the canvas.` });
    }
    if (e.type === 'text') {
      const layout = layoutText(e, measure);
      if (layout.height > e.height + 0.5 || layout.width > e.width + 0.5) findings.push({ kind: 'text-overflow', severity: 'error', elementIds: [e.id], message: `${e.id} clips its text box.` });
      // Compare at a common 360px short edge. This is an internal readability proxy.
      const reading = e.fontSize * 360 / Math.min(output.width, output.height);
      minReadingSize = Math.min(minReadingSize, reading);
      if (e.text.trim() && reading < 9) findings.push({ kind: 'small-text', severity: 'warning', elementIds: [e.id], message: `${e.id} reads at ${reading.toFixed(1)}px on a 360px short edge.` });
    }
  }
  for (let i = 0; i < content.length; i++) for (let j = i + 1; j < content.length; j++) {
    const a = content[i], b = content[j];
    const area = overlap(a, b);
    if (area <= Math.min(a.width * a.height, b.width * b.height) * 0.015) continue;
    const sa = originals.get(a.id), sb = originals.get(b.id);
    // Preserve intentional source layering (e.g. text on its button or photograph) unless the
    // overlap grows substantially. Two overlapping text boxes are still a potential collision.
    const share = (x: typeof a, y: typeof b) => overlap(x, y) / Math.min(x.width * x.height, y.width * y.height);
    const intentional = sa && sb && overlap(sa, sb) > 0 && !(a.type === 'text' && b.type === 'text') &&
      share(a, b) - share(sa, sb) <= OVERLAP_GROWTH;
    if (!intentional) {
      const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
      findings.push({ kind: 'collision', severity: 'error', elementIds: [a.id, b.id], message: `${a.id} overlaps ${b.id}.`,
        region: { x, y, width: Math.min(a.x + a.width, b.x + b.width) - x, height: Math.min(a.y + a.height, b.y + b.height) - y } });
    }
  }
  return {
    errors: findings.filter(f => f.severity === 'error').length,
    warnings: findings.filter(f => f.severity === 'warning').length,
    minReadingSize: Number.isFinite(minReadingSize) ? minReadingSize : 0,
    contentCoverage: Math.min(1, content.reduce((sum, e) => sum + e.width * e.height, 0) / (output.width * output.height)),
    findings,
  };
}
