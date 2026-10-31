# P7 evidence (plan 5147905; geometry facts only, no quality claim)
- red.log: RED run at 7a3b3f8 (3 shape-obstacle tests failed).
- before/ (base c9178a6) and after/ (this branch): official samples run via `bash tests_python/run_official_samples.sh <dir>`.
- Proof: 3 REAL / 0 FALLBACK, exit 0 on both. L1, L2, L3 output JSON `cmp` identical to base.
- synthetic/: P7_shapes case (ungrouped card + circle). before = lands on both shapes; after = clears both shapes (REAL render).
- mutants.log: 7 mutants run; 6 killed in the first run, "full-bleed shape counted" survived (equivalent for in-canvas text) and is killed by test_full_bleed_shape_not_an_obstacle_for_text_outside_its_source_rect (rerun on test_shape_obstacles only, engine unchanged). test_lica_batch fixture-rebuild failure is a pre-existing environment failure, not a mutant kill.
- sha256.txt covers genuine-renderer before/after outputs and synthetic files.
