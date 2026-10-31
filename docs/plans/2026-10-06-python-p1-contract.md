# P1 Python contract slice (PY-MIGRATION-2026-10-06, M2/M3)

Base `9930871`. Upstream starter: jhaaj08/chameleon `a44a060` (engine/resize.py contract). TS tree, root Dockerfile and package files untouched.

## Change
- `engine/resize.py`: validation + one uniform scale `s = min(tw/sw, th/sh)`, centered. Groups move as units (same transform for every element).
  `font_size`, `letter_spacing`, `corner_radius`, `stroke_width` scale by `s`; `font_size` floored at 1. A `fit: cover` image that covers the source canvas fills the target (official fields only, no ids/roles); a cover image that does not cover, and every contain image, keep aspect.
- Input deep-copied; unknown fields, `style_runs`, rotation, opacity, z_index, group_id, content, fonts pass through verbatim.
- Rejects (ValueError): bool/non-finite/non-number geometry, negative size, canvas dims not int in [1,100000], missing/duplicate/blank ids, empty/malformed elements. Zero-size elements accepted.
- `tests_python/test_contract.py` (24 unittest tests), `tests_python/run_official_samples.sh`.

## Evidence (docs/evidence/2026-10-06-python-p1/)
- RED `red.log`: starter stretch at 9b635fd, 24 tests, 12 failures + 2 errors (non-uniform scale, nested input aliased, no validation).
- GREEN `green.log`: 24/24.
- Mutation `mutation.log`: min->max scale (4 fail), deepcopy->dict (1 fail), cover detection off (1 fail); all killed, file restored.
- Samples `sample-run.log`, `sample-output.sha256`: upstream `engine.main` on 3 public tasks, `engine.resize.__file__` is this repo's file, 3x REAL renderer path, 0 fallback, exit 0.
  Run: `python -m unittest discover -s tests_python -t .` ; `tests_python/run_official_samples.sh OUTDIR` (needs upstream clone, venv, LD_LIBRARY_PATH syslibs; see run script env vars).

## Limits
Layout quality not assessed (no visual review, no score). No text re-wrap/fit, no candidate selection, no crop/focal handling, rotation not bounds-checked. level2 self-check still warns `deco_circle_1` off-canvas: the source places it at (-100,-100) and it is preserved. Letterboxing leaves empty bands on extreme aspect changes. Py 3.11 only tested.
