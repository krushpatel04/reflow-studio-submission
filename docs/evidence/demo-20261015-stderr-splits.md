# #25 stderr two-chunk split characterization — evidence, 2026-10-13

**Scope:** tests only, for the CrossReviewer3 finding. It closes or reopens nothing for #25/#26/#27/#28. No change to `scripts/reflow-cli.ts`, `tests/helpers/**`, `src/**`, the benchmark candidate, PY-FONT-RED or import379.

**Source:**
- Worktree `cli2-issue25-stderr`, branch `jo/demo-20261015-cli2-stderr`, base `f8f8c5609933f57e37de35e24c095f7fc245f117`.
- Plan `docs/plans/issue25-stderr-splits.md`, sha256 `a64dbbf92c965705b2ede6b0ceebc4243236df04fc53b1d62dbae27a12642dff`.
- Dependencies: a read-only symlink `node_modules` to the shared `reflow-studio/node_modules`. `package-lock.json` is byte-identical (`cmp` 0). No install.

**Recovery note:** the original dispatch-219 turn wrote the plan and the test edit, then stopped at a model-alias outage before any command ran. In the recovery window (18:42Z) I verified that state, without re-editing it, before running anything.

## Change
`tests/reflow-cli-output.test.ts` changed from base sha256 `6915ed98e7a14cf08dddb9c5358cb5aa46b61e25318a0a4f7007f991b8dea851` to `84a3f414835f1af6fbc327d2f6bdeafebd3bb0b1fa9a960a660407060a3ba2d5`, a diff of +11/−4 in one test.

For each of the 5 `SAMPLES`, the stderr test now mirrors the existing stdout sweep (lines 33-48):
- every two-chunk split `[bytes[0,i), bytes[i,)]` for `i = 1..len−1`
- the retained byte-at-a-time case

Each case asserts:
- exact `status === 2`
- `stdout === ''`
- `deepEqual(JSON.parse(stderr), { error })` with the full structured error

The title now names both modes. There is no collector, helper or Unicode-implementation change. This characterizes an already-fixed collector, so PASS was expected; there was no artificial RED.

## Guarded commands
Each ran as `python3 …/heavy_job.py timeout --signal=TERM --kill-after=5s 900s CMD`, sequentially, with the receipt copied after each. 3 of 3 commands used, no retry.

| # | Command | Exit | UTC | Result | Receipt pid / started_at_ms / exit | Log sha256 |
| - | --- | -: | --- | --- | --- | --- |
| 1 | `node_modules/.bin/tsx --test --test-name-pattern=stderr tests/reflow-cli-output.test.ts` | 0 | 18:42:55–18:43:26 | 9/9 pass: the 5 new sweeps (about 5.3–6.5 s each) plus 4 existing stderr tests | 1519885 / 1791916975692 / 0 | `7fecd6da…161b` |
| 2 | `npm test` | 0 | 18:43:44–18:44:57 | 685 tests, 685 pass, 0 fail/cancelled/skipped | 1695088 / 1791917024398 / 0 | `dc99688b…2a50` |
| 3 | `npm run build` (`tsc --noEmit && vite build`) | 0 | 18:45:03–18:45:04 | built; Vite >500 kB chunk advisory only | 1979931 / 1791917103544 / 0 | `84a879e6…eb28f` |

The test count of 685 equals root CI's 685 at `f8f8`. The edit changes only the body of one existing test per sample, not the number of tests.

## Acceptance mapping
- **stderr has every two-chunk split for all 5 samples:** done; command 1, 5 tests.
- **byte-at-a-time retained:** done; it is the final case of each sweep.
- **Exact full structured error and status:** `deepEqual` and `status === 2` hold for every case, and `stdout` is empty.
- **No collector, runtime or helper rewrite:** the diff touches only the test file.

## Limits
- This is characterization of an already-fixed collector; it does not prove that the earlier fix caused the result.
- Scripted delivery goes through `tests/helpers/fake-worker-spawn.mjs`, not OS pipes.
- No retest of malformed or legacy queues, and the old audit was not rerun.
- Logs and receipts stay in the ignored `reports/issue25-evidence/`, uncommitted. No push or publication.
