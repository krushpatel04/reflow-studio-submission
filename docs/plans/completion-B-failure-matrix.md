# B completion block: actual container failure matrix

Window: 2026-10-15 15:49:10Z–17:49:10Z; production freeze16:54:10Z; no new heavy job17:24:10Z. Base f97c5aab9871446ee678c3302b57dae8dda4f4f7. B owns the new matrix driver/tests and qualifier integration; D coordinates workflow source and review. A engine and C browser files remain outside this claim.

## Problem and evidence
Accepted image38757323063 proves three public cases, runtime isolation, repeatability and four smoke controls. It does not prove malformed/unsupported tasks or real-container timeout/OOM cleanup. Existing process/cleanup tests use host/fake runtime controls. Parent8/35 remain partial; named teammate reproduction and native/organizer gates remain external.

## Intended bounded behavior
Add a required matrix to the existing image qualification before image cleanup. Use that same image under network none with read-only inputs. Three invalid task cases (malformed JSON, unsupported element, zero target width) must fail promptly with specific diagnostics, unchanged input and no misleading successful output. A valid public task is a positive control. Disposable Python entrypoint controls exercise a sleeping parent+child timeout and resource allocation under an explicit64MiB memory/swap cap. OOM requires Docker State.OOMKilled, not exit137 alone. Timeout requires actual started child marker, timed-out invocation, recorded kill and stopped state. Every owned container is force-removed and absence verified; cleanup/inspect failure fails closed. These are operational controls, not organizer limits or proof that every engine failure is handled.

## Steps and test-first checks
1. Add a regression to existing qualifier tests proving requested matrix failure cannot be accepted (expected RED against current behavior). Add pure verdict tests for positive/negative/error/cleanup/unknown evidence, then smallest driver implementation.
2. Retain exact executable command, runtime inspect state/network/memory/image identity, input/output hashes, durations, exit/timeouts, kill/remove/absence results, and all case failures. Reject existing result directory to avoid stale passes. Matrix uses copied public fixture; never mutates source/upstream.
3. Focused tests cover good control, wrong reason, fake137/non-OOM, missing child marker, pending/running process, cleanup/inspect failure, input mutation, missing/extra case, zero-output positive and unknown case. Existing packaging tests must remain green.
4. D reviews exact candidate and existing workflow invocation; root publishes/dispatches existing supported Ubuntu Docker route. Inspect raw artifacts, not just pass flags. No local userns retry or controller work.
5. D combines required npm/build and canonical Python gates. Freeze and qualify exact integrated head after relevant source changes. Retain independent review and source distinction.

## Scope limits and risks
Initial slice excludes missing assets/fonts, mixed-batch recovery, broad extreme-size coverage, peak-memory distributions and teammate reproduction; record these as remaining. Container allocation controls may expose unsupported memory enforcement; missing OOM evidence is a visible blocked/fail, never an inferred pass. Process timeout cleanup is bounded; failure leaves a named container for explicit operator handling and fails the gate. No model/runtime provider changes. Existing Python packaging pins remain.

Acceptance: actual hosted matrix has all six cases and positive/negative checks bound to exact source/image; expected reasons and cleanup verified; raw artifacts independently reviewed. Parent8/35 closure is not implied. Existing qualification workflow suffices; no new skill needed.

Implementation decision: matrix is mandatory inside image qualification, so unchanged existing workflow invokes it and retains all artifacts. This removes an optional acceptance bypass and avoids a workflow edit. Existing fake-runtime smoke tests stub only the new producer; new raw-receipt and orchestrator rejection tests keep matrix semantics independent.

Initial local validation: current qualifier regression failed because successful ledger omitted failure_matrix (matrix-red.log). New raw receipt and qualifier acceptance checks pass (matrix-focused-final.log). The first combined qualifier run omitted CHAMELEON_UPSTREAM and had one skip; it is not accepted validation. Re-run packaging suite with pinned upstream and require zero skips. Full canonical/native/npm combined validation is D-coordinated to avoid duplicate heavy jobs.

Hosted finding: candidate070a051 run38765279064 passes5/6; direct allocation exits137 at verified64MiB but Docker OOMKilled=false. This remains rejected, not inferred OOM. Corrected probe keeps a small parent alive to read actual cgroupv2 memory.events around a child allocation. Require a safe8MiB child positive control (exit0/no oom_kill change), failing child=-9 and increased oom_kill, same64MiB bound, stopped parent and cleanup. A new positive-event verdict test fails on prior code; wrong/missing counters, wrong child cause and failed safe control are rejected. The final control requires the cgroup event transcript, externally unique container token, actual parent/child PID markers, memory.max64MiB, and independent inspect container identity. Docker137 or OOMKilled alone is insufficient for this new control.
