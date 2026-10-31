# Research handoff: where ML can improve Reflow

Reviewed September 16, 2026. Repository baseline: `4894fa6`. **Research and proposed experiments, not implemented capabilities or measured Reflow gains.** Owners: Krush (data/evaluation) and Junho (ML implementation). [Task plan](../plans/ml-research-handoff.md) · [Evaluation/adoption protocol](../quality-and-ml.md) · [ML umbrella #19](https://github.com/ojedaJD/reflow-studio/issues/19).

## Recommendation

Start with independently labeled comparisons of our actual candidate layouts, then fit a small preference model. Evaluate one design-specific pretrained scorer only if its rules, resources and runtime fit. Keep the deterministic engine as the baseline and fallback. Better generation remains JD's responsibility when every candidate is poor.

The new deliverables are a concrete decomposition of #19/#7: a preference-data pack (Krush), a bounded pairwise selection adapter and first small ranker (Junho), and an optional pretrained-judge qualification report (Krush with Junho). They share #19's existing experiment budget; they do not create three independent eight-hour model projects.

## Findings from primary sources

### 1. DesignSense — layout-specific preferences, February 2026

The [paper](https://arxiv.org/html/2602.23438v1) compares arrangements of the same elements and uses four outcomes: left, right, both good, both bad. Its specialized classifier outperforms the tested general models on that task. Its reported ranking gains belong to its dataset/generator, not ours. The experiment uses an InternVL3-8B backbone and a substantial annotation pipeline; duplicating that training is not our first step. No usable author-linked dataset/checkpoint release was verified in this review.

**Our application:** collect overall preference plus separate acceptability and defect evidence. A winner can still be unacceptable. Do not automatically label every moved element or synthetic perturbation as bad: deliberate whitespace and legal overlays are positive controls. This refines #7 rather than replacing its corpus work.

### 2. TASTE — domain adaptation and unreliable generic judges, May 2026

The [v1 paper](https://arxiv.org/html/2605.20731v1) reports weak designer agreement for off-the-shelf judges, including sensitivity to image order. A trained pairwise head improves its validation result over the frozen scalar baseline. The task compares generated graphics; it does not establish performance on editable reflow or preservation of a particular source. Its published gains are not a Reflow adoption threshold.

The [author implementation](https://github.com/purvanshi-lica/taste/tree/main/taste-scorer) exposes per-dimension pair preferences using a frozen Qwen3-VL-Embedding-2B backbone and learned heads. It recommends CUDA and lists CPU/MPS options; these are not verified performance on our machines. The small head still requires the larger encoder. Code/checkpoint links exist; we did not download, install or execute them.

**Our application:** qualify at most this one pretrained candidate initially. First establish an inexpensive feature-based baseline; then ask whether rendered-image features add independent value. Do not fine-tune the backbone first. Test both image orders and keep disagreement visible. Treat exported probabilities as uncalibrated on Reflow until measured on validation data.

### 3. UMSI — preserve visual emphasis, not just rectangles

[Adobe's publication page](https://research.adobe.com/publication/predicting-visual-importance-across-graphic-design-types/) and the [author project](https://predimportance.mit.edu/) describe visual-importance prediction and an application to aspect-ratio changes. Our `compositionChange` estimates prominence using text size/image dimensions; it does not measure where a viewer looks.

**Our application:** add a development-only diagnostic asking whether the headline/product/CTA that mattered in the source still stands out. Human element-importance labels come first. Optional learned attention features are a later #6/#19 extension only if observed failures justify them. An attention map is not proof of readability, aesthetic quality or business intent; do not force every output to copy the source heatmap.

### 4. Existing work remains useful, with limits

[Design-o-meter](https://sahilg06.github.io/Design-o-meter/) separates learned scoring from refinement; [LayoutPrompter](https://arxiv.org/abs/2311.06495) separates candidate generation from ranking. These support the earlier modular plan. We are not adopting their full search/training pipelines. A feedback loop that optimizes its own scorer still requires independent review, bounded execution and preservation checks.

## Verified resource status

| Resource | Observed availability / license declaration | Remaining check |
| --- | --- | --- |
| TASTE code | Author repository declares MIT | Pin revision, inspect adapter dependencies and notices |
| TASTE dataset | [Dataset card](https://huggingface.co/datasets/purvanshi/TASTE) declares MIT for annotations/images and explicitly notes upstream generator terms | Check asset terms, family/prompt duplicates and schema before any import; never use it as our final reflow holdout |
| TASTE scorer weights | Author README links a checkpoint | Verify artifact terms, hash, architecture, offline loading and actual footprint before use |
| Qwen3-VL-Embedding-2B | [Publisher model card](https://huggingface.co/Qwen/Qwen3-VL-Embedding-2B) declares Apache-2.0 | Verify challenge allowlist, pinned weights, complete dependency size and cold-start budget |
| DesignSense | Paper and method verified | Public data/model availability and artifact terms unverified; use the method as inspiration |
| UMSI | Author project links code and Keras weights | Separate runtime/weight/license audit if later justified |

The TASTE dataset card's pair-conversion prose mentions five ranked assets while its viewer shows ranks 1–4, and its paper describes four generator outputs. Treat this as a documentation inconsistency: validate actual records and revisions instead of hard-coding either count. Paper, code, data and weights can have different terms. None of these declarations establishes Adobe eligibility; #4/#8 remain authoritative integration gates.

## Map research to current gaps

| Observed gap | Bounded response | What ML cannot establish |
| --- | --- | --- |
| `rankingTerms` uses fixed `8 * readabilityDeficit + compositionPenalty` | Learn preferences from independent development-family labels, compare with the frozen heuristic | Training on that same heuristic would only imitate it |
| Geometry proxies miss visible emphasis, detailed crop damage and contrast | Add independently verified rendered features/labels from #6; later ablate a visual encoder | A learned score cannot certify content preservation or rendering correctness |
| Only uniform/stack/split candidates exist | Review all unique candidates; route absent-good-candidate cases to #5/#12 | A ranker cannot invent a missing layout |
| `reflow` can retain identical stack/split designs under different strategies | Deduplicate by full design/resource/render identity before pairwise comparison; retain original candidate-ID mapping | Duplicate names are not independent alternatives or votes |
| A pairwise model need not be transitive | Score a bounded comparison table, then apply an explicit stable aggregation/fallback rule | Passing model comparisons directly to `Array.sort` does not define a reliable ordering |
| Current comparator chooses the fewest errors even if every candidate has errors | Experimental wrapper admits only zero-error candidates and returns an explicit no-valid-candidate result | Aesthetic preference must never make an invalid result eligible; wrapper failure handling still needs implementation |

The code observations above come from [engine.ts](../../src/engine.ts), [ranking.ts](../../src/ranking.ts), and [evaluate.ts](../../src/evaluate.ts). No production behavior changed in this review.

## Concrete experimental design

### A. Preference pack — Krush

Extend #7's exporter rather than building another corpus tool. Keep source/candidate IDs, frozen renders, resource hashes, family split, reviewer identity, overall preference, per-candidate acceptable yes/no/unsure, and reasons for typography/hierarchy/spacing/source-faithfulness defects. Preserve original individual votes. Both-good/both-bad are derived only when individual labels support them; uncertainty is not silently a tie.

Pilot target: **60 unique pairs from at least ten development/validation families, two independent reviews per pair**, with a separately reported small set of repeated/reversed controls. This is a feasibility target, not statistical power or an adoption claim. Use no final-test families; retain the separate final holdout required by the existing protocol. Capture hard-valid but visually weak pairs as well as explicit invalid controls. Keep invalid controls out of runtime candidate selection while retaining their diagnostic results.

Before exporter changes, test swap/ID decoding, family/derivative leakage, missing/invalid labels, independent reviewer counts, both-bad versus ties, duplicate/reversed controls, and equal-family aggregation. If annotation is too sparse or inconsistent, report the gap; do not fabricate consensus or train on heuristic winners.

### B. Small learned ranker and adapter — Junho

First baseline: a regularized pairwise logistic model on documented source-relative features, fitted only to decisive human development labels. Standardization is learned on training families only. Keep ties, acceptability and defect labels in evaluation; the binary model must not pretend to predict all four outcomes. Preserve a named feature manifest; ablate any added render features. This is our proposed low-cost experiment, not a reproduction of TASTE's architecture.

Freeze a bounded candidate set. Skip the model with one valid candidate; explicitly fail with zero. Deduplicate equivalent full designs, then preserve stable mapping to existing IDs. For a later genuinely pairwise visual model, evaluate both orders, aggregate by candidate identity and log cycles/order disagreement. Never put a non-transitive model call inside a sorting comparator. Uncertain, malformed, unavailable or over-budget inference returns the existing valid deterministic choice with a reason.

Tests first: a meaningful human-labeled preference case, valid/invalid controls, one/zero candidates, identical stack/split, candidate-order permutations, A/B reversal, cyclic preferences (A>B, B>C, C>A), ties, nonfinite outputs, immutable content, training/validation leakage, missing model and cancellation. Use externally meaningful selection/failure behavior, not only agreement with our own formula.

### C. Pretrained judge qualification — Krush, with Junho

Start the protocol/resource audit now. Run inference only after A's data and #4/#8's eligibility/budget evidence exist. TASTE is a candidate, not a selected dependency. Use identical candidates, a fixed brief derived from supplied source metadata/constraints, and declared source-reference handling. Do not invent a prompt that favors one output. TASTE's image-pair-plus-prompt API does not by itself compare either output with the original source, so independent source-faithfulness checks remain necessary.

Measure both image orders, identical-image behavior, small-text sensitivity at fixed full-view and readable-detail settings, preserved versus damaged text/crops, source fidelity, false alarms on legal overlays, and disagreement with independent reviewers. For models accepting free-text instructions, include prompt-like text inside the artwork. Report all pairs, fallbacks and failures, not only the subset where a model is confident. If a head outputs only A/B probability, report that limitation; do not invent both-good/both-bad probabilities. Confirm calibration/abstention thresholds on validation, including coverage versus error, then freeze them before any final test.

Test the report with deterministic fake adapters first: an always-left judge must fail reversal controls; an ID-consistent judge must pass; malformed/missing/timeout results must stay in denominators. Only then run the real local adapter, network disabled, recording cold/warm end-to-end time, peak memory and exact weights/configuration hashes. A qualified scorer proceeds to #19's independent adoption study; a failed/inconclusive scorer is archived and the baseline remains.

## Sequence and stop rules

1. Krush prepares A and the eligibility portion of C; Junho designs B's interface/tests with JD. No model weights needed for those steps.
2. After labels exist, spend #19's shared two-session/eight-hour model budget on the simple ranker and, only if feasible, one pretrained comparison. End the checkpoint with evidence or a clear stop; implementation spikes do not imply all research tasks are complete.
3. If candidate coverage dominates, stop ranking work and give JD the development failures. If independent signal or hardware is inadequate, retain the deterministic path. No RL/DPO, backbone fine-tuning, multi-agent runtime, or broad model sweep is scheduled.
4. Final adoption still requires the existing frozen family-level human preference, acceptability, preservation, defect and offline-runtime gates. Keep statistical uncertainty and negative findings visible. No top-three finish is established by this research.

## GitHub handoff

| Issue | Owner | Starting state |
| --- | --- | --- |
| [#20 — Preference pack and reviewer controls](https://github.com/ojedaJD/reflow-studio/issues/20) | Krush | P1 / Ready for protocol/export preparation |
| [#21 — Preference adapter and small learned baseline](https://github.com/ojedaJD/reflow-studio/issues/21) | Junho | P1 / Backlog; interface/tests can be prepared, fitting requires #20 |
| [#22 — Pretrained scorer qualification](https://github.com/ojedaJD/reflow-studio/issues/22) | Krush; Junho supplies implementation/runtime support | P1 / Ready for resource/protocol audit; inference waits on prerequisites |

#19 remains the umbrella, #7 owns corpus/review infrastructure, #6 owns rendered correctness, and #4/#8 own official/runtime constraints. Plans and meaningful failing tests precede each production implementation; direct validated commits to main remain allowed, with `jo/` for optional branches.
