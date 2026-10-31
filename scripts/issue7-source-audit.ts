import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { checkManifest, type CorpusManifest, type CorpusResource } from '../src/corpus';
import { FONT_COVERAGE, RTL_RANGES, findUncoveredText } from '../src/font-coverage';
import { validateDesign, type Design, type TextElement } from '../src/model';
import { layoutText, type Measure } from '../src/typography';

export const HEIGHT_RATIO_THRESHOLD = 1.15;
export const classifyHeightRatio = (ratio: number) => ratio > HEIGHT_RATIO_THRESHOLD ? 'over-threshold' as const : 'within-threshold' as const;

type RowStatus = 'ok' | 'failed' | 'excluded-sealed-test';
type FileStatus = 'ok' | 'missing' | 'hash-mismatch' | 'outside-manifest-root' | 'read-error' | 'font-registration-failed' | 'excluded-sealed-test';

export type SourceAuditReport = {
  schemaVersion: 'reflow.source-fidelity-audit.v0';
  generatedAt: string;
  input: { manifestPath: string; manifestSha256: string; heightRatioThreshold: number };
  method: {
    measurement: string;
    fontRegistration: string;
    heightRatio: string;
    thresholdMeaning: string;
    glyphCoverage: string;
    sealedTestPolicy: string;
    rendering: 'not-performed';
    engineExecution: 'not-performed';
  };
  runtime: {
    node: string; platform: string; arch: string;
    canvasPackage: string; packageName: string; packageVersion: string;
    elapsedMs: number;
  };
  accounting: {
    manifestSources: number; sourceRows: number;
    declaredResources: number; resourceRows: number;
    discoveredTextElements: number; textRows: number;
  };
  sources: Array<{
    sourceId: string; familyId: string; file: string; expectedSha256: string;
    actualSha256: string | null; hashStatus: FileStatus; conversionStatus: string;
    conversionLosses: string[]; discoveredTextElements: number; status: RowStatus; errors: string[];
    exclusionReason: string | null;
  }>;
  resources: Array<{
    sourceId: string; kind: 'asset' | 'font'; id: string; file: string;
    expectedSha256: string; actualSha256: string | null; status: FileStatus; error: string | null;
    fontAlias: string | null;
  }>;
  texts: Array<{
    sourceId: string; elementId: string; fontFamily: string; fontWeight: number;
    fontSize: number; lineHeight: number; box: { width: number; height: number };
    fontResourceId: string | null; status: RowStatus; error: string | null;
    measurement: null | {
      lines: string[]; lineCount: number; width: number; height: number;
      ascent: number; lineStep: number; emergencyBreaks: number; heightRatio: number;
    };
    heightClassification: 'over-threshold' | 'within-threshold' | 'not-measured';
    glyphCoverage: {
      status: 'covered-by-declaration' | 'known-uncovered-or-unsupported' | 'unknown';
      basis: string; missingCodepoints: number[] | null;
    };
  }>;
  summary: {
    auditPassed: boolean; failedSources: number; failedResources: number; failedTexts: number;
    excludedSealedSources: number; excludedSealedResources: number;
    measuredTexts: number; overThresholdTexts: number; affectedSources: number;
    unknownGlyphCoverageTexts: number; knownUncoveredOrUnsupportedTexts: number;
  };
  reconciliation: {
    threshold: number;
    historical: {
      label: string;
      reported: { overThresholdTexts: number; totalTexts: number; affectedSources: number; totalSources: number };
      method: string; reproducibility: string;
    };
    current: {
      label: string;
      reported: { overThresholdTexts: number; totalTexts: number; affectedSources: number; totalSources: number };
      method: string;
    };
    canonicalCount: null;
    explanation: string;
  };
};

const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const normalizedFamily = (value: string) => value.replace(/[^a-z0-9]/gi, '').toLowerCase();
const registeredAliases = new Set<string>();

function safePath(root: string, file: string): string | null {
  const path = resolve(root, file);
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)) ? path : null;
}

async function inspectFile(root: string, file: string, expectedSha256: string) {
  const path = safePath(root, file);
  if (!path) return { bytes: null, actualSha256: null, status: 'outside-manifest-root' as const, error: 'Path resolves outside the manifest directory.' };
  try {
    const bytes = await readFile(path);
    const actualSha256 = sha256(bytes);
    return actualSha256 === expectedSha256
      ? { bytes, actualSha256, status: 'ok' as const, error: null }
      : { bytes, actualSha256, status: 'hash-mismatch' as const, error: `Expected sha256 ${expectedSha256}, received ${actualSha256}.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const missing = typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
    return { bytes: null, actualSha256: null, status: missing ? 'missing' as const : 'read-error' as const, error: message };
  }
}

function fontFor(text: TextElement, resources: CorpusResource[]): CorpusResource | undefined {
  return resources.find(resource => {
    if (resource.kind !== 'font') return false;
    const match = /^(.*)-(\d+)$/.exec(resource.id);
    return !!match && normalizedFamily(match[1]) === normalizedFamily(text.fontFamily) && Number(match[2]) === text.fontWeight;
  });
}

function coverage(text: TextElement): SourceAuditReport['texts'][number]['glyphCoverage'] {
  if (!FONT_COVERAGE[text.fontFamily]) {
    return { status: 'unknown', basis: `No declared coverage table exists for ${text.fontFamily}; no missing-glyph claim is made.`, missingCodepoints: null };
  }
  const design = { schemaVersion: 'reflow.design.v0', id: 'coverage', name: 'coverage', description: '', provenance: 'audit', width: 1, height: 1, background: '#fff', groups: [], elements: [text] } satisfies Design;
  const findings = findUncoveredText(design).filter(finding => finding.elementId === text.id);
  if (!findings.length) return { status: 'covered-by-declaration', basis: 'Existing FONT_COVERAGE declarations contain every codepoint; this is metadata, not a cmap/render proof.', missingCodepoints: [] };
  const codepoints = [...new Set(findings.flatMap(finding => finding.offenses.map(offense => offense.codepoint)))].sort((a, b) => a - b);
  const hasRtl = codepoints.some(codepoint => RTL_RANGES.some(([start, end]) => codepoint >= start && codepoint <= end));
  return { status: 'known-uncovered-or-unsupported', basis: hasRtl ? 'Existing checks report unsupported bidirectional layout and/or uncovered codepoints.' : 'Existing FONT_COVERAGE declarations do not contain every codepoint.', missingCodepoints: codepoints };
}

function makeMeasure(family: string): Measure {
  const context = createCanvas(1, 1).getContext('2d');
  return (value, element) => {
    context.font = `${element.fontWeight} ${element.fontSize}px "${family}"`;
    const measured = context.measureText(value);
    return {
      width: measured.width,
      ascent: Math.max(measured.actualBoundingBoxAscent, measured.fontBoundingBoxAscent),
      descent: Math.max(measured.actualBoundingBoxDescent, measured.fontBoundingBoxDescent),
    };
  };
}

export async function auditSourceFidelity(options: { manifestPath: string }): Promise<SourceAuditReport> {
  const started = performance.now();
  const manifestPath = resolve(options.manifestPath);
  const manifestBytes = await readFile(manifestPath);
  const input: unknown = JSON.parse(manifestBytes.toString('utf8'));
  const manifestIssues = checkManifest(input).filter(issue => issue.code === 'invalid-structure' || issue.code === 'unsupported-schema');
  if (manifestIssues.length) throw new Error(`Invalid manifest: ${manifestIssues.map(issue => `${issue.path} ${issue.message}`).join('; ')}`);
  const manifest = input as CorpusManifest;
  const root = dirname(manifestPath);
  const sources: SourceAuditReport['sources'] = [];
  const resources: SourceAuditReport['resources'] = [];
  const texts: SourceAuditReport['texts'] = [];
  const fontAliases = new Map<CorpusResource, string>();
  const splitOf = new Map(manifest.families.map(family => [family.id, family.split]));

  for (const source of manifest.sources) {
    if (splitOf.get(source.familyId) === 'test') {
      const exclusionReason = 'Excluded by default because this source belongs to a sealed test family; no source or resource file was opened, hashed, registered, or measured.';
      for (const resource of source.resources) {
        resources.push({
          sourceId: source.id, kind: resource.kind, id: resource.id, file: resource.file,
          expectedSha256: resource.sha256, actualSha256: null, status: 'excluded-sealed-test',
          error: null, fontAlias: null,
        });
      }
      sources.push({
        sourceId: source.id, familyId: source.familyId, file: source.file, expectedSha256: source.sha256,
        actualSha256: null, hashStatus: 'excluded-sealed-test', conversionStatus: source.conversion.status,
        conversionLosses: [...source.conversion.losses], discoveredTextElements: 0,
        status: 'excluded-sealed-test', errors: [], exclusionReason,
      });
      continue;
    }
    const errors: string[] = [];
    for (const resource of source.resources) {
      const inspected = await inspectFile(root, resource.file, resource.sha256);
      let status: FileStatus = inspected.status;
      let error = inspected.error;
      let fontAlias: string | null = null;
      if (resource.kind === 'font' && inspected.status === 'ok') {
        const match = /^(.*)-(\d+)$/.exec(resource.id);
        fontAlias = match && inspected.actualSha256
          ? `ReflowAudit-${normalizedFamily(match[1])}-${match[2]}-${inspected.actualSha256}`
          : null;
        if (!fontAlias || !inspected.bytes) {
          status = 'font-registration-failed';
          error = `Cannot derive a content-bound alias from resource ID ${resource.id}.`;
        } else if (!registeredAliases.has(fontAlias)) {
          if (!GlobalFonts.register(inspected.bytes, fontAlias)) {
            status = 'font-registration-failed';
            error = `Could not register verified bytes for ${resource.id} as ${fontAlias}.`;
          } else registeredAliases.add(fontAlias);
        }
        if (status === 'ok' && fontAlias) fontAliases.set(resource, fontAlias);
      }
      resources.push({ sourceId: source.id, kind: resource.kind, id: resource.id, file: resource.file, expectedSha256: resource.sha256, actualSha256: inspected.actualSha256, status, error, fontAlias });
      if (status !== 'ok') errors.push(`${resource.kind} ${resource.id}: ${status}: ${error}`);
    }

    const sourceFile = await inspectFile(root, source.file, source.sha256);
    if (sourceFile.status !== 'ok') errors.push(`source: ${sourceFile.status}: ${sourceFile.error}`);
    let design: Design | null = null;
    if (sourceFile.bytes) {
      try {
        const parsed: unknown = JSON.parse(sourceFile.bytes.toString('utf8'));
        validateDesign(parsed);
        design = parsed;
      } catch (error) {
        errors.push(`source JSON/design validation: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    let discoveredTextElements = 0;
    if (design) {
      const designTexts = design.elements.filter((element): element is TextElement => element.type === 'text');
      discoveredTextElements = designTexts.length;
      for (const element of designTexts) {
        const fontResource = fontFor(element, source.resources);
        const row: SourceAuditReport['texts'][number] = {
          sourceId: source.id, elementId: element.id, fontFamily: element.fontFamily, fontWeight: element.fontWeight,
          fontSize: element.fontSize, lineHeight: element.lineHeight, box: { width: element.width, height: element.height },
          fontResourceId: fontResource?.id ?? null, status: 'ok', error: null, measurement: null,
          heightClassification: 'not-measured', glyphCoverage: coverage(element),
        };
        const resourceRow = fontResource && resources.find(resource => resource.sourceId === source.id && resource.id === fontResource.id && resource.kind === 'font');
        if (!fontResource) {
          row.status = 'failed'; row.error = `No declared font resource matches ${element.fontFamily} weight ${element.fontWeight}.`;
        } else if (resourceRow?.status !== 'ok') {
          row.status = 'failed'; row.error = `Font resource ${fontResource.id} is ${resourceRow?.status ?? 'unaccounted'}.`;
        } else {
          try {
            const alias = fontAliases.get(fontResource);
            if (!alias) throw new Error(`Verified font resource ${fontResource.id} has no content-bound registered alias.`);
            const measured = layoutText(element, makeMeasure(alias));
            const heightRatio = measured.height / element.height;
            row.measurement = { ...measured, lineCount: measured.lines.length, heightRatio };
            row.heightClassification = classifyHeightRatio(heightRatio);
          } catch (error) {
            row.status = 'failed'; row.error = error instanceof Error ? error.message : String(error);
          }
        }
        texts.push(row);
        if (row.status === 'failed') errors.push(`text ${element.id}: ${row.error}`);
      }
    }
    sources.push({
      sourceId: source.id, familyId: source.familyId, file: source.file, expectedSha256: source.sha256,
      actualSha256: sourceFile.actualSha256, hashStatus: sourceFile.status, conversionStatus: source.conversion.status,
      conversionLosses: [...source.conversion.losses], discoveredTextElements, status: errors.length ? 'failed' : 'ok', errors,
      exclusionReason: null,
    });
  }

  const measured = texts.filter(row => row.measurement);
  const over = measured.filter(row => row.heightClassification === 'over-threshold');
  const affectedSources = new Set(over.map(row => row.sourceId)).size;
  const failedResources = resources.filter(row => row.status !== 'ok' && row.status !== 'excluded-sealed-test').length;
  const failedTexts = texts.filter(row => row.status === 'failed').length;
  const failedSources = sources.filter(row => row.status === 'failed').length;
  const excludedSealedSources = sources.filter(row => row.status === 'excluded-sealed-test').length;
  const excludedSealedResources = resources.filter(row => row.status === 'excluded-sealed-test').length;
  const packageJson = JSON.parse(await readFile(resolve('package.json'), 'utf8')) as { name: string; version: string; dependencies?: Record<string, string> };
  const canvasPackage = packageJson.dependencies?.['@napi-rs/canvas'] ?? 'unknown';
  const summary = {
    auditPassed: failedSources === 0 && failedResources === 0 && failedTexts === 0 && sources.length === manifest.sources.length,
    failedSources, failedResources, failedTexts, excludedSealedSources, excludedSealedResources, measuredTexts: measured.length,
    overThresholdTexts: over.length, affectedSources,
    unknownGlyphCoverageTexts: texts.filter(row => row.glyphCoverage.status === 'unknown').length,
    knownUncoveredOrUnsupportedTexts: texts.filter(row => row.glyphCoverage.status === 'known-uncovered-or-unsupported').length,
  };

  return {
    schemaVersion: 'reflow.source-fidelity-audit.v0', generatedAt: new Date().toISOString(),
    input: { manifestPath: options.manifestPath, manifestSha256: sha256(manifestBytes), heightRatioThreshold: HEIGHT_RATIO_THRESHOLD },
    method: {
      measurement: 'Existing src/typography.layoutText with @napi-rs/canvas TextMetrics.',
      fontRegistration: 'Each manifest font is hash-checked, registered from its verified bytes under a family/weight/content-SHA-256 alias, and measured only through that alias; text rows require an exact family and weight resource.',
      heightRatio: 'layoutText measured height divided by the converted source text box height.',
      thresholdMeaning: 'A ratio strictly greater than 1.15 is a triage finding, not proof of visible clipping or source/render fidelity.',
      glyphCoverage: 'Existing FONT_COVERAGE metadata; families absent from the table are unknown, not missing-glyph failures.',
      sealedTestPolicy: 'Sources in manifest families whose split is test are declaration-accounted but excluded before any source/resource file read, hash, font registration, or text measurement. This tool exposes no unsealing option.',
      rendering: 'not-performed', engineExecution: 'not-performed',
    },
    runtime: { node: process.version, platform: process.platform, arch: process.arch, canvasPackage, packageName: packageJson.name, packageVersion: packageJson.version, elapsedMs: performance.now() - started },
    accounting: {
      manifestSources: manifest.sources.length, sourceRows: sources.length,
      declaredResources: manifest.sources.reduce((sum, source) => sum + source.resources.length, 0), resourceRows: resources.length,
      discoveredTextElements: sources.reduce((sum, source) => sum + source.discoveredTextElements, 0), textRows: texts.length,
    },
    sources, resources, texts, summary,
    reconciliation: {
      threshold: HEIGHT_RATIO_THRESHOLD,
      historical: {
        label: 'Historical collaborator report',
        reported: { overThresholdTexts: 189, totalTexts: 293, affectedSources: 16, totalSources: 21 },
        method: 'Reported as text layout height over 115% of box height; original probe, renderer/runtime configuration, font registration details, and per-element rows were not available to this audit.',
        reproducibility: 'unreproduced-missing-per-element-rows-and-config',
      },
      current: {
        label: 'This audit',
        reported: { overThresholdTexts: summary.overThresholdTexts, totalTexts: measured.length, affectedSources, totalSources: sources.length - excludedSealedSources },
        method: 'Non-test sources only: hash-verified manifest font bytes registered under family/weight/content-hash-specific aliases; existing layoutText measured each converted text element with @napi-rs/canvas; ratio is measured layout height divided by converted box height; threshold is strictly greater than 1.15.',
      },
      canonicalCount: null,
      explanation: 'The observations use incompletely comparable recorded methods, so neither count replaces the other. They are triage ratios, not clipping counts, renderer-parity results, or engine output quality measures.',
    },
  };
}

function usage(): never {
  console.error('Usage: node --import tsx scripts/issue7-source-audit.ts --manifest <manifest.json> --output <report.json>');
  process.exit(2);
}

async function main() {
  let manifestPath: string | undefined;
  let outputPath: string | undefined;
  for (let i = 2; i < process.argv.length; i += 2) {
    if (process.argv[i] === '--manifest') manifestPath = process.argv[i + 1];
    else if (process.argv[i] === '--output') outputPath = process.argv[i + 1];
    else usage();
  }
  if (!manifestPath || !outputPath) usage();
  const report = await auditSourceFidelity({ manifestPath });
  await mkdir(dirname(resolve(outputPath)), { recursive: true });
  await writeFile(resolve(outputPath), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Audited ${report.accounting.sourceRows}/${report.accounting.manifestSources} sources, ${report.accounting.textRows} text rows, and ${report.accounting.resourceRows} resource rows.`);
  console.log(`${report.summary.overThresholdTexts}/${report.summary.measuredTexts} measured text rows are strictly over ${HEIGHT_RATIO_THRESHOLD}; ${report.summary.unknownGlyphCoverageTexts} have unknown declared glyph coverage.`);
  if (!report.summary.auditPassed) process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => { console.error(error instanceof Error ? error.stack ?? error.message : String(error)); process.exitCode = 1; });
}
