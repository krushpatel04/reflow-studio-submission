# #28 benchmark caller containment — evidence, 2026-10-13

**Scope:** #28 residual for `scripts/benchmark.ts` only. It does NOT establish Viewer cancellation or revision consistency (#28's original viewer criteria), and it closes nothing for #25/#26/#27. No change to `src/**`, `src/main.ts`, other callers, PY-FONT-RED or import379. Uncommitted; root is the sole publisher.

**Source and authorization:**
- Worktree `cli2-issue28`, branch `jo/demo-20261015-cli2-benchmark`, base `f8f8c5609933f57e37de35e24c095f7fc245f117`.
- Plan `docs/plans/issue28-benchmark-failure.md`: v3 `9696e283…` conditionally approved by Sopulu1; amended version `a89bf083ef53cae94e64b4daef1c70f9e1bbf5098b46932a295a52b39cc14de7`.
- Window 18:11:48Z through 19:41:48Z.
- Dependencies: one symlink `node_modules`, pointing at the shared `reflow-studio/node_modules`. `package-lock.json` is byte-identical (`cmp` 0, sha256 `fd107687b392d74d…`) and Node is v24.21.0. No install, fetch or dependency write.

## Change
- **Seam (unchanged body):** the original lines 10-52 are wrapped in exported `runBenchmark({ fixtures, targets, native, out })`.
  - `FIXTURES`/`TARGETS` became the parameters `fixtures`/`targets`, with the originals as defaults.
  - The entry point is the existing-style main-module guard, which loads `./native` lazily. Importing the module registers no fonts and writes nothing.
  - The "70" in the console line is now computed.
- **Fix:** each fixture goes through the merged `reflowTargets(source, targets, measure)`.
  - Contained as cells: `NoValidCandidateError`, target `DesignValidationError`, `InvalidMeasurementError`.
  - Still thrown: source validation, unknown errors and source-preview faults.
  - JSON: `summary.failedCases` and top-level `failures: [{ sourceId, target, error }]` appear **only when failures exist**. All-success keys and values are unchanged. `cases` = successful count. All-failure timings are `null`.
  - HTML: one escaped `<section role="alert">` per failed cell (code, message, total, findings). No figures.
  - Console: stderr `Failed cell …`; the main entry sets `process.exitCode = 1` after the report is written.

## Guarded commands
Each command ran as `python3 …/heavy_job.py timeout --signal=TERM --kill-after=5s 900s CMD`, sequentially, with the receipt copied after each. Five of the six allowed commands were used; there was no repair or retry.

| # | Code state | Command | Exit | UTC | Receipt (pid / started_at_ms / exit) |
| - | --- | --- | -: | --- | --- |
| 1 | original `f8f8c56` | `npm run benchmark` | 0 | 18:13:30–:32 | 3792130 / 1791915210388 / 0 |
| 2 | seam `c67acd9b…` | `sh -c 'npm run benchmark; tsx --test tests/benchmark-failure.test.ts'` | 0 (benchmark 0, test **1**) | 18:16:42–:44 | 265085 / 1791915402542 / 0 |
| 3 | fix `05b233e9…` | same as 2 | 0 (benchmark 0, test 0) | 18:18:11–:14 | 575960 / 1791915491871 / 0 |
| 4 | fix | `npm test` | 0: 689 tests, 689 pass, 0 fail/skip | 18:18:24–19:08 | 619995 / 1791915504730 / 0 |
| 5 | fix | `npm run build` (`tsc --noEmit && vite build`) | 0; Vite >500 kB chunk advisory only | 18:19:17–:18 | 810834 / 1791915557981 / 0 |

**Disclosure:** between commands 2 and 3 I ran one unguarded `tsc --noEmit` by mistake. It was a typecheck only (exit 0) with no rendering or tests. Command 5 repeats it under the guard.

## Results
- **Original characterization (1):** native startup OK, exit 0. 30 cases (10 fixtures × 3 targets), 70 PNG / 70 SVG / 70 design JSON. Success schema keys `environment, generatedAt, method, results, schemaVersion, sourceChecks, summary`. `results.json` sha256 `4db50321…d7e3`.
- **Seam characterization (2):** compared with (1), stable JSON is equal, stable HTML is equal, and 210/210 artifacts are byte-identical. Only `generatedAt`, `environment`, `elapsedMs`, median/p95 and the rendered timing text were excluded. No byte-identity claim for timing.
- **RED (2):** the test file `34037c6a…` failed 2 of 4.
  - The two continuation tests failed with a real `NoValidCandidateError` (`code no-valid-candidate`, `total 3`, finding `$.elements[1].width: Expected a finite number…`). Stack: `selectCandidate` (`engine.ts:183`), then `reflow`, then `runBenchmark` `flatMap` (`benchmark.ts:25`).
  - No report was written. This is the recorded failing behavior, not an asserted desire.
  - The all-success and propagation controls passed on the seam.
- **GREEN (3):** the same test file (hash unchanged `34037c6a…`) passed 4 of 4.
  - Full-scale CLI compared with (1): stable JSON/HTML equal, 210/210 artifacts byte-identical, 30 cases, no `failures` key.
  - Mixed run `[FIXTURES[0], tiny(1e308), tiny(1)] × [square, huge]`: `overflow/huge` **and** `overflow/square` are both explicit failures. Each is asserted to throw `NoValidCandidateError` directly. The 4 successes deep-equal a direct `reflow()`, excluding `elapsedMs`, in order. Each cell appears exactly once; the HTML has one alert per failure.
  - Controls:
    - all-failure gives `null` timings, one alert, no `<figure>`
    - all-success keeps keys with no `failedCases`
    - an injected `TypeError` measure rejects and writes no report
    - an `unsupported-font` source rejects and writes no report
    - an injected `renderPng` fault rejects

  The fixture construction comes from `tests/engine.test.ts:100-105`, with distinct ids.

- **Strict re-check, done offline on the retained snapshots (no new command, no rendering):**
  - `compare-strict.py` sha256 `95a69c22…`. It excludes only the exact paths `generatedAt`, `environment` (asserted to hold exactly `node`, `platform`, `architecture`, `cpu`), `results[].elapsedMs` and `summary.{medianLayoutMs,p95LayoutMs}`.
  - Everything else (method, sourceChecks, baseline/selected designs and metrics, all summary keys) is equal key-for-key and value-for-value, original vs seam and original vs GREEN. `failures` and `failedCases` are absent; 30 cases.
  - The earlier `compare.py` dropped those key names at any depth. It is superseded for the JSON verdict and kept only for HTML timing normalization.

## Retained (ignored `reports/issue28-evidence/`, uncommitted)
- `cmd1..5.{log,exit,start,end,receipt.json,summary.txt}`
- `orig-latest/`, `seam-latest/`, `green-latest/`
- `compare.py` `ad31af1a…`
- `seam.benchmark.ts`, `red.test.ts`, `green.benchmark.ts`, `green.test.ts`

Log sha256 prefixes: cmd1 `4ff92dc7d073`, cmd2 `c27071639380`, cmd3 `dcd970c1ced2`, cmd4 `b9ee5cc7c615`, cmd5 `897d8a7f4dab`. Generated `dist/` and `reports/` are gitignored.

## Boundaries
- No commit, push or publication; waiting for a validated immutable handoff permission.
- CI `pipefail` is unchanged, so CI still does not gate on the benchmark exit code. That is out of scope.
- `verify.ts`, `defect-pack.ts` and `font-parity.ts` callers are untouched.
