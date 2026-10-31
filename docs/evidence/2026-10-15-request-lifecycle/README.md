# Request lifecycle evidence — October 15, 2026

Source `60c478e245535eec005195de1ee2da4464b3faf5`; production code `a184facd6dae2a981dbbc70fbe0583450410b222`. [Plan](../../plans/completion-issue28.md). This is scoped internal viewer evidence for issue28, not Adobe/native integration, submission acceptance, or general performance qualification.

## Behavior and validation

Changed source/target requests use fresh workers. Cancel, supersession and the10-second deadline terminate the owned worker. Only successful completed markup commits source/results; pending, failed and cancelled requests retain the displayed/exported revision. Keyboard retry/revert recover. Presentation controls reuse one layout cache, keyed by source/targets/font generation, bounded to4MiB of estimated serialized UTF-16 payload. This is not a measured whole-heap limit. Font settlement precedes cache commit.

Final local gates:710 unit tests; build;30 internal Node-canvas fixture/target checks;70 benchmark images;26 browser tests including all13 existing offline SVG-export regressions. Browser `/verify.html` preserves every original assertion; its second-target failure now occurs inside the actual worker via a test-only OffscreenCanvas wrapper. Actual production worker results match main-thread results for supported serif/non-Latin text, excluding only elapsed time. Unsupported default arrow export remains a visible failure. Representative recovered UI and Node-canvas rendered fixture images were visually inspected; readability/native Express acceptance is separate.

Behavioral REDs are retained: toggles9252 unnecessary measurements with3387 real-edit positive control; absent cancellation UI; custom width123 surviving Revert; font-load boundary1626 unnecessary measurements. The font boundary is now0. Initial broken stack-depth/name instrumentation is excluded from RED evidence in the plan. The failed final2 browser run logged a Vite worker reload that erased probe state; final3 uses checked-in HMR/watch-disabled qualification config and passes26/26 without weakening assertions.

## Timing and limits

Hardware/browser are in [source-and-environment.json](source-and-environment.json). Three schema-valid dense synthetic trials use100 text elements ×1000 characters. Maximum observed feedback1.40ms, acknowledgment0.20ms, external worker destruction2013.42ms. Local thresholds:100ms feedback,250ms acknowledgment,3000ms external destruction observation. The original added250ms destruction target **failed** and remains archived. Idle/busy controls show a roughly2-second busy-worker destruction observation; this is not proof of debugger-only delay or CPU stopping within250ms.

The independently reviewed negative control disables terminate and adds2ms per1000 measurements. Actual engine progress continues beyond3000ms after cancellation acknowledgment, without a destruction event. It proves oracle sensitivity, not an unmodified runtime comparison. The actual10-second UI deadline stops a deliberate20-second busy worker: observed destruction12045.04ms from click, identical retained JSON and successful retry.

Browser HTTP cache was explicitly cleared before startup and first edit: startup221.66ms; edit samples287.92, 235.74, 220.22, 258.06ms. Repeated samples reuse the context with fresh workers. OS/server/compiled-code caches are not reset; timings include Playwright overhead. These small samples establish no percentile or general worst-case guarantee. Font and timing reviews are scoped independent agent reviews; final integrated/hosted gates remain the integrator's responsibility.

## Reproduce

`npm test`; `npm run build`; `npm run verify`; `npm run benchmark`; `npm run preverify:browser`; `npx playwright test`.

The manifest hashes archived artifacts. Fresh generated reports stay under reports/. No new reusable skill was created: the existing verification and test-first workflows cover this procedure.
