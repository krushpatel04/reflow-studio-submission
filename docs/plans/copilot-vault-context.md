# Portable collaborator launcher and read-only vault context

## Scope and behavior
Make the published launcher easy to share via the repository. Each person uses their own account and optional local-only vault configuration. JD explicitly requests the existing vault-first context policy: read AI_CONTEXT.md, Current Focus and the configured relevant project note before substantive work. No automatic writes, ingestion, indexing, recap or memory sync. Do not transmit private notes to collaborators or bake absolute personal paths into tracked files.

## Plan and risks
Test configuration and bounded reads before implementation: absent config is optional, configured missing vault errors clearly, traversal/symlink escape is rejected, only selected files load, truncation/missing notes are disclosed, and vault bytes are unchanged. Keep private note content out of persisted task briefs and tracked handoffs; model request/private local logs can contain it and must be disclosed. Use restrictive local run/config permissions. Never grant the worker broad vault directory access or import vault plugins. This is contextual assistance with reviewable output, not a new unlimited autonomous agent.

## Acceptance
Add configure/preview/disable controls and collaborator quickstart. Test actual prompt delivery through the existing launcher seam plus filesystem controls and no-write behavior. Run npm test/build and shell syntax. Configure JD's vault locally and verify metadata-only preview; do not start another task or update the vault. Share through repo documentation without messaging collaborators automatically.

## Validation and handoff
Initial focused stub run failed four behavioral cases (one optional-context control passed). Implemented bounded regular-file reads, selected-note-only loading, traversal/symlink rejection, per-user configuration and optional bypass. Final `npm test` passed338/338; `npm run build`, shell syntax, link/diff checks passed. Actual Copilot stdin smoke exited0 and returned VAULT_PIPE_OK using synthetic context only. JD local metadata-only preview reads three requested notes without warnings; personal paths/configuration and note contents are not committed. No vault writes or collaborator messages were performed. Run logs remain private and may include provider-visible context. Collaborator guide is published via the repo; native Windows remains unverified. Existing repository templates cover this workflow, so no separate skill was added.
