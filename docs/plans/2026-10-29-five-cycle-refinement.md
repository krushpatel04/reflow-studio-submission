# Five-cycle viewer refinement

## Problem and evidence
The user requests five additional assess → improve → validate → visually review cycles after the qualified finalist pass. Starting source: `13e6816`. The qualified Python engine and its output stay intact; this pass targets the workbench used to inspect and demonstrate results. Current code resets the headline after every asynchronous commit, calls native canvas measurement repeatedly for identical text, cannot remove a custom format, resets zoom to the top-left, and squeezes two artboards beside a sidebar on tablet widths.

## Intended behavior and scope
1. **Editing reliability:** reproduce typing while an earlier layout is pending, preserve later draft text, and clearly distinguish unapplied copy from displayed/exported copy.
2. **Viewer performance:** characterize render output; bound and invalidate repeated exact browser font measurements. Demonstrate reduced native calls without changing measurements or rendered content.
3. **Format workflow:** let a reviewer remove a custom format, returning to the three standard formats with consistent export and request recovery.
4. **Inspection precision:** preserve the viewed artwork center during zoom changes, with sane clamping near edges and Fit recovery.
5. **Responsive visual review:** improve tablet artboard size and consistent tool spacing; inspect light/dark desktop, tablet, mobile, and the narrow inspector.

## Risks and acceptance
Draft changes must not leak into committed exports; intentional design changes still reset copy. Caches must include text, family, weight and size, stay bounded, and invalidate on font completion/error. Removing a format must use the same transactional worker flow and preserve prior results on failure. Zoom must avoid unreachable artwork or confusing scroll offsets. Responsive styles must retain all controls, readable findings, keyboard focus, and zero page overflow. No source assets, content, paint order, Python layout, or official integration claims change.

## Implementation and validation
Single-owner changes in `src/main.ts`, `src/typography.ts`, `src/style.css` and focused tests. Before each production change, run new regression tests and record behavioral failures here; characterization tests may already pass. Run focused green tests and capture the affected viewer after each cycle. Finish with npm test/build, verify, benchmark, complete browser suite, production performance/failure flow and `/verify.html`. Review representative generated images. Record measured evidence and unresolved external constraints in a dated snapshot linked from README. Fetch before small focused commits/pushes to main. No submission or external messages.

## Execution record
Cycles 1–5 completed; see the execution record and [reviewed evidence](../evidence/2026-10-29-five-cycle-refinement/README.md). Existing verification skill supplies the browser → worker → committed document/export checks; this local app has no API/database boundary. External CI billing, organizer facts, and human acceptance remain separate from local verification. Reassess them at handoff. A new reusable skill is unnecessary unless this pass identifies a procedure not already covered by repository scripts.

### Cycle 1 — RED
`npx playwright test tests/browser/five-cycle.spec.ts`: expected newer draft after the earlier request completed, received submitted copy. The failure reproduced actual input loss (log `reports/five-cycle/cycle-1-red.log`).

Cycle 1 GREEN: focused browser test passed; visually reviewed `cycle-1-draft.png`: later draft remains in the sidebar while the artboards show submitted copy. Design switching still resets intentionally.

### Cycle 2 — RED
`npx playwright test tests/browser/five-cycle.spec.ts -g "cycle 2"`: repeated exact measurement called native canvas again (1 instead of 0). Positive controls exercise text, size, weight and family, font reload/error, eviction, large-string bypass and returned-object mutation.

Cycle 2 GREEN: both focused tests pass. Native repeat calls 1 → 0, distinct font/text queries remain independent, both font events refresh, eviction and oversized bypass pass. Reviewed unchanged default artboards in `cycle-2-render.png`. Full rendering parity and production budgets remain final gates.

### Cycle 3 — RED
`npx playwright test tests/browser/five-cycle.spec.ts -g "cycle 3"`: custom format can be added but no removal control exists. Test checks failed removal retains export, retry returns three variants, later draft survives, and direct keyboard removal returns focus.

Cycle 3 GREEN: all three focused tests pass. Visually reviewed retained draft and restored standard formats in `cycle-3-formats.png`. Failed removal preserved exact campaign JSON; retry and keyboard focus recovery passed.

### Cycle 4 — RED
`npx playwright test tests/browser/five-cycle.spec.ts -g "cycle 4"`: zoom moved the viewed horizontal center from 0.5 to 0.2662 of artwork width. Regression checks both axes, round-trip zoom, and fully visible Fit recovery.

Cycle 4 GREEN: four focused tests pass; viewed center stays within 0.005 normalized units on both axes through 100% → 200% → 100%, Fit restores full artboard. Visually reviewed centered enlarged artwork in `cycle-4-zoom.png`.

### Cycle 5 — RED
`npx playwright test tests/browser/five-cycle.spec.ts -g "cycle 5"`: tablet square artwork is only 200px wide at 768px viewport; requirement is at least 360px. Before screenshot at 820px confirms cramped artboards and small tools. Adjust tablet columns/stage height and touch control sizes; retain desktop side-by-side comparison.

Cycle 5 GREEN: all five focused tests pass; tablet square area is 390px (previous 200px at 768px viewport), tools >=44px, desktop comparison preserved. Reviewed light/dark desktop/tablet/mobile and narrow inspector. One immediate theme screenshot caught an incomplete repaint; capture now awaits Spectrum updates, font completion and two paint frames. Settled art is present, including dark tablet.

### Broader gate follow-up
744 Node tests, build, 30 native layouts and benchmark pass (0 selected errors, existing 8 warnings). Browser parity confirms all 30 layout objects and 60 SVG variants match uncached canvas; native layout measurements decrease 27,549 → 17,773. Full browser gate revealed the fault-injection harness calibrated worker call numbers via the now-cached main-thread API (624 then 0); 19/20 page checks passed. Preserve its strict failure assertions: calibrate against raw canvas beneath the same engine operation cache used by workers, and explicitly clear viewer font measurements before native render fault injection. No production failure handling is relaxed.

Final browser rerun: **43/43 pass**, including **20/20 /verify.html checks** and all worker failures/deadlines, Unicode exports, source preservation, mobile interactions and six new five-cycle/parity tests. The calibration repair restores biting controls (no assertions removed). Build/audit pass; npm audit has zero findings. Production gate is run again against the committed runtime for exact source attribution.

Representative native type-pairing landscape and product-pairs square images inspected; existing dense layouts/warnings remain visible. No Python engine, requirements, submission packaging or Dockerfile changes relative to qualified source `8b0485a`. That existing image remains the qualified submission artifact; this viewer pass does not claim a newly qualified Python image. No new reusable skill needed; repository scripts and the existing verification skill cover the workflow.

Clean runtime production gate passed on `aa692404da2083c4a25a38226b1fef9ff6fbec4c`: zero budget violations, 299/99/92ms observed startup, 12.1MiB sampled page heap maximum. Reviewed snapshots and test/source receipts are linked above.
