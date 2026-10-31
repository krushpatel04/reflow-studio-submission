# Reflow Studio: evidence-based route to a competitive submission

Research date: September 15, 2026, America/New_York. [Research plan](plans/competitive-research.md).

## Assessment

**Keep the project direction. The current prototype does not yet establish a top-three capability.** Reflow addresses the assigned problem directly, but its evidence still covers a small, authored corpus and a narrow set of arrangements. Competitors' current engines, hidden inputs, and final scores are unavailable, so a ranking prediction or win probability would be invented.

The strongest proposed claim is:

> Reflow adapts a finished design across difficult formats while preserving its content, relationships, and visual character—and demonstrates how much manual cleanup remains.

That is a testable engineering claim, not a claim that automatic resizing is new. A second, later product hypothesis is that a creator can apply one relationship correction across variants, preview the effects, and retain an exception for a particular format.

The highest-value new work is broader independent evaluation, typography-aware composition search, rendered visibility checks, and proof that the official renderer and native viewer agree with our expectations. A language rewrite, chatbot, or larger feature list has no demonstrated advantage yet.

## 1. What the official documents actually say

The [official Adobe event hub](https://acrobat.adobe.com/link/spaces/urn:aaid:sc:US:175235eb-5b56-41fe-ba3e-9b6233979f9b) was opened in the browser. Its source documents, rather than its generated AI summary, were read using the PDF accessibility text:

- **Chameleon Challenge External v3.pdf**: cover says North America Pilot, challenge overview version 1.1; relevant sections 2–6, pages 4–9.
- **Hackathon FAQ v2.pdf**: four pages, including deadlines and finale requirements.

Verified distinctions:

| Topic | Verified requirement or emphasis |
| --- | --- |
| Qualification | Automated scoring of hidden designs selects three finalists. |
| Execution | Offline engine in a standard container, on the team's own machine. Local models are contemplated, subject to a permitted list and size limit. |
| Viewer | A basic Express add-on is required and unscored in round one. |
| Highest rubric emphasis | Genuine rearrangement, clean composition, readable text. |
| Other rubric emphasis | Faithfulness and consistency: medium. Speed/reliability: supporting. |
| Difficult cases | Grouping, intentional overlaps, transparency, awkward content, extreme sizes. |
| Scoring | Adobe renders returned structure and applies its AI evaluator and written rubric. |

**Our implication:** prioritize robust automatic output to qualify; use product polish to strengthen the finale. Treat speed as necessary operating capacity and a way to search better layouts, rather than the main differentiator.

### Release and policy questions to resolve

The FAQ gives October 4 registration, October 5 challenge release, October 30 submission, November 23 finalist notification, and January 11–13, 2027 finale dates. At least two teammates must attend to place. Verify updates in the [same official hub](https://acrobat.adobe.com/link/spaces/urn:aaid:sc:US:175235eb-5b56-41fe-ba3e-9b6233979f9b).

The retrieved materials leave exact schemas, execution budgets and model allowances unresolved. There is also a wording conflict: the brief anticipates continued development for the finale, while the FAQ refers to submitted code. Ask the campus contact/organizers about pre-release code reuse, post-freeze changes, allowed dependencies/models, authoritative limits, and full eligibility. This is a request for clarification, not a finding that our preparation is prohibited. No organizer was contacted during this research.

## 2. Existing products raise the bar

| Existing capability | Evidence | Consequence for Reflow |
| --- | --- | --- |
| Adobe Express changes dimensions, duplicates/resizes, and offers variations. | [Resize guide, updated March 13, 2026](https://helpx.adobe.com/express/web/arrange-layers-and-pages/change-page-size.html) | Multiple sizes and candidate selection alone are weak differentiators. Compare the actual native outputs. |
| Express AI Assistant can improve spacing, alignment, and layout within its documented beta workflow. | [Fix design layouts, updated July 16, 2026](https://helpx.adobe.com/express/web/ai-assistant/fix-designs-ai-assistant.html) | A generic “fix my layout” chat feature is already adjacent to native functionality. Its beta scope does not establish support for every existing document. |
| Express displays social safe-zone guides. | [Safe zones, updated December 2, 2025](https://helpx.adobe.com/express/web/publish-and-share/share-to-social-media/optimize-your-design-for-social-media-using-social-safezones.html) | A safe-zone overlay is useful but already exists. Automatic constraint handling would need separate proof. |
| Canva advertises multi-channel resize and translation. | [Canva Magic Resize / Magic Switch](https://www.canva.com/pro/magic-resize/) | Avoid broad novelty claims about creating a campaign from one design. |

These sources establish feature availability, not quality on our test cases. Adobe's public materials also use inconsistent wording around bulk resizing: the current [resize help page](https://helpx.adobe.com/express/web/arrange-layers-and-pages/change-page-size.html) says batch resizing multiple pages is unsupported, whereas [older product announcements](https://blog.adobe.com/en/publish/2024/10/14/announcing-new-features-adobe-express-creativity-multiplier-creative-professionals) describe multi-channel resizing. Different workflows may explain the difference. Verify behavior in the actual account before making competitive claims.

**Our product hypothesis:** fewer broken relationships, less manual repair, clearer explanations, and useful correction transfer across variants. Public documentation does not prove that competitors lack these capabilities. A native walkthrough and controlled comparison must establish the specific gap.

## 3. What comparable winners teach us

These are different competitions, not past winners of this exact Chameleon pilot.

| Project | Verified result and relevant evidence | What to adopt |
| --- | --- | --- |
| [Think Post](https://devpost.com/software/think-post) | Enterprise Efficiency winner, January 2026 NSUT event; describes generating editable platform-specific designs from one input. | A recognizable task, short route from input to useful output, and a focused demonstration. Reflow must distinguish adapting a particular existing design from generating a new platform-specific template. |
| [StyleSnatch](https://devpost.com/software/stylesnatch) | Most Valuable to Express Users, 2025. Its author describes a family-store motivation and a prototype that generated code for the Playground; complete integration remained future work. | A truthful personal story and visible editability. Do not mistake a successful concept-stage entry for the engineering standard of an automated evaluation. |
| [Side Note, Adobe winner account](https://blog.developer.adobe.com/en/publish/2025/08/meet-the-winners-of-the-first-adobe-express-add-ons-hackathon) | Best Integration or Workflow Hack. Judges highlighted polish, usability, and fit with creators' work. | Make the add-on understandable and useful inside Express. |
| [Checkpoint](https://devpost.com/software/adobe-checkpoint) | [Second overall at SCU](https://blog.developer.adobe.com/en/publish/2025/08/inside-ai-collaborate-s-24-hour-adobe-express-add-on-hackathon); its submission describes deliberate snapshots and visual comparisons. Restoration was still a planned extension. | Let users understand changes and retain control. Do not attribute unbuilt features to the winning prototype. |

Adobe's [2026 event retrospective](https://blog.developer.adobe.com/en/publish/2026/02/inside-the-24-hour-adobe-express-add-ons-for-enterprise-hackathon) emphasizes focused user problems, workflow fit, and clear pitches. These observations support our finale strategy; they do not show how to rank in Chameleon's hidden evaluation.

Krush's family story can explain why repetitive adaptation matters. Keep it to presentation context. Do not claim shop usage, money saved, measured time savings, printing support, or vectorization unless separately established.

## 4. Research findings worth translating into engineering

The following are research results or author descriptions, not benchmarks of Reflow. Our proposed adaptations are explicitly our deductions.

| Primary source | Relevant finding | Practical deduction for this team |
| --- | --- | --- |
| [Learning Layouts for Single-Page Graphic Designs, TVCG 2014](https://www.dgp.toronto.edu/~donovan/layout/) | Models importance, alignment, and hierarchical segmentation; demonstrates retargeting through optimization. | Use source relationships and hierarchy explicitly. Neither optimization nor a relationship graph is itself a novel contribution. |
| [LayoutPrompter, NeurIPS 2023](https://papers.nips.cc/paper_files/paper/2023/hash/88a129e44f25a571ae8b838057c46855-Abstract-Conference.html) | Combines structured representations, relevant examples, and candidate ranking. | A bounded set of materially different arrangements is a defensible design; adding an LLM is optional and must beat a competent baseline. |
| [RALF, CVPR 2024](https://arxiv.org/abs/2311.13602) and [author implementation](https://github.com/CyberAgentAILab/RALF) | Retrieval of relevant examples improves content-aware layout generation in the authors' experiments. | Consider generic composition families as search seeds. Any retrieved examples must remain separated from test families. A trained research model is not automatically a compatible reflow engine. |
| [Design-o-meter, WACV 2025](https://research.adobe.com/publication/design-o-meter-towards-evaluating-and-refining-graphic-designs/) | Couples design scoring and refinement. | Add targeted local repair, then measure its independent benefit. “Generate, critique, repair” is already established work. |
| [Agentic-DRS, Adobe Research, May 2026](https://research.adobe.com/news/agentic-design-review-system-teaching-ai-to-review-graphic-designs-the-way-experts-do/) | Reviews multiple dimensions and uses structured, graph-based design context. | Evaluate typography, composition, grouping, and visual defects separately. Multiple agents are not required to implement those checks. |
| [DesignAsCode, February 2026 preprint](https://arxiv.org/abs/2602.17690) | Uses semantic structure and rendered feedback in an editable code representation, including retargeting examples. | Inspect rendered candidates, not only boxes. HTML/CSS editability is not an Adobe document round trip. |
| [Graphic-Design-Bench, April 2026 preprint](https://arxiv.org/html/2604.04192v2) | Tests structured design tasks and reports divergent text, asset-preservation, and preference results on a small multi-aspect-ratio set. | Keep correctness, visual quality, and editability as separate measurements; a single aesthetic score can conceal failure. Its adaptation subset is small and uses image outputs, so it does not establish how our structured engine would rank. |
| [AesEval-Bench, 2026 paper](https://arxiv.org/abs/2603.01083) and [author code](https://github.com/arctanxarc/AesEval-Bench) | Separates judging a defect, choosing its region, and locating it precisely; covers layout, type, graphics, and color. | A useful diagnostic should identify the affected element and support a repair, not just say a design scored poorly. |
| [PosterReward, authors' 2026 release](https://github.com/MeiGen-AI/PosterReward) | Provides poster-specific reward models, including pointwise and pairwise variants; the released family uses Qwen3-VL-8B. | It is a possible development-time comparison tool after checking permissions, hardware, and license. It is not a drop-in official judge; do not make the submitted engine depend on it without eligibility and latency evidence. |

### A concrete corpus opportunity

The [LICA dataset](https://github.com/purvanshi/lica-dataset) contains structured layout specifications, source/render metadata, and template-family organization. Its repository states CC BY 4.0. [LICA's benchmark repository](https://github.com/purvanshi/lica-bench) supplies task-specific evaluation data. This is a more relevant starting point than collecting only screenshots.

**Proposed spike for Krush:** inspect ten static examples and their asset/font requirements, retain attribution, and measure whether conversion preserves the original appearance. Report unsupported fields rather than silently flattening or dropping them. Split by template family. Do not assume the entire collection fits our schema, that all external assets are available, or that adapting this dataset recreates Adobe's hidden benchmark. Independent designs supplied by creators remain valuable.

## 5. Current readiness and new gaps

Repository baseline inspected: `920f6fc2928e048d63c92688c8614c7076aa8971`. During research, source-aware ranking files were actively changing; they are **in progress**, not credited as completed or re-tested here. See [current status](progress.md), [contract](design-contract.md), and [ranking plan](plans/source-aware-ranking.md).

### What is established

- Provisional structured input, preservation checks, offline local operation after dependency installation, and editable JSON output.
- A repaired mixed-role group case, with visible glyph evidence in browser/native output.
- Last completed documented suite: 134 tests; 30 synthetic native cases and ten browser checks.
- Ten authored sources across three formats; six selected readability warnings remain in the archived benchmark. The selector and benchmark share diagnostics, so their agreement is not independent quality evidence.

### What should receive additional attention

1. **Group membership and group geometry are different constraints.** The current evaluator requires all members of an explicit group to share one uniform rectangle transform. This correctly protects a badge and backing plate, but may prohibit a useful product-card rearrangement from image-beside-price to image-above-price. Introduce separate rigid and flow-capable relationships only after contract/owner coordination. Preserve membership, copy, and style; retain strict logo/badge tests. Until semantics are established, retain the conservative behavior rather than loosening every group.
2. **Input coverage may cap the score before layout quality matters.** The prototype accepts at most 100 elements, 100 flat groups, and limited paints/types. Those are our choices. Map every released field and limit to supported, faithfully adapted, or explicitly unsupported behavior. Report the unsupported share of the corpus. Do not remove bounds blindly or pretend that “arbitrary” means infinite resources.
3. **Font fitting cannot compensate for poor space allocation.** A tiny font may be a consequence of a bad column split. Search widths and group arrangement before repeatedly shrinking type. Preserve headline/body hierarchy, original copy, intentional paragraph breaks, and protected font styles.
4. **A geometrically valid box can contain invisible content.** Check rendered glyph visibility, contrast against the composited background, cropping, and opaque coverage. Source overlap alone is insufficient proof that the output overlap remains visually safe. Avoid rejecting legitimate overlays or transparency.
5. **Source stability can become excessive conservatism.** Ongoing #12 work should retain healthy nearby layouts and still permit substantial rearrangement when the new shape needs it. Test both directions; preserving a tiny letterboxed original everywhere would underserve the challenge.
6. **Pixel bounds and crop intent need real image information.** Current focal alignment is coarse, and frame-aspect change is a proxy. Measure visible source regions with actual image dimensions before claiming subject retention. A subject detector is an optional later experiment if allowed; it is not required to improve crop geometry.
7. **Input failures and operational failures count too.** Include parse/asset/font failures, cold starts, timeouts, and memory limits in evaluation. The recorded 28-second dense case is an old single measurement, not typical latency. A graceful fallback still needs visible quality diagnostics.
8. **The native integration remains unproved.** A JSON export or SVG preview does not show that text, grouping, and crops survive in Express. Adobe documents a restricted [document sandbox](https://developer.adobe.com/express/add-ons/docs/references/document-sandbox/), and its [resize API guide](https://developer.adobe.com/express/add-ons/docs/guides/learn/how-to/resize-elements) labels the API experimental and warns about media behavior. Record a real read → transform → apply → edit → reopen/undo experiment, including supported APIs and unsupported nodes.

## 6. Priority order and acceptance evidence

Effort labels below are relative planning estimates, not delivery promises. These are proposed extensions to existing issues, not newly assigned GitHub issues or claims that the work has been completed.

| Priority | Work | Proposed owner / existing issue | Acceptance, designed before implementation | Effort |
| --- | --- | --- | --- | --- |
| P0 | Official contract, model/runtime rules, minimum native viewer | Krush #4, JD #8 | A support matrix; valid released samples round-trip without silent losses; clean offline container run; demonstrated native editability. | Medium; depends on release |
| P0 | Independent corpus and strong comparisons | Krush #7; all review | Frozen template-family splits; unsupported cases counted; blind comparisons against multiple baselines; failures retained. | Medium |
| P1 | Text-aware arrangements and local repair | JD #5 + Junho #3 | Failing cases where reallocation beats font shrink; grids, variable splits, anchored layouts; fewer independently verified defects within a measured search budget. | Large |
| P1 | Visibility, contrast, crop and transparency checks | Junho #6 | Isolated injected defects fail; intentional overlays pass; actual pixels and host rendering support the findings. | Medium–large |
| P1 | Source-aware stability without freezing the layout | JD #12, already underway | Nearby sweeps preserve healthy sources; large-change positive controls recompose; transitions and tradeoffs disclosed. | Medium |
| P1 | Distinguish rigid groups from reflowable relations | JD + Junho #5 | Badge/logo protection remains; product/price relations can reflow when explicitly allowed; ambiguous inference cannot silently corrupt groups. | Medium–large |
| P1 | Bounded runtime and reproducible verification | JD #8/#13 | Stage timings, operation/candidate budgets, interruption/fallback tests, clean-machine run, tests on pushes to main. | Medium |
| P2 | Shared correction preview and per-format exception | JD/Junho/Krush #14 | One relationship re-solves for each shape; exception survives regeneration; undo/reopen and user-task evidence. | Large; finale-oriented |
| P2 | Short, honest demonstration and user cleanup study | Krush #10; all | Editable output shown live; unfamiliar input; actual cleanup time/actions recorded; personal story and measured claims kept separate. | Small–medium |

### Engine approach to test next

Use a staged search:

1. Validate and establish protected content and relationships.
2. Generate a small, diverse set of arrangements conditioned on the content: source-preserving adjustment, anchored hero/text, variable splits, group grids, and stacks.
3. Allocate widths and heights using typography measurements; fit text without modifying original copy.
4. Reject hard failures cheaply before rendering.
5. Render the best surviving alternatives, localize specific defects, and attempt a bounded repair.
6. Select a completed result, preserving a fallback and exposing unresolved findings internally.

A repair should respond to an observed problem: widen a text cell, change columns, move an overlapping group, or adjust permitted image geometry. Cache repeated measurements and skip duplicate candidates. Spend extra search on difficult inputs after profiling. No fixture IDs or exact target-size rules should determine the solution.

**Separate generation failures from selection failures.** On development cases, have reviewers inspect all candidate outputs without seeing the engine's ranking. If a good candidate exists but loses, improve selection. If every candidate is poor, add a better arrangement or repair; tuning ranking weights cannot recover a layout that was never generated. Keep this human-assisted diagnostic separate from automatic evaluation results. If every candidate violates a hard constraint, record that explicitly rather than describing the least-bad candidate as valid.

**Test-first slices:** each new candidate family needs a case the existing engine fails, a valid source it must not damage, extreme-size boundaries, preservation tests, and independent rendered checks. Remove each proposed component in turn—an ablation—to establish whether its gain justifies its cost. This is an implementation proposal, not a proven solver.

## 7. Build evidence strong enough to change our confidence

### Corpus and comparison protocol

Start with 20 independently sourced supported designs across at least six families. Assign whole families to development or a sealed evaluation set before tuning; grow toward 50 sources and eight sizes if conversion and review capacity permit. These are internal targets, not Adobe requirements.

Cover near-identity, square-to-wide, portrait-to-square, narrow story, dense copy, sparse composition, product grids, intentional overlays, semi-transparent backing, edge-subject photos, long words, and supported non-ASCII text. Separate unsupported scripts from successfully rendered ones; preserving Unicode strings does not establish correct shaping.

Compare:

1. Uniform scaling as a diagnostic baseline.
2. A competent group-aware heuristic with real text fitting.
3. Reflow's current and proposed versions under the same budget.
4. Native Express resize on a faithfully recreated subset; optionally Canva for product context.
5. An allowed local-model baseline only if model, hardware, and licensing requirements can be met.

Use equivalent source content, fonts, dimensions and assets where possible. Record unavoidable conversion differences. A hosted product is a UX/output comparison, not an offline eligibility-equivalent submission. Define before testing whether native variation selection is first-output, best of equal candidate count, or human-assisted, and report that condition.

### Keep measurements separate

| Measurement | What to record |
| --- | --- |
| Coverage | Supported / faithfully adapted / unsupported inputs, with reasons and total denominator. |
| Preservation | Copy, asset inventory, IDs, groups, protected styles; also visible content, not merely serialized presence. |
| Typography | Actual clipping, wrapping, font substitution, hierarchy, legibility at intended viewing size. |
| Composition | Alignment, spacing, important associations, intentional overlap, visual balance and source identity. |
| Robustness | Failures by family and difficulty; worst cases; nearby-size transitions; determinism. |
| Operations | Cold and warm runs; load, parse, layout, render and export time; peak memory; timeouts. |
| Human usefulness | Blind preference with a tie option; time and actions to reach an acceptable editable result. |

For blind review, show the source and target dimensions, randomize output order, and hide system labels. Ask separately about faithfulness, readability and overall preference. Include several creators and reviewers outside the implementation team. Report sample sizes and disagreement; variants from one source are correlated, so estimate uncertainty by source/family rather than treating every image as independent. Do not tune repeatedly on the sealed set and keep calling it held out.

A development-time visual model can help triage failures, but do not let it replace human checks or become both the sole selector and proof of quality. The [2026 aesthetics benchmark](https://arxiv.org/abs/2603.01083) is a useful reminder that judging and localizing design defects remain difficult.

### Proposed internal release gates

- No dropped or changed protected content in supported-input tests.
- All seeded severe visibility defects detected, with positive controls for legitimate design choices.
- Useful rearrangement on difficult shapes and healthy stability near the source.
- Measurable advantage over the stronger baseline on the sealed corpus; inspect the loss cases, not only the average.
- Blind preference and cleanup measurements support the stated benefit; inconclusive results are reported as inconclusive.
- Cold/offline execution fits the released budget with measured margin, including bad inputs and cancellation.
- Required native viewer works, and a clean checkout can reproduce the submitted results.

These gates improve our evidence. They cannot guarantee a top-three rank against unseen competitors.

## 8. What would make the finale memorable

Build one coherent demonstration around **“same design, difficult new shape, less repair.”**

An illustrative three-minute sequence, adapted to the actual presentation limit:

- 0:00–0:20: Krush explains that one approved artwork needs several differently proportioned versions. Use the family context only to make that task recognizable.
- 0:20–0:55: Open a structured source with long copy, a photo, and a product/price or date/CTA relationship. Show the baseline's actual failure.
- 0:55–1:35: Run Reflow across very different sizes. Inspect typography and a grouped relationship, then edit real text in Express.
- 1:35–2:10: If implemented and validated, correct one relationship across variants, preview the changes, keep one exception, and undo. Otherwise show the strongest completed capability.
- 2:10–2:40: Run an unfamiliar design or judge-chosen size; show honest warnings if a case remains difficult.
- 2:40–3:00: Show a small evidence card: evaluated source count, comparison condition, measured repair time, runtime, remaining failure rate.

Prefer evidence-linked explanations such as “the price remains with this product” over decorative confidence percentages. A confidence score would need calibration. Keep a local demo backup and rehearsed reset path, without presenting a recording as a live run.

For “correct once,” transfer the relationship—not identical pixel offsets. Store element correspondence, rule version, scope, exception and edit provenance; demonstrate that applying or undoing a rule does not overwrite a later manual edit. This is an optional product extension, not a dependency of automatic qualification.

## 9. What to defer and when to reconsider

- **Full Rust rewrite:** reconsider only after profiling identifies CPU work that a small port measurably accelerates. Layout quality, typography, and coverage currently have clearer gaps.
- **Generic chat or many agents:** native tools and research already cover broad design assistance; a particular measured benefit must justify the complexity.
- **Image-to-layer extraction, vectorization and shop production:** outside the structured-input challenge and current team scope.
- **Generative rewriting or image replacement:** do not weaken current preservation guarantees. Any future creative finale mode needs explicit permission and a separate contract; the brief's examples do not define universal stage-one permission.
- **Large learned aesthetic model:** use only after verifying permitted model/size, measured improvement, local runtime and asset/license requirements.
- **More format buttons or safe-zone overlays as the headline:** these are existing capabilities; prioritize automatic composition and retained meaning.

Suggested effort allocation before qualification: roughly 60% engine/typography quality, 25% independent evaluation and runtime verification, 15% minimum integration and presentation discovery. This is our planning recommendation; change it when actual integration risk or the released packet warrants it.

## 10. Next three concrete moves

1. **Krush:** verify the official contract and smallest editable native round trip; freeze the first independent corpus and collect native-resize comparisons.
2. **Junho:** establish font/visibility ground truth with dense text, transparent backing, and crop examples; provide measurement constraints for candidate generation.
3. **JD:** finish the existing stability work, then use those measurements to add content-aware arrangements and bounded repair. Coordinate group semantics before changing the shared contract.

Every slice follows the repository's problem/risk plan → failing behavioral test → minimal fix → rendered and independent validation workflow. The useful question is whether each change reduces failures or cleanup on unseen designs under the allowed runtime.

## Research and handoff limitations

- Directly read official brief/FAQ text through the browser; search alone could not retrieve the PDF Space. No AI-generated hub answer was used as rules evidence.
- Product help, original project submissions, author repositories and papers were reviewed. Research scores and winner claims were not independently reproduced.
- No competing current Chameleon submissions or authoritative leaderboard were available. Public searches are not proof that none exist.
- No native product head-to-head, user study, model benchmark, or engine test was performed in this documentation task. Reported repository test results are dated evidence from completed work.
- Source-aware ranking is concurrent work and is not modified by this report. Suggestions involving shared interfaces require the listed owners to coordinate.
- Browser skill was consulted for source retrieval; its CLI was unavailable, so the connected browser was used. Existing research and development checklists cover the repeatable process adequately; no new reusable skill was created.

**Decision:** continue Reflow, strengthen its automatic quality and the evidence behind it, and reserve the most ambitious campaign interactions for a validated finale workflow. The concept fits; superior execution remains to be demonstrated.
