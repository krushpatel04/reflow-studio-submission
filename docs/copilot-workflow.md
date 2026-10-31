# Local Copilot support workflow

Use Copilot as an implementation worker for one bounded collaborator task. Keep Codex focused on JD's implementation and integration judgment. This shifts implementation usage to Copilot; savings depend on the amount of review/rework. Copilot is a development tool, not an offline engine dependency.

## Installation and authentication

Installed and checked September 22, 2026: `@github/copilot`, version 1.0.87. Run `copilot --version`. The existing GitHub CLI login was recognized as `ojedaJD` with `/user`; use `copilot login` if another machine needs authentication. Each teammate uses their own eligible account, never a shared token. Helpers running on JD's machine use JD's allowance and retain the teammate's issue ownership.

## Isolated session recipe

Read the live issue first and agree on file scope; do not overwrite a collaborator's active work. Example for an explicitly selected #31 slice (not started by this setup):

```sh
git fetch origin
git worktree add -b jo/issue-31-split-support ../Reflow-issue-31 origin/main
cd ../Reflow-issue-31
npm ci
copilot --model auto --auto-tier efficiency --max-ai-credits 30 --no-remote-export --name reflow-issue-31
```

Choose a fresh `jo/` branch/path for another issue. Worktrees isolate edits, not credentials or shell access; they are not a security sandbox. Keep interactive tool approvals; don't default to global `--allow-all` or fleet/autopilot. Do not set a paid provider API key: the intended route uses the Copilot subscription.

The installed CLI's 30-credit minimum is a **soft session cap**: a response can overshoot it, and `/clear` resets the accounting window. It is not a hard spending cap or an assurance that 30 credits are available. Check account usage/billing separately; no paid overage setting is enabled by this setup. Start one worker and measure the first completed task before increasing parallelism.

## Task prompt

```text
Help implement issue #NUMBER for its existing human owner. Read AGENTS.md,
README.md, docs/progress.md, docs/team-plan.md and the full issue body.
Scope: [specific files and acceptance criteria]. This is the only task.
Write a proportional plan; run meaningful failing regression tests before
production changes, then implement and validate with positive controls.
Preserve teammates' changes and coordinate shared interfaces. Do not change
quality thresholds, add runtime dependencies or expand scope to hide failures.
Stop with a reviewable diff and concise red/green/validation evidence. Do not
push, merge, close the issue, or start another task. Report remaining limits.
```

Copilot discovers root AGENTS.md and `.github/copilot-instructions.md`; verify with `copilot instruction list`. Reuse the existing instructions rather than running an automatic init that rewrites them. The coordinator reads the diff and tests once, resolves actual defects, fetches concurrent work and integrates using the configured human identity. No mandatory PR/reviewer is introduced. Close only the complete issue after validation.

Good initial support work: a bounded #31 split-persistence test/fix agreed with Krush, or #30 reporting scaffolding agreed with Junho. Keep visual judgment, shared architecture and broad #28 concurrency changes closely supervised. Ownership is not reassigned by running a worker.

## Sources and maintenance

[Official installation](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli) · [Authentication](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli). CLI `--help` and `help limits` verified the flags above. Recheck flags after upgrades. This repo guide is sufficient; no separate skill was created.

Use the [delegation/quality workflow](delegation-quality-workflow.md), [brief](templates/delegated-task.md) and [handoff](templates/task-handoff.md) for each trial. Programmatic runs require explicit task-scoped tool authorization; keep path restrictions, disable unrelated MCPs, use an external timeout and retain usage. Do not treat a worktree as a sandbox.

For unattended one-issue runs, use the [press-play launcher](copilot-launcher.md). It implements the isolated setup, task prompt, timeout, logs and usage reporting without a Codex session.
