# Press-play Copilot support

No Codex session is needed. Runs use the signed-in Copilot account and its allowance. Install/authenticate using [the local guide](copilot-workflow.md).

[Collaborator setup and optional private Obsidian context](collaborator-quickstart.md). Each person uses their own account and local configuration.

## Start

On macOS, double-click `Copilot-Assist.command` in the repository. It opens Terminal and automatically picks one eligible issue assigned to your authenticated GitHub account. No issue-number prompt or active Codex session is required. An empty queue exits without spending model credits.

From a terminal in this repository:

```sh
npm run assist -- --auto
# Read-only selection preview; no Copilot credits or reservations
npm run assist -- --preview-auto
# Manual selection still supports a narrower agreed scope
npm run assist -- --list
npm run assist -- --issue 31 --scope "Add a split-lock helper and tests; do not edit existing importer or corpus files"
# Defaults: 20 minutes total setup/work time, 30 AI credits (soft cap)
npm run assist -- --issue 29 --minutes 30 --credits 50
```

Choose a task that is ready and not already being edited by its owner. A narrow support slice does not complete the whole parent issue. The existing #31 trial worktree must be reviewed before starting another #31 session.

## Automatic queue and ownership

Maintainers mark a bounded, dependency-ready support task `copilot:ready`; its existing human assignee is the developer who can select it automatically. The launcher selects the lowest issue number from that person's open ready issues. It excludes reserved issues, local issue worktrees, and labels containing `blocked`, `in-progress`, `in progress`, `copilot:working` or `copilot:review`. Queue selection is deterministic and uses no model credits. It never takes an unassigned issue or changes human assignees.

The ready label is a maintainer readiness decision: resolve dependencies and coordinate file ownership before applying it. The launcher cannot infer all dependency relationships or read GitHub Project status without project permissions. It does not move Kanban cards. Do not mark broad epics, external approvals, or work already being edited as ready.

One developer reservation and one issue reservation are created atomically on GitHub, each through a create-ref operation. A competing launcher cannot overwrite them. A failed issue reservation releases only the newly acquired developer reservation. The names are `jo/assist-owner-LOGIN` and `jo/assist-claim-N`. They point to a unique empty coordination commit with the configured human Git identity and public owner/issue/time metadata; never merge these branches. No implementation code or vault content is uploaded. GitHub repository write access is required. Other clients and older launcher versions can bypass this protocol; collaborators should update together.

Manual launches also honor these reservations. Both reservations remain after completion, cancellation, or setup failure following acquisition, preventing another automatic issue from accumulating while an unreviewed run exists. A second click explains that existing work needs attention. Network errors fail visibly rather than falling back to uncoordinated work.

## What runs

1. Reads the live issue, comments and human assignees through authenticated `gh`.
2. Rejects closed/unassigned issues, another launcher lock for that issue, or a local worktree whose branch/path references the issue.
3. Fetches origin and creates a new `jo/assist-N-TIMESTAMP` worktree from origin's default branch. Existing main checkout edits remain untouched.
4. Installs locked dependencies with `npm ci` and runs Copilot Auto/efficiency with repository workflow instructions and the exact issue payload. The account/model request may fail if authentication, eligibility, credits or tool policies are unavailable; logs preserve the failure.
5. Retains edits, logs, usage and a handoff for review. The launcher does not commit implementation changes, push to main, reassign or close issues, and does not start the next issue automatically.

Run directories are printed and stored under `~/.local/share/reflow-assist/<repo-id>/<issue-timestamp>/`. Look for `worktree/`, `task.txt`, `session.log`, `install.log`, `usage.json` (if Copilot emits it), `base.txt`, `context-sources.json` and `status.json`. Completed workers are labeled **worker-finished-review-required**, not validated or landed. Copilot is asked to write `docs/plans/copilot-issue-N-handoff.md`.

The launcher authorizes tools for this one unattended task, leaves Copilot path checks enabled, disables built-in MCPs and denies common Git push/commit and gh tool routes. These are guardrails, not a security sandbox: general shell access is powerful and instructions are not an OS permission boundary. Use only trusted repository tasks. BYOK provider and blanket-permission environment overrides are removed for the worker; no provider API key is added. Your existing GitHub authentication remains available. Paid-overage/billing settings are not changed.

## Stop, inspect and integrate

Ctrl-C stops the active process group and keeps its files. An external total-time deadline includes dependency installation and model work; both graceful and forceful termination are used. The credit cap is soft and can be exceeded by the last model response; it does not guarantee remaining allowance or enforce a hard billing limit. The launcher does not use `/clear` or automatically replenish the budget.

Use `git -C /printed/worktree/path diff` and the handoff to review. Follow [the independent integration checklist](delegation-quality-workflow.md). Fetch concurrent changes before integrating using the configured human identity. No PR is required. Keep the worktree until useful changes are integrated or deliberately archived; do not delete it to bypass overlap checks.

After an interrupted crash, a stale lock may remain under the Git common directory's `copilot-assist-locks/N.lock`. Its `owner.json` identifies the process. Check that process and worktree before removing only a stale lock. Normal completion/cancellation releases it automatically. After reviewing/integrating or deliberately abandoning the run, release its shared reservation:

```sh
npm run assist -- --release 29
```

Release verifies the signed-in account's recorded issue/claim identity, removes `copilot:ready` to avoid immediately repeating completed work, then removes the issue and developer coordination refs. It does not stop a worker: stop the process first. Local changes remain. If another run is warranted, deliberately reapply the label and safely archive/remove the old issue worktree. If release is interrupted, rerun it; a missing issue ref is recoverable while the developer ref remains. Inspect `reservation.json`, `status.json`, and the remote refs if a network failure made acquisition uncertain; never delete another person's claim. Existing sessions can also be resumed manually with Copilot's session commands inside their worktree.

## Validation and limits

Tests cover option rejection, human ownership/open status, exact issue/scope handoff, setup failure, literal shell arguments, UTF-8 capture and process timeout. Full npm test/build and shell syntax checks are required for launcher changes. Help/list and an overlap refusal are tested without spending model credits; no new issue is claimed implemented by launcher validation. Skill assessment: this documented launcher and existing templates cover the workflow; no extra skill is needed.

## Vault context

Configure optional read-only startup/project notes with `--configure-vault PATH --project-note RELATIVE.md`; preview filenames with `--context`, or bypass with `--no-vault`. Notes are bounded, passed through stdin and excluded from saved task briefs. The vault is never added as a trusted worker directory and is not modified by the loader. Copilot provider requests and private local session logs may contain the excerpts; do not share those logs. See the collaborator guide for missing/truncated-note behavior and manual-only memory policy.
