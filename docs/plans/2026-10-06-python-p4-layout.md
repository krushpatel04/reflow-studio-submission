# P4 (M4): deterministic layout in engine/resize.py

Base d2e716b (main 07efe3c + P1 + P2). Branch jo/reflow-milestone-python-p4-layout. Geometry facts only; no layout-quality claim.
1. Keep one uniform scale s = min(tw/sw, th/sh), centered. Every element uses it, so aspect ratios and group-relative offsets are preserved by construction.
2. Bleed rule, official data only (no roles, no id heuristics): an UNGROUPED rectangle shape or cover image whose frame covers the whole source canvas fills the target. Grouped or contain/fill images are not stretched (ported from engine-background-bleed / grouped-layout TS tests).
3. Image frames never change aspect, except the full-bleed cover image above: its frame fills the target, `fit: cover` stays, so the renderer crops and does not stretch.
4. Impossible cases raise ValueError naming the element id: scaling that overflows to non-finite. Off-canvas source placement (L2 deco_circle_1 at -100,-100) stays legal. font_size floors at the schema minimum 1 (public sample level3 legal_text scales to 0.8, so raising would fail it); tested and documented, not silent.
5. Deterministic: pure function, no clocks/randomness/set order; same input gives byte-identical json.dumps(sort_keys=False).
6. RED first: tests_python/test_layout.py (aspect, group relative layout, inside-canvas, impossible cases, determinism, bleed positives and negatives).
7. Positive control: tests_python/run_official_samples.sh must print 3 REAL, 0 FALLBACK; P1/P2 tests stay green.
8. Mutation: 2 mutants (drop grouped check in bleed rule; drop non-finite check; bleed contain images) must die.
9. Out of scope: text wrapping/fitting (P3), focal point crop (no focal field in official schema), pixel checks.
10. Limits: geometry only; visuals not assessed here.
