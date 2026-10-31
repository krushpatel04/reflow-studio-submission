import { badge } from './support/grouped-designs';
import { cropProbes } from './support/crop-probes';
import { rasterScale, renderedVerdict, shareFromPixels, subjectArea, subjectVerdict, visibilityVariants, type Pixels } from '../src/rendered-visibility';
import { assetSize } from '../src/crop';
import { ASSETS } from '../src/assets';
import { FIXTURES } from '../src/fixtures';
import { TARGETS } from '../src/model';
import { reflow } from '../src/engine';
import type { Design } from '../src/model';
import type { TextElement } from '../src/model';
import { layoutText, browserMeasure } from '../src/typography';
// An in-browser acceptance runner when automated browser launch is unavailable.
// It dispatches DOM events; it does not replace pointer, keyboard, or screen-reader testing.
const errors: string[] = [];
window.addEventListener('error', e => errors.push(e.message));
window.addEventListener('unhandledrejection', e => errors.push(String(e.reason)));
const originalError = console.error;
console.error = (...args) => { errors.push(args.map(String).join(' ')); originalError(...args); };
const checks: { name: string; passed: boolean; detail?: string }[] = [];
const get = <T extends HTMLElement>(selector: string) => { const e = document.querySelector<T>(selector); if (!e) throw new Error(`Missing ${selector}`); return e; };
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const pause = () => new Promise(resolve => setTimeout(resolve, 20));
const until = async (predicate: () => boolean) => { const deadline = performance.now() + 30000; while (!predicate()) { if (performance.now() > deadline) throw new Error('Timed out'); await pause(); } };
const settled = () => until(() => get('#canvas-grid').getAttribute('aria-busy') !== 'true');
async function check(name: string, run: () => unknown) {
  try { await run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, detail: String(error) }); }
}
await import('../src/main');
await until(() => document.documentElement.dataset.ready === 'true');
await check('All ten fixtures render four preview cards', async () => {
  const select = get<HTMLSelectElement>('#fixture');
  for (const fixture of window.reflowLab.fixtures) {
    select.value = fixture.id; select.dispatchEvent(new Event('change', { bubbles: true })); await settled();
    assert(get('#design-title').textContent === fixture.name, fixture.id);
    assert(document.querySelectorAll('.stage svg').length === 4, 'Expected original plus three variants');
  }
});
await check('Baseline toggle changes comparison mode and selected state', () => {
  get('#mode-baseline').click();
  assert(get('#mode-baseline').getAttribute('aria-pressed') === 'true', 'Baseline state');
  assert(get('#summary-description').textContent?.includes('Uniform scaling'), 'Baseline summary');
  get('#mode-selected').click();
});
await check('Edited copy reaches every variant and the JSON export', async () => {
  const text = 'Create something together.';
  get<HTMLTextAreaElement>('#headline').value = text; get('#update-copy').click(); await settled();
  for (const stage of document.querySelectorAll('.stage')) assert(stage.textContent?.includes('Create'), 'Edited text absent');
  let exported: Blob | undefined;
  const create = URL.createObjectURL;
  URL.createObjectURL = value => { if (value instanceof Blob) exported = value; return create(value); };
  const suppressDownload = (event: MouseEvent) => { if (event.target instanceof HTMLAnchorElement && event.target.download) event.preventDefault(); };
  document.addEventListener('click', suppressDownload, true);
  try {
    get('#export').click(); assert(exported, 'Export did not produce a Blob');
    const data = JSON.parse(await exported!.text());
    assert(data.variants.length === 3, 'Wrong number of exported variants');
    for (const variant of data.variants) assert(variant.design.elements.find((e: { id: string }) => e.id === 'headline').text === text, 'Copy changed in export');
  } finally { URL.createObjectURL = create; document.removeEventListener('click', suppressDownload, true); }
});
await check('Custom dimensions reject zero and accept 1600 × 600', async () => {
  get<HTMLInputElement>('#custom-width').value = '0'; get('#custom-apply').click(); await settled();
  assert(!!get('#size-error').textContent, 'Missing invalid-size feedback');
  get<HTMLInputElement>('#custom-width').value = '1600'; get<HTMLInputElement>('#custom-height').value = '600'; get('#custom-apply').click(); await settled();
  assert(!get('#size-error').textContent, 'Valid size rejected');
  assert(document.querySelectorAll('.stage svg').length === 5, 'Custom preview absent');
});
await check('Theme toggle updates both workspace and Spectrum theme', () => {
  get('#theme-toggle').click();
  assert(document.documentElement.dataset.theme === 'dark' && get('#spectrum-theme').getAttribute('color') === 'dark', 'Theme mismatch');
  get('#theme-toggle').click();
});
await check('Issue overlay renders diagnostics for oversized source copy', async () => {
  get<HTMLTextAreaElement>('#headline').value = 'A very long headline '.repeat(20); get('#update-copy').click(); await settled();
  const toggle = get<HTMLInputElement>('#show-issues'); toggle.checked = true; toggle.dispatchEvent(new Event('change'));
  assert(!!document.querySelector('.original-card svg rect[stroke-dasharray]'), 'Expected a source overflow outline');
  toggle.checked = false; toggle.dispatchEvent(new Event('change'));
});
await check('Findings stay open across display toggles for the same design', async () => {
  const opened = get<HTMLDetailsElement>('.original-card .findings');
  const closed = get<HTMLDetailsElement>('.design-card:not(.original-card) .findings');
  opened.querySelector('summary')!.click();
  assert(opened.open && !closed.open, 'Findings control did not open only the selected card');
  const toggle = get<HTMLInputElement>('#show-issues');
  for (const checked of [true, false]) {
    toggle.checked = checked; toggle.dispatchEvent(new Event('change'));
    assert(get<HTMLDetailsElement>('.original-card .findings').open, 'Overlay toggle closed the open findings');
    assert(!get<HTMLDetailsElement>('.design-card:not(.original-card) .findings').open, 'Overlay toggle opened another card');
  }
  get('#mode-baseline').click();
  assert(get<HTMLDetailsElement>('.original-card .findings').open, 'Mode toggle closed the open findings');
  get('#mode-selected').click();
  assert(get<HTMLDetailsElement>('.original-card .findings').open, 'Returning to selected closed the open findings');
  const select = get<HTMLSelectElement>('#fixture');
  const original = select.value;
  select.value = window.reflowLab.fixtures.find(f => f.id !== original)!.id;
  select.dispatchEvent(new Event('change', { bubbles: true })); await settled();
  assert(!get<HTMLDetailsElement>('.original-card .findings').open, 'A different design inherited the open findings');
  select.value = original; select.dispatchEvent(new Event('change', { bubbles: true })); await settled();
});
await check('Selecting a finding locates only its affected preview element', async () => {
  get<HTMLTextAreaElement>('#headline').value = 'A very long headline '.repeat(20);
  get('#update-copy').click(); await settled();
  const card = get<HTMLElement>('.original-card');
  const finding = [...card.querySelectorAll<HTMLLIElement>('.findings li')].find(li => li.textContent?.toLowerCase().includes('text'))!;
  assert(finding, 'No text finding to inspect');
  const control = finding.querySelector<HTMLButtonElement>('button');
  if (!control) throw new Error('Finding has no keyboard-operable selection control');
  card.querySelector<HTMLDetailsElement>('.findings')!.open = true;
  control.focus(); control.click();
  const headline = card.querySelector<SVGGElement>('[data-element-id="headline"]')!;
  assert(headline.classList.contains('finding-selected'), 'Affected element not highlighted');
  assert(control.getAttribute('aria-pressed') === 'true', 'Selected finding state not exposed');
  assert(!card.querySelector('[data-element-id]:not([data-element-id="headline"]).finding-selected'), 'Unrelated element highlighted');
  assert(!document.querySelector('.design-card:not(.original-card) .finding-selected'), 'Another card highlighted');
  assert(finding.textContent?.length, 'Finding explanation disappeared');
  const overlay = get<HTMLInputElement>('#show-issues');
  overlay.checked = true; overlay.dispatchEvent(new Event('change'));
  assert(get('.original-card [data-element-id="headline"]').classList.contains('finding-selected'), 'Overlay toggle lost selection');
  overlay.checked = false; overlay.dispatchEvent(new Event('change'));
  get<HTMLButtonElement>('.original-card .finding-select[aria-pressed="true"]').click();
  assert(!get('.original-card [data-element-id="headline"]').classList.contains('finding-selected'), 'Repeated activation did not clear selection');
  get<HTMLButtonElement>('.original-card .finding-select').click();
  get('#mode-baseline').click();
  assert(!get('.original-card [data-element-id="headline"]').classList.contains('finding-selected'), 'Selection leaked to baseline');
  get('#mode-selected').click();
});
await check('Browser benchmark completes all thirty rows', async () => {
  get('#run-benchmark').click(); await until(() => get('#lab-status').textContent!.includes('30 / 30 completed'));
  assert(document.querySelectorAll('#benchmark-table tbody tr').length === 30, 'Missing benchmark rows');
});
await check('Benchmark reports failed cases and continues successful siblings (#56)', async () => {
  // Valid at source size; scaling its huge decoration makes the target unrepresentable.
  const probe: Design = { schemaVersion: 'reflow.design.v0', id: 'overflow-probe', name: 'Overflow probe', description: '', provenance: 'browser-check', width: 1, height: 1, background: '#ffffff', groups: [], elements: [
    { id: 'copy', type: 'text', role: 'content', x: 0, y: 0, width: 1, height: 1, text: 'a', fontFamily: 'Inter', fontSize: 0.5, fontWeight: 400, color: '#000000', lineHeight: 1.2 },
    { id: 'wash', type: 'rect', role: 'decoration', x: 0, y: 0, width: 1e308, height: 1, color: '#ff0000' }] };
  FIXTURES.unshift(probe);
  try {
    get('#run-benchmark').click(); await until(() => !get('#run-benchmark').hasAttribute('disabled'));
    const status = get('#lab-status').textContent!, rows = [...document.querySelectorAll('#benchmark-table tbody tr')];
    assert(!status.startsWith('Benchmark failed'), `One failing case aborted the run: ${status}`);
    assert(rows.length === FIXTURES.length * TARGETS.length, `Missing cases: ${rows.length}`);
    const failed = rows.filter(row => row.querySelector('[role="alert"]'));
    assert(failed.length === TARGETS.length, `Expected each overflowing target to fail: ${failed.length}`);
    assert(failed.every(row => row.textContent!.includes('Overflow probe') && row.textContent!.includes('no-valid-candidate')), 'Failure identity/code absent');
    assert(rows.slice(TARGETS.length).every(row => !row.querySelector('[role="alert"]')), 'Successful siblings did not continue');
    assert(rows[rows.length - 1].textContent!.includes(FIXTURES[FIXTURES.length - 1].name), 'Final fixture missing or reordered');
    assert(status.includes(`${rows.length} / ${rows.length} completed`) && status.includes(`${failed.length} failed`), `Failure accounting: ${status}`);
  } finally { FIXTURES.splice(FIXTURES.indexOf(probe), 1); }
});
await check('Benchmark recovers on next normal run without stale failure rows (#56)', async () => {
  get('#run-benchmark').click(); await until(() => !get('#run-benchmark').hasAttribute('disabled'));
  const total = FIXTURES.length * TARGETS.length;
  assert(get('#lab-status').textContent!.startsWith(`${total} / ${total} completed`), 'Recovery run incomplete');
  assert(!get('#lab-status').textContent!.includes('failed'), 'Stale failure count');
  assert(document.querySelectorAll('#benchmark-table tbody tr').length === total, 'Recovery rows missing');
  assert(!document.querySelector('#benchmark-table tbody [role="alert"]'), 'Stale failure row');
});
await check('Nearby resizes preserve composition and image frames with browser fonts', () => {
  for (const source of window.reflowLab.fixtures) for (const [dw, dh] of [[1, 0], [0, -1], [8, -8]]) {
    const r = window.reflowLab.run(source, { id: 'nearby', label: 'Nearby', width: source.width + dw, height: source.height + dh });
    assert(r.selected.metrics.errors === 0, `${source.id}: selected geometry errors`);
    for (const e of source.elements) {
      const f = r.selected.design.elements.find(f => f.id === e.id)!;
      const movement = Math.hypot((e.x + e.width / 2) / source.width - (f.x + f.width / 2) / r.target.width,
        (e.y + e.height / 2) / source.height - (f.y + f.height / 2) / r.target.height);
      assert(movement < .02, `${source.id}/${e.id}: ${movement} movement for ${dw},${dh}`);
      if (e.type === 'image') assert(Math.abs((f.width / f.height) / (e.width / e.height) - 1) < .01, `${source.id}: image frame changed`);
    }
  }
});
await check('Mixed-role badge glyphs remain inside their dark backing', () => {
  const source = badge();
  const result = window.reflowLab.run(source, { id: 'tall', label: 'Tall', width: 600, height: 1200 });
  const preview = document.createElement('section'); preview.id = 'grouped-preview';
  preview.style.cssText = 'background:#ddd;padding:24px;color:#111;display:flex;gap:24px;align-items:start';
  const show = (label: string, design: typeof source) => {
    const figure = document.createElement('figure'); figure.style.cssText = 'margin:0;width:220px';
    figure.innerHTML = `<figcaption>${label}</figcaption>${window.reflowLab.render(design)}`;
    const svg = figure.querySelector('svg')!; svg.style.cssText = 'width:220px;height:auto;display:block';
    preview.append(figure); return figure;
  };
  show('Source badge', source);
  document.body.append(preview);
  for (const c of result.candidates) {
    // Explicitly opt-in, test-page-only negative control for the hosted CI gate.
    // This changes real output geometry; the existing glyph assertion must catch it.
    if (new URLSearchParams(location.search).get('fault') === 'separate-badge') {
      const plate = c.design.elements.find(e => e.id === 'plate')!;
      c.design.elements.find(e => e.id === 'label')!.y = plate.y + plate.height + 80;
    }
    const figure = show(c.strategy, c.design);
    const node = figure.querySelector<SVGTextElement>('[data-element-id="label"] text')!;
    const box = node.getBBox();
    const plate = c.design.elements.find(e => e.id === 'plate')!;
    assert(box.width > 0 && box.height > 0, `${c.strategy}: no glyph bounds`);
    assert(box.x >= plate.x && box.y >= plate.y && box.x + box.width <= plate.x + plate.width && box.y + box.height <= plate.y + plate.height,
      `${c.strategy}: actual glyph bounds separated from the dark backing`);
  }
});
const inkFindings: unknown[] = [];
await check('Independent SVG glyph bounds remain inside selected text boxes', async () => {
  const host = document.createElement('div'); host.style.cssText = 'position:absolute;left:-10000px;top:0;'; document.body.append(host);
  try {
    for (const result of await window.reflowLab.runAll()) {
      host.innerHTML = window.reflowLab.render(result.selected.design);
      for (const element of result.selected.design.elements) {
        if (element.type !== 'text') continue;
        const node = host.querySelector<SVGTextElement>(`[data-element-id="${CSS.escape(element.id)}"] text`)!;
        const box = node.getBBox();
        if (box.x < element.x - 1 || box.y < element.y - 1 || box.x + box.width > element.x + element.width + 1 || box.y + box.height > element.y + element.height + 1) inkFindings.push({ source: result.sourceId, target: result.target.id, element: element.id, actual: { x: box.x, y: box.y, width: box.width, height: box.height }, expected: element });
      }
    }
    assert(!inkFindings.length, `${inkFindings.length} text boxes need glyph-bound review`);
  } finally { host.remove(); }
});
type NativeFontParityProbe = {
  id: string; source: 'fixture' | 'probe'; text: string;
  fontFamily: string; fontWeight: number; fontSize: number; lineHeight: number;
  align: 'left' | 'center' | 'right' | null;
  box: { width: number; height: number };
  metrics: { width: number; ascent: number; descent: number };
  layout: { lines: string[]; width: number; ascent: number; lineStep: number; emergencyBreaks: number };
};
const lineBreakFindings: { id: string; native: string[]; browser: string[] }[] = [];
const fontParityDeltas: { id: string; widthDelta: number; ascentDelta: number; descentDelta: number }[] = [];
let fontParitySummary: { browser: string; maxWidthDelta: unknown; maxAscentDelta: unknown; maxDescentDelta: unknown } | null = null;
// Explicitly opt-in, test-page-only negative control for the hosted CI gate: deliberately shrinks
// one probe's wrap box so the browser measurer must choose different line breaks than the native
// (Skia) reference recorded that probe under. Proves the binding lines-equality assertion below
// actually catches a real divergence rather than passing vacuously.
const FONT_PARITY_FAULT_PROBE_ID = 'probe/repeated-whitespace';
await check('Browser and native font engines agree on layoutText line breaks for the font-parity probe corpus', async () => {
  const response = await fetch('/reports/font-parity/native-metrics.json');
  // Vite's dev server answers an unknown path with its SPA-fallback index.html (200, text/html)
  // rather than a 404, so `response.ok` alone can't detect a missing report — check content-type too.
  const isJson = (response.headers.get('content-type') ?? '').includes('json');
  assert(response.ok && isJson, 'Missing reports/font-parity/native-metrics.json — run `npx tsx scripts/font-parity.ts` first.');
  const native = await response.json() as { schemaVersion: string; probes: NativeFontParityProbe[] };
  assert(native.schemaVersion === 'reflow.font-parity.v1', `Unexpected font-parity schema version: ${native.schemaVersion}`);
  assert(native.probes.length > 0, 'Font-parity report has no probes');

  // Force every subset a probe might need to be loaded before measuring: canvas.measureText falls
  // back synchronously to a system font while a matching @font-face is still downloading, which
  // would make this comparison flaky rather than a true reflection of the loaded web fonts.
  const sample = native.probes.map(p => p.text).join('');
  const combos = new Set(native.probes.map(p => `${p.fontWeight} "${p.fontFamily}"`));
  await Promise.all([...combos].map(font => document.fonts.load(`${font.replace(/^(\d+) /, '$1 32px ')}`, sample)));
  await document.fonts.ready;

  const measure = browserMeasure();
  const fault = new URLSearchParams(location.search).get('fault') === 'font-parity-mismatch';
  for (const probe of native.probes) {
    const perturb = fault && probe.id === FONT_PARITY_FAULT_PROBE_ID;
    const element: TextElement = {
      id: probe.id, type: 'text', role: 'content', text: probe.text,
      x: 0, y: 0, width: perturb ? probe.box.width / 4 : probe.box.width, height: probe.box.height,
      fontSize: probe.fontSize, fontWeight: probe.fontWeight, fontFamily: probe.fontFamily,
      color: '#000000', lineHeight: probe.lineHeight, align: probe.align ?? undefined,
    };
    const layout = layoutText(element, measure);
    if (JSON.stringify(layout.lines) !== JSON.stringify(probe.layout.lines)) {
      lineBreakFindings.push({ id: probe.id, native: probe.layout.lines, browser: layout.lines });
    }
    const raw = measure(probe.text, element);
    fontParityDeltas.push({
      id: probe.id,
      widthDelta: Math.abs(raw.width - probe.metrics.width),
      ascentDelta: Math.abs(raw.ascent - probe.metrics.ascent),
      descentDelta: Math.abs(raw.descent - probe.metrics.descent),
    });
  }
  const worst = (key: 'widthDelta' | 'ascentDelta' | 'descentDelta') =>
    fontParityDeltas.reduce((max, d) => (d[key] > max[key] ? d : max), fontParityDeltas[0]);
  fontParitySummary = { browser: navigator.userAgent, maxWidthDelta: worst('widthDelta'), maxAscentDelta: worst('ascentDelta'), maxDescentDelta: worst('descentDelta') };
  // The binding assertion: two font engines will never agree on raw advance widths to the last
  // decimal (recorded above as observational deltas), but they must agree on where text breaks —
  // that is the user-visible invariant, and a disagreement means a preview can differ from an export.
  assert(!lineBreakFindings.length, `${lineBreakFindings.length} probes disagree on line breaks vs native: ${lineBreakFindings.map(f => f.id).join(', ')}`);
});
type NativeCropSample = { label: string; x: number; y: number; expected: string; native: number[] };
const cropFindings: { probe: string; label: string; browser: number[]; native: number[]; expected: string }[] = [];
await check('Browser SVG and native PNG crops agree on hand-computed image samples and clip to the frame', async () => {
  const response = await fetch('/reports/crop-parity/native-samples.json');
  assert(response.ok && (response.headers.get('content-type') ?? '').includes('json'), 'Missing reports/crop-parity/native-samples.json — run `npm run crop-parity` first.');
  const native = await response.json() as { schemaVersion: string; probes: { id: string; samples: NativeCropSample[] }[] };
  assert(native.schemaVersion === 'reflow.crop-parity.v1', `Unexpected crop-parity schema version: ${native.schemaVersion}`);
  assert(native.probes.length === cropProbes.length, 'Crop-parity report is stale');
  // Explicitly opt-in, test-page-only negative control: a quantized focal point in the browser only.
  const fault = new URLSearchParams(location.search).get('fault') === 'crop-mismatch';
  const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const near = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) <= 8);
  for (const probe of cropProbes) {
    const design = structuredClone(probe.design);
    if (fault && design.id === 'cover-tall-edge-subject') { const e = design.elements[0]; if (e.type === 'image') e.focalPoint.x = 1; }
    const url = URL.createObjectURL(new Blob([window.reflowLab.render(design)], { type: 'image/svg+xml' }));
    try {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = design.width; canvas.height = design.height;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
      const reference = native.probes.find(p => p.id === design.id);
      assert(reference && reference.samples.length === probe.samples.length, `${design.id}: stale native samples`);
      for (const sample of reference!.samples) {
        const browser = [...ctx.getImageData(sample.x, sample.y, 1, 1).data.subarray(0, 3)];
        if (!near(browser, sample.native) || !near(browser, hex(sample.expected))) cropFindings.push({ probe: design.id, label: sample.label, browser, native: sample.native, expected: sample.expected });
      }
    } finally { URL.revokeObjectURL(url); }
  }
  assert(!cropFindings.length, `${cropFindings.length} crop samples differ between browser SVG and native PNG: ${cropFindings.map(f => `${f.probe}/${f.label}`).join(', ')}`);
});
type PackCase = { id: string; label: 'defect' | 'legal'; method: 'pixels' | 'subject' | 'none'; elements: string[];
  rendered: { verdict: string; elements: { id: string; source?: number; output?: number }[] }; designs: { source: Design; output: Design } };
const renderedFindings: { case: string; label: string; native: string; browser: string }[] = [];
const renderedDeltas: { case: string; element: string; native: [number?, number?]; browser: [number?, number?] }[] = [];
await check('Browser and native rendered visibility reach the same verdict on every defect-pack case', async () => {
  const response = await fetch('/reports/defect-pack/labels.json');
  assert(response.ok && (response.headers.get('content-type') ?? '').includes('json'), 'Missing reports/defect-pack/labels.json — run `npm run defect-pack` first.');
  const pack = await response.json() as { schemaVersion: string; frozen: { fonts: { family: string; weight: number; unicodeRange: string; path: string }[] }; cases: PackCase[] };
  assert(pack.schemaVersion === 'reflow.defect-pack.v1', `Unexpected defect-pack schema version: ${pack.schemaVersion}`);
  // SVG rasterized as an image cannot use page fonts, so embed the same bundled faces.
  const faces = (await Promise.all(pack.frozen.fonts.map(async f => {
    const bytes = new Uint8Array(await (await fetch(`/${f.path}`)).arrayBuffer());
    let binary = ''; for (const b of bytes) binary += String.fromCharCode(b);
    return `@font-face{font-family:'${f.family}';font-weight:${f.weight};unicode-range:${f.unicodeRange};src:url(data:font/woff2;base64,${btoa(binary)})}`;
  }))).join('');
  const measure = browserMeasure();
  const rasterize = async (design: Design): Promise<Pixels> => {
    const svg = window.reflowLab.render(design).replace(/(<svg[^>]*>)/, `$1<style>${faces}</style>`);
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      const image = new Image(); image.src = url; await image.decode();
      const scale = rasterScale(design), canvas = document.createElement('canvas');
      canvas.width = Math.ceil(design.width * scale); canvas.height = Math.ceil(design.height * scale);
      const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } finally { URL.revokeObjectURL(url); }
  };
  const share = async (design: Design, id: string) => {
    const v = visibilityVariants(design, id, measure);
    const [full, without, black, white] = await Promise.all([v.full, v.without, v.black, v.white].map(rasterize));
    return shareFromPixels({ full, without, black, white }, v.text, rasterScale(design), v.bounds);
  };
  // Explicitly opt-in, test-page-only negative control: the browser measures one defect case against its own source.
  const fault = new URLSearchParams(location.search).get('fault') === 'rendered-mismatch';
  const cases = pack.cases.filter(c => c.method !== 'none');
  assert(cases.length >= 20, 'Defect pack is incomplete');
  for (const c of cases) {
    const output = fault && c.id === 'label-off-plate' ? c.designs.source : c.designs.output;
    const verdicts: string[] = [];
    for (const id of c.elements) {
      const nativeElement = c.rendered.elements.find(e => e.id === id);
      if (c.method === 'subject') {
        const area = async (d: Design) => { const e = d.elements.find(e => e.id === id)!; if (e.type !== 'image') throw new Error('Expected image');
          return subjectArea(await rasterize(d), d, id, assetSize(ASSETS[e.assetId])!, '#1a2b30'); };
        const [before, after] = [await area(c.designs.source), await area(output)];
        verdicts.push(subjectVerdict(before, after));
        renderedDeltas.push({ case: c.id, element: id, native: [nativeElement?.source, nativeElement?.output], browser: [before, after] });
      } else {
        const [before, after] = [await share(c.designs.source, id), await share(output, id)];
        verdicts.push(renderedVerdict(before, after));
        renderedDeltas.push({ case: c.id, element: id, native: [nativeElement?.source, nativeElement?.output], browser: [before.share, after.share] });
      }
    }
    const browser = verdicts.includes('defect') ? 'defect' : verdicts.every(v => v === 'no-verdict') ? 'no-verdict' : 'ok';
    if (browser !== c.rendered.verdict || browser !== (c.label === 'defect' ? 'defect' : 'ok')) renderedFindings.push({ case: c.id, label: c.label, native: c.rendered.verdict, browser });
  }
  assert(!renderedFindings.length, `${renderedFindings.length} defect-pack cases differ between browser and native rendered verdicts: ${renderedFindings.map(f => f.case).join(', ')}`);
});
const viewerObservation: Record<string, unknown> = {};
await check('Viewer retains one committed revision after second-target failure and recovers (#28 partial)', async () => {
  const originalMeasure = CanvasRenderingContext2D.prototype.measureText;
  const create = URL.createObjectURL;
  const anchorClick = HTMLAnchorElement.prototype.click;
  const anchorClickDescriptor = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'click');
  const select = get<HTMLSelectElement>('#fixture'), input = get<HTMLTextAreaElement>('#headline');
  const fixture = FIXTURES.find(f => f.id === 'grouped-details')!, headline = fixture.elements.find(e => e.id === 'headline');
  assert(headline?.type === 'text', 'Fixture headline absent');
  const initialText = (headline as TextElement).text;
  const rejectedText = 'Unapplied revision second target', recoveredText = 'Recovered revision headline';
  const problems: string[] = [];
  const expect = (condition: unknown, message: string) => { if (!condition) problems.push(message); };
  let exported: Blob | undefined, filename = '';
  const jsonExport = async () => {
    exported = undefined; filename = ''; get('#export').click(); assert(exported, 'JSON export missing');
    return JSON.parse(await exported!.text()) as { source: Design; variants: { design: Design }[] };
  };
  const textOf = (design: Design) => { const h = design.elements.find(e => e.id === 'headline'); return h?.type === 'text' ? h.text : undefined; };
  const inject = async (at: number, action: () => void, inWorker = false) => {
    let calls = 0, throws = 0;
    const NativeWorker = window.Worker;
    const urls: string[] = [];
    if (inWorker) {
      window.Worker = class extends NativeWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          const code = `const queued=[]; onmessage=e=>queued.push(e);
            let calls=0; const original=OffscreenCanvasRenderingContext2D.prototype.measureText;
            OffscreenCanvasRenderingContext2D.prototype.measureText=function(text){
              if(++calls===${at}) { postMessage({__fault:{calls,throws:1}}); throw new TypeError('injected second target'); }
              return original.call(this,text);
            };
            await import(${JSON.stringify(String(url))});
            for(const event of queued) onmessage(event);`;
          const wrapped = URL.createObjectURL(new Blob([code], {type:'text/javascript'})); urls.push(wrapped);
          super(wrapped, options);
          this.addEventListener('message', event => {
            if (event.data.__fault) { calls = event.data.__fault.calls; throws = event.data.__fault.throws; event.stopImmediatePropagation(); }
          });
        }
      };
    } else {
      // Fault injection must hit native measurement, even after a cached render.
      document.fonts.dispatchEvent(new Event('loading'));
      CanvasRenderingContext2D.prototype.measureText = function(text: string) {
        if (++calls === at) { throws++; throw new TypeError('injected second target'); }
        return originalMeasure.call(this, text);
      };
    }
    try { action(); await settled(); }
    finally { CanvasRenderingContext2D.prototype.measureText = originalMeasure; window.Worker = NativeWorker; urls.forEach(URL.revokeObjectURL); }
    return { calls, throws, at, inWorker };
  };
  try {
    URL.createObjectURL = value => { if (value instanceof Blob) exported = value; return create(value); };
    HTMLAnchorElement.prototype.click = function() {
      if (!this.download) return anchorClick.call(this);
      filename = this.download;
      const prevent = (event: MouseEvent) => event.preventDefault();
      this.addEventListener('click', prevent);
      try { anchorClick.call(this); }
      finally { this.removeEventListener('click', prevent); }
    };
    select.value = fixture.id; select.dispatchEvent(new Event('change', { bubbles: true })); await settled();
    get('#mode-selected').click(); input.value = initialText; get('#update-copy').click(); await settled();
    const stages = [...document.querySelectorAll('#canvas-grid .stage')].map(stage => stage.innerHTML);
    const summary = get('#summary-description').textContent!, title = get('#design-title').textContent;
    const geometryErrors = summary.match(/\d+ geometry\/content errors/)?.[0];
    const before = await jsonExport(), pageErrors = errors.length;
    assert(filename !== '' && filename === `${fixture.id}-reflow.json`, 'TEST HARNESS FAILURE: healthy JSON filename capture');
    const baselineJsonFilename = filename;
    exported = undefined; filename = ''; get<HTMLButtonElement>('#canvas-grid .export-svg-btn').click();
    await until(() => exported !== undefined);
    assert(exported && filename !== '' && filename === `${fixture.id}-Original.svg`, 'TEST HARNESS FAILURE: healthy SVG Blob/filename capture');
    const baselineSvg = new DOMParser().parseFromString(await exported!.text(), 'image/svg+xml');
    const baselineStage = new DOMParser().parseFromString(stages[0], 'text/html');
    const baselineHeadline = baselineSvg.querySelector('[data-element-id="headline"]')?.textContent;
    assert(!baselineSvg.querySelector('parsererror') && !!baselineHeadline && baselineHeadline === baselineStage.querySelector('[data-element-id="headline"]')?.textContent, 'TEST HARNESS FAILURE: healthy SVG XML/headline capture');
    Object.assign(viewerObservation, { healthyBaseline: { jsonFilename: baselineJsonFilename, svgFilename: filename, headline: baselineHeadline } });
    const candidate = structuredClone(fixture), candidateHeadline = candidate.elements.find(e => e.id === 'headline');
    assert(candidateHeadline?.type === 'text', 'Candidate headline absent');
    (candidateHeadline as TextElement).text = rejectedText;
    const count = () => {
      let calls = 0;
      CanvasRenderingContext2D.prototype.measureText = function(text: string) { calls++; return originalMeasure.call(this, text); };
      // The worker uses uncached canvas underneath its operation-local engine cache.
      // Calibrate against that same boundary, not the viewer's persistent font cache.
      const ctx = document.createElement('canvas').getContext('2d')!;
      try {
        reflow(candidate, TARGETS[0], (text, e) => {
          ctx.font = `${e.fontWeight} ${e.fontSize}px "${e.fontFamily}"`;
          const m = ctx.measureText(text);
          return { width: m.width, ascent: Math.max(m.actualBoundingBoxAscent, m.fontBoundingBoxAscent), descent: Math.max(m.actualBoundingBoxDescent, m.fontBoundingBoxDescent) };
        });
      } finally { CanvasRenderingContext2D.prototype.measureText = originalMeasure; }
      return calls;
    };
    const k1 = count(), k2 = count();
    Object.assign(viewerObservation, { k1, k2, geometryErrors });
    assert(k1 >= 1 && k1 === k2, `K unstable/unproven: ${k1}, ${k2}`);
    input.value = rejectedText;
    const fault = await inject(k1 + 1, () => get('#update-copy').click(), true);
    Object.assign(viewerObservation, { secondTarget: fault });
    assert(fault.throws === 1 && fault.calls === k1 + 1, `Second-target injection unproven: ${JSON.stringify(fault)}`);
    const after = await jsonExport();
    const retainedStages = [...document.querySelectorAll('#canvas-grid .stage')].map(stage => stage.innerHTML);
    expect(JSON.stringify(retainedStages) === JSON.stringify(stages), 'Preview revision changed on failure');
    expect(get('#design-title').textContent === title, 'Title revision changed');
    expect(get('#summary-description').textContent?.match(/\d+ geometry\/content errors/)?.[0] === geometryErrors, 'Summary geometry/content errors changed');
    expect(JSON.stringify(after.source) === JSON.stringify(before.source) && textOf(after.source) === initialText, 'JSON source revision changed');
    expect(JSON.stringify(after.variants) === JSON.stringify(before.variants) && after.variants.every(v => textOf(v.design) === initialText), 'JSON variant revision changed');
    const alert = document.querySelector<HTMLElement>('#update-error');
    expect(alert?.getAttribute('role') === 'alert' && /not applied/i.test(alert.textContent ?? '') && /previous version/i.test(alert.textContent ?? '') && /edit.*try again/i.test(alert.textContent ?? '') && alert.textContent?.includes('injected second target'), 'Actionable retained-revision alert missing');
    const label = document.querySelector<HTMLElement>('#canvas-grid [data-retained="true"]');
    expect(label?.textContent === 'Previous version — not updated' && label.getClientRects().length && getComputedStyle(label).visibility === 'visible' && getComputedStyle(label).display !== 'none', 'Visible retained-version label missing');
    expect(errors.length === pageErrors, 'Page errors changed (distinct from summary geometry/content errors)');
    exported = undefined; filename = ''; get<HTMLButtonElement>('#canvas-grid .export-svg-btn').click();
    await until(() => exported !== undefined);
    assert(exported, 'SVG export missing');
    const svg = await exported!.text();
    const svgDocument = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const beforeSvg = new DOMParser().parseFromString(stages[0], 'text/html');
    expect(filename === `${fixture.id}-Original.svg`, `SVG filename revision changed: ${filename}`);
    expect(svgDocument.querySelector('[data-element-id="headline"]')?.textContent === beforeSvg.querySelector('[data-element-id="headline"]')?.textContent && !svg.includes(rejectedText), 'SVG headline revision changed');
    Object.assign(viewerObservation, { retained: { source: textOf(after.source), variants: after.variants.map(v => textOf(v.design)), filename, pageErrorsBefore: pageErrors, pageErrorsAfter: errors.length, problems: [...problems] } });
    input.value = recoveredText; get('#update-copy').click(); await settled();
    const recovered = await jsonExport();
    expect(textOf(recovered.source) === recoveredText && recovered.variants.every(v => textOf(v.design) === recoveredText), 'Valid edit did not recover JSON');
    expect([...document.querySelectorAll('#canvas-grid .stage')].every(stage => stage.textContent?.includes('Recovered')), 'Valid edit did not recover previews');
    expect(!document.querySelector('#canvas-grid [data-retained="true"]') && !document.querySelector('#update-error')?.textContent, 'Recovery retained stale alert/label');
    const recoveredSummary = get('#summary-description').textContent, recoveredStages = get('#canvas-grid').innerHTML;
    const modeFault = await inject(1, () => get('#mode-baseline').click());
    expect(modeFault.throws === 1 && modeFault.calls === 1, 'Mode fault did not fire exactly once');
    expect(get('#mode-selected').getAttribute('aria-pressed') === 'true' && get('#mode-baseline').getAttribute('aria-pressed') === 'false', 'Failed mode committed aria state');
    expect(get('#summary-description').textContent === recoveredSummary, 'Failed mode changed summary');
    expect([...document.querySelectorAll('#canvas-grid .stage')].map(stage => stage.innerHTML).join('') === [...new DOMParser().parseFromString(recoveredStages, 'text/html').querySelectorAll('.stage')].map(stage => stage.innerHTML).join(''), 'Failed mode changed previews');
    const fixtureFault = await inject(1, () => { select.value = FIXTURES[1].id; select.dispatchEvent(new Event('change', { bubbles: true })); }, true);
    expect(fixtureFault.throws === 1 && fixtureFault.calls === 1, 'Fixture fault did not fire exactly once');
    expect(select.value === fixture.id && get('#design-title').textContent === fixture.name, 'Failed fixture selection/title not rolled back (N3)');
    const retainedFixture = await jsonExport();
    expect(JSON.stringify(retainedFixture) === JSON.stringify(recovered), 'Failed fixture changed JSON revision');
    exported = undefined; filename = ''; get<HTMLButtonElement>('#canvas-grid .export-svg-btn').click();
    await until(() => exported !== undefined);
    assert(exported, 'Retained fixture SVG missing');
    const fixtureSvg = new DOMParser().parseFromString(await exported!.text(), 'image/svg+xml');
    expect(filename === `${fixture.id}-Original.svg` && fixtureSvg.querySelector('[data-element-id="headline"]')?.textContent?.includes('Recovered'), 'Failed fixture SVG filename/headline changed');
    Object.assign(viewerObservation, { modeFault, fixtureFault, allProblems: [...problems] });
  } finally {
    CanvasRenderingContext2D.prototype.measureText = originalMeasure;
    URL.createObjectURL = create;
    if (anchorClickDescriptor) Object.defineProperty(HTMLAnchorElement.prototype, 'click', anchorClickDescriptor);
    else delete (HTMLAnchorElement.prototype as Partial<HTMLAnchorElement>).click;
    select.value = fixture.id; select.dispatchEvent(new Event('change', { bubbles: true })); await settled();
    input.value = initialText; get('#update-copy').click(); await settled(); get('#mode-selected').click();
    assert(get('#mode-selected').getAttribute('aria-pressed') === 'true', 'M1 selected mode cleanup');
    assert(select.value === fixture.id && get('#design-title').textContent === fixture.name, 'Fixture cleanup');
  }
  assert(!problems.length, problems.join('; '));
});
checks[checks.length - 1].detail = [checks[checks.length - 1].detail, JSON.stringify(viewerObservation)].filter(Boolean).join('\n');
await pause();
const exportObservation: Record<string, unknown> = {};
await check('Ordinary SVG exports preserve committed artwork without preview diagnostics', async () => {
  const select = get<HTMLSelectElement>('#fixture'), headline = get<HTMLTextAreaElement>('#headline'), toggle = get<HTMLInputElement>('#show-issues');
  const initial = { fixture: select.value, headline: headline.value, overlay: toggle.checked, mode: get('#mode-selected').getAttribute('aria-pressed') === 'true' ? 'selected' : 'baseline' };
  const create = URL.createObjectURL, click = HTMLAnchorElement.prototype.click;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'click');
  let blob: Blob | undefined, filename = '';
  const problems: string[] = [];
  const evidence: Record<string, unknown>[] = [];
  const setOverlay = (value: boolean) => { toggle.checked = value; toggle.dispatchEvent(new Event('change')); };
  const setCopy = async (value: string) => { headline.value = value; get('#update-copy').click(); await settled(); };
  const normalize = (svg: string) => {
    const xml = new DOMParser().parseFromString(svg, 'image/svg+xml');
    assert(!xml.querySelector('parsererror') && xml.documentElement.namespaceURI === 'http://www.w3.org/2000/svg', 'Actual export SVG XML/namespace invalid');
    const ids = new Map<string, string>();
    xml.querySelectorAll('clipPath[id]').forEach((node, i) => { const id = node.id; if (/^design-\d+-(?:clip|image)-\d+$/.test(id)) ids.set(id, `generated-clip-${i}`); });
    xml.querySelectorAll('*').forEach(node => { for (const attr of [...node.attributes]) {
      if (attr.name === 'id' && ids.has(attr.value)) attr.value = ids.get(attr.value)!;
      else for (const [id, replacement] of ids) if (attr.value === `url(#${id})`) attr.value = `url(#${replacement})`;
    } });
    return new XMLSerializer().serializeToString(xml);
  };
  const capture = async (button: HTMLElement, expected: string, svg = true) => {
    blob = undefined; filename = '';
    const before = get('#canvas-grid').innerHTML;
    button.click();
    await until(() => blob !== undefined);
    assert(blob && filename === expected, `Healthy actual Blob/filename failed: ${filename || '(empty)'} expected ${expected}`);
    assert(before === get('#canvas-grid').innerHTML, 'Export mutated actual preview');
    const text = await blob!.text();
    if (svg) { assert(blob!.type === 'image/svg+xml', 'SVG MIME'); normalize(text); }
    evidence.push({ filename, bytes: blob!.size, type: blob!.type, previewUnchanged: true });
    return text;
  };
  const original = () => get('.original-card .export-svg-btn');
  const variant = (label: string) => get(`.export-svg-btn[data-format="${label}"]`);
  const json = async () => JSON.parse(await capture(get('#export'), `${select.value}-reflow.json`, false)) as { source: Design; variants: { target: typeof TARGETS[number]; design: Design }[] };
  const artwork = (actual: string) => {
    const xml = new DOMParser().parseFromString(actual, 'image/svg+xml');
    const fonts = xml.querySelector('svg > defs > style');
    assert(fonts && /^(?:@font-face\{[^{}]+\}\s*)+$/.test(fonts.textContent ?? ''), 'Export font definitions absent or contain non-font rules');
    assert(fonts!.parentElement!.children.length === 1, 'Unexpected artwork in export font defs');
    fonts!.parentElement!.remove();
    return new XMLSerializer().serializeToString(xml);
  };
  const equal = (actual: string, design: Design, label: string) => { if (normalize(artwork(actual)) !== normalize(window.reflowLab.render(design))) problems.push(`${label}: ordinary artwork differs from committed design`); };
  try {
    URL.createObjectURL = value => { if (value instanceof Blob) blob = value; return create(value); };
    HTMLAnchorElement.prototype.click = function() {
      if (!this.download) return click.call(this);
      filename = this.download;
      const prevent = (event: MouseEvent) => event.preventDefault(); this.addEventListener('click', prevent);
      try { click.call(this); } finally { this.removeEventListener('click', prevent); }
    };
    select.value = window.reflowLab.fixtures.find(f => f.id === 'grouped-details')!.id; select.dispatchEvent(new Event('change', { bubbles: true })); await settled();
    get('#mode-selected').click(); setOverlay(false);
    const healthy = await json();
    equal(await capture(original(), `${healthy.source.id}-Original.svg`), healthy.source, 'healthy Original');
    const square = healthy.variants.find(v => v.target.label === 'Square')!; assert(square, 'Real Square result missing');
    equal(await capture(variant('Square'), `${healthy.source.id}-Square.svg`), square.design, 'healthy selected');
    get('#mode-baseline').click();
    equal(await capture(variant('Square'), `${healthy.source.id}-Square.svg`), window.reflowLab.run(healthy.source, square.target).baseline.design, 'healthy baseline');
    assert(!problems.length, `HARNESS/HEALTHY BASELINE FAILURE: ${problems.join('; ')}`);
    exportObservation.healthyActualCapture = true;
    get('#mode-selected').click(); await setCopy('A very long headline '.repeat(20));
    const committed = await json();
    const off = await capture(original(), `${committed.source.id}-Original.svg`);
    equal(off, committed.source, 'affected OFF Original');
    setOverlay(true);
    const outlines = document.querySelectorAll('.original-card svg > rect[fill="none"][stroke-dasharray="12 8"]').length;
    assert(outlines > 0, 'Meaningful generated diagnostic overlay absent; oracle unproven');
    exportObservation.generatedOutlines = outlines;
    const on = await capture(original(), `${committed.source.id}-Original.svg`);
    const parsed = new DOMParser().parseFromString(on, 'image/svg+xml');
    const exportedOutlines = parsed.querySelectorAll('svg > rect[fill="none"][stroke-dasharray="12 8"]').length;
    exportObservation.exportedGeneratedOutlines = exportedOutlines;
    if (exportedOutlines) problems.push(`Generated preview diagnostics leaked into actual SVG: ${exportedOutlines}`);
    if (normalize(on) !== normalize(off)) problems.push('Overlay toggle changed ordinary downloaded artwork');
    equal(on, committed.source, 'affected ON Original');
    const selected = committed.variants.find(v => v.target.id === square.target.id)!;
    equal(await capture(variant('Square'), `${committed.source.id}-Square.svg`), selected.design, 'affected selected');
    get('#mode-baseline').click();
    equal(await capture(variant('Square'), `${committed.source.id}-Square.svg`), window.reflowLab.run(committed.source, square.target).baseline.design, 'affected baseline');
    get('#mode-selected').click(); setOverlay(false);
    const literal = '<rect stroke-dasharray="12 8" stroke="#e34850">'; await setCopy(literal);
    const literalDesign = await json();
    const literalSvg = await capture(original(), `${literalDesign.source.id}-Original.svg`);
    equal(literalSvg, literalDesign.source, 'literal diagnostic-like TEXT and genuine rect/image/text/resources');
    const literalXml = new DOMParser().parseFromString(literalSvg, 'image/svg+xml');
    const expectedLiteral = new DOMParser().parseFromString(window.reflowLab.render(literalDesign.source), 'image/svg+xml');
    assert(literalXml.querySelector('[data-element-id="headline"]')?.textContent === expectedLiteral.querySelector('[data-element-id="headline"]')?.textContent && literalXml.querySelector('[data-element-id="headline"]')?.textContent?.includes('<rect'), 'Literal diagnostic-like TEXT lost or converted to artwork');
    for (const design of [literalDesign.source, selected.design]) assert(design.elements.some(e => e.type === 'image') && design.elements.some(e => e.type === 'rect') && design.elements.some(e => e.type === 'text'), 'Real artwork controls absent');
    for (const field of ['data-source-id', 'data-target-id']) {
      const button = variant('Square'), previous = button.getAttribute(field);
      const preview = [...document.querySelectorAll('#canvas-grid .stage svg')].map(svg => svg.outerHTML).join('');
      try {
        button.setAttribute(field, 'missing-committed-identity'); blob = undefined; filename = ''; button.click();
        if (blob || filename) problems.push(`${field}: invalid committed lookup downloaded/fell back`);
        const alert = button.closest('.design-card')?.querySelector('[data-export-error][role="alert"]');
        if (!alert?.textContent?.trim()) problems.push(`${field}: no visible per-card export failure`);
        assert(preview === [...document.querySelectorAll('#canvas-grid .stage svg')].map(svg => svg.outerHTML).join(''), 'Invalid export mutated preview artwork');
        assert(!document.querySelector('#update-error,[data-retained]'), 'Export reused update/retained feedback');
      } finally { if (previous === null) button.removeAttribute(field); else button.setAttribute(field, previous); }
    }
    exportObservation.controls = evidence;
    exportObservation.literalTextOnly = true;
    assert(!problems.length, problems.join('; '));
  } finally {
    URL.createObjectURL = create;
    if (descriptor) Object.defineProperty(HTMLAnchorElement.prototype, 'click', descriptor);
    else delete (HTMLAnchorElement.prototype as Partial<HTMLAnchorElement>).click;
    select.value = initial.fixture; select.dispatchEvent(new Event('change', { bubbles: true })); await settled();
    await setCopy(initial.headline); get(`#mode-${initial.mode}`).click(); setOverlay(initial.overlay);
  }
});
checks[checks.length - 1].detail = [checks[checks.length - 1].detail, JSON.stringify(exportObservation)].filter(Boolean).join('\n');
await check('No startup errors, uncaught exceptions, or error overlay', () => {
  assert(errors.length === 0, errors.join('\n')); assert(!document.querySelector('vite-error-overlay'), 'Vite error overlay');
});
const report = { generatedAt: new Date().toISOString(), browser: navigator.userAgent, passed: checks.filter(c => c.passed).length, total: checks.length, checks, errors, inkFindings, lineBreakFindings, fontParityDeltas, fontParitySummary, cropFindings, renderedFindings, renderedDeltas };
get('#browser-verification').textContent = JSON.stringify(report, null, 2);
get('#browser-verification').dataset.status = checks.every(c => c.passed) ? 'passed' : 'failed';
console.error = originalError;
export {};
