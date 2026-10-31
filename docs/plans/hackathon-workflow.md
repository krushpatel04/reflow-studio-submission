# Hackathon workflow: optional PRs and review

## Problem and why it matters

The repository requires feature branches, pull requests and teammate review before shared changes can land. The owner requested removing these gates because the hackathon team needs a lighter workflow. Implementation plans and tests-before-code are still required.

## Intended behavior and scope

Direct commits/pushes to `main` are the default for completed, validated work. Feature branches, PRs and review are optional tools when useful, with no required reviewer or waiting period. Update contributor/agent instructions and handoff guidance consistently. Inspect GitHub branch protection and rulesets for any enforced PR/approval requirement, and remove only that requirement if present. Land the already-verified engine work without waiting for reviewers.

## Risks and failure modes

Direct pushes can collide with teammates' work or land unverified changes. Fetch before publishing, retain the plan/test/build requirements and relevant verification, use small commits, preserve others' changes and avoid force pushes. Keep the existing substantial engine change and its test evidence reviewable through Git history and the already-created PR. Historical records should stay truthful about the previous policy.

## Steps and acceptance checks

1. Inspect policy references and GitHub enforcement.
2. Update AGENTS, CONTRIBUTING, workflow/status guidance and the current engine handoff. Keep independent visual-quality review requirements separate from GitHub approval gates.
3. Check local Markdown links, inspect the policy diff, and confirm no active instruction still requires a PR or reviewer approval. Documentation-only changes use these checks; no artificial unit tests.
4. Publish without a reviewer gate, synchronize local main and report the actual GitHub enforcement state.

## Execution record

- Existing engine work passed 123 tests, build, verify and benchmark before this policy change. PR #18 was opened under the previous workflow and remains available as implementation evidence.
- Policy inspection found required PR/feature-branch language in AGENTS and CONTRIBUTING and required teammate review in the development workflow and engine plan. GitHub settings show no classic branch protection rules and no rulesets, so there is no enforced PR/reviewer gate to remove.

- Updated active guidance in AGENTS, CONTRIBUTING, README, development workflow and engine handoff: PRs/reviews are optional, direct main pushes are the default, and plan/test/verification requirements remain. Independent visual-quality evaluation remains separate.
- Documentation acceptance: 31 local links across 6 documents resolved; policy diff inspected and `git diff --check` passed. No production code changed in this policy slice, so the completed engine test/build/verify/benchmark evidence remains applicable.
