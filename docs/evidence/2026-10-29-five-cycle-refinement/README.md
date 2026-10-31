# Five refinement cycles — October 29, 2026

Runtime source: `aa692404da2083c4a25a38226b1fef9ff6fbec4c`. Starting source: `13e68161ddbd0ff21c036278e216f771c2c19a54`. [Plan and test-first record](../../plans/2026-10-29-five-cycle-refinement.md).

The five additional cycles refine the existing review workbench. They do not change the Python submission engine, source assets, copy, or layout selection rules. Visual inspection here is agent inspection, not independent human acceptance or a competition ranking.

| Cycle | Reproduced problem | Delivered behavior and evidence |
| --- | --- | --- |
| 1. Editing reliability | An earlier worker completion overwrote newer typing. | Later draft survives; unapplied-copy indicator distinguishes it from committed previews/exports. Test proves the export still contains submitted copy, then checks applying the draft and switching designs. [Screenshot](draft-preserved.png). |
| 2. Browser performance | Identical text/font queries repeatedly called native canvas. | Exact resolved-font/text reuse, bounded to 1,024 entries and 65,536 key code units. Loading/completion/error events invalidate it; pending fonts bypass retention. Tests cover font dimensions, mutation isolation, eviction and oversized bypass. All 30 complete layout results and 60 SVG variants match uncached canvas. |
| 3. Custom-format recovery | A reviewer could add a format but could not remove it. | Add/update/remove follows the same transactional worker flow. Failed removal retains exact campaign export; retry restores the standard three formats. Draft copy survives, and keyboard focus returns to Add after direct removal. |
| 4. Precise inspection | Zooming reset the viewport to the top-left. | Zoom preserves the artwork point at the viewport center, with edge clamping; Fit restores the entire artboard. Tests check both axes and round-trip zoom. |
| 5. Responsive polish | At 768px, the two-column/sidebar layout reduced square art to 200px. | Tablet artboards use one column and a larger stage, giving 390px square art; inspection/export controls reach 44px. Desktop retains two-column comparison. [Before](tablet-before.png) → [after](tablet-after.png), [dark](tablet-dark.png), [mobile](mobile.png), [narrow inspector](inspector-320.png). |

## Performance and fidelity

[Browser comparison](render-parity.json): native canvas calls for the same 30 layout cases decrease **27,549 → 17,773 (35.5%)**, with zero layout/SVG mismatches. This is reduced measurement work, not a 35.5% end-to-end speed claim. [Cache controls](measurement-counts.json) prove exact repeated queries use zero additional native calls while changed fonts/text still measure independently.

The [production gate](production.json) ran against clean committed source with external networking denied. Observed startup times: **299 / 99 / 92ms**. Sampled page heap peaked at **12.1MiB**, retained growth after 20 edits was **0.12MiB**, and summed browser RSS peaked at **480MiB**. All existing startup, feedback, long-task, memory and package budgets passed, including the over-budget negative control. Measurements include local browser/test overhead and are not reference-hardware guarantees. The 518kB main JavaScript chunk warning remains disclosed; the production package and responsiveness gates compensate for it.

## Validation

[Receipt and source hashes](validation.json): **744 Node tests**, **43 browser tests**, **20 verification-page checks**, build, **30 native render checks**, the 30-case benchmark, production offline/recovery/export gate, and zero npm audit findings. Benchmark: zero selected errors and eight retained warnings. Representative native serif landscape and product-grid square outputs were visually inspected. Existing warnings are not hidden to improve the result count.

Each cycle began with a meaningful failing regression. The broad gate exposed an older test-harness assumption: worker fault injection was calibrated using uncached viewer call counts. The viewer now caches those calls. Calibration now uses raw canvas beneath the same operation-local engine cache as the worker; rendering fault injection explicitly invalidates the font cache first. All original failure, retained-export and recovery assertions remain and pass.

The final screenshots cover light/dark at 1440, 820, 390 and 320px, without page overflow or browser errors. An immediate dark-theme capture caught an incomplete repaint; the reproducible [capture script](capture.mjs) now awaits Spectrum/font completion, two paint frames and disabled screenshot animations. Settled captures show intact artwork and readable controls.

## Remaining constraints and compensation

- The qualified Python source remains `8b0485a`, image `sha256:424c0eea2c0651e685e61694b2261fd14bef9096b2e19d9609bab6127ce9e51d`. Engine, requirements and packaging have no changes relative to it. Its prior real-renderer/public/compact output evidence remains attached to that exact artifact; no new Python qualification is claimed for this viewer pass.
- Hosted CI cannot execute until the owner resolves GitHub billing/spending restrictions. The inspected prior run `40985826233` had zero executed steps and the explicit billing annotation. Full local gates compensate for development verification, but do not turn hosted CI green.
- The eight synthetic warnings, unsupported glyphs, dense/impossible formats and unknown designs remain visible. Full-size comparison, preserved source/export and conservative fallbacks support review; these limits are not universal-quality guarantees.
- Organizer/viewer requirements, judge access, registration and submission authorization remain in #160; human composition and reproduction reviews remain #158/#159. Preserve the working viewer and reproducible qualified Python artifact while awaiting those facts. No submission or external collaborator message was made.
- Top-three placement and perceived Adobe-level design quality require judges and human review. These five cycles improve demonstrated failures and review ergonomics; they do not establish a ranking.

Reproduce with `npm test`, `npm run build`, `npm run verify`, `npm run benchmark`, `npm run verify:browser`, and `npx playwright test --config playwright.production.config.ts`. For screenshots, serve the production build on port 4198 and run this directory's `capture.mjs`. Generated files remain under ignored `reports/`; the linked files are the reviewed snapshot. No new skill was needed because the repository workflow and existing verification skill already cover these procedures.
