# Delegation workflows and first Copilot trial

## Scope and plan
Add reusable task/handoff templates, a minimal regression-fixture protocol, tiered verification and integration gates. Then run one bounded Copilot support task for #31 in a jo/ worktree. Existing issue ownership stays with Krush. No code in the coordinator checkout changes.

## Evidence and risks
#31 remains open with no comments; origin/main at2977f4c has no later split work. Absence of comments is not proof nobody is working locally. Restrict the trial to new split-lock module/tests so existing importer and corpus files cannot conflict. Keep incomplete parent scope open. Avoid fleet execution, unbounded credit consumption, or accepting worker-written tests as sole evidence.

## Acceptance
Documentation links and diff pass. A real Copilot session starts with exact file scope, tests-first requirements, a 30-credit soft cap and external 20-minute deadline; usage/output retained locally. The worker must stop with reviewable changes, not push/close an issue. Record actual completion or running state, never imply #31 is complete. Review and integration are separate from dispatch.
