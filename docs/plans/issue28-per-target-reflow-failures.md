# #28 slice: per-target reflow failures must not abort sibling targets

**Owner:** engine. **Branch:** `jo/reflow-engine-28`, based on `f7b0d92` (integration of #25/#26/#27 prep + this helper, unwired) plus typography `a41d241` (`InvalidMeasurementError`).
**Status:** helper and viewer wiring implemented; failed-target card NOT browser-verified (see Verification limits).
**Upstream dependencies:** #26 (`NoValidCandidateError`) and #27 (`InvalidMeasurementError`) must be merged first. Covers only the per-target-failure part of #28; revision-safe export, result reuse and cancellation remain open.

## Problem and evidence
Since #26, `reflow()` throws `NoValidCandidateError` (also `DesignValidationError`, and `InvalidMeasurementError` from #27) for an unrepresentable target.
Callers run `targets.map(t => reflow(...))` with no catch: `src/main.ts:55` (`redraw`), `:119` (benchmark), and
`scripts/benchmark.ts:20`, `verify.ts:13`, `defect-pack.ts:31`, `font-parity.ts:92`. One bad target (for example a custom 8000×8000
canvas with a source containing `1e308` geometry) throws out of the whole map: no result for the valid targets, and in the viewer
`results` keeps stale state while the new source is shown (the lifecycle issue #28 describes).

## Intended behavior
A pure helper `reflowTargets(source, targets, measure)` returns one outcome per target, in order:
`{ target, result }` on success or `{ target, error: { code, message } }` on failure. Siblings of a failing target still
produce results; the error is visible, never silently dropped. Errors are not swallowed into a fallback design.

## Error classification (after review)
Per target: `NoValidCandidateError` (with capped `findings` + `total`), target `DesignValidationError` (`$target*`), and `InvalidMeasurementError` (a `RangeError` subclass from
#27, code `runtime`). Any other `RangeError` (for example stack overflow) propagates. Source validity is checked once up front and throws; programming errors (`TypeError`) and
non-Error throws propagate. One invalid source is one hard failure, not N identical rows.

## Wiring (this slice)
`reflowMany()` splits `reflowTargets()` into `{results, failures}`; `describeFailure()` formats one line.
- **Wired:** `src/main.ts` `redraw()` — failed targets render a `role="alert"` card with the error code and message, and the run
  summary names the failed targets; sibling cards still render. Verified by `tsc --noEmit` and unit tests of `reflowMany`.
  The DOM rendering itself is NOT browser-verified (no browser run in this slice).
- **Not wired, deliberately:** `runAll`/benchmark button in `main.ts` already catches and prints "Benchmark failed after N cases"
  (explicit, stops the run); `scripts/benchmark.ts`, `verify.ts`, `defect-pack.ts`, `font-parity.ts` iterate bundled fixtures x
  `TARGETS`, none of which throws; a throw there crashes the script with a visible stack and non-zero exit, which is the desired
  gate for CI fixtures. The JSON export now includes `failedTargets` (target + error) so failures are not silently dropped. Revision-safe export
  and result reuse stay with the remaining #28 work.

## Scope / non-scope
In scope (done): the helper with red-first tests, and viewer wiring in `src/main.ts` `redraw()` plus `failedTargets` in the JSON export.
Out of scope (remaining #28): revision-safe export, result reuse, cancellable work, retry/revert, and script-level failure reporting.
No change to merged `reflow()` semantics.

## Verification limits
- The failed-target card (`role="alert"`) in `redraw()` is **not browser-verified**: only `tsc --noEmit` and unit tests of `reflowMany` ran. Needs a browser run before undraft/merge.
- Unwrapped by design: `runAll` (benchmark button catches and prints its own failure), `scripts/benchmark.ts`, `verify.ts`, `defect-pack.ts`, `font-parity.ts`
  (bundled fixtures x `TARGETS`; a throw is a visible CI failure), and `window.reflowLab.run` (a public test hook that should surface raw errors).
- Combined branch `71ef503` exposed a real TypeScript build regression at `src/main.ts:62-68` (TS2322 for conditional `flatMap` union, TS18046 `card` unknown, TS2339 failure properties, TS7006 callback). Exact coordinator log: `/home/nala/.local/share/reflow-runtime/results/final-71ef5033fe7b51c68d76af04b68d4fb1520d4560-build.log`.
- Fix: explicitly discriminate `Card` by `kind`, type the card array, map each outcome to one `Card`, narrow with `card.kind === 'failure'`. This keeps card order and success/error markup unchanged.
- On fix SHA `d491163e946fcb7ec237974725c8dfd1ea80243e`, focused `tests/reflow-targets.test.ts` 10/10 and `npm run build` exit 0 (Vite chunk >500k advisory only). No full suite on this SHA; Coordinator owns it. Browser card not verified.

## Risks
Swallowing errors would turn a hard failure into a silent gap → helper reports `error` and requires callers to render it.
Catching too much would mask programming errors and unrelated failures as target outcomes → only `NoValidCandidateError`, target `DesignValidationError`
and `InvalidMeasurementError` become outcomes; everything else propagates. Source faults are validated once and throw.

## Acceptance
1. Red: with a bad and a good target, current uncaught behavior throws and returns no outcomes for either.
2. Green: good target yields a result, bad yields `{error.code:'no-valid-candidate'}`; order preserved; source unchanged.
3. Control: all-valid targets yield only results, deep-equal to direct `reflow()`.
