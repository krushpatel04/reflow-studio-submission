# #28 slice: benchmark caller contains per-cell reflow failures

**Owner:** CLI2. **Branch:** `jo/demo-20261015-cli2-benchmark` at `f8f8c5609933f57e37de35e24c095f7fc245f117`.
**Status:** v3 (`9696e283`) conditionally approved by Sopulu1; amendments (1)-(4) below applied. Window 2026-10-13T18:11:48Z through 19:41:48Z, at most 6 guarded commands.
**Claimed paths (only):** `scripts/benchmark.ts`, `tests/benchmark-failure.test.ts`, this plan, `docs/evidence/demo-20261015-benchmark-failure.md`.
Not touched: `src/main.ts`, `src/engine.ts`, `src/reflow-targets.ts`, `verify.ts`, `defect-pack.ts`, `font-parity.ts`, PY-FONT-RED.

## Incumbent claim / collision check (read-only)
- The earlier #28 engine slice (`docs/plans/issue28-per-target-reflow-failures.md`, branches `exchange/agent-3/jo/reflow-engine-28{,-buildfix}`) is merged into `f8f8c56`. It wired only `src/main.ts`. It explicitly left `scripts/benchmark.ts` unwired and listed "script-level failure reporting" as remaining #28 work. That leaves no live incumbent on this path, so nothing needs releasing.
- No branch or commit in the repository touches the three new paths. `scripts/benchmark.ts` was last changed in `b4ba15c`, and no open branch modifies it.

## Verified call chain (source, not classname absence)
1. `package.json:10` `npm run benchmark` runs `tsx scripts/benchmark.ts`. CI `ci.yml:139` runs it under `bash` with `| tee`, without `pipefail`, so a crash there is not a CI gate today.
2. `scripts/benchmark.ts:20`: `FIXTURES.flatMap(source => TARGETS.map(target => reflow(source, target, measure)))` is top-level and has no catch.
3. `src/engine.ts:186-211` `reflow` throws in three places:
   - `validateResources` (source)
   - `validateTarget`, i.e. `DesignValidationError` on `$target*` (`model.ts:160`)
   - `selectCandidate`, i.e. `NoValidCandidateError` (`engine.ts:181-183`)
4. `InvalidMeasurementError` (`typography.ts:6`) can be thrown from measurement during evaluation.
5. Any throw from any cell exits the module before `writeFile(results.json)` at line 39. The result is no report, no images, no successful cells, and no record of which cell failed.

## Causal change (minimal)
1. **Seam commit (behavior-preserving):**
   - Wrap the existing script body, lines 10-52, unchanged, in exported `runBenchmark({ fixtures = FIXTURES, targets = TARGETS, native, out = 'reports/latest' })`.
   - `native` supplies `measure`, `renderPng`, `fontFiles` and `requiredFontFiles`.
   - The only entry point is the existing-style guard `if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await runBenchmark({ native: await import('./native') })`. It is lazy, so importing the module is side-effect free: no mkdir, font registration or report writes.
   - `npm run benchmark` output stays the same; only the hard-coded "70" in the console line is computed. Still a direct `reflow` map.
2. **RED, production-bound:**
   - The test drives the real `runBenchmark` with a temp `out`, the real `./native`, and fixtures/targets injected deterministically.
   - It asserts the DESIRED report and that the run continues past the failing cell.
   - On the seam commit it must fail because `runBenchmark` throws `NoValidCandidateError` and no `results.json` is written. That is recorded failing behavior, not a passing assertion.
3. **GREEN:**
   - Each cell goes through the merged `reflowTargets(source, [target], native.measure)`, the same as `src/main.ts:131`.
   - It contains only `NoValidCandidateError`, target `DesignValidationError` and `InvalidMeasurementError`. Source faults, other `RangeError`s, `TypeError`s and non-`Error` throws propagate. The #26 engine contract is unchanged.
   - The same RED test, unweakened, turns GREEN.
4. **Report:**
   - All-success JSON keys and values are unchanged.
   - Only when there are failures: top-level `failures: [{ sourceId, target, error: { code, message, total?, findings? } }]` and `summary.failedCases`.
   - `cases` stays the successful count, as today, and `results` is successes only, in order.
   - When every cell fails, `medianLayoutMs` and `p95LayoutMs` are `null`.
   - `index.html` gets one escaped `<section role="alert">` per failed cell, placed before the result rows. It shows source, target, code, message, `total` and the findings list. No figures or fake baseline/selected for failed cells; failed cells are never skipped.
   - The console shows each failure via `describeFailure`. After everything is written, the main entry sets `process.exitCode = 1` if there are failures; `runBenchmark` returns the report so tests read it directly.

## Regression test `tests/benchmark-failure.test.ts` (one file, `node:test`)
- **Fixture:** the source-faithful construction from `tests/engine.test.ts:100-105`, copied as is:
  - `tiny(1e308)` at `huge` 8000×8000 throws a real `NoValidCandidateError`.
  - `tiny(1)` is the positive control.
  - No fabricated error object.
- **Main test (RED, then GREEN, the same assertions):**
  - Call `runBenchmark({ fixtures: [FIXTURES[0], tiny(1e308), tiny(1)], targets: [TARGETS[0], huge], native, out: tmp })`.
  - It resolves.
  - `results.json` contains `failures` with an `overflow/huge` entry: code `no-valid-candidate`, `total >= findings.length > 0`.
  - Any other failure is asserted by exact (source, target) pair, never filtered.
  - `results.length + failures.length === 6`. Successes keep their order and match direct `reflow()` on `sourceId`, `target`, `selected.strategy` and `selected.design`.
  - `summary.cases` equals the successes and `summary.failedCases` equals the failures.
  - `index.html` has one `role="alert"` per failure, naming its source/target/code.
  - Inputs deep-equal their `structuredClone` taken before the run.
  - Temp dir removed.
- **Direct controls, same function:**
  - All-success `[tiny(1)] × [huge]`: the JSON has no `failures` key and no `failedCases` key, and `cases` is 1.
  - A `native.measure` that throws `TypeError` rejects `runBenchmark`, and no `results.json` is written.

## Risk
The test also renders the source preview for `tiny(1e308)`. If `renderPng` or `renderSvg` throws on it, that is a separate real failure: stop and report. Do not change the fixture to avoid it.

## Dependencies
- The worktree has no `node_modules`.
- Shared `reflow-studio/node_modules` is compatible: `package-lock.json` is byte-identical (`cmp` 0, sha256 prefix `fd107687b392d74d`) and Node is v24.21.0.
- Plan: one gitignored symlink `node_modules -> <shared>/node_modules`. No install, no fetch, no writes into shared deps. Identity goes in the evidence doc.

## Amendments (approval conditions)
1. The fixture citation is `tests/engine.test.ts:100-105`.
2. CLI2 runs `npm test` and `npm run build` itself, plus a full-scale native all-success CLI characterization. This is not a tsc-only result or a Coordinator handoff.
3. Order of evidence:
   - (a) characterize the ORIGINAL unmodified CLI (`npm run benchmark` on `f8f8c56`: native startup, exit, actual JSON/HTML/images, 70 cases, success schema). It may PASS; no artificial RED. The original has no injection seam, so no loader or fixture harness is added to it.
   - (b) the seam is an unchanged-body extraction. Repeat the same characterization, then the real desired-continuation RED through `runBenchmark`.
   - (c) GREEN: the same, unweakened regression plus the same full-scale characterization.
   - Characterization compares stable keys and content, excluding only `generatedAt`, `environment`, `elapsedMs` and the timing summary. No byte-identity claim for timing.
4. Source-validation (`validateResources`) and source-preview (`renderPng` / `renderSvg` on a source) faults propagate distinctly and are never contained as cell failures. The test asserts that an invalid-resource source rejects `runBenchmark` and that no `results.json` is written.

The named test also holds the all-failure control (`[tiny(1e308)] x [huge]`: timings `null`, one alert, no figures) and the unknown-error control (injected `measure` throws `TypeError`, run rejects). No duplicate collector and no missing-export failure.

## Validation (each `python3 /home/nala/.local/share/reflow-run-20261015/heavy_job.py timeout --signal=TERM --kill-after=5s 900s CMD`, sequential, receipt copied after each)
1. Original: `npm run benchmark`, then snapshot `reports/latest` to an ignored directory.
2. Post-seam: `sh -c 'npm run benchmark && npx tsx --test tests/benchmark-failure.test.ts'`. Expected: the characterization matches step 1, and the test is RED with `NoValidCandidateError`.
3. GREEN: the same command. Expected: the test passes, and the characterization matches except for the additive-free all-success JSON.
4. `npm test`
5. `npm run build`
6. Reserved for one targeted repair and retest.

Generated reports and logs stay uncommitted. Evidence goes in `docs/evidence/demo-20261015-benchmark-failure.md`.

## Non-scope
Revision-safe export, cancellation, result reuse, `verify.ts` / `defect-pack.ts` / `font-parity.ts` callers, CI `pipefail`, and the engine. No issue closure or publication.
