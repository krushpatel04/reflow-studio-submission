import { validateTarget, type Target } from './model';

/** Independent evaluation corpus record for #7. Pure checks only; file access lives in scripts/corpus-files.ts. */
export type CorpusSplit = 'development' | 'validation' | 'test';
export type CorpusResource = { kind: 'asset' | 'font'; id: string; file: string; sha256: string };
export type CorpusSource = {
  id: string; familyId: string; file: string; sha256: string;
  /** Shared template or composition identifier, when the origin supplies one. */
  templateId?: string;
  provenance: {
    kind: 'dataset' | 'author' | 'synthetic'; name: string;
    license?: string; attribution?: string; permission?: string; url?: string;
  };
  resources: CorpusResource[];
  conversion: { status: 'supported' | 'adapted' | 'unsupported'; importer: string; losses: string[] };
};
export type CorpusManifest = {
  schemaVersion: 'reflow.corpus.v0';
  targets: Target[];
  families: { id: string; split: CorpusSplit; description: string }[];
  sources: CorpusSource[];
};
export type ManifestIssue = { severity: 'error' | 'warning'; code: string; path: string; message: string };

/** Pilot targets from docs/quality-and-ml.md; shortfalls are warnings so the corpus can grow incrementally. */
export const READINESS = { sources: 20, families: 6, testFamilies: 3 };
const SPLITS = ['development', 'validation', 'test'];
const SHA256 = /^[0-9a-f]{64}$/;

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => !!value && typeof value === 'object' && !Array.isArray(value);
const filled = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/** Reports every problem found instead of stopping at the first. Does not read files or prove permission. */
export function checkManifest(input: unknown): ManifestIssue[] {
  const issues: ManifestIssue[] = [];
  const error = (code: string, path: string, message: string) => issues.push({ severity: 'error', code, path, message });
  const warn = (code: string, message: string) => issues.push({ severity: 'warning', code, path: '$', message });
  const structure = (path: string, message: string) => error('invalid-structure', path, message);
  const text = (obj: Json, key: string, path: string) => { if (!filled(obj[key])) structure(`${path}.${key}`, 'Expected a nonempty string.'); };
  const choice = (obj: Json, key: string, options: string[], path: string) => {
    if (typeof obj[key] !== 'string' || !options.includes(obj[key])) structure(`${path}.${key}`, `Expected one of: ${options.join(', ')}.`);
  };
  const unique = (seen: Set<string>, id: unknown, path: string) => {
    if (typeof id !== 'string') return;
    if (seen.has(id)) error('duplicate-id', path, `Duplicate ID: ${id}.`);
    seen.add(id);
  };
  const list = (value: unknown, path: string, min = 0): unknown[] => {
    if (Array.isArray(value) && value.length >= min) return value;
    structure(path, min ? `Expected an array with at least ${min} entry.` : 'Expected an array.');
    return [];
  };

  if (!isObject(input)) { structure('$', 'Expected a manifest object.'); return issues; }
  if (input.schemaVersion !== 'reflow.corpus.v0') {
    error('unsupported-schema', '$.schemaVersion', 'Expected reflow.corpus.v0.');
    return issues;
  }

  const targetIds = new Set<string>();
  list(input.targets, '$.targets', 1).forEach((target, i) => {
    const path = `$.targets[${i}]`;
    try { validateTarget(target); } catch { structure(path, 'Expected a target with id, label and dimensions from 1 to 8000.'); return; }
    unique(targetIds, target.id, `${path}.id`);
  });

  const splitOf = new Map<string, string>();
  const familyIds = new Set<string>();
  list(input.families, '$.families').forEach((family, i) => {
    const path = `$.families[${i}]`;
    if (!isObject(family)) return structure(path, 'Expected a family object.');
    text(family, 'id', path); choice(family, 'split', SPLITS, path);
    if (typeof family.description !== 'string') structure(`${path}.description`, 'Expected a string.');
    unique(familyIds, family.id, `${path}.id`);
    if (typeof family.id === 'string' && typeof family.split === 'string' && !splitOf.has(family.id)) splitOf.set(family.id, family.split);
  });

  const sourceIds = new Set<string>();
  const hashSplits = new Map<string, string>();
  const templateFamilies = new Map<string, string>();
  const independent: { familyId: string }[] = [];
  list(input.sources, '$.sources').forEach((source, i) => {
    const path = `$.sources[${i}]`;
    if (!isObject(source)) return structure(path, 'Expected a source object.');
    text(source, 'id', path); text(source, 'familyId', path); text(source, 'file', path);
    unique(sourceIds, source.id, `${path}.id`);
    const familyId = typeof source.familyId === 'string' ? source.familyId : undefined;
    const split = familyId && splitOf.get(familyId);
    if (familyId && !familyIds.has(familyId)) error('unknown-family', `${path}.familyId`, `Unknown family: ${familyId}.`);

    if (typeof source.sha256 !== 'string' || !SHA256.test(source.sha256)) {
      error('invalid-hash', `${path}.sha256`, 'Expected a lowercase sha256 hex digest.');
    } else if (split) {
      const earlier = hashSplits.get(source.sha256);
      if (earlier && earlier !== split) error('cross-split-duplicate', `${path}.sha256`, `The same file is already in the ${earlier} split; this source is in ${split}.`);
      else hashSplits.set(source.sha256, split);
    }

    if (source.templateId !== undefined) {
      if (!filled(source.templateId)) structure(`${path}.templateId`, 'Expected a nonempty string when present.');
      else if (familyId) {
        const earlier = templateFamilies.get(source.templateId);
        if (earlier && earlier !== familyId) error('cross-family-template', `${path}.templateId`, `Template ${source.templateId} already belongs to family ${earlier}; keep all its derivatives in one family.`);
        else templateFamilies.set(source.templateId, familyId);
      }
    }

    const provenance = source.provenance;
    if (!isObject(provenance)) structure(`${path}.provenance`, 'Expected a provenance object.');
    else {
      choice(provenance, 'kind', ['dataset', 'author', 'synthetic'], `${path}.provenance`);
      text(provenance, 'name', `${path}.provenance`);
      const required = provenance.kind === 'dataset' ? ['license', 'attribution'] : provenance.kind === 'author' ? ['permission'] : [];
      for (const key of required) if (!filled(provenance[key])) error('missing-provenance', `${path}.provenance.${key}`, `A ${provenance.kind} source needs ${key}.`);
      if (provenance.kind === 'synthetic') {
        if (split && split !== 'development') error('synthetic-outside-development', `${path}.provenance.kind`, 'Team-authored designs may only be development regressions.');
      } else if (familyId) independent.push({ familyId });
    }

    list(source.resources, `${path}.resources`).forEach((resource, r) => {
      const rpath = `${path}.resources[${r}]`;
      if (!isObject(resource)) return structure(rpath, 'Expected a resource object.');
      choice(resource, 'kind', ['asset', 'font'], rpath); text(resource, 'id', rpath); text(resource, 'file', rpath);
      if (typeof resource.sha256 !== 'string' || !SHA256.test(resource.sha256)) error('invalid-hash', `${rpath}.sha256`, 'Expected a lowercase sha256 hex digest.');
    });

    const conversion = source.conversion;
    if (!isObject(conversion)) structure(`${path}.conversion`, 'Expected a conversion object.');
    else {
      choice(conversion, 'status', ['supported', 'adapted', 'unsupported'], `${path}.conversion`);
      text(conversion, 'importer', `${path}.conversion`);
      const losses = list(conversion.losses, `${path}.conversion.losses`);
      if (losses.some(loss => !filled(loss))) structure(`${path}.conversion.losses`, 'Each loss must be a nonempty description.');
      if (Array.isArray(conversion.losses)) {
        if (conversion.status === 'supported' && losses.length) error('contradictory-conversion', `${path}.conversion.losses`, 'A supported conversion cannot list losses; mark it adapted.');
        if ((conversion.status === 'adapted' || conversion.status === 'unsupported') && !losses.length) error('undisclosed-loss', `${path}.conversion.losses`, `An ${conversion.status} conversion must describe what was lost or unsupported.`);
      }
    }
  });

  const families = new Set(independent.map(s => s.familyId));
  const testFamilies = [...families].filter(id => splitOf.get(id) === 'test');
  if (independent.length < READINESS.sources) warn('too-few-sources', `${independent.length}/${READINESS.sources} independent sources.`);
  if (families.size < READINESS.families) warn('too-few-families', `${families.size}/${READINESS.families} families with an independent source.`);
  if (testFamilies.length < READINESS.testFamilies) warn('too-few-test-families', `${testFamilies.length}/${READINESS.testFamilies} test families with an independent source.`);
  return issues;
}
