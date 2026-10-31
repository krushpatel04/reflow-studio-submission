# Reflow Studio — adversarial review and competition plan

Reviewed September 15, 2026. Code reviewed: `fd780591ecf48cd91d4c481002b18a4c67bad452` on `main`; the remote main matches. The other remote branch contains the earlier shared evidence, not newer engine work.

## Verdict

The prototype is a useful development foundation. It does not yet provide evidence of top-three performance. The best investment is to eliminate silent failures, improve source-aware composition, and validate unseen designs under the real rendering contract. A concrete presentation story can make the value memorable once the automatic system works.

**Scope decision:** Krush's family business is presentation context only. It does not create product requirements, benchmark dependencies, or delivery gates. The project remains a general structured-design reflow engine with a proposed Adobe Express workflow. Independent design evaluation and general creator validation remain part of the existing plan.

## What the competition actually rewards

The current Chameleon brief describes an offline, containerized engine evaluated on hidden inputs using Adobe's renderer and an AI evaluator. Rearrangement, clean composition, and readability carry high emphasis. The simple native Express viewer is required but unscored. The finale evaluates the live experience, technical depth, impact, and presentation. Specific schemas, model allowances, and runtime constraints remain release-dependent. [Official technical brief, sections 2–6](https://acrobat.adobe.com/link/spaces/urn:aaid:sc:US:175235eb-5b56-41fe-ba3e-9b6233979f9b)

**Implication:** our own zero-error count is not the scoring target. The image produced from our returned document must look good to an independent reviewer. A large text rectangle and a larger minimum font can improve our score without improving the composition.

Use varied, permissioned design families to expose general failures. Do not specialize the engine to a particular poster, company, ID, or target ratio.

## Review scope and evidence

Read the engine, document model, evaluator, typography, SVG/native renderers, workbench, fixtures, tests, benchmark scripts, plans, contributor guidance, and existing issue plan. Inspected representative archived images and newly rendered adversarial examples.

Executed successfully:

- `npm test`: 9 tests passed.
- `npm run build`: TypeScript and production build passed.
- `npm run verify`: 30 native layouts completed.
- Additional evaluator fault injections, input-validation probes, a mixed-role group example, ten nearby-size transformations, and a dense-text stress sweep.

Evidence: [probe results](evidence/2026-09-15-adversarial/results.json), [stress measurements](evidence/2026-09-15-adversarial/stress.json), and the [reproduction protocol](evidence/2026-09-15-adversarial/README.md). Run `npm run review:probes` from the repository root. The separate `npm run review:stress` sweep can take substantially longer and writes results after each case. Fresh runs stay under ignored `reports/`; the dated evidence stays unchanged.

This review did not rerun manual browser/keyboard/mobile acceptance, reproduce Adobe's evaluator, or perform an authenticated Express document round trip. No product source was modified. Findings below distinguish actual engine failures from deliberately corrupted outputs used to test diagnostics.

## 1. Findings to fix first

### P1 — A valid group can separate and make its text invisible

**Observed engine failure.** A button contains a dark rectangle classified as decoration and a white text label classified as content; both share a group ID. `units()` filters by role before building groups (`src/engine.ts:21`). The label moves into the new content layout while its background keeps the uniform transform. The resulting white text lands on white canvas.

The selected stack candidate reports **0 errors, 0 warnings**. Group membership survives in JSON, but the visible relationship does not.

| Source | Selected output |
| --- | --- |
| ![Readable source button](evidence/2026-09-15-adversarial/mixed-role-source.png) | ![Label separated from its background](evidence/2026-09-15-adversarial/mixed-role-selected.png) |

**Fix:** resolve all members of an explicit group before choosing its layout role. Represent containment and supporting backgrounds as relationships. Preserve them through transforms; verify visible foreground/background relationships afterward.

**Acceptance:** mixed-role groups retain their geometry and legibility across nearby and extreme ratios, in both renderers. Add tests for badges, price labels, logos with backing plates, and nested groups if supported by the official contract.

Owner: JD with Junho. Extend #2 and #5; this requires explicit coverage beyond the current product-label warning target.

### P1 — The evaluator accepts destructive changes

**Observed diagnostic blind spots, tested by fault injection.** Each of the following independently produced zero errors and warnings:

- Set the headline opacity to zero.
- Change the headline's brand color.
- Remove a label's group membership.
- Reverse paint order.
- Add an opaque decorative rectangle covering the whole design.

These are not claims that the current engine spontaneously performs all five mutations. They show that the evaluation layer would fail to detect them.

`src/evaluate.ts:9` checks a limited subset of content identity; `src/evaluate.ts:16` restricts geometry/collision inspection to content-role elements. Its overlap exemption is also broad: a previously overlapping pair is treated as intentional without checking whether the new overlap obstructs important content (`src/evaluate.ts:38`).

**Fix:** add a strict preservation validator for IDs, element inventory, roles, groups, styles, opacity, assets and paint order, with an explicit whitelist of permitted changes. Separately evaluate rendered visibility, contrast and harmful occlusion. Preserve valid intentional layering.

**Acceptance:** every injected destructive mutation is detected; original legal overlap still passes. Do not equate a structural check with visible correctness.

Owner: JD for preservation; Junho for rendered diagnostics. Extend #2 and #6.

### P1 — A one-pixel change can redesign the entire composition

**Observed engine behavior.** Eight of ten fixtures select stack/split when target width increases by one pixel. For `edge-subject`, 1350×1080 becomes 1351×1080, but the composition changes from image-above-text to image-beside-text. Both baseline and selected output have zero warnings/errors.

| Source | One pixel wider |
| --- | --- |
| ![Original composition](evidence/2026-09-15-adversarial/one-pixel-source.png) | ![Substantial re-layout after one-pixel change](evidence/2026-09-15-adversarial/one-pixel-selected.png) |

The exact-size identity shortcut (`src/engine.ts:87`) disappears immediately, and the selector rewards a larger minimum text size without a source-change penalty (`src/engine.ts:78`).

**Fix:** score alignment, hierarchy, meaningful spacing, source-relative movement, crop loss, and justified rearrangement. Prefer minimal changes when the target shape barely changes. Permit real layout transitions when constraints require them; do not prohibit legitimate reflow.

**Acceptance:** sweep nearby dimensions and quantify displacement, strategy transitions, crop changes and human preference. A new ratio should cause only changes needed for a good composition.

Owner: JD. Tracked in [#12](https://github.com/ojedaJD/reflow-studio/issues/12), alongside #5.

### P1 — Validation accepts inputs that fail in the renderer

**Observed.** Missing font family, unknown image asset, missing focal point, and invalid opacity pass `validateDesign()` (`src/model.ts:55`). Unknown assets then throw; missing focal points produce a raw TypeError; missing fonts can render with unintended fallback.

Assets are also resolved directly from synthetic fixture data in both renderers. A customer image needs an explicit asset-provider interface.

**Fix:** validate the complete contract once, resolve assets/fonts before layout, and return structured unsupported-input findings. Separate asset retrieval from fixture definitions. Make internal resource limits configurable against the released contract; the current 100-element and 8000-dimension ceilings are prototype choices.

Owner: JD and Junho. Extend #2, #3 and #8.

### P1 — The system is optimizing an incomplete quality model

Three candidates are too restrictive for many layouts: uniform, vertical stack, and a fixed image/text split. There are no explicit constraints for alignment grids, title/body hierarchy, source whitespace, logo protection, contrast, or crop loss. Content coverage sums rectangles rather than measuring useful visible content.

The archived product-pairs square retains six readability warnings. Its image/price column is cramped while large areas remain empty. That suggests poor space allocation, not simply insufficient font scaling.

**Fix:** add a small, bounded set of materially different candidates: source-preserving adaptation, group grids, variable column splits, and anchored text/image arrangements. Use content-aware sizing and limited local repair. Hard preservation/visibility constraints should take precedence over soft aesthetic scores.

Measure the benefit of each component by removing it and comparing results. Consider an allowed local visual model only after its availability, runtime and independent benefit are established. Adding a model is not itself an improvement.

Owner: JD; Krush owns independent evaluation. Extend #5 and #7.

### P2 — Dense input has no bounded execution path

A native stress sweep with 1,050 characters per text element took approximately 0.31s for one element, 2.85s for ten, 11.79s for forty, and **28.09s for one hundred**. These are single local measurements on deliberately difficult text boxes, not ordinary-case latency or official limits.

The workbench runs reflow synchronously, and comparison/overlay changes call `redraw()`, which recomputes layouts (`src/main.ts:49`). Similar workloads could block interaction.

**Fix:** cache measurements and unchanged layouts, deduplicate identical candidates, cap search by the published budget, and isolate expensive work so it can be cancelled. Preserve a valid fallback and expose unresolved problems; never silently drop text to finish faster.

**Acceptance:** record cold start, font/asset load, parsing, layout, rendering, export, memory and failure behavior separately. Test on the scoring machine with networking disabled and enforce timeouts externally.

Owner: JD with Junho. Extend #8; add a performance gate.

### P2 — Passing verification is weaker than its name suggests

`scripts/verify.ts:14` checks that selected error count does not exceed the baseline, which follows directly from the selector's ordering. Its PNG assertion checks the file signature, not image quality. Browser glyph checks share the layout code and do not cover all rendering semantics. No GitHub Actions workflow exists.

**Fix:** automate meaningful invariant tests, native/browser renderer checks, mutation detection, metamorphic tests, and artifacts on PRs. Include nearby-size changes, uniform changes of coordinate units, group declaration reordering, ID renaming, large inputs, source overflow, missing assets, empty text and Unicode cases.

Use independent visible checks and human review. A second rendering path is useful but not fully independent if it shares wrapping/cropping logic.

Owner: JD for CI and invariants; Junho for browser/render checks; Krush for evaluation protocol.

## 2. Product and integration pieces still missing

### Native editable round trip

The current viewer probe (#4) is a start, but one native text operation is insufficient. Prove:

1. Read an existing document with text, images, groups and layers.
2. Serialize the supported fields without losing information.
3. Generate output through the same engine used for evaluation.
4. Apply output to actual native elements.
5. Edit a generated element in Express, save, reopen and inspect it.
6. Undo the operation; recover from partial failure and retry without duplicates.

Record stable versus experimental APIs and unsupported features. Adobe's current changelog includes changes to text, image retrieval and resize APIs; use a versioned capability matrix. [Adobe SDK changelog](https://developer.adobe.com/express/add-ons/docs/references/changelog)

### Durable campaign state and correction semantics

The workbench currently resets edits on reload/design selection. There is no import, saved campaign, source revision, local exception model or synchronization with native edits.

A minimal future campaign record needs source/element IDs, target IDs, source revision, explicit relationships, user locks, per-variant overrides, and a version for the layout algorithm. Preview should identify affected variants; applying a correction must preserve exceptions and detect stale source state.

Adobe supports private element metadata, with documented quotas, which offers one possible place for identifiers. Test copy/reopen/undo behavior before relying on it; metadata support alone does not establish complete synchronization. [Element metadata](https://developer.adobe.com/express/add-ons/docs/guides/learn/how-to/element-metadata)

Keep manual correction outside the automatic stage-one path. It is a product capability to validate and later implement, not a way to repair benchmark outputs before scoring.

## 3. Presentation story and independent validation

Krush's family runs a sign shop. His subsequent [workflow account](sign-shop-story.md) describes artwork preparation followed by adaptation for a large sign, yard sign, banner, and flag. That adaptation step supplies the presentation story. The account is not evidence of Reflow usage or measured savings, and the demo remains illustrative. Vectorization, resolution improvement, mockups, and production preparation are outside scope.

**Story boundary:** no required shop interviews, historical-job pilot, print-production features, shop-specific assets, or proof-approval gate. Do not claim the family uses the tool, endorses it, or has achieved savings unless that separately becomes true. An illustrative scenario should be labeled as such.

Adobe's 2025 judges praised StyleSnatch's real small-business use case and Side Note's polished integration. Those were different competitions; the lesson is to make the value clear and demonstrate the workflow. A family-business story does not establish technical quality or predict a placing. [Adobe's judges' comments](https://blog.developer.adobe.com/en/publish/2025/08/meet-the-winners-of-the-first-adobe-express-add-ons-hackathon)

Think Post already won Enterprise Efficiency with editable, platform-specific designs from one input. Our distinction must be demonstrated preservation, better composition on unfamiliar designs, and useful correction behavior. [Think Post](https://devpost.com/software/think-post)

### General creator validation remains in scope

The existing #10 task tests the campaign-correction storyboard with three creators. Recruit according to their design workflow; no participant needs a connection to the family business. Observe the existing process, test the proposed preview/shared-rule/exception interaction, and retain objections and failures. Do not present storyboard feedback as measured performance of an implemented product.

Once the workflow exists, compare matched tasks with the current Express workflow. Record setup-through-accepted-output time, repeated corrections, content fidelity, first-pass acceptance, and revision effort. Use randomized order or comparable jobs to limit practice effects; report sample size, medians, ranges, ties, and failures. Keep this product evidence separate from the automatic engine benchmark.

### Proposed demo

1. Briefly introduce the personal connection and an explicitly illustrative business scenario.
2. Start with a structured editable design; generate several sizes automatically.
3. Show an unfamiliar ratio and explain a visible preservation/composition decision.
4. If implemented and validated, preview one shared correction, preserve a format-specific exception, and edit the result natively in Express.
5. Show one honest limitation and recovery path, followed by measured general benchmark evidence.

Possible pitch: **“One approved design. Every required size. Fewer repeated corrections.”** Treat the final sentence as a product hypothesis until measured. The story explains why the capability matters; the evidence establishes what it actually does.

## 4. Stronger evaluation plan

The existing #7 corpus issue is a first step. The team plan's larger 50-design/eight-size goal is stronger than the initial six-family issue. Increase coverage in stages; all corpus requirements are general and independent of the presentation story.

- Split by entire design family and source before tuning.
- Include posters, product grids, sparse branding, image-led designs, text-heavy schedules, multilingual examples and awkward aspect ratios.
- Add no-group and misleading-group inputs, transparent layers, protected logos/QRs, missing assets and infeasible combinations.
- Report each difficulty category and the worst cases, not just totals.
- Compare uniform scaling, a competent group-aware method, and the best current engine.
- For product claims, also compare the current Express workflow on the same supported input.
- Keep automated stage-one output untouched by human correction.
- Run blind/randomized human review using the visible rubric dimensions.
- If permitted and useful, add a separate local visual judge with a fixed rubric. Track disagreement with humans; do not optimize solely for that judge.
- Isolate candidate generation from selection: if a good candidate exists but loses, fix ranking; if no candidate is good, fix generation.
- Remove one component at a time to establish whether it helps on held-out families.
- Use a fresh final holdout after development reviewers have seen earlier failures.

Express already supports multiple differently sized pages and page management; the comparison UI alone is weak differentiation. Measure improvement in accepted outputs and correction effort. [Express multi-page workflow](https://helpx.adobe.com/express/web/arrange-layers-and-pages/add-pages.html)

Suggested internal gates, not Adobe's thresholds: all supported-input preservation tests pass, no silent invisible-content failure, clean-machine offline run completes within the released budget, and an independent review shows consistent benefit with remaining failure categories disclosed.

## 5. Priority and ownership changes

| Order | Deliverable | Owner | GitHub tasks |
| --- | --- | --- | --- |
| 1 | Complete validation and fix mixed-role grouping | JD, review by Junho | [#2](https://github.com/ojedaJD/reflow-studio/issues/2), [#5](https://github.com/ojedaJD/reflow-studio/issues/5) |
| 2 | Visibility/contrast and stronger layering checks | Junho, review by JD | [#3](https://github.com/ojedaJD/reflow-studio/issues/3), [#6](https://github.com/ojedaJD/reflow-studio/issues/6) |
| 3 | End-to-end native editable round trip | Krush | [#4](https://github.com/ojedaJD/reflow-studio/issues/4) |
| 4 | Source-aware ranking and nearby-size stability | JD | [#5](https://github.com/ojedaJD/reflow-studio/issues/5), [#12](https://github.com/ojedaJD/reflow-studio/issues/12) |
| 5 | Independent evaluation and error taxonomy | Krush; all review | [#7](https://github.com/ojedaJD/reflow-studio/issues/7) |
| 6 | Bounded runtime, offline container, PR checks, inspectable findings | JD with Junho | [#8](https://github.com/ojedaJD/reflow-studio/issues/8), [#9](https://github.com/ojedaJD/reflow-studio/issues/9), [#13](https://github.com/ojedaJD/reflow-studio/issues/13) |
| 7 | General creator validation and demo rehearsal | Krush; all rehearse | [#10](https://github.com/ojedaJD/reflow-studio/issues/10); narrative context only |
| Later | Campaign persistence, preview/apply/undo and exceptions | Shared interface led by JD; UI Junho; host Krush | [#14](https://github.com/ojedaJD/reflow-studio/issues/14), after host, creator, and engine-quality evidence |

Do not assign every new task to Krush. Integration and independent evaluation are already large responsibilities; JD owns submission/CI, and Junho owns rendering evidence.

The original nine task bodies now include the review's acceptance requirements. Three follow-up issues track nearby-size stability (#12), meaningful CI regression gates (#13), and durable campaign state (#14). Bounded execution stays in #8 and native round-trip recovery in #4. The [pinned roadmap](https://github.com/ojedaJD/reflow-studio/issues/11) coordinates the work. All findings remain open until implementation and before/after evidence satisfy their acceptance checks.

Start CI scaffolding alongside preservation fixes, and native-host discovery alongside engine development. The order above expresses dependencies and risk, not a requirement to serialize all three teammates. Campaign-state implementation is later product work outside the initial milestone.

## 6. Competition and delivery gates

The FAQ restricts eligible institutions and majors, requires registration by October 4, gives October 30 as submission close, and requires at least two teammates available for the January 11–13 finale to place. Verify every member's exact program; if it is called CS/CSE rather than a listed major, obtain an organizer decision rather than assuming equivalence. [Official FAQ](https://acrobat.adobe.com/link/spaces/urn:aaid:sc:US:175235eb-5b56-41fe-ba3e-9b6233979f9b)

The materials also need clarification on:

- Whether and how preparation code created before October 5 can be submitted.
- The final schema, allowed changes, supported fonts/assets, model list, resource budget and transport.
- Finale code changes: the technical brief discusses further development, while the FAQ refers to submitted code.
- Finalist notice: the event page says November 20; the current PDF says November 23. This does not change the shared October 30 submission date.

Assign an owner to record authoritative answers and exact submission instructions. No outreach has been sent as part of this review.

Before release: have a teammate follow the README on a clean machine, run without network, import output into Express, and reproduce the demonstration. Freeze early enough to repair integration failures. Keep a clearly labeled recording as a backup, not a substitute for a working live demo.

For questions from judges, every teammate should be able to explain the contract, candidate choice, typography, why the baseline loses, known failures, and what was actually measured.

## What to defer

Do not spend the next cycle on a generic chatbot, external generation API, screenshot reconstruction, many output formats, or decorative dashboard polish. Add them only if the observed workflow, allowed runtime, and independent evidence justify the cost.

The strongest entry is a reliable automatic result, a credible explanation of why it works, and one visible creator workflow that the team can defend.
