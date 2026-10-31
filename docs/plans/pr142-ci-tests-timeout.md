# PR142 slice: Tests step timeout 3 → 5 minutes (CI config only)

**Owner:** CLI2.
**Worktree:** `cli2-pr142-ci`, detached at `76984388067e45e44b1e843aab7618bf9988184b`.

**Window:** 2026-10-14T03:49:45Z to 04:14:45Z (25 min).
- At most ONE guarded static check, ≤900 s.
- Launch only with ≥960 s remaining.

**Claim (only, root-confirmed):**
- `.github/workflows/ci.yml`
- this plan
- `docs/evidence/demo-20261015-pr142-ci-timeout.md`

## Actual RED (root CI, root-reported)
- **Run:** 38451166429, verify job 115482164941.
- **What failed:** the step "Tests (preservation, visibility, malformed input, stability)" hit its `timeout-minutes: 3` at 2026-10-13T19:02:37Z and was cancelled.
- **Outcome is unknown.** The run is incomplete, so no assertion result exists either way. Nothing shows an assertion failure, and nothing rules one out.
- **Cause is a hypothesis only:** 7698438 added the stderr two-chunk sweep (5 tests, about 29 s locally; local `npm test` took 73 s). This is not observed CI causation.

## Change
In `.github/workflows/ci.yml` job `verify`, the Tests step's `timeout-minutes` goes from `3` to `5`, a one-line change at L126.

Every other workflow byte is unchanged:
- command, `if:` conditions, env and bash/pipefail
- other step caps
- job cap `timeout-minutes: 15`
- test files, tests and splits

No test is weakened or skipped.

Known limit: the per-step caps already sum to more than the 15-minute job cap. A uniformly slow runner could still hit the job cap. That is out of scope here.

## Validation: ONE guarded command
The command runs as `python3 /home/nala/.local/share/reflow-run-20261015/heavy_job.py timeout --signal=TERM --kill-after=5s 900s python3 reports/pr142-evidence/check.py`. The receipt and log are copied afterwards.

Using pyyaml, `check.py` compares the base `git show 7698438:.github/workflows/ci.yml` with the worktree file and asserts:
1. **Parsed reversion:** exactly one `verify` step is named `Tests (…)`. It has 3 in base and 5 in the candidate. Setting the candidate back to 3 makes it deep-equal to base.
2. **Raw diff:** exactly one changed line, L126, `timeout-minutes: 3` → `timeout-minutes: 5`.
3. **Numstat:** `git diff --numstat 7698438 -- .github/workflows/ci.yml` is `1	1	…`.
4. **Positive control:** base compared with base gives 0 diffs.
5. **Negative control:** a mutant with the "Type check and build" step's timeout at 5 is rejected by the same assertion.

There is no retry, no `npm test`/build/browser run, and no install. On contention or failure, stop and report; never bypass.

## Acceptance and stop rules
- **Local acceptance:** the static check passes. Then an exact scope/diff check (only the 3 claimed paths), then a local checkpoint commit with the configured identity. No push.
- **Real acceptance is pending and root-owned:** a PR142 CI rerun on the same PR. It must record the run and job IDs, the Tests step duration and the uploaded `tests.log`.
- **STOP:** if that rerun hits the 5-minute Tests cap, the 15-minute job cap or any assertion failure, stop. There is no further increase or fix in this slice.
