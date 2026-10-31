# Independent quality evaluation and ML experiment roadmap

## Problem, evidence, and intended behavior

The engine has stronger preservation, stability, and regression checks, but no independent evidence that unfamiliar designs look good after reflow. The source-ranking archive records 18 uniform selections in 30 outputs and an increase from 6 to 11 readability warnings. A better internal score does not establish a better design. The user asked to add competitive improvements and plan where ML could help now.

Create an executable team plan for independent evaluation, richer candidates, rendered defects, and an optional local ML experiment. Separate candidate-generation failures from selection failures before choosing a model. Preserve the deterministic engine as a reproducible baseline and fallback. Planning an experiment does not make ML part of the running engine.

## Scope, ownership, and risks

This task changes documentation and GitHub planning metadata only. Own this plan, a quality/ML strategy document, and small links/status notes in README, team plan, and progress. Preserve active engine work and existing issue criteria; do not alter shared production interfaces. JD owns deterministic candidate/ranking work and execution. Following the ownership update below, Krush and Junho share #19: Krush owns data/evaluation/model eligibility; Junho owns the local ranker implementation and its fallback/runtime tests, alongside rendered typography/visibility.

Risks: tuning on the test families, training on our own heuristic scores, selecting visually attractive but corrupted output, overclaiming results from repeated sizes of the same design, spending the deadline on model integration, and duplicate issues. Address these with family-separated data, independent judgments, fixed baselines, validity checks, uncertainty reporting, an early stop decision, and updates to existing tasks.

## Steps

1. Read current source/evidence/roadmap and existing issue bodies; verify the relevant primary research and previously reviewed Adobe constraints.
2. Define corpus separation, blind review, candidate-vs-selector diagnosis, a bounded model experiment, tests to write before implementation, and adoption/stop criteria.
3. Link the strategy from team documentation. Update existing issues and add only the missing bounded ML experiment, with owner, priority, dependencies, and plan link on the board.
4. Check links, terminology, preserved issue content/state, persisted board metadata, and the focused diff. Fetch before publishing a small human-authored commit to main.

## Acceptance checks defined before editing

- Concrete next deliverables and owners exist for independent quality, candidates, rendered checks, offline/model eligibility, and the ML experiment.
- Development, validation, and untouched test families remain distinct; no test labels, assets, or near-duplicates enter training/retrieval/tuning.
- The plan distinguishes a better candidate generator from a better ranker, and distinguishes model usage from training/fine-tuning.
- A local model cannot change protected content or override validity checks; absence, malformed output, timeout, low confidence, and no-valid-candidate behavior have test-first cases.
- Adoption depends on independent preference, defect rates, runtime, and eligibility; an inconclusive/no-gain result retains the deterministic baseline.
- GitHub issue links and board owner/priority/status are checked after saving. Existing completed work is not reopened or declared incomplete because of this roadmap.
- No production changes or artificial code tests; Markdown links and whitespace are validated. Main remains the default; any optional branch uses `jo/`, with no AI author/co-author credit.

## Execution and handoff

- Reviewed current committed engine evidence through `1f8ae8b`, including 178 recorded tests, unchanged measurement-reuse outputs, the source-stability/readability tradeoff, and the remaining independent-evaluation gap. No application code changed in this task.
- Wrote [the strategy and test matrix](../quality-and-ml.md), linked it from README/team plan/progress, and preserved existing issue ownership and completed slices.
- Expanded #7's protocol and added focused cross-links/acceptance handoffs to #4, #5, #6, #8, #12 and roadmap #11. Existing bodies and completion states were preserved.
- Created [ML experiment #19](https://github.com/ojedaJD/reflow-studio/issues/19), assigned to ojedaJD with Krush/Junho support, P1 and Ready for preparation. Auto-import added the card to the existing project; model runs still depend on #7 data, #4 eligibility and #8 budgets.
- Reused the browser workflow because the private-repository connector still returned 404. No messages or outreach were sent to external reviewers or organizers.

## Validation and remaining limits

Passed relative Markdown link checks and whitespace checks across the five changed files. Reread the persisted additions on #4, #5, #6, #7, #8, #11 and #12; reloaded the project and verified #19 as Ready / P1 / JD — engine. The issue is also assigned to ojedaJD. Repository fetch confirmed no remote divergence before publishing.

This task has documentation/metadata acceptance checks, not artificial code tests; no npm test/build rerun is needed for prose. The corpus, reviewers, model choice/training, adapter, independent study and adoption decision remain future implementation work. No improvement in visual quality is claimed from adding this roadmap.

Skill assessment: the existing browser workflow and repository plans cover this planning task. No new reusable skill is needed.

## Ownership update — September 16, 2026

Problem: the owner requested that Krush and Junho split the ML work; the initial issue and roadmap still assign it to JD. Conflicting assignments could leave implementation or evaluation unowned.

Plan: assign #19 to krushpatel04 and JunhoHwoang, remove ojedaJD from that experiment, and make the split explicit. Krush owns data/labels, model eligibility, experiment evaluation and the keep/stop report. Junho owns the optional local ranker adapter, model inference or fitting implementation, rendered features and fallback/runtime tests. JD continues the deterministic engine and coordinates its interface with them. Keep existing scope, prerequisites, status and priority. Update the project owner field and current team documentation, then publish a focused documentation commit.

Acceptance checks: reread issue assignees and responsibilities; verify the board no longer assigns #19 to JD; check that the current strategy/team plan describe the same split, existing criteria are preserved, and Markdown links/whitespace pass. This is a documentation/metadata change; no production code or artificial code tests are needed.

Handoff: #19 now assigns krushpatel04 and JunhoHwoang, with ojedaJD removed, and its body defines their separate responsibilities. Updated roadmap #11, the strategy and the team plan to match. The project's single Owner field is Junho (implementation lead); both GitHub assignees remain on the issue. Reloaded the issue and project to verify the two assignees and Ready / P1 / Junho owner. Existing acceptance criteria and prerequisites remain intact. No code changed; whitespace and relative Markdown links were checked. The existing workflow is sufficient; no new reusable skill is needed.
