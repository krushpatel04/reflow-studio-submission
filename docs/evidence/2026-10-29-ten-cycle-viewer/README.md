# Ten additional viewer cycles — October 29, 2026

Runtime source: `18f9a52e096a52dafc3394c4e6551c812a8b5d32`. Starting source: `85d90b0`. [Plan and test-first record](../../plans/2026-10-29-ten-cycle-viewer.md).

These ten additional cycles improve the editing and inspection workbench. They preserve the Python submission engine and source content, assets and layout rules. Visual review is agent inspection, not independent human acceptance or competition scoring.

| Cycle | Reproduced problem | Delivered behavior |
| --- | --- | --- |
| 1. Draft recovery | Unapplied text had no direct discard action. | Discard restores committed copy, stops pending layout work, preserves the exported campaign and returns focus to the editor. |
| 2. Copy keyboard action | Cmd/Ctrl+Enter did not apply copy. | Both shortcuts apply the draft; ordinary Enter remains a newline. The helper exposes the shortcut. |
| 3. Dimension entry | Invalid dimensions were not identified on the fields; Enter did nothing. | Enter submits valid dimensions, errors focus and identify the invalid field, and corrected input clears the error. |
| 4. Redundant work | Re-selecting the active presentation replaced artwork nodes. | Repeated active comparison/overlay actions preserve the SVG nodes and markup, with zero worker requests. Font changes and genuine presentation changes still refresh. |
| 5. Local issue review | Full-size previews lacked their own issue overlay. | Inspector overlay and issue count follow the viewed comparison independently of the grid and exports. |
| 6. Inspector keyboard | Format and zoom changes required moving to the toolbar. | Page Up/Down, Home/End and 0/1/2 navigate and zoom from the artwork viewport; native control keys remain intact. |
| 7. Pan | Enlarged artwork could not be dragged. | Primary mouse dragging pans with grab feedback and reliable release; touch events retain native handling. Fit disables panning. |
| 8. Theme | Reload lost the chosen theme and ignored the system preference. | Explicit choice persists; initial state follows the system. Invalid or denied storage still leaves a working theme control. |
| 9. Export preparation | Repeated clicks could create duplicate downloads while fonts loaded. | The clicked export control displays progress and prevents duplicate clicks; success/failure restores it, and visible errors can recover on retry. |
| 10. Visual review | Comparison controls scrolled away; artwork actions lacked consistent icons. | Sticky desktop comparison, preserved scroll position, restrained line icons and compact inspector status improve review continuity. Tablet/mobile artwork remains prominent. |

[Desktop light](desktop-light.png), [tablet dark](tablet-dark.png), [320px baseline inspector](inspector-320.png), [export preparation](export-progress.png).

## Verification and performance

[Receipt and source hashes](validation.json): **744 Node tests**, **53 browser tests**, **20/20 verification-page checks**, build, **30 native rendering checks**, the 30-case benchmark and zero npm audit findings. All ten new regressions failed for the intended missing behavior before implementation. Integration also caught and fixed sticky-toolbar scroll jumps and artwork tests that included decorative SVG icons; their geometry assertions remain unchanged.

[No-op measurements](noop-counts.json) confirm that repeated active presentation actions preserve both exact markup and the original SVG node with zero worker requests. The export test observes one download during duplicate clicks and successful retry after an injected font failure. These are demonstrated reductions in redundant work, not an end-to-end speed percentage.

The [production resource gate](production.json) ran on clean committed runtime source with external networking denied. Startup observations were **272 / 85 / 114ms**; sampled page heap peaked at **11.8MiB**, retained growth after 20 edits was **0.11MiB**, and summed browser RSS peaked at **502MiB**. All startup, feedback, interaction long-task, memory and package budgets passed, including the over-budget negative control. Local browser/test overhead is included; these are not reference-hardware guarantees. The main JavaScript chunk is 523kB and retains Vite's size warning; measured offline startup, package and interaction budgets compensate for that current limitation.

The settled production capture covers light/dark at 1440, 820, 390 and 320px without page overflow or browser errors. The 320px baseline inspector retains at least 380px of artwork viewport; 200% zoom renders a 1080px square at 2160px. Representative serif landscape and product-grid square native outputs were reviewed. The benchmark retains **zero selected errors and eight visible warnings**. Mouse behavior and synthetic touch-event pass-through are tested; no physical touch-device validation is claimed.

## Remaining gates and compensation

- Python engine, requirements and packaging are unchanged from qualified source `8b0485acd90b0c23d1335c285f63a147117d44fa`, image `sha256:424c0eea2c0651e685e61694b2261fd14bef9096b2e19d9609bab6127ce9e51d`. Prior qualification remains attached to that artifact. This pass adds no new Python qualification claim.
- Hosted CI's last inspected baseline run `40987893465` could not start because GitHub account payments/spending limits blocked it; no steps executed. Full local gates provide development evidence while that owner-controlled restriction remains. Publication readback is separate from a passing hosted run.
- Eight synthetic warnings and unsupported/dense/impossible inputs remain visible. Local overlays, full-size comparison, source-preserving exports and conservative fallback support review without implying universal layout quality.
- Live issue checks confirm [human composition review #158](https://github.com/kj-squared-labs/reflow-studio/issues/158), [package reproduction #159](https://github.com/kj-squared-labs/reflow-studio/issues/159) and [organizer/access/submission facts #160](https://github.com/kj-squared-labs/reflow-studio/issues/160) remain open. Top-three placement and perceived Adobe-level quality require judges and human review. No competition submission or external collaborator message was made.

Reproduce with `npm test`, `npm run build`, `npm run verify`, `npm run benchmark`, `npm run verify:browser`, and `npx playwright test --config playwright.production.config.ts`. For screenshots, serve the production build on port 4198 and run [capture.mjs](capture.mjs). Fresh reports stay under ignored `reports/`; linked files are the reviewed dated snapshot. Existing repository workflow and verification tooling cover this repeatable procedure; no new skill was necessary.
