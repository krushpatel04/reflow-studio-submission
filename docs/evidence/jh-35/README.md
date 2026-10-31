# #35 hosted offline qualification of the current tree — October 27, 2026

Plan: [`docs/plans/jh-35-offline-qualification.md`](../../plans/jh-35-offline-qualification.md). Issue #35 (release tracker) stays open.

## What was qualified

| | |
|---|---|
| Run | [40521858337](https://github.com/kj-squared-labs/reflow-studio/actions/runs/40521858337), `Python submission qualification`, `workflow_dispatch` |
| Qualified SHA | `93eec4d6f1f89fde66bad0afbfbda185dd901ae7` on `jh/35-offline-qualification` |
| Relation to main | main `6d82709` plus CI/docs only (`.github/workflows/python-submission.yml`, this plan). Engine, submission and packaging files are byte-identical to main. |
| Host | GitHub-hosted ubuntu-24.04, Docker, linux/amd64 (x86_64) |
| Starter | `a44a06046b0413f0785e7203955c3822e0acbc32` |
| Image | `sha256:61f070a6c630cadb3f8b96d8c6eb1b201069ebf0e11f068e7aebdee8ed9571e0` |
| Packaged-source fingerprint | [`fingerprint-40521858337.json`](fingerprint-40521858337.json); `fingerprint verify` exit 0 |

The artifact quota blocked uploads, so the evidence was printed into the job log. The extracted archive's gzip SHA-256 is `afec918d8e268275016a942c88bd76206867ebac400c29fb8fb7ca04c9b3edfd` (531 entries). [`qualification-40521858337.json`](qualification-40521858337.json) is the qualification record from that archive.

An earlier run, [40521464273](https://github.com/kj-squared-labs/reflow-studio/actions/runs/40521464273) at `9bda9c1`, passed its capability checks (76 host tests). Its quota-rejected artifact upload then failed the job, and the image job was skipped, so that run has no image result.

## Result: `pass: true`, `failures: []`

**Ordinary smoke (three public samples):**
- 3 REAL renderer calls and 0 FALLBACK, from the in-container provenance probe.
- Network `none` (inspected); the probe reported network `blocked`.
- Inputs mounted read-only and byte-identical before and after.
- A second ordinary entrypoint run on the same image produced identical outputs (`repeat.status: identical`), and the image ID was unchanged.
- Output hashes:

| Output | SHA-256 |
|---|---|
| level1_warmup JSON | `97193ea3f25bf3bd01a6d745f98ccd7cb60e0f19f21854aa8b04c651f93cbcf6` |
| level1_warmup PNG | `494caf37aae64d8ca8fcccb05402bab86079cec0eff7abd251294db8117d8c2d` |
| level2_core JSON | `0cc0c05ffd3be4e139ebff826d0f7a3389ed1ac14a2d6d48cc6762e7d9c8884f` |
| level2_core PNG | `e69659c19b972485ff0a4233554de8bfa517d225f746ea4481914acb47a38cda` |
| level3_advanced JSON | `f4f9c3a4e733b307294493d027b627a83c7c9265bdc0b74ceb28504bb9be789c` |
| level3_advanced PNG | `72f1745050c75a74e2a4b9c89cd792bb02841cf148f1c12b270cd772d9d33e11` |

**Smoke controls:** each of the four failed for its stated reason:
- renderer absent: `ModuleNotFoundError: renderer.converter`;
- mutated input: input bytes changed;
- zero input: zero input cases;
- write attempt: a write to the read-only input was not refused.

**Failure matrix:** all six cases passed. Every case had network `none`, read-only input, a stopped container and confirmed removal.

| Case | Exit | Note |
|---|---|---|
| valid | 0 | outputs written |
| malformed | 1 | rejected |
| unsupported | 1 | rejected |
| invalid-target | 1 | rejected |
| timeout | -9 | killed at the bound (`timed_out: true`) |
| oom | 0 (parent) | child killed with signal 9; cgroup `oom_kill` went from 0 to 1 at `memory.max` 67108864 bytes |

**Resource profile:** accepted by its evaluator. Every iteration reproduced the six smoke output hashes.

| Observation | Samples | Result |
|---|---:|---|
| Fresh-process entrypoint time | 5 | median 0.572 s (0.569–0.584 s) |
| Fresh container invocation, outer | 5 | 1.645–1.728 s |
| Same-process first iteration | 1 | 0.581 s |
| Same-process steady repeats | 9 | median 0.527 s (0.516–0.542 s) |
| Fresh-process RSS high-water | 5 | 225.4–225.9 MiB |
| Ten-iteration process, end of run | 1 | RSS high-water 270.2 MiB; cgroup peak 177.5 MiB (512 MiB limit) |

The October 15 pilot's limits still apply. These numbers are descriptive only: no cold-cache or percentile figures, cumulative rather than per-iteration peaks, no phase breakdown, no dense or extreme workloads, and no organizer budget. They are not directly comparable with the October 15 pilot, which ran on different source and a different host.

Requirement-by-requirement status: [Stage 1 compliance matrix](compliance-matrix.md).

## What this does not cover

- **The final submitted tree.** PR #150 (#148) changes the engine. The final main SHA needs its own run.
- **Teammate-environment reproduction.** This is hosted automation, not a teammate's own machine (#35 acceptance item 2).
- **Native Express workflow (#4).**
- **Organizer limits.** Hardware, time and submission-form questions remain open in #35.

# Teammate-environment reproduction (Junho's Mac) — October 27, 2026

This is the #35 acceptance item "reproduce on a second teammate environment with runtime network disabled". It ran on a teammate's own machine, not on hosted automation.

| | |
|---|---|
| Qualified SHA | `8491a327b4ee9e135cfab916f86c26720d66715e` (`jh/35-offline-qualification`): the hosted-qualified tree plus the absence-check fix below. No engine or packaging change. |
| Host | macOS 15.6.1, Apple silicon (arm64) |
| Runtime | colima 0.10.3 (arm64 VZ VM, Rosetta translation for amd64), Docker CLI 29.9.2, engine 29.5.2; `DOCKER_DEFAULT_PLATFORM=linux/amd64` |
| Image | `sha256:1b59cefe7d15cc92d93c7a5b4805b4bad74147f34e3e32cbb4efe0b35b88afe7`, linux/amd64, built locally from the same Dockerfile (a different image ID from the hosted build is expected) |
| Command | `python scripts/qualify_python_submission.py image --runtime docker --upstream <pinned starter> --out reports/jh-35/local-mac/image` (plus `capability`), with the venv from the README |
| Record | [`qualification-junho-mac-8491a32.json`](qualification-junho-mac-8491a32.json), [`capability-junho-mac-8491a32.json`](capability-junho-mac-8491a32.json) |

## Result: `pass: true`, `failures: []`

- **Smoke:**
  - 3 REAL renders, 0 FALLBACK; network blocked (`none`);
  - inputs read-only and unchanged; repeat run identical;
  - fingerprint verify exit 0;
  - all four controls failed for their stated reasons.
- **The six output hashes are byte-identical to the hosted Linux run** (run 40521858337, table above), so the submission produces the same JSON and PNG bytes in both environments.
- **Failure matrix:** 6/6 cases passed (valid 0, malformed 1, unsupported 1, invalid-target 1, timeout -9, oom: child killed). Containers were removed and confirmed absent.
- **Resource profile:** accepted. Fresh-process entrypoint median 1.059 s (0.960–1.182 s); steady same-process median 0.724 s; fresh RSS high-water 260.7–261.0 MiB.
  - These run under Rosetta translation in a VM, so they are slower and larger than the native hosted figures.
  - They describe this machine only. They are not budgets.

## Problems found on the way

1. **Setup error, not a product result.** colima did not share macOS's temp directory, so the first attempt's container saw an empty input mount ("No task files found in input"). Fixed by mounting the repo and a dedicated `TMPDIR` writable.
2. **Real tooling bug: the cleanup proof depended on the Docker version.** The failure matrix, resource probe and workload profile proved container removal by matching `No such object` / `No such container` case-sensitively. Docker 29 prints `error: no such object: <name>`, so real removals were rejected as "cleanup not proven".
   - Fixed in `af2b851` (test, red before the fix: only the Docker 29 wording failed) and `8491a32` (case-insensitive match).
   - Exit code 1 and no-timeout are still required, and unrelated errors are still rejected.
   - The hosted runner would hit the same thing on a Docker update.

## Limits

- This is one teammate machine, and it emulates amd64 through Rosetta. It is not a native x86_64 host.
- The final submitted SHA (after PR #150) still needs its own hosted run. A local re-run of that SHA would strengthen the record.
