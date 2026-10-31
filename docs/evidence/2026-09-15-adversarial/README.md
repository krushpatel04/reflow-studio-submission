# Adversarial evidence — September 15, 2026

This snapshot accompanies the [adversarial review](../../adversarial-review.md). It records failures in code commit `fd780591ecf48cd91d4c481002b18a4c67bad452`. Publishing evidence does not fix those failures.

## Contents

- [results.json](results.json): five deliberately corrupted outputs tested against the evaluator, four malformed input probes, one actual mixed-role group failure, and ten one-pixel width changes.
- [stress.json](stress.json): one local measurement each for 1, 10, 40, and 100 text elements containing 1,050 characters apiece in deliberately tight boxes.
- [manifest.json](manifest.json): file sizes, SHA-256 hashes, reviewed code commit, and runtime information.

| Source | Actual selected output |
| --- | --- |
| ![Mixed-role group source](mixed-role-source.png) | ![White label separated from dark backing](mixed-role-selected.png) |
| ![Original edge-subject design](one-pixel-source.png) | ![Substantial rearrangement after one-pixel width increase](one-pixel-selected.png) |

The [opaque-cover image](hidden-content.png) is a deliberately corrupted output. It tests a diagnostic blind spot; it is not evidence that the current engine spontaneously adds this cover. The mixed-role and nearby-size examples above are actual engine outputs.

## Reproduce

After installing the locked dependencies, run from the repository root:

```sh
npm run review:probes
# Optional, slower dense-text sweep:
npm run review:stress
```

Scripts: [probes](../../../scripts/adversarial-probes.ts), [stress](../../../scripts/adversarial-stress.ts). Fresh output goes to ignored `reports/adversarial-latest/`. These scripts collect observations; a successful exit is not a quality pass. Fixes should add failing-before/passing-after assertions in the regular test suite.

The published scripts preserve the original experiment semantics, use a fresh output directory, and include generation of all five example PNGs. On publication, the probe JSON and all five PNGs reproduced this archive exactly. The existing nine tests and production build passed. The stress script was type-checked; the single-run timings here remain the original measurements, not a new performance claim.

To reproduce the old behavior after the engine changes, use a separate checkout of the reviewed commit and copy these two review scripts into its `scripts/` directory. Use the reviewed commit's lockfile. Do not overwrite the archive with later runs.

## Interpretation and limits

Recorded environment: Node v24.20.0, macOS/Darwin arm64, `@napi-rs/canvas` 1.0.9, locally registered Latin font files listed in `scripts/native.ts`. Timing and rendering can vary across machines; CPU load, hardware model, and a repeated-sample distribution were not recorded.

The stress measurement starts immediately before `reflow()` after module/font/asset initialization. It excludes cold start, import, rendering, and export. The 100-element case took 28.09 seconds; this is neither typical latency nor p95 nor Adobe's time allowance.

PNG output is a capped-size preview from the local renderer. SVG and native paths share typography logic, so agreement is not fully independent evidence. No Adobe evaluator, authenticated native round trip, manual accessibility review, or held-out aesthetic judgment was reproduced here.

All examples are synthetic and independent of the family-business presentation story.
