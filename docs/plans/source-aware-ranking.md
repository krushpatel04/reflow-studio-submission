# Source-aware ranking — issue #12

## Problem, evidence, and impact

The September 15 review reproduced stack/split selection for eight of ten sources after a one-pixel width increase, including a clean edge-subject baseline. The current selector rewards the largest minimum font and then box coverage, even when the original is readable. Its exact-size shortcut masks the discontinuity at the source dimensions. This needlessly changes alignment, hierarchy, spacing, and image framing.

Issue #2 and the group-preservation slice of #5 are landed. This task addresses ranking and stability independently of #5's remaining product candidates and #3's typography constraints. Existing candidate generation, document/metric/resource contracts, typography, and renderers stay in their owners' scope. General visibility and measured crop diagnostics remain #6; independent human evaluation remains #7. Reviews/PRs are optional.

## Intended behavior and approach

- Keep existing hard errors ahead of all soft preferences, including preservation, group geometry, bounds, clipping, and collisions.
- Measure source change relative to the centered uniform baseline in scale-independent units: movement, source alignments, signed pair spacing, relative text/image prominence, and cover-image aspect change. The last is a crop-risk proxy, not measured lost pixels or subject visibility.
- Use a continuous readability deficit below the existing 9px short-edge warning threshold; do not reward unlimited font growth or filling deliberate whitespace. Balance that deficit against source change. Warning diagnostics and thresholds remain intact, even if preserving composition sometimes selects a small warning over a large rearrangement.
- Keep the search bounded at the existing three candidates. No fixture IDs, dimension deadband, mutable history, new rendering requirements, or document-contract changes.
- Exact-size identity remains exact. Nearby sizes should preserve healthy sources; materially improved feasibility/readability must still be able to justify rearrangement. Discrete candidate switches can still jump, so report those transitions rather than claiming continuous layouts everywhere.

## Risks

Weights are engineering choices, not an aesthetic oracle. Preserving composition can leave letterboxing or minor readability warnings; prioritizing readability can still change composition substantially. Pair relations add quadratic work, bounded by the existing 100-element schema but not a runtime budget. Font rounding can create small renderer differences. The existing renderer has coarse focal alignment and no intrinsic asset dimensions in its engine contract, so aspect-change risk must not be reported as actual crop loss. Self-authored additional families are development validation, not an independent held-out quality study.

## Steps and acceptance

1. Add and run regression tests before production edits: nearby width/height sweeps, sparse/image framing preservation, no-content input, unit-scale/ID/order invariance, hard-error precedence, and a positive control requiring genuine rearrangement. Record behavioral red failures.
2. Add an isolated ranking module and integrate selection without changing shared document interfaces. Test component sensitivity and legal uniform transforms; verify determinism and immutability.
3. Add a reproducible source/transition sweep with normalized movement, strategy transitions, frame/crop-risk changes, candidate diagnostics, runtime, and a composition-term ablation. Freeze additional synthetic validation families before implementation and do not tune on them.
4. Run test/build/native verify/benchmark and browser acceptance. Inspect source/old/new images, including nearby edge-subject, sparse composition, a substantial resize, and transition neighbors. Compare previous-engine candidate selection using its unchanged generator and legacy comparator, and separate diagnostic regressions from visual observations.
5. Archive compact dated evidence and update status/contract documentation. Record limitations and skill assessment, then fetch, commit, and push main without a PR gate.

## Execution evidence

- Base: `920f6fc2928e048d63c92688c8614c7076aa8971`.
- First red: `npx tsx --test tests/stability.test.ts` — **9 failed / 4 passed**. Eight source families failed the nearby movement bound and the text-free control failed. Example: edge-subject moved a normalized 0.566 on an eight-pixel width decrease; long-headline moved 0.576. Positive large-format and scale/ID controls already passed. Tests reached actual selection behavior; no setup failures.
- Three additional synthetic validation families were frozen in `tests/support/ranking-designs.ts` before production edits. They are developer-authored validation, not independent held-out evidence.
- Extended red: **10 failed / 5 passed**, including a source-spacing preference and a passing real preservation-error control. The first implementation passed 14/15; a sparse source still jumped on a combined +8/-8 resize because a linear readability deficit outweighed a modest composition change. Changed the deficit to mean squared shortfall, so slight threshold crossings contribute smoothly and much less than severe deficits. No warning threshold or fixture-specific rule changed.
- Squaring the mean fixed nearby behavior but failed the large-format positive control: averaging over readable text diluted the small footer. The final deficit uses the worst squared shortfall, preserving the least-readable-content policy without rewarding unlimited growth. Both ends of the behavior are covered before accepting the change.
- First full sweep: 2,530 distinct cases, zero nearby rearrangements, 21 observed transitions, and 11 standard warnings versus six previously. Visual inspection rejected the wide-gallery story result: source preservation kept a small strip and an unreadable caption despite a feasible readable stack. Added this as a real regression before revising production code. The additional families are now development cases, not untouched validation; the earlier no-tuning intention is superseded by this explicit failure-led change. Independent held-out evidence still requires #7.
- Revised source preference: multiply composition loss by the smaller of target/source aspect ratio and its reciprocal. This continuous, dimensionless weight is strongest near the original shape and relaxes for substantially different formats. There is no hard resize threshold or fixture-dependent decision.
- The gallery regression passed with the deterministic mock measurer but reproduced the actual failure with bundled native fonts: **1 failed / 18 passed** before aspect weighting. Kept the real-font regression. This is evidence that the mock measurer alone is insufficient for layout acceptance.
- Final: **153 tests, build, 30 native cases, benchmark, and 11/11 browser checks pass**. The 2,422-case final sweep has no nearby rearrangements and 19 observed discrete transitions; the original 30-case warning count is 11 versus six previously, with no new errors. The additional nine outputs have zero errors/warnings. All per-case regressions, representative images, ablation, and paired runtime results are in the [dated evidence](../evidence/2026-09-16-source-ranking/README.md).
- The paired old/current comparison asserts every generated candidate and diagnostic is identical across 117 pairs. Original-case medians were 32.42/32.97ms, without a speedup or budget claim. The largest observed non-source transition remains a 0.6104 normalized product movement; independent quality and actual visibility/crop evidence remain open.
- Post-task skill assessment: existing browser/verification skills and repo workflow instructions already cover the process. The sweep and runtime scripts retain the task-specific procedure; no new skill is justified.
