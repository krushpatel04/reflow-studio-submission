# P12b: render.py binds task faces into text_fit.faces()

Proven on a LOCAL scratch merge: exchange/github/main 803bc1c + agent-3 0b6ecf4 (PR87, not yet on main) + b032f20. `render.py` and `engine/**` unchanged by the GREEN step; only tests and fixture changed.

- `tests_python.test_render_font_binding`: 7 tests OK (`test-scratch-merge.log`). Real `render.run()`, two fontTools faces (500/800 units): `metric_sha256 == font_events sha256`, width follows bytes, one enter/exit per task with renderer records, no leak across tasks, reset after run, gate when `faces` absent, weight 600 and italic faces resolve with no warning.
- Mutants on render.py (`mutants.sh`, `mutants.log`): 10/10 KILLED. Engine-side mutants (duplicates, cache) are agent-3's `docs/evidence/2026-10-08-p12/mutants.sh`.
- Earlier empty `metrics` was a fixture bug (source font 40px scaled above FLOOR_PX 6, fit never ran); fixture now uses 15px.
- Interface: no mismatch with `faces(records)`.

Not claimed: real LICA fonts, visual quality, Docker/Mac. Final SHA validation after PR87 merges and rebase.

## Reviewer follow-up (b032f20 reject)
- Vacuity fixed: fixture fontSize 15px (fit now measures); `test_fit_font_hash_equals_renderer_font_hash` asserts `audit['metrics']` NON-EMPTY before comparing hashes.
- RED on main engine (b7548b2/803bc1c `text_fit.py`, `faces` absent): `red-main-engine.log`, 4 FAIL + 2 ERROR. The hash test fails on a real hash-set mismatch (fit measured Solstice, renderer drew the constructed face), and widths are equal (86.0). The 2 ERRORs are the AttributeError spy/reset tests.
- Mutants: `mutants.sh` / `mutants.log`, 10/10 killed: bold `>600`, `>=700`, with-block dropped, family substitution, no `ttf_sha256`, no `path`, weight swap, forced style, audit always bound, gate dropped. "Missing reset" is engine-side (`faces` owns the context reset); covered by `test_context_is_reset_after_run` and agent-3's mutants. "Gate inverted" is not scripted separately: `audit-always-bound` and `gate-dropped` cover both gate branches.
- Full python suite on the scratch merge (`full-suite-scratch-merge.log`): `Ran 244 tests ... OK`, exit 0. The `FAIL:` lines after `OK` are printed by the offline-smoke tests exercising failure paths, not unittest results. Not run: `test_lica_raster` Node/@playwright env error on main is not reproduced here; not asserting anything about it.
