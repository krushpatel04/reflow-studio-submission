# Corpus resource preflight — September 24, 2026

Issue [#33](https://github.com/kj-squared-labs/reflow-studio/issues/33), first slice.
[Implementation plan and test-first record](../../plans/corpus-resource-preflight.md).
[Complete dated report](report.json).

## Result and meaning

All **21 sources / 147 source-target rows** are `catalog-ready`: declared local
source/resource hashes match, supported file envelopes are recognized and every
image/font reference has an explicit binding. Source files and resource bytes are
preserved. The manifest SHA-256 is
`213a4fdba7eda5cb6ad5e5d63d46cc1cbe5589a67a9863d4e66ef4062f953eb7`.

This is preparation evidence. The corpus engine, font registration/glyph coverage,
image decoding, native/browser rendering, permissions clearance, source fidelity
and human acceptance have **not** been established by this report. All 21 sources
remain adapted, with their conversion losses retained. No quality wins are counted.

| Inventory | Observed |
| --- | ---: |
| Families | 10: 7 development, 3 validation, 0 test |
| Asset bindings | 229: 143 SVG, 57 PNG, 24 WebP, 5 JPEG |
| Font bindings across sources | 41, across 10 requested families |
| Asset dimensions understood by current geometry helper | 162 |
| Asset dimensions still unverified | 67: 38 SVG, 24 WebP, 5 JPEG |
| Blocked / skipped-test / unsupported-conversion rows | 0 / 0 / 0 |

Some files named `.png` contain WebP. MIME types now follow verified bytes. CSS-sized
SVGs are retained without adding or changing dimensions. Unknown intrinsic sizes
must be resolved and checked in the rendering integration before crop diagnostics
are trusted. Envelope checks do not prove that an image/font decoder accepts the
file; font filename bindings do not prove the embedded font family or coverage.

## Reproduce and consume

```sh
npm ci
npm run corpus:check
mkdir -p reports/corpus-preflight
npm run --silent corpus:preflight > reports/corpus-preflight/report.json
```

An alternative manifest uses `-- --manifest PATH`. JSON is stdout; errors reading
or parsing the manifest are JSON on stderr. Exit 1 means an invalid manifest or
blocked source; exit 2 means invalid CLI arguments. Skipped/unsupported cases remain
in the matrix even if there are no blocked cases. Exit 0 certifies no broader gate.
`corpus:check` remains the separate required split-lock/import-ledger check.

The loader API is `loadCorpusSource(root, source)` in
[`scripts/corpus-resources.ts`](../../../scripts/corpus-resources.ts). It returns:

- unchanged parsed `design`, source-scoped `resources` with no bundled fallback;
- verified file metadata, font bytes bound to requested family/weight pairs;
- asset MIME/dimension metadata, and distinct-path input byte accounting.

The caller must supply the matching measurer/renderer and register/verify these
fonts. Do not pair arbitrary corpus fonts with the default bundled native measurer.
The preflight command performs no font registration or engine execution. It opens
no sealed-test source/resource files, including when their paths are absent.

Default limits: 8 MiB manifest; 256 sources, 32 targets, 4,096 matrix rows; per
source 2 MiB JSON, 16 MiB per resource, 64 MiB distinct-path bytes and 256 resources.
Sources load sequentially. Reads reject nonregular files and resolved paths outside
the corpus root. These are file/work bounds, not a whole-process memory or runtime
guarantee. The first failing dependency blocks its source; later sources still run.
The SVG dependency check is conservative and is not a general SVG sanitizer.

## Validation

Local environment: Node v24.20.0, macOS arm64, locked `@napi-rs/canvas` 1.0.9.
Base implementation started at `80b86c9`; final checks include the independently
landed source audit at `3b5e606`.

- Before implementation: **406/406** existing tests passed.
- Loader red: **18 failed**, including the real bundled-only `missing-asset` control;
  loader green: **18 passed**.
- Preflight red: **11 failed** on missing accounting/CLI behavior; green: **11 passed**.
- Actual-format refinement red: **3 failed / 21 passed**; final targeted run:
  **35/35 passed**. JPEG/WebP bytes, CSS-sized SVGs and external-dependency controls
  establish behavior without modifying or transcoding the source assets.
- Full final suite: **447/447 passed**; TypeScript/production build passed.
- `corpus:check`: **0 errors / 1 warning** (no independent test families).
- Real preflight: **21/21 sources, 147/147 rows catalog-ready**. The JSON above retains
  every row, source conversion/provenance record and explicit evidence limitation.

A loader integration control exercises the existing real engine and SVG exporter
with a custom asset and an explicitly matching bundled Inter measurer. This proves
resource plumbing for that authored control only. No layout/font/native/browser
implementation changed; native benchmark/browser checks were not rerun for this slice.

## Remaining #33 work

Connect this catalog to source-specific font registration, coverage, measurement,
engine evaluation and production SVG/PNG export; establish dimensions for all formats;
retain failed/quarantined cases in each method's output matrix. Then combine #34's
source audit and #20's review bundle for the three-person pilot. Keep #33 open.
