# Engine contract verification — September 16, 2026 (UTC)

Issue [#2](https://github.com/ojedaJD/reflow-studio/issues/2), based on main `e71bd95`. See the [implementation plan and execution record](../../plans/engine-contract.md), [supported contract](../../design-contract.md), and new test suites [structure](../../../tests/contract.test.ts), [resources](../../../tests/resources.test.ts), [preservation](../../../tests/preservation.test.ts).

## Tests before production changes

| Slice and command | Initial behavioral evidence | Green result |
| --- | --- | --- |
| `node_modules/.bin/tsx --test tests/contract.test.ts` | 67 failed / 1 passed. Missing font/focal fields, invalid opacity/colors and unknown fields raised `Missing expected exception`; null target raised raw `TypeError`. Previously detected bad inputs lacked category/path. | 77 total tests passed with original suite |
| `node_modules/.bin/tsx --test tests/resources.test.ts` | 9 failed / 1 passed. Missing assets/fonts and supplied capabilities were ignored by reflow; custom artwork failed SVG resolution. Bundled fixture control passed. | 87 total tests passed |
| `node_modules/.bin/tsx --test tests/preservation.test.ts` | 29 failed / 2 passed. Styles, groups, opacity, order and extras produced no protected-field findings. Existing copy/type/asset/removal/duplicate checks failed only the new path expectations. Valid candidate/geometry/layering controls passed. | 118 total tests passed |

Five additional boundary/deep-freeze/deletion characterization tests passed before behavior-preserving type/helper cleanup; the final suite passes **123/123**. `npm run build` passes. No failures were manufactured for characterization or documentation work. The execution record names the ignored full local log paths.

## Required checks and observations

- `npm run verify`: all **30** native layouts completed with PNG rendering.
- `npm run benchmark`: zero source/baseline/selected errors; **42** baseline and **6** selected readability warnings; selections identity 1, uniform 3, stack 19, split 7.
- [Output comparison and hashes](output-comparison.json): all **70 editable JSONs and 70 PNGs** are byte-for-byte identical to the [September 15 archive](../2026-09-15/README.md); no selection changed.
- `npm run review:probes`: [complete new observations](probes.json). All five protected-output fault injections now report errors. Missing font/focal fields and invalid opacity receive structure errors; the unknown asset remains a legal structural reference and receives a `missing-asset` resource error before native rendering.
- Visual inspection covered intentional-overlap/story, product-pairs/square, and the mixed-role-group probe. Layered text remains legible; product labels remain small. The known mixed-role white label remains invisible on white despite zero findings, matching the [historical example](../2026-09-15-adversarial/mixed-role-selected.png).

Node v24.20.0, macOS arm64, locked dependencies and bundled native Latin font files. Verification/benchmark/probe jobs overlapped, so recorded timing values are **not a latency comparison**. Browser acceptance was not rerun; the historical browser evidence remains historical.

Structural diagnostics now detect the extra cover because it changes inventory; they do not infer occlusion. Eight of ten fixtures still rearrange after a one-pixel width change. Group geometry (#5), visibility/contrast/crops (#6), stability (#12), runtime (#8), independent evaluation and native Adobe integration remain unresolved.

## Reproduce

```sh
npm ci --cache .cache/npm
npm test
npm run build
npm run verify
npm run benchmark
npm run review:probes
```

Fresh output stays in ignored `reports/`; do not overwrite this dated snapshot. Probe completion is observational evidence, not a quality pass. Documentation acceptance consists of relative-link checks, scope/field-policy review, and `git diff --check`.
