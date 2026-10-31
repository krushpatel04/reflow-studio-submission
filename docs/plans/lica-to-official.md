# LICA to official Chameleon format

## Goal and current checkpoint

Create a private evaluation batch in Adobe's input format so the Python submission engine can be measured on more than the three public samples. Preserve each source component, make every conversion decision visible, and verify the unchanged source through the real renderer before evaluating resized output.

Current triage checkpoint complete: **45 active sources / 315 tasks; 48 candidates re-rendered and reviewed; 209 corrected SVG captures (184 active uses).** Full-box coverage and non-scaling-stroke tests failed before the fix and now pass. Original source JSON remains byte-identical; active renders have 1,098 exact font lookups and zero missing assets/font/renderer fallbacks. Pairs 15, 16, and 35 excluded for source text overlap/intrusion. Active visual counts: **18 material, 23 minor, 4 close**; accepted typography is logged separately. Pair 17 opacity and pair 27 crop traced: reference translucency/crop offset are missing from JSON, so no guessed values added. Final Python 123/123, npm 685/685, build pass. Evidence: `../reflow-studio-spikes/lica-official-step5-triage/README.md`, `contact-sheets/gallery.html`, `differences.md`. Stopped before JD’s batch engine. No commits.

Current continuation: code bugs follow the normal regression-test/fix cycle; the two-failure stop limit applies to environment/tool blockers. SVG output dimensions use one tested rule: `max(1, ceil(source_dimension * 2))`. Set that integer viewport at device scale factor 1, fill it with the SVG, and require the screenshot to match. The approved batch excludes A5 (explicit hold), GL (missing coordinates), and `3OcbtlfEs722hNRt0W1P` (zero-height SVG), leaving 48 layouts. Generate all seven targets, schema-check all outputs, render unchanged sources with zero asset/font fallbacks, and inspect every contact-sheet pair before stopping. JD's engine remains a later checkpoint.

Checkpoint 4a implements the pure converter against the 38 approved stdlib unittest tests, then runs full Python discovery, `npm test`, and `npm run build`. Stop after showing the green run. Checkpoint 4b requires a separate OK before resource preparation and batch work. No commits, pushes, or GitHub posts are authorized.

## Evidence and scope

- Reflow main is `fd215a0`. JD's Python implementation lives in `engine/resize.py` and `engine/text_fit.py`; leave these files untouched.
- The existing TypeScript converter, `src/lica.ts`, and `scripts/lica-{batch,files,import}.ts` explain LICA fields. Reuse that knowledge without modifying those files or using their converted text/IDs as the source of truth.
- The public Adobe starter is pinned to `a44a06046b0413f0785e7203955c3822e0acbc32`. Its design schema SHA-256 is `14d97d48c4f00357f7f27d2e8000ef9cc8778cac7cd5a621ed7e1261f949820d`. The schema validates a design (`canvas`, `elements`), not the enclosing task.
- All three unchanged Adobe sample tasks rendered with the real converter and renderer in the scratchpad: three converter calls, three renderer calls, zero box fallbacks. Forced import failure produced three fallbacks. Traced and normal PNGs matched. The starter's level 2 off-canvas warning and level 3 deliberately missing asset remain visible.
- The old ledger contains 1,148 metadata inputs. Excluding the five blocked template families leaves 1,131. It suggests 414 candidates: 21 existing, 221 unselected, and 172 previously blocked only by rotation. Five have an old component-omission loss; counts are screening evidence, not verified convertibility or asset availability.
- First batch: the 21 existing designs plus approximately 30 new ones across categories, including approximately 10 rotation-only layouts. Review the selection before generation. Expand only after this batch renders cleanly.
- Conversion code and tests belong in the repo. Generated tasks, fonts, assets, references, and evidence belong outside it, under `~/dev/reflow-studio-spikes/lica-official/`.
- Keep every existing development/validation split from `corpus/manifest.json` and `corpus/split-lock.json`. New families have no frozen split yet: propose their batch assignments explicitly; do not rewrite either existing corpus file.
- Do not open or convert the sealed set. Leave both git stashes intact.

## Files and responsibilities

| File | Responsibility | Checkpoint |
| --- | --- | --- |
| `docs/plans/lica-to-official.md` | Contract, steps, acceptance checks, evidence | Current |
| `tests_python/test_lica_official.py` | Synthetic conversion fixtures and behavioral assertions | Current |
| `tests_python/official_schema_assertions.py` | Test-only interpretation of all validation keywords used in the pinned schema | Current |
| `scripts/lica_official/__init__.py` | Pure layout conversion entry point | 4a |
| `scripts/lica_official/rasterize.cjs` | Tested integer SVG sizing and real Chromium capture | Step 5 |
| `tests_python/test_lica_raster.py` | Literal fractional/minimum/integer raster-size controls | Step 5 |
| `scripts/lica_official/resources.py` | Font and asset preparation with hashes, provenance, licenses, and visible failures | Later |
| `scripts/lica_official/batch.py` | Metadata-first exclusion, bounded selection, seven targets, all-input ledger | Later |
| `scripts/lica_official/render.py` | Direct upstream converter calls, trace evidence, warnings, comparisons, engine runs | Later |

Do the converter and tests inline. This scope does not need a new reusable skill.

## Pure conversion contract

The public entry point is:

```python
convert_layout(
    layout,
    *,
    layout_id: str,
    template_id: str,
    category: str,
    split: str,
    target_canvas: dict,
) -> dict
```

It performs no file reads, downloads, font preparation, or engine calls. It returns:

```text
{
  "status": "converted" | "skipped",
  "task": {"task_id": string, "source": design, "target_canvas": canvas} | null,
  "ledger": {
    "layout_id": string, "template_id": string, "category": string,
    "split": "development" | "validation", "status": "converted" | "skipped",
    "input_element_ids": [original component IDs],
    "reasons": [{"code": string, "element_id": string | null, "detail": string}],
    "text": [{"element_id": string, "original": string,
              "transform": string, "displayed": string}],
    "weights": [{"element_id": string, "original": original weight value,
                 "numeric": number, "mapped": "regular" | "bold",
                 "rule": "600-and-above-bold"}],
    "assets": [{"element_id": string, "asset_id": string, "source": original URL}],
    "changes": [{"element_id": string | null, "field": string,
                 "original": original value, "value": converted value, "rule": string}],
    "synthetic_elements": [IDs added only to represent the canvas background],
    "assigned_ids": [{"component_index": integer, "original": original ID value,
                      "id": assigned ID, "rule": "missing-id-component-index"}]
  }
}
```

Unsupported input yields a skipped result with no partial task. Include all discovered blockers for the layout, not just the first. Preserve the rejected component's ID and explanatory detail in each reason. The batch runner records unselected inputs separately, so every metadata row has one disposition.

Approved continuation after 4b: install Chromium with `npx playwright install chromium` in the user cache and record its version. Missing/blank raw IDs receive deterministic `lica-<zero-based component index>` IDs, with numeric suffixes when needed to avoid every existing or assigned ID; record index, original value, assigned ID, and rule in `ledger.assigned_ids`. Existing valid IDs remain exact, duplicate/non-string IDs remain blockers. Map `justify` to `left` and record the change per element. Write and observe failing tests before both changes. Keep layout `A5ijgpumOCZpbBwUaoE0` blocked before layout access.

The 30-layout proposal is approved as listed. Prepare the resulting eligible batch outside the repo, retaining all 51 dispositions. Schema-check every task source and target canvas, render every unchanged source through the real upstream converter/renderer with zero missing assets and zero font fallbacks, build LICA-reference/render contact sheets, and inspect every pair. Stop with the contact sheets and difference list before running JD's engine. No commits.

### Exclude before reading the design

Refuse these exact template IDs, including the two spares:

- `ff1965c1-2739-4902-8d77-ee782a1501b6`
- `3a0b7e24-fe06-4645-961d-8b063b9b4122`
- `f2453c19-78eb-4cfc-aebc-da914389ba79`
- `0fd97113-ec95-4d61-9284-fd62fa3b30ac`
- `e70d8252-9ffa-49e7-a0e2-3a389aaf0243`

The converter returns reason `sealed-template` before accessing `layout`. The batch runner must check metadata before opening JSON, PNGs, annotations, fonts, or assets. Tests use a layout object that raises on access; they do not load any sealed design. An unrelated allowed template is a positive control.

### Field mapping

| LICA input | Adobe output | Preservation and diagnostics |
| --- | --- | --- |
| Layout `width`, `height` | `source.canvas` | Positive integer pixels; reject fractional/invalid canvas sizes |
| Component `id` | Element `id` | Preserve valid IDs exactly; assign and log missing/blank IDs by component index without collisions; reject duplicates/non-string IDs |
| `left`, `top`, `width`, `height` | `x`, `y`, `width`, `height` | Parse numeric/px values; preserve finite geometry, including zero-size frames; reject negative sizes |
| Component array order | `z_index` | Consecutive integer paint order; no reordering |
| `transform: rotate(...deg)` | `rotation` | Preserve clockwise center rotation and sign; reject mirroring and other nonidentity transforms |
| `opacity` | `opacity` | Preserve separately from color alpha; reject invalid ranges |
| `TEXT.text`, `textTransform` | `content` | Displayed-text rule below; never normalize whitespace or Unicode |
| `fontFamily` prefix before `--weight` | `font_family` | Preserve family spelling; renderer resource lookup must prove the intended family is loaded |
| `fontWeight`, or family suffix when absent | `font_weight` | Explicit threshold rule below; no silent fallback for malformed values |
| `fontSize` | `font_size` | Numeric pixels, at least 1 |
| `fontStyle` | `font_style` | Preserve `normal`/`italic`; reject unsupported values |
| `color`, solid shape fill | RGBA strings | Keep exact RGB channels and alpha; no 8-bit alpha round-trip or silent clamping |
| `textAlign` | `text_align` | Preserve left/center/right; map justify to left and log per element |
| `lineHeight` | `line_height` | px/font size or percentage multiplier; preserve sub-1 multipliers; log a 1.2 default when absent/normal |
| `letterSpacing` | `letter_spacing` | Convert em to pixels using the source font size; preserve px spacing |
| `IMAGE.src` | `asset_id`, ledger asset reference | Retain URL and filename; default `cover` follows the prior import path and must be checked visually |
| Flat solid rectangular `GROUP` artwork | `shape`, `shape_type: rectangle` | Preserve ID/fill/opacity/rotation; this is artwork, not evidence of semantic group membership |
| Solid canvas `background` | One synthetic rectangle behind all components | Preserve background color; record its ID, avoid collisions, and do not add a shape for fully transparent background |

Do not infer `group_id` from ID spelling. LICA's flat GROUP artwork does not establish which neighboring elements form a semantic group. Adobe supports lines and ellipses, but the scanned LICA static input has no separate LINE/ELLIPSE type; arbitrary clip paths remain unsupported until their exact mapping is established.

Missing text color follows the existing importer default of black and is recorded in `changes`; it remains a source-fidelity risk for visual review. A non-solid shape fill, unsupported clip, image mask, mirrored transform, curved text, markup, or unknown component type skips the whole layout with reasons. Never omit a zero-size component. Only the approved missing-ID rule may assign an ID.

### Displayed text and font weights

- `none` or an absent transform: preserve the original string byte for byte in UTF-8, including newlines, tabs, combining marks, emoji, and leading/trailing spaces.
- `uppercase`: write the uppercase displayed text to `content`, preserving whitespace. Record raw text, `uppercase`, and displayed text per element.
- `lowercase`: the corresponding lowercase operation with the same audit record. Other transform values are skipped with `unsupported-text-transform`; do not approximate capitalization without an agreed rule.
- Weight below 600 becomes `regular`; weight 600 or above becomes `bold`. Tests cover 500, 599, 600, 800, 900, regular/bold controls, and a family-suffix weight.
- Record every text element's original weight, numeric weight, mapped value, and `600-and-above-bold` rule. The renderer loads the corresponding 400/700 resource; the loss of intermediate weight is visible in the ledger.

## Acceptance tests in this checkpoint

The test module loads the converter inside each behavioral test. The initial red run translated only absence of `scripts.lica_official` into a clear assertion failure; unexpected import/dependency errors remain errors. There is no stub converter and no skipped converter tests.

Fixtures are synthetic and use realistic LICA fields. Expected IDs, text, geometry, colors, and weights are hand specified. The test helper interprets the complete set of validation keywords in the pinned schema (`$ref`, types, required properties, bounds, enums, arrays, conditional type requirements, and additional-properties constraints). It rejects unknown schema keywords rather than silently ignoring them. It is not a general JSON Schema implementation and contains no conversion logic.

Four schema controls must pass before treating the red converter run as usable evidence: pinned schema hash, valid public-source controls, invalid-design mutations, and unsupported-keyword rejection. Converter assertions cover:

- [x] Every original ID exactly once; order and geometry preserved; zero-size components retained.
- [x] Duplicate/non-string IDs rejected, missing-ID assignments audited, and input objects left unchanged.
- [x] Raw text byte-identical for no transform; uppercase/lowercase displayed text and audit records exact.
- [x] Every weight mapping recorded; threshold boundary and family-suffix behavior explicit.
- [x] RGB/hex/RGBA conversion exact, with fractional alpha and opacity kept separate.
- [x] Rotation, italics, spacing, and sub-1 line height preserved; image URL/filename traced.
- [x] All unsupported features reported per layout with no partial output; invalid geometry/color/weight rejected.
- [x] All five sealed template IDs refused before layout access, with an allowed-template positive control.
- [x] Converted source validates against the pinned design schema; each of the seven target canvases is correct and source remains unchanged.
- [x] Background addition documented without ID collisions; existing development/validation metadata preserved.

Run from the repo root:

```sh
CHAMELEON_UPSTREAM=../reflow-studio-spikes/chameleon-official ../reflow-studio-spikes/lica-official-environment/venv/bin/python -m unittest tests_python.test_lica_official -v
```

The initial red evidence is preserved at `../reflow-studio-spikes/lica-official-step3/`. Checkpoint 4a saves a fresh red baseline, the green run, full-suite output, and exit codes at `../reflow-studio-spikes/lica-official-step4a/`. Show the green checks, then stop.

## Later implementation and verification

### 1. Implement the pure converter (checkpoint 4a)

- [x] Create only `scripts/lica_official/__init__.py` initially, matching the API above.
- [x] Run the focused tests after each supported input class; implement the smallest behavior needed.
- [x] Confirm unsupported layouts retain every blocker and expose no partial task.
- [x] Run the Python suite, `npm test`, and `npm run build` before reporting converter completion. Record pre-existing failures separately.

### 2. Prepare resources and the bounded batch (checkpoint 4b, after separate OK)

- [x] Check the 21 existing raw layouts against original IDs/text; do not reuse the old converter's generated IDs or uppercase-mutated content.
- [x] Show the proposed approximately 30 new layouts before generating any tasks. Include category, template ID, rotation, and split for each; spread across categories with approximately 10 rotation-only inputs. Preserve frozen splits and make new-family assignments explicit.
- [x] Resolve cached assets first, then download missing assets from LICA's URLs. Record every downloaded URL and SHA-256. The raw `images/` folder holds reference PNGs, not all element assets. Missing/download/decoding failures must skip or block a design visibly.
- [x] Rasterize SVG assets with the repo’s Playwright Chromium (user-cache install separately approved). Use `max(1, ceil(box * 2))` per dimension, an exact integer viewport at deviceScaleFactor 1, and an SVG filling it; assert screenshot size. Preserve original SVG bytes and both hashes. Three regression controls and 209 batch captures pass. The two-failure stop rule applies to environment/tool blockers; code bugs require regression tests and fixes. Visual differences remain recorded for triage.
- [x] Install `fonttools` and `brotli` into the scratchpad venv only, then convert the cached WOFF2 fonts to TTF. Record each font's source and license. Package mapped weights and requested styles explicitly; do not relabel one font as another. These actions were authorized and completed in checkpoint 4b.
- [x] Write one task per layout per manifest target and per-design `fonts/` and `assets/`. Record every metadata input as converted, excluded, unsupported, resource-blocked, or unselected. Refuse sealed metadata before file access.
- [x] Keep generated files outside the repo. Re-runs must not overwrite reviewed evidence or change frozen splits without an explicit decision.

### 3. Verify sources, then engine outputs

- [x] Schema-check every source and target canvas using the pinned schema and retain validation failures.
- [x] Render each unchanged converted source through the real converter using that design's fonts/assets. Record real renderer calls, returned missing-asset warnings, and exact font lookups/fallbacks; require zero missing assets and zero font fallbacks for this batch.
- [x] Build a contact sheet of LICA's reference PNG beside the unchanged-source render. Inspect every pair and list differences. Preserve both source files and all diagnostic logs.
- [ ] After the explicit source-review checkpoint approval, run JD's `engine.resize` across all seven targets. Save JSON/PNG output and record crashes, duplicate/missing IDs, displayed-text changes, font changes, and rule violations. Do not judge layout quality at this checkpoint.
- [ ] Report counts, failures, command output, and contact sheet paths. Draft a short #7 comment for exact-text review; do not post it.

## Risks and limits

Font-weight mapping is intentionally lossy. LICA reference PNGs sometimes disagree with their JSON; source fidelity must be assessed visually. The real renderer wraps text and may differ from CSS measurements. Zero-size text/image frames are schema-valid but may still cause rendering problems. SVG rasterization and exact font-family naming are resource risks, separate from JSON conversion. JD's text refit currently measures with Solstice brand fonts; record resulting errors or warnings on LICA without changing his engine or claiming those metrics use each LICA font.

The sealed exclusion protects evaluation data; no tests require opening that data. Existing splits are seen development/validation families, not a new sealed test set. Real-renderer execution proves the path runs; it does not establish resizing quality.

## Checkpoint evidence

October 6, 2026, using the scratchpad Python 3.11.17 environment:

- Focused red run: **38 tests, 34 assertion failures, 4 passing schema controls, 0 errors, 0 skips**, exit 1. Every failure is `LICA official conversion is not implemented: scripts.lica_official is absent`. The test module imports successfully; converter assertions beyond that entry point will execute during the later implementation checkpoint.
- Full Python discovery: **113 tests, 34 expected failures, 79 passes, 0 errors, 0 skips**, exit 1. All failures belong to the new converter contract tests and have the same absent-module reason.
- `npm test`: **685/685 pass**, exit 0. The first sandbox run failed before testing because tsx could not create its IPC socket (`listen EPERM`); the approved run outside the sandbox passed.
- `npm run build`: exit 0; the build reports a chunk above 500 kB. No bundling changes were made in this checkpoint.
- `git diff --check`: clean. Added files are this plan, the test module, and its test-only schema helper. No converter module exists. The previous Express edit and both stashes remain intact.

Complete checkpoint 3 logs and exit-code sidecars are outside the repo at `../reflow-studio-spikes/lica-official-step3/`: `red.log`, `python-suite.log`, `npm-test.log` (sandbox failure), `npm-test-unsandboxed.log`, and `npm-build.log`. `README.md` there records reproduction commands and counts. Krush approved the plan and authorized checkpoint 4a.

Checkpoint 4a, October 6, 2026:

- A fresh baseline reproduced **38 tests, 34 absent-converter failures, 4 schema controls passing**, exit 1.
- Implemented `scripts/lica_official/__init__.py` with displayed-text and weight ledgers, exact component IDs, geometry and rotation, color alpha, explicit skipped-layout reasons, and metadata gates for all five sealed templates. The module performs no file or network I/O.
- Focused green run: **38/38 pass**, exit 0. Full Python discovery: **113/113 pass**, exit 0. Both runs have zero errors and skips.
- `npm test`: **685/685 pass**, exit 0, zero failures/skips. Used the approved run outside the sandbox because checkpoint 3 established the test runner's local IPC restriction.
- `npm run build`: exit 0, with the existing chunk-size warning. `git diff --check`: clean.
- Only the pure converter was added in 4a. Resource dependencies, font conversion, downloads, SVG rasterization, layout selection, and task generation await 4b approval. JD's engine, the TypeScript converter, existing corpus files, the Express edit, and both stashes remain untouched.

Complete checkpoint 4a logs and reproduction commands: `../reflow-studio-spikes/lica-official-step4a/README.md`. No new reusable skill is needed for this bounded checkpoint. Stop here for review.

Checkpoint 4b, October 6, 2026, authorized after 4a review:

- Installed fonttools 4.66.1 and brotli 1.2.0 into the scratchpad venv only. Converted 53 WOFF2 files from 31 families, including all 18 existing corpus font files; recorded each source, license, original hash, and TTF hash. Verified font tables, upstream loader registrations, and required glyph coverage.
- Prepared 413 original assets: 235 cached and 178 downloaded from LICA URLs. Recorded all URLs/hashes and verified saved bytes. There are 253 SVG and 160 raster originals.
- Proposed 30 additions across 10 categories and 26 templates, including 10 rotation-only layouts. Full list with template IDs, angles, and splits: `../reflow-studio-spikes/lica-official-step4b/proposal.md`. Proposed layout splits are 20 development / 10 validation; frozen splits remain unchanged. No tasks were generated.
- Raw-source screening exposes 12 blocked existing layouts: 10 with missing component IDs and 2 with justified text; some also have invalid geometry/font sizes. Nine existing layouts pass screening. Keep these blockers visible; no contract exceptions or replacement IDs have been authorized.
- **Stopped after two SVG rasterization failures.** Playwright's Chromium executable does not exist at its expected path; the repo browser cache is also absent. Both failures occurred at browser launch. No browser was installed and no SVG PNG derivatives were produced. An existing Chromium path or a new browser decision is needed before resuming.

Resource ledgers, scripts, verification, and failure logs: `../reflow-studio-spikes/lica-official-step4b/README.md`. Resource preparation is incomplete because SVG rasterization is blocked. The proposed selection awaits review before task generation. No production code, corpus data, or stashes changed in 4b; no commits or GitHub posts.

Approved continuation: four new regression tests failed before implementation, then 42/42 focused, 117/117 configured full Python, 685/685 npm tests and build passed. Chromium 153.0.8010.12 installed in the user cache. Forty-nine sources passed staging schema checks; A5 remains blocked and GL still lacks coordinates. Stopped again after two SVG size-check failures (source box 118.064 × 2; planned 237 × 4, actual 236 × 4). No final tasks, source renders, contact sheets, or engine runs. Evidence and remaining constraints: `../reflow-studio-spikes/lica-official-step5/README.md`.

### Step 5 source-review checkpoint (October 6, 2026)

- Approved proposal retained exactly: 30 additions; 18 existing sources after three explicit batch exclusions. All 1,148 metadata rows accounted for, including 17 sealed-family exclusions before data access. No split-lock or corpus changes.
- SVG red/green: three failing controls before the shared sizing module, then three passing controls and three exact real Chromium captures. Chromium 153.0.8010.12; fractional 118.064×2 source box produces 237×4 pixels. All 209 derivatives retain original/hash/source-box evidence.
- Final source/task checks: 48 sources, seven targets each, 336 tasks; pinned schema valid, source equality checked across all seven tasks and preserved through rendering.
- Direct real converter/renderer: 48 calls each, 1,205 exact hashed font lookups, zero missing assets, zero font fallbacks, zero fallback renderer calls. Explicit Archivo Black lookup alias retains the same mapped 400 bytes and is audited in each resource ledger.
- All 48 visual pairs reviewed across eight contact pages, with full-resolution checks for pairs 21 and 35: 29 material, 17 minor, 2 close at contact scale. Recurring shorter/finer rules, reflowed typography, photo crops, changed fills/highlights; some overlap. Causes are not assigned. This batch does not yet establish clean visual source fidelity.
- Final suite: 120/120 Python, zero skips; npm 685/685, zero skips; build exit 0 with existing chunk warning. Logs and all-pair difference list are in `../reflow-studio-spikes/lica-official-step5/`.
- Stopped at requested review gate. No batch engine run, expansion, commits, pushes, GitHub posts, stash changes, or Express edit changes.

### Source-fidelity triage plan (approved October 6, 2026)

Problem: the rasterizer’s exact PNG-size tests did not check visible SVG coverage. Pair 21’s raw horizontal-rule SVG has fixed root pixel dimensions and no viewBox, so it paints at source size inside a doubled image viewport. Several photo frames were assigned cover without source-fit evidence; pair 27’s raw JSON has no crop offsets. Pair 17’s darker overlay is an opaque rgb GROUP in the JSON, with no opacity property.

Scope: regression-test and correct SVG coverage/scaling, including fixed-size/no-viewBox inputs and original SVG stroke behavior; inspect one fill and one photo-crop case through raw JSON, converter, and renderer. Fix conversion defects with tests, log renderer or reference/JSON differences. Accept agreed weight/wrapping differences and PNG-only decoration; do not reconstruct missing artwork or change typography. Preserve prior evidence in `lica-official-step5/`; new generation/renders/reviews go in `lica-official-step5-triage/`. Original assets, source geometry, splits, sealed exclusions, and three blocked layouts remain unchanged.

Steps and acceptance:

1. Add a real-Chromium pixel-coverage regression: a full-box SVG must paint to all four output edges, with positive controls for viewBox SVG and correct doubled stroke coverage. Observe failure before touching the rasterizer. Normalize intrinsic root sizing and scale the rendered SVG to exactly fill the integer output viewport at deviceScaleFactor 1. Capture dimensions alone remain insufficient.
2. Trace pair 17’s fill/opacity and pair 27’s fit/offset mapping. Record raw properties, converted fields, upstream application, and a visual/pixel comparison. Add regression tests before any conversion fix; preserve opacity as one application per source property.
3. Rebuild resources/tasks and re-render all 48 candidates through the same pinned real renderer with zero missing assets/font fallbacks. Keep original and new SVG hashes and record dimensions/version.
4. Review the 29 previously material pairs and check all retained sources for visible overlapping text. Exclude any such design from the active batch with element IDs, evidence, and reason; retain its candidate files and review image. Accept/log typography and PNG-only differences separately from unresolved defects.
5. Rebuild the active contact sheets and list new counts and differences, while retaining the full candidate-review evidence. Verify schema/source preservation, pixel coverage, all hashes, real-renderer path, Python/npm/build checks, and untouched corpus/stashes/Express edit. Stop before JD’s batch engine. No commits.

Risks: viewBox normalization must not lose SVG fills/opacity or change non-scaling-stroke thickness after downsampling. Centered cover can change an image crop even when the raw JSON only encodes an image rectangle; inspect before selecting a fix. Reference PNGs can contain styling absent from JSON. Source overlaps require exclusion, not typography repair. Two environment/tool failures stop work; code bugs use the normal test/fix cycle.

### Source-fidelity triage evidence (October 6, 2026)

- Real Chromium coverage controls: fixed-root full box paints only 24×12 in 48×24 before the fix; stroke control also fails. Root sizing/viewBox normalization plus scaling the source viewport fixes both; six raster tests pass. Actual pair 21 alpha bounds improve from 502×3 to all 1003×6 pixels. Original SVG files retained, 209 new hashes/dimensions/version records verified.
- Fill trace: pair 17 has no raw opacity and specifies opaque gray. Converted/upstream opacity 1 is applied once; source-render sample pixels are 113 gray. Reference translucency is absent from JSON; logged and not reconstructed.
- Crop trace: pair 27 preserves frame and default centered cover. Raw JSON has no offset/position/crop field. Cover/fill/contain all differ from reference; a diagnostic vertical-offset search finds a closer crop but supplies no source-grounded mapping. No guessed crop or fit change.
- Text weight/wrapping accepted per element; @LOREMIPSUM backing and NOTIC. highlight absent from raw components accepted without reconstruction. All 48 packaged source JSON hashes match the preceding checkpoint exactly.
- All 48 candidates re-rendered through the real converter/renderer, 1,205 exact lookups, zero fallbacks/missing assets. 518 isolated transparent text masks screen overlap; two barber designs have direct glyph intersections, and CLIENTS still intrudes into the first caption region. The three are excluded with evidence and files retained.
- Active batch: 45 sources (15 existing + all 30 additions), 315 schema-valid tasks; 1,098 exact font lookups, zero missing assets/font/renderer fallbacks. No retained direct glyph intersections. All 48 candidates and 29 previous material pairs reviewed; active counts 18 material, 23 minor, 4 close. Remaining major typography differences can be accepted and still visually material.
- Required gates pass: Python 123/123 (six raster +42 converter +75 existing), npm 685/685, build exit 0 with existing chunk warning. Corpus splits, engine files, stashes, Express edit, and pinned upstream unchanged. Fetch found nine newer remote engine commits; no pull. Stopped before JD’s batch engine; no expansion or commits.
- Existing TDD/debugging workflows and the new coverage regression suffice; no new reusable skill needed.

### Engine execution checkpoint plan (approved October 6, 2026)

1. Compare pair 18’s raw fontSize/lineHeight against every converted text element. If a conversion defect is found, write a regression test before fixing and re-render. If mappings match, exclude the layout with raw/converted values and reason retained. Preserve accepted triage evidence.
2. Execute the unchanged local `engine.resize.resize` for all active task records and all seven frozen manifest targets. Pin local HEAD and every tracked `engine/` byte before and after; do not pull new remote engine changes into this run. Save JSON/PNG/trace/error artifacts in `../reflow-studio-spikes/lica-official-step5-engine/`, never overwrite sources or earlier checkpoints.
3. Test the reporting helpers with literal controls for missing/duplicate/extra IDs, Unicode text, font-family/asset changes, and rotated fully-off-canvas/newly-pushed classification. Record exceptions independently for each task and stage. Validate outputs against the pinned schema; preserve outputs even when rule/schema checks fail.
4. Render with the real upstream converter and each design’s own fonts/assets. Record exact font-byte lookups and real renderer calls. No fallback image path is permitted. Capture native warnings plus Python `text_fit` warnings/stdout/stderr per task. Record actual Solstice metric paths and their mismatch with requested LICA fonts separately from rendering fallbacks, without substituting metrics or editing engine files.
5. Use source renders from the accepted triage checkpoint (hash/resource trace verified), and create one source/output contact sheet per target plus full-resolution pairs. Check artifact coverage and dimensions only; do not make layout-quality judgments.
6. Report denominator, per-task exceptions and rule violations, schema results, renderer/fallback counts, output fully-off-canvas elements and newly pushed elements separately, warnings and measurement limits. Verify task/output/source hashes, all seven sheets, excluded IDs, and unchanged engine/corpus/stashes/Express edit. Existing Python/npm/build gates remain current because product code is unchanged unless pair 18 needs a fix. Stop after the report; no quality review, expansion, commits, pushes, or posts.

Off-canvas definition: compute the rotated element’s axis-aligned bounds about its center. Count it fully outside when it has no positive-area intersection with the target canvas; report zero-area frames separately. “Newly pushed” additionally requires positive-area intersection with the original source canvas. Engine/data exceptions are reported outcomes; two repeated environment/tool failures still stop execution.


### Engine execution checkpoint result (October 6, 2026)

- Pair 18 `3MbAZeH8FOua2e8ToFGR`: raw/converted font sizes match (48, 16, 14, 16, 11 px), as do reconstructed line heights (56, 22, 21, 24, 17 px). Excluded as directed for source/reference text-size mismatch; no converter change.
- Active batch: 44 designs (15 existing +29 additions; 10 rotation-only), 308 tasks across all seven targets. Local engine pinned at `fd215a0e4e2efb7dcc959bcb07703af3bc8d41f6`; newer remote `a305c22` was fetched but not pulled. All tracked engine bytes are unchanged.
- All 308 output JSONs pass the pinned schema and all 308 PNGs use the real renderer at native target dimensions. 7,570 exact requested font lookups match each design’s own font bytes. Zero task exceptions, protected-field violations, missing assets, font/renderer fallbacks, input mutations, or fully off-canvas elements.
- Off-canvas audit was made more precise than the initial AABB-only plan: clip each rotated element rectangle against the canvas, count zero-area intersections as fully outside, and report AABBs as evidence. Eight literal audit controls pass. Every saved output also matches a fresh untraced engine run.
- `text_fit` used SolsticeSans metrics silently for 78 tasks / 27 requested families. Four `no candidate meets the floor` warnings (leaderboard ×1, skyscraper ×3) retained uniform scaling; these are separate from renderer fallbacks. Every request/path/warning is logged.
- Seven contact sheets each contain 44 unchanged source/output pairs, with full-resolution PNGs, JSON and task audits linked from the gallery. Sheet content/coverage verified; no quality judgment.
- Evidence: `~/dev/reflow-studio-spikes/lica-official-step5-engine/README.md`, `summary.json`, `artifact-verification.json`, `contact-sheets/gallery.html`. All outputs remain outside the repo. No production code changed for this checkpoint; accepted triage Python 123/123, npm 685/685 and build evidence reused. Existing Express edit, both stashes, corpus splits and pinned upstream preserved. No commits/pushes. Stop here.
- Skill assessment: existing verification and real-renderer audit workflows cover this checkpoint; no new reusable skill is needed.


### Final report checkpoint plan (step 6, approved October 6, 2026)

Write the final report outside the repo, using the accepted conversion and execution evidence. Include category/split composition, seven selected-design exclusions plus sealed refusal counts, accepted source fidelity limits, all execution counts, Solstice metric requests and floor warnings, and exact local reproduction commands. Do not judge resized-output quality.

For every saved output, calculate the canvas-clipped enclosing axis-aligned bounding box of rotated element frames, divided by target canvas area. All designs include a full-canvas generated background, so keep the literal all-element fraction and add a foreground fraction after excluding the generated background and ungrouped source-canvas-covering rectangles/cover images. Select excluded IDs once from each unchanged source and record them. Geometry includes blank space inside the enclosing box; it is not painted-pixel coverage. Minimum text size records the smallest nonempty text element’s requested font_size and actual integer glyph-font size (`int(fontSize)` in the real renderer), at native scale (1 output px per canvas unit); report no text as N/A.

Produce seven per-output tables, one per target (44 rows each), plus a compact per-target min/median/max summary for the unposted #33 comment. Check literal fixtures for rotated boxes, clipping, background exclusion, preserved non-background elements, native font scaling and text-free designs. Verify 308 distinct measurements, table counts, finite bounded fractions, all output/source hashes, and reproducible report bytes. Update the vault M1 note in place and add one final-report session line to the hub Log and today’s daily note. Draft #33 text and the proposed commit file list; preserve the pre-existing Express edit, engine, corpus, resources, stashes and generated artifacts. Do not post or commit.


### Final report checkpoint result (step 6, October 6, 2026)

Final report written to `~/dev/reflow-studio-spikes/lica-official-step5-engine/README.md`: 44 designs /31 families /11 categories, 32 development and 12 validation designs, all exclusions and accepted source fidelity limits, frozen-engine counts, 78 Solstice metric tasks, four floor warnings, exact reproduction commands and all seven contact-sheet links. Added seven per-output measurement tables (44 rows each) and exact JSON/CSV values. Literal all-element coverage is 100% because of generated backgrounds; foreground coverage excludes the recorded source-canvas-covering background IDs. Minimum text measurements include requested fractional font size and the integer glyph-font size actually used by the real renderer; three image-only designs per target are N/A. Sixteen scratchpad audit/measurement controls pass. Drafted `github-33-draft.md` and the seven-file `commit-proposal.md`; neither posted nor committed. Vault M1 state updated in place with one hub Log entry and one daily note line. No output quality judgment or production-code changes in this checkpoint.


### Portable pipeline and upstream reconciliation (approved October 6, 2026)

Goal: make the accepted 44-design batch reproducible from LICA data with one repo command. Preserve the pure converter, selection, split assignments, exclusion reasons, resource bytes, integer SVG rule, exact renderer font/asset checks and measurements. Keep prior scratch evidence intact. No generated data goes into the repo or a release until approved.

- `batch.py`: CLI, pinned approved selection/config, metadata-first exclusions (including sealed/spares), conversion, official schema checks, seven target tasks, manifest/attribution and byte accounting. One metadata disposition per input. Record skipped inputs and stop on selected-layout conversion/resource failures; never shrink the approved batch silently.
- `resources.py`: font/source/license manifest, cached-or-URL acquisition, WOFF2-to-TTF and glyph validation, hash-addressed blob store for all originals/derivatives/licenses, and the existing Chromium rasterizer. Store identical bytes once. No per-design binary copies; renderer registrations and asset IDs refer to shared hashes. Record URLs/hashes/source boxes, mapped faces/aliases, browser version and font provenance. Downloads are optional; offline rebuild uses explicit caches. Tool/environment failures stop after two attempts; code errors remain visible and are fixed.
- `render.py`: real converter/renderer with per-design font registrations from shared blobs, unchanged local engine import/hash pin, source/output audits, source/reference and source/output sheets, and exact coverage/font-size tables. Lazy imports keep CLI help and synthetic task-only smoke tests usable without the renderer. Keep the original fd215a0 execution evidence; after pull label any fresh run with its actual engine revision. Do not judge quality.
- Move the pinned stdlib schema validator to `schema.py`, retaining the test helper import as a compatibility wrapper. Add a frozen selection JSON and font-source JSON so a teammate needs no prior scratchpad files. Extend the shared rasterizer with a batch CLI without changing its existing functions.
- Tests first: entry-point help and fixture rebuild with two references to one asset, seven outputs, metadata-first sealed refusal, portable relative paths, idempotent hashes, byte accounting and input preservation. Reuse literal audit/measurement characterization controls. Keep existing converter/raster tests passing.
- Before pulling: fetch, record local/remote heads, engine/Express/stash hashes, and an external backup of the working files. Create a new include-untracked stash, fast-forward pull, apply that new stash, show any conflicts, and preserve both older stash objects. Rerun the full Python suite, npm test and build on the reconciled tree. Do not modify upstream engine files.
- Verify full rebuild with real Chromium/resources outside the repo; check accepted source geometry/text/font/asset-byte preservation, all 44 sources/308 tasks, exact face lookups/no placeholders, 308 measurements and seven target sheets. Hash all inputs/resources and repeat the task/resource build for deterministic bytes. Count package bytes as tasks plus every shared original/derived resource, then separately count metadata/attribution and the complete distributable input bundle. Exclude render/report outputs and caches from that package figure.
- If the complete input bundle is ≤25,000,000 bytes, propose `corpus/lica-official/` with CC BY attribution and separate font licenses. Otherwise propose a ZIP for a private GitHub release; do not copy to corpus, create/upload a release, or commit yet. Update #33 draft to repo code/report paths, retain the recorded leaderboard/skyscraper 1 px and 8–9 px median statement with its engine snapshot identified, and show the exact proposed commit file list excluding Express.

Rollback/preservation: old scratch snapshots remain authoritative for fd215a0. The new pipeline output is separate. Original source files, cache files and both older stashes remain untouched. The new stash is applied by object ID and retained until the user decides to remove it. No commits or posts.

Portable pipeline verification:

- Entry-point/storage controls failed first: two absent-entry-point failures and two absent-BlobStore errors. Implemented modules: all four pass. Two exact-font/native-render controls also failed first, then pass; the positive control builds a synthetic TTF without acquisition caches. Sixteen audit/measurement characterization controls now live in `tests_python/`.
- Fetched and preserved changes in `743436f196f3e3ae15b1cd9fecb3dc7f1352ae08`, pulled 23 commits from `fd215a0` to `a305c22`, reapplied with no conflicts. Older stash objects `0f91a07` and `262c63d` retained; Express diff byte-identical before/after. No commits/posts.
- Post-pull Python 154/154, npm 685/685, build pass with existing chunk-size warning. Full repo entry point generated 44 sources /308 tasks and rendered 44 sources +308 outputs through the real renderer with zero exceptions/protected-field violations/missing assets/font or renderer fallbacks/off-canvas boxes. All 44 source PNGs byte-identical to accepted evidence; all 308 outputs equal fresh untraced resize. Engine files unchanged during verification.
- Seven target sheets plus source/reference sheet and per-output tables rebuilt. Upstream pull changed 48 outputs; text_fit still measures 78 tasks with Solstice metrics and emits four floor warnings. Current leaderboard/skyscraper minimum text 1 px, medians 7/8 px; draft explicitly attributes the earlier 8/9 px to fd215a0. Output quality not judged.
- 458 shared binary blobs (63,151,953 bytes), tasks 2,910,121 bytes, combined 66,062,074 bytes; input bundle including metadata/attribution 67,218,312 bytes. Exceeds 25 MB: propose ZIP in a private GitHub release. No ZIP, release or corpus copy made. Generated data stays outside repo.
- Evidence, red/green logs, exact 18-file commit proposal and updated unposted #33 draft: `lica-official-pipeline/` in the external scratchpad. Rebuild command and portable artifact paths are documented in `scripts/lica_official/README.md`. Proposed commit excludes Express notes, engine files, generated data/reports and caches.
- Skill assessment: this workflow is covered by existing refactor/verification skills; no new skill needed.
