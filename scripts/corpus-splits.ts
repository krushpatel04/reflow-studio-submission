import { createHash } from 'node:crypto';
import type { CorpusManifest, CorpusSplit, ManifestIssue } from '../src/corpus';

export type SplitLock = {
  schemaVersion: 'reflow.corpus-splits.v1';
  targetsSha256: string;
  importConfig: { seed: number; maxLayouts: number; maxTemplates: number; perTemplate: number; minTextOverImage: number; categoryShare: number };
  importConfigSha256: string;
  configVersions?: { version: number; config: SplitLock['importConfig']; sha256: string; reason: string; date: string }[];
  families: { id: string; split: CorpusSplit; templateId: string; exposure: 'seen' | 'sealed'; retired?: boolean }[];
  migrations: { fromFamilyId: string; toFamilyId: string; fromSplit: CorpusSplit; toSplit: CorpusSplit; fromExposure: 'seen' | 'sealed'; reason: string; date: string }[];
};

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function configHistoryIssues(lock: SplitLock): string[] {
  if (lock.importConfigSha256 !== digest(lock.importConfig)) return ['Current import config hash is invalid.'];
  if (lock.configVersions === undefined) return [];
  if (!Array.isArray(lock.configVersions) || !lock.configVersions.length) return ['Config version history is empty.'];
  const issues: string[] = [];
  for (const [i, version] of lock.configVersions.entries()) {
    if (version.version !== i + 1 || version.sha256 !== digest(version.config) || !version.reason?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(version.date)) issues.push(`Config version ${i + 1} is invalid.`);
  }
  if (lock.configVersions.at(-1)?.sha256 !== lock.importConfigSha256) issues.push('Latest config version differs from current config.');
  return issues;
}

/** Bootstrap only from a reviewed manifest. All existing families have been seen. */
export function freezeSplits(manifest: CorpusManifest, config: SplitLock['importConfig']): SplitLock {
  const templates = new Map<string, string>();
  for (const source of manifest.sources) {
    if (!source.templateId) throw Error(`Source ${source.id} needs a template ID before its split is frozen.`);
    const earlier = templates.get(source.familyId);
    if (earlier && earlier !== source.templateId) throw Error(`Family ${source.familyId} has multiple template IDs.`);
    templates.set(source.familyId, source.templateId);
  }
  const families = manifest.families.map(family => {
    const templateId = templates.get(family.id);
    if (!templateId) throw Error(`Family ${family.id} has no source to freeze.`);
    if (family.split === 'test') throw Error('Do not bootstrap a sealed test family as seen.');
    return { id: family.id, split: family.split, templateId, exposure: 'seen' as const };
  });
  if (new Set(families.map(f => f.templateId)).size !== families.length) throw Error('One template cannot be frozen in multiple families.');
  return { schemaVersion: 'reflow.corpus-splits.v1', targetsSha256: digest(manifest.targets), importConfig: { ...config }, importConfigSha256: digest(config), families, migrations: [] };
}

/** Known assignments are immutable. New LICA families need an explicit import decision. */
export function reconcileLicaSplits(lock: SplitLock, templateIds: string[], targets: CorpusManifest['targets'], config: SplitLock['importConfig'], approveNew = false, review?: { reason: string; date: string }): { splits: Map<string, CorpusSplit>; lock: SplitLock } {
  if (lock.schemaVersion !== 'reflow.corpus-splits.v1') throw Error('Unknown split-lock version.');
  if (lock.targetsSha256 !== digest(targets)) throw Error('Target list differs from the frozen split lock.');
  if (configHistoryIssues(lock).length) throw Error('Import config history differs from the frozen split lock.');
  const configChanged = lock.importConfigSha256 !== digest(config);
  if (configChanged && !review) throw Error('Import config differs from the frozen split lock; a reviewed config version is required.');
  const active = lock.families.filter(f => !f.retired);
  const known = new Map(active.map(f => [f.templateId, f]));
  if (known.size !== active.length || new Set(lock.families.map(f => f.id)).size !== lock.families.length) throw Error('Duplicate active family or template in split lock.');
  const added: SplitLock['families'] = [];
  const splits = new Map<string, CorpusSplit>();
  const proposedNew = [...new Set(templateIds)].filter(id => !known.has(`lica:${id}`));
  if (proposedNew.length && !approveNew) throw Error(`New family ${proposedNew[0]} requires --approve-new-families after duplicate review.`);
  if ((configChanged || proposedNew.length) && (!review?.reason?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(review.date))) throw Error('Config version review reason and YYYY-MM-DD date are required.');
  for (const id of [...new Set(templateIds)].sort()) {
    const templateId = `lica:${id}`;
    const family = known.get(templateId);
    if (family) {
      if (family.id !== `lica-${id}` || family.retired) throw Error(`Family ${id} has a conflicting or retired lock entry.`);
      if (family.split === 'test') throw Error(`LICA family ${id} cannot enter the test split.`);
      splits.set(id, family.split);
    } else {
      const fraction = Number.parseInt(digest(`${config.seed}:${id}`).slice(0, 8), 16) / 0x100000000;
      const split = fraction < 2 / 3 ? 'development' : 'validation';
      splits.set(id, split);
      added.push({ id: `lica-${id}`, split, templateId, exposure: 'seen' });
    }
  }
  const versions = lock.configVersions ?? [{ version: 1, config: { ...lock.importConfig }, sha256: lock.importConfigSha256, reason: 'Initial frozen LICA config', date: review?.date ?? '2026-09-22' }];
  const record = review && (configChanged || proposedNew.length) ? [{ version: versions.length + 1, config: { ...config }, sha256: digest(config), reason: review.reason.trim(), date: review.date }] : [];
  const nextLock = record.length ? { ...lock, importConfig: { ...config }, importConfigSha256: digest(config), configVersions: [...versions, ...record], families: [...lock.families, ...added] } : { ...lock, families: [...lock.families, ...added] };
  return { splits, lock: nextLock };
}

/** Compare the current corpus with its frozen assignments and target/config fingerprints. */
export function checkSplitLock(manifest: CorpusManifest, lock: SplitLock): ManifestIssue[] {
  const issues: ManifestIssue[] = [];
  const error = (code: string, path: string, message: string) => issues.push({ severity: 'error', code, path, message });
  if (lock.schemaVersion !== 'reflow.corpus-splits.v1') return [{ severity: 'error', code: 'split-lock-version', path: '$.schemaVersion', message: 'Unknown split-lock version.' }];
  if (lock.targetsSha256 !== digest(manifest.targets)) error('target-drift', '$.targets', 'Targets differ from the split lock.');
  for (const issue of configHistoryIssues(lock)) error(lock.configVersions ? 'config-history-drift' : 'config-drift', '$.configVersions', issue);
  const byId = new Map<string, SplitLock['families'][number]>();
  const byTemplate = new Map<string, string[]>();
  for (const [i, family] of lock.families.entries()) {
    if (byId.has(family.id)) error('duplicate-family-lock', `$.families[${i}].id`, `Duplicate locked family ${family.id}.`);
    byId.set(family.id, family);
    byTemplate.set(family.templateId, [...(byTemplate.get(family.templateId) ?? []), family.id]);
    if (family.split === 'test' && family.exposure !== 'sealed') error('seen-test-family', `$.families[${i}]`, `Seen family ${family.id} cannot be a sealed test family.`);
    if (family.split === 'test' && family.templateId.startsWith('lica:')) error('lica-test-family', `$.families[${i}]`, `LICA family ${family.id} cannot enter the test split.`);
  }
  const migratedFrom = new Set<string>();
  if (!Array.isArray(lock.migrations)) error('invalid-migration-log', '$.migrations', 'Expected a migration list.');
  else for (const [i, migration] of lock.migrations.entries()) {
    const old = byId.get(migration.fromFamilyId), next = byId.get(migration.toFamilyId);
    if (!old || !next || !old.retired || old.templateId !== next.templateId || old.split !== migration.fromSplit || next.split !== migration.toSplit || old.exposure !== migration.fromExposure || next.exposure !== 'seen' || !migration.reason?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(migration.date)) {
      error('invalid-migration', `$.migrations[${i}]`, 'Migration must link a retired old family to a seen new family with matching old/new splits, exposure, template, reason and date.');
    } else migratedFrom.add(old.id);
  }
  for (const [templateId, ids] of byTemplate) {
    if (ids.length > 1 && (ids.filter(id => !byId.get(id)?.retired).length !== 1 || ids.some(id => byId.get(id)?.retired && !migratedFrom.has(id)))) {
      error('duplicate-template-lock', '$.families', `Template ${templateId} appears in multiple locked families without a valid retirement record.`);
    }
  }
  for (const [i, family] of manifest.families.entries()) {
    const frozen = byId.get(family.id);
    if (!frozen) { error('unlocked-family', `$.families[${i}].id`, `Family ${family.id} has no locked assignment.`); continue; }
    if (frozen.retired) error('retired-family', `$.families[${i}].id`, `Retired family ${family.id} cannot be active.`);
    if (frozen.split !== family.split) error('split-drift', `$.families[${i}].split`, `Family ${family.id} moved from ${frozen.split} to ${family.split}.`);
  }
  for (const [i, source] of manifest.sources.entries()) {
    const frozen = byId.get(source.familyId);
    if (frozen && source.templateId !== frozen.templateId) error('template-drift', `$.sources[${i}].templateId`, `Source ${source.id} no longer matches its family's frozen template.`);
  }
  return issues;
}

/** A reviewed migration retires the exposed identity; the replacement starts seen, never sealed. */
export function migrateSplitLock(lock: SplitLock, fromId: string, toId: string, toSplit: CorpusSplit, reason: string, date: string): SplitLock {
  const old = lock.families.find(f => f.id === fromId);
  if (!old || old.retired) throw Error(`No active family ${fromId} to migrate.`);
  if (!toId.trim() || lock.families.some(f => f.id === toId)) throw Error(`New family ID ${toId} is already used or empty.`);
  if (toSplit === 'test') throw Error('A migrated family cannot become a sealed test family.');
  if (!reason.trim()) throw Error('Migration reason is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error('Migration date must be YYYY-MM-DD.');
  if (!Array.isArray(lock.migrations)) throw Error('Migration log is missing.');
  return {
    ...lock,
    families: [...lock.families.map(f => f.id === fromId ? { ...f, retired: true } : { ...f }), { id: toId, split: toSplit, templateId: old.templateId, exposure: 'seen' }],
    migrations: [...lock.migrations, { fromFamilyId: fromId, toFamilyId: toId, fromSplit: old.split, toSplit, fromExposure: old.exposure, reason: reason.trim(), date }],
  };
}

/** Importing an expanded batch must not erase or silently rewrite earlier source evidence. */
export function checkImportPreservation(previous: CorpusManifest, next: CorpusManifest): ManifestIssue[] {
  const issues: ManifestIssue[] = [];
  const families = new Map(next.families.map(f => [f.id, f]));
  for (const family of previous.families) {
    if (!families.has(family.id)) issues.push({ severity: 'error', code: 'family-removed', path: '$.families', message: `Import would remove family ${family.id}.` });
  }
  const sources = new Map(next.sources.map(s => [s.id, s]));
  for (const source of previous.sources) {
    const current = sources.get(source.id);
    if (!current) issues.push({ severity: 'error', code: 'source-removed', path: '$.sources', message: `Import would remove source ${source.id}.` });
    else if (digest(current) !== digest(source)) issues.push({ severity: 'error', code: 'source-replaced', path: '$.sources', message: `Import would change source ${source.id} or its provenance/resources.` });
  }
  return issues;
}
