# First benchmark — September 15, 2026

A complete snapshot of the first 30-case experiment, ready to inspect from GitHub or a downloaded repository.

## Read the results

- [All 30 comparisons with images](gallery.md).
- [Complete results and candidate findings](results.json).
- [Original and output document JSON](designs/).
- [PNG previews and SVGs with embedded fonts](images/).
- [Source commit `65274b9`](https://github.com/ojedaJD/reflow-studio/commit/65274b9e944d075183164eb5b4caae4c3f0db1ae).
- [File hashes and sizes](manifest.json).

To use the side-by-side HTML report, clone or download the repository and open `docs/evidence/2026-09-15/index.html` locally. No server, account, or package installation is required to view that report. GitHub displays HTML source rather than running the report.

## Snapshot summary

| Measure | Uniform baseline | Selected layouts |
| --- | ---: | ---: |
| Cases completed | 30 | 30 |
| Geometry/content errors detected | 0 | 0 |
| Readability warnings | 42 | 6 |

Layout plus diagnostics: median **41.9 ms**, p95 **85.3 ms** on Apple M1, v24.20.0. One measured run per case; font loading and image rendering are excluded. Timings vary with machine and load.

The snapshot contains 10 original designs and 60 output designs, each as editable JSON, PNG, and SVG. `results.json` also retains the unselected candidates and all their findings.

The remaining six selected warnings concern small product labels/prices in the square product example. The same diagnostics select and evaluate candidates; these counts do not independently establish aesthetic quality or competitiveness. All fixtures and artwork are synthetic. Adobe integration and held-out evaluation remain pending.

## Reproduce

```sh
npm ci --cache .cache/npm
npm test
npm run build
npm run verify
npm run benchmark
```

Fresh output goes to `reports/latest/`. This dated snapshot remains unchanged for comparison. See [prototype status](../../progress.md) for browser checks and known limitations.
