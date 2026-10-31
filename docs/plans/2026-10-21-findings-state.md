# Preserve findings during display toggles

Problem/evidence: Issue #9 asks that findings remain inspectable. The grid is rebuilt when Show issues changes, so an opened Inspect findings panel closes even though its card and findings remain. Comparison-mode toggles rebuild the same grid. This interrupts reading and keyboard use.

Behavior/scope: Keep an opened card's findings panel open when toggling the overlay or comparison mode for the same source. Preserve the normal closed state for unopened cards; changing designs should not transfer expansion to unrelated cards. No layout, diagnostics, or export changes.

Risk: Index-based state could leak to a different design or changed card set. Key the restoration to the same source/card identity and let new cards stay closed. A failed redraw must leave the previous grid intact.

Steps/checks: Add a browser acceptance assertion with an opened positive control, unopened control, overlay on/off and comparison mode transitions; verify it fails for the current interaction. Implement the smallest DOM-state preservation around the redraw. Run the focused browser check, full browser gate, `npm test`, `npm run build`, `npm run verify`, `npm run benchmark`, then inspect `/verify.html` and the affected interaction. Full Python gate was separately run for the preceding engine changes.

Execution: Before the fix, Playwright failed with `Overlay toggle closed the open findings`. Afterward, the focused browser acceptance passed. The test additionally confirms unopened cards remain closed and switching designs resets expansion. The first full browser run had 25 passes and a Playwright trace cleanup failure (`browserContext.close: ENOENT`) while another Playwright process competed for its artifacts; a serial rerun passed all 26 tests. Node passed 710 tests, build passed, native verify rendered 30 layouts, and the 30-case benchmark reported zero selected errors and eight selected warnings. The full pinned Python gate for the accompanying engine fixes passed 469 tests with zero skips. The browser checks are automated interaction evidence, not a human accessibility review.
