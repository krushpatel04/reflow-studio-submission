# #25 slice: stderr two-chunk split characterization (tests only)

**Owner:** CLI2. **Branch:** `jo/demo-20261015-cli2-stderr` at `f8f8c5609933f57e37de35e24c095f7fc245f117`. Original window 18:27:59Z (dispatch 219) was interrupted by a model-alias outage after the plan and test edit were written; no command ran. Recovery window starts 18:42Z and lasts 60 min, with at most 3 guarded commands.
**Claim (only):** `tests/reflow-cli-output.test.ts`, this plan, `docs/evidence/demo-20261015-stderr-splits.md`.

**Reconciliation:**
- The earlier CLI2 #25 claim covered `scripts/reflow-cli.ts` output collection plus the dedicated CLI tests (`docs/plans/cli-unicode-output.md`, `cli-protocol-audit-followup.md`). It is merged in `f8f8c56` and complete, so it is released here.
- `scripts/reflow-cli.ts` and `tests/helpers/**` are NOT claimed now.
- The benchmark 4-path claim (`9a78cf3`) is separate and frozen.
- No branch or commit touches the three paths. No collision.

## Finding (CrossReviewer3)
At `tests/reflow-cli-output.test.ts:33-56`, stdout covers every two-chunk split plus byte-at-a-time delivery for 5 samples. stderr covers only byte-at-a-time. That leaves a split-position gap on the error stream.

## Change (tests only)
- In the existing stderr test per sample, mirror the stdout sweep: for every `i` in `1..len-1`, deliver `[err bytes[0,i), err bytes[i,)]`, plus the existing byte-at-a-time case.
- Each case asserts the exact `status === 2` and `deepEqual(JSON.parse(stderr), { error })` (full structured error). Add `stdout === ''`.
- Rename the title to say "every two-chunk split and byte-at-a-time".
- No collector, runtime, helper or Unicode-implementation change. This characterizes an already-fixed collector, so PASS is expected and there is no artificial RED.
- If a case fails, stop and report concrete evidence. Do not change production code.

## Validation (each `python3 …/heavy_job.py timeout --signal=TERM --kill-after=5s 900s CMD`)
1. `node_modules/.bin/tsx --test --test-name-pattern=stderr tests/reflow-cli-output.test.ts`
2. `npm test`
3. `npm run build`

Dependencies come from a read-only symlink to the lock-identical shared `node_modules`. No install. Receipts, logs and hashes go in the evidence doc.

## Limits
Does not reopen or close #25/#26/#27/#28. No retest of malformed or legacy queues. The cost is about one subprocess per split position per sample, the same as the stdout sweep.
