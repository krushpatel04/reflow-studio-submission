import test from 'node:test';
import assert from 'node:assert/strict';
import { checkManifest } from '../src/corpus';
import type { Design } from '../src/model';
import {
  appendVisualChecks, assignSplits, attributionText, buildManifest, mergeManifest, parseBatchOptions, DEFAULT_BATCH, designFeatures, LICA_TARGETS, parseCsv,
  ratioClass, selectBatch, summarize, visualCheckTemplate, type LayoutFeatures, type PoolEntry,
} from '../scripts/lica-batch';

const entry = (layoutId: string, templateId: string, category: string, f: Partial<LayoutFeatures> = {}, extra: Partial<PoolEntry> = {}): PoolEntry => ({
  layoutId, templateId, category, width: 1080, height: 1080, status: 'adapted', available: true,
  features: { overlaps: 0, translucent: 0, textOverImage: 0, elements: 5, ...f }, ...extra,
});
const ids = (batch: PoolEntry[]) => batch.map(e => e.layoutId);

// Targets and ratio classes

test('ratio classes switch at r = 1.5 and r = 4', () => {
  const square = { width: 1000, height: 1000 };
  assert.equal(ratioClass(square, { width: 1500, height: 1000 }), 'near');
  assert.equal(ratioClass(square, { width: 1501, height: 1000 }), 'far');
  assert.equal(ratioClass(square, { width: 2000, height: 500 }), 'far');
  assert.equal(ratioClass(square, { width: 2001, height: 500 }), 'extreme');
  assert.equal(ratioClass(square, { width: 1080, height: 1920 }), 'far');
});

test('16:9, 1:1 and 4:5 sources each get near, far and extreme targets', () => {
  assert.equal(LICA_TARGETS.length, 7);
  for (const source of [{ width: 1920, height: 1080 }, { width: 1080, height: 1080 }, { width: 1080, height: 1350 }]) {
    assert.deepEqual(new Set(LICA_TARGETS.map(t => ratioClass(source, t))), new Set(['near', 'far', 'extreme']), JSON.stringify(source));
  }
});

// Features

test('features count overlaps between non-background elements, translucency and text over images', () => {
  const design: Design = {
    schemaVersion: 'reflow.design.v0', id: 'd', name: 'd', description: '', provenance: 'test', width: 100, height: 100, background: '#ffffff', groups: [],
    elements: [
      { id: 'photo', type: 'image', role: 'background', x: 0, y: 0, width: 100, height: 100, assetId: 'a', fit: 'cover', focalPoint: { x: 0.5, y: 0.5 } },
      { id: 'panel', type: 'rect', role: 'decoration', x: 0, y: 0, width: 50, height: 50, color: '#000000', opacity: 0.5 },
      { id: 'title', type: 'text', role: 'content', x: 10, y: 10, width: 30, height: 10, text: 'Hi', fontFamily: 'Inter', fontSize: 8, fontWeight: 400, color: '#ffffff', lineHeight: 1.2 },
      { id: 'note', type: 'text', role: 'content', x: 60, y: 60, width: 30, height: 10, text: 'Yo', fontFamily: 'Inter', fontSize: 8, fontWeight: 400, color: '#000000', lineHeight: 1.2 },
    ],
  };
  assert.deepEqual(designFeatures(design), { overlaps: 1, translucent: 1, textOverImage: 2, elements: 4, coverage: { contentGroups: 0, textOverSvg: 0, textOverRaster: 0, textOverUnknown: 2 } });
});

// Selection

test('the same pool and seed give the same batch', () => {
  const pool = Array.from({ length: 12 }, (_, t) => entry(`l${t}`, `t${t}`, `c${t}`, { overlaps: t % 3 }));
  assert.deepEqual(ids(selectBatch(pool)), ids(selectBatch(pool)));
});

test('unsupported layouts and layouts with unavailable fonts or images are never chosen', () => {
  const pool = [
    entry('bad-1', 'tb1', 'c1', { overlaps: 10, elements: 30 }, { status: 'unsupported' }),
    entry('bad-2', 'tb2', 'c2', { overlaps: 10, elements: 30 }, { available: false }),
    entry('ok-1', 't1', 'c3'), entry('ok-2', 't2', 'c4'),
  ];
  assert.deepEqual(ids(selectBatch(pool)).sort(), ['ok-1', 'ok-2']);
});

test('limits hold: templates, layouts, layouts per template and category share', () => {
  const pool = Array.from({ length: 15 }, (_, t) => Array.from({ length: 5 }, (_, l) => entry(`t${t}-l${l}`, `t${t}`, `c${t % 5}`, { overlaps: t + l }))).flat();
  const batch = selectBatch(pool);
  const templates = new Set(batch.map(e => e.templateId));
  assert.ok(templates.size <= DEFAULT_BATCH.maxTemplates, `${templates.size} templates`);
  assert.ok(batch.length <= DEFAULT_BATCH.maxLayouts, `${batch.length} layouts`);
  for (const t of templates) assert.ok(batch.filter(e => e.templateId === t).length <= DEFAULT_BATCH.perTemplate);
  const cap = Math.floor(DEFAULT_BATCH.maxLayouts * DEFAULT_BATCH.categoryShare);
  for (const [category, n] of Object.entries(summarize(batch).categories)) assert.ok(n <= cap, `${category}: ${n}`);
});

test('at least three text-over-image layouts are chosen even when they rank low', () => {
  const strong = Array.from({ length: 20 }, (_, t) => entry(`s${t}`, `ts${t}`, `cs${t}`, { overlaps: 10, elements: 30 }));
  const weak = Array.from({ length: 3 }, (_, t) => entry(`w${t}`, `tw${t}`, `cw${t}`, { textOverImage: 1, elements: 1 }));
  const batch = selectBatch([...strong, ...weak]);
  assert.ok(batch.filter(e => e.features.textOverImage > 0).length >= 3, JSON.stringify(ids(batch)));
});

test('the seed breaks ties between equal templates', () => {
  const pool = Array.from({ length: 20 }, (_, t) => entry(`l${t}`, `t${t}`, `c${t}`));
  const a = ids(selectBatch(pool, { ...DEFAULT_BATCH, seed: 1 })).sort();
  const b = ids(selectBatch(pool, { ...DEFAULT_BATCH, seed: 2 })).sort();
  assert.notDeepEqual(a, b);
});

test('pinned sources survive growth while total layout, template and category caps hold', () => {
  const pool = [entry('old', 't0', 'A'), entry('fresh', 't1', 'B', { overlaps: 10 }), entry('skip', 't2', 'C', { overlaps: 9 }, { available: false })];
  const options = { ...DEFAULT_BATCH, maxLayouts: 2, maxTemplates: 2, perTemplate: 1, categoryShare: 1 };
  assert.deepEqual(ids(selectBatch(pool, options, ['old'])), ['old', 'fresh']);
  assert.deepEqual(ids(selectBatch([...pool].reverse(), options, ['old'])), ['old', 'fresh']);
  assert.throws(() => selectBatch(pool, { ...options, maxLayouts: 1 }, ['old', 'fresh']), /cap/i);
  assert.deepEqual(ids(selectBatch(pool, { ...options, maxLayouts: 1 }, ['old'])), ['old']);
});

test('batch cap arguments reject fractions, nonpositive values and excessive bounds', () => {
  assert.deepEqual(parseBatchOptions({ maxLayouts: '40', maxTemplates: '12', perTemplate: '5' }), { ...DEFAULT_BATCH, maxLayouts: 40, maxTemplates: 12, perTemplate: 5 });
  for (const value of ['0', '-1', '1.5', 'NaN', '101']) assert.throws(() => parseBatchOptions({ maxLayouts: value }), /max-layouts/i);
  assert.throws(() => parseBatchOptions({ perTemplate: '9' }), /per-template/i);
});

// Splits

test('splits are two thirds development, one third validation, never test, independent of input order', () => {
  const templates = Array.from({ length: 9 }, (_, i) => `t${i}`);
  const splits = assignSplits(templates, 7);
  const values = [...splits.values()];
  assert.equal(values.filter(s => s === 'development').length, 6);
  assert.equal(values.filter(s => s === 'validation').length, 3);
  assert.ok(!values.includes('test'));
  assert.deepEqual(assignSplits([...templates].reverse(), 7), splits);
});

// Manifest

const imported = (id: string, t: string, status: 'supported' | 'adapted', losses: string[], hash: string) => ({
  entry: entry(id, t, 'Flyers', {}, { status }), file: `lica/designs/${id}.json`, sha256: hash.repeat(64),
  resources: [{ kind: 'font' as const, id: 'Inter-400', file: 'lica/fonts/inter-400.woff2', sha256: 'f'.repeat(64) }], losses,
});

test('the assembled manifest passes checkManifest with only readiness warnings', () => {
  const manifest = buildManifest([
    imported('L1', 'T1', 'supported', [], '1'), imported('L2', 'T1', 'adapted', ['italic dropped'], '2'), imported('L3', 'T2', 'adapted', ['letter spacing dropped'], '3'),
  ], assignSplits(['T1', 'T2'], 1));
  const issues = checkManifest(manifest);
  assert.deepEqual(issues.filter(i => i.severity === 'error'), []);
  assert.deepEqual(issues.map(i => i.code).sort(), ['too-few-families', 'too-few-sources', 'too-few-test-families']);
  assert.equal(manifest.families.length, 2);
  assert.equal(manifest.sources[0].templateId, 'lica:T1');
  assert.equal(manifest.sources[0].conversion.importer, 'lica-import@1');
  assert.deepEqual(manifest.targets, LICA_TARGETS);
});

test('manifest assembly refuses unsupported sources and templates without a split', () => {
  assert.throws(() => buildManifest([imported('L9', 'T9', 'supported', [], '9')], new Map()), /No split/);
  const bad = { ...imported('L8', 'T8', 'supported', [], '8'), entry: entry('L8', 'T8', 'Flyers', {}, { status: 'unsupported' }) };
  assert.throws(() => buildManifest([bad], assignSplits(['T8'], 1)), /unsupported/);
});

test('manifest merge retains old records exactly and adds only new sources', () => {
  const first = buildManifest([imported('old', 'T1', 'supported', [], '1')], new Map([['T1', 'development']]));
  const added = buildManifest([imported('new', 'T2', 'adapted', ['italic'], '2')], new Map([['T2', 'validation']]));
  const merged = mergeManifest(first, added);
  assert.deepEqual(merged.families[0], first.families[0]);
  assert.deepEqual(merged.sources[0], first.sources[0]);
  assert.equal(merged.sources.length, 2);
  assert.equal(merged.families.length, 2);
  assert.deepEqual(mergeManifest(merged, added), merged);
  const changed = structuredClone(added); changed.sources[0].sha256 = 'f'.repeat(64);
  assert.throws(() => mergeManifest(merged, changed), /source.*conflict/i);
});

// CSV, summaries and text files

test('CSV parsing handles quotes, escaped quotes, embedded newlines, CRLF and an unterminated final row', () => {
  assert.deepEqual(parseCsv('a,b\r\n1,"x, ""y""\nnext"\r\n2,z'), [{ a: '1', b: 'x, "y"\nnext' }, { a: '2', b: 'z' }]);
});

test('CSV parsing rejects malformed metadata instead of losing or inventing layout rows', () => {
  for (const csv of [
    'layout_id,template_id\n1,"unfinished\n2,valid\n',
    'layout_id,template_id\n1,valid\n2\n',
    'layout_id,template_id\n1,valid,extra\n',
    'layout_id,template_id\n1,bad"quote\n',
    'layout_id,template_id\n1,"valid"suffix\n',
    'layout_id,layout_id\n1,valid\n',
    'layout_id,\n1,valid\n',
  ]) assert.throws(() => parseCsv(csv), /CSV/i, csv);
});

test('summaries count features, templates and categories', () => {
  const s = summarize([entry('a', 't1', 'Flyers', { overlaps: 2 }), entry('b', 't1', 'Flyers', { textOverImage: 1 }), entry('c', 't2', 'Menu', { translucent: 1 })]);
  const { coverage, ...legacy } = s;
  assert.deepEqual(legacy, { layouts: 3, templates: 2, withOverlap: 1, translucent: 1, textOverImage: 1, categories: { Flyers: 2, Menu: 1 } });
});

test('attribution and visual-check files list every layout', () => {
  const batch = [entry('a', 't1', 'Flyers'), entry('b', 't2', 'Menu')];
  const attribution = attributionText(batch);
  assert.match(attribution, /CC BY 4\.0/);
  assert.match(attribution, /https:\/\/github\.com\/purvanshi\/lica-dataset/);
  const check = visualCheckTemplate(batch);
  for (const id of ['a', 'b']) { assert.ok(attribution.includes(`- ${id} `)); assert.ok(check.includes(`| ${id} |`)); }
  assert.equal(check.match(/\| pending \|/g)?.length, 2);
});

test('expansion appends pending visual checks without changing human notes or duplicating rows', () => {
  const original = '# Check\n\n| old | t1 | differs | Human note. |\n\n## Findings\n\nKeep this.\n';
  const result = appendVisualChecks(original, [entry('old', 't1', 'Flyers'), entry('new', 't2', 'Menu')]);
  assert.ok(result.startsWith(original.trimEnd()));
  assert.match(result, /\| new \| t2 \| pending \| \|/);
  assert.equal(result.match(/\| old \|/g)?.length, 1);
  assert.equal(appendVisualChecks(result, [entry('new', 't2', 'Menu')]), result);
});

// Coverage is separate from the legacy geometric selection signals.
const coverageDesign = (assetId = 'frame.svg'): Design => ({
  schemaVersion: 'reflow.design.v0', id: 'coverage', name: 'Coverage control', description: '', provenance: 'synthetic test',
  width: 100, height: 100, background: '#ffffff', groups: [], elements: [
    { id: 'image', type: 'image', role: 'content', x: 0, y: 0, width: 100, height: 100, assetId, fit: 'cover', focalPoint: { x: .5, y: .5 } },
    { id: 'text', type: 'text', role: 'content', x: 10, y: 10, width: 40, height: 20, text: 'Coverage', fontFamily: 'Inter', fontSize: 10, fontWeight: 400, color: '#ffffff', lineHeight: 1.2 },
  ],
});

test('coverage separates SVG overlap from raster candidates without asserting busy photos', () => {
  const svg = designFeatures(coverageDesign('frame.SVG'));
  const raster = designFeatures(coverageDesign('image.jpg'));
  const unknown = designFeatures(coverageDesign('opaque-asset-id'));
  assert.equal(svg.textOverImage, 1, 'legacy geometry signal remains unchanged');
  assert.deepEqual(svg.coverage, { contentGroups: 0, textOverSvg: 1, textOverRaster: 0, textOverUnknown: 0 });
  assert.deepEqual(raster.coverage, { contentGroups: 0, textOverSvg: 0, textOverRaster: 1, textOverUnknown: 0 });
  assert.deepEqual(unknown.coverage, { contentGroups: 0, textOverSvg: 0, textOverRaster: 0, textOverUnknown: 1 });
  const summary = summarize([entry('svg', 's', 'A', svg), entry('raster', 'r', 'B', raster), entry('unknown', 'u', 'C', unknown)]);
  assert.deepEqual(summary.coverage, {
    assessedLayouts: 3, unassessedLayouts: 0, withContentGroups: 0, withTextOverSvg: 1,
    withTextOverRaster: 1, withTextOverUnknown: 1, busyPhotoText: 'unverified',
    uncovered: ['grouped-content'],
  });
});

test('coverage groups require declared multi-member content, not group-shaped decoration', () => {
  const design = coverageDesign();
  design.groups = [{ id: 'real', label: 'Real content' }];
  design.elements.forEach(e => e.groupId = 'real');
  assert.equal(designFeatures(design).coverage?.contentGroups, 1);
  design.elements[0].groupId = undefined;
  assert.equal(designFeatures(design).coverage?.contentGroups, 0, 'single-member group is not grouped content');
  design.elements[0].groupId = 'real';
  design.elements.forEach(e => e.role = 'decoration');
  assert.equal(designFeatures(design).coverage?.contentGroups, 0, 'decorations are not content groups');
  design.elements.forEach(e => e.role = 'content');
  design.groups = [];
  assert.equal(designFeatures(design).coverage?.contentGroups, 0, 'undeclared group IDs are not evidence');
});

test('coverage respects paint order and positive area, and does not inflate overlapping image counts', () => {
  const design = coverageDesign('image.png');
  design.elements.unshift({ ...design.elements[0], id: 'second-image' });
  assert.equal(designFeatures(design).coverage?.textOverRaster, 1, 'count text elements once per format');
  design.elements.reverse();
  assert.equal(designFeatures(design).coverage?.textOverRaster, 0, 'image above text is not text over image');
  const zero = coverageDesign(); zero.elements[1].width = 0;
  assert.equal(designFeatures(zero).coverage?.textOverSvg, 0);
  const apart = coverageDesign(); apart.elements[1].x = 200;
  assert.equal(designFeatures(apart).coverage?.textOverSvg, 0);
});

test('legacy feature records are unassessed and cannot establish missing or present coverage', () => {
  const summary = summarize([entry('legacy', 't', 'A', { textOverImage: 1 })]);
  assert.equal(summary.coverage.unassessedLayouts, 1);
  assert.equal(summary.coverage.assessedLayouts, 0);
  assert.deepEqual(summary.coverage.uncovered, []);
  assert.equal(summary.coverage.busyPhotoText, 'unverified');
  assert.deepEqual(summarize([]).coverage.uncovered, ['grouped-content', 'text-over-image']);
});

test('coverage reporting does not change deterministic selection or pinning across expansion', () => {
  const pool = Array.from({ length: 8 }, (_, i) => entry(`l${i}`, `t${i}`, `c${i}`, designFeatures(coverageDesign(i % 2 ? 'photo.png' : 'frame.svg'))));
  const pilot = { ...DEFAULT_BATCH, maxLayouts: 3, maxTemplates: 3, perTemplate: 1, categoryShare: 1 };
  const first = selectBatch(pool, pilot);
  const next = { ...pilot, maxLayouts: 6, maxTemplates: 6 };
  const expanded = selectBatch(pool, next, ids(first));
  assert.equal(expanded.length, 6);
  assert.deepEqual(ids(expanded).slice(0, 3), ids(first));
  assert.deepEqual(ids(selectBatch([...pool].reverse(), next, ids(first))), ids(expanded));
  const legacy = pool.map(e => { const { coverage, ...features } = e.features; return { ...e, features }; });
  assert.deepEqual(ids(selectBatch(legacy, next, ids(first))), ids(expanded));
});
