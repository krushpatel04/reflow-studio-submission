# Issue #12: transition review after product-grid generation

## Problem and evidence
The source-aware selector protects ±1–8px changes in the original fixture sweep, but the new product grids introduce further strategy boundaries. A discrete switch may move product groups abruptly even when adjacent target sizes are visually equivalent. Prior evidence predates the four-column grid and cannot establish its transition quality.

## Why it matters
Users resizing a campaign variant should keep a coherent composition until readability or geometry makes a rearrangement useful. A missing candidate and a poor ranking decision require different fixes.

## Intended behavior and scope
Measure adjacent selected layouts, all alternatives, readability, visible group scale, source-relative movement and aspect-ratio controls. Preserve valid nearby layouts and allow genuine extreme-format rearrangements. Make one bounded engine change only if a reproduced defect has a behaviorally meaningful remedy. No fixture-ID or target-specific selection rule.

## Risks and failure modes
An arbitrary ranking weight can hide generator gaps, worsen typography, or produce a different abrupt boundary. Grid eligibility can also create abrupt appearance/disappearance; widening it could select undersized photos. Internal diagnostics do not establish visual quality or subject visibility. Keep the provisional schema and hard preservation gates intact.

## Test cases and acceptance criteria
- Before code edits, reproduce a selected transition and inspect every generated candidate on both sides, with source and size-normalized group movement, reading size, image area and candidate scores.
- Pair healthy ±1–8px controls with extreme aspect ratios where uniform letterboxing is insufficient; retain a valid, readable rearrangement when feasible.
- If changing behavior, add a red regression plus positive controls first, then demonstrate green. No artificial failure for a characterization-only result.
- Run `npm test`, `npm run build`, `npm run verify`, `npm run benchmark`; inspect native images and `/verify.html` for engine changes. Archive dated, reproducible evidence and link it from README.

## Implementation steps and ownership
Engine/ranking, regression tests, and issue #12 evidence belong to this task. Issue #14 is documentation-only in another checkout. First measure boundaries using the current engine. Choose an observed, general fix or record why current transitions remain an evidence limitation. Fetch and integrate concurrent main changes before publishing; no force push.

## Validation and handoff
Record actual red/green commands if code changes, final checks, candidate-versus-selection diagnosis, per-category limits and runtime. Keep #12 open if independent held-out quality and visibility evidence remain pending.

## Execution record
Started at `63393d5` on September 22, 2026. A native-font sweep found an upper 1.25 grid eligibility discontinuity: 1350→1351×1080 changed the short four-product shelf from four columns to 3+1 with 0.39295 normalized adjacent movement, and changed its valid long-headline variant from four columns to uniform with five warnings. Inspecting all alternatives showed that the healthy four-column candidate was missing only because of the cutoff. A temporary no-upper-gate probe kept that row selected across the boundary while preserving uniform at 1920×1080; removing the lower gate would select undersized photos at 1080×1920.

Added the 1351 behavioral regression and story/wide positive controls before production code. The first focused run had a separate overstrict wide normalized-movement assertion; after correcting that control to assert baseline equality, the recorded red run was **20 passing / one expected behavioral failure** (`group-grid-3` instead of `group-grid-4`). The single-line eligibility change passed **21/21 focused** and **266/266 complete** tests. Build, 30 native layouts, benchmark, source-aware sweep, Playwright acceptance and `/verify.html` passed. Original selected outputs remained exactly unchanged. The [archived review](../evidence/2026-09-22-grid-transition/README.md) includes candidate diagnostics, ablation, adjacent movement, images, runtime and the unresolved lower boundary. Existing browser/repository verification skills covered the workflow; no new skill was created.
