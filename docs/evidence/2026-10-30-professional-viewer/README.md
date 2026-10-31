# Professional viewer refinement — October 30, 2026

Runtime source: `2df7ac268c776c68d8f720c1bab04d342e942f85`. [Plan and test-first evidence](../../plans/2026-10-30-professional-viewer.md).

The viewer now uses restrained charcoal application chrome, consistent neutral panels, grouped artboard dimensions/actions, small format silhouettes and consistent button geometry. Desktop properties remain available during canvas review and scroll independently in short windows. Consolidated responsive CSS preserves mobile settings disclosure, full-size comparison and visible findings.

Reviewed screenshots: [desktop light](desktop-light.png), [desktop dark](desktop-dark.png), [mobile light](mobile-light.png), [320px baseline inspector](inspector-320.png). This is agent visual inspection, not independent human aesthetic acceptance.

## Validation

[Source-bound receipt](validation.json): 744 Node tests, 55 browser tests, [20/20 verification-page checks](browser-acceptance.json), build, 30 native layout checks, and the 30-case benchmark with 70 PNG/SVG/editable documents. Representative native serif-landscape and product-grid-square outputs were inspected. The benchmark retains zero selected errors and eight visible warnings.

Tests first reproduced the disappearing properties panel and the wrapped toolbar obscuring an artboard heading. Existing mobile/comparison characterization passed before styling. The first integration pass caught helper text below its 12px readability floor; it was restored before final acceptance. Final responsive review covers 320, 390, 820, 1025, 1280, 1440 and 1920px in both themes, plus keyboard access in a 600px-high desktop window. No page overflow or uncaught browser errors occurred; narrow inspection retains at least 380px for artwork.

The [production resource gate](production.json) passes on committed runtime source with external networking denied: local startup 301/85/98ms, sampled peak page heap 14.5MiB, retained growth 0.11MiB after 20 edits, and sampled summed browser RSS 520MiB. All configured budgets and recovery controls pass. These measurements include local browser/test overhead; they are not a speedup claim or reference-hardware guarantee. The existing 523kB main JavaScript chunk advisory remains.

Reproduce with `npm test`, `npm run build`, `npm run verify`, `npm run benchmark`, `npm run verify:browser`, and `npx playwright test --config playwright.production.config.ts`. Serve the production build on 4198 and run [capture.mjs](capture.mjs) for the screenshot matrix. Fresh output remains under ignored `reports/`; the linked files here are the dated snapshot.

## Limits and handoff

This change affects the viewer only. Python qualification remains attached to the previously qualified engine artifact; source conversion and layout-quality findings from other evaluations are not resolved by visual polish. No private designs or evaluation artifacts are published. Hosted CI was previously blocked by account billing and must be checked separately after publication. The existing repository workflow and capture tooling suffice; no new skill was needed.
