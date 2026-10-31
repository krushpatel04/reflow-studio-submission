# Finalist-focused performance and viewer pass

## Problem and evidence
Baseline: `3d10c00bb6868c22937c507c910df9defbb09115`, fetched into a clean clone after the original checkout failed with missing Git objects. The current engine already has qualified compact-layout and measurement improvements. The review packet still labels `5020706` current despite the newer `14b9738` qualification. Mobile screenshots show an entire screen of settings before any artwork. Desktop previews repeat heavy card chrome; full-size inspection cannot compare baseline and reflow without closing the dialog. Python composition loads the same Skia face repeatedly during bounded size searches; profile before optimizing.

## Why it matters
Unambiguous source evidence, fast interaction and direct visual comparison help reviewers assess actual output. Top-three placement cannot be established by internal tests. Source fidelity, real rendered output and explicit limitations remain the acceptance standard.

## Intended behavior and scope
1. Measure remaining font decoding costs; reuse exact immutable faces only within one resize operation if worthwhile. Preserve every output, warning and metric policy; no new layout heuristic.
2. Make the viewer an artwork workspace: compact mobile settings disclosure, quieter artboard framing, purposeful toolbars, and baseline/reflow comparison inside the full-size inspector. Keep diagnostic and export functionality accessible.
3. Reconcile release pointers and record each bottleneck as fixed, compensated, or dependent on an external fact. No submission, collaborator messages, account/billing changes or vault writes.

## Risks and failure modes
Face reuse must not cross calls/face contexts, conceal corrupted files, grow without a bound, or replace exact renderer metrics. Viewer changes must preserve committed-state export, keyboard focus, mobile reachability, cancellation/retry, custom sizes and both themes. Changed engine bytes require fresh clean-source Linux qualification.

## Tests and acceptance
- Test first: unchanged full outputs with fewer font reads; different face/size/text, corrupted/missing resources, cache boundaries and cleanup on failure. Profile paired baseline/candidate runs without concurrent workloads.
- Browser regression first: first artwork visible on mobile, controls reveal and focus correctly; compare same target inside inspector without losing zoom or changing global mode/exports; source and custom-format boundaries.
- `python scripts/verify_python.py` with pinned starter, zero skips if engine changes; npm test/build/verify/benchmark, browser acceptance `/verify.html`, production interaction checks and screenshots at 1440/390/320px in both themes.
- Exact-source offline qualification and preserved public/compact output hashes if engine changes; reviewed dated evidence linked from README. Existing known warnings stay visible.
- Documentation links, candidate identity and remaining owner requirements checked against live source. No false claim of hidden-test quality or human acceptance.

## Implementation steps and ownership
Single owner for this pass: engine font-resource reuse, viewer main/style, targeted tests, evidence and release-pointer corrections. No shared schema changes. Inspect → tests/profile → smallest implementation → visual iteration → full validation → publish focused commits, fetching before push.

## Execution record
- Read vault entry/current focus/project context and repository instructions, README, progress and team plan. Historical notes guided discovery only; current remote state was freshly fetched.
- Applied the existing verification skill. Adobe Spectrum implementation/color guidance supports restrained surfaces and semantic accents. No new skill anticipated; assess at handoff.

+- Python RED: `python -m unittest tests_python.test_renderer_face_reuse` observed 507/157/747 font reads for three targets against three unique files. Three behavioral assertions failed; later-call/resource-corruption controls passed. Native-face sharing was rejected: 250×300 headline changed 10→9px in paired output checks. File-loader/data-loader separation did not eliminate drift. Accepted direction instead bounds exact file bytes and repeated exact glyph-query results per resize; native face construction and metric policy remain unchanged for distinct queries.
+- Query RED: repeated identical glyph measurements made six native queries for three distinct inputs. New test also checks fractional sizes, changed content and caller mutation. Boundary tests cover file count, byte/character budgets, nested contexts and exception cleanup.
+- Browser RED: mobile stage below viewport; corrected comparison test failed because Baseline was absent from the inspector. First comparison test used an invalid exact label locator; its setup failure is not behavioral evidence. Focused six-test gate passes after adding the comparison and mobile settings. Existing format-navigation checks caught a clone/index identity mistake, fixed with target-ID lookup; mobile keyboard regression caught duplicate listener registration, removed before acceptance.
+- Additional discovery: npm audit reports two high-severity development dependency findings (Vite 8.3.0 and source-map-js 1.2.1). Patch within existing major versions after running tests finish. Acceptance: audit has zero findings, locked reinstall, full Node/build/browser gates; Python runtime dependency set unchanged.
+- Public rules checked October 29: Stage 1 has no hard latency disqualification; quality comes first. Both JSON and official PNG are scored. No generated asset replacements or copy/family rewriting. https://github.com/jhaaj08/chameleon/blob/main/RULES.md

- Final candidate `8b0485a`: clean-source Linux qualification passes; all six public and ten compact JSON/PNG hashes match the prior qualified runtime. Full Python559/no skips plus eight focused tests (including one subsequently added equivalence test), Node744, browser37, verify-page20, native30, benchmark70 artifact sets, build and production resource/recovery tests pass. Patched Vite8.3.5 and source-map-js; npm audit zero.
- Three sequential alternating profile pairs preserve all ten outputs/warnings. Public L3 median36.7→27.5ms; compact formats improve6–19% locally. Distinct native faces retained; file/glyph caches bounded per resize. See the [reviewed handoff](../evidence/2026-10-29-finalist-pass/README.md).
- Visual iteration at320px first failed with362px artwork height; compacted the toolbar to reserve380px or more. Final desktop/mobile/light/dark production screenshots inspected. All existing findings and exports remain accessible.
- Skill assessment: existing repository workflow, verification skill and reproducible comparison script suffice; no new skill or vault update.
