# ML research and teammate handoff

## Problem, evidence and intended outcome

The user requested research-backed tasks for Krush and Junho. The current engine produces uniform, stack and split candidates, selects with deterministic diagnostics/source preferences, and has no independent unfamiliar-design quality result. Existing #7/#19 already cover evaluation and a bounded optional ranker. Research should identify useful methods and missing experiments without duplicating those umbrella tasks or implying a model solves missing candidates, rendering failures or Adobe compatibility.

## Scope and risks

Documentation and GitHub planning only. Read primary papers, author repositories and model/data licenses; map verified findings to current code and constraints. Preserve Krush's data/evaluation ownership, Junho's ML implementation ownership, and JD's deterministic engine ownership. Do not download models, train, change production interfaces or claim measured gains. Risks include benchmark leakage, unlicensed datasets/models, confusing paper results with local evidence, duplicate issues and an oversized research backlog.

## Steps

1. Read vault/project context, current code/evidence and existing issues.
2. Verify primary research on learned ranking, design-specific visual assessment, diagnostic labels and controlled model evaluation. Distinguish ready methods from deferred ideas.
3. Write a concise team research note with source links, limitations, an initial recommended experiment, test-first cases and stop criteria.
4. Create only concrete missing implementation slices, assign Krush/Junho, and link dependencies from #19/#7 and the board. Preserve existing issue content and state.
5. Check links, issue persistence, ownership, priority/status and whitespace; fetch and publish a focused docs commit. Capture verified outcomes in the vault using the documented session workflow.

## Acceptance checks before editing

- Each new issue traces a current gap to a primary source and has an owner, bounded deliverable, dependencies, behavioral tests to write first and a keep/stop rule.
- Research claims distinguish source findings from our hypothesis; eligibility/license/hardware unknowns stay explicit.
- Existing family-separated blind-review protocol, hard checks, fallback, immutable content and offline execution remain required. No repeat tuning on the final test.
- New issues are distinct slices of #19/#7, with no duplicate broad ML task. The board and team docs agree on ownership.
- Relative Markdown links and whitespace pass. No artificial code tests for documentation. Vault capture is reported only after successful save and health checks.

## Handoff

Read the vault's project/session context, current code and recorded evidence at `4894fa6`, and existing issue scope. Reviewed DesignSense, TASTE and its author code/data/model cards, UMSI and earlier scoring/generation precedents. The [research handoff](../research/2026-09-16-ml-gap-analysis.md) distinguishes paper findings, our proposals, resource declarations and unresolved eligibility. No weights were downloaded and no model or production code was changed.

Created #20 (Krush, preference data), #21 (Junho, small ranker/adapter), and #22 (Krush with Junho implementation support, pretrained-scorer qualification). Linked these distinct slices from #19/#7 and supplied rendering/roadmap handoffs in #6/#11 without replacing existing criteria or reopening completed work. The new work shares #19's existing model-experiment budget. README and the current ML strategy link the research note.

Validation: checked issue bodies and formal assignees, and reloaded the project to verify #20 and #22 as P1 / Ready / Krush and #21 as P1 / Backlog / Junho. Ready covers protocol/resource preparation, not permission to skip data/eligibility/runtime prerequisites. Markdown relative links and whitespace pass. This documentation-only task does not call for artificial code tests or an application build. Publication and session memory are verified at final handoff.

Remaining limits: no independent preference study, model training/inference, Adobe eligibility confirmation or quality gain was produced. DesignSense artifact availability remains unverified; TASTE dataset documentation and asset terms need inspection before importing. Skill assessment: the existing browser workflow and repository plan/test instructions are sufficient; no new reusable skill is needed.
