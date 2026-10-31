# Verified Adobe launch sources — October 5, 2026

## Authority and retrieval
User directed Adobe to be the source of truth. Read the launch email from `auhacknamer@adobe.com`, subject **The Adobe University Hackathon Begins Today**, sent October 5 at 9:30:57 PM EDT, through JD's connected Gmail. It links the [Final Chameleon Challenge](https://acrobat.adobe.com/id/urn:aaid:sc:US:9a9861db-a87a-4dc4-91fb-fff30ed022c6); pages 10–14 identify [the official starter](https://github.com/jhaaj08/chameleon). The source manifest retains provenance and hashes, without raw mail headers, credentials or recipient details.

Clone observed at `a44a06046b0413f0785e7203955c3822e0acbc32`. This is the same SHA inspected historically; this update verifies its release linkage and current contents, **not an upstream code change or runtime success**. Schema title still says v0.9 provisional/pending sign-off. Never relabel it final simply because the email announces release.

## Released resources and technical facts
- Python entry point: `engine/resize.py` exports `resize(source, target_canvas)` and returns a design with canvas and elements. Tasks wrap source and target; the existing Reflow TypeScript CLI is not this Python entry point.
- `engine/main.py` loads task files, invokes resize, writes JSON and PNG and runs a structural check. The included layout implementation is a deliberately weak stretch baseline. The local check is not the official evaluator and warnings do not fail execution.
- Three samples: Level 1 has 4 elements (1080×1080 → 1080×1350), Level 2 has 11 (1080×1080 → 1600×400), Level 3 has 17 (1080×1350 → 728×90). These are public development inputs, never held-out quality evidence.
- `renderer/converter/` is already present. `requirements.txt` includes Pillow and a Git dependency on CyberAgentAILab/cr-renderer. This is available source plumbing; successful installation and genuine rendering on our host remain unverified.
- The orchestrator catches renderer `ImportError` and falls back to labeled boxes. A PNG file alone cannot establish renderer success. Qualification evidence must positively verify the real renderer path and fonts/assets.
- Three supplied asset files and seven font files are inventoried and hashed. The missing Level 3 holiday badge is deliberate; do not invent/add replacement imagery or treat it as a distribution failure.
- Existing upstream Dockerfile builds linux/amd64 Python 3.11 and executes `python -m engine.main`; runtime network access is disabled for qualification. Third-party dependency commit pinning/reproduction remains our responsibility.

## Preservation and grading boundaries
Preserve every source element ID exactly once, count, asset pixels, text content and font family. Resize/reposition and font-size changes are permitted; grouping, stacking, opacity, rotation and type-specific properties require faithful handling. The public task lacks semantic role labels, so production cannot depend on human-authored role sidecars. Both structural JSON and the actual rendered PNG matter; internal diagnostics and passing unit tests are not the official score.

The brief and rules require local/offline execution. Optional local models await the approved list and size limits; adapted weights must be publicly obtainable for reproduction. Model-provider choices for development agents do not authorize external APIs in the submitted engine. No hard Stage 1 execution-time cutoff is stated; retain internal safety budgets as local policy rather than organizer requirements. Reference hardware is described as Apple M5 Pro with detailed limits unresolved.

## Launch dates and user actions
| Item | Latest launch-email evidence | Status |
| --- | --- | --- |
| Team | 2–3 students, same university, individually registered, one team per student | Our roster/registration not verified |
| Team registration | October 8, 2026 | [Team form](https://forms.cloud.microsoft/r/3jk3pQNjkc); exact time/timezone unstated |
| Build window/submission | October 5–30; closes October 30 | Exact closing time/timezone unstated |
| Finalist announcement | November 23, 2026 | Latest direct launch email supersedes older November 20 planning |
| Finale | January 11–13, 2027, San Jose | Launch email says team travel required to place; roster-specific eligibility not verified |

The email provides the [submission form](https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=Wht7-jR7h0OUrtLBeN7O4ZDstE0lQmpPpd8xizkT0otUN0pRSUVDR0ZFWExFVzE4VTgwMlpWQVZUMy4u): one member submits team information, GitHub repository link and finale availability. It describes no separate file upload. This source review does not fill forms, certify eligibility or submit anything.

## Conflicts retained rather than guessed
1. Final challenge pp8/14 describes engine/code/Dockerfile/README for Stage 1; repo FAQ Q5 still includes an unscored viewer. Treat engine qualification as immediate work and keep viewer as a tracked clarification/finale task; do not certify that a viewer is unnecessary without resolving organizer wording.
2. New brief pp10/13–14 describes integrated rendering; README and code confirm converter is vendored, while repo FAQ references a separate transformer-convertor app and asks users to vendor it. Follow inspected code for reproduction and document this stale FAQ discrepancy.
3. Email supplies the submission form; brief/FAQ still say destination will be announced. Use the launch-email form.
4. Email says November 23 versus older event-page November 20; use the latest direct communication and retain prior audit as historical.
5. Schema final sign-off, approved models/size limits, precise hardware limits, finale code-change policy and exact deadline timezone remain unresolved. Stage-one no-image-regeneration rule overrides speculative finale creativity until organizers explicitly clarify scope.

## Reflow state and evidence limits
Main `927e7acb` includes PR53/55 internal adapter/CLI/native-font-path changes. `src/official-adapter.ts` and `scripts/official-cli.ts` exist, but their supported subset and local resource limits differ from the full official schema. Do not claim all three samples or renderer parity pass. Native Express editability, independent visual quality, sealed-family evaluation and the official offline container remain open. Old renderer-unavailable planning is superseded by **available upstream source / unverified installed execution**.

Next: [source-aligned roadmap](../../roadmap-2026-10-05.md) and [paused execution plan](../../plans/2026-10-05-adobe-execution.md).
