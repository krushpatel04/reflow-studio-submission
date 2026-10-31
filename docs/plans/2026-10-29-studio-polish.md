# Viewer clarity and performance follow-up — October 29

## Problem and evidence

At source `2c118f0`, the desktop viewer devotes space to promotional headings while four narrow previews make artwork hard to judge. UI helper text is 9–11 px; mobile uses two compressed preview columns. No native-size inspection exists. The workbench runs the TypeScript development engine, so polishing it must not imply that it renders the qualified Python submission. The user explicitly authorized viewer refinement and further measured engine performance work, keeping scope simple.

## Intended behavior and scope

Root owns `src/main.ts`, `src/style.css`, browser regressions and viewer evidence. Astra owns a separate measured Python font-work slice and its tests/plan. No new dependency, integration service, ML, corpus intake, native Express claim or resumed collaborator monitor. Preserve all existing edit, error/recovery, theme, findings, baseline and export behavior.

Use the existing Express-themed Spectrum components and Adobe's implementation guidance. Simplify the chrome into a compact header, practical control labels, neutral canvas surfaces and readable typography. Give desktop previews two generous columns, mobile one column. Add an accessible modal inspector with fit, actual-size and 200% views, scrollable oversized artwork, Escape/close and focus restoration. Render from the exact displayed source/variant/mode without mutating its geometry or polluting export. Keep the workbench/Python distinction visible once, in plain language.

## Risks and steps

1. Capture existing desktop/mobile screenshots and inspect the actual app. Define behavior tests before editing production.
2. Add browser regressions for keyboard opening/closing, fit and real dimensions, source/mode identity, accessible mobile sizing, no horizontal page overflow and preserved exports. Run RED against current code; missing inspector must be the expected failure.
3. Implement the smallest inspector and visual rewrite, retaining existing selectors for meaningful controls. Watch for duplicate SVG clip IDs, stale previews, keyboard traps, mobile overflow, misleading passing-status colors and changed export identity.
4. Run focused browser tests, existing complete browser acceptance including `/verify.html`, Node/build/native/benchmark gates. Inspect light/dark desktop, mobile and enlarged artwork. Ask Astra for adversarial visual/interaction review, address actual defects and repeat affected checks.
5. Integrate only measured engine improvements with full Python and clean-source offline qualification if runtime changes. Archive reviewed evidence, a bottleneck disposition and honest residual limits; fetch before small direct publication to main.

## Acceptance

All existing interactions remain functional. Inspector preserves artwork/text/element inventory and selected mode, shows native dimensions at 100%, stays within viewport with scrollable art, closes by Escape and returns focus. At 390 px, previews occupy one readable column and page chrome never overflows. No browser errors; complete required checks pass. Before/after screenshots demonstrate concrete visual differences; AI review is separate from human preference or finalist ranking. We cannot guarantee top-three placement or eliminate physical information-density limits. Remaining costs must have measured evidence or explicit compensation, not speculative optimization.

## References

- [Adobe implementation guide](https://developer.adobe.com/express/add-ons/docs/guides/build/design/implementation-guide): retain Express theme and Spectrum components; no new component dependency needed.
- Verification skill: follow edit → worker → displayed result → inspection/export. There is no application API or database in this flow.
- Existing regression/qualification tools cover this workflow; no new skill is planned.

## Test-first evidence

Initial two browser regressions failed against unchanged UI: missing Inspect Square action and mobile stage width 158px (expected >300px). Existing app initialized with four valid cards. RED log: `reports/studio-polish-2026-10-29/inspector-red.txt`.

## Viewer outcome

29/29 browser tests passed, including the 20/20 verification-page checks. Node741, native30, benchmark70 and production build passed. Root inspected desktop/mobile/light/dark and enlarged artwork; Astra independently accepted screenshots, code and live mobile keyboard/zoom/mode behavior. Exact test/source hashes and screenshot evidence are archived in the [viewer record](../evidence/2026-10-29-studio-polish/README.md). No UI engine-layout or export-format changes. No new reusable skill is needed; existing browser tests and offline qualification cover the workflow.

A further measured memory risk was found in the existing unbounded Python font cache. The engine lane now owns a separate test-first capacity bound and varied-size churn comparison before final qualification. This is a bounded extension of the user's bottleneck request, not a new caching layer.

Final combined Python gate: **544/544**, zero skips, 168.062s on bounded font-cache source. Production viewer smoke passed with external network blocked and local-server disconnect/retry controls. Clean-source qualification remains the next release gate.

## Final release gate

Clean-source Linux/amd64 qualification **PASS** on `5020706`: all public outputs unchanged, four negative controls, six failure cases, resources and fingerprint pass. [Final evidence and bottleneck disposition](../evidence/2026-10-29-final-performance/README.md). The source was clean; no gate bypass. Later documentation-only commits require matching runtime fingerprints.
