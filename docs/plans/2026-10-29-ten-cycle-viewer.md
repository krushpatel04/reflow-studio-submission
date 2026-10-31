# Ten additional viewer improvement cycles

## Problem and scope
User requests another ten cycles, explicitly including the viewer. Baseline `85d90b0` is clean and synchronized with origin. Continue the existing workbench refinement; retain qualified Python output, source copy/assets and layout semantics. The local code shows missing draft-discard and keyboard edit actions, weak dimension feedback, redundant presentation redraws, limited full-size inspection controls, lost theme preference and repeatable duplicate SVG exports.

## Ten cycles and acceptance
Each cycle follows assess → regression/characterization → smallest fix → focused test → visual inspection. New tests run before production changes; meaningful failures are recorded below. No requirement for a cosmetic change when evidence instead calls for reliability work.

1. Discard unapplied headline text without changing committed previews/export; handle a pending update explicitly so a discarded request cannot commit later.
2. Apply a headline with Cmd/Ctrl+Enter; plain Enter remains a newline and unrelated inputs are unaffected.
3. Submit custom dimensions with Enter; mark/focus invalid fields, describe the error accessibly, and clear the invalid state after correction.
4. Avoid redundant active comparison/overlay redraws. Preserve SVG nodes, inspection/finding state and avoid worker work; genuine changes must still update.
5. Inspect issue overlays within the full-size preview, independent of the grid and exports, with honest issue counts.
6. Navigate formats and zoom by keyboard from the artwork viewport; do not hijack select or button keys. Provide a compact shortcut hint.
7. Pan enlarged artwork by mouse drag; preserve native touch scrolling and normal Fit behavior.
8. Remember explicit light/dark preference, honor system preference initially, and work when storage is denied or invalid.
9. Prevent duplicate exports while one SVG is preparing; show progress, restore controls after success/failure, retain exact clicked-snapshot behavior and visible errors.
10. Refine visual hierarchy and consistent artwork tool icons; keep desktop comparison tools reachable while scrolling. Inspect light/dark desktop/tablet/mobile, long content and narrow dialog without reducing existing artwork-space guarantees.

## Risks and safeguards
Draft cancellation must stop pending workers without altering the current campaign. Keyboard shortcuts must be scoped and preserve native controls. Persistent theme is the only stored state; do not save documents or drafts. Inspector presentation must not change source or exported results. Panning must release capture reliably and not interfere with touch. No-op guards must not hide genuine failures or suppress a font invalidation. Export controls must recover and cannot attach a stale result to a new card. Sticky tools must not cover focused controls or consume mobile artwork space. Keep the eight existing benchmark warnings visible.

## Ownership and gates
Single owner: main viewer, stylesheet, focused browser tests and necessary verification harness maintenance. Existing verification skill applies browser → worker → committed document/export checks. Run npm test/build, verify/benchmark with representative image review, all browser checks including `/verify.html`, and clean-commit production offline/resource/recovery tests. Performance claims require measured work reductions, not assumed latency. Record reviewed dated evidence linked from README. Fetch before publishing, preserve other changes, use the human Git identity. No external messages, competition submission, vault writes or account changes.

## Execution record
Cycles 1–10 implemented and reviewed below. Full local checks pass: 744 Node tests, 53 browser tests (including all 20 verification-page checks), TypeScript/production build, 30 native layout checks and the 30-case benchmark. npm audit reports zero vulnerabilities. The settled production capture passes at 1440/820/390/320px in light/dark, including a baseline inspector at least 380px tall at 320px. Reviewed desktop light, tablet dark, narrow dark inspector, serif landscape and product-grid square images. Zero selected benchmark errors; eight existing warnings remain. Clean-commit production resource measurements and final publication receipt are recorded in the linked evidence packet. No reusable skill is added: existing repository tests, capture script and verification workflow cover the procedure.

### Baseline RED — all ten regressions
`npx playwright test tests/browser/ten-cycle.spec.ts` on `85d90b0`: 10 expected behavioral failures. (1) Discard control absent; (2) shortcut leaves request status empty; (3) invalid width has no aria-invalid state; (4) identical presentation events replace markup and SVG nodes; (5) local inspector overlay absent; (6) PageDown leaves Square selected; (7) drag leaves scrollLeft 200 rather than 280; (8) initial dark system preference is ignored; (9) export remains enabled during delayed preparation; (10) desktop tools scroll offscreen to y=-140. Log: `reports/ten-cycle/red.log`. No production code changed before this run.

Cycle 1 GREEN: pending worker closes, campaign export stays identical, draft resets and keyboard focus returns to the editor. Reviewed recovered workspace screenshot.

Cycle 2 GREEN: Ctrl/Meta+Enter both apply exact copy; plain Enter remains a newline and does not alter exports. Reviewed draft/committed distinction and shortcut hint.

Cycle 3 GREEN: invalid dimensions identify/focus width, retain four cards and describe the error; corrected 800×600 submits with Enter and clears invalid state. Reviewed error-field screenshot.

Cycle 4 GREEN: duplicate active mode/overlay events now retain exact SVG nodes and markup with zero worker requests; genuine mode and font changes still refresh. Repeated inspector comparison retains its SVG/camera. Reviewed baseline inspector.

Cycle 5 GREEN: full-size issue overlay and honest count remain local across comparison changes; grid checkbox and campaign export remain unchanged. Reviewed highlighted baseline artwork and compact status strip.

Cycle 6 GREEN: PageUp/Down/Home/End navigate within bounds; 0/1/2 zoom from the viewport; native select keys remain untouched. Reviewed full-size landscape with shortcut/status bar.

Cycle 7 GREEN: a primary mouse drag moves enlarged artwork by the expected 80×60px, releases capture/cursor state, and Fit disables panning. Touch bypasses capture to keep native scrolling. Reviewed the panned 200% view.

Cycle 8 GREEN: initial theme follows the system, explicit choice survives reload, and denied storage produces no browser errors while the switch still works. Only theme preference is retained. Reviewed restored light theme.

Cycle 9 GREEN: delayed SVG preparation disables the clicked control with busy feedback; repeat clicks produce one download, injected font failure restores the control and visible error, and retry succeeds. Reviewed in-progress export state.

Cycle 10 visual follow-up RED: sticky tools remained reachable, but changing comparison moved the page by 239px. Added an exact scroll-position regression before fixing same-source redraw to preserve the current page position. Toolbar icons are decorative SVGs, so older tests must identify artwork via `.stage > svg` when inspecting geometry; their geometric assertions remain unchanged.

Cycle 10 diagnosis: direct mouse click retained y=239, but scroll-into-view moved to y=0 because root scroll-padding excluded the sticky toolbar itself. Removing root padding while retaining artboard scroll margins fixes both paths. Same-source redraw also explicitly retains page position. Existing inspector/export tests reproduced three strict-locator failures from newly added decorative SVG icons; narrowed only their artwork locators, preserving all pixel/geometry/identity assertions. Added dimension upper-bound, touch-event pass-through, invalid theme preference/system update and explicit download-event synchronization controls.

Cycle 10 GREEN and combined review: 30 focused/integration tests pass, including all ten new cycles, original inspector/export cases, mobile artwork visibility and the >=380px narrow-inspector guarantee. Toolbar icons keep accessible names; full-size preview status remains compact; desktop comparison retains scroll position. Full Node/browser/production gates follow on the combined source.
