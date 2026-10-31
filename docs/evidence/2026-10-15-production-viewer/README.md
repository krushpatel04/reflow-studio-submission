# Production viewer qualification — October 15, 2026

Scoped source `64fe972a15091a954a8fa1ee139aa87d53820e6f`; production request code remains `a184facd6dae2a981dbbc70fbe0583450410b222`. [Plan](../../plans/completion-issue30.md) · [raw report](report.json) · [run log](production-run.txt). This first bounded run passed its preregistered budgets and functional controls. **Issue30's broader startup-jank requirement remains a visible limitation:** the first startup had107ms and95ms main-thread long tasks. No claim that all tasks stay below50ms, no native Express/Adobe qualification, and no issue closure is implied by this snapshot.

## Build and offline functionality

Fresh `npm run build` output was served by local Vite preview. The measured context sends external HTTP(S) through an unavailable loopback proxy and bypasses127.0.0.1 for the local server. All10 fixture selections, editing, baseline/selected comparison and actual JSON/SVG downloads succeeded with zero external requests during functional checks. The deliberate forbidden request failed with `ERR_PROXY_CONNECTION_FAILED`. SVG output embedded its font data. Missing font startup, missing worker script and unavailable image-resource reference produced visible errors and recovered after reload/retry. Images are embedded in JavaScript; the image test checks runtime resource lookup, not physical loss of a separate image file.

Only index HTML and assets JS/CSS/fonts shipped; no corpus, training, review or report directories. Embedded artwork is included in JS totals. Gzip means the sum of each file compressed with Node zlib's default level6, not bytes transferred by a server. The planning Python baseline used a different default compression level; raw byte totals match.

| Category | Files | Raw bytes | Gzip bytes |
|---|---:|---:|---:|
| js | 3 | 543,580 | 93,581 |
| css | 1 | 19,992 | 3,911 |
| fonts | 68 | 1,059,820 | 1,058,173 |
| html | 1 | 497 | 327 |
| Total | 73 | 1,623,889 | 1,155,992 |

The2MiB raw/1.5MiB gzip budgets pass. The controlled budget-input excess is detected, and restoring the original raw measurement passes again; this is a validator sensitivity check, not a physically oversized build experiment.

## Timing and resource observations

Apple M1/8GiB, macOS15.4, Chromium153.0.8010.12, Nodev24.20.0. Navigation→ready startup samples:375.52, 82.13, 98.61ms. First context/browser HTTP cache was cleared; later reloads reused the context. OS/server/code caches are not reset. Startup budget3000ms passed; no percentile or universal cold-machine claim.

The post-ready interaction window lasted5456.60ms with no long tasks over50ms. Maximum measured visible request feedback was0.80ms against100ms. **Cold startup separately recorded107ms and95ms long tasks.** The broad avoidable-startup-task question is not resolved by the passing post-ready budget.

Across30 samples (250ms requested timer plus manual GC checkpoints), sampled page JS heap maximum was13,623,236 bytes against64MiB; sampled sum of owned Chromium RSS was516,456,448 bytes against1GiB. Page heap excludes worker/native/browser allocations; RSS double-counts shared pages. These are sampled maxima, not true continuous peaks or physical-memory totals. After20 edits and restoring identical fixture/copy/mode/overlay state, paired post-GC page-heap growth was62,316 bytes against5MiB. Small-run trend evidence does not prove absence of leaks or long-session stability.

## Reproduce and limits

Run `npm run build`, then `npx playwright test --config playwright.production.config.ts`; it starts a local preview server on127.0.0.1:4188. Standalone startup is `npx vite preview --host 127.0.0.1 --port 4188`. This qualifies the measured Chromium/macOS path only. Other browsers/OSes and file:// loading are unqualified. Local-server operation is required. The source and individual built-file hashes are in the raw report. Fresh reports remain separate under reports/.

Production cancellation acknowledgment was not separately timed in this packet; the same product code has the distinct development-browser issue28 evidence. Do not treat that as an additional production measurement.

No production code or dependency was changed for this packet. Independent review and final integrated/hosted checks are separate. Existing verification guidance covers the procedure; no new skill was needed.
