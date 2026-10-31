# Performance and viewer integration — October 29, 2026

Source candidate: **`5020706b9e56eef543731feedd8c67323ca02ba9`**. Engine change: `bd8a646`; viewer change: `5020706`. [Execution plan](../../plans/2026-10-29-studio-polish.md) · [Engine measurements](../2026-10-29-text-measurement-reuse/README.md) · [Viewer comparisons](../2026-10-29-studio-polish/README.md).

## Bottleneck disposition

| Observed cost or limitation | Decision and evidence |
| --- | --- |
| Repeated Pillow advances during one text-size trial | Reuse the same measured array for both wraps. Instrumented dense100 native calls fall 50,592→25,296; wrapping and Skia checks remain. All nine paired cases preserve complete output and warnings. Slice medians: public L3 49.6→39.8 ms; dense16 13.0→9.3 ms. These are local layout-only timings, not container latency or Adobe hardware. |
| Font objects retained without a limit across varied tasks | Cap the existing LRU at 128 entries. Three fresh-process paired trials cover 185 layouts each, with identical complete output/warnings. Varied-task retention falls 1,406→128; process RSS high-water approximately 240→128 MB. The 120 varied tasks cost an extra 39 ms median. This bounds entries, not total process bytes. |
| Redundant minimum-font trials and equal obstacle searches | Already removed in [the preceding refinement](../2026-10-29-engine-refinement/README.md); retain its regressions. No broader pruning that could discard valid layouts. |
| Small artwork thumbnails and unreadable viewer controls | Larger two-column desktop / single-column mobile previews, readable controls and a keyboard-accessible Fit/100%/200% inspector. Astra visual and live interaction review passes; existing export/recovery behavior passes all browser checks. |
| Worker failure or lost local HTTP server | Keep the last committed artwork and export visible; expose failure and Retry/Revert. Production smoke confirms recovery. The development viewer needs its local server for worker/font files; no service-worker/offline-app layer was added. The Python submission is independently qualified without runtime networking. |
| Main viewer bundle warning | About 514 kB /82 kB gzip, no new dependency; build warning remains visible. No measured startup failure justifies a framework replacement or speculative split. Local browser requests use bundled resources and the production flow passes with external requests blocked. |
| Official rendering/startup and other font-face work | Keep the pinned renderer and independent metric checks. Correctness and original asset/copy fidelity take priority over skipping rendering or substituting metrics. The final container resource receipt measures this separately from layout-only speed. |
| Dense content that cannot fit at a readable size, conservative medium-aspect fallback | Not solved by caching or UI polish. Preserve content, groups and conservative fallback, expose existing diagnostics, and enable native-size inspection. No claim that faster dense100 is readable or that all unfamiliar layouts are competitive. Broadening composition requires new independent visual evidence. |
| Intentionally absent public asset / renderer fallback risk | Preserve the input asset reference and its official placeholder; never fabricate pixels. Qualification requires real converter events, zero box-renderer fallback, immutable input and deterministic output. A PNG alone is not acceptance. |
| GitHub hosted checks blocked by billing | Run the complete local gates and clean Linux/amd64 qualification, preserve their exact source identity, and disclose that they are not green hosted CI. Account billing remains an owner action. |

The two new engine changes are small and preserve the existing algorithm. Timings for measurement reuse precede the separate cache bound; do not multiply independent speedups or omit the reload tradeoff. Churn comparisons bind the final bounded source. Native and container measurements run on Apple Silicon with Linux/amd64 emulation where stated.

## Integration checks

- Final Python: **544/544**, zero skips, 168.062 seconds.
- Node: **741/741**, zero skips. Build passes with the existing bundle warning.
- Browser: **29/29**, including the **20/20** verification-page checks. Production-build edit → worker → preview → inspector → export flow passes with no page errors or external requests, plus disconnect/retry recovery.
- Native workbench: **30 layouts**. Benchmark: **70 PNG/SVG/JSON sets**, zero selected errors and eight existing warnings.
- Astra reviewed the measurement/retention change and independently inspected actual desktop/mobile/light/dark images and modal keyboard/zoom/mode behavior. This is AI evidence, separate from human preference and hidden evaluation.

**Clean-source Linux/amd64 qualification passed** on `5020706b9e56eef543731feedd8c67323ca02ba9`, image `sha256:b1a97aa438e85db7971e2ffccf0702ff359bfaee5cef308d80bd14645e3f0fe4`: three real-rendered public cases, zero fallback, four biting negative controls, six failure-matrix cases, the resource profile and final fingerprint all pass. The clean-tree gate was enforced. All six public JSON/PNG hashes match the previous qualified runtime. [Qualification receipt](qualification.json) · [Package fingerprint](fingerprint.json) · [Validation summary](validation.json). No submission has been made; organizer clarification, registration confirmation and final owner authorization remain in the [release packet](../../release/2026-10-27-submission-review.md). The collaborator monitor remains paused.

## Reproduce

Follow the pinned setup in the repository README. Run `python scripts/verify_python.py` with `CHAMELEON_UPSTREAM`; run the existing npm test/build/verify/benchmark/verify:browser gates. The engine measurement and cache scripts are linked above. The production browser probe requires the built app served on loopback port4176, then `node docs/evidence/2026-10-29-studio-polish/built-smoke.mjs` from the repository root. It writes generated export/screenshot artifacts under `reports/studio-polish-2026-10-29/`.

No new service, native Express integration, model, dependency or scheduling was added. The existing plan/test/browser/qualification workflow covers these changes; no new reusable skill was needed.
