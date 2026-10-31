# Adversarial decision review

Baseline `42ce598`. This review distinguishes an architectural choice, supporting evidence and a still-open falsification test. No review can certify every future input or operational condition.

| Decision or prior inference | Adversarial finding | Result / required counterevidence |
| --- | --- | --- |
| Python submission with retained TypeScript tools | A second broad rewrite would discard live corpus raster/UI tools; “Python starter” is not an all-repo language rule | Keep the current interface and tools. Port only reproduced behavior with preserved controls |
| BASIC backend makes typography correct | It only makes one metric policy repeatable. The independent Pillow helper now uses that same policy, so its pass is not independent Skia glyph evidence | RF-01 must measure real rendered bounds/pixels and catch intentionally clipped text; RF-02 stays gated on unresolved parity defects |
| Offline work waits for Nala administrator access | Host-local restriction was incorrectly useful as a project-wide stopping condition; existing GitHub CI already runs Docker | OF-01 must qualify the Python image on a hosted runner, with provenance/failure controls; no security bypass |
| README assembly instructions are enough for release | Root Dockerfile still runs the legacy CLI; a judge could invoke the wrong path | OF-02 must rehearse an explicit clean-clone submission path and reconcile documentation/build layout |
| 308 successful public renders imply broad quality | Only 78 measured cases established metric-font hash correspondence; absent reference review and unmeasured cases remain | RF-04 + KR-02 keep complete accounting and independent visual judgment; no validation/sealed tuning |
| Closed redundant PRs mean related feature complete | Closure proved head ancestry only | Keep parent issue acceptance open and preserve six unique PRs until individually reconciled |
| Running status/model catalogue equals usable capacity | Direct unauthenticated probes returned401; this is an access result, not model failure. Native Codex tools execute, but other routes require authenticated exact-model probes | Admit only successful concrete routes; test vision where required; reject Astra/Fable and opaque aliases with unknown backing |
| Updating a deadline file restarts the prior run safely | Remote discovery found absent guard/watchdog PIDs and guards that snapshot state once; stale cutoff text remained | Install/test and read back actual Reflow-only guards and recovery path before product work; include direct Codex agent in cutoff |
| Remote workers have current repo/publishing access | Discovery found stale refs and no verified GitHub credential on the remote host | Transfer verified Git bundles without credentials, preserve old worktrees, qualify two-way publication before calling it automatic |
| Separate titles prevent overlap | Shared renderer files/tests/docs can overlap despite role names | Packet-owned paths are authoritative; explicit transfer for shared README/interfaces; collaborator claims remain reserved |

Initial independent review is assigned to the existing Quoroum reviewers and Codex Release Steward against the immutable plan bundle. Their exact receipts, corrections and activation decision belong in `activation.md`; this table alone is not their approval.

## Independent review receipt — October 8, 16:13 UTC

Quoroum `reflow` agent 6 reviewed verified baseline `42ce598` in an isolated checkout, message 5. Verdict: conditional plan viability; activation NO-GO pending controls/publication. Required corrections have been incorporated into the individual packets: padded unclipped-versus-clipped renderer ink oracle; pin fonts/backends and reject fallback; prove hosted runner access; bound subprocesses and clean up containers; isolate exact tests, plan and review paths; distinguish packet and integrated image evidence; preserve existing group/rotation/order; make RF-03 conditional on a real residual failure; disclose prior validation exposure. The first reviewer was not the plan author. Separate reviewers must audit his control changes; this receipt does not approve runtime activation.

## Existing channel reviewer pass — October 8

Reflow Reviewer 5 verified all eleven v2 hashes and issued conditional plan acceptance with required corrections (message 524); Offline Reviewer 3 independently checked OF-01/OF-02 and the control code (messages 62/64). This amendment synchronizes each packet's exclusive scope with its manifest, reserves existing smoke/submission tests, requires pull-request-triggered qualification for a new workflow, pins the real-renderer interpreter preflight, makes the human KR-01 dependency a hard blocker, requires RF-03 to branch only from accepted RF-02, and retains failed PNG determinism as a visible blocker.

The reviewers also caught real runtime defects: one-shot failed clears, a transient service lost on reboot, credentials exposed in service environment, and an unheld validation lock. The steward corrected these and froze reviewed code; see activation receipts. Fake-clock/API tests and enabled systemd configuration are evidence of implementation, not a claim that the future live cutoff or reboot was exercised.

A fresh CI run on documentation-only `1378c14` exposed a timestamp-dependent synthetic-font test. Offline Reviewer 3 independently reproduced RED and GREEN and approved the fixture patch/test hashes; the original font-hash assertion remains intact. The fix is local commit `82ac127`, with 269 Python tests, 685 Node tests and build passing locally. Its hosted result must be recorded separately.
