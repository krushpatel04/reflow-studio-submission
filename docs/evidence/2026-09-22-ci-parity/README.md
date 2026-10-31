# Fresh-checkout browser parity prerequisite — September 22, 2026

Plan: [CI parity and product grid](../../plans/ci-parity-and-product-grid.md). Base: `3772c3e`. This repairs the integration failure in [hosted run 35519242563](https://github.com/kj-squared-labs/reflow-studio/actions/runs/35519242563); the parity assertion is unchanged.

`npm run verify:browser` now generates native metrics first, overwriting any stale reference. CI retains `reports/font-parity/` alongside browser/native artifacts. Manual dispatch supports both existing real fault injections.

## Test-first evidence

- New isolated command regression: [red assertion](prerequisite-red.txt). The real browser suite listed successfully, but its native reference was absent. After the fix, an empty report directory and a deliberately stale reference both produce the same current 150-probe file.
- Clean browser run before the fix: [11/12, missing native reference](browser-red.json).
- Normal control after the fix: [12/12](browser-green.json), all 150 line-break probes agree using this [native reference](native-metrics.json).
- [Badge fault](badge-fault.json): 11/12; actual SVG glyphs leave their dark backing.
- [Parity fault](parity-fault.json): 11/12; `probe/repeated-whitespace` disagrees after its wrap box is narrowed. Neither control merely forces an exit status.

Local Node 24.20.0 / macOS arm64: 242 tests, build, all 30 native checks and benchmark pass. Benchmark counts remain 0 source/baseline/selected errors, 45 baseline / 14 selected warnings. All current source strings and the uncovered arrow warning remain.

[Hosted run 35753284135](https://github.com/kj-squared-labs/reflow-studio/actions/runs/35753284135) passed every step on exact commit `36b31fa73ea0cc80d1e24a43ef9b67e433e84a92` (Ubuntu / Node 24.20.0), including the normal browser control and evidence upload. The downloaded artifact contains `font-parity/native-metrics.json` and a passing 12/12 browser report. Both fault controls above were verified locally; no hosted fault run is claimed in this snapshot.

Reproduce with the commands in [CI setup](../../ci.md). These are synthetic development and renderer-integration checks; they do not certify aesthetics, multilingual support, or native Adobe behavior.
