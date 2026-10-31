# Bounded measurement caching — issue #8 slice

## Problem and evidence

The September 15 dense-input probe took 28.09 seconds for 100 text elements. Reflow calls the same synchronous measurer repeatedly during wrapping, fitting and evaluation. Profile actual requests before deciding whether caching helps. Live #8 depends on #2 (complete) and #3 (still open, no font-parity findings); the board has #8 Ready. This slice can proceed without choosing fonts, changing wrapping, or claiming container readiness.

## Why it matters

Repeated native measurement may waste time on dense copy. A measured, behavior-preserving optimization is useful preparation for the later offline harness; it does not establish a runtime deadline.

## Intended behavior and scope

Cache repeated queries for the same immutable text-element object within one `reflow` invocation. Keep the existing Measure, reflow, Result and document interfaces. Distinct elements/fit iterations remain separate contexts, including identical-looking objects, so callbacks may depend on any element property. Bound retained query text and entries; evict or bypass without changing output. Also reuse completed stack work when split takes the identical path, retaining independent copies of both public candidates. No cross-call cache, global font state, candidate-output changes, typography/rendering changes, timeout/fallback, CLI or container in this slice.

## Risks and failure modes

Stale font state across calls, conflating font/geometry/identity contexts, retaining too much text, caching exceptions or invalid metrics, and callbacks reusing mutable result objects can corrupt layout. The synchronous deterministic measurer must not mutate its element input; engine-owned measurement contexts are immutable while measured. Cache overhead may exceed savings on small cases. Memory ceilings describe retained cache query strings/entries, not process RSS. Runtime remains unbounded.

## Test cases and acceptance criteria

- Profile representative and dense cases on the unchanged engine; count repeat queries by element identity and record native elapsed time separately from instrumentation.
- Before production edits, characterize complete results against the saved base revision and add a regression requiring duplicate measurement requests to be avoided. Record the behavioral red result.
- Test isolated contexts, all metric fields, empty/Unicode text, exact capacity and oversized-query bypass, eviction, invalid capacities, exceptions/invalid metrics, and independent reflow invocations. Preserve normal and invalid-input controls.
- Paired native comparison: all 30 fixture targets plus dense 1/10/40/100-element cases; assert all candidates, selected output, diagnostics and content identical apart from elapsed time. Report sample counts/order and measured call reduction; no typical-latency or p95 claim from stress samples.
- Run tests, build, native verify, benchmark and browser acceptance; inspect representative images and compare benchmark documents/pixels. Check hosted CI on the published revision.
- Archive reviewed evidence under `docs/evidence/2026-09-16-measurement-cache/`, link README/progress and update #8/board honestly. Keep #5/#12, #4/#7 and remaining #8 scope visible.

## Implementation steps and ownership

JD owns `src/engine.ts`, a new engine-local cache module, focused tests, profiling script, package command and evidence/docs. Record scope in #8 before implementation. No edits to Junho's `src/typography.ts`, `src/render.ts`, `scripts/native.ts` or browser checks; no changes to Krush's fixtures/benchmark or shared model. Profile, write/run tests, implement the bounded cache only if justified, verify and publish directly to main after fetching.

## Validation and handoff

Use configured human identity and direct commits on main. Any optional branch must use `jo/`. No review gate. Report diagnostic, rendered and runtime evidence separately; assess reusable-skill value at completion.

## Execution record

- Initial checkout clean at `0757de5`; fetched origin and confirmed main current. API access returns 404; signed-in browser provides issue/board/CI access. Live #3 has no completion evidence. Browser/verification skills loaded; agent-browser CLI absent, so connected browser is the available fallback.
- Initial notes-only CI `0757de5` passed: https://github.com/ojedaJD/reflow-studio/actions/runs/35090889429 (one retained artifact). Scope recorded in #8 before production changes.
- Behavioral red: `node_modules/.bin/tsx --test tests/measurement-reuse.test.ts` produced **1 failure / 2 passes**: 36 duplicate font requests instead of zero. Fresh state/content and invalid-input controls passed. Full log: `reports/measurement-cache/red.log`.
- Pre-change native profile: representative 1,250 calls / 240 repeated; dense 100-element input 465,300 calls / 54,700 repeated, 33.51s instrumented including 32.73s inside native measurement. Repetition within immutable contexts is real but only 11.8% of dense requests. Inspection also shows stack and split perform the same arrangement when there is no image/text partition. Extend this slice to reuse that completed candidate's design/diagnostics while returning independent copies with the same three public strategy entries. This avoids duplicate work without changing candidate contents or ranking. Add a behavioral regression and retain a mixed image/text positive control before implementing this extension.
- Extended behavioral red (same test command): **2 failures / 3 passes**. Duplicate queries: 36; repeated equivalent arrangement measurement contexts: 85. Genuine mixed image/text split control passes. Added focused cache lifecycle/capacity/error tests before creating its implementation; missing-module setup is not counted as red evidence.
- First implementation passes all **18 new tests** and **178 total tests**. Initial build caught a test-only TypeScript union-property access; narrowed that assertion before rerunning build. No production interface change was needed. FIFO retains at most 4,096 entries and 262,144 UTF-16 query units per call; separate element identities remain separate measurement contexts.
- Build, all 30 native cases and benchmark passed. Counts remain 0 baseline/selected errors, 42 baseline / 11 selected warnings. All 30 selected editable documents and PNGs match the source-ranking archive byte-for-byte.
- Connected Chrome `/verify.html` passes 11/11, with empty errors/ink findings; saved report also passes `assertBrowserReport`. Browser UI loads normally. The console buffer was empty, while Vite forwarded ordinary Spectrum/Lit development-mode warnings; no startup error was observed. Local standalone CLI is absent; this is connected-browser acceptance, with real headless acceptance still required on hosted Linux.
- Initial paired runtime run asserts identical complete results on all 94 pairs, including the dense 100-element case (all 100 warnings retained). Repeating the archived timing run without concurrent tests/build because the first fixture timings overlapped initial checks; deterministic call counts/equality are already confirmed.
- Final timing run also matches all 94 complete results. Fixture native calls 112,050→70,260 over 90 pairs; dense-100 calls 465,300→227,000 and time 30.864→15.180s, with 100 warnings retained. Both runs are archived because desktop timing varied. No runtime/memory guarantee is inferred.
- Expanded byte comparison passes for all 70 JSONs and 70 PNGs using the existing dated references. Visually inspected badge, serif, dense, product and sparse output. Cache limits do not imply improved readability or visual quality.
- Skill assessment: existing browser/verification skills, repository instructions and `review:measurements` cover the repeatable procedure; no additional skill warranted. Remaining #8 runtime/offline, #3 typography, #4 integration, #7 independent evaluation and partial #5/#12 scope are documented.
- Published implementation `90bc454` directly to main with the configured human identity after fetching. [Hosted run 35092538387](https://github.com/ojedaJD/reflow-studio/actions/runs/35092538387) passed all stages, including real Chromium acceptance; the browser-pass excerpt is archived. Evidence logs use `.txt` so the repository's global `*.log` ignore does not omit them from the archive. The evidence-only follow-up checks all linked files are tracked and manifest hashes match.
