# Rotated full-bleed eligibility: bounded plan

## Exact source and ownership
Baseline: clean `c027c2bde1c4b12f68d432dafac708cbc4809c94`, available agent-3-rf03 worktree. `engine/resize.py` blob `af4ee21c1793878a09f75d9f4cb22d045e1e7b1f`; `engine/text_fit.py` blob `8a5637716d7f29924f5a3e9a0d57eee0787c13e6`. Coordinator independently read the same engine blobs at `13dae00ca`. Root authenticated an empty diff `c027c2bd..3d1f77cf -- engine scripts/quality` (exit 0): published `3d1f77cf` exact scope equivalence is root-reported, not locally checked. No whole-tree equivalence asserted.

Sole potential engine writer: Engine3. Owned paths: `engine/resize.py::_covers` only; `tests_python/test_rotated_bleed.py`; this plan; `docs/evidence/2026-10-09-rotated-bleed/README.md`. No text_fit, typography, resources, corpus, human A/B or RF04 changes.

## Reproduced boundary
Source 100x100, ungrouped full-canvas rectangle, rotation 90 degrees. Target 200x100. `_covers` uses only the unrotated frame; resize stretches it to 200x100 while retaining rotation. Actual corner bounds become [50,-50,150,150], although the source footprint was inside its canvas. This creates vertical overhang and uncovered side strips. The cover-image analogue takes the same geometry branch; no asset/render claim is needed.

A preserved uniform fallback gives x50,y0,width100,height100,rotation90 and bounds [50,0,150,100]. It does not fill the wide target: that is an explicit conservative limitation, not a general background-layout repair.

## Minimal change (planned before RED; now applied, uncommitted)
Restrict `_covers` eligibility to axis-aligned painted footprints: rotation is an exact multiple of 180 degrees (`rotation % 180 == 0`, omitted rotation treated as 0). Keep the existing kind/group/source-frame conditions. No fuzzy angular snapping; +90/-90 and tiny nonzero rotations fall back to the existing uniform transform. 0/180/360 preserve rectangular footprint coverage and existing background stretch behavior. Preserve the supplied rotation value, group, ID, order, z-index, paint and source object.

No general rotated-coverage algorithm, candidate search, renderer edits, rotation normalization, text fitting or new dependency. Only `_covers` changes; all downstream transforms stay intact.

## Focused regression and controls
`tests_python/test_rotated_bleed.py`, no text/fonts/assets/renderer:
- Genuine RED: full-canvas square shape and cover-image, +90/-90, targets 200x100 and nearby 201x100. Require the uniform square frame and independently calculated rotated-corner bounds inside target.
- Additional same-classifier RED: oversized rotated identity (-10,-10,120,120) must retain its source overhang, not be clamped to the canvas.
- Positive controls: absent/axis0 remains full-bleed; 180/-180/360 remain full-bleed; grouped rotated shape/image remain uniform; exact full-canvas identity100x100; partial-frame shape/image remain uniform.
- Tiny nonzero rotation +/-1e-12 must use uniform fallback, with its exact supplied angle preserved (no fuzzy snapping).
- Protected data/source: IDs/order/z/paint/rotation/assets/group metadata unchanged; source not mutated. Preservation assertion applies even before the geometric fix.

Baseline focused execution only. Record exact command/source, meaningful failed assertions and passing controls in the owned evidence README. No accepted-suite rerun or qualification.

## Gates and acceptance
Save plan and tests, run genuine baseline RED, send actual diff and receipt to Reviewer5 and Coordinator. `_covers` production edit waits for independent defect/scope review plus genuine RED and current source-binding resolution. No engine patch is implied by preparing this packet.

After a separately released patch, all focused controls must pass with only the eligibility change. Geometry-only checks establish this boundary, not rendered quality, full-bleed visual quality or general feasibility. Additional validation follows a bounded Coordinator decision, not an automatic full-suite run.
