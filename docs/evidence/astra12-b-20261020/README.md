# October20 workload diagnostic correction

This bounded #8 change ports the standalone profiling harness from reviewed WIP `8c72dda` into current baseline `b7e8eab` and corrects diagnostic semantics. It does not change the engine, add workflow wiring, or complete parent #8. [Plan and all 17 original criteria](../../plans/astra12-b-20261020.md); [fresh issue/comments snapshot](issue8-start.json).

## Behavior

A diagnostic counts as surfaced only when ordinary stdout/stderr contains a finding for the tested condition. Incidental Fontconfig messages, another condition's warnings and findings captured only by the profiler do not count. Nonzero errors, bounded timeouts and unfinished invocations remain distinct. Full report validation compares the complete recomputed behavioral-findings list, so one existing timeout cannot hide an omitted missing-assets gap or invented/duplicated finding.

The harness preserves7 valid families × 3 ordinary/instrumented pairs,4 diagnostic pairs and2 delay pairs, raw phase/output/container evidence and explicit unattempted records under a 600-second total budget. This is diagnostic infrastructure; evidence completeness and behavioral acceptance are separate. It does not fix missing-asset reporting in the official entrypoint or promise dense workloads now finish.

## Tests-first evidence

Exact old modules were read from Git `8c72dda` into an ignored reference directory. Ten inherited characterization tests passed. Adding condition-specific and accounting regressions ran 16 test methods with 16 reported failing assertions/subtests on old source; these were behavioral mismatches, not setup failures. The identical 16 tests passed after the correction, including valid findings on either ordinary stream, probe-only negatives, missing outcomes, bounded timeouts/full denominator, exact outputs, invalid container receipts and actual delayed-function phase controls. Python 3.11.11 run passed 16 with zero skips.

- `PYTHONPATH="$PWD/reports/astra12-b/prior" python3 -m unittest tests_python.test_submission_workload_profile -v` — [RED](red.txt).
- `/path/to/pinned/python3.11 -m unittest tests_python.test_submission_workload_profile -v` — [GREEN](green-python311.txt).
- [Environment and dependency-source hashes](environment.json): macOS 15.4 arm64, Python 3.11.11, Node 24.20.0; verified upstream `a44a060` and unchanged dependency-lock sources before read-only reuse. This is not a clean-machine install.

## Historical artifact control, not a new run

[Read-only re-evaluation](historical-reevaluation.json) hashes the old `3e14604` workload report. The old missing-assets verdict is rejected, and the corrected interpretation is accepted while retaining all 3 dense100 pairs/six timed-out invocations. Ordinary output only says OK plus an unrelated Fontconfig warning; missing-asset placeholders are visible only in probe-captured renderer returns. Historical raw bytes were not rewritten. No new image/source/latency proof is inferred.

## Remaining acceptance

Exact source `24ba026133ee4d05ae4b3444adab38d30e82309d` passed the root-serialized sequence: **482 Python tests** in 233.443s, **710 Node tests** in 197.080s, and build. All exited zero with zero skipped tests; the build retained the existing large-chunk warning. The sequence ran 16:49:09–16:56:26 UTC on October 20 within the 15-minute cap, then released the slot with no owned jobs. [Full execution receipt](full-validation.json), [Python log](python.txt), [Node log](npm-test.txt), [build log](build.txt). C found no blocking source/method issue in the exact candidate: [independent review](independent-C-review.json). Root owns current image qualification/integration/CI/publication and any shared workflow edits. No engine, typography, renderer, public/sealed corpus, model, native or human acceptance is manufactured. Named Krush second-environment reproduction and Junho font/render verification remain absent; operation/fallback budgets and broad workload limits remain separate original criteria. No parent #8closure is requested.

No new skill is warranted: repository tests-first and evidence-review procedures cover this repeatable stdlib change.
