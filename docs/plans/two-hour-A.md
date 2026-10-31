# Lane A: public legal-line clipping, October 15

Sprint base: `8ac29a0103bdb8c092c59ab88160a5a58952181a`. Common T0 14:35:47 UTC; production freeze 15:40:47; hard stop 16:35:47. Reviewer: lane D. Worktree: A, branch `jo/astra-two-hour-20261015-a`.

## Problem and scope

JH-02 and issue #147 report that the public Level 3 legal sentence wraps into two lines on macOS, losing 84 ink pixels below the canvas. Pillow fit estimates and the actual Skia renderer disagree. Legal copy must remain intact and visible; font bytes alone do not establish metric parity. Only `engine/text_fit.py` (and resize if necessary), new scoped tests and evidence are owned. No sample text, IDs, fonts, grouping, paint order, upstream renderer, probe or global font floor changes.

## Steps and acceptance

1. Verify pinned upstream a44a060 and Python 3.11 dependencies, source/font hashes and actual macOS architecture. Generate all three public outputs with counted real/fallback calls.
2. Write behavioral regression using actual `resize` and RF-01 Skia ink probe: clipped legal copy fails; ample-space positive control stays visible; wrap-boundary cases and source invariants are checked. Record genuine RED before production edits. If reproduction fails by 15:00:47 UTC, preserve diagnostics instead of guessing.
3. Establish metric cause, then implement smallest evidence-supported fit correction without ID heuristics. Retain default ordinary behavior where feasible. Risks: altered wraps/packing, group interference, fallback-face mismatch and runtime cost. Missing exact renderer prerequisites remain explicit, never skipped-success evidence.
4. Run unchanged focused tests GREEN; canonical no-skips Python gate; npm test/build/verify/benchmark. Render and inspect three public outputs at 1x/2x; record JSON/PNG/font/source hashes and host. Submit immutable candidate to D early. Linux/macOS parity remains partial unless both actually tested.
5. Spend at most ten minutes on #148 same-string 6/7/8px diagnosis if primary is ready. No floor change without cause and behavioral evidence; human visual acceptance remains open.
6. Audit D's final ledger independently against original 31-issue mapping and receipts. Final handoff separates source, review, integration, publication and qualification.

Existing repo test/render procedures cover this task; no new specialized skill appears necessary. No vault or memory writes.

## Evidence update at baseline reproduction

Native macOS arm64 reproduced exact reported lost84/overflow90. RED 33 tests: one legal failure, 32 passing controls. Measured sentence advances: Pillow BASIC336 versus Skia346.068; emitted width344. Correction uses actual default Skia advances of the same resolved file at float size, conservatively combined with existing Pillow width and returned-width line count. No added linear/hinting policy, renderer mutation or arbitrary padding.

Expanded test-only claims (D notified): `test_text_fit.py` fake-font seam, `test_shape_obstacles.py` affected L3 characterization, `test_text_fit_whitespace.py` oracle repair. Baseline focused104 tests had seven failures on macOS: one actual leading-space caller under-allocation and six helper assertions equating Pillow and Skia numerical advances. Preserve real caller/ink assertions; helper algorithm parity is corrected by feeding identical measured widths to both wrap algorithms. This is a test-oracle correction, not tolerance widening. The production candidate also fixes the actual leading-space caller failure.

## Independent review follow-up: platform pixel oracle

D's full canonical macOS run found five existing fixed-Linux pixel-count failures in `test_extreme_composition.py`; D assigned this test-only file to A. Re-running its two rendered tests against baseline yields the same four label-count mismatches and legal lost84. Replace universal counts with actual same-host forced6px/5px positive/negative renders; preserve exact floor and zero-lost/overflow assertions. Acceptance: all11 module tests pass on candidate; corrected oracle still rejects baseline legal clipping; injected5px labels are rejected in all4 rows. No production changes or tolerance widening.
