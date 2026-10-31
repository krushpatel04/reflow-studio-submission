# Prototype status

## October 30 — professional viewer refinement

The [viewer refinement packet](evidence/2026-10-30-professional-viewer/README.md) records consistent panels, grouped artboard controls, a persistent desktop properties panel and responsive toolbar clearance. Runtime `2df7ac2` passes 744 Node/55 browser tests, 20 verification-page checks, native/benchmark/build gates and the production resource/recovery test. Reviewed screenshots cover light/dark desktop, tablet and mobile. The engine and private evaluation findings are unchanged by this presentation pass.

## October 29 — ten additional viewer cycles

The [ten-cycle packet](evidence/2026-10-29-ten-cycle-viewer/README.md) records draft discard, keyboard entry, accessible dimension feedback, avoided redundant redraws, local inspector findings, keyboard navigation, mouse panning, persisted theme, export preparation recovery and sticky comparison tools. Runtime `18f9a52` passes 744 Node/53 browser tests, 20 verification-page checks and the clean-source production resource gate. Light/dark desktop/tablet/phone review preserves narrow artwork space. Python packaging remains unchanged; hosted-CI billing and human/organizer requirements remain external gates.

## October 29 — five additional refinement cycles

The [five-cycle packet](evidence/2026-10-29-five-cycle-refinement/README.md) records draft-loss recovery, bounded browser text reuse, custom-format removal, centered zoom and tablet refinement. Runtime `aa69240` passes 744 Node/43 browser tests, all 20 verification-page checks and the production gate. Native measurement calls decrease 35.5% with unchanged layouts/SVGs. The qualified Python engine remains unchanged; human/organizer gates and hosted-CI billing remain open.

## October 29 — measured refinement and artwork review

The [finalist-focused pass](evidence/2026-10-29-finalist-pass/README.md) reduces repeated exact font I/O and glyph queries without changing accepted outputs, makes mobile artwork visible immediately, adds in-preview baseline/reflow comparison and patches development dependencies. Clean-source Linux qualification passes on `8b0485a`; all public and compact PNG/JSON hashes are preserved. The packet records tests, local timings, screenshots and compensation for remaining bottlenecks. Registration, organizer/access facts and hosted-CI billing remain external requirements; no competition submission or ranking claim.

## Current scope — October 27

The active Stage 1 finish line is the Python offline engine: faithful editable JSON, legible official-renderer PNGs, reproducible packaging and final release qualification. Work is limited to the five rejected development layouts, demonstrated label readability, regression protection and submission instructions. See [the finish plan](plans/2026-10-27-submission-finish.md).

ML/ranker/scorer experiments (#19–22), campaign state/correction transfer (#14), creator storyboard studies (#10), corpus expansion (#31/#32), native/viewer feature expansion (#9/#30) and parallel TypeScript engine features are deferred from Stage 1. Existing tools, provenance checks, evidence and unique collaborator work remain available; historical checklists below do not add Stage 1 requirements. Retain the existing viewer until organizer clarification. The full native editable workflow remains finale work. JD explicitly retired deferred work from the active issue queue on October 27. Such issues close as **not planned**, preserving their unfinished criteria and evidence; they are not marked completed. The [issue disposition](release/2026-10-27-issue-scope.md) records every closure. [#35](https://github.com/kj-squared-labs/reflow-studio/issues/35) is the parent release rollup; assigned tasks #157–#160 structure the delegated Astra audit, Junho/Krush reviews and JD's remaining input/authorization decisions. Deferred feature work stays closed.


## October 20 — reviewed diagnostic and coverage correction

Condition-specific workload diagnostics reject unrelated Fontconfig warnings and incomplete/duplicate findings. Import coverage reports declared content groups and SVG/raster candidates separately, keeping busy-photo verification explicit. Frozen split characterization and bounded spacing evidence are retained. Independent scoped reviews passed;482Python/718integratedNode tests and build passed locally with zero skips. Hosted CI/publication remain separate gates. All28 baseline issues remain open; no parent completion follows. The separate startup candidate retains a50ms-gate failure and is excluded from this integration.


> **Current status — October 8:** See the [repository audit](repository-audit-2026-10-08.md) and [Python quick start](../README.md). The Python engine, real-renderer controls and packaging have merged. The [hosted OF-02 operational packet](evidence/of-02/README.md) was accepted at exact source `75f0ac12`; later source trees require separate offline proof. Independent visual quality remains open. The older entries below are historical; their paused-worker, unavailable-renderer and migration-pending statements are superseded.

## Official source and issue refresh — October 4

The [current source audit](evidence/2026-10-04-competition/README.md) adds the event page's October 9 info session and November 20 notification date. [Current planning](roadmap-2026-10-04.md) follows Adobe sources, using the FAQ's explicit eligibility authority while recording the event-page major restriction conflict. Eight affected issue bodies are synchronized; implementation status, ownership and acceptance evidence are preserved. No new starter revision or technical requirement was observed. The published release is still October 5; no final-release or compatibility certification is claimed.

## Historical competition refresh — October 1

Read both replacement PDFs directly in Adobe’s hub. The [source audit](evidence/2026-10-01-competition/README.md) and [October 1 roadmap](roadmap-2026-10-01.md) recorded the requirements then; the October 4 audit above supersedes schedule assumptions. Registration has an explicit October 4, 11:59 PM PST cutoff (source wording); finalist outreach is expected in November rather than specifically November 23. The challenge’s own submission FAQ now matches its engine-only deliverables; the unchanged starter FAQ still conflicts. Finalist-count, finale-freeze and hardware questions remain open. This is a documentation refresh, with no new adapter, renderer or quality evidence.

## Implementation status — September 26

The [September 26 roadmap](roadmap-2026-09-26.md) supersedes older qualification assumptions below. Official schema/renderer adaptation is the immediate #4 priority; the revised brief removes Stage 1 viewer submission while the starter FAQ still contradicts it. Native finale evidence remains pending. [Figma sourcing](figma-intake.md) completed two practice and two private sealed selections; the committed manifest still has zero admitted test families. The review exporter is landed; actual corpus rendering, source fidelity and human evaluation remain open. Later sections retain dated implementation history.

Prototype benchmark recorded September 15, 2026; engine contract updated September 16, 2026 (UTC).

Shared evidence: [all 30 visual comparisons](evidence/2026-09-15/gallery.md), [snapshot summary](evidence/2026-09-15/README.md), and [complete candidate results](evidence/2026-09-15/results.json). The dated snapshot includes every original and baseline/selected output as PNG, SVG, and editable JSON.

## Implemented

- Provisional editable document format with stable element IDs, text, images, shapes, explicit groups, and paint order.
- Identity/uniform baseline and vertical/image-text arrangement candidates.
- Locally measured typography, word-preserving font fitting, clipped SVG and native PNG rendering.
- Spectrum-themed comparison workbench with ten synthetic fixtures, headline editing, custom dimensions, findings, and editable JSON export.
- Reproducible 30-case benchmark with original/baseline/selected images and complete candidate results.
- Contributor instructions and a shared team plan.

## Recorded validation

- Nine invariant/regression tests cover identity, content/styles, graphemes, source layering, injected failures, invalid input, selection order, ordinary-word fitting, and SVG font-family quoting.
- TypeScript and the production browser build pass.
- All 30 native render cases complete. The September 15 report detects zero geometry/content errors for both baseline and selected outputs, with 42 baseline readability warnings and six selected warnings.
- Browser acceptance checks passed all nine checks after correcting SVG font selection and conservative font bounds. This included all fixture previews, edited-copy export, comparison mode, custom-size validation, theme state, issue overlays, all 30 benchmark rows, SVG text bounds, and startup errors. Subsequent source text-box adjustments were validated by the native run; repeat `/verify.html` after future changes.
- Readability warnings remaining in the native report concern product labels/prices in the square product design.

The selector uses the same diagnostics as the benchmark. These counts establish pipeline behavior, not independent evidence of aesthetic quality or competition performance. PNG/SVG output still needs visual review, particularly sparse layouts and product groups.

## Engine contract hardening — September 16

Issue #2 now has complete provisional structural validation, a separate caller-supplied resource boundary, and preservation checks for inventory, IDs/types, copy/assets, paint order, groups/roles, metadata and protected styles. Only canvas size, geometry, text size and rectangle radius may change; omitted opacity/alignment defaults compare semantically. See the [contract](design-contract.md), [test-first execution plan](plans/engine-contract.md), and [reviewed verification evidence](evidence/2026-09-16-engine-contract/README.md).

- 123 tests pass after three recorded red/green slices and additional boundary/immutability characterization tests. TypeScript and production build pass.
- All 30 native cases and the benchmark pass. All 70 editable documents and 70 PNGs match the September 15 archive byte-for-byte; no selected strategy changed. Counts remain zero baseline/selected errors, 42 baseline and six selected readability warnings.
- All five original evaluator fault injections now report errors. Missing font/focal data and invalid opacity fail structure validation; an unknown asset is structurally legal but fails the resource check before rendering.
- Representative rendered output was inspected. At #2 completion, the mixed-role invisible label and 8/10 stack/split selections after a one-pixel width change remained; the group fix below addresses the label separation. No visual-quality, performance, browser-acceptance rerun, or native Adobe integration claim is made.

## Coherent mixed-role groups — September 16

The ready group-geometry slice of #5 is implemented. Groups are resolved before role selection; labels and supporting decoration/background now share one rectangle transform. Purely non-content groups retain a coherent uniform fallback. A new `group-geometry` error detects independent movement or resizing, including moves that stay inside a backing plate. See the [plan](plans/grouped-layout.md) and [before/after evidence](evidence/2026-09-16-grouped-layout/README.md).

- The new tests first produced 8 failures / 3 passes; the new browser glyph check failed against the old engine. The complete suite now passes **134 tests**, and `/verify.html` passes **10/10** with no startup errors or glyph-bound findings. Native pixels and inspected browser/native images show the white badge text on its dark backing.
- Build and all 30 native verification cases pass. The benchmark's 70 design JSONs and 70 PNGs remain byte-identical to the archive, with zero errors and six selected product warnings. Candidate choices and sparse-fixture output are unchanged.
- #5 stays open: product-grid/candidate/ranking work depends on typography constraints from #3; no product-warning reduction, nearby-size stability, general visibility, or independent human quality result is claimed. Review/PR approval is optional and does not block the completed slice.
- Skills were loaded before work. The post-task assessment found existing verification skills plus repository plans/tests sufficient; no additional skill was created.

## Source-aware ranking — September 16

The nearby-composition implementation for #12 is landed with an aspect-aware source preference and continuous readability deficit. It retains all existing hard diagnostics and the same candidate generator/interfaces. See the [plan](plans/source-aware-ranking.md), [selection policy](design-contract.md#source-aware-selection), and [reviewed evidence](evidence/2026-09-16-source-ranking/README.md).

- **153 tests**, build, all 30 native cases, and **11/11 browser checks** pass after recorded behavioral red failures. A native-font gallery regression caught a failure missed by the mock measurer.
- In 182 nearby observations (156 non-identity resizes), rearrangements fall from 132 to zero; removing only the composition penalty restores 12 jumps. Across 2,422 distinct cases, 19 larger-format transitions remain, including a 0.6104 normalized product movement. This fixes the near-source failure, not global continuity.
- Original 30-case errors remain zero; warnings rise **6→11** as source preservation sometimes wins over font enlargement. All regressions and [30 before/after previews](evidence/2026-09-16-source-ranking/gallery.md) are archived. The additional nine authored outputs have zero errors/warnings but are development cases, not independent held-out evidence.
- Paired runtime medians on the original cases were 32.42ms previous / 32.97ms current, with identical generated candidates and diagnostics across all 117 pairs. No performance guarantee is established.
- #12 remains open for independent quality evaluation, better transition candidates, and real visibility/crop evidence. #5's typography-dependent product work and #8's runtime budget remain next engine work. Reviewer/PR approval is optional. Existing skills and repo scripts cover the workflow; no new skill was created.

## Main-branch regression gates — September 16

Issue #13's supported-runtime CI is implemented. Pushes to main, optional PRs and manual runs perform locked installation, **160 tests**, type/build checks, all **30 native cases**, benchmark evidence export, and real Chromium acceptance with **11 required browser checks**. Reports that are missing, incomplete, contradictory or failing cannot produce a passing browser gate. See the [CI guide](ci.md), [plan](plans/ci-regression-gates.md), and [reviewed failure/pass evidence](evidence/2026-09-16-ci/README.md).

- Characterization passed 153 tests before this tooling change. An actual badge-separation negative control failed locally and in GitHub Actions at the glyph-bound assertion; removing the fault passed all checks on the same engine. The failed run retained 229 evidence files, including browser screenshot/trace and native previews.
- Jobs, steps and browser tests have external timeouts. Logs, JSON and schema/font/runtime details are retained for 14 days, with compact reviewed evidence archived in the repository. A hard cancellation can still prevent upload.
- These checks do not certify aesthetics, general visibility, offline engine bounds, or Adobe integration. #8/#4 must add their conditional offline/official-renderer checks when those interfaces exist; #7's independent evidence remains separate.
- Direct commits to main continue without PR/reviewer approval. Existing verification skills and repository instructions cover future runs; no new skill was created.

## Measurement reuse — September 16

A bounded engine-owned slice of #8 now reuses repeated text measurements within immutable element contexts and avoids computing equivalent stack/split arrangements twice. It keeps all existing candidate entries as independent objects and retains their full diagnostics. The per-call cache holds at most 4,096 entries / 262,144 UTF-16 query units; this is **not** a runtime or process-memory bound. The typography/rendering interfaces and files are unchanged. See the [plan](plans/measurement-cache.md), [contract](design-contract.md#measurement-reuse) and [reviewed evidence](evidence/2026-09-16-measurement-cache/README.md).

- Behavioral tests first failed on 36 redundant requests and 85 repeated equivalent-arrangement contexts; three positive/invalid-input controls passed. After implementation, **178 tests**, build, **30 native cases**, benchmark and **11/11 connected-browser checks** pass.
- Both paired native runs preserve all **94 complete results** apart from timing. Native calls fall from 112,050 to 70,260 across 90 fixture pairs and from 465,300 to 227,000 for the 100-element dense case. The final run recorded 30.864→15.180 seconds for that dense case, still with all 100 readability warnings. Timing varies substantially across runs; the archive retains both runs and does not claim typical latency or a deadline.
- All **70 editable documents and 70 PNGs** match the prior archives byte-for-byte; errors remain zero and baseline/selected warnings **42 / 11**. Badge, serif, dense, product and sparse output was visually inspected. No independent aesthetic improvement is claimed.
- Implementation `90bc454` [passed hosted CI](https://github.com/ojedaJD/reflow-studio/actions/runs/35092538387), including native verification/benchmark and real Chromium acceptance. The reviewed job/browser excerpt is archived with the local evidence.
- #8 remains **open / In progress**: CLI/container and network-disabled/teammate reproduction, deadlines, cancellation/fallback, full load/parse/render/memory profiling and official limits are pending. #3 still has no font-parity handoff; #4/#7 integration/independent evidence and unfinished #5/#12 quality scope remain visible.
- Skill assessment: existing verification/browser skills, repository workflow and the new reproducible comparison script cover future work; no new skill was warranted.

## Font and text parity — September 19

Issue #3 is implemented. The browser and native renderers now resolve the same glyph coverage, uncovered content is reported instead of silently substituted, and a CI-gated browser check compares the two engines. See the [plan](plans/typography-font-parity.md), [contract section](design-contract.md#glyph-coverage-and-renderer-parity), and [reviewed evidence](evidence/2026-09-19-typography-parity/README.md).

- The browser loaded seven Inter subsets per weight while `scripts/native.ts` registered only `latin`, so Latin-ext/Cyrillic/Greek/Vietnamese text measured correctly in preview and fell back to a Skia default on export. `GlobalFonts.registerFromPath` does not merge files under one family name — only the first registration per `(family, weight)` is consulted — so each subset is now registered under a private alias and text is measured and drawn in runs by covering subset.
- A new additive `unsupported-glyph` **warning** reports text outside the bundled families' declared coverage, and reports right-to-left content as unsupported. The bundled `after-dark` fixture already depended on one such glyph: `ticket-label`'s `→` (U+2192) is in no Inter subset. Its disposition is an open shared-fixture decision.
- `fitText` now keeps a 0.5% proportional clearance instead of converging onto the wrap boundary. The figure is measured: Chromium/Skia relative width differences for supported single-line text have a median of 0.01% but reach 0.29% on strings dense with kern pairs, which Blink kerns and Skia does not.
- **241 tests**, build, 30 native cases, and **12/12 browser checks with 150/150 font-parity probes agreeing on line breaks** all pass, with both fault injections failing as required. Against unmodified `main`, 69 of 70 PNGs and 69 of 70 design JSONs are byte-identical; the one changed output differs by a single `fontSize` line (98.46 → 97.96). Errors stay 0/0/0 and candidate selection is unchanged. Warnings rise 42→45 baseline and 11→14 selected, entirely from the pre-existing arrow.
- This establishes renderer agreement on supported content from one browser on one platform. It is not multilingual support: bidi, complex shaping and colour emoji remain unsupported and reported, and coverage is derived from `@fontsource`'s declared `unicode-range` rather than a `cmap` read.

## CI parity repair and bounded product grids — September 22

The fresh-checkout CI gap after the font handoff is repaired: `verify:browser` regenerates the native reference and CI retains it. An isolated regression first failed on missing generation; a clean browser run reproduced the hosted failure. Normal browser acceptance then passed, while both actual badge/parity fault injections failed at their intended assertions. Exact CI commit `36b31fa` [passed hosted verification](https://github.com/kj-squared-labs/reflow-studio/actions/runs/35753284135); the downloaded artifact includes its native reference. See [CI evidence](evidence/2026-09-22-ci-parity/README.md).

The engine now reserves measured bookend text height before placing eligible explicit image/text groups in 1–3 columns. It retains rigid group geometry and the previous ranker, schema, alternatives and measurement reuse. See the [plan](plans/ci-parity-and-product-grid.md), [eligibility contract](design-contract.md#whole-product-group-grids) and [all-candidate evidence](evidence/2026-09-22-product-grid/README.md).

- Test-first failures covered small labels, missing four-product grids and measured headline allocation; a later mutation test caught and fixed shared bookend objects. **253 tests**, build, 30 native cases, benchmark and **12/12 browser checks / 150 parity probes** pass.
- Square products improve **7→0 warnings** (six labels/prices plus footer). Across 30 originals, selected warnings improve **14→7**, errors remain zero, and **68/70 documents and PNGs** are unchanged. Only square/story product selections change. The unresolved arrow warning remains.
- The 45-case development review retains all candidates and a grid-removal ablation. Sparse designs and healthy nearby observations remain stable. Product cases take **21.10→43.90 ms** median across 27 paired local observations; this is no deadline guarantee.
- #5 remains open: story/uneven-row ranking tradeoffs, long-headline square generation limits, internal group reflow, independent quality and teammate review remain. #7 still has no real corpus; reported importer-spike counts were not reproduced here. The font implementation findings are usable, while live #3 remains open. #4/#8 native/offline certification and #19–22 ML work remain open.
- Existing skills/repository tooling cover this workflow; no new skill was needed. No vault writes or collaborator messages were made.

## Four-product square row — September 22

A second bounded #5 generator slice adds a single-row four-column candidate only for four explicit image/text groups on near-square targets. It reuses measured bookend space and rigid group transforms; ranking weights, typography, resources and schema are unchanged. A valid authored source with a long headline previously selected eight small product names/prices in a square; the new candidate selects with **zero** small-text warnings and zero hard errors. The shorter four-product source also selects the row with zero warnings. Visual review caught smaller images on tall story targets, so this new row is omitted there and the existing larger-photo selection remains. See the [plan](plans/four-product-row.md) and [reviewed evidence](evidence/2026-09-22-four-product-row/README.md).

- Tests first: two genuine 8-warning regressions failed; a subsequent tall-story image-size control failed at 214.65px before the aspect gate. **258 tests**, build, 30 native checks, benchmark and 12/12 browser checks with 150 agreeing font probes pass afterward.
- All 30 original benchmark outputs are unchanged: zero selected hard errors, seven selected warnings, and all 70 editable documents/PNGs byte-identical against `b4ba15c`. Across 45 authored cases, only two square four-product selections change; removing just the new row restores every previous selection.
- The 18 paired local product runs measure 48.81→52.17 ms median and 45,738→47,868 native measurement calls. This is a cost observation, not an enforced deadline. No independent corpus or human preference result exists yet; #5 stays open for internal relationship reflow, broader generation, ranking and teammate review. #8 execution work proceeds separately.

## Four-product transition correction — September 22

The #12 review measured all generated alternatives at new product-grid transitions. At 1350→1351×1080, the four-column candidate was removed by an upper aspect cutoff, causing a 0.393 normalized adjacent movement on the short shelf and five small-text warnings on its long-headline variant. Removing only that upper cutoff keeps the row available and lowers adjacent movement to 0.00015; both sources select with zero warnings. The tall-story photo-size control and source-like wide selection remain unchanged. The [plan](plans/grid-transition-review.md) and [dated before/after evidence](evidence/2026-09-22-grid-transition/README.md) record all candidates, ablation, native images and runtime.

- Regression first: 20 passing / one expected failing focused test; final **266 tests**, build, 30 native layouts, benchmark and **12/12 browser checks** pass. All original 30 selected outputs remain identical to the previous engine, with zero errors and seven warnings.
- The lower 0.8 gate still causes a large discrete switch; removing it without a general quality measure would select much smaller photos on the tall story. This remains open in #12 with independent evaluation and actual visibility/crop work. No ranking weight or shared document contract changed. Existing verification skills covered this slice; no reusable skill was added.

## CLI regular-file boundary — September 22

Issue #23 now rejects FIFOs, directories and other non-regular CLI inputs before `readFileSync`, while accepting regular files and symlinks resolving to them. A real FIFO with no writer reproduced the pre-worker hang under an independent two-second test timeout before the fix. The focused suite is 8/8 green afterward, with structured exit 2 and empty stdout; existing size, JSON, resource and worker-deadline controls remain covered. See the [plan](plans/cli-regular-inputs.md) and [dated process evidence](evidence/2026-09-22-cli-regular-inputs/README.md). This completes the focused issue, not parent #8's official-contract or teammate-reproduction work. No container workflow changed.

## Next work, by responsibility

The [independent quality and ML plan](quality-and-ml.md) now defines the evaluation protocol and a bounded optional model experiment. #7 remains the immediate independent-evidence priority; #5/#12 need candidate-versus-selection diagnosis; #3/#6 cover rendered typography/visibility; #4/#8 establish model eligibility and offline limits. A model is not implemented or trained by this planning update. Use blind family-separated evidence and the documented keep/stop criteria before adoption. See the [planning record](plans/quality-ml-roadmap.md).

The [September 15 adversarial review](adversarial-review.md) changes the immediate priorities. Publishing that review did not fix the findings. Validation/preservation changes are recorded above; the other findings remain open. The historical [reproducible evidence](evidence/2026-09-15-adversarial/README.md) shows:

- A content label separates from its grouped decorative backing and becomes invisible, despite zero reported errors/warnings.
- In the historical snapshot, deliberate opacity, brand-color, group, paint-order, and opaque-cover mutations passed the evaluator; issue #2 now detects those structural changes.
- The historical snapshot had eight of ten fixtures choose stack/split after a one-pixel width change; the source-aware change above addresses near-source stability, while larger transitions remain.
- Historical incomplete validation allowed malformed font/focal/opacity values and unresolved assets into rendering; issue #2 now checks structure and resource availability separately.
- A deliberately dense 100-text-element input took 28.09 seconds in one local run; execution has no enforced budget.
- Independent quality evidence remains pending; main-branch automated regression gates are now implemented above. Native editable round-trip and durable campaign state remain unimplemented.

| Work area | Next concrete task | Acceptance evidence |
| --- | --- | --- |
| Engine — ojedaJD | Continue product/group layout after #3, improve source-aware stability, and bound runtime | Regressions derived from the review; held-out comparisons and offline execution evidence |
| Typography/rendering — JunhoHwoang | Verify font parity, visible content, contrast, crops, and intentional layering | Mutation detection plus browser/native rendered evidence; retain legal overlaps |
| Evaluation/integration — krushpatel04 | Establish independent evaluation and prove native editable round-trip behavior | Separate corpus/review protocol plus read → transform → apply → edit → reopen/undo evidence |
| Product validation — krushpatel04, all review | Test the campaign-correction storyboard with three creators | General workflow feedback, independent of the family-business story; no unmeasured performance claims |

The [pinned GitHub roadmap](https://github.com/ojedaJD/reflow-studio/issues/11) tracks owners, dependencies, and acceptance gates. Krush's family business is presentation context only; no business-specific engineering or evaluation work is required.

## Still pending

- Authenticated Adobe Express walkthrough and in-host add-on test.
- Adobe input/output adapter, official renderer, and offline submission container.
- Real editable designs and separate held-out design families.
- Inferred relationships, shared correction controls, and per-format exceptions.
- Manual mobile, keyboard, and accessibility review.
- Confirmation of competition eligibility and the released schema/runtime constraints.

The wide development workbench is not the final add-on UI. The next product decisions should follow the host walkthrough and creator observations.


## Shared focal crops and rendered visibility — September 24

Issue #6: SVG and native PNG now draw one shared, continuous focal crop (`src/crop.ts`) instead of separately quantizing focal points to three positions. `evaluate` adds source-relative `occlusion` and `low-contrast` errors, which see layers of any role in paint order and composite opacity. It also adds a `crop-loss` warning measured from actual asset dimensions, and a collision exemption that no longer covers a substantially grown overlap. See the [plan](plans/focal-crop-and-layering.md) and [evidence](evidence/2026-09-24-crop-layering/README.md).

- 20 new tests (crop geometry and native pixels; paired defect/legal-layer controls) failed first for behavioral reasons, then passed. The suite has 395 tests; build and native verify pass.
- Browser acceptance passes 13/13, including a new SVG-versus-native crop check on 18 hand-derived samples. The `crop-mismatch` fault fails it as intended.
- Benchmark: selections are unchanged in all 30 cases, with 0 selected errors. Selected warnings went from 7 to 8 (one real `crop-loss` on `after-dark`/landscape). Only `edge-subject` images changed. Median layout time rose by about 2 ms.
- Phase 2 adds three pieces of evidence:
  - Findings carry a design-space `region`.
  - A rendered pixel check, independent of the geometric sampling, also covers text over imagery and glyphs clipped by their own box.
  - A 24-case author-labelled defect-control pack with frozen renderer, font and asset hashes for #7/#19/#20/#22.
- Phase 2 results:
  - Native rendered verdicts match the labels on 23/23 measured cases, and Chromium matches native on all 23 (largest share difference 0.009).
  - The geometric evaluator disagrees on 2 cases, both listed in the pack: text over a same-coloured photo region is missed, and a narrow crop that keeps the subject is over-flagged.
  - 406 tests pass. Browser acceptance passes 14/14, and the `rendered-mismatch` fault fails as intended.
- Limits:
  - The geometric evaluator uses line boxes rather than glyph ink, treats images as opaque, and has no contrast verdict over imagery. The rendered check covers the last one, but only for verification.
  - Thresholds are provisional, and there is no subject box.
  - Labels still await independent review, and nothing has been validated through the official Adobe renderer (#4 open).
  - `review:stability-runtime` already failed before this change.

## Roadmap and adversarial gap review — September 22

The [dated review](roadmap-2026-09-22.md) adds M2–M5 and scoped issues #25–#35. #23/#24 are closed with landed evidence; #7 now contains 21 external development/validation designs but no sealed test families. `npm run corpus:check` returned zero errors and one test-family warning. The review identifies numerical/Unicode boundaries, viewer execution/export, split drift, import accounting and source fidelity gaps. These are planned fixes, not completed functionality. Existing broad acceptance and conditional model/product gates remain; no new work was moved to In Progress.

## Corpus resource preflight — September 24

The first slice of [#33](https://github.com/kj-squared-labs/reflow-studio/issues/33)
now provides a hash-verified, bounded, offline corpus resource catalog and
`npm run --silent corpus:preflight`. All **21 sources / 147 source-target rows**
are catalog-ready. The report preserves conversion losses/provenance, records
failures instead of dropping cases, and skips sealed-test files before opening them.
See the [plan](plans/corpus-resource-preflight.md) and
[dated report, API handoff and evidence](evidence/2026-09-24-corpus-preflight/README.md).

- Test-first evidence covers the actual `missing-asset` boundary, source/resource
  hash drift, containment, byte limits, font bindings, source preservation and
  full matrix/CLI behavior. **447 tests** and build pass; `corpus:check` reports
  zero errors and the existing zero-test-families warning.
- Image types follow bytes, including WebP files named `.png`. **67/229** asset
  bindings still have unverified intrinsic dimensions. No bytes are transcoded
  and no source design is repaired.
- Catalog readiness does not establish image decoding, font registration/coverage,
  source fidelity, full corpus execution/rendering or quality. #33 stays open for
  that integration; #34/#20 remain the source-audit/review path. Engine, native
  renderer and teammate corpus files are unchanged by this slice.
