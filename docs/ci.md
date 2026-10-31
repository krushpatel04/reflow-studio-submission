# Continuous integration

[Reflow CI](https://github.com/ojedaJD/reflow-studio/actions/workflows/ci.yml) runs on pushes to `main`, optional pull requests targeting main, and manual dispatch. It is automated verification, not a PR or reviewer requirement. Direct validated commits remain the default; optional branches use `jo/`.

## Python submission regression gate

`python-verify` installs Python 3.11, the pinned official starter, pinned renderer dependencies and `fonttools` from `requirements-python-test.txt`. It sets `CHAMELEON_UPSTREAM`, installs the existing Node/Playwright dependencies for LICA development raster tests, and runs `python scripts/verify_python.py`. Missing prerequisites, any failed test, zero tests or skipped tests fail the job. Logs are retained as `reflow-python-<run-id>-<attempt>`.

This checks Python engine behavior, genuine renderer/font regression controls and context assembly safety. It does **not** build/run the Python submission container or establish offline qualification. The other two jobs still cover the retained TypeScript workbench/internal CLI. Their success must not be presented as Python submission proof.

Local setup is in the [Python quick start](../README.md#development-and-verification). The upstream path is explicit; assembled-engine font lookup uses its own brand kit first and the explicit development checkout second. No private host fallback is consulted.

## Workbench runtime and checks

The [workflow](../.github/workflows/ci.yml) uses Ubuntu 24.04, Node **24.20.0** from [.node-version](../.node-version), a locked `npm ci` install, and Playwright **1.63.0** with its matching Chromium headless shell. Official checkout/setup-node/upload-artifact actions are pinned to verified release commits. The token has only `contents: read`; no repository secrets are required and checkout credentials are not persisted.

Every run performs three jobs. The existing TypeScript container job:

1. Builds the existing provisional image from the repository Dockerfile with an external five-minute child-process deadline and a seven-minute Actions step limit.
2. Runs the editable example with `--network none`, a 768 MiB container memory limit, 64-process limit and a 45-second external invocation deadline. It asserts the CLI schema, source/target, exact retained headline ID and copy, complete editable inventory, diagnostics and timing.
3. Runs malformed JSON under the same network/resource limits and requires structured `invalid-json` stderr, exit 2 and no editable stdout.

The existing verification job:

1. Unit/native regression tests, including protected-content mutations, malformed resources, coherent mixed-role groups, actual badge pixels, ID/scale/group-order controls, legal overlaps, and nearby-size stability.
2. Strict TypeScript checks and the production build.
3. The existing native verification command and benchmark export. Benchmark scores and PNG signatures alone are **not** the content/visibility gate.
4. `npm run verify:browser` first regenerates native font-parity metrics, native crop-parity pixels and the defect-control pack through its `preverify:browser` prerequisite, then runs headless Chromium on `/verify.html`. It runs all twenty required checks, including actual SVG glyph bounds, badge backing geometry, editable export, uncaught errors, 150 browser/native line-break probes, 18 browser-SVG/native-PNG crop samples inside and just outside image frames, and matching browser/native rendered-visibility verdicts on every defect-pack case. Generation failure stops the command. A separate validator rejects empty, incomplete, duplicate, failed, or contradictory reports even if their summary says success. Direct `npx playwright test` or a manual `/verify.html` visit requires `npm run font-parity && npm run crop-parity && npm run defect-pack` first.

Browser tests have no retries: a failing check stays visible. The test has a 90-second limit, the browser suite a 180-second limit, individual Actions steps have limits, and the entire job has a 15-minute external timeout. These do not impose a runtime budget on the engine itself; that belongs to #8.

## Failure evidence

Each run uploads `reflow-ci-<run-id>-<attempt>` for 14 days, including failed runs when the job reaches the upload step:

- `reports/ci/`: install/test/build/native/browser logs, Node/OS/schema/font/dependency metadata and lockfile hash, Playwright JSON, the page's browser report, badge/page screenshots, and traces on browser failures.
- `reports/latest/`: the native benchmark's JSON, editable documents, and representative/all benchmark PNG/SVG previews.
- `reports/font-parity/`: the freshly generated native reference used by the browser comparison.
- `reports/crop-parity/`: the freshly generated native crop pixels used by the browser crop comparison.
- `reports/defect-pack/`: the author-labelled defect-control pack (labels, evidence, frozen versions, case PNG/JSON) used by the rendered-verdict comparison.

The separate `reflow-container-smoke-<run-id>-<attempt>` artifact retains build/run command metadata and durations, raw stdout/stderr, parsed valid editable JSON, the parsed expected error, malformed input and the pass/fail summary. Its upload uses `always()` so an assertion failure still leaves the files created before that assertion.

Later checks use explicit conditions so an earlier assertion failure does not silently skip the remaining available evidence. Logs preserve command exit codes through Bash `pipefail`. Upload is best effort after forced job cancellation or infrastructure failure; inspect the Actions logs if no artifact is present. Generated output remains ignored under `reports/`; reviewed snapshots belong under `docs/evidence/`.

## Reproduce locally

```sh
npm ci --cache .cache/npm
npm test
npm run build
npm run verify
npm run benchmark
npm run ci:environment
PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npx playwright install chromium --only-shell
PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npm run verify:browser
node scripts/container-smoke.mjs
```

On Linux install the OS dependencies with `npx playwright install --with-deps chromium --only-shell`, as CI does. The browser runner owns port 4173 and refuses to reuse another server. It stops its server when the run finishes. On desktop environments that prohibit launching Chromium, use the connected browser for `/verify.html` and run the actual headless specification on the hosted runner; do not count a launch denial as a behavioral regression.

## Demonstrate a meaningful failure

From the Actions page, choose **Run workflow**, branch **main**, and fault **separate-badge**. The workflow should fail specifically at the browser badge glyph assertion, retaining the JSON and screenshot. Run again with **none** for the normal passing control. These runs use the same production engine.

The equivalent local negative control is:

```sh
PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright REFLOW_BROWSER_FAULT=separate-badge npm run verify:browser
```

Only the test page understands this fault. It moves a real output label outside its dark backing, reproducing invisible white-on-white content; it does not force an exit code or add a fault switch to the app/engine. Inspect the failed check detail, not merely the red badge in Actions.

The dispatch option `font-parity-mismatch` narrows a probe's actual wrap box and must fail the line-break comparison. `crop-mismatch` restores the former quantized focal point for one probe in the browser only and must fail the crop comparison on in-image samples. `rendered-mismatch` makes the browser measure one defect case (`label-off-plate`) against its own source and must fail the rendered-verdict comparison. Use `REFLOW_BROWSER_FAULT=<fault>` for the equivalent local run. Every fault control retains its native reference along with the browser failure artifacts.

For the container control, choose `container_smoke_fault: missing-content` while leaving the browser fault at `none`. The real network-disabled invocation still completes, then the validator removes the expected headline from its assertion copy and must fail with `expected editable output to retain headline element ID`; archived raw output remains unchanged. Restore `container_smoke_fault: none` for the passing control. The equivalent local command is `REFLOW_CONTAINER_SMOKE_FAULT=missing-content node scripts/container-smoke.mjs`; set `CONTAINER_RUNTIME=podman` when exercising the Dockerfile through Podman.

## What this does not establish

The corpus is synthetic development material. Native and browser checks share some layout logic; browser `getBBox` and native pixel assertions add useful rendered checks, but they do not prove multilingual glyph coverage or aesthetic quality. The occlusion and contrast findings are sampled geometry proxies with documented limits (line boxes, opaque images, no verdict over imagery), not pixel analysis. The sealed evaluation corpus/human protocol remains #7. The container gate proves that this provisional internal harness builds and runs on one hosted Linux image without runtime networking; it is not independent teammate reproduction, official Adobe compatibility, an official resource limit, or an aesthetic/rendered-output test. Those broader #8/#4 requirements remain open. Typography/rendering fixes should add their own meaningful regressions as they land.

The [implementation plan](plans/ci-regression-gates.md) and [September 16 reviewed snapshot](evidence/2026-09-16-ci/README.md) record local characterization, a real hosted glyph failure with retained artifacts, and the restored passing run. The configuration follows the official [Playwright CI guide](https://playwright.dev/docs/ci), [GitHub workflow timeout syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), and [artifact retention guide](https://docs.github.com/en/actions/tutorials/store-and-share-data).
