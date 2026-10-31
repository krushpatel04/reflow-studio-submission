# Team Kanban board

Current work is the [October 13 queue](execution/2026-10-13/README.md), grounded in the [October 8 Adobe/repository audit](repository-audit-2026-10-08.md). [Project 7](https://github.com/users/ojedaJD/projects/7/views/1) tracks issues in `kj-squared-labs/reflow-studio`. Project read/write access was verified October 8; cards are reconciled explicitly because old pre-transfer automation is not proof of current automation.

## Pick up a finite packet

| Lane | Accountable person / executor | Issues |
| --- | --- | --- |
| Reflow | JD / Typography 4, Engine 3, CLI 2 | #95–#98 |
| Offline | JD / Offline Engineer 2 | #99–#100 |
| Release coordination | JD / Codex Release Steward 6 | #101 |
| Public source fidelity and blind review | Human claimant — Package A | #102–#103 |
| Express contract and pixel review | Human claimant — Package B | #104–#105 |

The packet contains exact edit paths, prerequisites, acceptance controls and reviewer. GitHub assignee/Owner is a planning placeholder. Actual ownership is the explicit task/file claim in the [team handoff](collaborators/team-handoff.md); either teammate may take either human package. Human packets stay reserved; channels cannot absorb them. Parent issues retain their original acceptance criteria and ownership.

## Status rules

| Status | Evidence required |
| --- | --- |
| Backlog | Later work or a tracking parent; not an active implementation claim |
| Ready | Scoped packet and prerequisites available; no work claimed yet |
| In progress | Named claimant has actually started |
| Blocked | Named dependency, next action and owner in the issue |
| Done | Full packet acceptance, exact-SHA review and required validation recorded |

P0: independent text evidence, Python image qualification, source fidelity and run controls. P1: evidence-backed layout, evaluation and submission rehearsal. Later ML/ranking and general UI polish stay Backlog until independent quality evidence justifies them. Target dates are planning targets, not acceptance promises. Do not close a broad parent because one child passed.

One implementation task per person; at most one Reflow quality/engine and one Offline implementation concurrently. Review/read work may proceed in parallel. Before editing, claim the issue, check current main and shared channel history, reserve paths and write the packet-specific plan. Record blocker changes and review-ready SHA on the issue. Reviewer findings are active work. For this user-authorized run, channel changes require independent exact-SHA review; the repository's normal direct-commit policy otherwise remains.

Stop new slices and expensive validation October 13 at 08:00 Eastern; checkpoint and stop all channel activity at **08:30 Eastern (12:30 UTC)**. See [activation receipts](execution/2026-10-13/activation.md) for actual operational state. Card movement and issue closure are separate operations and must be read back. Historical roadmaps and September project settings remain historical references, not this run's work queue.
