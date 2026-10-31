import '@spectrum-web-components/theme/sp-theme.js';
import '@spectrum-web-components/theme/express/theme-light.js';
import '@spectrum-web-components/theme/express/theme-dark.js';
import '@spectrum-web-components/theme/express/scale-medium.js';
import '@spectrum-web-components/button/sp-button.js';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/source-serif-4/600.css';
import './style.css';
import { FIXTURES } from './fixtures';
import { TARGETS, validateDesign, type Design, type Result, type Target } from './model';
import { browserMeasure } from './typography';
import { reflow } from './engine';
import { describeFailure, reflowMany, reflowTargets, type TargetOutcome, type TargetFailure } from './reflow-targets';
import { evaluate } from './evaluate';
import { renderSvg, escapeHtml as esc } from './render';
import { exportSvg, browserExportFonts, loadBrowserExportFont } from './svg-export';
import { LayoutCache, LayoutRequests, LayoutCancelled } from './layout-request';
import type { LayoutInput, LayoutOutput } from './layout-worker';

type DesignCard = { kind: 'design'; label: string; subtitle: string; design: Design; metrics: ReturnType<typeof evaluate>; strategy: string; source: boolean; targetId: string };
type FailureCard = { kind: 'failure'; label: string; subtitle: string; failure: TargetFailure['error'] };
type Card = DesignCard | FailureCard;

const app = document.querySelector<HTMLDivElement>('#app')!;
const measure = browserMeasure();
const layoutCache = new LayoutCache<LayoutOutput>();
const requests = new LayoutRequests<LayoutInput, LayoutOutput>(() => new Worker(new URL('./layout-worker.ts', import.meta.url), { type: 'module' }));
let requestRevision = 0;
let displayedCards: DesignCard[] = [];
let inspectedTarget: string | undefined;
let inspectionMode: 'selected' | 'baseline' = 'selected';
let inspectionOverlay = false;
let inspectionReturnTarget: string | undefined;
let retryRequest: { source: Design; custom: Target | undefined; mode: 'selected' | 'baseline' } | undefined;
let fontRevision = 0, displayedFontRevision = -1, inspectionFontRevision = -1;
document.fonts.addEventListener('loadingdone', () => { fontRevision++; layoutCache.clear(); });
let source = structuredClone(FIXTURES[0]);
let results: Result[] = [], failures: TargetFailure[] = [], custom: Target | undefined, overlay = false, mode: 'selected' | 'baseline' = 'selected';
const strategyLabel: Record<string, string> = { identity: 'Original proportions', uniform: 'Uniform scaling', stack: 'Vertical arrangement', split: 'Image + text split', 'group-grid-1': 'Product groups · 1 column', 'group-grid-2': 'Product groups · 2 columns', 'group-grid-3': 'Product groups · 3 columns', 'group-grid-4': 'Product groups · 4 columns' };

const inspectIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 3H3v4m10-4h4v4M3 13v4h4m10-4v4h-4M3 3l5 5m9-5-5 5M3 17l5-5m9 5-5-5"/></svg>';
const downloadIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2v10m-4-4 4 4 4-4M3 13v4h14v-4"/></svg>';
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let themePreference: 'light' | 'dark' | undefined;
try {
  const saved = localStorage.getItem('reflow-theme');
  if (saved === 'light' || saved === 'dark') themePreference = saved;
} catch { /* Storage may be unavailable; the workspace still follows the system. */ }
const initialTheme = themePreference ?? (systemTheme.matches ? 'dark' : 'light');
document.documentElement.dataset.theme = initialTheme;

app.innerHTML = `<sp-theme system="express" color="${initialTheme}" scale="medium" id="spectrum-theme">
  <a class="skip-link" href="#previews">Skip to previews</a><header class="topbar"><a class="wordmark" href="/" aria-label="Reflow Studio home"><svg class="brand-symbol" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h11v16H3zM18 4h3v7h-3zM18 15h3v5h-3z" fill="none" stroke="currentColor" stroke-width="2"/></svg>Reflow Studio</a><div class="topbar-right"><span class="prototype-badge">Layout workbench</span><button class="theme-toggle" id="theme-toggle" aria-label="${initialTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M10 3a7 7 0 0 1 0 14Z"/></svg></button></div></header>
  <div class="workspace">
    <aside class="sidebar" aria-label="Design controls">
      <div class="sidebar-title"><h1>Design settings</h1><p>Edit copy. Review each format.</p><button id="settings-toggle" class="settings-toggle" aria-expanded="false" aria-controls="design-controls">Design settings<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5"/></svg></button></div><div id="design-controls" class="design-controls">
      <section class="control-section"><label class="section-label" for="fixture">Source design</label><select id="fixture">${FIXTURES.map((f, i) => `<option value="${f.id}">${String(i + 1).padStart(2, '0')} · ${esc(f.name)}</option>`).join('')}</select><p class="helper" id="fixture-description"></p><span class="sample-note">Synthetic sample · editable</span></section>
      <section class="control-section"><label class="section-label" for="headline">Headline</label><textarea id="headline" aria-describedby="copy-help copy-status" rows="3" maxlength="500" spellcheck="false"></textarea><p class="helper" id="copy-help">Edits apply to every format. Switching designs or reloading resets them. <span class="shortcut-hint">Ctrl / ⌘ + Enter to apply.</span></p><p class="helper" id="copy-status" role="status"></p><sp-button id="update-copy" title="Apply headline (Ctrl or ⌘ + Enter)" aria-keyshortcuts="Control+Enter Meta+Enter" variant="secondary" size="s">Update headline</sp-button><button id="discard-copy" class="text-action" type="button" hidden>Discard changes</button></section>
      <section class="control-section"><h2 class="section-label">Output formats</h2><div class="format-list"><span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="1"/></svg>Square <b>1:1</b></span><span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="1"/></svg>Story <b>9:16</b></span><span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="10" rx="1"/></svg>Landscape <b>16:9</b></span></div><details class="custom-size"><summary>Try a custom size</summary><div class="dimension-fields"><label for="custom-width">Width<input id="custom-width" aria-describedby="size-error" type="number" min="1" max="8000" value="1600"></label><span>×</span><label for="custom-height">Height<input id="custom-height" aria-describedby="size-error" type="number" min="1" max="8000" value="600"></label></div><sp-button id="custom-apply" size="s" variant="secondary">Add custom format</sp-button><button id="custom-remove" class="text-action" type="button" hidden>Remove custom format</button><p id="size-error" class="error-message" role="alert"></p></details></section>
      <div class="sidebar-bottom"><sp-button id="export" variant="accent">Export editable JSON</sp-button><p class="helper">Exports the editable workbench document.</p></div>
      </div>
    </aside>
    <main id="previews" tabindex="-1">
      <section class="workspace-heading"><div><span class="eyebrow">Artwork / Format review</span><h2 id="design-title"></h2></div><div class="view-controls"><div class="segmented" aria-label="Comparison mode"><button id="mode-selected" aria-pressed="true">Reflow</button><button id="mode-baseline" aria-pressed="false">Baseline</button></div><label class="overlay-toggle"><input id="show-issues" type="checkbox"> Show issues</label></div></section>
      <div id="request-controls"><p id="request-status" role="status"></p><button id="cancel-layout" hidden>Cancel update</button><button id="retry-layout" hidden>Retry update</button><button id="revert-layout" hidden>Revert edits</button></div><div class="canvas-grid" id="canvas-grid" aria-live="polite"></div>
      <section class="run-summary" aria-label="Current result summary"><div><strong id="summary-head"></strong><p id="summary-description"></p></div><span class="runtime" id="runtime"></span></section>
      <section class="lab-section"><div class="lab-heading"><div><h2>Layout checks</h2><p>Check all 10 sample designs across three formats. Findings stay visible for review.</p></div><sp-button id="run-benchmark" variant="secondary">Run all 30 cases</sp-button></div><div class="lab-status" id="lab-status" role="status">Ready to compare 10 synthetic designs × 3 formats.</div><div class="table-scroll"><table id="benchmark-table" hidden><thead><tr><th>Design / format</th><th>Chosen layout</th><th>Baseline errors</th><th>Reflow errors</th><th>Warnings</th><th>Time</th></tr></thead><tbody></tbody></table></div></section>
      <footer class="workspace-note">Development workbench · TypeScript engine · Synthetic designs<br>The Stage 1 submission uses the separately qualified Python engine. These checks are not aesthetic ratings.</footer>
    </main>
  </div>
  <dialog id="inspect-dialog" class="inspect-dialog" aria-labelledby="inspect-title" aria-describedby="inspect-description">
    <header class="inspect-toolbar"><div class="inspect-heading"><h2 id="inspect-title"></h2><p id="inspect-description"></p></div><nav class="inspect-navigation" aria-label="Preview formats"><button id="inspect-previous" aria-label="Previous format">← Previous</button><button id="inspect-next" aria-label="Next format">Next →</button></nav><div class="segmented inspect-comparison" role="group" aria-label="Preview comparison"><button id="inspect-selected" aria-pressed="true">Reflow</button><button id="inspect-baseline" aria-pressed="false">Baseline</button></div><label class="inspect-zoom" for="inspect-zoom">Zoom<select id="inspect-zoom"><option value="fit">Fit</option><option value="1">100%</option><option value="2">200%</option></select></label><button class="inspect-close" id="inspect-close" aria-label="Close preview" autofocus>Close</button></header>
    <div id="inspect-viewport" class="inspect-viewport" tabindex="0" aria-label="Artwork preview; scroll to inspect at actual size" aria-describedby="inspect-shortcuts"><div id="inspect-art" class="inspect-art"></div></div>
    <footer class="inspect-status"><span id="inspect-findings" role="status" class="issue-pill"></span><label class="overlay-toggle"><input id="inspect-issues" type="checkbox"> Show issues</label><span id="inspect-shortcuts" class="inspect-shortcuts">Page Up/Down: formats · 0: Fit · 1/2: zoom</span></footer>
  </dialog>
</sp-theme>`;


const settingsToggle = document.querySelector<HTMLButtonElement>('#settings-toggle')!;
settingsToggle.addEventListener('click', () => {
  const expanded = settingsToggle.getAttribute('aria-expanded') !== 'true';
  settingsToggle.setAttribute('aria-expanded', String(expanded));
  document.querySelector('#design-controls')!.classList.toggle('is-open', expanded);
});

const inspector = document.querySelector<HTMLDialogElement>('#inspect-dialog')!;
function inspectionCard(targetId: string | undefined) {
  const card = displayedCards.find(card => card.targetId === targetId);
  if (!card || card.source) return card;
  const variant = results.find(result => result.target.id === targetId)?.[inspectionMode];
  return variant ? { ...card, design: variant.design, metrics: variant.metrics, strategy: strategyLabel[variant.strategy] } : undefined;
}
function sizeInspection() {
  if (!inspector.open) return;
  const card = inspectionCard(inspectedTarget);
  const svg = inspector.querySelector<SVGSVGElement>('#inspect-art svg');
  if (!card || !svg) return;
  const viewport = document.querySelector<HTMLElement>('#inspect-viewport')!;
  const zoom = (document.querySelector('#inspect-zoom') as HTMLSelectElement).value;
  const scale = zoom === 'fit'
    ? Math.max(0.001, Math.min(1, (viewport.clientWidth - 48) / card.design.width, (viewport.clientHeight - 48) / card.design.height))
    : Number(zoom);
  svg.style.width = `${card.design.width * scale}px`;
  svg.style.height = `${card.design.height * scale}px`;
  viewport.classList.toggle('can-pan', zoom !== 'fit' && (viewport.scrollWidth > viewport.clientWidth || viewport.scrollHeight > viewport.clientHeight));
}
function inspectCard(targetId: string) {
  if (!inspector.open) { inspectionMode = mode; inspectionOverlay = overlay; }
  const card = inspectionCard(targetId);
  if (!card) return;
  if (!inspector.open) inspectionReturnTarget = targetId;
  for (const variant of ['selected', 'baseline'] as const) {
    const button = document.querySelector<HTMLButtonElement>(`#inspect-${variant}`)!;
    button.disabled = card.source;
    button.setAttribute('aria-pressed', String(variant === inspectionMode));
  }
  inspectedTarget = targetId;
  const index = displayedCards.findIndex(item => item.targetId === targetId);
  (document.querySelector('#inspect-previous') as HTMLButtonElement).disabled = index === 0;
  (document.querySelector('#inspect-next') as HTMLButtonElement).disabled = index === displayedCards.length - 1;
  document.querySelector('#inspect-title')!.textContent = `${card.label} · ${card.source ? 'Source' : inspectionMode === 'baseline' ? 'Baseline' : 'Reflow'}`;
  document.querySelector('#inspect-description')!.textContent = `${index + 1} of ${displayedCards.length} · ${card.subtitle} px · ${card.strategy}`;
  document.querySelector('#inspect-art')!.innerHTML = renderSvg(card.design, measure, inspectionOverlay ? card.metrics : undefined);
  const issues = card.metrics.errors + card.metrics.warnings;
  const findings = document.querySelector<HTMLElement>('#inspect-findings')!;
  findings.textContent = issues ? `${issues} ${issues === 1 ? 'issue' : 'issues'}` : 'Checks clear';
  findings.className = `issue-pill ${card.metrics.errors ? 'has-errors' : issues ? 'has-warnings' : ''}`;
  document.querySelector<HTMLInputElement>('#inspect-issues')!.checked = inspectionOverlay;
  inspectionFontRevision = fontRevision;
  if (!inspector.open) {
    (document.querySelector('#inspect-zoom') as HTMLSelectElement).value = 'fit';
    inspector.showModal();
  }
  sizeInspection();
  document.querySelector('#inspect-viewport')!.scrollTo(0, 0);
}
for (const [id, offset] of [['inspect-previous', -1], ['inspect-next', 1]] as const) {
  document.getElementById(id)!.addEventListener('click', () => {
    const index = displayedCards.findIndex(card => card.targetId === inspectedTarget);
    const card = displayedCards[index + offset];
    if (index >= 0 && card) inspectCard(card.targetId);
  });
}
for (const variant of ['selected', 'baseline'] as const) {
  document.querySelector(`#inspect-${variant}`)!.addEventListener('click', () => {
    if (!inspectedTarget || (inspectionMode === variant && inspectionFontRevision === fontRevision)) return;
    inspectionMode = variant;
    const viewport = document.querySelector('#inspect-viewport')!;
    const { scrollLeft, scrollTop } = viewport;
    inspectCard(inspectedTarget);
    viewport.scrollTo(scrollLeft, scrollTop);
  });
}
document.querySelector('#inspect-viewport')!.addEventListener('keydown', event => {
  const key = event as KeyboardEvent;
  if (event.target !== event.currentTarget || key.metaKey || key.ctrlKey || key.altKey) return;
  const index = displayedCards.findIndex(card => card.targetId === inspectedTarget);
  const destination = key.key === 'Home' ? 0 : key.key === 'End' ? displayedCards.length - 1
    : key.key === 'PageUp' ? index - 1 : key.key === 'PageDown' ? index + 1 : undefined;
  if (destination !== undefined) {
    key.preventDefault();
    const card = displayedCards[destination];
    if (card && destination !== index) inspectCard(card.targetId);
  } else if (['0', '1', '2'].includes(key.key)) {
    key.preventDefault();
    const zoom = document.querySelector<HTMLSelectElement>('#inspect-zoom')!;
    zoom.value = key.key === '0' ? 'fit' : key.key;
    zoom.dispatchEvent(new Event('change'));
  }
});
document.querySelector('#inspect-issues')!.addEventListener('change', event => {
  if (!inspectedTarget) return;
  inspectionOverlay = (event.target as HTMLInputElement).checked;
  const viewport = document.querySelector('#inspect-viewport')!;
  const { scrollLeft, scrollTop } = viewport;
  inspectCard(inspectedTarget); viewport.scrollTo(scrollLeft, scrollTop);
});
document.querySelector('#inspect-close')!.addEventListener('click', () => inspector.close());
inspector.addEventListener('close', () => {
  // Resolve the current trigger because a completed worker request may replace the grid.
  const trigger = [...document.querySelectorAll<HTMLButtonElement>('.inspect-button')].find(button => button.dataset.targetId === inspectionReturnTarget);
  trigger?.focus();
  document.querySelector('#inspect-art')!.replaceChildren();
  inspectedTarget = undefined;
  inspectionReturnTarget = undefined;
});
document.querySelector('#inspect-zoom')!.addEventListener('change', () => {
  const viewport = document.querySelector<HTMLElement>('#inspect-viewport')!;
  const svg = document.querySelector<SVGSVGElement>('#inspect-art svg');
  if (!svg) return;
  const view = viewport.getBoundingClientRect(), before = svg.getBoundingClientRect();
  const centerX = Math.max(0, Math.min(1, (view.left + viewport.clientWidth / 2 - before.left) / before.width));
  const centerY = Math.max(0, Math.min(1, (view.top + viewport.clientHeight / 2 - before.top) / before.height));
  sizeInspection();
  if ((document.querySelector('#inspect-zoom') as HTMLSelectElement).value === 'fit') viewport.scrollTo(0, 0);
  else {
    const after = svg.getBoundingClientRect();
    viewport.scrollBy(after.left + centerX * after.width - view.left - viewport.clientWidth / 2,
      after.top + centerY * after.height - view.top - viewport.clientHeight / 2);
  }
});
new ResizeObserver(sizeInspection).observe(document.querySelector('#inspect-viewport')!);
const panViewport = document.querySelector<HTMLElement>('#inspect-viewport')!;
let pan: { id: number; x: number; y: number; left: number; top: number } | undefined;
function endPan() {
  const id = pan?.id; pan = undefined; panViewport.classList.remove('is-panning');
  if (id !== undefined && panViewport.hasPointerCapture(id)) panViewport.releasePointerCapture(id);
}
panViewport.addEventListener('pointerdown', event => {
  // Touch keeps native scrolling/zoom behavior. Capture only primary mouse panning.
  if (event.pointerType !== 'mouse' || event.button !== 0 || !event.isPrimary || !panViewport.classList.contains('can-pan')) return;
  event.preventDefault(); panViewport.focus({ preventScroll: true });
  pan = { id: event.pointerId, x: event.clientX, y: event.clientY, left: panViewport.scrollLeft, top: panViewport.scrollTop };
  panViewport.setPointerCapture(event.pointerId); panViewport.classList.add('is-panning');
});
panViewport.addEventListener('pointermove', event => {
  if (pan?.id !== event.pointerId) return;
  panViewport.scrollTo(pan.left + pan.x - event.clientX, pan.top + pan.y - event.clientY);
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) panViewport.addEventListener(event, endPan);
inspector.addEventListener('close', endPan);


function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function download(filename: string, value: unknown) {
  downloadFile(filename, JSON.stringify(value, null, 2), 'application/json');
}
function redraw(next = { source, custom, mode }, prepared?: LayoutOutput) {
  const grid = document.querySelector('#canvas-grid')!;
  try {
    const scrollPosition = next.source === source ? { left: scrollX, top: scrollY } : undefined;
    const sameView = next.source === source && next.mode === mode;
    const openFindings = next.source === source
      ? new Set([...grid.querySelectorAll<HTMLDetailsElement>('.findings[open]')].map(node => node.dataset.targetId))
      : new Set<string>();
    const selectedFindings = sameView
      ? new Map([...grid.querySelectorAll<HTMLButtonElement>('.finding-select[aria-pressed="true"]')]
        .map(button => [button.closest<HTMLDetailsElement>('.findings')!.dataset.targetId, button.dataset.findingIndex]))
      : new Map<string | undefined, string | undefined>();
    const targets = next.custom ? [...TARGETS, next.custom] : TARGETS;
    const { batch, originalMetrics } = layoutCache.compute(next.source, targets, fontRevision, () => prepared ?? ({
      batch: reflowMany(next.source, targets, measure),
      originalMetrics: evaluate(next.source, next.source, measure),
    }));
    const cards: Card[] = [
      { kind: 'design', label: 'Original', subtitle: `${next.source.width} × ${next.source.height}`, design: next.source, metrics: originalMetrics, strategy: 'Source design', source: true, targetId: 'source' },
      ...batch.outcomes.map((outcome): Card => outcome.result
        ? { kind: 'design', label: outcome.target.label, subtitle: `${outcome.target.width} × ${outcome.target.height}`, design: outcome.result[next.mode].design, metrics: outcome.result[next.mode].metrics, strategy: strategyLabel[outcome.result[next.mode].strategy], source: false, targetId: outcome.target.id }
        : { kind: 'failure', label: outcome.target.label, subtitle: `${outcome.target.width} × ${outcome.target.height}`, failure: outcome.error! }),
    ];
    const markup = cards.map(card => {
      if (card.kind === 'failure') return `<article class="design-card failed-card" role="alert"><div class="card-heading"><div class="card-title"><h3>${esc(card.label)}</h3><span>${esc(card.subtitle)} px</span></div></div><div class="stage"><p class="error-message">No valid layout: ${esc(card.failure.code)}. ${esc(card.failure.message)}</p></div></article>`;
      const issues = card.metrics.errors + card.metrics.warnings;
      return `<article class="design-card ${card.source ? 'original-card' : ''}"><div class="card-heading"><div class="card-title"><h3>${esc(card.label)}</h3><span>${esc(card.subtitle)} px</span></div><button class="inspect-button" data-target-id="${esc(card.targetId)}" aria-label="Inspect ${esc(card.label)}">${inspectIcon}<span>Inspect</span></button></div><div class="stage" data-design="${esc(next.source.id)}" data-format="${esc(card.label)}">${renderSvg(card.design, measure, overlay ? card.metrics : undefined)}</div><div class="card-footer"><span>${esc(card.strategy)}</span><span class="issue-pill ${card.metrics.errors ? 'has-errors' : issues ? 'has-warnings' : ''}">${issues ? `${issues} ${issues === 1 ? 'issue' : 'issues'}` : 'Checks clear'}</span><button class="export-svg-btn" data-source-id="${esc(next.source.id)}" data-target-id="${esc(card.targetId)}" data-format="${esc(card.label)}" aria-label="Export ${esc(card.label)} as SVG">${downloadIcon}<span>Export SVG</span></button></div><details class="findings" data-target-id="${esc(card.targetId)}" ${openFindings.has(card.targetId) ? 'open' : ''}><summary>${issues ? 'Inspect findings' : 'View checks'}</summary><ul>${card.metrics.findings.length ? card.metrics.findings.map((f, index) => `<li><span class="finding-severity ${f.severity}">${f.severity}</span>${f.elementIds.length ? `<button type="button" class="finding-select" data-finding-index="${index}" data-element-ids="${esc(JSON.stringify(f.elementIds))}" aria-pressed="${selectedFindings.get(card.targetId) === String(index)}">${esc(f.message)}</button>` : esc(f.message)}</li>`).join('') : '<li>No issues detected by the current geometric and typography checks. Visual quality still needs review.</li>'}</ul></details></article>`;
    }).join('');
    const errors = batch.results.reduce((sum, r) => sum + r[next.mode].metrics.errors, 0);
    const warnings = batch.results.reduce((sum, r) => sum + r[next.mode].metrics.warnings, 0);
    const summaryHead = `${next.source.elements.length} source elements retained in each variant`;
    const summaryDescription = `${errors} geometry/content errors · ${warnings} warnings${batch.failures.length ? ` · ${batch.failures.length} target${batch.failures.length === 1 ? '' : 's'} failed: ${batch.failures.map(f => f.target.label).join(', ')}` : ''}. ${next.mode === 'selected' ? 'Compare the selected layouts with uniform scaling.' : 'Uniform scaling is the comparison baseline.'}`;
    const runtime = `${batch.results.reduce((sum, r) => sum + r.elapsedMs, 0).toFixed(0)} ms · layout + checks`;
    ({ source, custom, mode } = next);
    ({ results, failures } = batch);
    const removeCustom = document.querySelector<HTMLButtonElement>('#custom-remove')!;
    if (!custom && document.activeElement === removeCustom) document.querySelector<HTMLElement>('#custom-apply')!.focus();
    removeCustom.hidden = !custom;
    document.querySelector('#custom-apply')!.textContent = custom ? 'Update custom format' : 'Add custom format';
    document.querySelector('#design-title')!.textContent = source.name;
    document.querySelector('#fixture-description')!.textContent = source.description;
    if (inspector.open) inspector.close();
    displayedCards = cards.filter((card): card is DesignCard => card.kind === 'design');
    grid.innerHTML = markup;
    for (const card of grid.querySelectorAll<HTMLElement>('.design-card')) {
      const selected = card.querySelector<HTMLButtonElement>('.finding-select[aria-pressed="true"]');
      if (selected) highlightFinding(card, selected);
    }
    document.querySelector('#summary-head')!.textContent = summaryHead;
    document.querySelector('#summary-description')!.textContent = summaryDescription;
    document.querySelector('#runtime')!.textContent = runtime;
    document.querySelector('#mode-selected')!.setAttribute('aria-pressed', String(mode === 'selected'));
    document.querySelector('#mode-baseline')!.setAttribute('aria-pressed', String(mode === 'baseline'));
    document.querySelector('#update-error')?.remove();
    displayedFontRevision = fontRevision;
    if (scrollPosition) window.scrollTo(scrollPosition);
    return true;
  } catch (error) {
    showUpdateError(error);
    return false;
  }
}
function highlightFinding(card: HTMLElement, button: HTMLButtonElement) {
  const ids = new Set(JSON.parse(button.dataset.elementIds!) as string[]);
  for (const element of card.querySelectorAll<SVGGElement>('[data-element-id]')) {
    element.classList.toggle('finding-selected', ids.has(element.dataset.elementId!));
  }
}
function showUpdateError(error: unknown) {
  const grid = document.querySelector('#canvas-grid')!;
    let alert = document.querySelector<HTMLElement>('#update-error');
    if (!alert) {
      alert = document.createElement('p'); alert.id = 'update-error'; alert.className = 'error-message'; alert.setAttribute('role', 'alert');
      grid.before(alert);
    }
    alert.textContent = `Update not applied: ${error instanceof Error ? error.message : String(error)}. The previous version is still shown and exported. Edit the copy or settings to try again.`;
    if (!grid.querySelector('[data-retained]')) {
      const label = document.createElement('p'); label.className = 'small-tag'; label.dataset.retained = 'true'; label.textContent = 'Previous version — not updated';
      grid.prepend(label);
    }
}

function updateDraftStatus() {
  const headline = source.elements.find(e => e.id === 'headline');
  const committed = headline?.type === 'text' ? headline.text : '';
  const draft = (document.querySelector('#headline') as HTMLTextAreaElement).value;
  document.querySelector<HTMLButtonElement>('#discard-copy')!.hidden = draft === committed;
  document.querySelector('#copy-status')!.textContent = draft === committed ? '' : 'Unapplied changes · previews and exports show the last applied copy.';
}
document.querySelector('#headline')!.addEventListener('input', updateDraftStatus);
function resetHeadline() {
  const headline = source.elements.find(e => e.id === 'headline');
  (document.querySelector('#headline') as HTMLTextAreaElement).value = headline?.type === 'text' ? headline.text : '';
  updateDraftStatus();
}
function requestControls(pending: boolean, message: string) {
  document.querySelector('#request-status')!.textContent = message;
  document.querySelector<HTMLElement>('#cancel-layout')!.hidden = !pending;
  document.querySelector<HTMLElement>('#retry-layout')!.hidden = pending || !retryRequest;
  document.querySelector<HTMLElement>('#revert-layout')!.hidden = pending || !retryRequest;
  document.querySelector('#canvas-grid')!.setAttribute('aria-busy', String(pending));
}
async function requestLayout(next: { source: Design; custom: Target | undefined; mode: 'selected' | 'baseline' }) {
  const switchesDesign = next.source.id !== source.id;
  const revision = ++requestRevision;
  retryRequest = structuredClone(next);
  requestControls(true, 'Updating layout… The previous version is still shown and exported.');
  const deadline = setTimeout(() => {
    if (revision !== requestRevision) return;
    requestRevision++; requests.cancel();
    showUpdateError(new Error('Layout update exceeded 10000 ms and was stopped'));
    requestControls(false, 'Update failed. The previous version is still shown and exported.');
    (document.querySelector('#fixture') as HTMLSelectElement).value = source.id;
  }, 10_000);
  try {
    const pending = requests.run({ source: next.source, targets: next.custom ? [...TARGETS, next.custom] : TARGETS, faces: browserExportFonts() }, stage => {
      if (revision === requestRevision) document.querySelector('#request-status')!.textContent = stage === 'computing' ? 'Calculating layouts… The previous version is still shown and exported.' : stage;
    });
    const prepared = await pending;
    await Promise.all(next.source.elements.filter(e => e.type === 'text').map(e => document.fonts.load(`${e.fontWeight} ${e.fontSize}px "${e.fontFamily}"`, e.text)));
    await document.fonts.ready;
    if (revision !== requestRevision) return;
    if (redraw({ ...next, mode }, prepared)) {
      retryRequest = undefined;
      if (switchesDesign) resetHeadline(); else updateDraftStatus();
      requestControls(false, 'Layout updated.');
    } else requestControls(false, 'Update failed. The previous version is still shown and exported.');
  } catch (error) {
    if (revision !== requestRevision) return;
    if (error instanceof LayoutCancelled) requestControls(false, 'Layout cancelled. The previous version is still shown and exported.');
    else { showUpdateError(error); requestControls(false, 'Update failed. The previous version is still shown and exported.'); }
  } finally {
    clearTimeout(deadline);
    if (revision === requestRevision) (document.querySelector('#fixture') as HTMLSelectElement).value = source.id;
  }
}
document.querySelector('#cancel-layout')!.addEventListener('click', () => {
  requestRevision++; requests.cancel();
  requestControls(false, 'Layout cancelled. The previous version is still shown and exported.');
  (document.querySelector('#fixture') as HTMLSelectElement).value = source.id;
});
document.querySelector('#retry-layout')!.addEventListener('click', () => { if (retryRequest) void requestLayout(retryRequest); });
function revertEdits() {
  requestRevision++; requests.cancel(); retryRequest = undefined; resetHeadline();
  (document.querySelector('#custom-width') as HTMLInputElement).value = String(custom?.width ?? 1600);
  (document.querySelector('#custom-height') as HTMLInputElement).value = String(custom?.height ?? 600);
  document.querySelector('#size-error')!.textContent = '';
  for (const id of ['#custom-width', '#custom-height']) document.querySelector(id)!.removeAttribute('aria-invalid');
  (document.querySelector('#fixture') as HTMLSelectElement).value = source.id;
  document.querySelector('#update-error')?.remove(); document.querySelector('[data-retained]')?.remove();
  requestControls(false, 'Edits reverted to the displayed version.');
}
document.querySelector('#revert-layout')!.addEventListener('click', revertEdits);
document.querySelector('#discard-copy')!.addEventListener('click', () => {
  revertEdits(); document.querySelector<HTMLElement>('#headline')!.focus();
});
document.querySelector('#fixture')!.addEventListener('change', event => {
  const select = event.target as HTMLSelectElement;
  void requestLayout({ source: structuredClone(FIXTURES.find(f => f.id === select.value)!), custom, mode });
});
document.querySelector('#update-copy')!.addEventListener('click', () => {
  const candidate = structuredClone(source);
  const headline = candidate.elements.find(e => e.id === 'headline');
  if (headline?.type === 'text') headline.text = (document.querySelector('#headline') as HTMLTextAreaElement).value;
  void requestLayout({ source: candidate, custom, mode });
});
document.querySelector('#headline')!.addEventListener('keydown', event => {
  const key = event as KeyboardEvent;
  if (key.key !== 'Enter' || !(key.metaKey || key.ctrlKey) || key.altKey || key.isComposing) return;
  key.preventDefault(); document.querySelector<HTMLElement>('#update-copy')!.click();
});
function applyCustomFormat() {
  const fields = ['#custom-width', '#custom-height'].map(id => document.querySelector<HTMLInputElement>(id)!);
  const values = fields.map(field => Number(field.value));
  const invalid = values.map(value => !Number.isInteger(value) || value < 1 || value > 8000);
  fields.forEach((field, index) => field.setAttribute('aria-invalid', String(invalid[index])));
  if (invalid.some(Boolean)) {
    document.querySelector('#size-error')!.textContent = 'Enter whole-number dimensions from 1 to 8000.';
    fields[invalid.indexOf(true)].focus(); return;
  }
  document.querySelector('#size-error')!.textContent = '';
  const [width, height] = values;
  void requestLayout({ source, custom: { id: 'custom', label: 'Custom', width, height }, mode });
}
document.querySelector('#custom-apply')!.addEventListener('click', applyCustomFormat);
for (const id of ['#custom-width', '#custom-height']) document.querySelector(id)!.addEventListener('keydown', event => {
  if ((event as KeyboardEvent).key === 'Enter') { event.preventDefault(); applyCustomFormat(); }
});
document.querySelector('#custom-remove')!.addEventListener('click', () => {
  void requestLayout({ source, custom: undefined, mode });
});
for (const m of ['selected', 'baseline'] as const) document.querySelector(`#mode-${m}`)!.addEventListener('click', () => {
  if (m === mode && displayedFontRevision === fontRevision && !document.querySelector('#update-error')) return;
  redraw({ source, custom, mode: m });
});
document.querySelector('#show-issues')!.addEventListener('change', event => {
  const next = (event.target as HTMLInputElement).checked;
  if (next === overlay && displayedFontRevision === fontRevision && !document.querySelector('#update-error')) return;
  overlay = next; redraw();
});
document.querySelector('#canvas-grid')!.addEventListener('click', async event => {
  const inspect = (event.target as Element).closest<HTMLButtonElement>('.inspect-button');
  if (inspect?.dataset.targetId) { inspectCard(inspect.dataset.targetId); return; }
  const finding = (event.target as HTMLElement).closest<HTMLButtonElement>('.finding-select');
  if (finding) {
    const card = finding.closest<HTMLElement>('.design-card')!;
    const pressed = finding.getAttribute('aria-pressed') !== 'true';
    for (const button of card.querySelectorAll<HTMLButtonElement>('.finding-select')) button.setAttribute('aria-pressed', String(button === finding && pressed));
    if (pressed) highlightFinding(card, finding);
    else card.querySelectorAll('.finding-selected').forEach(element => element.classList.remove('finding-selected'));
    return;
  }
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.export-svg-btn');
  if (!button || button.disabled) return;
  const card = button.closest<HTMLElement>('.design-card');
  if (!card || !document.querySelector('#canvas-grid')!.contains(card)) return;
  const label = button.innerHTML;
  button.disabled = true; button.setAttribute('aria-busy', 'true'); button.textContent = 'Exporting…';
  try {
    if (button.dataset.sourceId !== source.id) throw new Error('The export source no longer matches the displayed version');
    const original = card.classList.contains('original-card');
    const result = results.find(r => r.target.id === button.dataset.targetId);
    if (original ? button.dataset.targetId !== 'source' : !result) throw new Error('The export target is unavailable in the displayed version');
    const design = original ? source : result![mode].design;
    const label = original ? 'Original' : result!.target.label;
    const filename = `${source.id}-${label}.svg`;
    const svg = await exportSvg(design, measure, browserExportFonts(), loadBrowserExportFont);
    downloadFile(filename, svg, 'image/svg+xml');
    card.querySelector('[data-export-error]')?.remove();
  } catch (error) {
    let alert = card.querySelector<HTMLElement>('[data-export-error]');
    if (!alert) {
      alert = document.createElement('p');
      alert.dataset.exportError = 'true';
      alert.className = 'error-message';
      alert.setAttribute('role', 'alert');
      card.append(alert);
    }
    alert.textContent = `SVG not exported: ${error instanceof Error ? error.message : String(error)}. Select the current card and try again.`;
  } finally {
    button.disabled = false; button.removeAttribute('aria-busy'); button.innerHTML = label;
  }
});
function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme;
  document.querySelector('#spectrum-theme')!.setAttribute('color', theme);
  document.querySelector('#theme-toggle')!.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
}
systemTheme.addEventListener('change', event => {
  if (!themePreference) applyTheme(event.matches ? 'dark' : 'light');
});
document.querySelector('#theme-toggle')!.addEventListener('click', () => {
  themePreference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(themePreference);
  try { localStorage.setItem('reflow-theme', themePreference); } catch { /* Keep the in-session choice. */ }
});
document.querySelector('#export')!.addEventListener('click', () => download(`${source.id}-reflow.json`, {
  format: 'reflow.campaign.v0', renderer: 'local-svg-canvas-metrics', source,
  variants: results.map(r => ({ target: r.target, strategy: r.selected.strategy, design: r.selected.design, findings: r.selected.metrics.findings })),
  failedTargets: failures.map(f => ({ target: f.target, error: f.error })),
}));

async function runAll(onCase?: (fixture: Design, outcome: TargetOutcome) => void) {
  const output: Result[] = [];
  for (const fixture of FIXTURES) for (const target of TARGETS) {
    const [outcome] = reflowTargets(fixture, [target], measure); // a case with no valid layout is recorded, never aborts the run
    if (outcome.result) output.push(outcome.result);
    onCase?.(fixture, outcome);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  return output;
}
document.querySelector('#run-benchmark')!.addEventListener('click', async () => {
  const button = document.querySelector('#run-benchmark')!;
  button.setAttribute('disabled', '');
  const table = document.querySelector<HTMLTableElement>('#benchmark-table')!; table.hidden = false;
  const tbody = table.querySelector('tbody')!; tbody.innerHTML = '';
  let count = 0, failed = 0;
  const total = FIXTURES.length * TARGETS.length;
  try {
    const all = await runAll((fixture, outcome) => {
      count++;
      if (outcome.result) {
        const r = outcome.result;
        tbody.insertAdjacentHTML('beforeend', `<tr><td>${esc(fixture.name)}<small>${esc(r.target.label)}</small></td><td>${esc(strategyLabel[r.selected.strategy])}</td><td>${r.baseline.metrics.errors}</td><td>${r.selected.metrics.errors}</td><td>${r.selected.metrics.warnings}</td><td>${r.elapsedMs.toFixed(1)} ms</td></tr>`);
      } else {
        failed++;
        tbody.insertAdjacentHTML('beforeend', `<tr class="failed-row"><td>${esc(fixture.name)}<small>${esc(outcome.target.label)}</small></td><td colspan="5" role="alert">No valid layout: ${esc(outcome.error.code)}. ${esc(outcome.error.message)}</td></tr>`);
      }
      document.querySelector('#lab-status')!.textContent = `Completed ${count} / ${total} cases…`;
    });
    const errors = all.reduce((sum, r) => sum + r.selected.metrics.errors, 0);
    document.querySelector('#lab-status')!.textContent = `${count} / ${total} completed · ${errors} reflow errors${failed ? ` · ${failed} failed (no valid layout)` : ''}. Results use the original fixtures, independent of headline edits above.`;
  } catch (error) { document.querySelector('#lab-status')!.textContent = `Benchmark failed after ${count} cases: ${String(error)}`; }
  finally { button.removeAttribute('disabled'); }
});

async function ready() {
  await Promise.all([400, 500, 600, 700].map(weight => document.fonts.load(`${weight} 32px Inter`)));
  await document.fonts.load('600 32px "Source Serif 4"');
  await document.fonts.ready;
  FIXTURES.forEach(validateDesign); resetHeadline(); redraw();
  window.reflowLab = {
    fixtures: FIXTURES, targets: TARGETS, runAll,
    render: (design: Design) => renderSvg(design, measure),
    inspect: (design: Design) => evaluate(design, design, measure),
    run: (design: Design, target: Target) => reflow(design, target, measure),
  };
  document.documentElement.dataset.ready = 'true';
}
ready().catch(error => { app.innerHTML = `<main id="previews" tabindex="-1"><h1>Reflow Studio could not start</h1><p role="alert">${esc(error)}</p></main>`; console.error(error); });

declare global {
  interface Window {
    reflowLab: { fixtures: Design[]; targets: Target[]; runAll: typeof runAll; render: (design: Design) => string; inspect: (design: Design) => ReturnType<typeof evaluate>; run: (design: Design, target: Target) => Result };
  }
}
