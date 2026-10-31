# Midnight route policy and guard evidence

2026-10-10 21:24 UTC. Integration Engineer 2; documentation only under `docs/evidence/unblock-routing/**`. Existing reviewed routing plan/handoff remain unchanged.

## Acceptance checks

- Verify each supplied input SHA256 before use; stop on mismatch.
- Record only secret-free outcomes and source hashes: no connection/account identifiers, usage-row IDs, private paths or process identity.
- Keep coordinator-supplied claims distinct from fields present in these inputs.
- Do not infer active traffic, account ownership, vision/quota qualification or product readiness.

## Inputs

Read-only review snapshot; all three hashes matched:

| Input | SHA256 |
| --- | --- |
| `pool-activation.json` | `294f9439934abf918d756a1dd8860447451eaf2cb7bb73d4b18c0d8983180e9c` |
| `route-qualification.json` | `34b1a0adb6d501528d415455a46bffa6b92768b5b23cacfedcd6cba8fdc44f06` |
| `live-receipt.json` | `d725214a64ee9fdd259bc75da1c5c2f8311710ed0db42bb5572a534cf7c6314f` |

## Request-scoped model policy

Pool order in `pool-activation.json`:

| Pool | First | Then |
| --- | --- | --- |
| `reflow` | `cc/claude-opus-5-5` | `cx/gpt-6.1-sol` |
| `reflow-unblock` | `cc/claude-opus-5-5` | `cx/gpt-6.1-sol` |
| `reflow-offline` | `cx/gpt-6.1-sol` | `cc/claude-opus-5-5` |

Route qualification at source `571686e70e65c6f91298b957de249bb466dc6fb1` defines `reflow-cost-effective` and `reflow-offline-cost-effective` request policies. Each allowlists two connections and two models; its model lists are both Codex then Claude. That list order is not interpreted here as pool ordering. Connection values are intentionally omitted.

Qualification outcomes:
- Positive `cx/gpt-6.1-sol`: HTTP 200, response model `gpt-6.1-sol`, usage `ok`, Codex provider, allowlisted connection.
- Positive `cc/claude-opus-5-5`: HTTP 200, response model `claude-opus-5-5`, usage `ok`, Claude provider, allowlisted connection.
- Negative empty allowlist: HTTP 404 `No active credentials for provider: claude`; denied, pools re-emptied.
- Unrelated active flags unchanged; pools currently empty.
- Native independent live route review approved, bound to the route-qualification SHA256 above.

These are request-scoped route/account-policy receipts. They do not establish quota, vision, global default ordering or unrelated traffic behavior.

## Guard evidence

`live-receipt.json` and the guard section of `pool-activation.json` agree:

- Phase `REVIEW_ONLY`; drain `2026-10-11T03:30:00Z`, deadline `2026-10-11T04:00:00Z`.
- Loaded control SHA256 `fefcd4f10dea3276dadaaef25da5d2c22e4056cfbf467f2c8fe4d8c9dd93da3b`.
- `pools_empty: true`, `recovery_all_false: true`, `activation: false`.
- Human authorization and native reviewer receipts present; identifiers omitted.

Product code activation remains gated per task by source and ownership. Steward 6 is idle; its generic route must not wake. Root handles controls.

## Limits

Coordinator states the live/reviewed guard covers exactly 13 targets across 2 pools. These inputs do not enumerate targets; that count is coordinator-supplied, not independently established here. Snapshot activation is `false` with pools empty, so this records reviewed policy, not current live pool traffic. No router/guard change, test, probe, commit or export performed.
