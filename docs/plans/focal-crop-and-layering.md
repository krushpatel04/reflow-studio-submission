# Rendering #6: shared focal crops and intended layering versus defects

## Problem, evidence and impact

[#6](https://github.com/ojedaJD/reflow-studio/issues/6) asks for precisely defined crop geometry that SVG and PNG share, and for diagnostics that keep legal source layering while reporting newly obstructed content. Observed on `main` at `3d08dd9`:

1. **Focal points are quantized to three positions, separately in each renderer.** `src/render.ts` maps `focalPoint` to `xMin`/`xMid`/`xMax` (cut points 0.34/0.66) for SVG `preserveAspectRatio`; `scripts/native.ts` repeats the same thresholds for canvas `drawImage`. Any other value is discarded. The `edge-subject` fixture's figure sits at x ≈ 0.73–0.85 of the `landscape` asset with `focalPoint.x = 0.83`, so it snaps to `xMax`. In a cover frame with aspect ≤ 0.3, `xMax` shows asset x ≥ 960 and cuts off the figure, even though the declared focal point is inside the asset.
2. **Crops cannot be compared with each other.** Neither renderer knows the visible source region, and `ranking.ts` explicitly uses frame-aspect change as a crop *risk* because intrinsic asset dimensions are unavailable. No test compares browser and native crops.
3. **Occlusion checks ignore paint order and non-content roles.** `evaluate` checks only content–content rectangle overlap. An opaque `role: 'decoration'` rectangle moved on top of a headline produces no finding. The adversarial full-canvas cover is caught only because it adds an element (`missing-content`), not because it hides anything.
4. **Any source overlap exempts any output overlap.** Two elements touching by one pixel in the source may overlap completely in the output without a `collision`.
5. **Visible legibility is unchecked.** A label that leaves its backing plate (the September 15 mixed-role failure) lands white on white. `group-geometry` now catches that particular engine path, but no check looks at the composited colours behind the text, so the next path that separates text from its backing would be silent again.

Impact: rendered crops can remove the declared subject, the two renderers cannot be held to one definition, and a candidate can pass all hard checks while hiding or blanking content. This blocks honest claims about rendered correctness, which #7 and the ML plan depend on.

## Scope

In scope: `src/crop.ts` (new shared geometry), `src/render.ts`, `scripts/native.ts`, `src/visibility.ts` (new sampling diagnostics), `src/evaluate.ts`, three additive `Finding` kinds in `src/model.ts`, an additive optional `resources` argument on `evaluate` threaded through `reflow`, tests, a browser crop-parity check, and evidence.

Out of scope: a subject/saliency model, image-pixel colour analysis for text over photographs, glyph-exact ink coverage, new candidate strategies or ranking weights (#5/#12), the Adobe/native adapter (#4), and fixture changes.

Shared-file note: `model.ts`/`evaluate.ts`/`engine.ts` are engine files. The change is additive (three finding kinds, one optional parameter). Existing kinds, thresholds and the `DesignResources` shape stay unchanged; the collision exemption becomes stricter, as #6 requests.

## Intended behavior

### Crop geometry (`src/crop.ts`)

- `focalPoint` keeps its schema meaning, a normalized position in the asset. The crop is continuous and follows CSS `object-position: fx fy` semantics: the scaled asset is offset by `(frame − scaled) × focal` on each axis. At 0, 0.5 and 1 this equals the previous `xMin/xMid/xMax` output. For cover, the focal point is always inside the visible window and sits at the same relative position in the window as in the asset.
- `cover` scales by `max(fw/aw, fh/ah)`, `contain` by `min(...)`. Scaling is always uniform, so the drawn aspect equals the asset aspect.
- `cropGeometry(frame, fit, focal, assetSize)` returns the drawn rectangle, the visible destination rectangle (drawn ∩ frame) and the visible source rectangle in asset pixels.
- `assetSize(uri)` reads intrinsic dimensions from the resolved URI without I/O: SVG `width`/`height` (else `viewBox`) and base64 PNG headers. Other URIs return `undefined`. SVG then falls back to the previous nearest `preserveAspectRatio` alignment, and crop diagnostics are skipped. That is a disclosed approximation, not a silent success.
- SVG emits the computed drawn rectangle with `preserveAspectRatio="none"`, clipped to the element rectangle. PNG draws the same rectangle under the same clip.

### Diagnostics (`src/visibility.ts`, `src/evaluate.ts`)

All are source-relative. A condition present in the source is not a reflow defect. The engine is judged only on what it makes worse.

- **Sample regions.** Text uses the laid-out line boxes: measured line width, alignment, the baseline minus ascent through the baseline plus descent. This is a proxy for glyph ink, not the ink itself. Rect uses its rounded rectangle, ellipse its ellipse, image its visible drawn region within the frame. Deterministic grid sampling, at most 16×16 samples per region set.
- **`occlusion` (error).** For each visible content element, obstruction is the mean composited coverage `1 − Π(1 − αᵢ)` from later-painted rect, ellipse and image elements of any role. α is element opacity × colour alpha; images are treated as opaque inside their drawn region. The finding fires when output obstruction exceeds the source obstruction of the same element by more than 0.10. It names the element and the occluders that increased coverage.
- **`low-contrast` (error).** For each non-empty, visible content text element, composite the backing at each sample point, starting from the design background and walking earlier-painted shapes and images. Then composite the text colour at its opacity and compute the WCAG contrast ratio. An image makes a sample's backing unknown unless a later opaque shape covers it. Unknown samples are excluded. The legible fraction is the share of known samples at ≥ 3:1 (the WCAG minimum for large text and graphics). The finding fires when the output's legible fraction is more than 0.10 below the source's. With no known samples, the check gives no verdict.
- **`collision` (existing).** An originally overlapping content pair is still exempt only if its overlap fraction (overlap ÷ smaller area) grows by no more than 0.10. Text–text overlaps remain collisions.
- **`crop-loss` (warning).** For each image with a known asset size, retained = area(source-visible asset region ∩ output-visible asset region) ÷ area(source-visible region). The finding fires when retained < 0.5, naming the element and the retained percentage. It is a geometry measurement, not a subject-retention or aesthetic claim.

Thresholds are provisional internal engineering values, documented here and in the design contract, not Adobe scores or calibrated aesthetics.

## Risks

- New hard errors change selection wherever a candidate newly obscures content. That is intended, but the benchmark diff must be reported. A false positive would reject valid layouts, so positive controls (all fixtures unchanged, legal overlays, semi-transparent decoration behind text, uniform scaling) are mandatory.
- Line boxes overstate ink. Occlusion of the empty part of a line box counts as obstruction.
- Images are assumed opaque, and text over images gets no contrast verdict. A dark photo behind dark text is not detected.
- Continuous crops change the `edge-subject` output and any fixture whose focal point is not 0, 0.5 or 1. The before/after images must be archived.
- Sampling cost adds to every evaluated candidate. Runtime must stay within the existing stability/measurement budgets.

## Steps and acceptance checks

1. Write failing tests first and record the failure evidence:
   - `tests/crop.test.ts`: contain/cover; left, center, right and intermediate focal points; subject near an edge (the `edge-subject` figure stays visible in tall frames); no stretching; native PNG pixels match hand-computed asset features; pixels outside the frame are background; SVG uses the same rectangle; asset-size parsing matches decoded native dimensions.
   - `tests/visibility.test.ts`: paired negative/positive controls. Moved opaque decoration over a headline versus a decoration that stays clear. Originally slight overlap made substantially more obstructive versus an unchanged legal overlap. Full-canvas decorative cover fault. A separated label (white on white) versus a label on its backing, including a semi-transparent backing. Text newly under an image. Collision growth versus the `intentional-overlap` fixture. Crop-loss on an extreme frame versus the same aspect and contain. All fixtures × three targets and nearby sizes must add no new errors to the selected output.
2. Implement `src/crop.ts` and switch both renderers → crop tests pass.
3. Implement `src/visibility.ts`, the finding kinds and the evaluate wiring → visibility tests pass. Existing tests stay green.
4. Browser crop parity: `scripts/crop-parity.ts` writes native PNG samples for fixed probes to `reports/crop-parity/native-samples.json`. The browser check rasterizes the SVG of the same probes and compares pixels, including just outside each frame.
5. Run `npm test`, `npm run build`, `npm run verify`, `npm run benchmark`, `npm run review:probes` and `npm run verify:browser`. Compare the benchmark with the pre-change run, inspect changed images, and archive dated evidence under `docs/evidence/2026-09-24-crop-layering/`.
6. Update the design contract, progress and this plan's execution record. Hand off the geometry and overlap constraints to JD and the adversarial crop/layer cases to Krush.

## Execution record

**2026-09-24.** Baseline on `3d08dd9`: 375 tests pass. The benchmark has 30 cases, 0 selected errors and 7 selected warnings. Median layout is 12.4–12.7 ms across three runs.

- **Red.** `npx tsx --test tests/crop.test.ts tests/visibility.test.ts`, run with only the pure `src/crop.ts` module added and no renderer or evaluator changes, gave 12 behavioral failures ([excerpt](../evidence/2026-09-24-crop-layering/red-tests.txt)):
  - The native PNG showed sky `212,220,241` where the edge-subject figure's head belongs.
  - SVG lacked explicit geometry.
  - Every expected `occlusion`, `low-contrast`, `collision` and `crop-loss` finding was missing.
  - The positive-control sweep passed, as a control should. The browser-report gate's new `cropFindings` rejection also failed before the gate change.
- **Green.** Shared crop in both renderers, then `src/visibility.ts` and the evaluate wiring. 395 tests pass; build, verify and the browser run (13/13) pass. The `crop-mismatch` fault fails only the in-image crop samples.
- **Refactor.** Precomputed per-design layers, a bounding-box prefilter and a contrast memo brought median layout from about 20.5 ms back to about 14.6 ms, with tests green.
- **Benchmark.** Selections unchanged, 0 errors; warnings 7 → 8 (one real `crop-loss`). Only `edge-subject` images changed. Details are in the [evidence](../evidence/2026-09-24-crop-layering/README.md).
- **Adversarial probes.** The cover, invisible-headline, brand-colour and paint-order injections now carry visible-result findings in addition to the structural ones.
- **Not done.**
  - #7/#19 defect labels still need independent review.
  - The official/native path (#4) is unavailable.
  - Text over imagery has no contrast verdict.
  - Ranking still uses its frame-aspect crop proxy; wiring `cropGeometry` into ranking is #12/#5 work.
  - `review:stability-runtime` already failed on `3d08dd9`.
- **Skill assessment.** Existing repo scripts and the plan/evidence pattern covered the workflow, so no new skill was created.

## Phase 2: rendered verification, regions and the defect-control pack

### Problem and evidence

Phase 1 diagnostics are geometric proxies computed from document boxes. #6's remaining checks ask for three more things:

- **Rendered evidence.** "Test visible glyphs, opaque coverage, contrast against the composited background", from both renderers.
- **Findings tied to an element *and region*** that #5 can repair.
- **Defect labels and controls for #7/#19/#20/#22.** Labels must carry element/region evidence, attractive-looking corrupted negatives, legal overlay/transparency positives, and frozen renderer/font/asset versions.

Text over imagery currently gets no contrast verdict at all.

### Intended behavior

- **Rendered visibility.** An independent pixel measurement that shares no sampling code with `src/visibility.ts`:
  - Render the whole design (A) and the design without the element (B).
  - Render the element alone at full opacity over black and over white. Its *core* pixels are those where both renders agree within 64 per channel, meaning at least about 75% coverage. For text, the alone render uses a box extended to the full laid-out height at the same wrap width, so glyphs clipped by the element's own box still count as potential ink.
  - A core text pixel is legible when the WCAG contrast between A and B is at least 3:1. A core non-text pixel is visible when A and B differ by at least 32 in some channel.
  - The rendered share is legible (or visible) core pixels ÷ core pixels. The verdict is `defect` when the output share is more than 0.10 below the source share, and there is no verdict without core pixels.
  - Because this measures actual pixels, it covers text over images, covered glyphs, clipping by the element box and paint order. Clipping by the canvas edge stays geometric (`out-of-bounds`).
- **Native and browser.** `scripts/rendered-visibility.ts` measures with native Skia PNGs. The browser check repeats the same measurement on Chromium-rasterized SVG with the bundled fonts embedded, and must reach the same verdict for every pack case. Share deltas are recorded as observations.
- **Regions.** `Finding` gains an optional `region` rectangle in design coordinates:
  - `occlusion`: bounding box of the obstructed samples.
  - `low-contrast`: bounding box of the illegible samples.
  - `collision`: the overlap rectangle.
  - `crop-loss`: the element frame.
  - Existing kinds without a region stay unchanged.
- **Defect-control pack.** `tests/support/defect-cases.ts` defines author-labelled source/output pairs. `scripts/defect-pack.ts` writes `reports/defect-pack/` with source/output PNG and SVG, `labels.json`, and frozen versions and hashes:
  - Categories: clipping, occlusion, contrast (including over imagery), crop damage, glyph coverage, paint order and opacity.
  - Attractive-looking corrupted negatives, and legal overlays, transparency and faint-by-design positives.
  - Engine outputs selected for real fixtures.
  - `labels.json` records, per case: the author label, the evaluator verdict with its findings and regions, and the native rendered verdict. Disagreements are listed rather than hidden.
  - Status is "author-labelled, independent review pending". Only #7/#20 reviewers can make these independent labels.

### Risks

- Pixel thresholds are provisional.
- The renderer's downscale (≤720×900) can leave tiny text with no core pixels. That case yields no verdict, never a pass.
- Browser antialiasing differs from Skia, so verdict parity is the binding assertion and share equality is not.
- Author labels are not independent evidence. The pack must say so.

### Acceptance

1. Failing tests first:
   - `tests/rendered-visibility.test.ts`: paired defect and legal cases, scale invariance, colour independence of core pixels, and text over imagery (evaluator: no verdict; rendered: defect).
   - `tests/defect-pack.test.ts`: schema, category coverage, controls, frozen versions, and label/rendered agreement.
   - Region assertions in `tests/visibility.test.ts`.
2. Implement until green. Run `npm test`, build, verify, benchmark and `verify:browser`, plus a browser fault control for rendered-verdict parity.
3. Archive the pack snapshot and evidence, update the contract, progress and issue, and record #4 validation as blocked until the official path exists.

### Phase 2 execution record

**2026-09-24.**

- **Red.** `npx tsx --test tests/visibility.test.ts tests/rendered-visibility.test.ts tests/defect-pack.test.ts` gave 3 failures ([excerpt](../evidence/2026-09-24-crop-layering/red-tests-phase2.txt)). The region test failed behaviourally: an occlusion finding had no region. The two new test files failed on missing modules. They test new APIs with no prior behaviour; their behavioural motivation is the evaluator gap, which the green suite asserts: text moved onto a same-coloured photo region produces no evaluator finding. The browser-report gate's `renderedFindings` rejection failed before the gate change.
- **Iteration.**
  - Core glyph counts differed by about 14% between white and black text, because of Skia's colour-dependent antialiasing gamma. Coverage is now measured in fixed black ink.
  - The 3000×400 plate control rasterized its label at about 4px, so it correctly had no verdict. The control now uses 1:3, where the text is measurable.
- **Green.**
  - 406 tests pass; build, verify and the benchmark pass, with 0 selection changes against `3d08dd9`.
  - The pack records 24 cases. Native rendered verdicts match the labels on 23/23 measured cases, and Chromium matches native on all of them (largest share difference 0.009). The `rendered-mismatch` fault fails only its injected case.
  - The evaluator's 2 disagreements are listed in the pack.
- **Not done.**
  - Independent review of the labels (#7/#20).
  - Validation through the official Adobe renderer (#4 still has no native path).
  - Using the rendered check at selection time. It stays verification-only because of cost and the raster limit.
- **Skill assessment.** The existing plan/evidence pattern and repo scripts covered this, so no new skill was created.

