# Contributing to Reflow Studio

Start with the [Python submission setup](README.md#run-the-python-submission) and [October 8 audit](docs/repository-audit-2026-10-08.md). The workbench below is optional development tooling.

## Optional workbench setup

```sh
git clone git@github.com:kj-squared-labs/reflow-studio.git
cd reflow-studio
npm ci --cache .cache/npm
npm run dev
```

HTTPS cloning is also available from the GitHub repository's Code menu. No API keys are needed for the prototype.

## Lightweight hackathon workflow

1. Fetch and update `main` without overwriting local or teammate changes. Work directly on `main` by default; a focused branch is optional. Name any new branch `jo/<short-task-description>` (for example, `jo/text-aware-layout`); never include `codex` in branch names.
2. Write an implementation plan explaining the problem, evidence, impact, risks, intended behavior, scope, approach, and test cases. Use the [development workflow](docs/development-workflow.md); coordinate shared interfaces before editing them.
3. Write and run tests before changing production code. Record expected regression failures, implement the smallest correct fix, and refactor while tests stay green. For behavior-preserving refactors, passing characterization tests are the starting point.
4. For Python changes, run `python scripts/verify_python.py` with the prerequisites in the README (no skipped tests). Run `npm test` and `npm run build`. For engine/rendering changes, also run `npm run verify` and `npm run benchmark`, then inspect representative images.
5. Commit and push completed, validated changes directly to `main`. Include the plan, resulting behavior, test-first evidence, validation, and remaining limitations in the task handoff or related issue.
6. Use a PR or ask for review when useful. Neither a PR nor reviewer approval is required; do not wait for reviewers to land authorized work. Avoid force pushes and preserve concurrent changes.

Every task starts with a plan. Documentation-only work uses predefined content/link checks instead of artificial code tests. Planning does not require an additional approval round unless the task has an unresolved decision that needs the owner's input.

Use your own Git name and email. AI-tool co-author trailers are not used in this repository.

## Team and ownership

- [ojedaJD](https://github.com/ojedaJD): engine, preservation contract, candidate search, submission runtime, and CI coordination.
- [JunhoHwoang](https://github.com/JunhoHwoang): typography, rendering, visibility/crop diagnostics, and workbench interaction.
- [krushpatel04](https://github.com/krushpatel04): independent evaluation, Adobe integration, and general creator validation.

These assignments are agreed. Follow the [pinned roadmap](https://github.com/ojedaJD/reflow-studio/issues/11) and [adversarial review](docs/adversarial-review.md). Issue owner mentions define responsibility even while a collaborator invitation is awaiting acceptance. Coordinate shared interfaces before implementation.

The family-business story is presentation context; it adds no engineering or evaluation requirements.

## Codex

Add the cloned repository folder as a project in the desktop app. `AGENTS.md` carries the project instructions across tasks. Keep tasks focused on the engine, typography/rendering, or evaluation/integration responsibilities in the plan.
