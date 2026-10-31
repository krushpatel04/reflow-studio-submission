# Live verification — October 29, 2026

Fresh local execution of source `d23cea0384dbd33274cb09fc530487f46c078c24`. **Python public-sample flow PASS; browser workbench flow PASS.** [Machine-readable evidence](summary.json) binds source, new Docker image, environment and observed checks. [Plan](../../plans/2026-10-29-live-verification.md).

## What was executed

| Boundary | Fresh result |
| --- | --- |
| Current source → package | Runtime fingerprint matches qualified engine `4da7bb45962dbe96403a8b15622e72251e064349`. Documented assembly and linux/amd64 Docker build pass. Prior qualified image was absent; this run built and recorded a new image. |
| Public inputs → Python → JSON/PNG | All 3 cases pass, 3 REAL renderer events, zero fallback, runtime network blocked, attempted input write refused and original input hashes unchanged. Repeated outputs identical. All 6 output JSON/PNG hashes also match the October27 qualified receipt. |
| Source preservation | Direct comparison retains element inventory/order (4,11,17), original non-geometry fields including text/font/assets/styles, and exact requested canvas sizes. |
| Workbench build and browser | Build passes; 27/27 Playwright tests, no skips or flaky tests; verification page 20/20, no browser errors. Tests cover editing, validation, cancellation, exports, failure visibility/recovery and mobile keyboard selection. |
| Production/offline browser | 1/1 passes with external networking denied and a verified network-failure control; all 10 fixtures, editable JSON/SVG export, missing asset/font/worker recovery and configured resource budgets pass. |
| Additional live interaction | Headline edit reaches downloaded JSON; invalid zero width visibly rejected; 1600×600 custom size accepted; desktop and 390px mobile light/dark screenshots inspected. No console/page errors, failed requests or external requests; mobile document width equals390px. |

Image: `sha256:a0d2a46313b7d76d6815e496a2b2559f38b2729f61ce0ba0269b38e3ba9af79d`. Host: Apple M1, macOS24.4.0, Node24.20.0, Chromium153.0.8010.12; Docker linux/amd64 on an arm64 VM. This does not claim a native x86 or hosted CI run. Browser startup observations were440ms,94ms,115ms on this host; these are bounded observations, not performance guarantees.

## Visual review

- [Level1 portrait](level1_warmup.png): headline and CTA clear, no new copy loss or overlap observed.
- [Level2 wide](level2_core.png): header/body/CTA separated, product proportions retained. The source's decorative circle crosses the canvas edge; this is preserved source behavior, not newly introduced content loss.
- [Level3 banner](level3_advanced.png): all content retained, labels separated, small product and restrained intentional missing-badge placeholder. Text is still small at728×90; this is a disclosed format/readability limit, not a claim of ideal hierarchy.
- [Desktop edit](desktop.png), [mobile light](mobile.png), [mobile dark](mobile-dark.png): controls and previews render correctly. Two-column mobile cards make preview text small; inspect exported images at native size. A larger focused preview remains optional refinement.

## Reproduce and interpret

Follow the [README Python assembly/build procedure](../../../README.md#run-offline) using the pinned starter. Use a fresh context path outside the checkout and fresh evidence directory. This run assembled `../live-verification-2026-10-29-context` from `.cache/chameleon` and built tag `reflow-live:20261029-d23cea0`.

```sh
python3 submission/fingerprint.py verify docs/evidence/2026-10-27-readiness/package-fingerprint.json --inputs .cache/chameleon/input
python3 scripts/offline_submission_smoke.py --runtime docker --image reflow-live:20261029-d23cea0 --input .cache/chameleon/input --work reports/your-fresh-live-smoke --timeout 300
npm run build
npm run verify:browser
npx playwright test --config playwright.production.config.ts
```

Raw fresh logs, exports and the additional interaction script live under `reports/live-verification-2026-10-29/`; archived results above do not depend on overwriting older snapshots. Tests' own servers stopped. The separately shown production preview runs at `http://127.0.0.1:4190/` while this local session is alive; it is not a deployed service. `/verify.html` was exercised by the development test server, not the production preview.

No production changes were needed. Known build warnings remain: fixed Docker amd64 platform and a JavaScript chunk above500kB. The checks pass without changing thresholds. Full unit suites, failure matrix and Python resource profile were not rerun in this bounded live verification. Browser fixtures use the retained TypeScript engine; they do not exercise the Python engine through the UI. Native Express integration, unseen-design quality, organizer requirement resolution and actual submission remain separate. Nothing submitted.
