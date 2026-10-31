# Quality on unfamiliar designs and the role of ML

> **Current navigation — October 8:** The [repository audit](repository-audit-2026-10-08.md) records delivered Python work and remaining evidence gaps. The [Tuesday work queue](execution/2026-10-13/README.md) controls this run and reserved collaborator ownership. Older dated source/migration/pause statements below are historical; Adobe remains authoritative.


Decision: **plan and prepare the experiment now; adopt a model only after independent evidence.** This is a roadmap, not an implemented ML capability. The engine currently uses deterministic layout rules and fixed ranking weights. See the [implementation plan](plans/quality-ml-roadmap.md), [progress](progress.md), and [team roadmap](https://github.com/ojedaJD/reflow-studio/issues/11).

## Why now

We need to learn whether unfamiliar designs look good after reflow. Preservation checks, 178 recorded tests, and improved runtime strengthen delivery, but do not answer that question. The [source-ranking study](evidence/2026-09-16-source-ranking/README.md) records 18 uniform selections in 30 outputs and readability warnings increasing from 6 to 11. Uniform output can be correct for nearby sizes or deliberate whitespace; its frequency alone is neither a defect nor success. Inspect whether substantial format changes receive an appropriate composition.

The official brief allows local models and specifies an AI evaluator; it does not require a trained submission. The model list, size limits, runtime and official document contract still need verification through #4/#8. Keep production execution independent of external model/API calls. [Adobe brief, sections 2.1 and 3–5](https://acrobat.adobe.com/link/spaces/urn:aaid:sc:US:175235eb-5b56-41fe-ba3e-9b6233979f9b)

Research supports investigating generation and ranking separately: [LayoutPrompter](https://papers.nips.cc/paper_files/paper/2023/hash/88a129e44f25a571ae8b838057c46855-Abstract-Conference.html) combines layout generation with ranking, while Adobe's [Design-o-meter](https://research.adobe.com/publication/design-o-meter-towards-evaluating-and-refining-graphic-designs/) studies learned evaluation and refinement. These are precedents, not evidence that a model will improve Reflow or satisfy the challenge constraints.

## 1. Establish independent evidence first — Krush, #7

### Corpus and split

- Preserve #7's initial target of at least 20 independently sourced designs across six or more families, with at least three families sealed. This is a pipeline pilot, not strong evidence of generalization. Assign remaining families to development and validation before tuning.
- Expand toward 50 sources across eight target sizes. For an adoption decision, aim for at least ten untouched test families plus separate development/training and validation families. These are team planning targets, not Adobe requirements or a guarantee of statistical power; expand if uncertainty remains large.
- A family includes template derivatives, shared compositions, alternate copy/colors, and all resized versions of a source. Keep the entire family in one split. Check source hashes and inspect near-duplicate templates before freezing the manifest.
- Record source/family ID, provenance/permission, asset and font hashes, supported/adapted/unsupported features, target dimensions, split, and import/render version. Verify source conversion visually before assessing reflow. Count unsupported imports and execution failures against all attempted inputs rather than reporting only successes.
- Freeze targets and family assignments before comparisons. Include nearby, square, portrait, wide and extreme targets; dense copy, grids, deliberate whitespace, absent/misleading groups, layering/transparency, edge subjects, and supported scripts. Preserve the existing authored fixtures as development regressions.
- Development examples/labels may train a small ranker or supply retrieval examples. Validation may select prompts, weights, thresholds, or model versions. Test inputs/labels must never enter these steps. When test failures inform a fix, retire those families to development and acquire a fresh final holdout; retain the old results as development evidence.

### Blind review

Generate an immutable review bundle showing the original and two outputs at matched display scales, with readable zoom. Hide method names, internal scores and filenames; seed/counterbalance left-right order and retain a separate decoding key. Keep engine outputs untouched. Identify whether each image uses our interim renderer or Adobe's verified renderer.

Use at least two reviewers outside the implementation team where possible, including one with design experience. Team-only review is exploratory. Record reviewer IDs, A/B/tie/**neither acceptable**, individual votes, readability, hierarchy, faithfulness, spacing, crop/visibility defects, and reasons for the worst cases. Include duplicate/reversed controls to assess consistency; retain disagreement rather than converting it into an invented consensus.

Measure two outcomes separately:

1. **Automatic quality:** preference and acceptability of untouched outputs, with geometry/preservation, rendered defects, and all failures reported separately.
2. **Manual cleanup:** time/actions to an acceptable editable result on a preselected subset. This requires a real editing path; do not substitute JSON export for native integration.

Run all automated cases. If human review capacity is smaller, freeze a stratified subset of source families/targets before seeing results and report exactly what was reviewed. All methods receive the same inputs, assets, fonts, hardware conditions and declared execution budget.

### Baselines and reporting

Freeze commit/configuration hashes for uniform scaling, the strongest current deterministic Reflow, and any separately implemented competent group-aware text-fitting baseline. Include native Express when #4 provides a fair matched comparison. Compare a proposed model with the **strongest eligible baseline chosen on validation**, not only uniform scaling.

Report per-family and per-category wins, ties, neither-acceptable rates, defects, unsupported inputs, cold/warm latency, memory, timeouts and fallback frequency. Resizes of one family are correlated: aggregate within families and estimate uncertainty by resampling whole families, not individual images or reviewer votes. A small corpus remains a pilot even if it produces many resized images.

## 2. Diagnose the actual bottleneck — JD + Krush, #5/#7/#12

On development/validation families, show reviewers **all** candidates as an additional diagnostic:

| Observation | Next action |
| --- | --- |
| A suitable candidate exists, but the selector misses it | Test ranking changes, including a small learned ranker or a permitted local visual model |
| No candidate is acceptable | Improve generation: typography-aware widths, product grids, flexible columns and anchored compositions before investing in ranking |
| Geometry is legal but text or imagery is visually damaged | Improve rendered visibility, contrast, crop and font checks with Junho (#3/#6) |
| Output is good but execution/import fails | Resolve #8/#4 delivery and compatibility gaps |

This human best-of-candidates result is an analysis tool, never the submitted engine's score or a hidden human correction step. A classifier cannot select a design we never generate.

JD and Junho should coordinate rigid badge/logo groups versus explicitly reflowable product relationships before changing the shared schema. Keep valid overlapping artwork and healthy sparse designs as positive controls. Measure whether space reallocation solves tiny text before further font shrinking. Prioritize failures observed on development/validation families over increasing the number of templates indiscriminately.

## 3. Where ML would fit — a bounded Krush/Junho-owned experiment

Krush owns data/labels, family splits, model eligibility, blinded evaluation, analysis and the keep/stop report. Junho owns the optional local ranker adapter, inference or fitting implementation, rendered features, and test-first fallback/runtime validation. Both are assigned to #19. JD continues the deterministic engine and coordinates the candidate interface with them.

The [September 16 research handoff](research/2026-09-16-ml-gap-analysis.md) decomposes #19 into [#20 preference data](https://github.com/ojedaJD/reflow-studio/issues/20), [#21 ranker/adapter](https://github.com/ojedaJD/reflow-studio/issues/21), and [#22 pretrained-scorer qualification](https://github.com/ojedaJD/reflow-studio/issues/22). These share the existing experiment budget and adoption gates; a research candidate is not an adopted model.

### First insertion point: candidate ranking

Keep input validation, candidate construction, real font fitting, preservation checks and editable output deterministic. The first experiment ranks **the same frozen candidates** as the baseline, making its incremental value measurable. It cannot change text, assets, IDs, paint order, group membership or brand styles.

Two possible implementations, chosen after the diagnosis and rules check:

- **Small learned ranker:** fit preferences from independent development-family labels using interpretable layout/rendered features. Validate on different families. Training against our existing heuristic scores would mainly imitate that heuristic and is not independent evidence of quality.
- **Permitted pretrained local visual model:** give it the source and rendered candidates with a fixed rubric and constrained candidate-ID output. First evaluate without fine-tuning. Record exact weights/hash, license, provenance, prompt, preprocessing, runtime, hardware and decoding settings. Using a pretrained model is ML inference, even if we train nothing ourselves.

Do not commit to a model name or download weights until its challenge eligibility, license and hardware footprint are checked. Dataset-family separation cannot prove that a pretrained model never saw public designs; disclose that limitation and include newly authored, independently supplied holdouts when available.

### Proposed boundary and fallback

This is a design proposal only; no shared interface changes are authorized by the document itself. Coordinate JD/Junho/Krush before implementation.

1. Give the ranker read-only source/candidate information and a bounded set of candidate IDs. An image or text instruction embedded in a design is design content, not an instruction to the ranker.
2. Only candidates passing the implemented hard checks are eligible. Those checks do not certify every visual defect; rendered and human checks remain separate.
3. Validate the returned ID/schema and preserve deterministic tie-breaking. Never accept unrequested geometry/content edits from a ranker.
4. If the model is absent, invalid, out of time, or outside a validation-calibrated confidence margin, choose the existing deterministic **valid** fallback and log the reason. A model's self-reported confidence is not calibrated evidence.
5. If there are no valid candidates, return/retain an explicit failure and diagnostics according to the coordinated API; never label a least-bad result valid merely to produce an output.
6. Run optional inference under an enforceable external deadline/worker boundary with cancellation and memory limits from #8. A timer around a blocking call is insufficient. Prepackage dependencies/weights for a network-disabled run; include loading, rendering and inference in end-to-end measurements.

### Generation is a later, separate experiment

If candidate coverage remains the bottleneck, a permitted model could propose bounded arrangement parameters or relationships. Deterministic code would construct and validate the result. Start on development data, retain the same safety/timeout controls, and re-evaluate independently. Do not mix simultaneous generator and ranker changes and then attribute the gain to one component.

Keep an ablation table: baseline generator + baseline ranker; improved generator + baseline ranker; baseline generator + model ranker; combined system only after the separate effects are measured.

## 4. Tests to write before implementation

Each implementing issue must save its own proportional plan and record real red → green evidence. This documentation task does not manufacture code tests.

| Area / owner | Required behavior and controls |
| --- | --- |
| Split/manifest validator — Krush | Reject cross-split source/family duplicates, missing provenance/resources and undisclosed conversion loss; accept distinct valid families and intentional reuse within one split |
| Review exporter — Krush | Seeded/reversed ordering decodes correctly; no method/score leakage in review artifacts; failures, ties and neither remain in denominators; aggregate by family; accept valid complete bundles |
| Candidate generation — JD + Junho | Show a real failure before adding grids/width search; preserve IDs/styles/groups, valid overlaps and sparse layouts; cover extreme aspect ratios, dense/empty text and infeasible cases |
| Rendered checks — Junho | Detect injected invisible text, clipping, missing glyphs and damaged crops using render evidence; retain legal overlays, transparency and supported typography |
| Ranker adapter — Junho | Normal valid selection; one/zero eligible candidates; ties; unknown/duplicate IDs; malformed/nonfinite scores; attempted mutation; model missing/crash/timeout; embedded prompt-like text; deterministic fallback and visible failure |
| ML offline checks — Junho + Krush, coordinated with JD's #8 harness | Network-disabled cold start and repeated runs on teammate hardware; cancellation stops work; memory/time limits include model load and output rendering; missing assets/weights remain explicit failures |

Run npm test/build for code changes, native verification/benchmark and inspected images for layout/fonts, and the browser acceptance flow for UI changes. Extend existing CI conditionally when each new capability exists. Do not reopen completed #13 simply because a future model needs additional tests.

## 5. Adoption decision and stop conditions

Before the final test, freeze one candidate system, the baseline, corpus/targets/review sample, renderer, defect categories, primary metric, execution limits and the analysis code. Use validation for model/prompt/threshold selection; do not try many systems against the sealed test and report the winner.

Proposed internal adoption bar, to preregister before examining test results:

- At least ten untouched test families; report all individual votes. Score each review +1 for proposed, -1 for baseline, and 0 for tie/neither; average within family and then equally across families. Require a mean advantage of at least **0.10**, with a family-bootstrap 95% interval above zero. This is a decision rule, not proof of universal superiority; more families may be necessary.
- Report neither-acceptable rates separately and require overall acceptability not to deteriorate. A preference win between two bad designs is not sufficient.
- No additional protected-content/brand violations and no observed increase in critical rendered failure rate versus the baseline on the frozen suite; review every severe regression and disclose category/sample-size limits. Zero observed failures does not prove zero risk.
- Meet verified offline runtime/memory/model rules on representative difficult inputs. Publish cold/warm end-to-end timing, timeout/fallback counts, and the worst cases. Never hide inference time behind a warm cache.
- An uncertain result, disagreement, unchanged quality, or an unaffordable model keeps the deterministic engine as the submission path. Investigate with fresh development/validation evidence; do not repeatedly unlock the final holdout.

Timebox the first adapter/model comparison to **two focused build sessions (up to eight engineering hours)** after the data, eligibility and runtime prerequisites exist. Data collection and independent review are separate scheduled work. At the checkpoint, keep, stop, or narrow the experiment. Reserve at least three build sessions before the team's final integration freeze for container/native integration, fallback and failure rehearsal. These are internal effort budgets, not Adobe deadlines or a new approval gate.

## 6. Immediate handoffs

| Owner | Next concrete deliverable | Existing issue |
| --- | --- | --- |
| Krush | Split manifest, source-conversion checks, blind-review bundle/protocol and independent reviewer recruitment | #7 |
| JD + Junho | Candidate coverage/selection diagnosis, then test-first space allocation and composition improvements | #5/#12 with #3 |
| Junho | Rendered defect labels and adversarial positive/negative controls | #6 |
| Krush + JD | Verified allowed models/input contract and end-to-end offline hardware budget | #4/#8 |
| Krush + Junho | Krush: data/labels, eligibility, evaluation and keep/stop report. Junho: local ranker implementation, rendered features and fallback/runtime tests | [#19](https://github.com/ojedaJD/reflow-studio/issues/19) — Ready for preparation |

Start corpus/protocol preparation and generation-versus-selection diagnosis now. Continue core engine and integration work alongside it. Actual training/inference waits for the relevant data/eligibility/budget prerequisites, not for the end of the project. The family-business story remains presentation context only.
