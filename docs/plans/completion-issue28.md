# Issue 28 — bounded request lifecycle

## Problem and current evidence
At f97c5aa every mode/overlay toggle calls reflowMany again. Rendering and layout run synchronously on the UI thread. Existing second-target failure and export revision controls already pass; preserve those and the closed #29 offline export tests. Source readiness remains read-only during this implementation.

## Intended scope
First retain the current layout batch for presentation-only changes, invalidate on source/target/font changes, and bound retained cache. Then establish a real Worker/OffscreenCanvas font-measurement capability before moving expensive requests. Cancellation must terminate computation; discarding stale output alone is insufficient. One C owner for main.ts request handling, new layout-request/worker modules and request tests; D reviews and B reviews measurement methodology.

## Risks
Font loading/worker metrics can change layout; old results must never attach to new source. Async completion/error can race newer requests. A cache can retain oversized state or stale font metrics. A cancellation flag on synchronous main-thread code does not stop work. Existing synchronous browser harness assumptions must be adapted only where behavior becomes asynchronous, preserving all assertions.

## Tests and acceptance
Behavioral RED for toggle re-layout and invalidation controls before production changes. Real browser input responsiveness and cancellation under a fixed dense supported workload, provisional 250ms input/ack budget pending B review; capture cold/warm/max latency and termination evidence separately. Worker font metrics/results must match normal supported controls. Test revision supersession, source/target/font invalidation, bounded retention, explicit failure/retained export, retry/revert and keyboard recovery. Preserve all13 export regressions. Full npm/build/verify/benchmark/browser gates once on reviewed integrated candidate; exact artifact hashes and independent review.

## Sequence and stop
Meaningful failing browser control → minimum cache fix → worker capability/parity evidence → smallest interruptible request implementation with tests → review and correction → integrated gates. Code reviewed by16:54:10Z; no new heavy jobs17:24:10Z; stop17:49:10Z. If capability cannot be established, deliver the honest cache/revision slice and exact missing cancellation prerequisite, not full #28 closure. No #30 work until #28 scope is reviewed and measurement ownership cleared.

## Execution record
Completed scoped implementation and validation; dated evidence is linked from README. No new skill needed; existing verification and plan/test workflow apply.

### Corrected cache regression evidence
The initial browser instrumentation failed its positive control (stack truncation), so it is not behavioral RED evidence. Increased stack depth and ran the corrected test against unchanged HEAD main.ts: real-copy control 3,387 layout measurements; presentation toggles 9,252 (expected zero). Command: `npx playwright test tests/browser/request-lifecycle.spec.ts --output /tmp/reflow-completion-C-red-corrected`; evidence `reports/completion/C/toggle-red-corrected.log` and `toggle-red-counts.json`. Restored the candidate cache only after observing this valid failure.

### Worker follow-on design
Use one worker per changed-source/target request; terminate it on completion, supersession, user cancel or a10-second deadline. This trades worker/font startup cost for bounded lifetime and real cancellation. Keep synchronous presentation-only rendering from the committed cache. Source/targets commit only after worker success and markup success; JSON/SVG use that committed snapshot while work is pending. Add native keyboard cancel/retry/revert controls. Main and worker must await required bundled subsets; font capability probe established exact metrics on matching loaded subsets, including a fallback sample that is explicitly not an export-fidelity guarantee. Re-establish second-target failure injection for worker execution; do not weaken it to stale-response suppression alone. A cache-only checkpoint is preserved under reports/completion/C/cache-checkpoint in case the async path cannot pass review by the freeze.

### Cancellation RED, measured threshold correction and prospective review
Before production worker code, `cancel-red.log` recorded a real UI failure: updating copy exposed no keyboard-operable cancellation control (`#cancel-layout` absent). No import/setup failure was counted. First async candidate passes that control and healthy recovery.

The first dense100-elements ×1000-character experiment failed an added250ms external worker-destruction observation target:2006.48/2006.84/2006.97ms while feedback1.2–1.3ms and acknowledgement0.1–0.2ms. Preserve `dense-cancellation-250ms-failed.json`. Independent idle/busy worker controls measured3.939/2005.800ms. This does **not** establish that the2s is only debugger overhead, nor prove CPU stopping within250ms. B prospectively reviewed a separate3000ms **external worker destruction observation** budget on2026-10-15 before the next dense run: busy baseline plus approximately1s tolerance. Original100ms feedback/250ms acknowledgement targets remain unchanged; all are local provisional criteria, not Adobe requirements.

The negative control disables terminate and adds2ms per1000 text measurements to the same dense input so the actual engine remains computing beyond3000ms. Independent measurement-progress messages must continue after cancel beyond3000ms, with no worker-close event; cleanup restores actual termination. This must fail the positive destruction gate despite UI acknowledgment. Healthy first and repeated requests record four raw elapsed samples including Playwright overhead; each creates a fresh worker, so warm means cached resources, not a reused worker. No percentile/general runtime guarantee.

Async harness changes preserve the original assertions. The second-target failure now wraps the actual module worker in a test-only Blob module, injects an OffscreenCanvas measure failure at independently counted first-target K+1, and observes the injection before forwarding the production error. The mode fault still injects DOM render measurement; fixture failure injects the worker's first measure. No production fault hook.

### Final recovery regression
Keyboard retry succeeded after an injected worker script-load failure. The first revert harness used an incorrect fixture display name and is excluded as RED evidence. Corrected `revert-red-corrected.log` failed on actual behavior: cancelled custom width123 remained after Revert (expected original default1600). Revert now restores committed custom dimensions (or1600×600 defaults), copy, fixture, and validation feedback.

### Font settlement boundary regression
D identified the possibility that `FontFaceSet.load()` resolves before its `loadingdone` event. The new UI test changed all type-pairing text to supported non-Latin characters without preloading subsets. After commit/settlement, a baseline toggle caused1626 layout measurements instead of0 (`font-boundary-first.log`, `font-boundary-red-counts.json`). The request now awaits `document.fonts.ready` before committing the prepared cache so the loadingdone invalidation happens before the new generation is cached.

### Immutable browser harness
The a184fac final run passed25/26 browser tests but Vite logged `page reload src/layout-worker.ts` during the negative control, clearing its window observations and causing undefined.filter. Source status was clean and file modification times predated the run; D independently confirmed a second Vite connection in the trace. This is excluded as a termination measurement, not erased. Browser qualification now disables HMR/file watching with a test-only Vite configuration; production code, dense input, budgets and negative assertions are unchanged. Preserve browser-final2.log as the failed harness record.
