# P10: sub-floor plate labels (C1 badge2 4.86px, C3b cta 4.37px)

Diagnosis (`diagnose.py`/`diagnose.txt`): no obstacle blocks the rigid ladder; the CANVAS does (plate already 92%/91% of canvas width, max rigid f 1.089/1.097 vs 1.235/1.372 needed). Change: when no rigid k packs, geometry stays the uniform P5b one and the label font is raised to 6px in place iff the Pillow-measured text fits its own SCALED box (all sub-floor labels of the group or none, no letter_spacing). NOT a floor guarantee.

Files: `red_batch1.log`, `red_batch2.log` (RED on main engine), `green_targeted.log`, `mutants.log` (15 mutants; run 1 had 4 survivors, `mutants_run1_survivors.log`; run 2 1 survivor, `mutants_run2_survivor.log`; final run 0 survivors), `run/` (genuine-renderer PNG/JSON/logs for C1..C3b, REAL events), `ink_labels.txt` (rendered ink vs PIL width), `tests_deletions_vs_main.txt` (0 deleted test lines: pin untouched), `full_validation.log`.

Ink check: C1 badge2 PIL width 72.0, rendered ink 72px, inside label box and plate; C3b cta PIL 31.0, ink 30px, inside. Two cases only; ink thresholds per case (see script). Label stays top-aligned in the plate (P9); no layout-quality claim.
Identity: L1/L2/L3 resize hashes equal main (5553467c..., b6d53add..., 65e0278b...). Only badge2_label.font_size (4.86->6) and cta_label (C3b 4.374->6, C1 cta untouched) differ from main in the P8 cases (hash test with font restored).

Official-samples run: `tests_python/run_official_samples.sh` printed `PROOF real renderer x3, 0 fallback` (exit 0) on the final engine; its output directory was empty, so no files from that run are committed. The committed genuine-renderer evidence is `run/` (C1..C3b, REAL events in the logs) and the L1/L2/L3 hashes above.
Scope honesty: Reviewer reran 6 of 15 mutants; C3b P10 render not visually viewed; ink_labels read not rerun. `mutants.txt` is a stale partial first run (3 lines), superseded by `mutants.log`.
