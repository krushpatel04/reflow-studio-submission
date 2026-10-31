# Issue 29 — self-contained SVG downloads

## Problem and evidence
Baseline 8ac29a0103bdb8c092c59ab88160a5a58952181a already excludes diagnostic overlays (PR146). The actual UI calls renderSvg, which emits font-family references but no font bytes. Issue 29 criteria 2–4 remain open. Characterize the real download before changing production code.

## Intended behavior and scope
A baseline or selected card downloads ordinary SVG artwork retaining bundled font glyphs, text, assets and geometry in a fresh browser without app CSS or network. Embed only font subsets/weights needed by its text, once per face. Missing/unsupported resources produce the existing visible export error, no download. Own only main.ts export handler, new svg-export.ts and export tests; no engine, schema, font-layout, RF04 executor or packaging changes.

## Risks
Silent fallback can change glyph widths and clipping. Over-embedding increases file size. CSS font-face order and unicode ranges must match the preview. Unavailable resources must not create a deceptively successful file. Async export must capture the clicked design. Preserve normal art and existing overlay behavior.

## Tests and acceptance
1. Actual original/baseline/selected downloads, overlay on/off; clean network-denied reopening and glyph bounds compared with the preview, assets rendered.
2. Both families, Inter weights 400/500/600/700 and Serif 600; Latin, extended Latin, Greek, Cyrillic and Vietnamese supported text. Check missing font/asset and unsupported content errors.
3. Inventory embedded faces and bytes; no unused weight/subset duplication or remote references.
4. npm test/build/verify/benchmark/verify:browser; inspect representative images and /verify.html. Retain logs and exact artifact hashes under reports/two-hour/C.

## Implementation steps
First run a browser regression against the unchanged UI and record actual font-bound drift. Then add the smallest export-only resource embedding helper, using the already-loaded bundled CSS face declarations and local font bytes. Keep preview renderer unchanged. Retest focused checks, then serialize heavy validation with lane D.

## RF04 disposition
Bounded inspection found scripts/quality/dev_report.py explicitly preflight-only. Retain the 21 task identities from the committed pair-audit receipt; no current accepted executor or source/baseline/engine image binding is established here. Historical conversion acceptance does not prove resizing quality. No source transfer or human judgment is attempted.

## Execution record
Pending behavioral baseline. Common freeze 2026-10-15T15:40:47Z and hard stop 16:35:47Z apply.

### Behavioral RED before implementation
`npx playwright test tests/browser/svg-export.spec.ts` failed at the actual downloaded Original glyph width: expected preview 416.36761474609375, received offline 404.296875 for THE CAMPUS CREATIVE SERIES. Text equality and zero network requests passed first. Artifacts: reports/two-hour/C/browser-red.log, red-download-geometry.json, red-original.svg, red-original-offline.png. Existing production source remained unchanged. Missing-declaration browser control separately expects a visible error/no download.

### Boundary and test correction
The default after-dark fixture contains U+2192, outside Inter's bundled declared coverage. The explicit resource requirement makes that download fail visibly; source text/fixtures are unchanged. Supported type-pairing independently reproduced baseline drift (500.331px preview versus 515.297px offline). Comparing thumbnail getBBox with full-size getBBox introduces Chromium hinting differences; compare both at intrinsic SVG scale, retaining the original diagnostic artifact. Supported original and missing-face tests then passed. No tolerance was relaxed.

Reviewer D found an asynchronous filename race: a fixture change during font loading could name the old clicked artwork with the new source ID. A delayed-font browser test failed with quiet-brand-Original.svg instead of type-pairing-Original.svg before capturing filename before await. Artwork is serialized before asynchronous loading.

### Existing acceptance harness compatibility (D-assigned ownership extension)
D assigned only export-related portions of tests/browser-checks.ts to C. Three retained-revision SVG captures and the overlay capture helper now await Blob completion instead of assuming synchronous export. Healthy source changes from after-dark (unsupported arrow) to grouped-details, preserving rect/image/text and grouped content controls; the dedicated browser spec separately requires the original arrow to fail visibly and recover on a supported design. Artwork equality removes only the single root font-definitions container after asserting it contains font-face rules only; all geometry/text/assets/paint-order/clip IDs remain compared. Overlay ON/OFF compares complete exported SVGs including fonts. No existing behavioral assertion is removed.

The extended-Latin matrix includes nondecomposable Ł: Chromium normalizes Ā to Latin A plus macron and can leave the corresponding codepoint-selected latin-ext face unloaded. Retaining Ā and adding Ł makes actual use of every included subset measurable. Inventory parsing decodes XML quote entities before reading CSS declarations; the earlier naive semicolon split was a test parser error. Standalone SVG screenshots use an explicit 1440x1600 viewport; fullPage capture timed out after fonts and DOM assertions completed.

### Focused candidate results
13 real Chromium tests passed, zero failed/skipped (`npx playwright test tests/browser/svg-export.spec.ts --output /tmp/reflow-C-final-focused`); 8 focused unit tests passed; TypeScript no-emit passed. Actual downloads retain baseline/selected geometry, text, element order and embedded assets with zero external requests, identical ON/OFF overlay exports, independent font-byte inventory hashes and all five family/weight combinations with Latin/extended Latin/Greek/Cyrillic/Vietnamese probes. Missing declaration, 404, invalid font bytes, unsupported U+2192 and missing asset controls fail visibly; supported selection and asset restoration recover. Delayed font load preserves clicked filename/artwork. Representative product and Inter/Serif Unicode screenshots were inspected by AI; no human or aesthetic acceptance is claimed.

Full npm/build/native/benchmark/browser acceptance runs are delegated to lane D on the integrated revision to avoid duplicated heavy work. Candidate acceptance remains pending those gates. RF04 remains deferred. Existing verification skill and repository instructions cover the repeatable workflow; no new skill is needed.
