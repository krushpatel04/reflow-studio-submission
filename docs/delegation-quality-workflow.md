# Delegation, regression and integration workflow

Use the [task brief](templates/delegated-task.md) and [handoff](templates/task-handoff.md) with the [local Copilot guide](copilot-workflow.md). This supplements the existing [development workflow](development-workflow.md), without adding mandatory PRs or teammate approval.

## Assign and isolate

One active implementation per person, plus at most one explicitly scoped support worker. Check current issues/commits and define file ownership. Each worker uses a separate jo/ worktree and one finite deliverable. A support slice does not complete its parent issue. Keep inactive umbrellas out of In Progress; record real dependencies rather than claiming Done.

## Retain the smallest useful failure

1. Reproduce the observed defect and preserve the original input/source permission and commit/config/resource hashes.
2. Reduce elements, text, groups and dimensions while preserving the same failure; never use a sealed test family for tuning without recording retirement/exposure.
3. Put a small deterministic case in the existing appropriate tests/ fixture location. Include a valid nearby positive control and the exact externally meaningful assertion. Avoid large assets when a small synthetic example reproduces the failure.
4. Run it against pre-fix code, then the fix. Keep invalid setup distinct from behavioral failure. Rendering defects need native/browser visual evidence; metrics alone are insufficient.
5. Archive only reviewed necessary evidence under docs/evidence; fresh logs/reports stay ignored under reports/. Retain unsupported/failed rows in evaluation totals.

## Verification tiers

- Iteration: focused behavioral tests and relevant characterization controls.
- Before landing code: npm test and npm run build, always.
- Layout/fonts: additionally npm run verify, npm run benchmark, representative image inspection.
- UI: additionally running app /verify.html and affected interaction/keyboard/viewport checks.
- Docs/config: content/link/diff checks plus actual applicable command/config validation; no artificial prose tests.
- Performance/independent quality: use #30–#33 and #7's existing planned gates. This guide does not claim these gates already exist. Repeat expensive checks only for relevant changes or unresolved evidence.

## Coordinator integration checklist

- [ ] Compare output with original acceptance, not only the worker's summary; inspect the diff for changed expectations, missing cases and scope drift.
- [ ] Independently exercise a meaningful adversarial condition for correctness-sensitive changes and a positive control. Don't duplicate implementation logic in the oracle.
- [ ] Verify captured test-first and final evidence at the actual reviewed revision; disclose omitted checks.
- [ ] Check source preservation, error visibility, offline behavior and incremental resource cost as relevant.
- [ ] Fetch concurrent commits; integrate without reverting others or force-pushing. Rerun affected checks after conflicts or meaningful base changes.
- [ ] Publish with the configured human identity, no AI co-author credit. PR remains optional.
- [ ] Link landed evidence and close only fully satisfied issues. Do not move partial umbrellas to Done.

## Measure delegation value

Record in each handoff: issue/slice, worker/version, credit allowance and actual credits, wall time, coordinator review minutes, corrective iterations, acceptance result and whether landed. Credit caps are soft; wall time is not human effort. Compare similar task types after a few trials; don't invent a token-saving percentage or create a separate analytics service. Stop expanding parallelism when rework or coordination outweighs implementation savings.

Skill assessment: repository templates are sufficient for now. A separate skill should follow repeated evidence of a missing procedure, not be created automatically.
