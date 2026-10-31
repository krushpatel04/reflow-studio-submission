# Engine refinement execution — October 29, 2026

## Problem and intended behavior

The [investigation](../research/2026-10-29-improvement-investigation.md) reproduced a 1px singleton-group legal line, decoration-sensitive campaign rejection and flattened hierarchy. It also measured redundant text fitting. JD authorizes implementation, review loops and publication. Improve these demonstrated failures without changing copy, fonts, assets, group IDs, element inventory or paint order. Keep existing conservative fallback for unsupported content. No ML, new service, native integration or blanket aspect-guard removal.

## Ownership and preservation

Root owns `engine/composition.py`, new `tests_python/test_campaign_robustness.py`, this plan, visual evidence and integration. Astra owns `engine/text_fit.py`, new search-efficiency tests and a separate plan; it must retain the existing uncommitted glyph-reuse optimization. Existing README/release notes and glyph regression are preserved and reviewed for integration; the unrelated independent audit stays untouched. No sealed inputs, old fleets or vault writes.

## Steps and acceptance

1. Add regression tests and run before production edits: singleton text retains group and becomes readable; a small extra shape no longer disables the campaign; dangerous shapes and genuine multi-element groups remain protected. Verify all source fields except allowed geometry, source immutability, measured ink, bounds and no new inter-group collisions. Include nearby targets, anonymous IDs and normal unchanged designs.
2. Allow singleton text into the existing copy lane while retaining its group ID. Carry extra shapes at their baseline geometry only if their rotated bounds clear all proposed foreground content. Never ignore large/occluding shapes or delete them. Preserve three genuine plate/label groups as the eligibility minimum.
3. Test source-relative text hierarchy on roomier banners before implementation. Try a small bounded source-derived type scale and retain the existing uniformly sized layout as a fallback if the enhanced arrangement cannot keep all existing text readable. Judge with the official renderer and reject visually worse candidates. Do not lower established supporting-copy thresholds.
4. Integrate Astra's exact-output search pruning with the existing glyph reuse. Focused tests first, then the full no-skip Python gate, Node tests/build, native verification and benchmark. Run suites sequentially where contention could create false timeouts. Inspect affected official PNGs and compare all existing public outputs and existing development fixtures; record intended differences.
5. Astra adversarial review of exact combined runtime; fix findings and rerun affected checks. Commit only owned/reviewed changes, qualify a clean disposable checkout of the commit using the full Linux/amd64 image harness (real-renderer controls, failure matrix and resource profile). Do not bypass clean-tree gate. Fetch and preserve concurrent main changes before pushing. Publish dated evidence and final source identity; CI and actual submission remain separate facts.

Risks: broader eligibility can introduce overlaps; source hierarchy can crowd supporting copy; pruning can skip a later successful strategy; performance claims can confuse layout and container time. Tests, rendered controls, bounded search and exact-source qualification address these risks. Stop when these bounded slices pass their checks and are on main; remaining aspect coverage/font-face caches are later refinements, not automatic scope growth. Existing workflows cover this task; no additional skill is materially needed.

## Test-first and review loop

- New quality regressions: initial helper-signature setup error corrected before implementation. Valid RED: 6 tests, 11 expected assertion failures (singleton/shapes/hierarchy), zero setup errors. Structural fix passed all but hierarchy. Hierarchy then passed 26 focused composition tests; added anonymous-ID/reversed-order, unsupported tracking and independent rendered ink checks (9/9 green).
- Astra flagged a genuine visual tradeoff: source-relative sizing reduced portrait supporting copy10→9px. Actual before/after PNG inspection agreed. Added a portrait regression (RED9<10), restricted the new hierarchy alternative to wide layouts, preserving existing tall output. This avoids broadening the candidate's aesthetic claim.

## Combined validation before source commit

- 37 focused composition/search tests passed; full Python gate **536/536**, zero skips, 167.291 seconds.
- `npm test`: **741/741**, zero skips; `npm run build` passes (existing >500kB workbench chunk warning retained). Native verification:30 layouts. Benchmark:70 PNG/SVG/JSON sets, zero selected errors,8 existing TypeScript warnings.
- All21 accepted development tasks rendered with exact font binding: no preservation failures or new fully off-canvas/degenerate elements; **21/21 PNGs byte-identical** to the accepted snapshot. All3 original public JSON/PNG pairs and the ordinary portrait are byte-identical to baseline.
- Actual official PNGs reviewed for singleton, extra decoration, roomy/nearby/short banners and portrait. Fixed singleton legal1→9px; decoration copy/labels6→9px. Roomy headline16→24px, body/labels16 unchanged, legal12px; short-banner headline9→13px with supporting9px. Portrait10px unchanged.
- Astra adversarial acceptance applies to composition SHA256 `70e0a7893d10cf69fe2b05329b5cf4e41b34e35791a9000632103c2182ee3a4d` and text-fit SHA256 `649e9db5221d91aa342b8d2936e3dc1fb82ce437857be773bbae7d72fe0058a1`. No blocker found; this is AI exposed-case review, not human or hidden-set acceptance.
- Clean-source Linux qualification and publication are next. Generated logs and images: `reports/engineering-refinement-2026-10-29/`. The dated release evidence will record the final result rather than assuming this local gate qualifies the image.

## Final combined outcome — October 29

[Refinement evidence](../evidence/2026-10-29-engine-refinement/README.md) supersedes earlier pending-qualification notes: clean source `126c186` passed the complete Linux/amd64 offline harness, including all controls, failure cases, resources and final fingerprint. Expanded nine-case smoke and 17 focused Linux tests passed; the latter needed a read-only test-only fontTools mount, with no production dependency change. Astra accepted the final source and rendered cases. These are local emulated checks; hosted CI is blocked by billing. No submission or human acceptance is claimed.
