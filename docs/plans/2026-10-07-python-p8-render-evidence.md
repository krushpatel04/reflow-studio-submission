# P8: genuine-renderer evidence for cases P6/P7 only measured as JSON or unit tests

Branch jo/reflow-milestone-python-p8-render-evidence, base main 56d4e4a. Evidence-first; engine untouched unless a real defect is found. No quality claim; I report measured numbers and what I looked at, Reviewer judges.
## Problem
P6 README limits: L3 -> 120x600 is JSON only (badge2 label 4.86px), the rotated group is only unit-tested, no extreme-aspect synthetic is rendered after P6/P7.
## Scope
1. Cases, each rendered through the genuine renderer on main 56d4e4a (REAL, 0 FALLBACK, RuntimeWarning = error as in run_official_samples.sh):
   - C1 L3 public input -> 120x600 (real sample content, narrow).
   - C2 synthetic rotated ribbon group (-12 deg, plate+label) -> 728x90 and -> 300x250.
   - C3 synthetic extreme aspects with ungrouped text + plate groups: 1200x1200 -> 1000x60 and -> 60x1000.
2. Kept: every output JSON and PNG, run logs, sha256, including any failure or exception verbatim (no pruning).
3. Measurements from JSON (stated as measured): per label px, below-floor ids, label inside plate (rect and rotated AABB), rotated AABB inside canvas (source-overhang x s allowance), text/text and text/group overlap, ids/text/assets/group/rotation preserved vs source.
4. Visual inspection: I open each PNG and state what I saw (group association, clipping, overflow); ink-bound numbers only where reliable, otherwise UNRELIABLE (R4 rules). Reviewer judges.
## Engine rule
Change engine/text_fit.py ONLY for a real defect (invariant broken: group association, rotation, ids, label outside plate, text overflow of its own box, unwarned floor miss that the contract says is fixed). Then: RED test first with log, minimal fix, mutants, one full validation under flock /tmp/quoroum-full-validation.lock. Known measured limits (label < 6px when no k packs, shapes' bbox not outline) are NOT defects; they are reported.
## Acceptance
docs/evidence/2026-10-07-p8/: driver.py, cases JSON, outputs + PNGs, run logs (3+ REAL/0 FALLBACK per case), measurements.md generated from disk by script, README with what was seen and honest limits, sha256.txt. Tests only if an engine fix lands (no tests added for evidence-only). Owned ref pushed to exchange.
## Out of scope
New layout features, k/s cap, outline-accurate obstacles.
