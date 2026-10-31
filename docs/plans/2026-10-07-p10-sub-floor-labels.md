# P10: sub-floor plate labels C1 badge2_label 4.86px, C3b cta_label 4.37px

Branch `jo/reflow-milestone-python-p10-sub-floor-labels`, base 0536a10. Data: `docs/evidence/2026-10-07-p10/diagnose.py` -> `diagnose.txt`.

## Diagnosis (measured)
| case | plate after uniform s | rigid f needed | max rigid f (canvas bound) | label font at max f |
|---|---|---|---|---|
| C1 L3 1080x1350 -> 120x600, badge2 | 110.16 x 16.2 | 1.235 | 1.089 (canvas 120 wide) | 5.29 |
| C3b 1200x1200 -> 60x1000, cta | 54.68 x 13.12 | 1.372 | 1.097 (canvas 60 wide) | 4.80 |

Ladder (1.235, 1.111 / 1.372, 1.235, 1.111) never fits: union AABB 122.4 > 120, 60.8 > 60. No obstacle blocks it; the bound is the CANVAS, and it is legitimate for RIGID plate+label scaling (plate already 92% / 91% of canvas width).

But the rigid unit is not the only way to reach 6px. The label text at 6px measured with the repo's Pillow metrics: C1 "AWARD WINNING 2026" w=72 x h=7.2 inside the existing label box 110.16 x 8.42; C3b "Shop now" w=31 x h=7.2 inside 52.49 x 10.94. The text fits its own box at 6px; only the font is too small.

## Proposed change (engine/text_fit.py only), revision 2
Hook: `_place_groups`, ONLY in the existing `for ... else` (no rigid f packs). New `_raise(els, idx)`: for the group's sub-floor text members, set `font_size = FLOOR_PX` iff, for EVERY such member, the text measured at FLOOR_PX with the repo's Pillow metrics fits the member's box AFTER the uniform resize (the box in `els`, not the source box): `ceil(widest*1.02)+1 <= width` (wrap cap = width), `lines*FLOOR_PX*line_height <= height`, and no `letter_spacing`. All-or-nothing across the group's sub-floor texts; any miss or no fonts dir -> nothing changes, no warning (P5b stays). Geometry (x, y, width, height, rotation, group_id, plate, every other element) is byte-equal to the P5b placement; ONLY `font_size` of qualifying labels changes. Does not set `moved`.

Interactions (stated, tested):
- Rigid packs -> for-else not reached -> raise never runs (label keeps rigid f size).
- Not sub-floor group -> never touched.
- Overlap: geometry unchanged, so no box newly overlaps a neighbour/obstacle; asserted by comparing every box to the P5b run.
- `refit()` revert: if a rigid-moved group exists and ungrouped `_texts` then fails, `out` is restored to `base` (exact P5b): raises made in that call are dropped with it. If no group moved rigidly, a `_texts` failure keeps the raise (geometry-identical). Tested both.

## Tests (RED first)
1. PIN UNCHANGED: `test_no_fit_keeps_the_old_p5b_unmet_pin` is not edited. After uniform resize the "Hi" label box is 3.0x3.0 (the 100x100 is the SOURCE box); 6px text needs ~7 > 3 -> not fit -> 1.0px stays. It is the negative control. If my check measured the source box it would fail: that is the bug it guards.
2. New fixture where the scaled box really fits: label font >= 6 exactly, geometry equal to P5b, only font_size differs.
3. Real cases C1 badge2 (4.86 -> 6) and C3b cta (4.37 -> 6); other elements EQUAL to P5b (whole output minus those two font_size fields), no RuntimeWarning.
4. Rotated -12 grouped fixture: after raise the Pillow text box stays inside the plate in the rotated frame; rotation untouched.
5. Controls: text not fitting at 6px stays P5b exactly; letter_spacing label stays; two sub-floor texts, one not fitting -> neither raised (all-or-nothing); rigid-packs case stays rigid; non-sub-floor group untouched.
6. Pillow-vs-renderer on C1 + C3b genuine renderer: rendered label ink (ink_*.py style) lies inside the plate and inside the label box, PIL width vs rendered ink width reported.
7. L1/L2 hashes unchanged (existing test); L3 728x90 hash vs main 0536a10 = 65e0278b151fa114ef2155451d14930c99e60c64a560114bcd48d716c27bca26 must stay; `test_sample_groups_keep_relative_layout` run and must stay green (geometry ratios untouched; it does not check font_size).
8. Mutants: height-fit dropped, width-fit dropped, +1/1.02 margin removed, letter_spacing skip removed, partial vs all-or-nothing, raise before rigid ladder, raise when not sub-floor, font != FLOOR_PX, rotation/geometry touched, fit on unscaled (source) box. Survivors reported.
9. Genuine renderer REAL/0 FALLBACK via `run_official_samples.sh`; one `flock` full validation.

## Docs
`docs/design-contract.md:45`, `engine/text_fit.py` + `engine/resize.py` docstrings, P6 evidence README limits: "when no rigid k packs, geometry == P5b; label font is raised to FLOOR_PX in place only when the measured text fits its own box". NOT a floor guarantee (groups whose text does not fit stay sub-floor). The label is top-aligned inside the plate (P9) and label/plate proportion changes (font up, box same).

## Limits
Pillow metric vs renderer is checked on two cases only. 6px is the floor, not a legibility claim.
