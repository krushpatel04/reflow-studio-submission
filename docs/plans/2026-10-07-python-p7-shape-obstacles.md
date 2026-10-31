# P7: ungrouped non-bg shapes become obstacles for repacked text (engine/text_fit.py)

Branch jo/reflow-milestone-python-p7-shape-obstacles, base main c9178a6 (P6 merged). Geometry facts only; no layout-quality claim.
## Problem and evidence
P6 README limit: "ungrouped shapes are not obstacles". Re-fit texts (and P6 groups) can land on top of an ungrouped shape (e.g. a decorative circle or card) that the source kept them off. Images got this fix in R6 (`imgs`, per-text source-overlap exemption, fallback = images ignored); shapes did not.
Measured on public samples (ungrouped shapes, from input JSON): L1 none; L2 deco_circle_1, deco_circle_2 (refit not triggered, hash pinned); L3 none (bg is an image). So P7 cannot change any public output: L1/L2/L3 JSON must stay byte-identical. Measurable gain exists only on a synthetic fixture; stated, not hidden.
Option "cap k/s imbalance" rejected: it would change L3 group sizes (P6 contract: labels reach 6px) and needs a quality judgement; out of scope.
## Scope
engine/text_fit.py only (+ tests, evidence, docstring line). Obstacle set for ungrouped texts and P6 groups = ungrouped images (as now) + ungrouped shapes except full-bleed (`_covers`/`_covers_src`: source rect covers the source canvas). Same rules as images: per (text|group, shape) exemption when the SOURCE rects overlap (a text on its own card stays on it); fallback when nothing packs = same P5b/images-ignored placement, now shapes ignored as well; floor, groups, rotation never weakened; no new warning.
Not in scope: grouped shapes (already protected obstacles), line shapes treated like any shape by their AABB, no id/role heuristics.
## RED tests (tests_python/test_shape_obstacles.py, RED log before engine edit)
1. text below floor, source clear of a rectangle and an ellipse shape -> output text AABB overlaps neither (RED today).
2. positive control: text whose source rect overlaps the shape (text on a card) -> shape not an obstacle, text may stay on it.
3. full-bleed ungrouped rectangle (bg) never an obstacle (texts still place).
4. P6 group with no source overlap with a shape -> group does not land on it; with source overlap -> exempt (pairwise per member, not union box).
5. no-fit: shape wall leaves no room -> output equals the shapes-ignored placement exactly (cmp).
6. determinism: repeat equal, permuted input order equal per-id geometry.
7. L1/L2/L3 output JSON sha256 equal to base c9178a6 (pin stored in the test from a measured run).
## Mutants (must die, logged)
shapes off; exemption global; exemption inverted; full-bleed shape counted as obstacle; union-box exemption for groups; fallback removed.
## Acceptance
Unittest in dev env (recipe c9178a6-python-ENV-RECIPE.txt) once at final SHA under `flock /tmp/quoroum-full-validation.lock`, `--test-concurrency=2` if supported; 3 REAL / 0 FALLBACK on genuine renderer; L1/L2/L3 JSON cmp-identical to base; synthetic fixture rendered before/after PNG+JSON with sha256; ids/text/assets/group/rotation preserved; owned ref pushed to exchange. If no measurable change on the synthetic fixture after one attempt: report blocker + evidence, park.
## Limits (stated)
No public sample exercises it; gain measured only on a committed synthetic fixture. Shape AABB (rotated) is the obstacle, not the drawn outline (ellipse corners count). No quality claim.
