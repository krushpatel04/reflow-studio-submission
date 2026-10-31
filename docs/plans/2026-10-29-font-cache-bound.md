# Bound retained Pillow fonts — October 29, 2026

## Plan and acceptance before code

The preceding measurement reuse adds no cache, but investigation found the existing `_font` LRU has no maximum. Default `resize()` and the pinned upstream batch entrypoint do not clear it; optional `faces()` does. Twenty identical tasks retained six entries; twenty further distinct sizes retained 140 with increased process RSS high-water. Repeating the same public cases during qualification does not bound a varied batch.

User authorized further performance improvements or compensation for remaining bottlenecks. This slice owns only the `_font` bound, new focused tests, and this plan/evidence. Root owns viewer/integration. Preserve all other edits. Do not modify path identity, font selection, Pillow/Skia metrics, dependencies, composition, or add another cache. No commit or push here.

First characterize typical retained counts and compare an isolated 128-entry LRU against frozen current bytes while root's full gate runs. A 128-entry limit is a conservative working-set ceiling, not a memory-byte guarantee: it must cover measured public/dense working sets and retain useful reuse while bounding distinct-size churn. Write tests for the bound, actual eviction/reload metric equivalence, in-limit identity reuse and exact-face scope clearing. Run RED against current implementation and GREEN against the isolated candidate. Compare complete outputs/warnings and source immutability across varied tasks and cached face variants; measure cache counts, latency and process memory in separate fresh processes. Avoid interpreting a high-water mark as released memory.

Notify root before changing production bytes. Once the current gate is finished, change only `@lru_cache(maxsize=None)` to the evidenced finite limit, run the focused suite, and report exact source hash. Root reruns full combined checks and clean-source Linux qualification. If churn imposes material slowdown or changes output, reconsider the bound; never weaken equality checks.

Risks: too-small cache causing repeated font loading; fonts have unequal memory costs, so item count is not a hard RSS limit; same-path font replacement semantics remain unchanged; eviction must not change active font objects or exact-face isolation. Acceptance is bounded retention, exact output/warnings, useful in-limit reuse, no material measured regression, and independent final resource qualification. Arbitrarily large input/layout/rendering cost remains outside this cache guarantee.

## Evidence and disposition

RED: `CHAMELEON_UPSTREAM="$PWD/.cache/chameleon" .cache/venv/bin/python -m unittest tests_python.test_font_cache -v` ran four tests against the unbounded production cache. Two expected failures: 145 retained entries exceeded 128; the oldest font remained identical after 129 intervening distinct keys. In-limit reuse and face-scope clearing passed. The isolated 128-entry candidate passed all four before production changed.

Three alternating fresh-process pairs compare 185 complete layout outputs and warning lists each. All match and inputs remain unchanged. Public plus dense16/dense100 working set is 45 entries, comfortably inside 128. A further 120 tasks with varied sizes and alternating regular/bold faces grow unbounded retention to 1,406; the candidate remains at 128. Final process RSS high-water spans 235.5–243.1 MB unbounded versus 126.8–129.4 MB bounded. This limits font-object retention, not every allocation in the renderer/process.

Tradeoff is explicit: varied-task median 539.0→577.8 ms (+38.8 ms across 120 tasks); 30 repeated public tasks 352.0→361.7 ms; after churn 356.6→372.5 ms. Public+dense first batch 1.242→1.171 s is timing noise/local measurement rather than a cache-speed claim. Three local pairs do not establish tail latency. The modest reload cost is accepted to compensate for unbounded retention. [Source hashes, raw trials and reproduction](../evidence/2026-10-29-text-measurement-reuse/README.md).

Root confirmed its preceding 540-test Python gate finished before the one-line production bound changed. Final production text_fit SHA256: `e4c494c7662a75ec7a324d49495660c0d2a6871f25795a5d9c35422f56d7cd1c`. Root owns the required new full gate and clean-image qualification. No new reusable skill is needed; the existing isolated comparison and regression workflow covers this work.

Final focused gate: 82 tests passed in 7.223 s (`test_font_cache`, `test_measurement_reuse`, `test_search_efficiency`, `test_text_fit`, `test_text_fit_whitespace`, `test_shape_obstacles`, `test_group_scale`). Existing fixture file-handle ResourceWarnings remain visible in the archived log; no failure/skip. `git diff --check` passes.
