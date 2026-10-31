# Collaborator quickstart: Copilot support launcher

The launcher is shared through this repository. It does not require Codex, access to JD's computer, JD's vault, or shared credentials. Each person uses their own GitHub/Copilot account and allowance. macOS is locally verified; the terminal workflow targets macOS/Linux. Native Windows is not verified—use a compatible Linux environment and verify its tooling first.

## Install once

Install Git, Node.js 22.12+ (Node24 tested), GitHub CLI (`gh`), and an active Copilot account. Authenticate using your own account:

```sh
npm install -g @github/copilot
gh auth login
copilot login
git clone git@github.com:kj-squared-labs/reflow-studio.git
cd reflow-studio
npm ci
npm run assist -- --help
```

Existing authenticated users need not sign in again. Check the repository's current supported CLI flags after upgrading; this setup was verified with Copilot1.0.87. GitHub Education activation and usage allowances are per account; the launcher does not enroll anyone or enable paid overages.

## Optional personal Obsidian context

Opt in only to notes you want sent to Copilot. Configuration is stored locally in `~/.config/reflow-assist/config.json` with user-only file permissions, never committed. No vault is required for collaborators who prefer repository context alone.

```sh
npm run assist -- --configure-vault '/absolute/path/to/your/vault' --project-note 'Projects/Reflow.md'
npm run assist -- --context
```

The preview lists selected filenames/warnings, not note contents. The loader reads `AI_CONTEXT.md`, `00-Home/Current Focus.md`, and the configured relative project note. Without a project note, it uses `99-System/AI/Project Index.md`. Missing notes are disclosed; a configured missing vault or outside-vault symlink is an error. Limit:12,000bytes per selected note, with truncation reported. No crawling, attachments, index refreshes or model-driven vault directory access is enabled.

The model is told to use this context first, treat notes as dated evidence, verify mutable facts and preserve manual-only memory updates. It must not write, ingest, recap, sync or rebuild the vault automatically. This launcher intentionally does not implement a save-memory command. Saving requires a separate explicit request and the person's established workflow.

Excerpts go to the Copilot provider through stdin, not command-line arguments or the saved `task.txt`. Local Copilot sessions/logs can contain those excerpts or their summaries. Run directories are user-only on POSIX systems; **do not share raw logs, session exports or personal configuration**. Review handoffs for private details. These are software/procedure guardrails, not an OS sandbox or guaranteed data-loss-prevention boundary. Only send notes appropriate for your Copilot account/provider.

Skip vault context for one task with:

```sh
npm run assist -- --issue 29 --no-vault
```

## Press play

Double-click `Copilot-Assist.command` on macOS, or run:

```sh
npm run assist -- --auto
# Optional preview without using Copilot:
npm run assist -- --preview-auto
```

The launcher picks your oldest open `copilot:ready` issue, preserving your human assignment. Maintainers apply that label only to a bounded, dependency-ready task with coordinated file ownership. It skips blocked/active labels and existing reservations; no eligible task means no run. One shared developer reservation prevents another task from starting while the previous run still needs review. Manual scope remains available with `--issue N --scope "agreed scope"`. Defaults are20minutes total and30AI credits (soft cap). Ctrl-C stops the process group and preserves changes. An existing issue worktree prevents duplicate work until reviewed and deliberately integrated/archived.

The worker plans, writes failing tests, implements, validates and returns a handoff. It does not automatically push, merge or close issues. Review using [the integration checklist](delegation-quality-workflow.md), then land under your configured human Git identity. After stopping and reviewing/integrating or deliberately abandoning the run, use `npm run assist -- --release N`. This removes the ready label and remote coordination refs while retaining local work. Output, usage and limitations are described in [the launcher guide](copilot-launcher.md).

## Sharing

Send teammates the repository link to this guide; they pull the same committed scripts and instructions. Do not send local vault files, tokens or a pre-authenticated installation. No collaborator messages are sent automatically by the launcher. Optional future deeper retrieval should be a separately scoped read-only feature, not unrestricted vault access.

Initial ready queue (2026-09-22): JD #25 (CLI Unicode), Junho #29 (offline SVG export), Krush #32 (import outcome accounting). Live labels and assignments take precedence over this dated list. The earlier #31 helper trial needs review before another worker tackles that issue.
