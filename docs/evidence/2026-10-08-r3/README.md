# R3: public LICA batch, DEV and VALIDATION splits on current main (engine head 7a30b88)

Run SHA `93d541c` (code: `render.run(raw=None)` + scripts here). Input: `lica-official-batch-1.zip` (sha256 `e5e210c289cdf002…`, verified by Coordinator). Log + exit: `logs/93d541c-r3dev.{log,exit}` (exit 0; originals in `~/.local/share/reflow-runtime/results/midnight-run/`).

## Method
- `extract.py`: whitelist, zip-slip safe, fail closed. Dev manifest built from `split == 'development'`; asserts 32 designs / 224 tasks / 0 validation / 0 sealed; 224/224 task sha256 match the manifest; 458 blobs hash to their names. Validation sources/tasks/ledgers were not extracted or read for this job. Old `reports/` was not extracted into the output dir; `analyze.py` reads the old ledger and outputs straight from the zip, labelled historical.
- `driver.py`: `render.run(bundle, None, upstream, schema)` (no reference images; the bundle ships none; they fed only `contact-sheets/sources.png`, which `raw=None` skips). One flock job, 224 tasks.
- `analyze.py`: counts per task from the new `task-ledger.json` vs the old (a305c22-era) ledger.

## Result (`dev-summary.json`, `dev-font-correspondence.csv`, `dev-geometry-delta.csv`, all 224 rows kept)
| | count |
|---|---:|
| tasks | 224 |
| real render success / exceptions | 224 / 0 |
| `font_binding` = bound | 224 |
| fit measured (metrics non-empty) | 52 |
| NOT MEASURED (bound, metrics empty: fit never ran) | 172 |
| hash-equal, over the 52 measured | 52 |
| hash-differs, over the 52 measured | 0 |
| tasks with an absent-face warning | 0 |
| old run (a305c22): measured tasks / of those hash-equal | 52 / 0 |
| geometry differs from old run | 49 (all 49 are among the 52 measured) |
| geometry identical to old run | 175 (all 172 not-measured + 3 measured) |
| max absolute element delta (x, y, width, height, font_size) | 1464.2 |

Hash-equal is counted only over non-empty metrics. A bound task with empty metrics means the fit never measured; it is reported as not measured, not as agreeing.

## What the geometry delta is
An engine-to-engine difference between the a305c22-era engine and the current engine (P6-P13 landed since, including real-face metrics). It is not a regression and not an improvement; no verdict is made. In the old run the 52 measured tasks used Solstice files for their metrics (0 equal to the renderer's face); now the 52 use the renderer's own hash-verified bytes.

## Limits
- Counts and deltas only. No quality, layout or fidelity claim; no reference images were available, so nothing is compared with the LICA references.
- The 52/52 hash-equal figure covers only the 52 measured DEV tasks; 172 DEV tasks were not measured. Validation is the same: hash-equal is counted over non-empty metrics only (below).
- Official `engine/main.py` flow unchanged; this is the LICA pipeline only. No `engine/**` change.
- Why 172 not measured is not analysed here: the fit only measures when a text falls below `FLOOR_PX` after scaling.
- Scratch host run; not Docker/Mac. Old-run comparison assumes the zip's `reports/` is the a305c22 output as its `summary.json` states.

## Validation split (run once, after Reviewer OK on DEV)
Same code as the DEV run (`render.py`, driver, tests unchanged since `93d541c`; run on HEAD `cb4f009`, which adds only `analyze.py` and evidence). `extract.py val`: 12 designs / 84 tasks, 0 development, 0 sealed, 84/84 task sha256 match, DEV files not in this bundle. One flock job, no re-run, no tuning. Log + exit: `logs/cb4f009-r3val.{log,exit}` (exit 0). Files: `val-summary.json`, `val-font-correspondence.csv`, `val-geometry-delta.csv`, all 84 rows kept.

| | count |
|---|---:|
| tasks | 84 |
| real render success / exceptions | 84 / 0 |
| `font_binding` = bound | 84 |
| fit measured (metrics non-empty) | 26 |
| NOT MEASURED (bound, metrics empty) | 58 |
| hash-equal, over the 26 measured | 26 (0 differ) |
| tasks with an absent-face warning | 0 |
| old run (a305c22): measured tasks / of those hash-equal | 26 / 0 |
| geometry differs from old run | 21 |
| geometry identical to old run | 63 |
| max absolute element delta | 1435.0 |

Same reading as DEV: the geometry delta is an engine-to-engine difference, with no verdict; counts and deltas only; no quality claim; no reference images; official `engine/main.py` flow unchanged.
