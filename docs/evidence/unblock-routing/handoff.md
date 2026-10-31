# UB-ROUTING-01 — account-routing prerequisite and finite handoff

2026-10-09. Owner: Integration Engineer 2. Reflow source: `bb829dbc7e261231dbcdbf4e1acde1b94d7536b9`. [Plan](plan.md) approved by Reviewer 4 before collection (direct plan-review receipt `01M4F87JKWH3JZVRSNNSMCZSCR`). **Disposition: documentation checkpoint; Named-account selection is not established. External implementation remains unassigned and unauthorized.**

## Model route is not an account guarantee

Authoritative native Reflow All724 is Steward agent-origin evidence, relayed by the human/root after direct read; timestamp `1791503944275`. The supplied SHA256 of the redacted delivery is `99f1d766ece4a857babee3110d8b99c2b12f8d9c7fc8c8b7d8e7f071c687914a` (not independently recomputed here). The delivery redacts the private connection UUID; no original unredacted receipt or raw log is reproduced. Its observations remain **Steward-verified, root-relayed**, not this writer's independent live verification.

All724 reports CONFIG COMPLETE at `2026-10-08T23:59:04.266824+00:00`: both dedicated combo/live/run-state orders `[cx/gpt-6.1-sol, cc/claude-sonnet-5-5]`, both plain fallback strategies; exact nine agents/models match. Human parent independently confirmed the two pool orders/fallback. Other configuration equality was verified at apply; no global reorder or guard restart. The nine-agent/historical protection details are contemporaneous receipt facts, not the current 13-target guard identity. Current protection remains the later kickoff/All32 retention, not revalidated here.

The two retained actual requests passed tools but **failed image-color checks on both routes**; no vision qualification follows. The named-account constraint remains **unassured**. No new request or probe ran for this task. Do not replace this receipt with `docs/execution/2026-10-13/activation.md:11–12`, which records an earlier Sonnet-first order and earlier probe results.

Neither concrete model order nor tool success establishes named-account pinning. All724 reports no existing per-channel named-account pin configuration. The named-account constraint remains **unassured**; continuing model availability remains **unknown**. No account database, credential file or raw request log was opened.

All724 names `runtime/codex-first-completion-receipt.json` under the existing runtime. The authoritative absolute runtime root and exact file readback are not supplied; root did not freshly check file existence. The named retained artifact is therefore a receipt reference, not a verified file readback by this writer. No guessed path is used.

## Bounded source findings

Read-only local inspection found a 9Router source snapshot at release `96a1627aa3569fa6dbf14282eff47e2704aad2e7`. A local current-release symlink and a running Node process's working directory agreed on that release at inspection. These are local filesystem/process observations only. All724 independently corroborates the chat preference/fallthrough gap as a Steward-verified, root-relayed source claim. The owner has not supplied the authoritative absolute installed routing path or completion-file readback; whether this locally inspected snapshot is the protected pools' exact serving account path remains **BLOCKED**. No installed serving-path, in-memory reload or end-to-end account-path verification is claimed.

Source identifiers below are relative to the locally inspected release or its retained build-source tree; deployment linkage remains unverified. No installation-dependent home path, account ID, email, credential or raw log is needed to reproduce the finding.

| Evidence | SHA256 | Exact bounded reference |
| --- | --- | --- |
| Locally inspected chat endpoint | `b51893ab65a89ccee086067be9dd401bcac4f9bf5f7961a0e84aca67092b176b` | `.next/server/app/api/v1/chat/completions/route.js:1`; POST delegates to module79489, loaded from chunk9489 |
| Locally inspected chat handler | `3e0a91fbb986412c1b7f72762b64b0a6ad356926ae32c7634c156215a34f6362` | `.next/server/chunks/9489.js:1`; character offset20361 credential options, offset22731 exclusion/retry; module79489 contains neither `x-connection-id` nor `preferredConnectionId` |
| Locally inspected credential selector | `167b52f3c989e8ccb9adeac3e63f8cee468bb5de449182653610ddac6c009fd7` | `.next/server/chunks/6768.js:1`; offsets16610 preference read,18956 preference lookup/strategy fallthrough,20596 default first candidate |
| Corresponding readable build source | `5508d79fba206c180389eeedbc02ceff7e98f41ea5744f6faab9fd4538994c03` | `src/sse/handlers/chat.js:35–195,289–318,381–409` |
| Corresponding readable build source | `d8490066bc992e9b03c53d74e801620a2c9de833662a06398dc0484bbbb0f17b` | `src/sse/services/auth.js:62–68,107–135,173–237` |

Offsets are zero-based character positions in the hashed minified file; all cited snippets are ASCII. Readable build-source lines corroborate the locally inspected snippets; they are not substituted for inspection of the locally inspected bundle.

1. **Chat path ignores account-selection intent.** `chat.js:44–51` retains headers in request metadata, but `chat.js:303` supplies only `requestedModel`, `accountStrategy` and `balanceMinSession` to `getProviderCredentials`. The locally inspected equivalent confirms the same option set. An `x-connection-id` header is not consumed into account selection and its preference is not forwarded to the selector on this inspected chat path. Metadata retention is not selection enforcement. This is a bounded chat-path finding, not a claim that every 9Router endpoint ignores that header.
2. **Selector preference is best-effort, not strict.** `auth.js:67` accepts `preferredConnectionId`. Active provider connections are filtered for exclusions, model locks and Codex enabled-model eligibility (`107–135`). If a preferred connection is absent from the available candidates, `179–237` proceeds to headroom/round-robin/fill-first selection. The locally inspected selector corroborates this fallthrough. Merely forwarding the header would not close the gap.
3. **Request error handling can select another account.** `chat.js:296–318,398–406` maintains an exclusion set; an error classified for fallback excludes the connection and continues credential selection. This is source-supported possible behavior, not evidence that any particular request switched accounts. No live fallback, quota or identity experiment was run.

## Smallest external 9Router prerequisite

**Proposed contract, not implemented:** the smallest prerequisite supported by All724 is a **combo-specific allowlisted account preference**, forwarded to the chat selector, with strict unavailability behavior when used as a pin. Scoped balance selects headroom, not a named account. Bind the allowlist to the authenticated authorized caller/combo; do not let an arbitrary public header select another account. Reuse existing preference plumbing; supporting a new public `x-connection-id` API is not required by this packet. Do not change global order, account priorities, providers, credentials or default fallback settings.

- Authenticate the caller; authorize their access to the requested connection before selecting or refreshing credentials. A valid arbitrary connection ID must not grant cross-account use. Reject malformed, unknown, wrong-provider, inactive, excluded, model-disabled or locked constraints before upstream work. Resolve the requested named account to the authorized private connection only through the external owner; no ID or identity mapping belongs in this document.
- Thread the validated constraint through direct/combo recursion and account selection. The strict candidate set must contain only the authorized requested connection. An absent/ineligible constrained candidate returns a sanitized explicit routing error; it must never fall through to the ordinary strategy.
- On constrained upstream exhaustion/capacity/auth failure, return the bounded failure/retry information permitted by the provider contract. No second account, provider or model may silently replace the constrained request. Do not add live quota polling or claim unknown quota as available; an upstream denial is a failure, not permission to switch. Keep existing deadline/cancellation behavior.
- With no constraint, preserve the existing model order, account strategy, fallback and all unrelated request handling. No Astra/Fable fallback is introduced. Limit the change to the separately approved caller/route contract; do not apply a global named-account preference.

Passing a header alone is insufficient. Strict selector filtering alone is insufficient if the chat error/combo path can still substitute another route. The smallest adequate change connects validation, scoped selection and non-substitution failure handling along this single request path.

## Proposed tests — none executed

The external owner should use stubbed accounts/upstream responses; no inference or quota is needed for contract tests.

- Authorized healthy constrained request: dispatch exactly once using the requested connection, even when another has higher priority/headroom. Exercise direct and supported combo recursion; retain supported streaming/tool request behavior.
- Invalid, unauthorized, unknown, inactive, wrong-provider, excluded, locked and model-disabled connection: explicit sanitized error, zero upstream calls, zero refresh of another account. Include one authorized valid positive control.
- Constrained 401/429/capacity/5xx fallback-classified response: explicit failure, no other account/model/provider dispatch; retain safe retry metadata without exposing account IDs.
- No header: existing fill-first/round-robin/headroom and normal error fallback behavior unchanged under identical fixtures; unrelated endpoints/traffic retain their contract.
- Concurrent constrained/unconstrained requests: no preference leakage across requests; existing selection serialization preserved. Invalid input and errors never expose credentials or raw logs.

These are acceptance proposals, not a test transfer or authorization to run new accepted tests. An external implementation needs its own named finite packet, written plan and owner ACK before work.

## Owner handoff and remaining evidence

Coordinator 1 receives this checkpoint only. **External 9Router owner must be explicitly named and ACK the packet by the human/current owner; no existing Reflow worker is assigned external production scope.** All724 redacted source has now been delivered. Supply the authoritative absolute runtime/installed-source locations and completion-file readback only if needed for the external implementation's provenance, then decide whether strict account selection is actually required. If not required, retain Codex-first routing without a named-account pinning claim and stop; no new abstraction is needed.

If required, external owner receives only this contract/gap/test proposal, privately resolves authorized account mapping, implements/reviews the separate narrow packet, and returns sanitized source/deployment/contract-test evidence. Any later live probe requires separate authorization. Locally inspected source does not establish the client header was emitted or a named account was used; the named-account constraint remains unassured until authorized evidence closes that gap.

## Validation and limitations

README, progress, team plan and current Coordinator claim ledger were read. Local HEAD/ref matched the finite source baseline; working tree was clean before plan creation. Changes are restricted to the two routing Markdown files. No acceptance files, engine/offline scopes, JD Astra test/proposal, human `resources.py` ownership or publication role changed. No code, rebuild, qualification, inference/vision/quota probes, account/settings reads or additional jobs/schedules/agents. Historical receipt retrieval using guessed read-only API paths returned404/405; no successful receipt readback is claimed. Existing cutoff, protection review, quarantines and `recovery=false` are untouched; no RF-04 unblock claim.

Reviewer 4 exact artifact/source review: **pending**. This checkpoint is not a publication or external implementation start. No commit/push/merge. Skill assessment: existing provider reference and repository plan/prose checks suffice; no reusable skill created. Finite disposition: **routing prerequisite documented; external implementation BLOCKED on named owner ACK/authorization. Exact absolute runtime/installed-source mapping and completion-file readback remain unknown, not blockers to the explicitly attributed All724 prose account.** Any successor requires a fresh compact plan or an explicit stop disposition from Coordinator.
