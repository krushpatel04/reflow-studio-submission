# Remaining text measurement cost — October 29, 2026

## Plan before implementation

Baseline HEAD is `2c118f05027d7959be9e471b1182014f8d6a1496`, with the clean-qualified `126c186` runtime. Root owns viewer and integration work. This slice owns `engine/text_fit.py`, focused measurement tests and this plan/evidence only. Preserve the existing glyph reuse and bounded search stops, all source fields and current metric policy; do not modify composition, dependencies or upstream rendering.

Profile remaining real-font costs on the three public inputs and already generated dense synthetic workloads. If measurements justify it, reuse Pillow's character advance array between initial wrapping and the returned-width recount within a single element/font-size trial. This avoids changing search order, font identity or the wrap algorithm and needs no global cache. If benefit is negligible or outputs change, defer rather than broaden scope.

Before production edits, write a failing regression for duplicate native measurements with complete expected layout and characterize real-font equivalence. Cover distinct faces/sizes/content, wrapping at a changed cap, empty/Unicode text and impossible-fit behavior. Run against baseline and record meaningful RED. Implement the smallest equivalent change; run focused real-font and search tests. Benchmark frozen baseline/candidate in alternating trials, compare full outputs/warnings and retain raw measurements and hashes. Do not claim container latency or release qualification from local layout timing.

Risks: accidentally reusing advances from a different font/content; changing floating summation order; bypassing the returned-width recount; increasing memory lifetime. Keep the array confined to one trial, preserve both Pillow and Skia measurements, and verify outputs. Existing test instrumentation may need to follow the retained wrap function rather than count a now-eliminated helper invocation. Root performs combined full checks and clean-source Linux qualification before publication.

## Evidence

Baseline profile: dense16 `_texts` took 0.0172 s instrumented, with 980 Pillow `getlength` calls consuming 0.00848 s cumulative. Dense100 took 2.35 s in `_texts`, including 50,592 native calls/0.433 s and 6,400 unchanged wrap calls/1.51 s. Cumulative phases overlap and are not additive. Public L3's first profile includes font/import initialization, so its timings are not a warmed baseline. Raw function records are under ignored `reports/text-measurement-reuse-20261029/`.

RED before production edits: `CHAMELEON_UPSTREAM="$PWD/.cache/chameleon" .cache/venv/bin/python -m unittest tests_python.test_measurement_reuse -v` ran four tests: empty-text characterization passed; three failed only on duplicate native calls (4 vs 2 for one face, 8 vs 4 for two faces). Full expected output dictionaries and source-immutability assertions passed before those efficiency failures. No test setup failure occurred.

GREEN: 78 tests across measurement reuse, search efficiency, text fit, whitespace, obstacles and group scaling pass in 7.391 s. Nine real-font paired cases have full output/warning equality and immutable inputs. [Archived evidence](../evidence/2026-10-29-text-measurement-reuse/README.md) records the exact production hash, alternating timings and native call-count reduction. Root owns combined checks and publication. Existing profiling and test workflows cover this procedure; no reusable skill is needed.
