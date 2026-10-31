# Reflow Studio contributor instructions

Read `README.md`, `docs/progress.md`, and `docs/team-plan.md` before extending the prototype.

## Required workflow: plan first, tests first

- Begin every task with a written plan before making changes. Explain the problem and evidence, why it matters, what can go wrong, the intended behavior, scope, implementation steps, and acceptance checks. Keep the plan proportional to the task; save implementation plans under `docs/plans/` and link them from the task handoff or related issue (and a PR if one is used).
- Before changing production code, write meaningful tests for the intended behavior and run them against the current implementation. Confirm that new regression tests fail for the expected behavioral reason, not a broken test setup. Record the command and failure evidence before implementing the fix.
- Follow the red → green → refactor cycle: failing test first, smallest correct implementation next, then cleanup while tests stay green. For a behavior-preserving refactor, write/run characterization tests first; they may already pass. Do not introduce an artificial failure.
- Cover normal, boundary, invalid-input, and relevant regression cases. Include positive controls so stricter checks do not reject valid designs. Tests must establish externally meaningful behavior, not merely mirror implementation details or the selector's own scoring rules.
- For documentation and other non-code work, define concrete acceptance checks before editing, then verify them afterward; do not add artificial code tests for prose changes.
- Update the plan when evidence changes the approach. A written plan is not an extra approval gate: proceed within authorized scope unless a decision genuinely requires user input.
- Before handoff, report the problem addressed, changes, test-first evidence, final validation, and remaining limitations. See `docs/development-workflow.md` for the template and `docs/plans/engine-contract.md` for the first engine task.

## Skills

- Before implementation, load the available skills that materially help the current task; choose by actual workflow rather than keywords or availability.
- At task completion, assess whether a reusable skill would make future sessions more efficient. Create or update one only when it captures a useful repeatable procedure that is not already covered well. Do not create a skill automatically after every task or session; briefly record the assessment in the handoff.

## Scope and implementation

- Work only within this repository. The surrounding directory contains separate research and tasks.
- Preserve source element IDs, original text and assets, paint order, group membership, and brand styles when changing layout behavior.
- The internal schema is provisional. Do not describe this as an Adobe-integrated or submission-ready engine until the official path is verified.
- Keep failures visible. Report geometry, readability, visual quality, and integration evidence separately.
- Use the locally bundled fonts and assets; the engine must not depend on an external model/API call.
- Coordinate ownership before changing shared interfaces. Do not revert teammates' changes.

## Verification

- Python is the canonical submission engine. For Python, packaging or resource changes, follow README setup and run `python scripts/verify_python.py` with the pinned `CHAMELEON_UPSTREAM`; no skipped tests count as acceptance. Node checks protect retained development tools and do not establish Python container qualification.

- Run `npm test` and `npm run build` for code changes.
- For layout or font changes, run `npm run verify` and `npm run benchmark`, then inspect representative images.
- For UI changes, run the app and visit `/verify.html`; also inspect the affected interactions visually.
- Generated reports stay under `reports/` and are reproducible; do not commit dependency caches or build output.
- When sharing benchmark evidence, preserve a reviewed, dated snapshot under `docs/evidence/` and link it from the README. Keep fresh generated output separate from archived snapshots.

## Git and team communication

- Direct commits and pushes to `main` are the default for this hackathon. Feature branches, pull requests, and teammate reviews are optional; do not require reviewer approval or wait for review before landing authorized, validated work.
- When a branch is used, name it `jo/<short-task-description>`. Never include `codex` in a branch name, regardless of tool defaults. Preserve this owner preference in task handoffs.
- Fetch before publishing, preserve concurrent changes, and use small focused commits. Avoid force pushes. Keep the plan-first, tests-first, and verification requirements above.
- Use the human contributor's configured Git identity.
- Do not add Codex, OpenAI, or another AI tool as a commit author/co-author. Do not append AI co-author trailers or generated-by credits to commits or pull requests.
- Keep team-facing documentation self-contained and free of private organizational research.
- Add collaborators only when the repository owner specifies their GitHub account.
