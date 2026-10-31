# P6 evidence (plan 0fa550e; geometry facts only, no layout-quality claim)
- red.log: RED run at 7cb7f75 (5 labels at 1.0-1.47px, ladder missing).
- before/ = base a305c22 pipeline, after/ = this branch; each run: `bash tests_python/run_official_samples.sh <dir>`; run.log = 3 REAL / 0 FALLBACK, exit 0 both.
- L1, L2 output JSON `cmp` identical before/after.
- groups.md: L3 per-label px before/after and positions; all 5 groups now 6.0px; no non-group non-text element changed.
- P10 update: where no rigid k packs a group (e.g. L3 -> 120x600 badge2, 1200 -> 60x1000 cta) the label font is raised to 6px in place if its text fits its box; geometry is the uniform placement. Not a floor guarantee. See docs/evidence/2026-10-07-p10/.
- Limits: groups end 4-6x larger (k/s) than neighbouring unscaled elements; all groups packed into the top row; headline/subhead also moved/resized (texts repacked after groups). Ungrouped shapes are not obstacles. Synthetic rotated/narrow: narrow_120x600.md is JSON only (not rendered); rotated case covered by RotatedBounds test, not rendered here.
- sha256.txt covers before/after JSON+PNG. Failed attempts: none beyond red.log.
