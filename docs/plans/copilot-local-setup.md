# Local Copilot setup

## Problem and scope
Use the user's Copilot allowance for bounded collaborator implementation while reserving Codex for JD's engine work and integration review. Install the official CLI locally; preserve repository ownership and the offline product. No collaborator issue starts merely because tooling is installed.

## Plan and risks
Verify official install/authentication instructions, install CLI, verify account and a tool-free model response. Add concise repository instructions and an isolated-worktree handoff recipe. Avoid overlapping file edits, new runtime dependencies, automatic pushing, account sharing, and assuming usage caps are hard billing limits.

## Acceptance
CLI version and account are checked; actual request success or blocker is reported. Instruction discovery finds repo guidance. Document Auto routing, per-session credit limit, one issue per worktree, tests-first evidence and human-identity integration. Check Markdown links and git diff; no production tests are needed for setup documentation.

## Execution
Installed official npm package @github/copilot globally; CLI version 1.0.87. Interactive /user identifies ojedaJD via existing gh authentication. Model smoke result recorded at handoff. No API key or shared credentials were added.

Validation completed: tool-free smoke returned `COPILOT_READY` using Auto routing (gpt-5.6-luna displayed), with 0.34 AI credits shown. `copilot instruction list` discovers both AGENTS.md and .github/copilot-instructions.md. Local Markdown links and git diff checks passed. No implementation task was dispatched, no runtime dependencies changed, and no paid-overage or global all-permissions setting was enabled. No separate skill was warranted; the concise repository guide covers this workflow.
