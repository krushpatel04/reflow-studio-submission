# Issue #27 — fail visibly on invalid text measurements

## Problem and evidence

On October 4, 2026, fetched `origin/main` and confirmed this isolated clone's
`jo/reflow-issue-27` worktree starts at
`f08a7951a4e6a8b84fcf8589f33d0e4c954c67d5`. Live #27 is open, assigned to
ojedaJD, with no comments. Its NaN identity-layout probe still matches the code:
`layoutText` consumes unchecked callback values; comparisons in `evaluate`
can fail open. The cache avoids retaining invalid values but passes them on.
This does not imply bundled native fonts currently produce invalid metrics.

## Why it matters

Invalid measurements must not yield clear diagnostics, a fitted element, an
editable successful result, or JSON numbers silently converted to null.

## Intended behavior and scope

- Own only `src/typography.ts`, dedicated typography tests and this plan.
- Validate width, ascent and descent on every measurement consumed by
  `layoutText`, including wrapping, emergency breaks, the reference and final
  lines. Reject NaN, either infinity, negative and nonnumeric values explicitly.
- `Measure` represents finite nonnegative advance width and conservative
  alphabetic-baseline extents, not raw signed Canvas ink coordinates. The native
  and browser adapters already combine font and ink bounds using `Math.max`.
  Raw Canvas ink extents can be negative; they are not rejected before that
  existing normalization. See the [Canvas TextMetrics specification](https://html.spec.whatwg.org/multipage/canvas.html#textmetrics).
- Zero width is valid for empty/invisible text; zero ascent/descent and negative
  zero are valid. No minimum glyph size, clamping, fallback or font change.
- Reject nonfinite derived layout height, including overflow of individually
  finite measurements. Preserve valid huge finite values within arithmetic range.
- Keep `src/evaluate.ts`, `src/measurement-cache.ts`, engine selection,
  `scripts/native.ts`, worker and CLI unchanged. Cached and uncached consumers
  share this boundary. Preserve all IDs, copy, assets, groups, order and styles.
- Use the existing worker mapping for ordinary errors: runtime / worker-failed,
  path `$`, exit 1, JSON stderr and empty stdout. Include the element and invalid
  metric in the exception message; no new shared error or worker contract.

## Risks and failure modes

Rejecting raw signed ink metrics would over-reject legal fonts; test the actual
adapters' normalized values, including punctuation and empty strings. Checking
only wrapping width misses reference/line measurements and invalid vertical
bounds. Checking only uncached calls would let cache hits bypass validation.
Arithmetic can overflow even with finite operands. A mock-only test cannot prove
worker/CLI failure transport or native/browser compatibility. Keep exceptions
visible and preserve the source rather than repairing invalid data.

## Test cases and acceptance criteria

1. Inject each metric separately with NaN, Infinity, -Infinity and -1. Exercise
   direct layout/fitting, evaluation and identity/resized reflow with uncached,
   default-cached and zero-capacity measurement callbacks.
2. Target later measurements: wrapping fallback, grapheme splitting, reference,
   final nonempty and empty lines. Include nonnumeric and overflow controls.
3. Accept empty text, zero-width text, zero vertical extents, negative zero,
   normal wrapping/fitting and supported native families/weights/scripts.
4. Inject native measurements only in child test processes, without production
   hooks. Real worker and CLI must return structural failure, not success;
   ordinary native CLI output remains valid.
5. Run focused tests red before production edits, then green; run `npm test`,
   `npm run build`, `npm run verify`, `npm run benchmark` and
   `npm run verify:browser`. Compare fresh authored benchmark documents/PNGs
   with a pre-change run; inspect representative native/browser images.

## Implementation steps and ownership

1. Read required repository docs, current implementation and live #3/#27;
   publish ownership/metric/worker compatibility coordination on #27.
2. Install locked dependencies locally. Save a pre-change authored benchmark
   under ignored `reports/issue-27/`; never open sealed evaluation sources.
3. Write dedicated regression tests. Record the exact command and behavioral
   failures here before editing production code.
4. Add the smallest private metric guard to typography; run focused tests green.
5. Complete native/browser, preservation and broad validation. Fetch again,
   check concurrent changes, commit under the configured human Git identity
   and push only `jo/reflow-issue-27`. Do not merge main or close any issue.

## Validation and handoff

Record red/green counts, exact commands, native/browser results, image and
preservation comparisons, commit, plan and limitations in this plan and #27.
The existing browser verification skills and repository workflow are relevant;
no unrelated skill is used. Assess reuse at handoff without automatic skill,
vault or memory writes. No gateway credentials or account settings are accessed.

## Execution record

- Initial sandbox prevented Git metadata writes; corrected before implementation.
  Successful fresh fetch and live issue reads completed afterward.
- Red (re-run with base typography.ts checked out): `npx tsx --test tests/typography-invalid-measures.test.ts` = 98 tests, 2 pass, 96 fail incl. 3 native CLI child-process cases (CLI succeeded on poisoned metrics).
- Green: private `checkedMetrics` guard wraps the measure inside `layoutText` + finite check on derived lineStep/height. Focused 99/99 (adds cache consistency control); `npm test` 564/564; `npm run build` ok.
- Not yet run: browser, verify, benchmark, verify:browser. No acceptance or closure claimed.
- Slice 2 (cc4b2cd + plan update): added 4 native CLI child-process tests (preload poisons `@napi-rs/canvas` `measureText`; control succeeds, NaN/Infinity/negative fail exit 1, empty stdout, JSON stderr naming element). Base red 98 tests / 2 pass / 96 fail; green 98/98. `npm test` 563/563, `npm run build` ok, `npm run verify` 30 layouts ok, `npm run benchmark` ok (70 PNG/SVG/docs).
- Limitations: `npm run verify:browser` BLOCKED — Playwright chromium_headless_shell not installed in this environment (not installed, per no-mutation rule); browser adapter `browserMeasure` unchanged and covered only by the shared `layoutText` guard. Pre/post benchmark image diff not done (no pre-change run saved).
- Slice 3 (be6285c): added 1 cache-consistency test: invalid (NaN) metrics through `cacheMeasurements` throw on every attempt and are not retained; once valid zero metrics are returned for empty text, a repeat layout hits the cache. My first draft expected 4 callback calls; the correct count is 2 (layout throws on its first measurement), so the test expectation was fixed, not the code.
- Results at be6285c: focused 99/99; `npm test` 564/564; `npm run build` ok. `verify` and `benchmark` were last run at cc4b2cd (production code unchanged since 7f69fb6).
- Not done: `verify:browser` (chromium missing), pre/post benchmark image diff, push. No review approval, PR or issue closure claimed.
- Browser attempt (19:13Z): `PLAYWRIGHT_BROWSERS_PATH=/home/nala/.local/share/reflow-runtime/playwright-browsers npx playwright install chromium` succeeded, but `npm run verify:browser` fails at launch (`browserType.launch: Target page, context or browser has been closed`). Cause: `ldd chrome-headless-shell` shows missing system libs (libnspr4, libnss3, libnssutil3, libatk-1.0, libatk-bridge-2.0, libXcomposite, libXdamage, libXfixes, libXrandr, libgbm, libxkbcommon, libasound, libatspi). Needs root package install; not done. Browser verification remains BLOCKED (environment), not a code failure. preverify steps (font-parity, crop-parity, defect-pack) ran fine.
- Reviewer follow-up: native CLI assertions tightened to exact payload ({error:{category:runtime,code:worker-failed,path:$,message:^Text element "headline" has invalid <metric> measurement <value>;}}). Focused 99/99, tsc clean (full suite not rerun: host-load queue owned by Coordinator). Unpoisoned native CLI control (exit 0) already present.
- Integration (Coordinator): b849374 merged; integration 12ae2fc full suite 594/594, build ok.
- Browser verification blocker (exact):
  - Command: `PLAYWRIGHT_BROWSERS_PATH=/home/nala/.local/share/reflow-runtime/playwright-browsers npm run verify:browser`
  - Error: `Error: browserType.launch: Target page, context or browser has been closed` (test 1, tests/browser/acceptance.spec.ts:5, 1ms).
  - Root cause: `ldd .../chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell` reports not found: libnspr4.so, libnss3.so, libnssutil3.so, libatk-1.0.so.0, libatk-bridge-2.0.so.0, libXcomposite.so.1, libXdamage.so.1, libXfixes.so.3, libXrandr.so.2, libgbm.so.1, libxkbcommon.so.0, libasound.so.2, libatspi.so.0.
  - Minimal owner command (needs root): `sudo env PLAYWRIGHT_BROWSERS_PATH=/home/nala/.local/share/reflow-runtime/playwright-browsers npx playwright install-deps chromium`, then rerun the command above. Not run by this agent.
- Added direct cache test: NaN/Infinity/-Infinity/-1 per metric are never stored (callback invoked twice); valid zero/-0 stored (invoked once).

## Caller audit (base f7b0d92, grep of layoutText/measure/measureText in src/ and scripts/)

- Guarded via `layoutText`: `evaluate.ts`, `engine.ts` (layoutText, fitText), `render.ts`, `visibility.ts` (`samplePoints`), `rendered-visibility.ts`, `scripts/native.ts` renderCanvas, `scripts/lica-preview.ts`, `scripts/issue7-source-audit.ts`, `scripts/font-parity.ts`. Errors are not swallowed in any of them; none has a catch around measurement.
- Direct `measure(line, e).width` after `layoutText` (`visibility.ts` samplePoints, `native.ts` renderCanvas, `lica-preview.ts`): the same lines were already validated inside `layoutText` with the same deterministic callback, so no bypass. Raw `measure(e.text, e)` in `font-parity.ts` is a diagnostic probe whose following `layoutText` call is guarded.
- Browser adapter `browserMeasure` and native `measure` feed only these paths; `cacheMeasurements` returns invalid results uncached and layout rejects them.
- Real gap (no overlap with my file, not fixed here): `src/reflow-targets.ts` catches every `RangeError` as a per-target `runtime` outcome, so an unrelated RangeError (e.g. stack overflow) is masked. Fix once #28 wiring lands: catch `InvalidMeasurementError` instead. Pinned by `todo` test `reflowTargets rethrows unrelated RangeErrors` (fails when un-todo'd).
- Change in this slice: `InvalidMeasurementError extends RangeError` exported from `src/typography.ts`, thrown by the guard; fully backward-compatible with `instanceof RangeError`. Focused 102 tests: 101 pass, 1 todo; `reflow-targets` + `measurement-cache` tests 20/20; tsc clean. No full suite.
