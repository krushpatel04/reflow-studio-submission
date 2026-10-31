import type { Design, Element, Rect } from './model';

const bounded = (n: number) => Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
const ratioChange = (a: number, b: number) => bounded(1 - Math.exp(-Math.abs(a - b)));
const anchors = (e: Rect, axis: 'x' | 'y') => {
  const size = axis === 'x' ? e.width : e.height;
  return [e[axis], e[axis] + size / 2, e[axis] + size];
};
const prominence = (e: Element) => e.type === 'text' ? Math.log(e.fontSize) : (Math.log(e.width) + Math.log(e.height)) / 2;
const gap = (a: Rect, b: Rect, axis: 'x' | 'y') => Math.max(a[axis], b[axis]) -
  Math.min(a[axis] + (axis === 'x' ? a.width : a.height), b[axis] + (axis === 'x' ? b.width : b.height));

/** Worst squared short-edge deficit; the evaluator still reports every reading < 9 warning.
 * Extra size above readability contributes no reward. Empty copy is not a reading task.
 * Readable headlines cannot dilute an unreadable caption by increasing element count.
 */
export function readabilityDeficit(design: Design): number {
  return Math.max(0, ...design.elements.flatMap(e => e.type === 'text' && e.role === 'content' && e.text.trim()
    ? [bounded(1 - e.fontSize * 360 / Math.min(design.width, design.height) / 9) ** 2] : []));
}

/** Source-relative preferences, each in [0, 1]. These are geometry proxies, not
 * visibility checks or aesthetic scores. Uniform scaling/letterboxing has zero cost.
 * Cover-frame aspect change is crop risk: intrinsic asset dimensions are unavailable.
 */
export function compositionChange(source: Design, output: Design) {
  const scale = Math.min(output.width / source.width, output.height / source.height);
  const dx = (output.width - source.width * scale) / 2, dy = (output.height - source.height * scale) / 2;
  const short = Math.min(output.width, output.height);
  const outputs = new Map(output.elements.map(e => [e.id, e]));
  const entries = source.elements.filter(e => e.role !== 'background' || e.groupId).map(original => ({
    original, placed: outputs.get(original.id),
    expected: { x: original.x * scale + dx, y: original.y * scale + dy, width: original.width * scale, height: original.height * scale },
  }));
  const movement: number[] = [], alignment: number[] = [], spacing: number[] = [], hierarchy: number[] = [], crop: number[] = [];
  for (let i = 0; i < entries.length; i++) {
    const { original, placed, expected } = entries[i];
    if (!placed) { movement.push(1); continue; } // Preservation errors are ranked first by the caller.
    movement.push(bounded(Math.hypot(placed.x + placed.width / 2 - expected.x - expected.width / 2,
      placed.y + placed.height / 2 - expected.y - expected.height / 2) / short));
    if (original.type === 'image' && original.fit === 'cover') crop.push(ratioChange(
      Math.log(original.width) - Math.log(original.height), Math.log(placed.width) - Math.log(placed.height)));
    for (let j = 0; j < i; j++) {
      const other = entries[j];
      if (!other.placed) continue;
      for (const axis of ['x', 'y'] as const) {
        spacing.push(bounded(Math.abs(gap(placed, other.placed, axis) - gap(expected, other.expected, axis)) / short));
        const a = anchors(original, axis), b = anchors(other.original, axis);
        for (let k = 0; k < a.length; k++) {
          // Preserve common left/center/right and top/middle/bottom alignments.
          if (Math.abs(a[k] - b[k]) > Math.min(source.width, source.height) * .01) continue;
          const actual = anchors(placed, axis)[k] - anchors(other.placed, axis)[k];
          alignment.push(bounded(Math.abs(actual - (a[k] - b[k]) * scale) / short));
        }
      }
      if (['text', 'image'].includes(original.type) && ['text', 'image'].includes(other.original.type)) {
        hierarchy.push(ratioChange(prominence(original) - prominence(other.original), prominence(placed) - prominence(other.placed)));
      }
    }
  }
  const terms = { movement: mean(movement), alignment: mean(alignment), spacing: mean(spacing), hierarchy: mean(hierarchy), cropRisk: mean(crop) };
  return { ...terms, loss: mean(Object.values(terms)) };
}

export function rankingTerms(source: Design, output: Design) {
  const composition = compositionChange(source, output), reading = readabilityDeficit(output);
  const aspectChange = (output.width / output.height) / (source.width / source.height);
  const compositionWeight = Math.min(aspectChange, 1 / aspectChange);
  const compositionPenalty = composition.loss * compositionWeight;
  // A substantial deficit can justify rearranging; tiny threshold crossings cannot
  // overwhelm composition. Fixed heuristic weight, with ablation in review:stability.
  return { ...composition, compositionWeight, compositionPenalty, readabilityDeficit: reading, score: 8 * reading + compositionPenalty };
}
