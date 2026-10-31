import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { adaptOfficial, OfficialAdapterError } from '../src/official-adapter';
import * as adapterModule from '../src/official-adapter';
import type { DesignResources } from '../src/resources';
import type { Measure } from '../src/typography';

const measure: Measure = (text, element) => ({ width: [...text].length * element.fontSize * .5, ascent: element.fontSize * .8, descent: element.fontSize * .2 });
const request = (rotation = 0) => ({
  source: { canvas: { width: 100, height: 100 }, elements: [{ id: 'label', type: 'text', x: 10, y: 10, width: 80, height: 40, rotation,
    opacity: 1, z_index: 0, group_id: null, content: 'Keep this copy', font_family: 'Inter', font_size: 12, font_weight: 'regular', font_style: 'normal',
    color: 'rgba(0,0,0,1)', text_align: 'left', line_height: 1.2, letter_spacing: 0, max_lines: null, style_runs: [] }] },
  target_canvas: { width: 100, height: 100 },
});

test('official adapter same-size text round-trip preserves envelope, fields, id, copy, order and source', () => {
  const input = request(), before = structuredClone(input);
  const result = adaptOfficial(input, measure);
  assert.deepEqual(result.output, input.source);
  assert.deepEqual(result.unsupported, []);
  assert.deepEqual(input, before);
});

test('official adapter non-same-size text conversion uses reflow engine geometry and keeps source immutable', () => {
  const input = request(); input.target_canvas = { width: 200, height: 200 };
  const before = structuredClone(input);
  const result = adaptOfficial(input, measure);
  assert.deepEqual(result.unsupported, []);
  assert.equal(result.output?.canvas.width, 200);
  assert.equal(result.output?.canvas.height, 200);
  assert.equal(result.output?.elements[0].id, input.source.elements[0].id);
  assert.deepEqual([result.output?.elements[0].x, result.output?.elements[0].y, result.output?.elements[0].width, result.output?.elements[0].height], [20, 20, 160, 80]);
  assert.deepEqual(input, before);
});

test('official adapter explicitly rejects nonzero rotation without output or source mutation', () => {
  const input = request(15), before = structuredClone(input);
  assert.throws(() => adaptOfficial(input, measure), (error: unknown) => error instanceof OfficialAdapterError &&
    error.code === 'unsupported' && error.path === '$.source.elements[0].rotation');
  assert.deepEqual(input, before);
});

test('official adapter still rejects unsupported shape types (line) explicitly', () => {
  const input = request();
  input.source.elements[0] = { id: 'shape', type: 'shape', x: 0, y: 0, width: 100, height: 100, shape_type: 'line', fill_color: 'rgba(0,0,0,1)' } as unknown as typeof input.source.elements[number];
  const shapeBefore = structuredClone(input);
  assert.throws(() => adaptOfficial(input, measure), (error: unknown) => error instanceof OfficialAdapterError &&
    error.path === '$.source.elements[0].shape_type' && error.code === 'unsupported');
  assert.deepEqual(input, shapeBefore);
});

test('official adapter rejects style runs that change weight/style rather than collapsing rich text', () => {
  const input = request(); (input.source.elements[0] as { style_runs: unknown[] }).style_runs = [{ start: 0, end: 4, font_weight: 'bold' }];
  const before = structuredClone(input);
  assert.throws(() => adaptOfficial(input, measure), (error: unknown) => error instanceof OfficialAdapterError &&
    error.path === '$.source.elements[0].style_runs[0].font_weight');
  assert.deepEqual(input, before);
});

// --- M3: official image elements (fit contain|cover, caller-supplied local assets, fixed role) ---

const level1 = () => JSON.parse(readFileSync(new URL('./fixtures/official-level1.json', import.meta.url), 'utf8'));
const ASSET_MAP: Record<string, string> = { 'solstice_bg_gradient.png': 'local:bg', 'solstice_logo_lockup.png': 'local:logo' };
const resourcesWith = (map: Record<string, string>): DesignResources => ({
  resolveAsset: id => Object.hasOwn(map, id) ? map[id] : undefined,
  supportsFont: () => true,
});

test('M3 official level1 sample (2 images + 2 text) converts, keeping ids, order and official fields', () => {
  const input = level1(), before = structuredClone(input);
  const result = adaptOfficial(input, measure, resourcesWith(ASSET_MAP));
  const out = result.output!.elements, src = input.source.elements;
  assert.deepEqual(out.map(e => e.id), src.map((e: { id: string }) => e.id));
  assert.deepEqual(result.output!.canvas, input.target_canvas);
  for (const [i, e] of src.entries()) {
    for (const k of Object.keys(e)) if (!['x', 'y', 'width', 'height', 'font_size'].includes(k)) assert.deepEqual(out[i][k], e[k], `${e.id}.${k}`);
    assert.deepEqual(Object.keys(out[i]).sort(), Object.keys(e).sort());
  }
  assert.deepEqual(input, before);
});

test('M3 unresolved asset_id fails at the official field path and leaves the source unchanged', () => {
  const input = level1(), before = structuredClone(input);
  assert.throws(() => adaptOfficial(input, measure, resourcesWith({ 'solstice_bg_gradient.png': 'local:bg' })),
    (error: unknown) => error instanceof OfficialAdapterError && error.path === '$.source.elements[1].asset_id');
  assert.deepEqual(input, before);
});

test('M3 image fit "fill" stays rejected, as does a non-string asset_id', () => {
  const input = level1(); input.source.elements[0].fit = 'fill';
  const before = structuredClone(input);
  assert.throws(() => adaptOfficial(input, measure, resourcesWith(ASSET_MAP)),
    (error: unknown) => error instanceof OfficialAdapterError && error.code === 'unsupported' && error.path === '$.source.elements[0].fit');
  assert.deepEqual(input, before);
  const bad = level1(); bad.source.elements[0].asset_id = 5;
  assert.throws(() => adaptOfficial(bad, measure, resourcesWith(ASSET_MAP)),
    (error: unknown) => error instanceof OfficialAdapterError && error.path === '$.source.elements[0].asset_id');
});

test('M3 image role is one fixed adapter policy: swapping ids and order does not change per-asset geometry', () => {
  assert.equal((adapterModule as Record<string, unknown>).OFFICIAL_ELEMENT_ROLE, 'content');
  const a = level1();
  const b = level1();
  [b.source.elements[0].id, b.source.elements[1].id] = ['logo', 'bg'];
  [b.source.elements[0], b.source.elements[1]] = [b.source.elements[1], b.source.elements[0]];
  const geom = (r: ReturnType<typeof adaptOfficial>) => Object.fromEntries(r.output!.elements.filter(e => e.type === 'image')
    .map(e => [e.asset_id, [e.x, e.y, e.width, e.height]]));
  assert.deepEqual(geom(adaptOfficial(b, measure, resourcesWith(ASSET_MAP))), geom(adaptOfficial(a, measure, resourcesWith(ASSET_MAP))));
});

// --- M3 level2: shapes (rectangle|ellipse), corner_radius, group_id, color-only style_runs ---
const level2 = () => JSON.parse(readFileSync(new URL('./fixtures/official-level2.json', import.meta.url), 'utf8'));
const L2_ASSETS = { ...ASSET_MAP, 'solstice_bottle.png': 'local:bottle' };
const L2 = resourcesWith(L2_ASSETS);
const byId = (els: Record<string, unknown>[]) => new Map(els.map(e => [e.id as string, e]));
const rejectsAt = (input: unknown, path: string, code?: string) => {
  const before = structuredClone(input);
  assert.throws(() => adaptOfficial(input, measure, L2), (e: unknown) => e instanceof OfficialAdapterError && e.path === path && (!code || e.code === code), path);
  assert.deepEqual(input, before);
};

test('L2 R1 level2 sample converts: ids once, source order, official fields/keys preserved, source unmutated', () => {
  const input = level2(), before = structuredClone(input);
  const result = adaptOfficial(input, measure, L2);
  const out = result.output!.elements, src = input.source.elements;
  assert.deepEqual(out.map(e => e.id), src.map((e: { id: string }) => e.id));
  assert.deepEqual(result.output!.canvas, input.target_canvas);
  for (const [i, e] of src.entries()) {
    assert.deepEqual(Object.keys(out[i]).sort(), Object.keys(e).sort(), e.id);
    for (const k of Object.keys(e)) if (!['x', 'y', 'width', 'height', 'font_size'].includes(k)) assert.deepEqual(out[i][k], e[k], `${e.id}.${k}`);
  }
  assert.deepEqual(input, before);
});

test('L2 R2 group members stay in the same group; style_run offsets stay valid because text is untouched', () => {
  const input = level2();
  const out = byId(adaptOfficial(input, measure, L2).output!.elements);
  assert.equal(out.get('badge_bg')!.group_id, 'badge');
  assert.equal(out.get('badge_label')!.group_id, 'badge');
  assert.equal(out.get('cta_bg')!.group_id, 'cta');
  assert.equal(out.get('cta_label')!.group_id, 'cta');
  for (const e of input.source.elements.filter((x: { type: string }) => x.type === 'text')) {
    assert.equal(out.get(e.id)!.content, e.content, `${e.id}.content`);
    assert.deepEqual(out.get(e.id)!.style_runs, e.style_runs, `${e.id}.style_runs`);
  }
  assert.equal(out.get('badge_bg')!.corner_radius, 28);
  assert.equal(out.get('cta_bg')!.corner_radius, 45);
});

test('L2 R3 unsupported or invalid shape/run/group/opacity fields are rejected at exact paths', () => {
  const mut = (f: (s: any[]) => void) => { const i = level2(); f(i.source.elements); return i; };
  const idx = (id: string) => level2().source.elements.findIndex((e: { id: string }) => e.id === id);
  const circle = idx('deco_circle_1'), badge = idx('badge_bg'), head = idx('headline');
  rejectsAt(mut(s => { s[circle].shape_type = 'line'; }), `$.source.elements[${circle}].shape_type`, 'unsupported');
  rejectsAt(mut(s => { s[circle].stroke_width = 2; }), `$.source.elements[${circle}].stroke_width`, 'unsupported');
  rejectsAt(mut(s => { s[circle].stroke_color = 'rgba(0,0,0,1)'; }), `$.source.elements[${circle}].stroke_color`, 'unsupported');
  rejectsAt(mut(s => { s[circle].corner_radius = 5; }), `$.source.elements[${circle}].corner_radius`, 'unsupported');
  rejectsAt(mut(s => { s[circle].fill_color = '#ffffff'; }), `$.source.elements[${circle}].fill_color`, 'unsupported');
  rejectsAt(mut(s => { s[badge].corner_radius = -1; }), `$.source.elements[${badge}].corner_radius`, 'invalid-input');
  rejectsAt(mut(s => { s[badge].opacity = 1.5; }), `$.source.elements[${badge}].opacity`, 'invalid-input');
  rejectsAt(mut(s => { s[badge].opacity = '1'; }), `$.source.elements[${badge}].opacity`, 'invalid-input');
  rejectsAt(mut(s => { s[badge].group_id = ''; }), `$.source.elements[${badge}].group_id`, 'invalid-input');
  rejectsAt(mut(s => { s[badge].group_id = 7; }), `$.source.elements[${badge}].group_id`, 'invalid-input');
  rejectsAt(mut(s => { s[head].style_runs[0].font_weight = 'bold'; }), `$.source.elements[${head}].style_runs[0].font_weight`, 'unsupported');
  rejectsAt(mut(s => { s[head].style_runs[0].start = 15; s[head].style_runs[0].end = 20; }), `$.source.elements[${head}].style_runs[0]`, 'invalid-input');
  rejectsAt(mut(s => { s[head].style_runs.push({ start: 10, end: 20, color: 'rgba(0,0,0,1)' }); }), `$.source.elements[${head}].style_runs[1]`, 'invalid-input');
  rejectsAt(mut(s => { s[head].style_runs[0].color = '#fff'; }), `$.source.elements[${head}].style_runs[0].color`, 'unsupported');
});

test('L2 official sample run overshoots content by one (end 16 on 15 chars): tolerated and passed through verbatim', () => {
  const input = level2(); const h = input.source.elements.find((e: { id: string }) => e.id === 'headline');
  assert.equal(h.content.length, 15); assert.equal(h.style_runs[0].end, 16);
  assert.deepEqual(byId(adaptOfficial(input, measure, L2).output!.elements).get('headline')!.style_runs, h.style_runs);
});

test('L2 R4 internal paint-order sort does not leak: output follows source order and keeps z_index, mapped by id', () => {
  const input = level2();
  const ids = input.source.elements.map((e: { id: string }) => e.id);
  const z = (id: string) => input.source.elements.find((e: { id: string }) => e.id === id).z_index;
  assert.ok(ids.indexOf('logo') < ids.indexOf('product') && z('logo') > z('product'), 'fixture has z4-before-z3');
  const swapped = level2(); const e = swapped.source.elements; [e[3], e[4]] = [e[4], e[3]];
  for (const inp of [input, swapped]) {
    const out = adaptOfficial(inp, measure, L2).output!.elements;
    assert.deepEqual(out.map(x => x.id), inp.source.elements.map((x: { id: string }) => x.id));
    const o = byId(out);
    for (const s of inp.source.elements) assert.equal(o.get(s.id)!.z_index, s.z_index, s.id);
  }
  const ties = level2(); for (const el of ties.source.elements) el.z_index = 1;
  assert.deepEqual(adaptOfficial(ties, measure, L2).output!.elements.map(x => x.id), ties.source.elements.map((x: { id: string }) => x.id));
});

test('L2 R5 KNOWN LIMIT: cover image is not full-bleed (role content); pinned so a fix is deliberate', () => {
  const input = level1();
  const bg = byId(adaptOfficial(input, measure, resourcesWith(ASSET_MAP)).output!.elements).get('bg')!;
  assert.deepEqual([bg.x, bg.y, bg.width, bg.height], [0, 135, 1080, 1080]); // target is 1080x1350; full-bleed would be 0,0,1080,1350
});

// --- M3 roles: explicit per-call caller-supplied role map (no inference) ---
// Level3 (NOT supported, on purpose): rotation -12 on ribbon_bg/ribbon_label is not accounted for by the engine's axis-aligned
// bounds; holiday_watermark's asset is deliberately missing (skip/placeholder is a USER policy decision; we throw missing-asset);
// the 728x90 extreme ratio with 10 groups is unverified and the renderer is BLOCKED.
const L1 = resourcesWith(ASSET_MAP);
const GEOM = ['x', 'y', 'width', 'height'];
const runRoles = (input: any, roles?: Record<string, string>, res = L1) => adaptOfficial(input, measure, res, roles === undefined ? undefined : { roles } as never);

test('ROLES R1 level1 bg:background becomes full-bleed 1080x1350 in every candidate incl. uniform; other elements keep ids/order/non-geometry fields', () => {
  const input = level1(), before = structuredClone(input);
  const out = runRoles(input, { bg: 'background' }).output!.elements;
  assert.deepEqual(out.map(e => e.id), input.source.elements.map((e: { id: string }) => e.id));
  // Geometry asserted: bg only. Non-background geometry is the engine's; no layout-quality claim.
  assert.deepEqual([out[0].x, out[0].y, out[0].width, out[0].height], [0, 0, 1080, 1350]);
  for (const [i, e] of input.source.elements.entries()) {
    assert.deepEqual(Object.keys(out[i]).sort(), Object.keys(e).sort(), e.id);
    for (const k of Object.keys(e)) if (![...GEOM, 'font_size'].includes(k)) assert.deepEqual(out[i][k], e[k], `${e.id}.${k}`);
  }
  assert.deepEqual(input, before);
});

test('ROLES R2 level2 bg:background becomes full-bleed on the 1600x400 target; ids/order/z_index preserved', () => {
  const input = level2();
  const base = byId(runRoles(input, undefined, L2).output!.elements).get('bg')!;
  assert.notDeepEqual([base.x, base.y, base.width, base.height], [0, 0, 1600, 400], 'without a map bg is not full-bleed');
  const out = runRoles(input, { bg: 'background' }, L2).output!.elements;
  assert.deepEqual(out.map(e => e.id), input.source.elements.map((e: { id: string }) => e.id));
  assert.deepEqual([out[0].x, out[0].y, out[0].width, out[0].height], [0, 0, 1600, 400]);
  for (const [i, e] of input.source.elements.entries()) assert.equal(out[i].z_index, e.z_index, e.id);
});

test('ROLES R3 omitted or empty map leaves default behaviour (known cover limit unchanged)', () => {
  for (const roles of [undefined, {}]) {
    const bg = byId(runRoles(level1(), roles).output!.elements).get('bg')!;
    assert.deepEqual([bg.x, bg.y, bg.width, bg.height], [0, 135, 1080, 1080]);
  }
});

test('ROLES R4 invalid maps are rejected at exact paths; source unchanged', () => {
  const bad = (roles: unknown, path: string) => {
    const input = level1(), before = structuredClone(input);
    assert.throws(() => adaptOfficial(input, measure, L1, { roles } as never),
      (e: unknown) => e instanceof OfficialAdapterError && e.code === 'invalid-input' && e.path === path, path);
    assert.deepEqual(input, before);
  };
  bad({ nope: 'background' }, '$.options.roles.nope');
  bad({ bg: 'wallpaper' }, '$.options.roles.bg');
  bad({ bg: 'decoration' }, '$.options.roles.bg'); // engine treats it as non-content/unplaced; not admitted
  bad({ bg: 3 }, '$.options.roles.bg');
  bad(JSON.parse('{"__proto__": "background"}'), '$.options.roles.__proto__');
  bad('background', '$.options.roles');
  bad([], '$.options.roles');
  bad(null, '$.options.roles');
});

test('ROLES R5 no inference: ids/order/position never change roles (swap test, default map)', () => {
  const a = runRoles(level1()).output!.elements, swapped = level1();
  [swapped.source.elements[0], swapped.source.elements[1]] = [swapped.source.elements[1], swapped.source.elements[0]];
  const b = byId(runRoles(swapped).output!.elements);
  for (const e of a.filter(x => x.type === 'image')) assert.deepEqual(GEOM.map(k => b.get(e.id as string)![k]), GEOM.map(k => e[k]), e.id as string);
});

test('ROLES R6 a grouped background is accepted but NOT stretched (engine only full-bleeds ungrouped backgrounds)', () => {
  const input = level1(); input.source.elements[0].group_id = 'g';
  const bg = byId(runRoles(input, { bg: 'background' }).output!.elements).get('bg')!;
  assert.notDeepEqual([bg.x, bg.y, bg.width, bg.height], [0, 0, 1080, 1350]);
});

test('ROLES R7 a map leaving no content element is rejected visibly (engine would fall back to uniform scale and ignore it)', () => {
  const input = level1(), before = structuredClone(input);
  const all = Object.fromEntries(input.source.elements.map((e: { id: string }) => [e.id, 'background']));
  assert.throws(() => runRoles(input, all), (e: unknown) => e instanceof OfficialAdapterError && e.code === 'invalid-input' && e.path === '$.options.roles');
  assert.deepEqual(input, before);
});

test('ROLES non-plain-object maps (Map, class instance, Object.create(proto)) are rejected at $.options.roles', () => {
  class Roles { bg = 'background'; }
  for (const roles of [new Map([['bg', 'background']]), new Roles(), Object.create({ bg: 'background' }), new Date()]) {
    const input = level1(), before = structuredClone(input);
    assert.throws(() => adaptOfficial(input, measure, L1, { roles } as never),
      (e: unknown) => e instanceof OfficialAdapterError && e.code === 'invalid-input' && e.path === '$.options.roles');
    assert.deepEqual(input, before);
  }
  // positive control: null-prototype plain map is still a plain object
  const plain = Object.assign(Object.create(null), { bg: 'background' });
  assert.deepEqual(runRoles(level1(), plain).output!.elements[0].id, 'bg');
});

// --- Q6: image bounds and crop retention with REAL asset dimensions (IHDR-only fixture; geometry, no visual claims) ---
const DIMS: Record<string, { width: number; height: number }> = JSON.parse(readFileSync(new URL('./fixtures/official-asset-dims.json', import.meta.url), 'utf8')).assets;
const IMG_RES = resourcesWith(Object.fromEntries(Object.keys(DIMS).map(k => [k, `local:${k}`])));
const IMG_TARGETS: [number, number][] = [[1080, 1350], [1600, 400], [400, 1600], [728, 90], [1080, 1080], [1001, 1000]];
const retained = (assetId: string, e: Record<string, unknown>) => {
  const a = DIMS[assetId].width / DIMS[assetId].height, b = (e.width as number) / (e.height as number);
  return Math.min(a / b, b / a); // fraction of the asset visible when a cover box crops the other axis
};
const placements = () => {
  const rows: { name: string; src: any; out: Record<string, unknown>; w: number; h: number }[] = [];
  for (const [file, load] of [['level1', level1], ['level2', level2]] as const) for (const [w, h] of IMG_TARGETS) for (const roles of [undefined, { bg: 'background' }]) {
    const input = load(); input.target_canvas = { width: w, height: h };
    const out = byId(adaptOfficial(input, measure, IMG_RES, roles ? { roles } as never : undefined).output!.elements);
    for (const src of input.source.elements.filter((e: { type: string }) => e.type === 'image')) rows.push({ name: `${file} ${w}x${h} ${roles ? 'roles' : 'none'} ${src.id}`, src, out: out.get(src.id)!, w, h });
  }
  return rows;
};

test('IMG every image box is positive, inside the target canvas, and keeps asset_id and fit (60 placements, real assets)', () => {
  const rows = placements();
  assert.equal(rows.length, 60);
  for (const { name, src, out, w, h } of rows) {
    const eps = 1e-6;
    assert.ok((out.width as number) > 0 && (out.height as number) > 0, `${name} size`);
    assert.ok((out.x as number) >= -eps && (out.y as number) >= -eps && (out.x as number) + (out.width as number) <= w + eps && (out.y as number) + (out.height as number) <= h + eps, `${name} bounds ${JSON.stringify([out.x, out.y, out.width, out.height])}`);
    assert.equal(out.asset_id, src.asset_id, name);
    assert.equal(out.fit, src.fit, name);
  }
});

test('IMG level1 bg at 1080x1350 with bg:background retains 100% of the asset (asset AR .8 == target AR .8); without the map it retains 80%', () => {
  const rows = placements().filter(r => r.name.startsWith('level1 1080x1350') && r.src.id === 'bg');
  const withMap = rows.find(r => r.name.includes('roles'))!, without = rows.find(r => r.name.includes('none'))!;
  assert.ok(Math.abs(retained(withMap.src.asset_id, withMap.out) - 1) < 1e-9);
  assert.ok(Math.abs(retained(without.src.asset_id, without.out) - .8) < 1e-9);
});

test('IMG KNOWN LIMIT: full-bleed cover trades crop at extreme ratios (level1 bg retained, real 1200x1500 asset); the adapter surfaces no crop-loss warning', () => {
  const pick = (t: string) => placements().find(r => r.name === `level1 ${t} roles bg`)!;
  const pct = (t: string) => Math.round(retained(pick(t).src.asset_id, pick(t).out) * 100);
  assert.deepEqual([pct('1600x400'), pct('400x1600'), pct('728x90')], [20, 31, 10]);
});

// --- Q7: opt-in sidecar report of engine diagnostics (advisory; output unchanged) ---
// Crop-loss needs parseable intrinsic sizes: resolveAsset returns a synthesized 24-byte PNG IHDR data URI per fixture dimension (no image bytes).
const ihdrUri = (w: number, h: number) => {
  const b = Buffer.alloc(24); Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b); b.writeUInt32BE(13, 8); b.write('IHDR', 12); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20);
  return `data:image/png;base64,${b.toString('base64')}`;
};
const SIZED = resourcesWith(Object.fromEntries(Object.entries(DIMS).map(([k, v]) => [k, ihdrUri(v.width, v.height)])));
const withTarget = (load: () => any, w: number, h: number) => { const i = load(); i.target_canvas = { width: w, height: h }; return i; };
const reportOf = (input: any, roles?: Record<string, string>) =>
  adaptOfficial(input, measure, SIZED, { report: true, ...(roles ? { roles } : {}) } as never) as ReturnType<typeof adaptOfficial> & { report: any };

test('REPORT R1 level2 -> 1600x400 (no map): the selected candidate reports a crop-loss warning for bg, matching the engine message', () => {
  const { report } = reportOf(level2());
  const crop = report.findings.filter((f: any) => f.kind === 'crop-loss');
  assert.deepEqual(crop.map((f: any) => [f.elementIds, f.severity]), [[['bg'], 'warning']]);
  assert.match(crop[0].message, /^bg shows \d+% of the image region visible in the source\.$/);
  assert.ok(report.warnings >= 1 && report.findings.filter((f: any) => f.severity === 'warning').length === report.warnings);
  assert.equal(report.errors, report.findings.filter((f: any) => f.severity === 'error').length);
  assert.equal(report.strategy, 'split'); // engine-internal name, pinned only to catch report/selected mix-ups
});

test('REPORT R8 a background-role image showing 20% of the asset gets a crop-loss warning naming it (role does not exempt crop-loss)', () => {
  const out = reportOf(withTarget(level1, 1600, 400), { bg: 'background' });
  const bg = byId(out.output!.elements).get('bg')!;
  assert.ok(Math.abs(retained('solstice_bg_gradient.png', bg) - .2) < 1e-9, 'the Q6 20% limit still holds');
  const crop = out.report.findings.filter((f: any) => f.kind === 'crop-loss');
  assert.deepEqual(crop.map((f: any) => [f.elementIds, f.severity]), [[['bg'], 'warning']]);
  // crop-loss is relative to the SOURCE-visible region: the source frame already showed 80% of the asset, so 20% / 80% = 25%.
  assert.match(crop[0].message, /^bg shows 25% of the image region visible in the source\.$/);
});

test('REPORT R2 default outcome has no report key and output is byte-identical with the option on', () => {
  const plain = adaptOfficial(withTarget(level1, 1600, 400), measure, SIZED, { roles: { bg: 'background' } });
  assert.equal('report' in plain, false);
  assert.deepEqual(Object.keys(plain).sort(), ['output', 'unsupported']);
  const on = reportOf(withTarget(level1, 1600, 400), { bg: 'background' });
  assert.equal(JSON.stringify(on.output), JSON.stringify(plain.output));
  assert.deepEqual(on.unsupported, []);
  assert.deepEqual(Object.keys(on).sort(), ['output', 'report', 'unsupported']);
});

test('REPORT R3 same-size level2 reports identity; the errors are the source design\'s own (out-of-bounds, collision), not crop-loss', () => {
  const { report } = reportOf(withTarget(level2, 1080, 1080));
  assert.equal(report.strategy, 'identity');
  assert.deepEqual(report.findings.filter((f: any) => f.severity === 'error').map((f: any) => f.kind).sort(), ['collision', 'out-of-bounds']);
  assert.equal(report.findings.filter((f: any) => f.kind === 'crop-loss').length, 0);
  assert.deepEqual(report.candidates.map((c: any) => c.strategy), ['identity']);
});

test('REPORT R4 only the literal true is accepted for options.report', () => {
  for (const bad of [false, 1, 'yes', null, {}]) {
    const input = level1(), before = structuredClone(input);
    assert.throws(() => adaptOfficial(input, measure, SIZED, { report: bad } as never),
      (e: unknown) => e instanceof OfficialAdapterError && e.code === 'invalid-input' && e.path === '$.options.report', String(bad));
    assert.deepEqual(input, before);
  }
});

test('REPORT R5 the report is an independent deep copy and the source stays unmutated', () => {
  const input = withTarget(level1, 1600, 400), before = structuredClone(input);
  const a = reportOf(input, { bg: 'background' }).report;
  a.findings.length = 0; a.candidates.length = 0; a.strategy = 'tampered';
  const b = reportOf(input, { bg: 'background' }).report;
  assert.notEqual(b.strategy, 'tampered');
  assert.ok(b.findings.length > 0 && b.candidates.length > 0);
  assert.deepEqual(input, before);
});

test('REPORT R6 no inference: swapping ids and order does not change strategy or error/warning counts for the same assets', () => {
  const a = reportOf(withTarget(level1, 1600, 400)).report;
  const swapped = withTarget(level1, 1600, 400);
  [swapped.source.elements[0].id, swapped.source.elements[1].id] = ['logo', 'bg'];
  [swapped.source.elements[0], swapped.source.elements[1]] = [swapped.source.elements[1], swapped.source.elements[0]];
  const b = reportOf(swapped).report;
  assert.deepEqual([b.strategy, b.errors, b.warnings], [a.strategy, a.errors, a.warnings]);
});

test('REPORT R7 report is the SELECTED candidate (not the first/last): strategy and counts come from it and match the candidate list', () => {
  const { report } = reportOf(withTarget(level2, 400, 1600)); // selects 'stack'; the last candidate is 'split' with different counts
  const last = report.candidates[report.candidates.length - 1];
  assert.equal(report.strategy, 'stack');
  assert.notEqual(last.strategy, report.strategy);
  assert.notEqual(last.warnings, report.warnings);
  assert.ok(report.candidates.some((c: any) => c.strategy === report.strategy && c.errors === report.errors && c.warnings === report.warnings));
  assert.equal(report.warnings, report.findings.filter((f: any) => f.severity === 'warning').length);
  assert.equal(report.errors, report.findings.filter((f: any) => f.severity === 'error').length);
  const ids = new Set(level2().source.elements.map((e: { id: string }) => e.id));
  for (const f of report.findings) for (const id of f.elementIds) assert.ok(ids.has(id), id);
});
