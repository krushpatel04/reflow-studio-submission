# Development workflow

> **Current navigation — October 8:** The [repository audit](repository-audit-2026-10-08.md) records delivered Python work and remaining evidence gaps. The [Tuesday work queue](execution/2026-10-13/README.md) controls this run and reserved collaborator ownership. Older dated source/migration/pause statements below are historical; Adobe remains authoritative.


Every task starts with a plan. Production changes start with tests. For this hackathon, validated work lands directly on `main` by default; feature branches, PRs and teammate reviews are optional. These are the team's working requirements, recorded in [AGENTS.md](../AGENTS.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).

For the October 8–13 channel run, independent exact-SHA review is required by the [run plan](execution/2026-10-13/README.md), in addition to CI. This is a scoped channel gate; it does not silently change the repository-wide direct-commit policy.

## 1. Explain the problem before choosing the fix

Read the current code, related issue, and available evidence. Describe an observable failure or intended outcome, who or what it affects, and why the existing behavior is inadequate. Distinguish a reproduced defect from a hypothesis or desired feature.

Write a short plan using this structure; save implementation plans under `docs/plans/`:

```markdown
# Task / issue
## Problem and evidence
## Why it matters
## Intended behavior and scope
## Risks and failure modes
## Test cases and acceptance criteria
## Implementation steps and ownership
## Validation and handoff
## Execution record
```

The risk section should explain what an incomplete or incorrect implementation could break. Include compatibility, false positives, data loss, runtime, and integration concerns where relevant. Name the shared files/interfaces and coordinate with their owners.

A plan should be concrete enough to implement and review. Keep routine tasks brief. Revise it as evidence changes; avoid turning it into an approval ceremony.

## 2. Write and run tests before production changes

For each behavior-changing slice:

1. Write a focused test for the desired behavior with representative inputs and an explicit expected result.
2. Run it against the current implementation. Confirm a regression fails for the intended reason. Fix invalid test setup before judging the result.
3. Record the command, observed assertion failure, and code state in the plan or PR before changing production code. A test-only commit is useful when practical, but a separate commit is not required.
4. Implement the smallest correct change that makes the test pass.
5. Run the relevant existing tests. Refactor with tests still green, then complete the required broader validation.

Behavior-preserving refactors begin with characterization tests that document existing behavior and may already pass. When a desired behavior is already supported, keep the useful test and do not invent a production change merely to demonstrate red/green.

Test normal behavior, boundaries, invalid input, and identified failure modes. Pair rejection tests with valid examples to catch overvalidation. Assert content and observable outcomes rather than private helper structure. Renderer agreement and internal diagnostic counts are useful but cannot by themselves establish visible or aesthetic correctness.

Never weaken an expected result merely to accommodate a bug. If the requirement was wrong, explain and update the plan before changing the test. A failing test caused only by imports, missing dependencies, or syntax is not evidence that a behavioral regression was reproduced.

## 3. Verify and hand off

Follow the commands and visual requirements in [AGENTS.md](../AGENTS.md). Preserve useful before/after evidence and disclose tests not run. Keep fresh generated output under ignored `reports/`; archive reviewed snapshots deliberately.

The task handoff or related issue should summarize the problem, resulting behavior, plan link, initial regression failure and final pass, compatibility decisions, and remaining limits. Put the same information in a PR if one is useful. No PR or reviewer approval is required, even for substantial changes. Fetch before pushing, preserve concurrent changes, and avoid force pushes. Do not close a broad issue when only one slice is complete.

For documentation or other non-code work, define the acceptance checks before editing and verify them afterward. Examples include checking factual wording, relative links, scope consistency, and the final diff. Do not write tests that merely assert prose contains the newly added prose.

First engine task: [harden the editable design contract and preservation checks](plans/engine-contract.md).
