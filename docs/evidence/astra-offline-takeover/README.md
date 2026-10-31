# Offline component DoD — 2026-10-09

**Technical offline DoD is met at main `d8656f4a37614d3163d65c57f5dcc808e00eb58d` within the transferred OF01/OF02/GAP1/GAP2 scope. Final independent Reviewer3 review and root publication of this disposition remain; the user has not yet archived the channel.** No additional render/build is justified for this tree.

## Exact source and hosted evidence

[PR120](https://github.com/kj-squared-labs/reflow-studio/pull/120) merged head `236fc87c316507db74e6c3b8fe03847bf074b014`; [qualification run37988945072](https://github.com/kj-squared-labs/reflow-studio/actions/runs/37988945072) succeeded. Actual artifact `git_sha` is synthetic PR merge `f0150ac5010ec25c79d3381d0dbc1ffb940babef`, not the PR head. GitHub Git commit metadata gives tree `3939fc42e289729633cc7b0f4094c0bbcbe90bc8`, identical to both PR head and final main. All seven packaged file SHA256s independently match main Git blobs, with exact engine-module set checked. The pinned starter is `a44a06046b0413f0785e7203955c3822e0acbc32`; base digest and public-input hashes are retained in fingerprint.json. No merge-SHA-only rerun is required.

Root downloaded image artifact11644291326 and capability11644058406 using authenticated `gh run download`. Their extracted bytes are retained under `reports/astra-offline-takeover/final/image` and `capability`. GitHub-reported ZIP digests in github-artifacts.json were NOT independently rehashed; local extracted-file hashes are independently recorded in ARTIFACTS.json. These are source-bound authenticated-hosted receipts, not cryptographically signed execution attestations.

## Gate matrix

| Offline obligation | Exact evidence | Disposition |
| --- | --- | --- |
| OF01/OF02 supported-host qualification | Prior accepted receipts preserved; fresh capability shows Linux x86_64/Python3.11.17/Docker; image Linux amd64 | Met |
| Current integrated source | Same synthetic/head/main tree; seven packaging SHA256s match main; fingerprint verification exit0 | Met |
| Real renderer / no silent fallback | Main ledger probe:3 REAL,0 FALLBACK; probe and ordinary exit0; no RuntimeWarning in run.log | Met for three public inputs |
| Offline/readonly input | Runtime NetworkMode none for ordinary/probe/repeat; connection probe blocked; write refused with Errno30; before/after input hashes equal fingerprint | Met; raw inputs not transported for local rehash |
| Ordinary/probe/repeat output binding | Independently rehashed18 files; each of three directories has exactly six outputs matching recorded hashes; same image ID before/after | Met |
| Four negative controls | Individual process exit1/no timeout and ledger failures specifically renderer.converter absent, changed input bytes, zero cases, writable input | Met |
| GAP1 stale evidence | Previously accepted PR115 preserved; GAP2 did not bypass evidence preflight; fresh hosted current-source tests successful | Met |
| GAP2 input diagnostics | PR120 current-tree patch, prior semantic RED and41 host fake-runtime GREEN; hosted tests and image workflow succeed | Met |
| Process/image cleanup | Main and no-renderer image removal exit0/no timeout; no cleanup failure in successful smoke ledger | Met within recorded harness evidence |
| Final disposition independent review/publication | This byte-bound packet delivered to root for Reviewer3 | Pending administrative completion |
| Channel archival | No archive/guard/pool operation performed | User/root decision after review and publication |

Image ID: `sha256:9f63fdcdc120121af1747aac1ad50fea0b92a2d7fb16df6c938a57c22a2a66f9`. Ordinary/probe/repeat equality proves deterministic outputs within this run/image, not cross-host or future-version determinism. The ledger's before/after input checks support unchanged inputs; raw input bytes were not downloaded again.

## Scope and remaining external gates

No remaining implementation or heavy qualification task was identified for this transferred offline component. Existing OF01/OF02/GAP1 acceptances are not reopened. This does not close umbrella issue35, native Express104/105, official viewer/hardware/time/organizer clarifications, visual quality, RF04, source human acceptance or submission acceptance. L2 `deco_circle_1` off-canvas self-check and Fontconfig `reset-dirs` warning remain visible in run.log; neither is a new offline renderer fallback or RuntimeWarning, and neither is declared visual-quality success. Build-time dependency fetching is distinct from runtime network-none proof.

Archive readiness after final review: root publishes durable receipts; confirms no outstanding offline jobs/unpublished changes beyond preserved historical worktrees; records external gates with their existing owners; user archives only the offline channel. Preserve old worktree history and all immutable accepted evidence. Future changed packaged bytes/public inputs require fresh qualification; documentation-only merge SHA changes do not.

Verification was read-only: Git blob hashes, GitHub metadata, JSON ledger/process comparisons and18 extracted output hashes. No new container run, render, full suite, production edit, signing claim or channel mutation. No new reusable skill needed; existing exact-evidence workflow covers the operation.
