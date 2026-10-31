# Competition source audit — October 1, 2026

> Historical October 1 record. The [October 4 official-source check](../2026-10-04-competition/README.md) adds the event-page info session and precise notification date, plus eligibility wording reconciliation.

## Sources and method

Read the actual PDF accessibility text in the Files tab of the [official Adobe hub](https://acrobat.adobe.com/link/spaces/urn:aaid:sc:US:175235eb-5b56-41fe-ba3e-9b6233979f9b), not its generated overview or AI answers. The hub now lists two replacement files:

- **Chameleon Challenge.pdf**, 14 pages, shown as added 2 hours ago during inspection. Read substantive pages 2–14; page 1 is a cover image. No new numerical version was observed; do not rename this file “v1.6” or continue identifying it as v1.5.
- **FAQs & Info - Adobe University Hackathon.pdf**, 14 pages, shown as added 3 hours ago. Read pages 1–14 through overlapping page windows. This replaces the previously listed separate FAQ/info files in the current hub.

Page references below are physical PDF page numbers, including covers. No standalone PDF download/deep link was obtained. Relative “added” times identify the observed listing, not exact publication timestamps. The prior [September 26 audit](../2026-09-26-issue4/competition-contract.md) remains historical evidence.

The challenge still links [jhaaj08/chameleon](https://github.com/jhaaj08/chameleon) on p10. `git ls-remote` verified HEAD remains **a44a06046b0413f0785e7203955c3822e0acbc32**, matching the previous audit. The pinned [starter FAQ Q5](https://github.com/jhaaj08/chameleon/blob/a44a06046b0413f0785e7203955c3822e0acbc32/FAQ.md) was read directly again. No upstream code/schema change was found and no renderer execution was performed in this documentation refresh.

## Changes and reaffirmed requirements

| Subject | Current source | Difference / repository action |
| --- | --- | --- |
| Registration cutoff | FAQ/info p7: October 4, 2026, 11:59 PM PST; university email for each teammate; no separate competitive application round | Add the explicit time and retain the source's PST label. Pacific daylight time is normally in effect then; do not silently convert this to another zone. Confirm the intended zone if needed and register early. |
| Build and submission | FAQ/info p9: release October 5; build October 5–30; submission October 30 | Dates unchanged. No submission time or timezone specified on this page; registration's time does not apply to submission. |
| Finalist notification | FAQ/info p11: outreach expected in November 2026 | Supersedes the previous FAQ's precise November 23 date for current planning. Do not promise a particular day. |
| Finale and attendance | FAQ/info pp13–14: January 11–13, 2027, San Jose/Adobe HQ; at least two teammates must attend to place | Dates and attendance rule reaffirmed; participation remains possible without attendance, but placing is not. |
| Stage 1 package | Challenge p8 §5.1 and p14 Q5: engine code, Dockerfile and short README, before code freeze; destination/form announced separately | The challenge's own Q5 now agrees with engine-only qualification. The old starter FAQ still adds a viewer: cross-source conflict persists. |
| Finalists | Challenge p7: six or seven advance; FAQ/info pp11,13: three | Still contradictory. Use three as the FAQ's published logistics plan, explicitly qualified; do not claim the technical brief agrees. |
| Engineering check-in and finale | Challenge p7: advancing teams explain approach/tradeoffs before finale; full Express add-on, pitch/video (p8), with further engine improvement anticipated | Preserve native finale track. FAQ/info p13 still describes defending the submitted build and judging code plus live panel; post-freeze change policy remains unclear. |
| Eligibility | FAQ/info pp5–6: undergraduates, any major, US accredited four-year Adobe Creative Campus university, 2–3 same-university students, one team per student | Reaffirmed, not a verification of this team's registration or eligibility. |
| Input and output | Challenge pp5,10,13: same elements/IDs and structure; source plus target_canvas; provisional v0.9 schema and resize(source, target_canvas) | Keep the existing adapter plan and field mapping. Official input has no headline/logo semantic labels. Early prose still describes schemas as forthcoming although the later section links one. |
| Evaluation | Challenge pp10–12: output JSON and actual official-renderer PNG both checked; no hard Stage 1 execution-time limit | Continue quality-first work and internal operational safeguards; internal limits are not organizer deadlines. |
| Preservation | Challenge pp11–13: preserve inventory/IDs, image proportions, copy and font family; font size may change; image-pixel regeneration/replacement disqualifies | No permission to relax the engine's preservation contract. Finale creative suggestions are separate from Stage 1. |
| Offline execution and models | Challenge pp7,11: offline container; build-time dependencies/weights; adapted weights publicly retrievable; allowed-model list and size limits pending | No model adoption or approval established. Python starter/amd64 Docker and Apple M5 Pro reference remain published alongside own-machine wording. |

## Unresolved gates and source defects

1. **Viewer:** current challenge p14 omits it, while unchanged starter FAQ Q5 requires it. Plan Stage 1 around the new challenge; retain organizer clarification before submission. This is a stronger current source basis, not evidence that the starter was fixed.
2. **Finalist count and post-freeze changes:** preserve both documents' statements above. The hub introduction calls the FAQ definitive for eligibility; that does not silently reconcile every technical/logistical contradiction.
3. **Execution budget:** exact CPU/RAM/disk, model list/size accounting, execution location and architecture remain unclear. Do not infer that an amd64 container on a local Mac proves organizer hardware parity.
4. **Release:** October 5 remains the published release despite the public starter. Final schema/resources, permission for pre-release code reuse, submission destination and exact submission cutoff remain to be confirmed.
5. **Editorial drift:** challenge p14 still refers to §9.1 although the setup section is §7.1; p13 calls the standalone FAQ CHAMELEON_FAQ.md, but the linked repository has FAQ.md. Do not invent missing files or sections.
6. **Renderer caveats persist:** unchanged starter code still permits the box-and-label fallback; advisory self-check is not full schema validation. The prior audit's stand-in resources, unpinned renderer dependency, missing-asset and bleed-policy concerns remain applicable. A dependency pin and real rendered evidence are still required for compatibility claims.

## Verification boundary

This audit updates requirements and planning only. It does not certify the engine, run the official renderer, register the team, contact organizers, update GitHub issues/board, or admit sealed corpus sources. See the [current roadmap](../../roadmap-2026-10-01.md) and [refresh plan](../../plans/2026-10-01-competition-refresh.md).
