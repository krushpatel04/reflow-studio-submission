# October 13 run activation receipts

Authorized by the human in Codex chat `01a0f877-795f-7031-bd07-9b7062e0c9d7`: only `reflow` and `reflow-offline`, no Astra or Fable, drain October 13 12:00 UTC, hard stop 12:30 UTC (08:30 Eastern).

At initial audit: old guards absent, pools empty, remote clones stale, remote GitHub authentication absent. Codex Release Steward 6 was added with concrete `cx/gpt-6.1-sol` and completed a tool-backed independent plan review at baseline `42ce598`. Source transfer hash and git bundle verification passed; old worktrees were preserved.

The initial setup was gated under #101 on live remote controls, qualified routes, independent review, current source and publication. The verified activation below supersedes that initial hold.

## Verified operational setup — October 8

- Both original channels are active; `reflow-offline` was restored from archive. Existing roles remain, with added Reflow agent 6, **Codex Release Steward**, concrete `cx/gpt-6.1-sol`.
- Both dedicated routing pools contain only `cc/claude-sonnet-5-5`, then `cx/gpt-6.1-sol`. Authenticated tool-call and tiny-image probes passed. Other tested candidates were excluded for failed capability or returned-model mismatch; no Astra/Fable or opaque alias fallback was admitted. Model availability can change and failed routes remain visible.
- The remote persistent user service `reflow-cutoff-20261013-codex6.service` is enabled with linger, PID 345596 at review time. Process identity and loaded code match the frozen `control.py` SHA256 `4a1b5d3b2d9f8dcc7c62630669589e660205f76fadba8619356a10a0178babd2`; `heavy_job.py` is `2897c4d461a28484ab08afff9aa33894011a4182df873ae9f8fe6a1483ecaeca`. Read current PID/heartbeat rather than reusing this historical PID.
- Reflow Reviewer 5 message 533 and Offline Reviewer 3 message 64 independently accepted the frozen code after rerunning fake-clock/API and heavy-job tests. Added heavy-stop controls cover stale PID identity, non-group-leader refusal and exact fake-signal targets. The live future cutoff and reboot were not exercised.
- Drain flips implementation authorization off at **October 13 12:00 UTC**. All expensive channel jobs must use `heavy_job.py`, which holds the lock for the child's lifetime and limits it to drain. The guard targets only both Reflow pools and their dynamic rosters, including direct-model agent 6. Clears retry with readback; permanent API failure stays visible. At-most-once interrupts and jobs bypassing the launcher remain limitations: the owner must remediate any post-cutoff `done=false`, and bypassing the launcher is prohibited for this run.
- A read-only Tailscale transfer service serves only exported committed-ref bundles and a manifest, through hard stop. Independent scope review rejected traversal, writes, symlinks and unrelated channels. Atomic export and expiry backstop were corrected. Tailnet access assumes its existing ACL is trusted; GitHub credentials remain on the Mac.
- The Mac fetched and verified both initial worker bundles (Reflow 4 and Offline 2): digest, byte count, `git bundle verify`, ref mapping, and exact `1378c14` imported commit all matched. Old worktrees and unpublished refs remain preserved. This proves transfer, not acceptance of historical branches.
- Authenticated GitHub push, Project 7 read/write, issue updates, hosted job execution and artifact download work. Run `37808606124` exposed the synthetic-font fixture clock failure despite documentation-only changes; the independently reviewed fix is `82ac127`. A prior hosted container artifact was downloaded successfully; it remains legacy-image capability evidence, not Python submission qualification.
- Existing heartbeat `reflow-and-capstone-three-hour-monitor` is retargeted to this chat, renamed **Reflow through Tuesday 8:30 AM**, and stripped of Capstone scope. It was paused during setup and is now ACTIVE after verified controls and final packet approval.

## Publication and continuation procedure

The authenticated Mac owns GitHub publication and Project transitions. Channel coordinators commit bounded results, obtain independent review for the exact candidate SHA, refresh the scoped export, and post the bundle/ref/digest plus evidence in native All. The Mac imports only named current-run refs into review refs, verifies hashes and actual diffs against current main, and preserves all old branches. It may publish a review branch/PR to run a new workflow; this does not satisfy merge acceptance. New workflow OF-01 uses a pull-request trigger before default-branch dispatch is available. Reconcile current-main changes and obtain required successful CI plus independent integrated-head acceptance before merging or closing the packet.

The existing 15-minute heartbeat performs publication/review/board catch-up when the Mac is available. Remote agents can work and queue coherent committed checkpoints while it is offline; no promise of publication while the authenticated Mac is unavailable. Stable blockers do not trigger repeated work. Technical issue replies include exact evidence and deduplication markers; issue comments do not expand the authorized scope. Detailed private operational paths and export schemas remain in the runtime's `PUBLICATION.md`, not repository secrets.

## Activated — October 8, 16:57 UTC

Codex Release Steward message 23 confirms `implementation_authorized=true`, eight clean new worktrees at **`d792df1ed65f548fd57c4991ed6a25ef79b24a56`**, verified v3 packet hashes and the unchanged approved guard/process identity. The remote environment preflight passed after installing only pinned fontTools 4.66.1: Python 3.11.16, Skia 144.0.post2, Pillow 12.3.0 and seven brand TTFs, with pinned starter `a44a060`.

Reviewer 5 message 537 approved the v3 plan manifest **`e1652adf7e31e4d028fa248110dff46e5b381a1e19d81070d2165ee9e7144a1b`**. Offline Reviewer 3 message 66 independently reproduced the clock-controlled RED/GREEN and approved exact fixture commit `82ac1278cca5c4ebe01d738a24cee870f9b6208c`. [Hosted CI at d792df1](https://github.com/kj-squared-labs/reflow-studio/actions/runs/37812327140) passed all three jobs. Local verification: 269 Python tests with zero skips, 685 Node tests and build passed.

Coordinator handoffs 1041 (Reflow) and 234 (Offline) launched **RF-01 #95 / Typography 4** and **OF-01 #99 / Offline Engineer 2** in their new worktrees. Both actual agent statuses were verified running; cards are In progress. This is a start receipt, not completed implementation or submission qualification. Other implementation packets remain dependency-gated, with Krush and Junho's areas reserved.

The existing heartbeat's active status, 15-minute cadence and current owner thread were read back. Channel coordinators refresh current-run branch exports at committed checkpoints; the authenticated Mac performs publication and board updates. No additional recurring schedule or unrelated-channel work was created.
