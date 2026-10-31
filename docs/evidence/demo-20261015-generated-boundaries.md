# Evidence: #26 criterion 1 generated underflow/degenerate boundaries

**Source:** exact `240f0b6d6a278d7141edcd7e8dc46a351dc76be7`, isolated worktree `engine3-issue26`, `node_modules` symlinked to the
existing baseline dependencies (no install). **Window:** 2026-10-14T03:56:39Z–04:56:39Z, 3 of 3 commands used.
**Plan:** `docs/plans/issue26-generated-boundaries.md`. **Change:** six tests appended to `tests/engine.test.ts`; no production files.

## Result: prediction vs actual
All six characterization tests passed on the first run. Every prediction held; no structurally invalid success found (no RED).

| ID | Predicted | Actual |
|---|---|---|
| U1 decoration w=5e-324 | throws, all `invalid-design`, source unchanged | as predicted |
| U1+ background w=5e-324 | success, validates | as predicted |
| U2 content text w=5e-324 | invalid baseline, valid alternative selected | as predicted (selected ≠ baseline strategy) |
| D1 content rect w=h=5e-324 | throws, all `invalid-design` | as predicted |
| G1 grouped label w=5e-324, plate 2000 | throws, all `invalid-design` | as predicted |
| G1+ grouped label w=1 | success, validates, members in target | as predicted |

Successes are checked independently with `validateDesign`, absence of structural findings, finite positive geometry and an
unchanged source. No injected findings, invalid sources or forced `NoValidCandidateError`.

## Guarded commands (`heavy_job.py` + `timeout --signal=TERM --kill-after=5s 900s`, each once)
| # | Command | Exit | Result | Log SHA-256 |
|---|---|---|---|---|
| 1 | `node_modules/.bin/tsx --test tests/engine.test.ts` | 0 | 22 pass, 0 fail/skip | `83e82fd73768be65ea103a44f2912fcc4a95d8ec43c1a7b38e1a9759209e6c78` |
| 2 | `npm test` | 0 | 695 pass, 0 fail/skip/cancel | `0bbce93e6996bf34e9efb70f199ecc59051249419fe3d32147cafee97d0a793e` |
| 3 | `npm run build` | 0 | built; existing >500 kB chunk warning | `c3bd8ca29259acf05ee9d2db79e3430a966046a72bd60cdf9a9c2b79fab67be6` |

Logs and receipts were copied to `/home/nala/.local/share/reflow-run-20261015/engine3-issue26-{focused,full,build}{.log,-receipt.json}`
(PIDs 675445, 676205, 690192). Tested `tests/engine.test.ts` SHA-256 `96be955bf8159142829c114cd8f3b1a511dacef559cbc186f7348fda0cc6af34`.

## Coverage added, honestly
- Real generation reaching the structural gate through underflow (U1, G1) and degenerate division (D1).
- A real invalid baseline with a retained valid alternative (U2), plus positive controls (U1+, G1+).

Grouped-bounds residual left open: no real reflow() run has yet produced a candidate that passes structural validation but breaks its group transform. The rejection path src/evaluate.ts:51-73 feeding src/engine.ts:180-185 remains covered by injected findings and evaluator mutations, not this grouped-underflow child. G1 rejects invalid-design before groupGeometry; G1+ is a positive control. No #26 closure; final review must identify the remaining original-criteria proof/fixture gap or evidence of unreachability.

## Limits
Fake deterministic measurer, no rendering, not CI or full qualification. Owner-executed; independent review and root publication remain.

## Normative correction 2026-10-14: grouped bounds at the joined component boundary (appended; text above, including E1, unchanged)
**Source:** exact `9d261c6daf6bc3789c295cdc169602b433d66e57`. Isolated worktree `engine3-issue26-residual`, branch `jo/demo-20261015-engine-group-boundary`. `node_modules` symlinked; `package-lock.json` is byte-identical to baseline (`fd107687…158e`), no install.
**Window:** 2026-10-14T05:03:08Z–06:03:08Z, 3 of 3 commands used.
**Plan:** "Normative correction 2026-10-14" in `docs/plans/issue26-generated-boundaries.md`.

Dated note on E1: under root's adjudication, the grouped-bounds residual is now addressed at the real component boundary.
The chain is: generated candidates, then a finite label shift, then production `evaluate` (`group-geometry`), then production `selectCandidate`.
This does not claim `reflow()` spontaneously generates such a candidate, and it does not exercise `src/engine.ts:213` with one.

### Result: prediction vs actual
| Step | Predicted | Actual |
|---|---|---|
| Precondition | no structural findings on unmutated candidates; ≥1 alternative | as predicted |
| P0 | `evaluate` reproduces stored metrics; selection reproduces `r.selected` | as predicted |
| P1 | shifted candidate valid but `group-geometry` (label, plate); never picked; fallback equals `selectCandidate(others)`, valid, no structural findings | as predicted |
| P2 | all shifted: `NoValidCandidateError`, all `group-geometry`, source unchanged | as predicted |

No structurally invalid success was found (no RED). Twin disclosure: `split` is a byte-identical clone of `stack` for `badge`, so the fallback may be that twin.

### Guarded commands (`heavy_job.py` + `timeout --signal=TERM --kill-after=5s 900s`, each once)
| # | Command | Exit | Result | Log SHA-256 |
|---|---|---|---|---|
| 1 | `node_modules/.bin/tsx --test tests/engine.test.ts` | 0 | 23 pass, 0 fail/skip/cancel | `2762f084dd6bd731b336beb9102546ba1aea1fae63f2afe74761cf0627fdf1e3` |
| 2 | `npm test` | 0 | 696 pass, 0 fail/skip/cancel | `961fd966f52f943b19b9ac4cae3e0264e46609d8a0b2a5857d0d4d4891196dbc` |
| 3 | `npm run build` (includes `tsc --noEmit`) | 0 | built; existing >500 kB chunk warning | `6117e9335febaf710a2f44de762ab4a237dae38b300de8affb821e4d74e4dccd` |

Logs, receipts and exit codes were copied to `/home/nala/.local/share/reflow-run-20261015/engine3-residual-{focused,full,build}{.log,-receipt.json,.exit}` (PIDs 939705, 940275, 959600).
The tested `tests/engine.test.ts` has SHA-256 `91fa4ea6f8821311a7e600cf23103e59d670a1f80b5b57ba9557edb4d6c8509d`.

Not newly tested by this child: criterion 3 'engine/CLI tests agree' (worker mapping) and native/browser checks. This tests-only append does not alter or invalidate the prior criterion 2/3 evidence; root's PR143 CI supplies the current integrated checks. No new gap is asserted.

**Limits:** fake deterministic measurer, no rendering, not CI. Owner-executed. Independent review, root publication and #26 closure remain with root.
