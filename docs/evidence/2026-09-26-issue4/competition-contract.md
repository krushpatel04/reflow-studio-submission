# Current competition contract and unresolved conflicts

> Historical September 26 record. The [October 1 source refresh](../2026-10-01-competition/README.md) supersedes its current-document names and date assumptions; retain this record for the evidence observed at the time.

Source read directly in the [official Adobe PDF Space](https://acrobat.adobe.com/link/spaces/urn:aaid:sc:US:175235eb-5b56-41fe-ba3e-9b6233979f9b), Files tab, September 26–27 UTC. Source PDF accessibility text was read, not the hub's AI summary. The expanded viewer exposes a copy-link control, but clipboard retrieval returned a permission error, so no separate document deep link was captured. Use the hub plus exact filename/page below; no guessed PDF URL is supplied.

- **[Final] Chameleon_Challenge_v1.5.pdf**: 12 pages, overview version 1.5, hub added September 24. Read pp1–12 across overlapping page windows.
- **Hackathon_FAQ_v3.pdf**: 4 pages, Fall 2026 Pilot, hub added September 25. Read pp1–4.
- **Hackathon_Info_v3.pdf**: listed September 25; contents not audited here.
- Brief p8 explicitly links [jhaaj08/chameleon](https://github.com/jhaaj08/chameleon). Inspected commit **`a44a06046b0413f0785e7203955c3822e0acbc32`**. This provenance makes it the official-linked starter, not a similarly named third-party implementation. Snapshot fingerprints are in [source-manifest.json](source-manifest.json).

Screenshots: [brief p6 stages/check-in](challenge-page6.png), [brief p6 deliverables](challenge-page6-deliverables.png), [brief p9 rules](challenge-page9-rules.png), [FAQ v3 p1](faq-source.png).

## Confirmed source statements and practical impact

| Topic | Current source statement | Reflow consequence |
| --- | --- | --- |
| Stage-one deliverable | Brief pp6,12: engine code, Dockerfile and short README. Its version footer says “viewer add-on requirement removed”. | Supersedes the older required-but-unscored viewer premise in dated Reflow research. Native product work remains relevant to the finale. |
| Engineering check-in | Brief p6 §3.2 describes a short pre-finale session for teams advancing from stage one, to explain approach/decisions/tradeoffs. | Treat as a prescribed stage for advancing teams; timing, scoring, waiver and deliverables are not specified. |
| Finale | Brief p6 §3.3/§5.1: full Express add-on, pitch and demo video; continued engine improvement is anticipated. | Native editable roundtrip still matters for finale/product readiness. Exact permitted post-freeze changes remain conflicted below. |
| Input/output | Brief pp4,8,11: same design structure and IDs; public schema and `resize(source, target_canvas)` entry point. | The schema is available for mapping; it is no longer accurate to call every field unreleased. Its v0.9 title still says provisional/pending sign-off. |
| Renderer | Brief pp8,11–12 and starter README: converter plus `cr-renderer`; starter orchestrator writes JSON and PNG. | Native Express Document Sandbox is distinct from this offline scoring renderer. Neither Reflow SVG nor a PNG placeholder proves official-renderer fidelity. |
| Execution | Brief pp6,9: container, build-time dependencies/weights, network disabled at runtime. Starter Dockerfile targets `linux/amd64`, Python 3.11; docs require Python 3.10+. | Existing local Node CLI is not yet evidence of this Python/container entry-point compatibility. No need to rewrite the engine before testing an adapter boundary. |
| Latency | Brief p9 and starter RULES: no hard stage-one execution-time limit; faster preferred otherwise equal. | Keep operational cancellation/bounds, but label them internal choices rather than organizer deadlines. |
| Hardware/models | Brief pp6,9: Apple M5 Pro reference; exact CPU/RAM/disk and permitted-model list/size limit pending. Adapted/fine-tuned weights must be publicly retrievable. | No model selected/approved here. GPU access, weight-accounting and small fitted-ranker treatment still need clarification. |
| Preservation | Brief pp9–10 and RULES: JSON structure and rendered PNG both evaluated; preserve IDs and image proportions; keep stage-one copy/font family fixed; font size can change; image pixel regeneration/replacement disqualifies. | Preserve resources/copy/styles. Finale creative suggestions are not permission to rewrite stage-one inputs. |
| Eligibility | FAQ v3 p1: any major, undergraduates, US-based accredited four-year university; participating school must be an Adobe Creative Campus; teams of 2–3 at same university, one team per student. | Older listed-major/CS-versus-CSE uncertainty is superseded. This audit does not verify any individual's registration or school status. |
| Dates/attendance | FAQ v3 pp2–4: registration Oct 4; release Oct 5; submission Oct 30; notification Nov 23; finale Jan 11–13, 2027; at least two teammates available to attend to place. | Dates remain published in FAQ even though brief removed its own timeline. No new registration, attendance or eligibility claim is made. |

## Conflicts and unknowns to preserve

1. **Viewer:** brief v1.5 removes stage-one viewer; pinned starter [FAQ Q5](https://github.com/jhaaj08/chameleon/blob/a44a06046b0413f0785e7203955c3822e0acbc32/FAQ.md) still requires it. Working recommendation: follow the explicitly revised brief for qualification planning; ask organizers to reconcile before submission. No outreach sent.
2. **Advancing-team count:** brief p6 says six or seven; FAQ v3 p3 says three. Do not publish an unqualified count or top-three qualification target.
3. **Finale freeze:** brief p6 anticipates engine changes; FAQ v3 p3 bases judging on submitted code and live defense. Extent of permitted changes is unresolved.
4. **Release/readiness:** FAQ v3 p2 announces October 5 release, yet linked starter is already public. Schema explicitly provisional; `brand_kit/README.md` explicitly labels current assets/fonts stand-ins. Availability does not settle pre-release code reuse or final release stability.
5. **Hardware:** brief §3.1 describes team's own machine; p9 specifies reference Apple M5 Pro; starter uses amd64 Docker. Execution location, emulation/native architecture, GPU and exact resource allocations remain unsettled. Do not infer performance equivalence from a local Mac.
6. **Rules/renderer:** schema accepts zero-width/height elements and `fit: fill`, while rules require proportional images and on-canvas output. README calls an intentionally bleeding decoration an expected self-check warning. Require explicit policy for such cases; do not silently repair originals or waive constraints.
7. **Unreleased detail:** permitted models/size accounting, exact hardware, payload/file bounds, final target catalogue and submission destination are not resolved by these sources. Pre-release reuse/dependency licensing and finale exceptions still need explicit answers.

## Starter implementation caveats (static inspection only)

Pinned [engine/main.py](https://github.com/jhaaj08/chameleon/blob/a44a06046b0413f0785e7203955c3822e0acbc32/engine/main.py) catches `ImportError` around renderer import **and invocation** and writes a box-and-label PNG fallback. Its self-check is advisory and compares sets of IDs, so it is not proof of duplicate safety or full JSON Schema validation. Integration acceptance must demonstrate the real converter path and fail visibly on unexpected fallback.

[requirements.txt](https://github.com/jhaaj08/chameleon/blob/a44a06046b0413f0785e7203955c3822e0acbc32/requirements.txt) pulls `cr-renderer` from an unpinned Git URL and allows Pillow >=10. A pinned starter commit alone does not freeze transitive renderer behavior. Record resolved versions and asset/font hashes for #7 comparisons.

[brand kit](https://github.com/jhaaj08/chameleon/blob/a44a06046b0413f0785e7203955c3822e0acbc32/brand_kit/README.md) currently contains three image files and seven renamed Lora/Poppins font files; its README calls these stand-ins. The Level 3 holiday badge is intentionally absent: do not invent/add it. This audit did not install dependencies or run the starter/renderer, so readme claims about rendering remain source-reported.
