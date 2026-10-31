import { createHash } from 'node:crypto';
import { badge, imagePrice } from './grouped-designs';
import { FIXTURES } from '../../src/fixtures';
import { reflow } from '../../src/engine';
import type { Design } from '../../src/model';
import { measure } from '../../scripts/native';

export const TARGETS: [number, number][] = [[1001, 1000], [600, 1200], [1600, 400], [80, 3000], [1080, 1350], [728, 90], [1000, 1000]];
export const DESIGNS = (): Design[] => [...FIXTURES, badge(), badge('background'), badge('background', 'decoration'), imagePrice()];
export const hasUngroupedBackground = (d: Design) => d.elements.some(e => e.role === 'background' && !e.groupId);
/** sha256 of the full result (candidates, selection, metrics) minus wall-clock time, per design x target. */
export function snapshot(): Record<string, { hash: string; selected: string; ungroupedBackground: boolean }> {
  const out: Record<string, { hash: string; selected: string; ungroupedBackground: boolean }> = {};
  for (const d of DESIGNS()) for (const [width, height] of TARGETS) {
    const { elapsedMs, ...rest } = reflow(d, { id: 't', label: 'T', width, height }, measure);
    void elapsedMs;
    out[`${d.id}@${width}x${height}`] = { hash: createHash('sha256').update(JSON.stringify(rest)).digest('hex').slice(0, 16), selected: rest.selected.strategy, ungroupedBackground: hasUngroupedBackground(d) };
  }
  return out;
}
if (process.argv[1]?.endsWith('bleed-snapshot.ts')) console.log(JSON.stringify(snapshot(), null, 1));
