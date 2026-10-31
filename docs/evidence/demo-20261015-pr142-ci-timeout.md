# PR142 Tests step timeout 3 → 5 — evidence, 2026-10-14

**Scope:** CI configuration only. One line in `.github/workflows/ci.yml`. No test, source, split, command or other step changes. It closes nothing; root is the sole publisher and updates PR142, CI, merge and the #25 closure.

**Source:**
- Worktree `cli2-pr142-ci`, detached at `76984388067e45e44b1e843aab7618bf9988184b`.
- Plan `docs/plans/pr142-ci-tests-timeout.md`.
- Window 2026-10-14T03:49:45Z to 04:14:45Z, with one guarded command.

## Actual RED (root CI, root-reported)
Run 38451166429, verify job 115482164941. The step "Tests (preservation, visibility, malformed input, stability)" hit `timeout-minutes: 3` at 2026-10-13T19:02:37Z and was cancelled. The run is incomplete, so no assertion result exists either way. The local ~29 s cost of the 7698438 stderr sweep is a hypothesis only, not observed CI causation.

## Change
`.github/workflows/ci.yml` L126, in the Tests step of job `verify`: `timeout-minutes: 3` → `timeout-minutes: 5`. `git diff --numstat` is `1 1`.

Unchanged:
- the `run:` command and `if:` conditions
- env, and the bash shell (GitHub's default `bash -eo pipefail`)
- all other step caps, and the job cap of 15 minutes
- tests, splits and other workflows

## Guarded command (1 of 1, no retry)
`python3 /home/nala/.local/share/reflow-run-20261015/heavy_job.py timeout --signal=TERM --kill-after=5s 900s python3 reports/pr142-evidence/check.py`

| Exit | UTC | Receipt pid / started_at_ms / exit | Log sha256 |
| -: | --- | --- | --- |
| 0 | 03:50:41Z–03:50:41Z | 653044 / 1791949841555 / 0 | `5f238bad34ba77dc9ce3897b20292ca2a5e6d08b0c06ca4b8ec76f3750ab64a0` |

- `check.py` sha256: `d0370efd7f9caea3f9094d37529bf306293e60e4b424d3df4582f6f5c92fe934`.
- Receipt copy sha256: `c62d1b8c8ba44a1f5968630b10434eb1bf20bb47890e27da57f78dd58d90d34a`.
- The script was syntax-checked with `py_compile` before launch. Before running, I removed a base-vs-base call that would have failed its own 1-line diff assertion (pre-run, not a retry).

Results (all PASS):
1. **Parsed reversion:** exactly one `verify` step named `Tests (` (index 5). It is 3 in base and 5 in the candidate. Setting the candidate back to 3 makes it deep-equal to base.
2. **Raw diff:** exactly `-        timeout-minutes: 3` / `+        timeout-minutes: 5`, hunk `@@ -126 +126 @@`.
3. **Numstat:** `1	1	.github/workflows/ci.yml`.
4. **Positive control:** base vs base gives 0 raw diff lines and parsed equality.
5. **Negative control:** a mutant setting the "Type check and build" step's timeout to 5 was rejected. It failed the Tests-step value assertion, which has no message, so the log shows an empty reason.

## Pending (root-owned, not claimed here)
Real hosted CI on the SAME PR142 is pending. The next receipt must record:
- the run and job IDs
- the Tests step duration
- the uploaded `reports/ci/tests.log`

No GREEN is claimed.

**STOP rule:** if that run hits the 5-minute Tests cap, the 15-minute job cap or any assertion failure, stop. There is no further increase or fix in this slice.

## Limits
- The per-step caps (install 3 + Tests 5 + build 3 + verify 3 + benchmark 3 + browser-install 5 + browser 4 = 26) exceed the 15-minute job cap. A uniformly slow runner can still hit the job cap. That is out of scope.
- The static check proves config scope only; it does not prove CI runtime.
- Logs and receipts stay in the ignored `reports/pr142-evidence/`, uncommitted. No push.
