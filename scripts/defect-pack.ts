/**
 * Author-labelled rendered defect/control pack for #6 and the #7/#19/#20/#22 handoff.
 * `npm run defect-pack` writes reports/defect-pack/{labels.json, cases/<id>/{source,output}.{png,json}}.
 * Labels are the implementer's judgement pending independent review. Each case records the
 * geometric evaluator's findings (with regions) and native rendered pixel evidence separately.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ASSETS } from '../src/assets';
import { reflow } from '../src/engine';
import { evaluate } from '../src/evaluate';
import { FIXTURES } from '../src/fixtures';
import { TARGETS, type Design, type Finding, type Rect } from '../src/model';
import { RENDERED_DROP, SUBJECT_KEPT, type RenderedVerdict } from '../src/rendered-visibility';
import { DEFECT_CASES, type DefectCase } from '../tests/support/defect-cases';
import { measure, renderPng, requiredFontFiles } from './native';
import { nativeRenderedVerdict, nativeSubjectVerdict } from './rendered-visibility';

const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const version = (pkg: string) => JSON.parse(readFileSync(resolve(`node_modules/${pkg}/package.json`), 'utf8')).version as string;
const FLAGGED_WARNINGS = new Set<Finding['kind']>(['crop-loss', 'unsupported-glyph']);

function engineCases(): DefectCase[] {
  const selected = (id: string, target: string, elements: string[], caveat = ''): DefectCase => {
    const source = FIXTURES.find(f => f.id === id)!;
    return { id: `engine-${id}-${target}`, category: 'engine-output', label: 'legal', elements, method: 'pixels', source,
      output: reflow(source, TARGETS.find(t => t.id === target)!, measure).selected.design,
      note: `Engine-selected output for a development fixture; the implementer found no hidden or illegible listed content.${caveat}` };
  };
  return [selected('after-dark', 'square', ['headline', 'hero', 'date', 'venue'], ' ticket-label is excluded: its U+2192 is an uncovered glyph in the source.'),
    selected('intentional-overlap', 'landscape', ['headline', 'description', 'footer']),
    selected('edge-subject', 'story', ['headline', 'hero'], ' The footer is excluded: it is visible but very small (a small-text readability warning), which this visibility label does not judge.')];
}

type RenderedElement = { id: string; source?: number; output?: number; verdict: RenderedVerdict; region?: Rect };
function rendered(c: DefectCase): { verdict: RenderedVerdict | 'not-measured'; elements: RenderedElement[] } {
  if (c.method === 'none') return { verdict: 'not-measured', elements: [] };
  const elements = c.elements.map((id): RenderedElement => {
    if (c.method === 'subject') {
      const r = nativeSubjectVerdict(c.source, c.output, id), e = c.output.elements.find(e => e.id === id)!;
      return { id, source: r.source, output: r.output, verdict: r.verdict, region: r.verdict === 'defect' ? { x: e.x, y: e.y, width: e.width, height: e.height } : undefined };
    }
    const r = nativeRenderedVerdict(c.source, c.output, id);
    return { id, source: r.source.share, output: r.output.share, verdict: r.verdict, region: r.verdict === 'defect' ? r.output.hidden : undefined };
  });
  const verdict = elements.some(e => e.verdict === 'defect') ? 'defect' : elements.every(e => e.verdict === 'no-verdict') ? 'no-verdict' : 'ok';
  return { verdict, elements };
}

export function buildDefectPack() {
  const cases = [...DEFECT_CASES, ...engineCases()].map(c => {
    const findings = evaluate(c.source, c.output, measure).findings
      .filter(f => f.elementIds.some(id => c.elements.includes(id)) && (f.severity === 'error' || FLAGGED_WARNINGS.has(f.kind)));
    return { id: c.id, category: c.category, label: c.label, attractive: !!c.attractive, note: c.note, elements: c.elements, method: c.method,
      source: { id: c.source.id, sha256: sha256(JSON.stringify(c.source)) }, output: { id: c.output.id, sha256: sha256(JSON.stringify(c.output)) },
      evaluator: { verdict: findings.length ? 'flagged' as const : 'clean' as const, findings }, rendered: rendered(c), designs: { source: c.source, output: c.output } };
  });
  const fonts = [...new Map(cases.flatMap(c => [c.designs.source, c.designs.output]).flatMap(requiredFontFiles).map(f => [f.path, f])).values()]
    .map(f => ({ family: f.family, weight: f.weight, subset: f.subset, unicodeRange: f.unicodeRange, package: `@fontsource/${f.path.split('/')[2]}@${version(`@fontsource/${f.path.split('/')[2]}`)}`, path: f.path, sha256: sha256(readFileSync(resolve(f.path))) }));
  return {
    schemaVersion: 'reflow.defect-pack.v1' as const,
    status: 'author-labelled by the implementer; independent review pending (#7/#20). Not ground truth for model fitting or scoring.',
    generatedAt: new Date().toISOString(),
    frozen: {
      engineCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), node: process.version,
      renderer: `@napi-rs/canvas@${version('@napi-rs/canvas')}`, raster: 'min(1, 720/width, 900/height)', fonts,
      assets: Object.entries(ASSETS).map(([id, uri]) => ({ id, sha256: sha256(uri) })),
    },
    thresholds: { renderedDrop: RENDERED_DROP, subjectKept: SUBJECT_KEPT, evaluatorFlags: 'any error, or a crop-loss/unsupported-glyph warning, naming an affected element' },
    cases,
    disagreements: cases.filter(c => (c.evaluator.verdict === 'flagged') !== (c.label === 'defect'))
      .map(c => ({ id: c.id, label: c.label, evaluator: c.evaluator.verdict, rendered: c.rendered.verdict })),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const pack = buildDefectPack(), out = 'reports/defect-pack';
  for (const c of pack.cases) {
    await mkdir(`${out}/cases/${c.id}`, { recursive: true });
    for (const side of ['source', 'output'] as const) {
      const design: Design = c.designs[side];
      await writeFile(`${out}/cases/${c.id}/${side}.png`, renderPng(design));
      await writeFile(`${out}/cases/${c.id}/${side}.json`, JSON.stringify(design, null, 2));
    }
  }
  await writeFile(`${out}/labels.json`, JSON.stringify(pack, null, 2));
  const count = (f: (c: typeof pack.cases[number]) => boolean) => pack.cases.filter(f).length;
  console.log(`Defect pack: ${pack.cases.length} cases (${count(c => c.label === 'defect')} defect, ${count(c => c.label === 'legal')} legal); ` +
    `rendered agrees with labels on ${count(c => c.rendered.verdict !== 'not-measured' && (c.rendered.verdict === 'defect') === (c.label === 'defect'))}/${count(c => c.rendered.verdict !== 'not-measured')}; ` +
    `${pack.disagreements.length} evaluator disagreements → ${out}/labels.json`);
}
