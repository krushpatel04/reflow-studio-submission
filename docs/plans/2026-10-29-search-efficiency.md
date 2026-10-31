# Bounded text-search efficiency — October 29, 2026

## Problem and scope

`_texts` repeats identical size vectors after every text reaches its floor, and repeats the obstacle search when the original and image-ignore policies are equal. Frozen diagnostic probes established equal outputs with fewer measurements. This slice changes only those redundant searches; the existing contributor-owned per-block glyph reuse stays intact. Root owns composition changes. No global caches, geometry policy, minimum size, search ordering or warning semantics change.

## Plan and risks

1. Add independent controlled-metric regressions with complete expected output, source immutability and bounded packing work. Cover exact-floor success, impossible output, mixed starting sizes, later-cap success, equal policies and distinct later-obstacle success.
2. Run against the unchanged search and record behavioral failures; preserve passing characterization controls.
3. Stop a size search only when the entire vector repeats; remove the second obstacle policy only when its per-element sets equal the first. Keep cap-major order and later distinct policies.
4. Run focused new and existing real-font fitting/obstacle tests. Root owns combined repository checks and final exact-source qualification/publication.

Risks: stopping when only one text reaches its floor would lose mixed-size solutions; stopping the outer loop would lose later cap/obstacle solutions; treating all obstacle policies alike could introduce overlaps. Tests explicitly exercise those cases. Output comparisons include every field, not just a selector score. Timing is secondary to deterministic work-count reductions and equivalent results.

## Acceptance and evidence

New efficiency assertions fail on the old search for unnecessary work; output/diagnostic characterization controls pass. The smallest implementation makes them all pass and retains existing real-font tests. No release qualification is claimed by these focused tests. Shared uncommitted files remain untouched except the owned search section of `engine/text_fit.py`.

RED: `CHAMELEON_UPSTREAM="$PWD/.cache/chameleon" .cache/venv/bin/python -m unittest tests_python.test_search_efficiency -v` ran six tests: two passed; four failed solely on excess packing work (244 vs 16 impossible; 4 vs 2 equal policies; 123 vs 2 later cap; 62 vs 2 later obstacle). Every complete-output assertion passed. The initial draft used decimal height literals that differed from the established floating arithmetic; those expectations were corrected and rerun before recording behavioral RED. No production search change preceded these failures.

GREEN: all six initial tests passed after the 10-line search change. One further equal-policy control covers a real image already overlapped by the source text; all seven new tests pass. The combined focused command below passed 84 tests in 12.210 seconds with zero skips (run before the seventh new control was added). Existing test-file ResourceWarnings about unclosed reads remain visible; no assertions or warning policy were weakened.

```sh
CHAMELEON_UPSTREAM="$PWD/.cache/chameleon" .cache/venv/bin/python -m unittest \
  tests_python.test_search_efficiency tests_python.test_text_fit \
  tests_python.test_text_fit_whitespace tests_python.test_shape_obstacles \
  tests_python.test_group_scale tests_python.test_wide_split
```

Additional read-only differential: extracted the original `_texts` function from committed HEAD into an isolated namespace, using the same current font/packing helpers, then compared original versus optimized search on all three public sources at 728×90, 160×600, 300×250, 970×250, 1×1 and 1080×1920. All 18 complete output dictionaries, return values and warning sequences matched; source inputs remained unchanged. This isolates search behavior from concurrent composition changes. It is not a full-engine or official-renderer qualification.

The existing per-block glyph reuse is unchanged. No new global state/cache, dependency, minimum size or layout policy was introduced. `git diff --check` passes for owned files. Root performs combined repository-required checks and clean-source Linux qualification before publication; this focused handoff does not claim them complete. The existing workflow suffices; no new reusable skill is needed.

## Final combined outcome — October 29

[Refinement evidence](../evidence/2026-10-29-engine-refinement/README.md) supersedes earlier pending-qualification notes: clean source `126c186` passed the complete Linux/amd64 offline harness, including all controls, failure cases, resources and final fingerprint. Expanded nine-case smoke and 17 focused Linux tests passed; the latter needed a read-only test-only fontTools mount, with no production dependency change. Astra accepted the final source and rendered cases. These are local emulated checks; hosted CI is blocked by billing. No submission or human acceptance is claimed.
