# Team workbench verification — October 27, 2026

Source `f51f92873a48db432d44b5d916ea95f9c0ce4a8d`, Node24.20.0, Chromium153.0.8010.12, macOS/AppleM1. Documentation-only edits were present during the run; application, dependencies, tests and runtime/package files were unchanged. [Machine-readable summary](verification-summary.json) binds actual observations and raw receipt hashes.

## Results

- Production build PASS; existing >500 kB chunk warning remains. No dependency or chunk-size limit was changed.
- Headless Chromium: **27/27 tests pass**, zero skips, retries/flakes or unexpected failures; 79.36 seconds. The /verify.html page inside that suite passed **20/20** checks with no page errors.
- Built production viewer: **1/1** test passes, covering all ten fixture selections, repeated edits, JSON/SVG exports, external-network denial with a failing network control, missing asset/font/worker recovery, and existing internal resource checks.
- Separate production visual smoke: 1440×1000 desktop and390×844mobile, light/dark, four preview cards, no console/page errors, failed requests or external requests. Mobile document width equals390px: no horizontal overflow.
- Raw/gzipped package:1,625,723/1,156,507bytes. Three observed startup times:479.9,247.0,239.6ms. These are a small local sample including Playwright overhead, not percentiles, cold-machine guarantees, Python timings or Adobe hardware results. Existing internal resource checks reported zero violations.

The first browser attempt failed before launch because a selected project-local browser cache lacked its executable. The corrected run used the already installed default cache; no assertion, timeout or product change was made. The failed setup log remains retained separately from the passing run. This is not behavioral RED/GREEN evidence.

## Inspect the actual viewer

[Desktop](desktop.png) · [Mobile light](mobile-preview.png) · [Mobile dark](mobile-dark.png)

These screenshots show **Two voices, one design** in the built TypeScript workbench. They were visually inspected: controls and preview boundaries are intact in both themes. At390px the preview grid uses two small columns; inspect original-size exported images for fine typography. A one-preview focus/zoom could be a later refinement, not a newly proven submission defect. The known unsupported-arrow SVG export fails visibly and has a passing recovery regression; do not silently alter source text to bypass it.

## Reproduce

Follow [CI local setup](../../ci.md#reproduce-locally) for Node and Chromium, then run:

```sh
npm run build
npm run verify:browser
npx playwright test --config playwright.production.config.ts
```

Use the same PLAYWRIGHT_BROWSERS_PATH for installation and execution if selecting a custom cache. The default suite regenerates native reference fixtures. Development tests own port4173; production tests own4188 and deny external network through the configured proxy. Both stop their servers. Native reference generation is distinct from Python official-renderer qualification.

For screenshots, serve the built dist with Vite preview, select type-pairing, wait for html[data-ready=true] and #canvas-grid[aria-busy=false], and capture at the viewports above. On mobile scroll the workspace heading into view, then repeat after switching theme. The separate smoke used localhost4190 and its server was stopped afterward. Raw reports remain in reports/ci/, reports/completion/C/production/ and reports/team-review-2026-10-27/; logs are under the parent ignored finish-report directory.

No production change was justified by these checks. The improvements delivered in this pass are actionable team instructions, shared evidence/notes, corrected manual-check guidance, and removal of superseded PRs. Final Python visual acceptance and official submission decisions remain in [the team checklist](../../release/2026-10-27-submission-review.md) and issue35. Existing workflows cover repeat verification; no new skill was needed.
