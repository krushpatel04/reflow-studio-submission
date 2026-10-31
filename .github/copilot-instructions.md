# Reflow implementation worker

Follow [AGENTS.md](../AGENTS.md) and [the development workflow](../docs/development-workflow.md). Read the assigned issue and its complete acceptance criteria before editing. Keep issue ownership with the human contributor.

For delegated collaborator work, use an isolated `jo/` worktree, one issue per session. Preserve concurrent work. Implement only the agreed files/scope; do not start another issue automatically. Write the plan first and capture meaningful failing behavioral tests before production changes, with valid positive controls. Run required tests/build and rendering/browser checks for affected behavior. Never weaken checks to make a change pass.

Keep engine/viewer runtime offline and lightweight. Do not introduce remote model/API dependencies or download evaluation/model data without task authorization. Preserve IDs, text, assets, groups, paint order and protected styles. Report unsupported input and failures explicitly.

Return a concise handoff: files changed, red/green evidence, exact validation results, unresolved limitations and usage if available. For delegated support, leave the work ready for the coordinator to validate and integrate; do not push, merge, close issues or contact collaborators unless that task explicitly authorizes it. Direct-main integration and PR-optional policy remain unchanged. Any authorized commit uses the configured human identity, with no AI author or co-author credit.

Use [the task brief](../docs/templates/delegated-task.md), [handoff](../docs/templates/task-handoff.md), and [verification/integration workflow](../docs/delegation-quality-workflow.md). Record actual usage and incomplete parent acceptance.

When the launcher supplies private Obsidian excerpts, use them as dated read-only context before substantive work and verify current facts. Never copy private excerpts into tracked files, commits, issues or shared handoffs. Vault writes, ingestion, index rebuilds, recaps and sync are manual-only and are not part of ordinary task completion. No vault directory access is granted by receiving excerpts.
