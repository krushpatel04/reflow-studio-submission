# P2 official field matrix (PY-MIGRATION-2026-10-06, M3)
Base efc05cb. Upstream schema: chameleon_design_schema_v0.9.json @ a44a060. Mutations validated: 2/2 killed.

## Change
- `engine/resize.py` : added `_fields()` to validate every non-geometry field per the schema v0.9 rules (enums, bounds, required-to-type, and `style_runs` shape). Rejects bool/non-finite geometry, NaN/inf, missing required fields, malformed style_runs.
- `tests_python/test_fields.py` : P2 (M3): schema-derived field matrix test (28 fields, each set in fixtures), negative value and missing-field rejection test, 3 public-sample roundtrip tests.

## Evidence (docs/evidence/2026-10-06-python-p2/)
- RED (red.log): 12 tests, 89 subtest failures; the 8 positive-matrix and 2 public-sample tests already passed. Unvalidated fields: rotation, opacity, z_index, group_id, max_lines, font_weight, font_style, text_align, fit, asset_id, shape_type, fill_color, stroke_color, style_runs, content, font_size, line_height, letter_spacing, type. 82 bad values and 7 missing required fields not rejected.
- GREEN: tests_python/test_fields.py: 36/36, `python -m unittest discover -s tests_python -t .`.
- Mutation: 2/2 killed. Mutant A: removed style_runs output → 12 fails/2 errors. Mutant B: stopped scaling corner_radius → 4 fails.

## Limits
- Layout quality unassessed. No visual review.
- Only verified per-field I/O; candidate selection, crop/focal handling, rotation bounds, and font rendering fidelity are out of scope for this slice.
- Tested on CPython 3.11 only (same env as P1). Public sample test skips if upstream input/ is missing (set CHAMELEON_UPSTREAM).
