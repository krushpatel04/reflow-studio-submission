# UB-ROUTING-01 — bounded routing prerequisite plan

Date: 2026-10-09. Owner: Integration Engineer 2. Source baseline: `bb829dbc7e261231dbcdbf4e1acde1b94d7536b9` (local HEAD verified; clean checkout at start). Authority: explicit finite UB-ROUTING-01 handoff; Coordinator 1 kickoff ACK8. Exclusive writes: `docs/evidence/unblock-routing/**`. This location follows the task's narrower write boundary rather than the repository's generic `docs/plans/` convention.

## Problem and intended result

A verified concrete model order and successful tool probes do not prove use of a named person's account. Produce one source-backed prerequisite/handoff explaining whether the installed route consumes and forwards account preference, whether selection can fall through, and what minimal external 9Router behavior would be needed before claiming named-account selection. Incorrectly treating order or a header as account pinning could consume another account's quota or misstate availability.

## Bounds

Read README, progress, team plan, actual source/claims. Request bounded Reviewer 4 plan review before collecting routing evidence. Reuse existing Steward receipt724 and completion artifact; read installed routing source only where needed to resolve a claim. No new inference, vision, quota probes, tests, rebuilds or qualification. No edits to Reflow/9Router code, providers, settings, accounts, credentials, global order or guards. No Astra/Fable fallback or named-account pinning claim. Acceptance evidence, engine/offline scopes, JD Astra test/proposal and human `resources.py` ownership remain separate. Existing publisher alone publishes. No commit/push/merge planned.

## Steps

1. Obtain bounded plan review; resolve blockers before collection.
2. Read exact retained routing receipt/completion and current claims. Trace only relevant installed route/selection call sites if receipts need source confirmation; record source hashes and bounded line references without copying private identifiers, credentials or raw logs.
3. Write `handoff.md`: verified model/tool facts versus account facts; unassured named-account constraint; smallest externally owned prerequisite; proposed non-live tests, strict failure behavior and preservation of unrelated traffic.
4. Check prose against source/receipts; ask Reviewer 4 to review exact artifact and sources. Send finite result to Coordinator for shared All reporting/publication disposition.

## Concrete prose acceptance checks

- Every observed routing claim identifies a retained receipt or exact source file/hash/line range; distinguish receipt assertions from independently read source. Missing evidence stays explicitly unknown/blocked.
- Model ordering/tool capability and named-account choice are separate statements; neither header intent nor probe success is called proof of account selection or quota.
- Header consumption/forwarding and selection fallthrough are traced only as far as evidence permits; no behavior inferred from model names alone.
- Prerequisite describes the smallest request-scoped external change, authorized owner ACK, validation at the trust boundary, fail-closed unavailable/ineligible/exhausted behavior, and unchanged default handling of unrelated requests. Proposed tests are not represented as executed.
- No private account IDs, credentials, raw logs, acceptance files, code changes, live probes, duplicate publication or RF-04 unblock claim.
- Result records Reviewer 4 disposition, limitations, no code/test work, skill assessment and explicit terminal/blocked handoff; any successor requires a fresh compact plan and named authorization.

## Evidence update — bounded All724 delivery

Human/root delivered redacted native All724 after plan approval: Steward-verified/root-relayed Codex-first configuration and two historical tool passes/image-color failures; named-account constraint unassured. No fresh probes/readback claimed. Receipt names `runtime/codex-first-completion-receipt.json` but absolute runtime/source mapping and file existence remain unknown. Update the same artifact with attribution and the narrower combo-specific allowlisted preference prerequisite; public-header support is unnecessary. Existing bounded artifact review covers the revised candidate; no new task or gate.

## Timing and stop

One useful artifact within 45 minutes; at 90 minutes report evidence/blocker to Coordinator for split/stop/continue decision. No new schedule or task created. Drain 2026-10-13 08:00 Eastern; stop 08:30 Eastern; `recovery=false` retained. No expensive job is needed. Completed independent protection review is retained; cancelled Offline3/All13 review hold is not revived.
