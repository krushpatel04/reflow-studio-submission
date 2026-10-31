import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkManifest, type CorpusManifest, type CorpusSource, type CorpusSplit, type ManifestIssue } from '../src/corpus';
import type { Target } from '../src/model';
import { CorpusFileReader, CorpusResourceError, DEFAULT_RESOURCE_LIMITS, loadCorpusSource, sha256, type LoadedFile, type LoadedAsset } from './corpus-resources';

const LIMITS = Object.freeze({ manifestBytes: 8 * 1024 * 1024, sources: 256, targets: 32, cases: 4096 });
export type PreflightStatus = 'catalog-ready' | 'blocked' | 'skipped-test' | 'unsupported-conversion';
export type PreflightSource = {
  sourceId: string; designId?: string; familyId: string; split: CorpusSplit;
  sourceFile: string; sourceSha256: string;
  provenance: CorpusSource['provenance']; conversion: CorpusSource['conversion'];
  status: PreflightStatus;
  error?: { code: string; path: string; message: string };
  verified?: { totalBytes: number; files: LoadedFile[]; assets: LoadedAsset[]; fonts: { family: string; weight: number; file: string; sha256: string }[] };
};
export type PreflightReport = {
  schemaVersion: 'reflow.corpus-preflight.v0'; generatedAt: string;
  state: 'complete' | 'invalid-manifest';
  manifest: { file: string; sha256: string };
  limits: typeof LIMITS & { perSource: typeof DEFAULT_RESOURCE_LIMITS };
  manifestIssues: ManifestIssue[];
  sources: PreflightSource[];
  cases: { id: string; sourceId: string; target: Target; status: PreflightStatus }[];
  counts: { sources: number; cases: number; byStatus: Record<PreflightStatus, number> };
  evidence: {
    engineExecution: 'not-run'; fontRegistrationAndCoverage: 'unverified';
    imageDecoding: 'unverified'; rendering: 'not-run'; permissions: 'unverified';
    sourceFidelity: 'unverified'; humanAcceptance: 'unverified'; splitLockAndImportLedger: 'run-corpus-check-separately';
  };
};

const diagnostic = (error: unknown, path: string) => ({
  code: error instanceof Error && 'code' in error ? String(error.code) : 'resource-read-failed',
  path: error instanceof Error && 'path' in error ? String(error.path) : path,
  message: error instanceof Error ? error.message : String(error),
});

/** Additional preparation, not an engine benchmark. Test-family files remain sealed. */
export async function preflightCorpus(manifestPath: string): Promise<PreflightReport> {
  const absolute = resolve(manifestPath);
  const reader = new CorpusFileReader(dirname(absolute), LIMITS.manifestBytes);
  const bytes = await reader.read(basename(absolute), LIMITS.manifestBytes);
  let input: unknown;
  try { input = JSON.parse(bytes.toString('utf8')); }
  catch { throw new CorpusResourceError('invalid-json', manifestPath, 'Manifest must contain valid JSON.'); }
  const issues: ManifestIssue[] = [];
  // Bound the work before traversal by the general structural validator.
  if (input && typeof input === 'object') {
    const { sources, targets } = input as { sources?: unknown; targets?: unknown };
    if ((Array.isArray(sources) && sources.length > LIMITS.sources)
      || (Array.isArray(targets) && targets.length > LIMITS.targets)
      || (Array.isArray(sources) && Array.isArray(targets) && sources.length * targets.length > LIMITS.cases)) {
      issues.push({ severity: 'error', code: 'preflight-count-limit', path: '$', message: `Preflight supports at most ${LIMITS.sources} sources, ${LIMITS.targets} targets and ${LIMITS.cases} cases.` });
    }
  }
  if (!issues.length) issues.push(...checkManifest(input));
  const report: PreflightReport = {
    schemaVersion: 'reflow.corpus-preflight.v0', generatedAt: new Date().toISOString(),
    state: issues.some(i => i.severity === 'error') ? 'invalid-manifest' : 'complete',
    manifest: { file: manifestPath, sha256: sha256(bytes) },
    limits: { ...LIMITS, perSource: DEFAULT_RESOURCE_LIMITS }, manifestIssues: issues,
    sources: [], cases: [],
    counts: { sources: 0, cases: 0, byStatus: { 'catalog-ready': 0, blocked: 0, 'skipped-test': 0, 'unsupported-conversion': 0 } },
    evidence: {
      engineExecution: 'not-run', fontRegistrationAndCoverage: 'unverified', imageDecoding: 'unverified', rendering: 'not-run',
      permissions: 'unverified', sourceFidelity: 'unverified', humanAcceptance: 'unverified', splitLockAndImportLedger: 'run-corpus-check-separately',
    },
  };
  if (report.state === 'invalid-manifest') return report;
  const manifest = input as CorpusManifest;
  const splits = new Map(manifest.families.map(f => [f.id, f.split]));
  for (const source of manifest.sources) {
    const row: PreflightSource = {
      sourceId: source.id, familyId: source.familyId, split: splits.get(source.familyId)!,
      sourceFile: source.file, sourceSha256: source.sha256,
      provenance: structuredClone(source.provenance), conversion: structuredClone(source.conversion), status: 'blocked',
    };
    if (row.split === 'test') row.status = 'skipped-test';
    else if (source.conversion.status === 'unsupported') row.status = 'unsupported-conversion';
    else {
      try {
        const loaded = await loadCorpusSource(dirname(absolute), source);
        row.status = 'catalog-ready'; row.designId = loaded.design.id;
        row.verified = {
          totalBytes: loaded.totalBytes, files: loaded.files, assets: loaded.assets,
          fonts: loaded.fonts.map(({ family, weight, file, sha256 }) => ({ family, weight, file, sha256 })),
        };
      } catch (error) { row.error = diagnostic(error, source.file); }
    }
    report.sources.push(row);
    for (const target of manifest.targets) {
      report.cases.push({ id: JSON.stringify([source.id, target.id]), sourceId: source.id, target: { ...target }, status: row.status });
      report.counts.byStatus[row.status]++;
    }
  }
  report.counts.sources = report.sources.length; report.counts.cases = report.cases.length;
  return report;
}

async function main(args: string[]): Promise<number> {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: npm run --silent corpus:preflight -- [--manifest corpus/manifest.json]\nWrites JSON to stdout. Resource errors exit 1; invalid arguments exit 2. Does not run the engine or open sealed test files.');
    return 0;
  }
  if (args.length && !(args.length === 2 && args[0] === '--manifest' && args[1] && !args[1].startsWith('--'))) {
    console.error(JSON.stringify({ error: { code: 'invalid-arguments', message: 'Use --help or one optional --manifest PATH.' } }));
    return 2;
  }
  const path = args[1] ?? 'corpus/manifest.json';
  try {
    const report = await preflightCorpus(path);
    console.log(JSON.stringify(report, null, 2));
    return report.state === 'invalid-manifest' || report.counts.byStatus.blocked > 0 ? 1 : 0;
  } catch (error) {
    console.error(JSON.stringify({ error: diagnostic(error, path) }));
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2));
}
