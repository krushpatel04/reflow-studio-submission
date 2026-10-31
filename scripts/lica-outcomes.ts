import { createHash } from 'node:crypto';
import type { CorpusManifest } from '../src/corpus';
import type { LicaConversion } from '../src/lica';

export type ScanObservation = {
  layoutId: string;
  templateId: string;
  category: string;
  state: 'animated' | 'missing-render' | 'missing-json' | 'invalid-json' | 'converted';
  conversion?: Pick<LicaConversion, 'status' | 'losses' | 'blockers'>;
  unavailable?: { code: 'missing-font' | 'image-unavailable'; detail: string };
};
export type Disposition = 'supported' | 'adapted' | 'unsupported' | 'unavailable' | 'not-selected';
export type ImportOutcome = {
  layoutId: string;
  templateId: string;
  category: string;
  disposition: Disposition;
  reason: string;
  detail?: string;
  conversionStatus?: LicaConversion['status'];
  losses: string[];
  blockers: string[];
};
export type ImportLedger = {
  schemaVersion: 'reflow.lica-import.v1';
  metadataSha256: string;
  total: number;
  counts: Record<Disposition, number>;
  entries: ImportOutcome[];
};

/** Frozen LICA archive metadata used for the current corpus. A new download needs a reviewed update. */
export const LICA_METADATA = {
  sha256: '06d478a08e8b64b598413c59cac821c43ba514a5058d96e25ebd762578bc7df0',
  total: 1148,
  entriesSha256: '44b3f3357a17720c70db5e4df671166ff6d1a71a5b25df20555f66fae8c1075e',
};

export function buildImportLedger(scans: ScanObservation[], selectedIds: string[], metadataSha256: string): ImportLedger {
  if (!/^[0-9a-f]{64}$/.test(metadataSha256)) throw Error('Invalid metadata SHA-256.');
  const selected = new Set(selectedIds);
  if (selected.size !== selectedIds.length) throw Error('Duplicate selected layout ID.');
  const seen = new Set<string>();
  const entries = scans.map((scan): ImportOutcome => {
    const { layoutId, templateId, category, state, conversion, unavailable } = scan;
    if (!layoutId || !templateId || !category) throw Error('Incomplete scan identity.');
    if (seen.has(layoutId)) throw Error(`Duplicate scan layout ID ${layoutId}.`);
    seen.add(layoutId);
    if (state === 'converted' && !conversion) throw Error(`Missing conversion for ${layoutId}.`);
    const base = { layoutId, templateId, category, losses: [...(conversion?.losses ?? [])], blockers: [...(conversion?.blockers ?? [])] };
    const withConversion = conversion ? { ...base, conversionStatus: conversion.status } : base;
    if (state === 'animated') return { ...withConversion, disposition: 'unsupported', reason: 'animated-layout' };
    if (state !== 'converted') return { ...withConversion, disposition: 'unavailable', reason: state };
    if (conversion!.status === 'unsupported') return { ...withConversion, disposition: 'unsupported', reason: 'conversion-blocked' };
    if (unavailable) return { ...withConversion, disposition: 'unavailable', reason: unavailable.code, detail: unavailable.detail };
    if (!selected.has(layoutId)) return { ...withConversion, disposition: 'not-selected', reason: 'batch-limit-assets-unchecked' };
    return { ...withConversion, disposition: conversion!.status, reason: 'selected' };
  });
  for (const id of selected) {
    const outcome = entries.find(e => e.layoutId === id);
    if (!outcome || !['supported', 'adapted'].includes(outcome.disposition)) throw Error(`Selected layout ${id} is missing or unavailable.`);
  }
  const counts: ImportLedger['counts'] = { supported: 0, adapted: 0, unsupported: 0, unavailable: 0, 'not-selected': 0 };
  for (const entry of entries) counts[entry.disposition]++;
  return { schemaVersion: 'reflow.lica-import.v1', metadataSha256, total: entries.length, counts, entries: entries.sort((a, b) => a.layoutId.localeCompare(b.layoutId)) };
}

export function checkImportLedger(ledger: ImportLedger, manifest: CorpusManifest, expectedMetadata?: { sha256: string; total: number; entriesSha256?: string }): string[] {
  const errors: string[] = [];
  if (ledger.schemaVersion !== 'reflow.lica-import.v1') errors.push('Unknown import ledger schema.');
  if (!/^[0-9a-f]{64}$/.test(ledger.metadataSha256)) errors.push('Invalid metadata SHA-256.');
  if (ledger.total !== ledger.entries.length) errors.push('Import ledger total does not match entries.');
  if (expectedMetadata && ledger.total !== expectedMetadata.total) errors.push('Import ledger metadata total differs from the pinned source.');
  if (expectedMetadata && ledger.metadataSha256 !== expectedMetadata.sha256) errors.push('Import ledger metadata hash differs from the pinned source.');
  if (expectedMetadata?.entriesSha256) {
    const identities = ledger.entries.map(entry => [entry.layoutId, entry.templateId, entry.category]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    const hash = createHash('sha256').update(JSON.stringify(identities)).digest('hex');
    if (hash !== expectedMetadata.entriesSha256) errors.push('Import ledger metadata identities differ from the pinned source.');
  }
  const seen = new Set<string>();
  const counts: ImportLedger['counts'] = { supported: 0, adapted: 0, unsupported: 0, unavailable: 0, 'not-selected': 0 };
  const selected = new Set<string>();
  for (const entry of ledger.entries) {
    if (seen.has(entry.layoutId)) errors.push(`Duplicate ledger layout ID ${entry.layoutId}.`);
    seen.add(entry.layoutId);
    if (!Object.hasOwn(counts, entry.disposition)) { errors.push(`Invalid disposition for ${entry.layoutId}.`); continue; }
    counts[entry.disposition]++;
    if (entry.disposition === 'supported' || entry.disposition === 'adapted') selected.add(`lica-${entry.layoutId}`);
  }
  for (const disposition of Object.keys(counts) as Disposition[]) {
    if (ledger.counts[disposition] !== counts[disposition]) errors.push(`Count for ${disposition} does not match entries.`);
  }
  const manifestIds = new Set(manifest.sources.filter(source => source.id.startsWith('lica-')).map(source => source.id));
  for (const id of selected) if (!manifestIds.has(id)) errors.push(`Selected ${id} is absent from the manifest.`);
  const byId = new Map(ledger.entries.map(entry => [`lica-${entry.layoutId}`, entry]));
  for (const source of manifest.sources.filter(source => source.id.startsWith('lica-'))) {
    const outcome = byId.get(source.id);
    if (!outcome || !selected.has(source.id)) { errors.push(`Manifest source ${source.id} is absent from selected outcomes.`); continue; }
    if (source.templateId !== `lica:${outcome.templateId}` || source.familyId !== `lica-${outcome.templateId}`) errors.push(`Manifest template for ${source.id} differs from the import outcome.`);
    if (source.conversion.status !== outcome.conversionStatus || JSON.stringify(source.conversion.losses) !== JSON.stringify(outcome.losses)) errors.push(`Manifest conversion for ${source.id} differs from the import outcome.`);
  }
  return errors;
}
