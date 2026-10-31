# Pillow measurement reuse — October 29, 2026

[Plan](../../plans/2026-10-29-text-measurement-reuse.md) · [Reproduction script](compare.py) · [Raw results and source hashes](results.json).

Within each free-text/font-size trial, reuse the existing Pillow character advance array for the initial wrap and returned-width recount. Both wraps and independent Skia measurements remain. There is no new cache. Candidate `engine/text_fit.py` SHA256 is `c49b5270d8e969e462bd4a332e805ac64a5d43884d1d5c76f40f463c94345020`; baseline is `2c118f05027d7959be9e471b1182014f8d6a1496`. These are slice measurements from a working tree, not a clean-container qualification.

Tests first: four new cases produced three expected duplicate-native-call failures while complete expected output and immutable-source checks passed; empty-copy characterization passed. After the change, all 78 focused tests passed in 7.391 s: measurement reuse, search efficiency, text fit, whitespace, obstacles and group scaling. Two existing instrumentation tests now observe the unchanged wrap function, including both metric systems and the returned-width recount.

Five alternating native macOS layout-only trials followed an untimed warmup for each case/variant. The per-call font cache was cleared. All nine cases preserve complete output dictionaries, warning lists and both input dictionaries across all trials. This includes the three public inputs, dense16/dense100, infeasible, Unicode wrapped/infeasible and empty text. No renderer or container speed claim follows from these timings. Other root verification work ran concurrently, so differences are descriptive measurements, not controlled hardware guarantees.

| Case | Baseline median | Candidate median |
| --- | ---: | ---: |
| Public Level 3 | 49.55 ms | 39.81 ms |
| 16 texts × 128 characters | 12.97 ms | 9.31 ms |
| 100 texts × 1,000 characters | 2.399 s | 2.143 s |
| Infeasible 1×1 | 90.92 ms | 67.39 ms |

Public Levels 1 and 2 and empty copy are effectively unchanged. Dense100 remains infeasible; this does not make its copy readable. A separate instrumented dense100 pair confirms native Pillow `getlength` calls fall from 50,592 to 25,296 while wrap calls stay at 6,400. Profile times contain instrumentation and scheduling effects and must not replace the alternating trials.

Reproduce from repo root with the pinned starter available:

```sh
CHAMELEON_UPSTREAM="$PWD/.cache/chameleon" .cache/venv/bin/python docs/evidence/2026-10-29-text-measurement-reuse/compare.py
```

The script freezes baseline and current engine packages under ignored reports, generates dense cases with the existing workload generator, checks full equality and records hashes. A later source change requires a new result record; it does not inherit this candidate's claim.

An additional [cache lifetime probe](cache-lifetime.json) records a separate pre-existing limitation: `_font(maxsize=None)` persists between default resize calls, unlike optional `faces()` scope. Twenty identical tasks retain six font entries; twenty additional distinct quarter-pixel sizes retain 140. macOS RSS high-water increases from 43.1 to 57.7 MB; high-water cannot demonstrate memory release. Existing qualification repeats the same three public tasks and does not establish bounded memory for arbitrarily varied batches. Cache hardening requires its own test-first evidence and final qualification.

## Follow-up: bounded font retention

The user authorized compensation for remaining bottlenecks. The [separate plan](../../plans/2026-10-29-font-cache-bound.md) records tests first and a one-line finite LRU bound. Final `engine/text_fit.py` SHA256 is `e4c494c7662a75ec7a324d49495660c0d2a6871f25795a5d9c35422f56d7cd1c`; preceding measurement timings belong to the explicitly identified pre-bound slice above. [Cache comparison script](cache_compare.py) · [Raw cache trials](cache-results.json).

Four real-font tests cover finite retention, eviction/reload with identical metrics, continued validity of an externally held evicted font, recent-key identity reuse, distinct faces/sizes and `faces()` entry/exit clearing. Baseline produced two expected failures; the isolated candidate passed all four before production changed. The source bound is 128 entries versus a measured 45-entry public+dense working set. No path identity or metric policy changed.

Three alternating pairs of fresh native macOS processes each execute 185 layouts: public3+dense16/100, public3 repeated10 times, 120 distinct sizes/alternating faces, then public3 repeated10 times. All complete output dictionaries and warning lists match; inputs remain unchanged. Cache entries after varied tasks are 1,406 unbounded versus 128 bounded. Final process RSS high-water ranges 235.5–243.1 MB versus 126.8–129.4 MB. This includes non-cache process allocations; it does not establish a total memory cap or prove release via a falling high-water counter.

The tradeoff is modest additional loading under churn: 120 varied tasks median 539.0→577.8 ms; 30 repeated public tasks 352.0→361.7 ms, and after churn 356.6→372.5 ms. This is memory compensation, not a further speedup claim. The cache still hits for the measured working set and evicts older distinct font objects. Other phases, much larger inputs, renderer allocations and worst-case latency remain outside this guarantee.

Reproduce the cache comparison with the same environment and `cache_compare.py`; it reconstructs only the old unbounded decorator from final current source, freezes both complete packages, and checks all outputs. Final full tests and clean Linux qualification remain root's integration responsibility and must reference the final bounded source.

The final [focused test log](focused-final.txt) records 82 passing tests in 7.223 s, zero skips; pre-existing fixture file-handle ResourceWarnings are retained. `git diff --check` passes. Command: `CHAMELEON_UPSTREAM="$PWD/.cache/chameleon" .cache/venv/bin/python -m unittest tests_python.test_font_cache tests_python.test_measurement_reuse tests_python.test_search_efficiency tests_python.test_text_fit tests_python.test_text_fit_whitespace tests_python.test_shape_obstacles tests_python.test_group_scale -q`.

Final integration: [544-test gate and clean-source Linux qualification](../2026-10-29-final-performance/README.md) pass on `5020706`, with unchanged six public JSON/PNG hashes. This final receipt binds the bounded-cache source, distinct from the intermediate timing slice.
