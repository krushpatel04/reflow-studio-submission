# SVG URL association integration — October 9, 2026

Two requested URLs with identical SVG bytes and complete source boxes shared one render job, but only the first URL received a derivative link. Resources now retains each requesting URL separately, preserves the existing job identity and subprocess format, validates result bindings before publication, and attaches each exact URL/box/result once in deterministic order. Fonts, renderer geometry, rasterizer and schema are unchanged.

Base: `8d88e386e976dfac4594e182eaa8968093e03913`, branch `jo/svg-resource-associations`. [Plan](../../../plans/astra-svg-integration-2026-10-09.md). Production scope: only `scripts/lica_official/resources.py`; new regression file `tests_python/test_svg_derivative_provenance.py`. [Human transfer](https://github.com/kj-squared-labs/reflow-studio/issues/112#issuecomment-6073017959) was independently read. Root confirmed no-collision receipts before edits. Previous archive causality/alias-order proofs were reused, not repeated; those proofs do not establish historical run lineage or authorize archive metadata repair.

## Test-first result

| Stage | Result | Log |
|---|---|---|
| Current-main production, unchanged original19 tests | 10 semantic failures,9 passes,0 errors;0.061s | integration-red.log |
| Exact saved proposal | 19 pass;0.070s | integration-green.log |
| Five existing blob-store/raster-size controls | 5 pass;0.333s | integration-compatibility.log |
| New parent-review regression: missing last browser-version field | 1 semantic failure,0 errors;0.012s | atomicity-red.log |
| One targeted prevalidation correction | 20 pass;0.073s | integration-green-final.log |

Commands (repository root):

```sh
PYTHONPATH=. /tmp/reflow-audit-venv311/bin/python -m unittest tests_python.test_svg_derivative_provenance -v
PYTHONPATH=. /tmp/reflow-audit-venv311/bin/python -m unittest tests_python.test_lica_batch.BatchSmoke.test_blob_store_identical_bytes_has_one_file tests_python.test_lica_batch.BatchSmoke.test_existing_corrupt_blob_is_refused tests_python.test_lica_raster.RasterDimensions -v
```

New tests exercise normal Resources methods with actual temporary SVG/PNG blobs and mocked raster transport. They cover alias completeness, repeated and late requests, distinct bytes/boxes, raster assets, dimensions and result-integrity failures. They establish associations, not real rendering. The existing five compatibility tests do not open a browser. `git diff --check` passes.

The parent found that `chromium_version` was first read during the publication loop. Missing that field on the second result left the first URL linked before raising. The new twentieth test first reproduced this; final code reads the field into the already validated result tuple. This preserves the prior KeyError semantics and avoids unrelated field/type/version-consistency hardening. Final code therefore differs from saved candidate `aacef728...` by that targeted tuple correction only; original19 tests remain unchanged, plus one regression.

Binding checks are retained because fan-out must not label incomplete, hash-corrupt, malformed-PNG or dimension-invalid results as verified provenance. They do not add font/rasterizer behavior. This is not a filesystem transaction: an exceptional store-write failure can leave prior successful commits; unrelated concurrent mutation and general protocol/schema hardening are outside this change. The real subprocess emits a single Chromium version per run; this patch does not add cross-record version consistency policy. Old archived links are never inferred from hash similarity.

## Root/Steward qualification packet — not executed here

Transfer the exact two-path `reports/astra-svg-provenance/integration.diff` and this focused evidence/plan, hash-check it, and apply it to clean exact base8d88e386 or explicitly re-review current-main integration. The patch is approximately16KB; all focused transfer materials are under100KB, excluding existing source/cache/runtime dependencies. Preserve worker branches and prior evidence.

The sole existing Steward must verify its current guard identity/lease and execute any broader work through its existing `heavy_job.py` route; do not invent a launcher invocation or bypass the lease. Prerequisites: repository Node dependencies (`npm ci` only if needed under the lease), Python3.11 with pinned official requirements/Pillow/fonttools/brotli, pinned starter `a44a06046b0413f0785e7203955c3822e0acbc32`, CR renderer `a17e1fb9a732959dd6c21ae168d5ee09d74bd64f`, existing Playwright Chromium and qualified native shared libraries. Bind exact host paths/environment to the Steward's current receipts. No new installation, credential or route is needed merely for the focused mocks.

Inside that approved lease, minimal broader qualification commands are:

```sh
python -m unittest tests_python.test_svg_derivative_provenance -v
CHAMELEON_UPSTREAM="$PINNED_STARTER" python -m unittest discover -s tests_python -t . -v
npm test
npm run build
```

Root must review the full-suite scope before dispatch; these commands are a qualification request, not permission to broaden data reads. Timing is not estimated from mocks: only focused19/20-test and five-control durations above were measured. Full qualification requires the host's normal budget/timeout; stop on failure.

If root separately commissions the planned versioned **three-development-source association rebuild**, use the existing approved selection (`0qOFrrbBaTnaYeRoIlZE`, `0vxUdcOKbvrSVNSxRY4w`, `3jmFr3CGhibT4vc3KjI1`), frozen source/cache digests and a NEW output directory. Bind these placeholders to the already verified packet; do not substitute default batch selection or expand corpus:

```sh
python -m scripts.lica_official.batch --lica-data "$SCOPED_SOURCE_PACKET" --upstream "$PINNED_STARTER" --selection "$EXACT_THREE_SOURCE_SELECTION" --asset-cache "$VERIFIED_ASSET_CACHE" --font-cache "$VERIFIED_FONT_CACHE" --offline --tasks-only --output "$NEW_VERSIONED_OUTPUT"
```

`--tasks-only` still performs actual SVG raster resource conversion, so it requires the lease. It preserves the21-task inventory without running resized quality candidates. Review fresh same-run original/box/raster lineage and all expected URL links; compare original/source/task/raster hashes to old immutable evidence and investigate any changed bytes before substitution. Source image rendering, if needed, requires its own bounded approved command; do not run default batch rendering, which includes target reflow/quality work. No real rebuild or byte-parity result is claimed here.

No old quarantine, accepted bundle, eligibility or human-evidence record changed. Parent exact-patch review, guarded qualification, any versioned real rebuild and root publication remain distinct gates. No commits, pushes, PR or vault changes were made. Existing workflow suffices; no new skill.
