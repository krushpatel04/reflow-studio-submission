# JH-35 plan: qualify the current tree offline before the October 30 submission (#35)

Owner: Junho. Parent: #35 (release tracker; it stays open). Branch: `jh/35-offline-qualification` from main `6d82709`.

## Problem and evidence

Submission is October 30. The last accepted offline proofs are older than the tree that will be submitted:

- OF-02 (#100) was accepted at `75f0ac1` on October 8 ([evidence](../evidence/of-02/README.md)).
- The hosted failure matrix and resource pilot ran on October 15 candidates `af6e441` and `c1fd4d8` ([evidence](../evidence/2026-10-15-offline-matrix/README.md)).
- Both records say the final integrated commit needs its own run. Main is now `6d82709` (October 24), and PR #150 (#148) will change the engine again.
- The org's artifact storage quota is full. `python-submission.yml` keeps its evidence only as artifacts, so a run today would show pass or fail with no retained evidence.

## Why it matters

The scored path is the container on Linux. An unqualified final tree risks silent box-renderer fallback, network use, changed inputs or missing outputs, and nobody would see it before scoring.

## What can go wrong

- Qualifying a commit that differs from the one submitted. Every result names its exact SHA; the final SHA needs its own run.
- Treating pass or fail alone as evidence. The qualification JSON, failure matrix and resource profile must be retained and read.
- The log fallback changes the workflow file. That file is not in the image, but the qualified branch SHA then differs from main's. This is disclosed, and the post-#150 run should happen on main itself.
- Treating hosted automation as teammate reproduction. A named teammate's own environment stays a separate #35 item.

## Scope

In: `.github/workflows/python-submission.yml` (`always()` steps that print the capability and image evidence into the job log, and `continue-on-error` on the two upload steps; nothing changes in what runs or is checked), `docs/plans/jh-35-offline-qualification.md` and `docs/evidence/jh-35/**`.

Out:
- engine changes;
- qualification script changes, except the container-absence fix below;
- native Express workflow (#4);
- submission form or destination questions;
- artifact deletion (needs JD's agreement).

## Update 2026-10-27

The first run, [40521464273](https://github.com/kj-squared-labs/reflow-studio/actions/runs/40521464273) at `9bda9c1`, passed the capability checks (76 host tests, Docker capability recorded). Its capability artifact upload then failed on the quota, which failed the job and skipped the image job. The upload steps are now `continue-on-error`, and the capability evidence is also printed. A failed check still fails its own step and the job.

## Update 2026-10-27: teammate-environment run and a Docker-version bug

- **Run:** Junho's Mac (macOS 15.6.1 arm64). colima 0.10.3 runs an arm64 VM, and Rosetta runs the linux/amd64 image (`DOCKER_DEFAULT_PLATFORM=linux/amd64`). Docker CLI 29.9.2, engine 29.5.2.
- **First attempt:** failed because colima did not share macOS's temp directory, so the container's input mount was empty. That is a setup error, not evidence about the submission. Rerun with colima mounting the repo and a dedicated `TMPDIR` writable.
- **Second attempt:** smoke passed (3 REAL, repeat identical). The failure matrix and resource profile then failed only on "owned container cleanup not proven". `docker rm -f` exited 0 and `docker inspect` exited 1 with `error: no such object: …`, but the three tools match the case-sensitive text `No such object` / `No such container`. Docker 29 prints it in lower case, so the oracle rejects real removal on newer Docker. The hosted runner will hit the same thing when its Docker is updated.
- **Fix (test first):**
  - Make the absence text match case-insensitive in `scripts/offline_failure_matrix.py`, `scripts/submission_resource_probe.py` and `scripts/submission_workload_profile.py`. The exit code 1 and not-timed-out conditions stay as they are.
  - Regression test in `tests_python/test_offline_failure_matrix.py`: the Docker 29 wording must prove absence, and an unrelated error with exit 1 must not.

## Steps

1. Claim on #35 with this plan. → check: claim comment posted.
2. Add the log fallback step to the workflow. → check: the YAML parses, the step runs under `if: always()`, and it only reads `reports/of-01/`.
3. Dispatch on this branch (main's code plus the workflow step). → check: the capability and image jobs complete. Extract `qualification.json`, the failure matrix and the resource profile from the log.
4. Record evidence in `docs/evidence/jh-35/README.md`:
   - SHA, run ID and image ID;
   - REAL/FALLBACK counts, network mode, read-only input and unchanged inputs;
   - output hashes and repeat identity;
   - the six failure-matrix cases and resource figures;
   - comparison with the October 15 results.
5. After PR #150 merges, re-run on the final main SHA and update the evidence. Repeat for any later engine change before October 30.

## Acceptance

- `qualification.json` has `pass: true` with an empty `failures` list on the exact SHA:
  - 3 REAL renders and 0 FALLBACK;
  - network `none`;
  - read-only, unchanged inputs;
  - repeat output identity;
  - the four smoke controls fail for their stated reasons;
  - all six failure-matrix cases pass;
  - the resource profile is accepted by its evaluator.
- Any failure is recorded as a blocker with its log excerpt, never as a skip or a pass.
- The evidence README lists what this does not cover: teammate environment, native workflow, organizer limits.
