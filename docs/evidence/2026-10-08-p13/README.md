# P13 pin the P11 retry cap (test-only)

Added `WrapCapPadding.test_retry_cap_is_pinned_to_tw_minus_3_over_1_02` (additions only; `git diff main -- tests_python` has 0 removed lines; `git diff main -- engine` empty). Constant-width fake font, tw=150: text A (147 wide) cannot pack on the first attempt (box 152 > tw) so the retry runs and A must wrap (exact 2-line height); text B (144 wide, in ((tw-4)/1.02, (tw-3)/1.02]) must stay ONE line (exact height). Ranges asserted in the test. `_fonts_dir` and `_font` are patched, so it needs no brand kit.

- GREEN on unmutated code: `green_main.log` (test_text_fit 40 OK).
- RED under `cap-minus-4`: `red_cap_minus_4.log` (B wraps: height 14.4 != 7.2).
- Mutants (`mutants.log`, full `test_text_fit`, `python -B`, `__pycache__` cleared per run): 11 killed incl. `cap-minus-4` NEWLY killed; `cap-off-by-one`, `cap-no-padding-division`, `retry-disabled`, `images-ignored-retry-dropped` stay killed. `cap-minus-2-instead-of-3` is killed by older tests (not by this one: on this case a -2 cap equals main's first attempt). `mutants_wrapcap_only.log` = earlier attempt scoped to `WrapCapPadding` only (kept; there `images-ignored-retry-dropped` survives because that kill lives in another class).
- `cap-loop-inner-outer-swapped`: still SURVIVES; documented UNPROVEN-EQUIVALENT, not claimed covered, not scoped.
- Claim: the exact retry cap is pinned by one test. No engine change, no quality claim.
