# Research priorities and branch naming

## Problem and evidence

The September 15 competitive research report proposes more specific qualification priorities and acceptance evidence than the current task breakdown. The owner requests that existing GitHub issues reflect it and that branch names use `jo/` instead of the previous tool-name prefix. The local checkout currently has one such local branch and five corresponding remote-tracking branches; live GitHub state must be verified.

## Intended behavior and scope

- Update existing issue bodies with actionable research additions, ownership, dependencies, priority and acceptance checks. Preserve completed work, issue state, assignees and unrelated requirements.
- Update the roadmap to distinguish qualification work from optional finale work and link the research and this plan.
- Rename matching repository branches to `jo/` names while preserving commit IDs, local tracking and any active PR relationships where possible.
- Record `jo/` as the required prefix for optional branches. Direct work on `main` remains the default.
- Keep concurrent engine work untouched. No production code changes are needed.

## Risks and failure modes

Issue edits could overwrite concurrent progress or duplicate scope. Refresh each issue before editing and preserve existing content. Branch replacement could lose a commit, affect an open PR or collide with an existing target name; inspect live refs, worktrees and PRs first, preserve exact SHAs, and verify new refs before removing old names. Avoid force pushes and history rewrites.

## Acceptance checks

- Every research priority is mapped to an existing issue and has observable acceptance evidence, including independent evaluation, input coverage, typography-aware search, visibility, group semantics, runtime and native integration.
- Completed work and owner assignments remain intact; campaign correction and family-story scope stay separate from qualification gates.
- GitHub and local branch inventories contain no case-insensitive occurrence of the prohibited tool name, and every renamed branch retains its original SHA.
- Contributor instructions require `jo/` for new branches; no new AI author/co-author credits.
- Changed Markdown links resolve locally or point to verified repository resources; the focused diff passes whitespace checks.

## Implementation steps and ownership

This task owns this plan, branch-convention edits in `AGENTS.md`/`CONTRIBUTING.md`, GitHub issue updates, and branch renames. Read the current issues and live refs, prepare scoped additions, apply and read back each issue, rename/verify refs, then publish only this task's documentation. Coordinate by preserving the engine task's working files and refreshing shared remote state before publication.

## Validation and handoff

This is metadata/documentation work: use the acceptance checks above; no artificial code tests or engine test run. Report issue links, branch mappings, unchanged commit evidence, publication and any limitations. Assess skill reuse at completion.

## Execution record

- Initial inspection: concurrent engine work is present and remains outside this task. GitHub CLI authentication is unavailable; the connected GitHub tools and existing Git SSH access will be used.
- The GitHub connector also lacked private-repository access. Used the existing signed-in browser to read, edit and reload the issue bodies; no new authentication or messages to other people were needed.
- Updated all 13 existing issues, [#2 through #14](https://github.com/ojedaJD/reflow-studio/issues/11), preserving issue states, assignees, prior requirements and completion evidence. #2 remains closed; compatibility follow-ups belong in #4/#8. The roadmap maps P0 qualification compatibility/evaluation/execution, P1 engine/typography/rendering/CI, and P2 product/finale work. Every issue links the research, this plan and test-first workflow.
- Added measured text allocation, rigid versus reflowable semantics, generation-versus-selection diagnosis, bounded repair, rendered visibility/crop evidence, input-coverage denominators, LICA conversion checks, sealed family splits, blind comparisons and cleanup measurements to the responsible existing tasks. No production functionality is claimed as completed by these edits.
- Reconciled mandatory PR/review wording with the existing direct-to-main policy and documented `jo/` optional branches in the roadmap, quality issue, `AGENTS.md`, and `CONTRIBUTING.md`.
- Four live GitHub branches were renamed with identical commit IDs (table below). The fifth initial remote-tracking name was already absent from GitHub and was pruned. Renamed the sole matching local branch and updated its upstream. No open PRs were listed; main and concurrent engine work were preserved. The native GitHub rename handled the first branch; the remaining three replacements were one atomic Git push with exact existing commit IDs, without force.

| Current branch | Preserved commit |
| --- | --- |
| `jo/adversarial-review-plan` | `84d07ad4d1e427937db5c9af3d828664b534bb35` |
| `jo/engine-contract-issue-2` | `a88bb32d184e80969cd4e722befbb5976cc20c90` |
| `jo/share-benchmark-evidence` | `5eaddbda8210ba80836c3d84e41f676cbd72190c` |
| `jo/sign-shop-story-context` | `ed33b343bc085558eb21d80c32ac3393214717d0` |

Issue edits were checked after reload. Local/live remote branch inventories and SHA preservation were checked. Publication uses only the three documentation files owned by this task. Code tests are not applicable to metadata/prose changes.

The local engine-contract branch was already ahead of its remote at `98b2eb1a4d0610a84208dd28c7d11d9840e08190`; its rename preserves that local commit. An initial verification incorrectly assumed identical local and remote tips. The rename reflog confirms the local tip is unchanged, and the upstream now points to `origin/jo/engine-contract-issue-2`. No reset or synchronization of those distinct tips was performed.

The browser skill supported issue editing; its CLI was unavailable, so the connected browser was used. Existing contributor instructions and the plan-first workflow cover this repeatable task; no new reusable skill is needed. Other collaborators' local clones are outside this checkout: they should fetch with pruning and rename a checked-out old branch to its matching `jo/` name if needed. Historical issue comments and merged-PR text remain historical records.
