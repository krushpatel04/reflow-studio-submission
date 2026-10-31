# RF-02 evidence: wide Level 2 composition (issue #96)

Base `c75a0eff2be5ab565995b865ca6dbcbd40ce61b6` (RF-01 merged). Target: public official `chameleon_sample_level2_core`, 1080x1080 -> 1600x400 (development input, not held-out). Host Linux x86_64 (Nala), Python 3.11 venv `chameleon-venv311`, upstream `a44a060`. Env: `CHAMELEON_UPSTREAM`, `LD_LIBRARY_PATH` incl. browser-libs, `PYTHONPATH=.`.

## Step 2: RF-01 limits vs engine metrics
Real-renderer text-ink probe on the c75a0ef output, 4 texts: overflow False, clipped False for all. The RF-01 `int(font_size)` truncation reproduces (ink narrower than float metric: subhead 8.89px 201 vs 247px, badge 6.67 41 vs 46, headline 20.74 157 vs 164, cta 8.15 104 vs 105): boxes over-wide, never too narrow. This is a measured limit, not a defect (no overflow, no clip). Measured limit (metric vs ink), not a defect: no overflow or clip; no behavioral parity defect, so no separate parity slice. Raw per-text numbers came from an ad-hoc script (`reports/rf-02/parity.py`, not committed).

## Change (`engine/text_fit.py::_wide`)
Only when target aspect >= 2x source aspect AND every ungrouped text is below a non-background ungrouped image in the SOURCE, the ungrouped texts move into the free lane right of all other content, stacked in source order at the largest whole font size <= source. Groups, images, shapes, z_index, group_id, rotation, content untouched. No roles. No fit -> uniform output unchanged.

## Same-renderer comparison (real `render_design_to_png`, same assets)
`png/source.png`, `png/current.png` (c75a0ef behaviour), `png/candidate.png`; hashes in `SHA256SUMS`; numbers in `measure.json` (`measure.py`; current = same code with `WIDE_RATIO` disabled, hash reproduces `b6d53add...`).
| | current | candidate |
| --- | --- | --- |
| foreground bbox / canvas | 0.245 | 0.610 |
| headline px | 20.74 | 56 |
| subhead px | 8.89 | 24 |
| badge label / CTA label px | 6.67 / 8.15 | 6.67 / 8.15 (unchanged) |
| min rendered text px | 6 | 6 |
| level2_core sha256 | b6d53add... | 4aeec49c... |
L1 and L3 output hashes are unchanged for their own sample targets only (1080x1350 and 728x90); L1 at wide targets does change (see R2). I opened the three Level 2 PNGs from disk.

## Tradeoffs (not a quality claim)
- Bounding-box coverage rises, but that counts the gap between the product and the right-hand text; ~560px on the left stays empty. Less whitespace is not claimed better.
- Reading order changes: the CTA and product stay centre-left while the headline moves right, away from the CTA. The subhead wraps to two lines with a one-word orphan ("hour.").
- Badge and CTA labels remain tiny: grouped text is untouched by design. The product, logo and group plates stay at uniform scale.
- Headline/subhead return to source size; they sit over background art (an existing bokeh dot), no overlap with any foreground element.
- Threshold 2x and the below-image trigger are documented choices, not tuned; one public target was designed and inspected (Level 2). Level 1 wide output also changes (see R2 below) and is only lightly inspected.

## Tests and counts
`tests_python/test_wide_composition.py`: RED (base): 7 run, 3 fail on behavior, 4 controls pass, 0 skips. Final SHA (code, with the two transferred pins updated): `test_wide_composition` 9/9, `test_text_fit` 40/40, `test_shape_obstacles` 9/9, all OK, 0 skips. Full discover: 302 run, 0 failures, 1 ERROR, 0 skips: `test_lica_raster.RasterContentCoverage.setUpClass` (missing `@playwright/test` node module), identical on base c75a0ef, environmental and not a pass. Logs in gitignored `reports/rf-02/final-*.log`.

## Hash pin transfer (Coordinator, recorded, message-bound)
Scope: ONLY the `level2_core` expected hash on one line in each of `tests_python/test_text_fit.py` (`test_l1_l2_output_hash_unchanged`) and `tests_python/test_shape_obstacles.py` (`test_public_samples_byte_identical_to_base`). `git diff --numstat` for both: `1 1`. Level 1 and Level 3 hashes, logic and names are byte-identical.
- old `level2_core`: `b6d53add9e1abdc09f369106afa9bd611974d89f2c0171dcdaa8433271731623` (reproduced from c75a0ef behaviour with the reflow disabled, see `measure.json`)
- new `level2_core`: `4aeec49c3468c0ad1eb9486201be945a5af6a799b7674b2b6bdb0744669cd4c7`
- Command: `PYTHONPATH=. <venv>/bin/python docs/evidence/rf-02/hashes.py` with the pinned env. Result (re-measured on the candidate tree):
  - level1_warmup `5553467cf7ae106de6c6502aec567c3f23c5a953d4a43c47a4ef5c98b8f4e23a` unchanged (sample target 1080x1350 only)
  - level3_advanced `65e0278b151fa114ef2155451d14930c99e60c64a560114bcd48d716c27bca26` unchanged (sample target 728x90 only)
- The L2 change is the composition change only: `png/source.png`, `png/current.png`, `png/candidate.png` from the same real renderer; the diff between current and candidate is limited to headline and subhead (`measure.json`), all other elements byte-equal in position/size.
- Intermediate commits `27bba66` and `15677e0` leave both pins red by design; the pins are updated only in the final candidate commit. If the candidate is rejected, revert both pins.

## The 1 env ERROR, same on base
`tests_python.test_lica_raster.RasterContentCoverage.setUpClass`: `Error: Cannot find module '@playwright/test'` (Chromium raster probe, node dependency not installed on this host). Reproduced on a clean detached `c75a0ef` worktree running only `tests_python.test_lica_raster`: `Ran 3 tests, FAILED (errors=1)`, same message; the full-discover base run also shows it (302 run, 3 failures that are the new RED controls, 1 error). Not a pass, not caused by RF-02.

## Reviewer R2 addition: Level 1 sample at wide targets
L1 is NOT claimed verified. The reflow also applies to the public Level 1 sample (`chameleon_sample_level1_warmup`) at wide targets (e.g. 1600x400: headline scales up from 22.2 to 60px, cta from 11.1 to 30px; Level 1's native 1080x1350 is unchanged). Rendered L1 comparison images are saved under `docs/evidence/rf-02/png/l1_candidate_1600x400.png` and `l1_current_1600x400.png`. L1 is a development input, not held-out evidence.
Opened from disk, `l1_current_1600x400.png` vs `l1_candidate_1600x400.png`: candidate headline and CTA text are larger and sit in the right lane; the logo stays centred and the left ~60% is empty. The CTA is plain text in the source (no plate group), so nothing else moves. Measured only on 1600x400; 2000x400, 1500x400, 3000x600 gave the same sizes (60 / 30) in `l1_wide.out` and were not rendered. No layout-quality claim.

## Reviewer R1 addition: trigger negatives
`test_trigger_negatives_fall_back_to_uniform` (headline above the product in the source; rotated headline) and `test_grouped_text_never_joins_the_lane` (grouped headline keeps uniform scale while the ungrouped subhead still reflows). Mutation check on `engine/text_fit.py`, each reverted afterwards: removing the below-image guard fails the trigger-negative test; removing the rotation guard fails it; including grouped texts fails the grouped test plus 3 reflow tests. All three killed.
