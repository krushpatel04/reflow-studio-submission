# P6: rigid per-group upscale + repack for sub-floor grouped labels (engine/text_fit.py, engine/resize.py, docs/design-contract.md)

Branch jo/reflow-milestone-python-p6-group-scale, base main a305c22. PLAN ONLY, no code. Measured geometry only; no layout-quality claim. Public samples are development evidence.
Arithmetic (L3 source 1080x1350 -> 728x90, canvas s = min(728/1080, 90/1350) = 0.06667). Group scale k = 6px / label font; label font after uniform scale = font x s.
| group | label font | uniform px | k needed | k / s | plate WxH | rotated aabb WxH |
|---|---|---|---|---|---|---|
| badge1 | 15 | 1.00 | 0.4000 | 6.00 | 116.00x20.00 | 116.00x20.00 |
| badge2 | 15 | 1.00 | 0.4000 | 6.00 | 136.00x20.00 | 136.00x20.00 |
| badge3 | 15 | 1.00 | 0.4000 | 6.00 | 104.00x20.00 | 104.00x20.00 |
| cta | 22 | 1.47 | 0.2727 | 4.09 | 114.55x24.55 | 114.55x24.55 |
| ribbon (-12deg) | 20 | 1.33 | 0.3000 | 4.50 | 90.00x16.20 | 91.40x34.56 |
Plate area 11390 px2 (17.4% of 728x90 = 65520); aabb area 13090 (20.0%). Obstacles beside: logo/product column x350.7-377.3, y3.3-38.7. Rows fit by arithmetic (left 254 wide, right 313.9, each <= 348.7; tallest 34.6 <= 40.7).
Trigger (pinned): a group is scaled only if it has >=2 members including a non-text plate member AND a text member whose label font * s < FLOOR_PX (6). A single-text group (no plate) is never scaled, so test_layout Impossible is unchanged. Plate area 11390 px2 (17.4%); obstacles beside: logo/product column x350.7-377.3, y3.3-38.7.
1. Scope: engine/text_fit.py, engine/resize.py, docs/design-contract.md; tests in tests_python/test_text_fit.py, test_layout.py, test_fields.py (additive); no packaging files.
2. Scale rule: never k < s. k applies ONLY to sub-floor grouped labels (font * s < FLOOR_PX). Groups already >= floor stay byte-equal to P5b. Rigid per group: one uniform scale k >= s + translate about group centre, then placed at pack position. Relative rects, rotation, z, ids, assets, copy, styles exact. Rotated AABB inside canvas (overhang allowance = source overhang x s).
3. Packing & Determinism:
   - Fixed group order: source y, then source x, then group id (stable sort).
   - Ladder: fixed discrete search ladder of k values starting from k_needed down to s (e.g. `[k_needed * (0.9**n) for n in range(MAX_STEPS)]` bounded by `max(s, ...)`).
   - Pack order: scaled groups first (fixed order above), then ungrouped texts; ungrouped texts may shrink down to FLOOR_PX to admit groups; a group is never placed below s. Greedy: each group takes the first ladder k that packs given prior placed groups.
   - Determinism: repeat runs produce identical output; permuted input element order produces identical per-id geometry.
4. Exemption & Obstacles (ruling; no open decisions):
   - Per (group, image) pair, from SOURCE geometry: image is exempt for that group iff ANY member's source rect overlaps the image rect (pairwise per member, NOT the union box). Non-overlapped ungrouped images are obstacles.
   - Full-bleed bg (`resize._covers`) is never an obstacle (stays stretched, unmoved).
   - Obstacles = images only (ungrouped, non-bg). Ungrouped shapes are NOT obstacles: stated limit (as R6), ledger reports per-group overlaps with ungrouped shapes.
   - RED: a group with NO source overlap with an ungrouped image treats it as an obstacle (L3 logo/product column); group never lands on it.
   - RED: a single-text group (no plate) is not scaled (font stays 1.0 at 67x67).
   - Honest limit: scaled groups end 4-6x larger (k/s) than their neighbouring unscaled elements; no layout-quality claim.
5. Fallback: if no valid k >= s packs for a sub-floor group, that group falls back to uniform s (P5b placement), and if no placement packs overall, whole run falls back to exact P5b output; no new warning, no box fallback, no universal floor.
6. Protected tests to change (old / new / why, Reviewer approval required):
   - `test_text_fit.py::L3ToStrip::test_grouped_texts_below_floor_are_the_measured_unmet_list`. Old: unmet == {badge1/2/3_label 1.0, cta_label 1.47, ribbon_label 1.33}. New: NOT a bare `== {}`. (a) On L3 -> 728x90 the test computes unmet ids/px from the run output (font_size < 6) and asserts the measured set; the expected set is written into the test only after the RED/GREEN run shows it, and `{}` is asserted only if the run shows every group >= 6 with group association, rotation, plate containment and canvas checks green. The floor is never claimed beyond what is measured. (b) The old 1.0/1.0/1.0/1.47/1.33 pin is RETAINED on a no-fit fixture (target too small for any k > s to pack) where output == exact P5b. Why: P6 upscales when it fits; the limit stays pinned where it does not.
   - `tests_python/test_text_fit.py::RotatedBounds::test_l3_rotated_group_inside_canvas_and_labels_inside_plate_box`. Old: ribbon at uniform scale. New: ribbon upscaled (k_g=0.3); rotated AABB inside canvas or overhang <= source overhang x s (uniform canvas scale, NOT x k_g); label-in-plate-box assertion unchanged. Why: ribbon group is upscaled.
   - `tests_python/test_fields.py::PublicSamples::test_sample_groups_keep_relative_layout`. Old asserts `b["x"] - b0["x"] == (a["x"] - a0["x"]) * k`. New: for each group ONE ratio k_g holds across ALL members (offsets, widths, heights); k_g == s for unaffected groups and for L1/L2; k_g >= s for L3 sub-floor groups. Why: per-group scale changes relative offsets by k_g/s.
   - `test_layout.py::Impossible::test_font_below_schema_minimum_floors_at_one`: UNCHANGED (not in the change list). Grouped 12px text at 67x67: single member, no plate, so not a group-with-plate. Trigger = group has >= 2 members incl. one non-text plate whose rect contains a sub-floor label; a lone grouped text never fires it and stays 1.0 on the P5b path. Test passes as-is.
   - Test count at base a305c22: 84 (>= the 81+ cited; venv; contract 24, fields 12, layout 14, submission_files 12, text_fit 22). Earlier "75 untouched" claim dropped. After P6: 84 stay; 3 above change expected values (layout test unchanged); new tests additive.
7. Mutants that must die: k < s, k applied to non-sub-floor group, ladder/search-order change, exemption per-pair->global, obstacle off, exemption inverted, floor off, source/output rect swap (R7 fixture).
8. Documentation edits:
   - `engine/resize.py` docstring: clarify uniform transform exception for sub-floor groups.
   - `docs/design-contract.md` line 45: update "Explicit group members share one uniform rectangle scale and translation, regardless of role" to "Explicit group members share one uniform rectangle scale and translation, except sub-floor groups which may use a per-group k >= s".
9. Evidence docs/evidence/2026-10-06-p6/: genuine renderer L3 + synthetic narrow/rotated before/after PNG+JSON, 3 REAL / 0 FALLBACK, per-group label px, plates moved stated, failed attempts kept, sha256.
