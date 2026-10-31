# Milestone replanning for Reflow channels

Superseded for the current run by [the standing execution plan](standing-run-through-2026-10-13.md), following the human's request to reduce personal native Astra usage. Keep evidence checkpoints and artifact review; no fresh plan or Astra call is required after each milestone. The historical policy below is retained for provenance.

## 1. Assignment Header
Owner: existing Reflow Coordinator 1, with Offline Coordinator 1 for its lane. Independent reviewer: existing Reviewer 5 / Offline Reviewer 3. Baseline: last supplied accepted checkpoint `75f0ac1218b00a62f44b2b0aca4884b1e0f2a677`. Status: planning process update; no implementation activation. Window ends October 13, 2026, 08:30 America/New_York; no new slices or expensive validation after 08:00. Adobe remains authoritative.

## 2. Task
Require a fresh, revisioned next-step plan after every accepted milestone, before further implementation. Improve pace by selecting one small evidence-backed deliverable rather than extending the old plan by assumption. Scope: channel planning and ownership; no product, router, credentials, human-package or guard edits. Nathan’s Astra Codex is permitted only for finite planning and adversarial plan review, outside implementation agents and channel pools. Fable remains excluded.

Observed problems: workers sometimes reason from old local main, claim completed work is pending, repeat acknowledgments instead of resolving prerequisites, and leave final accepted evidence outside repository documents. These are coordination gaps, not new engine defects. RF01–03 and OF01–02 have accepted checkpoints; RF04 still requires accepted human Package A inputs. Human audit publication and technical provenance fixes do not satisfy human source-fidelity acceptance.

## 3. Steps
1. At acceptance, retain the exact source/tree, reviewer receipt, tests, artifacts, limitations and GitHub/board readback once. Distinguish candidate, tested merge and actual main.
2. Coordinator refreshes actual All history, current main, claims, issue dependencies, reviewer findings and Adobe sources if the next decision depends on changed rules. Do not rescan unchanged material or rerun already accepted validation.
3. Create `docs/plans/<packet>-<milestone>-next.md` with a new revision and predecessor acceptance receipt. A compact successor may reference unchanged ten-section content; terminal/blocked dispositions need no full packet rewrite. Use the ten-section packet contract for a new implementation packet. Append history; do not overwrite the accepted plan or its evidence.
4. Select one next deliverable, or record NO READY WORK with its specific prerequisite and wake condition. Estimate one useful checkpoint within 30–90 minutes; estimates are not acceptance promises. After 90 minutes without a reviewable artifact, checkpoint and have the coordinator decide to split, stop or continue with specific evidence.
5. Verify baseline objects and owned paths in the actual worker checkout, then obtain one independent bounded plan review. Planning approval is not code/evidence acceptance. Release one existing owner only when dependencies and claims are satisfied.
6. After acceptance repeat this process. A failed probe or stable blocker triggers one diagnosis and a revised plan only if evidence changes; it does not trigger repeated inference or testing.

## 4. Requirements
- MP-D1: Each accepted milestone has a successor plan or explicit terminal/blocked disposition linked to its acceptance receipt. Evidence: next-plan record.
- MP-H1: Next work states the observed gap, cheapest disconfirming check, positive control, alternative including no change, exact paths, owner, dependency and stop condition. Unknowns stay unknown.
- MP-H2: At most one engine/quality implementation and one Offline implementation. Human Packages A/B remain reserved; a channel ACK cannot transfer a human file. Expensive host jobs use approved `heavy_job.py`.
- MP-H3: Nathan Astra is planning-only and invoked once per useful plan decision, with a compact secret-free evidence packet. Require verified concrete model AND Nathan account selection before invocation; unavailable account pin means a named blocker, no silent account substitution or global reorder. Ordinary reviewers can prepare/review the plan while access is blocked; label that it was not Astra-reviewed. No indefinite planner loop.
- MP-V1: Independent plan review challenges necessity, source freshness, ownership, controls and cheaper alternatives. Exact implementation review and hosted CI remain separate gates.

Current access disposition: Nathan Astra planning route is BLOCKED pending independently verified model/account selection. Installed channel combo configuration does not guarantee named-account selection. Ordinary planning/review may proceed, explicitly not Astra-reviewed. No new probe or routing change follows automatically. Actual main must be read back before each assignment.

## 5. Required Regression Coverage
Documentation acceptance checks: verify all ten sections, deadline, account restriction, milestone trigger, one-writer limits and human reservations; verify links and current source/issue facts; independent reviewer checks the exact diff. No artificial code tests or repeated image qualification for prose. Each future implementation plan names meaningful RED/GREEN tests and required renderer/hosted evidence appropriate to its change.

## 6. Worker Loop
Existing Quoroum event-driven channels only: finite assignment → reviewable checkpoint → independent evidence review → accepted milestone → fresh plan. No new agents, schedules or recurring channel wakeups. The existing monitor coordinates status and cutoff, not busy-loop implementation.

## 7. Mandatory Wait/Catch-Up Protocol
Read unprocessed authoritative All entries through each event/handoff checkpoint; process human corrections and reviewer findings first. Persist processed IDs after handling. REST history is catch-up, not a native wait primitive. A timeout or idle agent is not completion. Stable blocked work waits for its named dependency; it does not repeatedly ask for the same ACK.

## 8. Communication Rules
One concise start claim and one checkpoint result per revision, with material findings between them. Link the exact next plan from the issue and handoff. Do not claim another role’s ACK, source verification, merge, account selection or qualification. Record stale-source corrections once and deliver the missing source before asking for review again.

## 9. Reviewer Messages Are Active Work
Resolve actionable findings before unrelated work. Reviewer can accept, request one bounded correction, or identify a blocker. Replanning never launders failed evidence into success. Shared evidence retention follows acceptance promptly so downstream owners can use repository records without private operational history.

## 10. Development Topology
Use existing isolated Quoroum worktrees on the channel host, authenticated Mac publication and GitHub-hosted Docker qualification. Bind the actual current-main SHA into each worker checkout without resetting dirty branches. Planning-only Nathan Astra access is a separate verified route, never an implementation pool fallback. Existing remote guard must still stop all nine agents and both pools while the Mac is offline.

## DoD Checklist
- [ ] MP-D1 successor/blocked/terminal record exists for each newly accepted milestone.
- [ ] MP-H1 next slice has observed evidence, controls, exact ownership and stop condition.
- [ ] MP-H2 human reservations, concurrency and expensive-job guard preserved.
- [ ] MP-H3 planning-only account/model identity verified or explicitly blocked.
- [ ] MP-V1 independent plan review recorded; later code/CI gates remain separate.

## Handoff Note
Read current All, current main and the predecessor acceptance receipt first. Candidate next slice: retain accepted OF02 evidence. Coordinator must confirm the two exact document paths, existing owner and missing records before declaring READY. If already retained, record terminal disposition; do not duplicate or requalify completed work. RF04 stays blocked until the human frozen development bundle is independently accepted. After that evidence milestone, write a fresh successor plan or explicit NO READY WORK record.
