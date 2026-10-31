# Reflow work queue through Tuesday, October 13

**Authorized window:** now through **October 13, 2026, 08:30 America/New_York (12:30 UTC)**. Stop selecting new slices or launching expensive validation at **08:00 Eastern**; checkpoint and drain before the hard stop. `reflow`, `reflow-offline` and the human-authorized `reflow-unblock` are in scope. The new channel follows the [protected setup plan](../../plans/reflow-unblock-setup-2026-10-08.md); creation alone is not task activation. The previous October 8 run and all its dates are historical. Capstone is not part of this run.

The [October 8 audit](../../repository-audit-2026-10-08.md) establishes baseline `42ce598`: Python is the submission engine, TypeScript remains useful tooling, all three CI jobs passed, and offline/current-renderer quality gates remain open. Adobe remains authoritative. This plan is not a qualification result or a promise that all packets finish by Tuesday.

## Pickup map

| Packet | Owner / lane | Start condition | Deliverable |
| --- | --- | --- | --- |
| [RF-01](rf-01.md) | Reflow Typography 4 | Run guards and claim verified | Independent real-renderer text-bounds proof |
| [RF-02](rf-02.md) | Reflow Engine 3 | RF-01 accepted; any discovered parity defect resolved first | One wide Level 2 composition improvement |
| [RF-03](rf-03.md) | Reflow Engine 3 | RF-02 accepted and a residual defect reproduced | One extreme Level 3 defect improvement |
| [RF-04](rf-04.md) | Reflow CLI 2 | RF-01 + KR-01 accepted | Complete development accounting and blind review pairs |
| [OF-01](of-01.md) | Offline Engineer 2 | Run guards and claim verified | Exact-SHA Python Docker qualification on hosted runner |
| [OF-02](of-02.md) | Offline Engineer 2 | OF-01 accepted | Fresh-clone submission rehearsal |
| [ST-01](st-01.md) | Codex Release Steward 6 | Bounded operational authorization | Publication, ownership and verified Tuesday stop |
| [KR-01](kr-01.md) | Human claimant — Package A | Human claim | Source-faithful frozen development bundle |
| [KR-02](kr-02.md) | Human claimant — Package A | KR-01 + RF-04 | Independent blind review |
| [JH-01](jh-01.md) | Human claimant — Package B | Human claim and needed Express access | Native Express/viewer evidence or exact blocker |
| [JH-02](jh-02.md) | Human claimant — Package B | RF-01 | Independent typography/source-fidelity review |

[Shared team handoff and claim template](../../collaborators/team-handoff.md) · [Kanban rules](../../kanban.md). GitHub issues #95–#105 are linked in each packet and tracked on Project 7. The machine-hashed [manifest](manifest.json) records requirements, dependencies, owned paths and evidence maps. Its validator checks structure; it does not approve behavior.

## No-overlap rules

- `engine/**` has one writer, Engine 3. RF-02 and RF-03 run sequentially. Any parity defect discovered by RF-01 receives its own small Engine 3 fix before composition work.
- Typography 4 owns the new text-ink probe; CLI 2 owns the separate development report. They may inspect but cannot edit Package A's `scripts/lica_official/**`, `test_lica_*`, font-binding test or corpus metadata.
- Package A's conversion/fidelity work and Package B's Express experiments/review documents are reserved for human teammates. Either teammate can claim either package; GitHub assignees are placeholders. Human tasks are not silently absorbed by the channels.
- Offline Engineer 2 owns submission packaging and a **new separate** Python-qualification workflow; the existing `ci.yml` stays with release stewardship unless an explicit transfer is recorded.
- The coordinator handles shared README/contract changes from proposed patches; two workers never edit the same shared document concurrently.
- Keep one live claim per packet and one implementation task per person. At most one Reflow engine/quality implementation and one Offline implementation run concurrently; other roles may review/read. Serialize expensive host validation through the existing lock. GitHub jobs have their own bounded workflow concurrency.
- Before editing, fetch current main and inspect teammate branches/claims. A new upstream/main change invalidates affected review/CI; never force-push over a collaborator.

## Evidence and adversarial gates

A consistent BASIC metric backend is not proof of Skia glyph/line parity. RF-01 must use rendered evidence independent of the engine's Pillow wrapping helper, including an intentional clipping failure and a valid control. Any change to the measurement policy requires new real-renderer evidence, not rewritten goldens alone.

The Nala user-namespace restriction is host-specific. OF-01 should use the proposed hosted Docker topology after proving dispatch, runner permissions and artifact retrieval; it must prove the Python image itself, not reuse the existing TypeScript container smoke result. OF-02 must make the root legacy Dockerfile versus Python submission build unambiguous and rehearse the exact README command from a clean clone.

Count every development task, including unmeasured, unsupported and failed cases. Do not tune on validation; run the fixed validation evaluation once after the candidate is chosen. Sealed material remains private and out of channel/repo context. Unit tests, real-renderer calls, font hashes, human visual review and official acceptance remain separate claims.

For this authorized channel run, an independent reviewer must accept each exact code/evidence SHA before integration. This is a run-specific gate; repository-wide direct validated commits remain permitted. No parent issue is closed by completing only one child packet.

## Operational activation gates

Before product work starts, the steward must verify: current source delivered without resetting old work; one owner for this run; model routes excluding Astra/Fable and opaque unqualified aliases; tool/image capability where required; actual publication path; live Reflow-only remote guards with new drain/deadline; forced-cutoff controls; and one retargeted existing heartbeat. A stale PID, model listing or text acknowledgment is not proof.

The remote guards must stop both pools and all agents, including the direct Codex steward, even when the Mac is offline. Failed publication queues reviewed commits; it must not cause repeated work or acceptance claims. Stable external blockers stay quiet; the coordinator selects another independent Ready packet rather than polling the same failure. Remaining operational blockers must be stated in `activation.md` with evidence before any active-state claim.

Each packet owns its uniquely named `docs/plans/<packet>-2026-10-13.md`, `docs/evidence/<packet>/` and `reports/<packet>/` paths. Package A owns only `docs/evaluation/rubric.md` and `docs/evaluation/blind-review/`; Package B owns `docs/evaluation/typography/`. Existing shared tests need an explicit transfer. Qualification at a packet SHA must be rerun at the final integrated SHA. See [independent findings](adversarial-review.md) and [operational receipts](activation.md).

## Replan at each accepted milestone

Follow [milestone replanning](../../plans/milestone-replanning-2026-10-08.md): after acceptance, reconcile current source, claims and evidence, then write a fresh next-step plan or explicit blocked/terminal disposition before implementation continues. Nathan’s Astra Codex is planning-only through a verified account route; it is not added to either implementation pool. Preserve the existing deadline and all human ownership gates.
