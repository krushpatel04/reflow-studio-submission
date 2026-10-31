# P11: wrap cap ignores box padding -> ungrouped text never wraps, whole target goes sub-floor

Branch `jo/reflow-milestone-python-p11-wrap-cap-padding`, base 6d90d1a. Read-only scan on main: `docs/evidence/2026-10-07-p11/` (`gap_scan.py`, `gap_scan_main.txt`).

## Defect (measured, main 6d90d1a)
`text_fit._texts` wraps at `cap = tw - 2` but the placed box is `ceil(widest*1.02) + 1` wide, up to `tw + 1`. `_pack` rejects any box wider than the target, so a line that fills the cap can never pack; every ladder step down to FLOOR_PX fails, `_texts` returns False, groups revert to P5b and a RuntimeWarning fires. Wrapping to 2 lines (which would fit) is never tried.
| case | main | with cap fix (scratch, NOT committed) |
|---|---|---|
| L3 -> 300x250 | 7 sub-floor texts (subhead 4.07, legal 2.22, five grouped labels 2.78-4.07) + RuntimeWarning | 0 |
| L3 -> 160x600 | 8 sub-floor + warning | 0 |
| L3 -> 300x600 | legal_text 3.33 | 0 |
| L3 -> 320x50 / 60x1000, L2 -> 60x1000 | sub-floor | unchanged (physical: 98% of canvas area at 6px / plate wider than canvas) |
| L1, L2 (others), L3 728x90/120x600/1000x60/1080x1080/970x250/600x300 | none | none |
Public hashes L1/L2/L3 equal main (`hashes_*.txt`). Explained diff in P8 case C1 (L3 -> 120x600): headline 10.17 -> 11.30px, subhead 6.0 -> 6.21px, boxes narrower (118 -> 115, 120 -> 113; the old subhead box was the full 120px canvas width), legal_text y shifts; nothing goes below 6px (`c1_diff_scratch_fix.txt`).

## Change (engine/text_fit.py, one expression)
In `_texts`: wrap cap `tw - 2.0` -> `(tw - 3.0) / 1.02`, so `ceil(widest*1.02)+1 <= tw - 2` for every wrapped line. No other change; floor, ladder, `_pack`, group logic untouched.

## Tests (RED first)
1. Fixture: ungrouped text whose single line at FLOOR needs a box > tw-2 but wraps to 2 lines that fit; main -> font < 6 / warning, fixed -> >= 6, no warning.
2. L3 -> 300x250 / 160x600 / 300x600 via public sample: no text < FLOOR (unmet set measured and pinned, incl. unchanged limits 320x50, 60x1000).
3. Box width <= tw - 2 for every re-fit text; measured text inside its own box (existing overflow helper).
4. Existing tests stay unchanged (pins: P5b no-fit, ImageOcclusion fallback, no-refit). Any pin that flips is flagged, never edited silently.
5. L1/L2/L3 hash identity vs main; C1 diff as above documented in README.
6. Mutants: cap back to tw-2, drop /1.02, drop -3, cap = tw, margin changes in box width.
7. Genuine renderer REAL/0 FALLBACK on L1-L3 + L3 -> 300x250 render; ink inside plate/box check on the new case; one flock full validation.

## Limits
No layout-quality claim; render of 300x250 only reviewed by measured geometry unless viewed. 6px is the floor, not legibility. Physical cases remain (320x50, 60x1000).
Estimate: <= 45 min. Start by 19:10Z.

## Revision (implementation finding, reported honestly)
The unconditional cap change (`(tw-3)/1.02` everywhere) flipped the P10 pin `test_only_label_font_changes_everything_else_equals_main` [C1]: headline 10.17 -> 11.30 / subhead 6.0 -> 6.21 changed in a case that already packed. Not edited. Implemented instead as RETRY ORDER in `_texts`: caps tried (tw-2) with skip, (tw-2) images-ignored, then (tw-3)/1.02 with skip, then images-ignored. Anything that packed on main is byte-identical (L1/L2/L3 AND all P8 cases, `hashes_final.txt` == `hashes_main.txt`); only inputs main failed entirely change. Existing suite runs unedited; `git diff main -- tests_python` additions only.
