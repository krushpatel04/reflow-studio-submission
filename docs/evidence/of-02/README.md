# OF-02 evidence: clean-clone rehearsal of the Python entry point (#100)

Status: **operational evidence only.** Historical host rehearsal is preserved below; accepted hosted ordinary-repeat evidence is retained in the final section. No quality, scoring or submission-readiness claim; PNG quality was not reviewed.

## Historical host rehearsal: what was run
- Repo: fresh `git clone` of this worktree, checked out at `1981cb18dfb1be590a95f63d2ec599a02cbb789b` (base `69464b9`; RED `test` commit, then GREEN guard commit). The evidence commit that adds this file is a later, docs-only commit with no run of its own.
- Upstream: fresh clone of `jhaaj08/chameleon` at pin `a44a06046b0413f0785e7203955c3822e0acbc32`.
- Python 3.11.16 (uv venv). `requirements-python-submission.txt` installed with `constraints-python-submission.txt`, exit 0.
- `sh submission/assemble_context.sh <tmp> <upstream>`, upstream `input/` copied in, `python -m engine.main`, run twice from the same context with `output/` removed between runs. No contributor caches or repo paths used.
- This host cannot run containers. The "same image" repeat claim required by the packet is **UNPROVEN** here; the host two-run result below is not a substitute.

## RED then GREEN (guard and controls)
Why the case happens in practice: the assembler already requires a clean checkout at the pin, but a partial checkout (`git sparse-checkout`, or `update-index --skip-worktree` plus deleted files) keeps `HEAD` at the pin and `git status --porcelain` empty while a resource is absent from the worktree. The test builds exactly that with real git (no git shim); the fixture asserts HEAD is the pin and status is clean before it runs the assembler.
- RED: with the `69464b9` copy of `submission/assemble_context.sh` swapped in locally, `AssembleContext` ran 12 tests with 7 subtest failures (missing `brand_kit/fonts`, `brand_kit/assets`, `renderer/converter`, each as absent and as empty directory where the old script has no check, plus the previous-good-context control). The positive control passed on the old script, as it should.
- GREEN: with the guard (`1981cb18` script), `tests_python.test_submission_files` + `tests_python.test_offline_smoke`: 74 tests OK, 0 failures, with `CHAMELEON_UPSTREAM` at the pin; the `AssembleContext` tests ran (not skipped).
- Controls: **positive** `test_valid_pinned_checkout_assembles_with_all_required_resources_non_empty`; **no partial output** (refusal leaves no OUT and no `OUT.*` temp sibling); **previous good OUT kept byte-identical** after a refused partial checkout.
- Order: an earlier branch committed code before the plan; this branch is plan-first (`docs/plans/of-02-2026-10-13.md` section 2b). The RED commit `f6183836` used the first, shim-based test; the real-git test replaced it in a later commit, and its RED was observed by swapping in the old script rather than by a separate RED commit.

## Observed (real renderer)
| Check | Result |
|---|---|
| Entrypoint exit | 0 (both runs) |
| Provenance wrapper (`render_design_to_png` / `_fallback_render` wrapped, as in the smoke probe) | `EVENTS RRR`: 3 REAL, 0 FALLBACK; 0 RuntimeWarning lines (both runs) |
| `check_outputs` (3 cases, JSON object + PNG signature each, nothing extra) | `[]` |
| Two-run hashes | identical, 6 of 6 |

Hashes (both runs):
- `chameleon_sample_level1_warmup_output.json` `97193ea3f25bf3bd01a6d745f98ccd7cb60e0f19f21854aa8b04c651f93cbcf6`
- `chameleon_sample_level1_warmup_output.png` `494caf37aae64d8ca8fcccb05402bab86079cec0eff7abd251294db8117d8c2d`
- `chameleon_sample_level2_core_output.json` `b31edc4e04c91f01f1395b6693d3f9f9f5a89bd4e45713abd7831f3d8e3f34cd`
- `chameleon_sample_level2_core_output.png` `5d36066283eabea41af914e2199992fe0f8cfd5c982ead622adad5d439b2e218`
- `chameleon_sample_level3_advanced_output.json` `086e504127041b0812b76209952c0f7322c38dd1591acce8da02f3e58cb9085c`
- `chameleon_sample_level3_advanced_output.png` `d070c9560d5f9e1e7cd0132238ebd4639ab0048ee95ffc870f6ccf8ee0f8df2d`

These equal the six `outputs_sha256` in `docs/evidence/of-01/README.md` for the hosted run on `beeb41d` (compared as strings). A match between a host run and a hosted image run on different trees is an observation, not a guarantee; engine bytes here are those of `69464b9`.

## Silent box-renderer fallback: documented limitation, reproduced
The root `README.md` at `69464b9` already says the upstream orchestrator can silently use a box renderer if imports fail, and that a successful exit or a PNG alone does not prove real rendering; it points to the qualification probe. This rehearsal reproduced that on this tree: with `libEGL.so.1` unavailable (`skia` import failing), `python -m engine.main` exited 0, wrote a complete JSON+PNG set that passed `check_outputs`, and printed nothing matching `RuntimeWarning`/`libEGL`. JSON hashes were unchanged; PNG hashes differed (level 1 `485c53fd...0815a`, level 2 `24138c8c...355f`, level 3 `0fc1b0d4...06e4`, abbreviated here; full values were observed in the run). Nothing was added to the code for this: the documented qualification probe (`scripts/offline_submission_smoke.py`, hosted run in `docs/evidence/of-01/README.md`) is the path that detects it.

The real run's libraries (`libEGL`, `libGL`, `libGLX`, `libGLdispatch`, glib, fontconfig) came from user-space extracted `.deb` files via `LD_LIBRARY_PATH` (no sudo here). The Dockerfile apt list is the supported route.

## Historical host rehearsal limits
- Host, not image. No container run; same-image byte repeatability of PNGs is UNPROVEN.
- One machine; cross-machine or cross-Skia-build determinism not shown.
- Historical rehearsal limitation (at the time of the host run on `1981cb18`): that SHA had no independent review and no hosted run, and the ancestry check was base `69464b9` only. This no longer describes the current head; see the receipts below.
- Root `README.md` is not edited. The rehearsal exposed no new ambiguity: the root `Dockerfile` is already described as the older TypeScript CLI and the build command already uses `-f Dockerfile.python-submission`.

## Historical source-review receipts
- Independent Reviewer verdicts recorded in All: 246, 249 and 250. All246 records code-level 35 GREEN / 7 RED and four killed mutations for the repeat harness; it does not prove an image run. The historical 106-test heavy-run receipt lacks arguments/source and is not independently proven here.
- At that source-review stage, hosted proof was pending. The retained hosted results below supersede that pending state, not the historical host-only scope above.

## Retained hosted ordinary-repeat evidence (PR111 and accepted main)

OF-02 #100 accepted CLOSED / Project Done at `75f0ac1218b00a62f44b2b0aca4884b1e0f2a677`, as relayed by the Coordinator after independent actual-byte review All260. This is packet acceptance, not organizer submission acceptance or issue #35 closure. No test, image build, qualification or download was repeated for this docs slice.

### Exact sources: separate results
| Role | SHA / source |
|---|---|
| Independently reviewed PR111 source head | `edf6a584ce892eaac09d498ab3a30746ee03edc5` |
| Historical PR-tested merge | `c20037f563b4fe6e0f1f3d09200dcd0a04f4e00a` (`git-head.stdout`, fingerprint and qualification agree) |
| Final accepted main | `75f0ac1218b00a62f44b2b0aca4884b1e0f2a677` (`git-head.stdout`, fingerprint and qualification agree) |
| Accepted-main parents | `62937e12caa3280097ba7bd1014a73ccf257b8d6` + `edf6a584ce892eaac09d498ab3a30746ee03edc5`, as relayed by the Coordinator; not checked as a native object here |
| This retention docs head | The commit containing this text; no qualification of its own |

The retention branch starts at `edf6a584` while accepted main is unavailable locally. No tree equality between the PR head, PR-tested merge or final accepted main is asserted. Matching output bytes are measured observations, not source identity.

Retention ordering: plan `a2ab4afb` was committed before evidence checkpoint `25b08fdf`, but independent PLAN approval was not obtained before those evidence edits. Successor plan `51d313efead0dc2ebfb2dedabb8490f0bc66ddb1` received independent APPROVE-PLAN in All279 before the subsequent source-label/L3 correction. That approval is prospective only; it does not retroactively approve the checkpoint's plan gate. Integration/export must refresh then-current main (reported `9c5473e9548a800e3dcb95338099a67a53575255`), not assume `75f0ac12` remains current.

### Runs, artifacts and independently read receipts
| Field | Historical PR-tested merge `c20037f5` | Final accepted main `75f0ac12` |
|---|---|---|
| Image qualification run | [37847831524](https://github.com/kj-squared-labs/reflow-studio/actions/runs/37847831524), from All256 | [37851231832](https://github.com/kj-squared-labs/reflow-studio/actions/runs/37851231832), from All260 |
| Full CI | PR checks successful as relayed; full CI run ID not recorded in the retained image archive | [37851194925](https://github.com/kj-squared-labs/reflow-studio/actions/runs/37851194925), SUCCESS, 369 tests OK / 0 skips, publisher-reported via All261 and parent messages 387/395, relayed by the Coordinator |
| Artifact ID | `11580174194`, from All256 | `11581109823`, from All260 |
| `image-artifact.zip` SHA256, recomputed locally | `232ca44020b768b158553aa17902a37a859079e46235870d7a98038d4ff2facb` | `6d3511b152f9dc848833c4ded6d3ee4e5d45d99219919e0ccd43e4f60e128c5b` |
| Independent actual-byte review | Reviewer All256: APPROVE operational evidence for `c20037f5`, not merge approval | Reviewer All260: APPROVE operational evidence for the final packet |
| Retained directory | `of02-artifacts-pr111/` | `of02-artifacts-main75/` |
| `smoke-main/case-ledger.json` SHA256, recomputed locally | `67bab0c99ccc99ea61192d11a1dfae987387647357473001fb5741f185c0c3c8` | `f612a721508f8fcff09cfddc364b5fd63911634113bd56dee84847c3e462691b` |

Both directories are under `/home/nala/.local/share/reflow-run-20261013-codex6/`; each contains the ZIP and `extracted/`. Values below were read directly from these retained files. Run IDs, artifact IDs and independent verdicts were read from All256/260; run status and CI test counts are relayed, not newly fetched from GitHub. Neither image archive contains `python-tests.log`, so this docs slice does not independently establish the 369-test count. Artifact retention is 14 days; retained local copies were inspected without re-download.

### Build, image and fingerprint
Both archives' `qualification.json`: runtime `docker`, machine `x86_64`, `pass` true, `failures` `[]`, `build_exit` 0, `fingerprint_verify_exit` 0. `fingerprint.json`: `git_dirty` false, `git_head` matches the respective tested SHA. Base digest in both: `sha256:e529028263dbe6910a2d96f7d2b8f5266385e917fd45d286ef166977c094a51e`; upstream pin in both: `a44a06046b0413f0785e7203955c3822e0acbc32`.

| Field | PR-tested merge | Final accepted main |
|---|---|---|
| Image inspect | `sha256:799de0612b7017fc1d05d675be1f64a78cded0942455a8a6b996861c789e0fc1` amd64 / linux | `sha256:d68e1641a44062ff32567a2a1aa68657992229ea118a6874c00cf722a346f6de` amd64 / linux |
| `repeat.image_id_before` | `sha256:799de0612b7017fc1d05d675be1f64a78cded0942455a8a6b996861c789e0fc1` | `sha256:d68e1641a44062ff32567a2a1aa68657992229ea118a6874c00cf722a346f6de` |
| `repeat.image_id_after` | `sha256:799de0612b7017fc1d05d675be1f64a78cded0942455a8a6b996861c789e0fc1` | `sha256:d68e1641a44062ff32567a2a1aa68657992229ea118a6874c00cf722a346f6de` |

Recorded builds used `docker build -f <assembled context>/Dockerfile.python-submission -t of01-<tested SHA prefix> <assembled context>`. Recorded smoke invoked `scripts/offline_submission_smoke.py --image of01-<tested SHA prefix> --input <temporary public input directory> --work reports/of-01/image/smoke-main --runtime docker --timeout 300`. These describe already completed executions, not instructions to rerun them. The qualifier's outer smoke budget was 1320 seconds. Its four-run budget predates the added fifth container run; a hang reaching that budget fails closed, not proof of a per-case organizer deadline.

### Smoke and input isolation (both archives)
- Three public samples attempted. Provenance probe: three `REAL`, zero `FALLBACK`; probe `rc` 0, `net` `blocked`; entrypoint exit 0; `failures` `[]`, `pass` true; zero `RuntimeWarning` occurrences in retained `run.log`.
- Entrypoint/probe `network_inspect` is `["none", "none"]`; repeat `network_inspect` is `["none"]`. Network isolation was inspected, not inferred solely from a failed connection.
- Read-only input write refused: `write_attempt.refused` true, exit 1, `OSError: [Errno 30] Read-only file system: '/app/input/.write-attempt'`.
- Input SHA256 before equals after in both ledgers:
  - `chameleon_sample_level1_warmup.json`: `79f889a1b0ec616b3f75de7b0d7fe4b92dcfb027e99b512a019a7aa941000ea6`
  - `chameleon_sample_level2_core.json`: `c37407fa20aefb8e1c53a3476b99973000657c3c1d93fc9637e462703955a04b`
  - `chameleon_sample_level3_advanced.json`: `fd99e3972c9c11c506d98897f3cb9520a5caea10b358d30e6853b9efca58cf33`
- `repeat.status` `identical`, second ordinary entrypoint exit 0. Each run writes its own `out-entrypoint`, `out-probe` or `out-repeat` directory. The first and second ordinary runs use the same image; the provenance probe remains separate.

### Six actual output hashes
Each of the six directories (three per archive) contains exactly these six files. Their bytes were rehashed locally and equal the main ledger's `outputs_sha256` and `repeat.outputs_sha256_second`; `qualification.json.smoke` equals `smoke-main/case-ledger.json`. All256/260 independently report the same actual-byte checks. Both archived runs produced this set:

| File | SHA256 |
|---|---|
| `chameleon_sample_level1_warmup_output.json` | `97193ea3f25bf3bd01a6d745f98ccd7cb60e0f19f21854aa8b04c651f93cbcf6` |
| `chameleon_sample_level1_warmup_output.png` | `494caf37aae64d8ca8fcccb05402bab86079cec0eff7abd251294db8117d8c2d` |
| `chameleon_sample_level2_core_output.json` | `b31edc4e04c91f01f1395b6693d3f9f9f5a89bd4e45713abd7831f3d8e3f34cd` |
| `chameleon_sample_level2_core_output.png` | `5d36066283eabea41af914e2199992fe0f8cfd5c982ead622adad5d439b2e218` |
| `chameleon_sample_level3_advanced_output.json` | `f4f9c3a4e733b307294493d027b627a83c7c9265bdc0b74ceb28504bb9be789c` |
| `chameleon_sample_level3_advanced_output.png` | `72f1745050c75a74e2a4b9c89cd792bb02841cf148f1c12b270cd772d9d33e11` |

### Controls (both archives)
Each control's subprocess receipt records exit 1, `timed_out` false; qualification marks each `ok` true for its stated failure reason:

| Control | Failure reason |
|---|---|
| renderer-absent | `probe stderr: ModuleNotFoundError: No module named 'renderer.converter'` |
| mutated-input | `input bytes changed` |
| zero-input | `zero input cases` |
| write-attempt (disposable `:rw` control) | `write to :ro input was not refused with Read-only file system` |

The last control intentionally permits a write and therefore fails the smoke; it is distinct from the real `:ro` refusal in the passing main run.

### L3 comparison: accepted RF-03 source, publisher-verified and relayed
L1/L2 match the historical `beeb41d` outputs recorded above. L3 differs from that record: JSON `086e504127041b0812b76209952c0f7322c38dd1591acce8da02f3e58cb9085c`, PNG `d070c9560d5f9e1e7cd0132238ebd4639ab0048ee95ffc870f6ccf8ee0f8df2d`.

The Coordinator relayed the publisher's reread of actual accepted-`62937e12` `qualification.json`: image run `37841018284`, artifact `11578255612`, ZIP SHA256 `816279585e6679c0856093607bc29e48e924dfa01ff882e6e4716f0553782250`; independent actual-byte review recorded in Reflow All635. Its L3 JSON hash is `f4f9c3a4e733b307294493d027b627a83c7c9265bdc0b74ceb28504bb9be789c` and PNG hash is `72f1745050c75a74e2a4b9c89cd792bb02841cf148f1c12b270cd772d9d33e11`. Both equal the PR111/main75 actual output bytes rehashed above. Original accepted-629 archive/output bytes were not inspected or rehashed locally in this slice; this comparison uses publisher-verified, relayed values, not a claimed local inspection.

Accepted `62937e12` merges RF-03's fit-gated tiny-label floor correction (#110); its engine delta versus local `69464b9` is one line in `engine/text_fit.py`. The matching accepted-629 L3 values establish that the changed L3 output set was already present in the accepted RF-03 qualification, before the OF-02 repeat-harness integration. Thus the difference versus `beeb41d` is attributed to that accepted RF-03 source transition, not a new OF-02 renderer change. This is source/output provenance, not PNG quality or scoring evidence.

### Limits of the retained result
Same-image ordinary-repeat byte identity is proven for each recorded image/run on the three public samples. No cross-machine, cross-Skia-build or future-build determinism claim. Build networking remains active; runtime was offline. Apt packages remain unpinned. No PNG quality, scoring, universal readiness, organizer acceptance or issue #35 completion claim. Later source changes need their own proof; this docs commit does not requalify any source.
