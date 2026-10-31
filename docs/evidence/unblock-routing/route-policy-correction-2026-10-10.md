# Route policy correction — 2026-10-10

Integration Engineer 2; documentation only under `docs/evidence/unblock-routing/**`. This dated correction leaves the approved [midnight route policy](midnight-route-policy.md) unchanged and separates its timing from current guard and product state.

## Acceptance checks

- Verify the live receipt SHA256 before use; stop on mismatch.
- Exclude process IDs, start ticks, timestamps in milliseconds, exporter expiry, human-message identifiers, home paths and account/connection identifiers.
- Keep the historical snapshot, live guard and product activation as separate claims.
- No route re-qualification, tests, router or guard changes.

## (a) Historical midnight snapshot

The midnight review recorded phase `REVIEW_ONLY`, pools empty and activation false, with drain `2026-10-11T03:30:00Z` and deadline `2026-10-11T04:00:00Z`. Those fields describe that snapshot only. They are not current routing state and do not override the guard below.

## (b) Live guard — root-verified

Read-only `tuesday-0800-review/live-receipt.json`, SHA256 `cb4d3efaa55315990b6a4142bd30e7b1998fab435f833ead6c2b595bbf49aba9`, 843 bytes; hash matched before use.

- Heartbeat phase `REVIEW_ONLY`.
- Drain `2026-10-13T11:30:00Z`; deadline `2026-10-13T12:00:00Z`.
- Loaded control SHA256 `e570974ce173cdc933276b23aa53c4517709e46868ff72831f91ebeb799cc5b7`.
- Service identity hashes: cutoff `e570974ce173cdc933276b23aa53c4517709e46868ff72831f91ebeb799cc5b7`; transfer/exporter `7396d2827b17368e5c8c4458a303a8a3b24830da01b389a74f6f6677308e717e`.
- Exporter HTTP `200`.
- Review: native exact-hash approval.

Root freshly verified process identity, start ticks and heartbeat. This document cites that root verification; the writer did not inspect processes.

## (c) Product activation blocked

`implementation_authorized=false` is intentional while canonical source gates remain blocked. This value comes from root's statement through the coordinator; it is not a field in the live receipt above. Guard liveness is not product activation: a live `REVIEW_ONLY` guard and a reachable exporter do not authorize implementation, routing traffic or publication.

## Limits

No account ownership, quota, vision or route re-qualification is established. Pool order and request-policy outcomes remain as recorded in the midnight document.
