# P5b rework: text-fit that keeps groups and rotation (engine/text_fit.py)

Branch jo/reflow-milestone-python-p5b-text-fit-groups. Replaces the blocked P5 (79b18b3). Measured geometry facts only; no layout-quality claim.
1. Precedence (stated): group association and rotation are protected invariants; the 6px readability floor is a measured limit. When both cannot hold, the invariant wins, the unmet ids and px are reported in evidence, and resize() does not raise on schema-valid input.
2. Grouped texts keep the P4 uniform group-as-unit placement. Plates and labels are not moved, so no non-text element moves.
3. Only UNGROUPED texts under FLOOR_PX=6 are re-fit: shrink ladder x0.9, shelf-pack, treating every grouped element's rotated box as an obstacle, GAP 2px.
4. Rotation: degrees clockwise about the element centre. engine.text_fit.aabb gives the rotated axis-aligned box; bounds and overlap use it. Rotation values are never changed.
5. Reverted narrowings: test_fields.py is byte-identical to base 4c86006. test_layout.py keeps the original uniform assertions and adds refit-path assertions beside them (uniform path asserted at least 3 targets).
6. Tests (tests_python/test_text_fit.py): group containment on L3 -> 728x90 and 120x600; rotated box inside canvas and inside plate; rotated ungrouped text clear of other text; unmet grouped ids pinned; L1/L2 JSON cmp-identical to P4.
7. Measured L3 -> 728x90 (px): headline 13.95, subhead 7.67, legal_text 6.0. Unmet, grouped: badge1/2/3_label 1.0, cta_label 1.47, ribbon_label 1.33 (below floor, kept inside their plates).
8. Ribbon plate rotated box overhangs the canvas top by 0.04px; the source overhangs by 0.6px. Test allows no more than the scaled source overhang.
9. Ledger (evidence/ledger.txt): Pillow vs upstream renderer lookup, same line counts and widths on 3 re-fit texts. Geometry only, not a visual claim.
10. Mutants: group containment off (10 failures), rotation ignored (1), floor off (9). run_official_samples.sh copies engine/*.py and turns RuntimeWarning into an error.

## Known limits
Ungrouped headline overlaps the ungrouped `product` image (350.7,12 to 377.3,38.7) in L3 -> 728x90: only grouped boxes (and other re-fit texts) are obstacles, ungrouped non-text elements are not. The ledger compares Pillow against the renderer's char_widths/wrap_text, not pixel widths. Grouped labels stay unreadable at 1.0-1.47px. Ribbon plate rotated box overhangs the canvas top by 0.04px vs 0.6px in the source.
