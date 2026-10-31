# Offline roadmap and adversarial review — September 22, 2026

## Problem and evidence
GitHub has only M1; #23 and #24 are closed, while broad issues mix landed slices with unmet external/quality gates. The user requests future milestones, a lightweight offline engine/viewer, adversarial gap review (including Krush’s #7), and actionable assigned issues without filling In Progress.

## Intended behavior and scope
Audit current main and live issue evidence. Independently challenge engine/resource safety, viewer responsiveness, and corpus/evaluation integrity. Publish a dated roadmap and finite issues; preserve existing ownership and broad acceptance. No runtime implementation, model adoption, human outreach, or vault updates. Resource safeguards stay bounded; corpus pilot sizes must not become hidden coverage ceilings.

## Risks
Avoid duplicate issues, invented official limits, declaring all inputs error-free, moving unfinished work to Done, or treating imports/internal scores as independent quality. Separate reproducible defects, code-observed risks and missing evidence. Do not disrupt teammates’ concurrent commits.

## Steps and ownership
1. Review repository instructions, progress, live milestones/issues and both completed task handoffs.
2. Read-only independent engine, viewer and #7 adversarial reviews; coordinator reconciles gaps with existing issues.
3. Define milestone exit gates and dependencies without invented dates. Add only finite uncovered deliverables with role-appropriate assignees.
4. Publish linked roadmap/review and update coordination metadata; verify GitHub mutations and local links/diff. Direct main publication is authorized; fetch before pushing.

## Acceptance checks
- Every new milestone has distinct scope, exit evidence and dependency rules.
- Every new issue has a confirmed assignee, evidence, bounded scope, meaningful positive/negative acceptance and closure criteria.
- #7 review distinguishes landed imports, conversion fidelity, split integrity, coverage and independent judgments.
- Lightweight policy measures runtime/memory/artifact cost; rejects or reports unsupported inputs explicitly and preserves valid controls.
- Existing completed issues remain closed; new planning does not mark backlog work In Progress.
- Validate relative links, GitHub assignments/milestones, factual claims and final diff. Documentation-only work needs no artificial production tests.

## Skill assessment
No listed skill materially covers this repository/GitHub roadmap audit; repository workflow and scoped adversarial code review are applicable. Review whether the resulting procedure merits a reusable skill at handoff rather than creating one automatically.

## Execution record
Initial read verified M1 alone, completed #23/#24, and Krush’s landed LICA importer/corpus. Three read-only reviewers are examining independent failure surfaces. Findings and publication evidence follow in the linked roadmap.

### Published planning results
Created milestones M2–M5 and issues #25–#35 with confirmed assignees and milestone membership. Retained M1 acceptance and closed #23/#24. Set previously documented owners on #4/#6/#7/#9/#10; linked scoped follow-ups from #7/#8/#11; placed conditional ML issues in M3 and #14 in M5. No implementation was dispatched or Project column mutated.

Three independent reviews returned numerical/output/measurement, Unicode-stream, viewer lifecycle/export, split drift and corpus fidelity/accounting findings. The [dated review](../roadmap-2026-09-22.md) distinguishes reproduced probes from code-observed risks and collaborator observations.

Validation: `npm run corpus:check` returned zero errors and one expected warning for zero sealed test families. GitHub API readback verified all 11 new issue assignees/milestones, all five milestones, existing documented owners and closed #23/#24. Markdown target checks and `git diff --check` passed. No production code changed, so full runtime tests were not rerun for this planning publication. Main's preceding hosted CI was verified successful at 4adaba4. Project access retry failed for missing read:project; no board completion or automatic status change is claimed.

Skill assessment: no new skill; existing repository workflow and focused independent review cover this repeatable process without another generic planning layer.
