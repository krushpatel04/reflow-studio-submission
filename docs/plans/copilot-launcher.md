# One-command Copilot support launcher

## Problem and scope
The user wants to start a useful local Copilot task without an active Codex session. Provide an issue-number CLI plus a double-click macOS entry point; read the live issue, preserve human ownership, create a fresh jo/ worktree, install dependencies, and run one bounded worker with retained usage and handoff. Do not auto-select arbitrary backlog work, push, or close issues.

## Risks and acceptance
Validate issue/limits before external actions; pass arguments without shell interpolation; fail on closed/unassigned issues and overlapping local issue worktrees/locks. Preserve caller changes. Explicit scope may narrow the issue. Remove BYOK overrides so the intended route uses Copilot, disable unrelated MCPs, retain normal path restrictions. Tool authorization is not a security sandbox. Enforce timeout/cancellation on the process group, capture failures, and distinguish finished worker from reviewed/landed task. Credit cap is soft.

## Test-first plan
Write behavioral tests for argument validation, closed-issue rejection before checkout, exact issue prompt preservation, process failure/timeout, and complete orchestration with fake external programs. Run against a stub and record real assertion failures. Then implement and run npm test/build plus non-spending launcher help/list checks. No live implementation request is needed to test launching: existing Copilot smoke/trial already establish account access.

## Execution evidence
Initial stub run: seven behavioral tests failed on assertions, recorded in reports/copilot-launcher/red.txt. After implementation the original seven passed; an additional UTF-8 split-chunk regression passes. The first full build caught an unknown-to-string test type mismatch, corrected with a runtime type assertion. Help, Bash syntax and a real #31 overlap refusal were exercised without launching another model session. #31’s previous worker exited0 in125.6s; its work remains unreviewed and separate. Final test/build results are recorded in the handoff.

Final validation: `npm test` passed331/331; `npm run build` passed; `bash -n Copilot-Assist.command`, Markdown link checks and `git diff --check` passed. Focused test command was `node --import tsx --test tests/copilot-assist.test.ts`. Cancellation independently verifies a spawned descendant cannot write its delayed marker after termination. Live `npm run --silent assist -- --list` succeeds; `--issue 31` is refused before installation/model use due to its existing trial worktree. No real new issue was dispatched while validating the launcher. Runtime/native/browser layout output is unchanged by this tooling change. No new skill is warranted.
