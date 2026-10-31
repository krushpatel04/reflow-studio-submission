# UB-ACCEPTANCE-01 provenance readiness

**Disposition: acceptance preparation only; exact-task lineage and rebuild readiness blocked. Zero eligible sources. No RF-04 readiness, human quality acceptance or submission qualification.**

## Authority and local evidence

Reviewer4 approved the bounded precollection plan. The exact acceptance-only UB-ACCEPTANCE-02 payload was received from Coordinator's materialized public packet, retained without reserialization as a private source packet (not included in this public snapshot), then checked locally: **2,555 bytes, no trailing newline, SHA256 `c42f6390237aad37dc2f5904eb83038a49ce487a8e0ea538830a4674f8ccdcf2`**. This proves packet transfer-byte integrity, not the truth or reproduction of sender evidence. Local JSON inventory checks establish that the received packet declares three quarantined sources, seven tasks each (21 total), four source-scoped missing links and zero eligible sources.

Local repository HEAD at start: `bb829dbc7e261231dbcdbf4e1acde1b94d7536b9`; branch `jo/unblock-acceptance-01`. Claim authority: human ownership correction and finite acceptance handoff, recorded in the coordinator's scope ledger, not a verified repository claims artifact. Acceptance-only scope; routing belongs to Integration2. JD Astra's existing 19 tests/proposal remain separately owned. Converter/`resources.py` transfer remains pending [#112 comment6071098172](https://github.com/kj-squared-labs/reflow-studio/issues/112#issuecomment-6071098172).

Latest kickoff source/bootstrap/export/protection and coordinator ACK are owner-reported, with independent scoped-export readback; they are not locally reproduced here. Existing run protection, `recovery=false`, approved heavy-job rules and October 13 08:00 Eastern drain / 08:30 stop remain unchanged. No heavy job was started.

The canonical owner decision retains the completed independent review; obsolete renewal is cancelled, not waived. UB02 supersedes only UB01's stale review hold. Its old activation hold text is historical: current explicit finite kickoff authorizes this documentation task, not rebuild/source work. No additional completed-review renewal is requested.

## Exact public-input inventory and exclusions

| Source ID | Reported original SHA256 | Counted tasks | Missing SVG link IDs | Current exclusion |
| --- | --- | ---: | --- | --- |
| `0qOFrrbBaTnaYeRoIlZE` | `b515df44fca7bbf35db2f77092ce237f13495aafd01dc017a18b2cddf61e412d` | 7 | `0-1`, `0-3`, `0-8` | Quarantined; no human/converter release receipt. Three unresolved link identities. |
| `0vxUdcOKbvrSVNSxRY4w` | `a69e7db5a24f4bbe3bda682115afe92d2c1e8c794026d4c0cad77a0f4619b518` | 7 | `0-3` | Quarantined; no human/converter release receipt. One unresolved link identity. |
| `3jmFr3CGhibT4vc3KjI1` | `b82319b5bf5aca7c8b0ffa2dcedc50e0ab84c33ef060f30a08b0e59c1e999990` | 7 | none reported | Quarantined; no human/converter release receipt. No specific additional quarantine cause supplied. Absence of missing links is not admission. |

Accounting: **3/3 sources excluded; 21/21 counted source-target tasks excluded; 0 eligible; 4 source-scoped missing links**. The two `0-3` values belong to different sources; do not deduplicate them. Exact task IDs, target sizes, source paths and task manifest digest are **unknown**. `rebuild-contract.json` retains only the seven-task count per source; it creates no task rows or ordinal identities. This cannot satisfy a full 21-task identity/lineage checklist. No task silently omitted or invented.

## Version lineage and hash boundaries

Preserve all old bytes, exclusions and links. Packet labels, not locally verified Git ancestry:

- UB01 digest: `743a9c7424ca6e58570102c6a9027eb754eaa9395a69828bd2728424e1159b03`; UB02 replaces only the stale review hold.
- `audit_commit`: `cbfd9fdf2eee03b870087d601961f6dd1375f6c9`.
- `evidence_commit`: `f113f173f3dad1b081aadc4382c6058109b445a9`.
- `tested_source`: `75f0ac1218b00a62f44b2b0aca4884b1e0f2a677` (historical).
- `main_observed`: `1fc3667af08c6b23d33dae972cef8eba448854c3` (historical; sender reports resource/rasterizer/batch/test parity).
- Current finite-task source: `bb829dbc7e261231dbcdbf4e1acde1b94d7536b9`, locally checked HEAD. No historical test evidence is promoted to this HEAD.

`evidence-hashes.json` separates locally verified packet/document hashes from sender-reported original/archive hashes. Original hashes identify originals only; they do not prove converted content fidelity. Archive digest `5a57c941aeee7da7e5629703732e39eef5ebacdbb3910d7bbbb9313554c54d51` is sender-reported; archive path/bytes were not provided or opened. Sender archive statement: “81 safe entries;77 indexed +3 supplemental hashes/sizes and CRCs verified.” Do not resolve its accounting or assert a new defect without original evidence. 34 resource blobs are reported; paths/digests unknown.

Converted JSON, raster/renderer output, complete box metadata, runtime/font/resource manifest, human acceptance and future rebuilt artifacts need their own independent identities and hashes. They are unknown, not equal to the original/archive/packet digest. A future artifact version must append lineage, not rewrite earlier links/exclusions/bytes.

## Three separate receipt classes

| Class | Packet evidence | Local result / limit |
| --- | --- | --- |
| Technical metadata | Archive statement, original hashes, 34 resource blobs; proposed missing-link mechanism: same original SHA + complete box + raster SHA; preceding same-source alias retains link | Packet bytes/counts checked only. Complete boxes, raster hashes, alias mapping and raw artifact paths absent. Metadata similarity alone is not conversion fidelity or acceptance. |
| Renderer / behavioral evidence | Sender reports 19 baseline mock tests: 10 semantic failures / 0 errors; isolated 19 PASS; independent 24 order permutations PASS | Not run or independently verified here. Mocks only; no real renderer, raster, browser, resize or current-source compatibility receipt. Existing tests/proposal not transferred. |
| Human acceptance | `human_acceptance: pending`; resources transfer pending #112 comment6071098172 | No human converter ACK, per-input acceptance or quality receipt. All three remain quarantined. Reviewer4 documentation review cannot supply human input acceptance. |

No repeated proof, invented defects or substitute inputs were collected. Validation/sealed layouts were not inspected.

## Actual prerequisites and stop conditions

Before exact lineage can be called complete: provide a named authorized **public** manifest path/hash with all 21 real task IDs, dimensions and version/source bindings; original/archive/resource paths and independent expected hashes; complete box/alias mapping plus converted/raster artifact identities. All those paths are currently unknown, not inferred from commit labels.

Before source/conversion/rebuild execution: a later finite named task, exact packet ACK, human owner/converter ACK (still pending), scoped patch review, approved source/export receipts and permitted execution window are required. Original quarantine/exclusions persist until explicit owner acceptance. Technical metadata, renderer compatibility and actual human acceptance must each be separately receipted. No converter/test/proposal transfer or second publisher is authorized by this record.

Stop on digest drift, missing required public path/receipt, conflicting claim, any validation/sealed access request, scope creep, pending quarantine/human gate, expired named authorization or the unchanged drain/cutoff. Do not rebuild, qualify, resize, inspect outputs, repair resources or manufacture readiness under this task.

## Documentation checks and terminal handoff

Checks: exact packet digest/size/newline and JSON parse; three source IDs, per-source seven-task counts, source-scoped missing-link IDs, exclusions/zero eligibility; generated contract preserves unknown identities and boundaries; local document digest readback; acceptance-only diff. No test suite, browser, rasterization, resize, rebuild or qualification run. Exact artifact review by Reviewer4 is required before milestone acceptance.

**Terminal after reviewed preparation:** no execution-ready successor is authorized. Exact task-lineage completeness is blocked by absent authoritative manifest/paths/hashes; source/rebuild/human acceptance additionally blocked by named execution authorization and converter ACK. A successor needs a fresh bounded plan. Existing documentation/review workflow suffices; no new skill created.
