# Issue #14: draft campaign-state contract

## Problem and evidence

Issue #14 is open. The local workbench resets edits on reload or design selection. The internal `reflow.design.v0` engine preserves source identity and protected fields for one operation, but there is no campaign record, correction rule, native revision tracking, persistence or undo. `docs/express-workflow.md` marks the in-host operations and creator storyboard unverified. Live #4, #7 and #10 remain open on September 22, 2026.

## Why it matters

A correction shared across variants can overwrite a later native edit, discard an exception, or leave only some variants changed. A precise draft lets the integration and creator tasks test the necessary operations and comprehension before anyone adds shared state or UI.

## Intended behavior and scope

Write a **draft**, implementation-independent contract in `docs/campaign-state-contract.md`. Define identities, revisions, rule/lock/exception scope, preview/apply preconditions, retry and partial-failure/undo semantics, and concrete examples. Separate current engine invariants from proposed host-dependent behavior. This task changes documentation only; it does not claim a functioning campaign workflow or approve implementation.

## Risks and failure modes

- Inventing native IDs, revision tokens, transactions, persistence or undo guarantees would make the contract misleading.
- A simplistic shared rule might break rigid groups, protected copy/styles or intentional local exceptions.
- A preview could become stale after source, rule, target, algorithm or native edits.
- Retrying an uncertain partial apply could duplicate or overwrite native nodes.
- A manual correction must not enter automatic first-round evaluation.

## Documentation acceptance checks

1. Each proposed field/operation has a defined owner and identity/version/precondition semantics; the document labels assumptions and unresolved host capabilities.
2. Work through shared correction, target exception, rule edit/removal, stale native edit, and partial apply/retry/undo examples without contradictory precedence.
3. Map every #14 acceptance point and dependencies #4/#7/#10 to current evidence, a missing proof, and a decision or scope change if unavailable.
4. Keep the existing `reflow.design.v0` and its validation/preservation behavior accurate; no claim of native persistence, browser or creator validation.
5. Verify local relative links, factual status against live issues, and the final diff. No artificial code tests for prose.

## Implementation steps and ownership

Own this plan and new contract document; add one discoverability link in README if it can be done without clashing with another task. Read current issue, engine contract, Express workflow and team plan; draft and cross-check examples/matrix; inspect links and diff; fetch/reconcile concurrent main before direct publication. Do not edit runtime/model/CI or sibling #12 files.

## Validation and handoff

Record the documentation checks and their outcomes below, publish the draft, link it on #14, and leave implementation gates and the issue open. Existing repository workflow covers this one-off specification; assess skill reuse at handoff.

## Execution record

The [draft contract](../campaign-state-contract.md) was written after checking live #14, #4, #7 and #10 (all open) and the existing internal/Express documentation on September 22, 2026. Acceptance review:

- Identity/version fields have explicit scope and revision rules. Host IDs, storage, transactions and undo remain questions for #4, not claimed capabilities.
- Worked cases cover a story exception, a rigid/lock conflict that blocks apply, rule revision/removal without implicit rollback, a stale native edit that blocks writes, and partial apply with read-back before retry. Each follows the contract's “all active hard constraints” and stale-preview rules.
- The matrix maps every #14 acceptance area to current evidence, #4/#7/#10 proof, and a reduced-scope decision if proof fails. It separates the current engine's tested one-call preservation from proposed campaign behavior and keeps manual correction outside automatic evaluation.
- Relative Markdown links in this plan and contract resolve locally; the illustrative JSON parses; `git diff --cached --check` is clean. No production code or code tests changed. The final publication/issue-link check is recorded in the task handoff.
