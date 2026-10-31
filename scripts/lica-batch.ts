import type { CorpusManifest, CorpusResource, CorpusSource, CorpusSplit } from '../src/corpus';
import type { LicaConversion } from '../src/lica';
import type { Design, Rect, Target } from '../src/model';

/** Pure batch logic for the LICA importer (#7). See docs/plans/lica-importer.md. */

// v0 targets: ours, not Adobe's. A new manifest version replaces them if the official release differs.
export const LICA_TARGETS: Target[] = [
  { id: 'square', label: 'Square', width: 1080, height: 1080 },
  { id: 'story', label: 'Story', width: 1080, height: 1920 },
  { id: 'landscape', label: 'Landscape', width: 1920, height: 1080 },
  { id: 'portrait', label: 'Portrait', width: 1080, height: 1350 },
  { id: 'banner', label: 'Banner', width: 1500, height: 500 },
  { id: 'leaderboard', label: 'Leaderboard', width: 728, height: 90 },
  { id: 'skyscraper', label: 'Skyscraper', width: 160, height: 600 },
];

export type RatioClass = 'near' | 'far' | 'extreme';
/** r = max(a_t/a_s, a_s/a_t) with a = width/height. near ≤ 1.5 < far ≤ 4 < extreme. */
export function ratioClass(source: { width: number; height: number }, target: { width: number; height: number }): RatioClass {
  const a = source.width / source.height, b = target.width / target.height;
  const r = Math.max(a / b, b / a);
  return r <= 1.5 ? 'near' : r <= 4 ? 'far' : 'extreme';
}

/** Format/structure signals only; none establishes visually reviewed busy-photo coverage. */
export type LayoutCoverage = { contentGroups: number; textOverSvg: number; textOverRaster: number; textOverUnknown: number };
export type LayoutFeatures = { overlaps: number; translucent: number; textOverImage: number; elements: number; coverage?: LayoutCoverage };
const overlap = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

/** Level 2 signals from the brief: overlap, transparency, text over imagery, element count. */
export function designFeatures(design: Design): LayoutFeatures {
  const els = design.elements;
  const placed = els.filter(e => e.role !== 'background');
  let overlaps = 0;
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) if (overlap(placed[i], placed[j]) > 0) overlaps++;
  const translucent = els.filter(e => (e.opacity ?? 1) < 1).length;
  const textOverImage = els.filter((e, i) => e.type === 'text' && els.slice(0, i).some(u => u.type === 'image' && overlap(e, u) >= 0.5 * e.width * e.height)).length;
  const coverage: LayoutCoverage = { contentGroups: 0, textOverSvg: 0, textOverRaster: 0, textOverUnknown: 0 };
  for (const id of new Set(design.groups.map(g => g.id))) {
    const members = els.filter(e => e.groupId === id && e.role !== 'background');
    if (members.length >= 2 && members.some(e => e.role === 'content')) coverage.contentGroups++;
  }
  for (const [i, text] of els.entries()) {
    if (text.type !== 'text' || text.width <= 0 || text.height <= 0) continue;
    const formats = new Set<keyof Omit<LayoutCoverage, 'contentGroups'>>();
    for (const image of els.slice(0, i)) {
      if (image.type !== 'image' || overlap(text, image) < 0.5 * text.width * text.height) continue;
      // Extensions identify format candidates, never image content or photo busyness.
      const path = image.assetId.split(/[?#]/)[0];
      formats.add(/\.svg$/i.test(path) ? 'textOverSvg' : /\.(png|jpe?g|webp|gif|avif|bmp)$/i.test(path) ? 'textOverRaster' : 'textOverUnknown');
    }
    for (const format of formats) coverage[format]++;
  }
  return { overlaps, translucent, textOverImage, elements: els.length, coverage };
}
/** Selection priority, not a quality score. */
export const priority = (f: LayoutFeatures) => Math.min(f.overlaps, 10) + (f.translucent ? 5 : 0) + (f.textOverImage ? 5 : 0) + Math.min(f.elements, 30) / 3;

export type PoolEntry = {
  layoutId: string; templateId: string; category: string; width: number; height: number;
  status: LicaConversion['status']; available: boolean; features: LayoutFeatures;
};
export type BatchOptions = { seed: number; maxLayouts: number; maxTemplates: number; perTemplate: number; minTextOverImage: number; categoryShare: number };
export const DEFAULT_BATCH: BatchOptions = { seed: 20260922, maxLayouts: 30, maxTemplates: 10, perTemplate: 4, minTextOverImage: 3, categoryShare: 1 / 3 };

/** Hard ceilings keep a CLI typo from planning an unbounded archive import. */
export function parseBatchOptions(values: Partial<Record<'seed' | 'maxLayouts' | 'maxTemplates' | 'perTemplate', string | undefined>>): BatchOptions {
  const limits = { seed: 0xffffffff, maxLayouts: 100, maxTemplates: 40, perTemplate: 8 };
  const labels = { seed: 'seed', maxLayouts: 'max-layouts', maxTemplates: 'max-templates', perTemplate: 'per-template' };
  const parsed = { ...DEFAULT_BATCH };
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    const raw = values[key];
    if (raw === undefined) continue;
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < (key === 'seed' ? 0 : 1) || value > limits[key]) throw Error(`Invalid --${labels[key]}: expected integer ${key === 'seed' ? '0' : '1'}..${limits[key]}.`);
    parsed[key] = value;
  }
  return parsed;
}

/** mulberry32: small deterministic generator for reproducible selection. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type TemplateGroup = { id: string; category: string; tiebreak: number; layouts: PoolEntry[] };

export function selectBatch(pool: PoolEntry[], options: BatchOptions = DEFAULT_BATCH, pinnedIds: string[] = []): PoolEntry[] {
  const rand = seeded(options.seed);
  const available = new Map(pool.filter(e => e.status !== 'unsupported' && e.available).map(e => [e.layoutId, e]));
  if (available.size !== pool.filter(e => e.status !== 'unsupported' && e.available).length) throw Error('Duplicate available layout ID.');
  if (new Set(pinnedIds).size !== pinnedIds.length) throw Error('Duplicate pinned layout ID.');
  const chosen: PoolEntry[] = pinnedIds.map(id => {
    const e = available.get(id);
    if (!e) throw Error(`Pinned layout ${id} is unavailable in the current scan.`);
    return e;
  });
  const used = new Set(chosen.map(e => e.templateId));
  const perCategory = new Map<string, number>();
  const perTemplate = new Map<string, number>();
  for (const e of chosen) {
    perCategory.set(e.category, (perCategory.get(e.category) ?? 0) + 1);
    perTemplate.set(e.templateId, (perTemplate.get(e.templateId) ?? 0) + 1);
  }
  const categoryCap = Math.floor(options.maxLayouts * options.categoryShare);
  if (chosen.length > options.maxLayouts || used.size > options.maxTemplates || [...perTemplate.values()].some(n => n > options.perTemplate) || [...perCategory.values()].some(n => n > categoryCap)) throw Error('Pinned corpus exceeds a batch cap.');
  const byTemplate = new Map<string, PoolEntry[]>();
  for (const e of available.values()) if (!pinnedIds.includes(e.layoutId)) byTemplate.set(e.templateId, [...(byTemplate.get(e.templateId) ?? []), e]);
  const groups: TemplateGroup[] = [...byTemplate.keys()].sort().map(id => {
    const layouts = [...byTemplate.get(id)!].sort((a, b) => priority(b.features) - priority(a.features) || a.layoutId.localeCompare(b.layoutId)).slice(0, options.perTemplate - (perTemplate.get(id) ?? 0));
    return { id, category: byTemplate.get(id)![0].category, tiebreak: rand(), layouts };
  }).filter(g => g.layouts.length > 0);
  const best = (g: TemplateGroup) => priority(g.layouts[0].features);
  const ordered = (list: TemplateGroup[]) => [...list].sort((a, b) => best(b) - best(a) || a.tiebreak - b.tiebreak);
  const hasTextOverImage = (g: TemplateGroup) => g.layouts.some(l => l.features.textOverImage > 0);
  const taken = new Set<string>();
  const take = (g: TemplateGroup) => {
    if (taken.has(g.id)) return;
    if (!used.has(g.id) && used.size >= options.maxTemplates) return;
    const room = Math.min(options.maxLayouts - chosen.length, categoryCap - (perCategory.get(g.category) ?? 0));
    if (room <= 0) return;
    const layouts = g.layouts.slice(0, room);
    chosen.push(...layouts);
    used.add(g.id);
    perTemplate.set(g.id, (perTemplate.get(g.id) ?? 0) + layouts.length);
    perCategory.set(g.category, (perCategory.get(g.category) ?? 0) + layouts.length);
    taken.add(g.id);
  };
  const textOverImageCount = () => chosen.filter(l => l.features.textOverImage > 0).length;
  for (const g of ordered(groups.filter(hasTextOverImage))) {
    if (textOverImageCount() >= options.minTextOverImage) break;
    take(g);
  }
  for (const g of ordered(groups)) take(g);
  return chosen;
}

/** About two thirds development, the rest validation. LICA never supplies sealed test families. */
export function assignSplits(templateIds: string[], seed: number): Map<string, CorpusSplit> {
  const rand = seeded(seed ^ 0x5eed);
  const order = [...new Set(templateIds)].sort().map(id => ({ id, r: rand() })).sort((a, b) => a.r - b.r || a.id.localeCompare(b.id));
  const development = Math.ceil(order.length * 2 / 3);
  return new Map(order.map((t, i): [string, CorpusSplit] => [t.id, i < development ? 'development' : 'validation']));
}

export type ImportedSource = { entry: PoolEntry; file: string; sha256: string; resources: CorpusResource[]; losses: string[] };
export const IMPORTER = 'lica-import@1';
export const LICA_ATTRIBUTION = { name: 'LICA', license: 'CC-BY-4.0', attribution: 'LICA dataset (LICA WORLD) authors', url: 'https://github.com/purvanshi/lica-dataset' };

export function buildManifest(sources: ImportedSource[], splits: Map<string, CorpusSplit>): CorpusManifest {
  const families = new Map<string, CorpusManifest['families'][number]>();
  for (const { entry } of sources) {
    const split = splits.get(entry.templateId);
    if (!split) throw new Error(`No split for template ${entry.templateId}.`);
    if (!families.has(entry.templateId)) families.set(entry.templateId, { id: `lica-${entry.templateId}`, split, description: `LICA template ${entry.templateId} (${entry.category})` });
  }
  return {
    schemaVersion: 'reflow.corpus.v0',
    targets: LICA_TARGETS,
    families: [...families.values()],
    sources: sources.map(({ entry, file, sha256, resources, losses }): CorpusSource => {
      if (entry.status === 'unsupported') throw new Error(`Layout ${entry.layoutId} is unsupported and cannot be imported.`);
      return {
        id: `lica-${entry.layoutId}`, familyId: `lica-${entry.templateId}`, file, sha256, templateId: `lica:${entry.templateId}`,
        provenance: { kind: 'dataset', ...LICA_ATTRIBUTION }, resources,
        conversion: { status: entry.status, importer: IMPORTER, losses },
      };
    }),
  };
}

/** Preserve existing manifest records and order while admitting only genuinely new evidence. */
export function mergeManifest(previous: CorpusManifest | undefined, addition: CorpusManifest): CorpusManifest {
  if (!previous) return addition;
  if (JSON.stringify(previous.targets) !== JSON.stringify(addition.targets) || previous.schemaVersion !== addition.schemaVersion) throw Error('Manifest targets or schema conflict.');
  const merge = <T extends { id: string }>(old: T[], fresh: T[], kind: string): T[] => {
    const byId = new Map(old.map(item => [item.id, item]));
    const result = [...old];
    for (const item of fresh) {
      const existing = byId.get(item.id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(item)) throw Error(`${kind} ${item.id} conflict with existing manifest.`);
      if (!existing) { result.push(item); byId.set(item.id, item); }
    }
    return result;
  };
  return { ...previous, families: merge(previous.families, addition.families, 'Family'), sources: merge(previous.sources, addition.sources, 'Source') };
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false, closed = false;
  const endRow = () => { row.push(field); field = ''; closed = false; if (row.some(f => f !== '')) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { quoted = false; closed = true; }
      else field += ch;
    } else if (ch === ',') { row.push(field); field = ''; closed = false; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; endRow(); }
    else if (ch === '"' && !field && !closed) quoted = true;
    else if (ch === '"' || closed) throw Error('Invalid CSV quote.');
    else field += ch;
  }
  if (quoted) throw Error('Unterminated CSV quote.');
  endRow();
  const [header = [], ...body] = rows;
  if (!header.length || header.some(h => !h.trim()) || new Set(header).size !== header.length || body.some(r => r.length !== header.length)) throw Error('Invalid CSV columns.');
  return body.map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

export function summarize(entries: PoolEntry[]) {
  const categories: Record<string, number> = {};
  for (const e of entries) categories[e.category] = (categories[e.category] ?? 0) + 1;
  const assessed = entries.filter(e => e.features.coverage !== undefined);
  const withContentGroups = assessed.filter(e => e.features.coverage!.contentGroups > 0).length;
  const uncovered: string[] = [];
  // Missing legacy annotations are unknown, not evidence that a category is absent.
  if (assessed.length === entries.length) {
    if (!withContentGroups) uncovered.push('grouped-content');
    if (!assessed.some(e => e.features.coverage!.textOverSvg + e.features.coverage!.textOverRaster + e.features.coverage!.textOverUnknown > 0)) uncovered.push('text-over-image');
  }
  return {
    layouts: entries.length,
    templates: new Set(entries.map(e => e.templateId)).size,
    withOverlap: entries.filter(e => e.features.overlaps > 0).length,
    translucent: entries.filter(e => e.features.translucent > 0).length,
    textOverImage: entries.filter(e => e.features.textOverImage > 0).length,
    categories,
    coverage: {
      assessedLayouts: assessed.length, unassessedLayouts: entries.length - assessed.length,
      withContentGroups,
      withTextOverSvg: assessed.filter(e => e.features.coverage!.textOverSvg > 0).length,
      withTextOverRaster: assessed.filter(e => e.features.coverage!.textOverRaster > 0).length,
      withTextOverUnknown: assessed.filter(e => e.features.coverage!.textOverUnknown > 0).length,
      busyPhotoText: 'unverified' as const, uncovered,
    },
  };
}

export function attributionText(batch: PoolEntry[]): string {
  return [
    '# LICA designs in this corpus', '',
    'Source: LICA dataset (LICA WORLD), https://github.com/purvanshi/lica-dataset, licensed CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).', '',
    `Converted by \`scripts/lica-import.ts\` (${IMPORTER}) into Reflow's provisional \`reflow.design.v0\` format. Unsupported styling was dropped or approximated; each design's changes are listed in \`corpus/manifest.json\` under \`conversion.losses\`. LICA GROUP components became plain shapes, so no element groups are preserved.`, '',
    'Images were fetched from each LICA component\'s source URL. The dataset does not document separate rights for photos inside designs.', '',
    'Fonts are Fontsource latin-subset files under their own licenses; each license file sits next to its fonts.', '',
    '## Layouts', '',
    ...batch.map(e => `- ${e.layoutId} (template ${e.templateId}, ${e.category})`), '',
  ].join('\n');
}

export function visualCheckTemplate(batch: PoolEntry[]): string {
  return [
    '# Visual check: LICA render vs converted design', '',
    'One row per design, filled in after inspecting `reports/corpus-import/<layout>.png`. Result: close, differs or failed. When they differ, say which side is wrong: LICA\'s PNG can disagree with its own JSON.', '',
    '| Layout | Template | Result | Notes |', '| --- | --- | --- | --- |',
    ...batch.map(e => `| ${e.layoutId} | ${e.templateId} | pending | |`), '',
  ].join('\n');
}

export function appendVisualChecks(current: string, batch: PoolEntry[]): string {
  const added = batch.filter(e => !current.includes(`| ${e.layoutId} |`));
  if (!added.length) return current;
  return current.trimEnd() + '\n\n## Pending expansion checks\n\n| Layout | Template | Result | Notes |\n| --- | --- | --- | --- |\n' + added.map(e => `| ${e.layoutId} | ${e.templateId} | pending | |`).join('\n') + '\n';
}
