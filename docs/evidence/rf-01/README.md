# RF-01 evidence: real-renderer text ink probe (issue #95)

Source `d792df1ed65f548fd57c4991ed6a25ef79b24a56`; starter `a44a06046b0413f0785e7203955c3822e0acbc32`. Host: Linux x86_64 (Nala). Python 3.11.16, skia-python 144.0.post2, Pillow 12.3.0, fontTools 4.66.1, numpy 2.4.6.
Env: `CHAMELEON_UPSTREAM=/home/nala/.local/share/reflow-runtime/chameleon-a44a060`, `LD_LIBRARY_PATH=/home/nala/.local/share/reflow-runtime/chameleon-syslibs/root/usr/lib/x86_64-linux-gnu`.

## Command
`/home/nala/.local/share/reflow-runtime/chameleon-venv311/bin/python -m unittest -v tests_python.test_text_ink`

## Results
- RED (stub, before implementation): 13 tests, 2 failures + 11 errors. Log `reports/rf-01/red.log` (ignored, not committed).
- GREEN (first commit c20a81e): 16 tests, 0 failures, 0 skips.
- Review round 1 (Reviewer REVISE on c20a81e): R1 far-off-canvas false negative, R2 untested rotation sign, N1 weights. RED `reports/rf-01/red2.log`: 23 tests, 5 failures. GREEN `reports/rf-01/green2.log`: 25 tests, 0 failures, 0 skips.
- Review round 2 (Coordinator follow-up): multiline height, SolsticeSerif Regular and Bold coverage, PNG policy, and mutation table integration. GREEN `reports/rf-01/green3.log`: 29 tests, 0 failures, 0 skips.

## Mutation Results Table
| Mutant | Description | Test(s) Catching | Outcome |
| --- | --- | --- | --- |
| M1 | Accept any font hash | `test_substituted_bytes_rejected` | Killed |
| M2 | Clip never reported (`lost_px=0`) | `test_edge_straddling_text_loses_ink_to_canvas`, `test_rotated_text_off_canvas_is_clipped_but_unrotated_is_not` | Killed |
| M3 | Overflow never reported | `test_unbreakable_word_in_narrow_box_overflows` | Killed |
| M4 | Ignore rotation in element frame (`a=0`) | `test_rotated_text_inside_its_own_box_is_not_overflow` | Killed |
| M5 | Drop fractional-size truncation note | `test_upstream_truncates_fractional_size` | Killed |
| M6 | Drop complex-script note | `test_complex_script_recorded_even_when_glyphs_exist` | Killed |
| M7 | Flipped rotation sign | `test_text_that_fits_its_rotated_box_is_clean_at_non_right_angles` | Killed |
| M8 | Fixed pad 300 on X | `test_text_far_off_canvas_reports_all_ink_lost` | Killed |
| M8b | Fixed pad 300 on Y | `test_text_far_above_or_below_canvas_reports_all_ink_lost` | Killed |
| M9 | Border-touch guard removed | `test_border_guard_raises_when_ink_touches_padded_edge_and_not_otherwise` | Killed |
| M10 | Int weight mapped to bold | `test_int_and_unpinned_weights_are_rejected_explicitly` | Killed |
| M11 | Capitalised weight not lowercased | `test_capitalised_and_lowercase_bold_read_the_bold_face` | Killed |

## What the probe does
Renders one text element through the existing `RealRenderer` (hash-pinned faces, fallback/substitution refused) on the real canvas and on an extent-derived padded canvas with identical transforms and fractional size. Pad is derived per axis from centre, size, text length, and rotation reach, plus 8px. A border guard raises `ValueError` if ink touches the padded border, preventing undercounted lost ink. `lost_px` = padded ink minus real-canvas ink. `overflow_px` = ink outside the element box in the element's own (rotated) frame.

## Paired controls
| behavior | failure | valid control |
| --- | --- | --- |
| wrapping | 20-char word, 60px box -> overflow | same word, 380px box -> clean |
| clipping | x=-120 -> lost_px > 0 | x=20 -> lost_px 0 |
| far off canvas | x=-480/-700/2000, y=-700/-480/1500 -> all ink lost, clipped | same text at x=20 -> not clipped |
| rotation clip | rotation 90 at right edge -> lost_px > 0 | same box, rotation 0 -> clean |
| rotated frame | rotated word wider than box -> overflow | rotated "Hello" inside box -> clean |
| rotation sign | long text, 100px box at 30/-30/45 deg -> overflow | 'Hello world' in 240x40 box at 30/-30/45 deg -> clean |
| multiline height | 8 words, size 24, 160px box, h=40 -> overflow (~2411px) | same text in h=400 box -> clean, identical ink |
| serif faces | n/a | SolsticeSerif Regular and Bold render with exact pinned hashes |
| fractional size | 24.9 renders identical to 24, differs from 25 | integer size has no truncation note |
| font substitution | wrong bytes -> `hash` error | pinned faces load |

## Recorded unsupported shaping (from the code and pinned faces, not assumed)
- Upstream `cr_renderer/text_utils.py` draws `skia.Font(typeface, int(fontSize))`: fractional sizes truncate, while wrap is measured at the float size (`renderer/converter/wrap.py`).
- Glyphs are positioned by advance only; the Solstice Sans GPOS has only `abvm`, `blwm` (no `kern`). Kerning is not applied. `test_av_advances_are_summed_without_kerning` only checks the `no kern feature` note and that the `hmtx` advance sum for `AV` is positive; it does not measure rendered pixel positions, so kerning remains a recorded limitation, not a pixel-verified behavior.
- Devanagari-range input is reported `complex-script` (unshaped, unqualified) even though the face has the codepoints; codepoints absent from the face are `missing-glyph` (CJK U+4E2D checked).

## Limits
- The multiline-height, SolsticeSerif and AV tests added in review round 2 were not mutation-tested; the table above covers earlier rounds only.
- numpy is required by `scripts/quality/text_ink.py` and is pinned only transitively (`constraints-python-submission.txt`); not added as a direct dependency here.
- Only `regular`/`bold`: int and `semibold` weights are rejected, not mapped.
- Italic faces are pinned in `PINNED_FACES` but not drivable by `probe` (no API/weight support for italic).
- Representative PNGs are retained in `docs/evidence/rf-01/png/` (hashes, ink counts and bboxes in `pngs.json`), regenerated deterministically (two runs, identical JSON) by `make_pngs.py` (run from repo root with `PYTHONPATH=.` and the pinned env) and opened from disk:
  - `clip_failure_real.png`: `Hello world` at x=-120 loses `Hello ` off the left edge; `clip_failure_padded.png`: same element on the padded canvas shows the whole string (lost ink is invisible in the real PNG alone); `clip_control_real.png`: same text inside the canvas, unclipped.
  - `overflow_failure_boxed.png`: element box h=40 (red) over the real pixels, wrapped lines 2-4 fall below it; `overflow_control_boxed.png`: box h=400 (green) contains the same pixels (`overflow_text.png`, unannotated).
  - `wrap_valid_wide_box.png` ("Supercalifragilistic", 24px Sans Regular, 400x120, box 360 wide) and `wrap_fail_narrow_box.png` (box 60 wide) are BYTE-IDENTICAL (same sha256 in `SHA256SUMS`; asserted by the script). The probe reports overflow False for 360 and True (1346 px) for 60, so that overflow is geometric only and NOT visible in the PNG; `wrap_fail_narrow_boxed.png` adds the box overlay to show it.
  - Visual coverage is therefore limited: the PNG check shows only the clip case directly. The overflow cases need the box overlay or the numeric probe.
  - Checksums: `cd docs/evidence/rf-01 && sha256sum -c SHA256SUMS`. Render command: `PYTHONPATH=. CHAMELEON_UPSTREAM=<a44a060 checkout> LD_LIBRARY_PATH=<native libs> <chameleon-venv311>/bin/python docs/evidence/rf-01/make_pngs.py`.
  - No italic, no visual-quality claim.
  - The overlay boxes are drawn by the script, not by the renderer. No renderer/layout change is made by RF-01; PNGs inspect the probe only, no visual-quality claim.
- The RED/GREEN/mutation logs live in gitignored `reports/rf-01/` and are not in the commit; counts above are from those local runs.
- The extent-derived padded canvas has a 60M-pixel safety cap, raising `ValueError` if exceeded.
