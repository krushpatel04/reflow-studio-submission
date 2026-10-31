# Reflow source-aligned execution plan — A1 to A4

> **Superseded architecture choice:** User selected pure Python on October 6. The TS subprocess option in A2 is no longer under consideration. Execute [the Python migration packet](2026-10-06-python-migration.md), then continue the source-aligned quality/offline gates.

## 1. Assignment Header
ID: ADOBE-A1–A4. Channel: Reflow. Lifecycle: **PAUSED / NOT ACTIVATED** by user. Target date: not scheduled; no extension to the prior midnight run. Upstream: `jhaaj08/chameleon@a44a06046b0413f0785e7203955c3822e0acbc32`. Inspected Reflow main: `927e7acbd3773b3e51a4e7fa9e4d7c0f25c96148`; refresh main on activation. Coordinator owns sequencing and integration; CLI Engineer owns A1/A4 packaging; Engine Engineer owns A2/A3 engine work; Typography Engineer supplies bounded font/fidelity analysis; Reviewer independently reviews exact revisions. Support owners remain idle unless assigned disjoint files.

Dependencies: source reconciliation merged and issue read-back complete before activation. A2 depends on A1 genuine rendering; A3 depends on A2 roundtrip; A4 depends on A3 accepted candidate. A verified environment failure parks only its dependent work. Model use is optional and cannot block deterministic baseline work.

## 2. Task
Make Reflow reproducible through Adobe's supplied Python contract and resources, then measure layout quality with genuine rendering and offline packaging. Preserve the existing TypeScript implementation and collaborator evidence; no full rewrite, speculative ML, sealed sources, submission/registration, native deployment or hardware work in this packet. No implementation begins while channel is paused.

Ownership is assigned before each slice: A1/A4 submission packaging under a proposed `submission/chameleon/` boundary and reproduction scripts; A2/A3 `engine/resize.py` integration plus necessary mapped Reflow interfaces; typography only owned resource adapters/tests. These paths are proposed, not delivered. Upstream renderer/orchestrator/schema/assets remain unchanged unless a reproduced defect requires a reviewed narrow patch with explicit provenance.

## 3. Steps
1. **A1:** clone/verify pinned upstream and source-manifest hashes in an isolated environment. Record actual Python/OS/dependency versions. Run `python -m engine.main` on all three samples with real renderer import positively checked. Keep all outputs and warnings; compare genuine rendering against an intentional fallback fault control. Diagnose concrete dependency errors once, then report required intervention.
2. **A2:** inspect actual `src/official-adapter.ts`, `scripts/official-cli.ts`, upstream schema/resize contract and brand fonts. Build a complete supported/adapted/unsupported matrix. Compare offline TypeScript invocation packaging against a bounded Python implementation; record choice, dependencies and cost before editing. Write meaningful failing contract/preservation tests for the chosen entry point, then implement the smallest bridge/layout slice. Do not require manual role labels, substitute fonts or silently drop fields.
3. **A3:** reproduce baseline and candidate under identical renderer/assets/fonts on the three public samples and permitted independent development/validation inputs. Write red tests for observed layout defects; improve one bounded behavior at a time. Retain all cases and failures, including extreme targets, group relationships, rotation and intentional absent assets. Require independent visual review with method names hidden where applicable; no hidden official score or generalization claim.
4. **A4:** freeze final dependency versions/commits; build the supplied linux/amd64 container-compatible submission and run it with `--network none`. Mount fresh input/output, verify original task bytes unchanged, JSON integrity and real PNGs. Independently reproduce from documented commands; collect final-SHA tests/build/review/publication and verified main inclusion.
5. Only after each slice reaches its DoD, select the next dependency-ready slice. If a protected field cannot be supported, report it explicitly rather than pretending all official inputs work.

## 4. Requirements
D = delivered/observed source or implementation fact; H = proposed implementation; V = verification required.

| ID | Class | Requirement | Evidence |
| --- | --- | --- | --- |
| R1 | D/V | Pinned Adobe source identity, existing schema provisional status and authoritative conflict register | source manifest; A1 dependency/version log |
| R2 | H/V | Python `resize(source,target_canvas)` returns correct canvas and identical ID multiset/count, with source unchanged | proposed official-entrypoint tests, JSON snapshots |
| R3 | H/V | Preserve text/font family/assets/pixels, groups/layers/style properties; handle unsupported fields visibly | field matrix and positive/negative preservation tests |
| R4 | D/V | Real converter/cr-renderer plus supplied assets/fonts, never box fallback presented as success | renderer path evidence and deliberate import-failure control |
| R5 | H/V | Candidate rearranges rather than uniformly stretches and is assessed on every attempted case | baseline/candidate bundle, failures, independent review |
| R6 | H/V | Build-time dependencies and no runtime network/API/download; reproducible JSON+PNG | network-disabled container run and fresh reproduction |
| R7 | D/V | Public samples remain development only; sealed sources untouched; model/hardware uncertainties explicit | manifest/split ledger and source conflict register |
| R8 | H/V | Final combined SHA validated/reviewed and pushed/merged only with current-main ancestry and applicable CI | command logs, exact-SHA verdict, PR/main proof |

## 5. Required Regression Coverage
Existing internal tests remain a separate gate: `npm test`, `npm run build`, `npx tsc --noEmit` on code-changing Reflow slices. Layout/font changes also use repository native/benchmark/browser checks required by the actual affected files. Do not repeatedly run whole suites at every handoff.

Proposed tests (not existing or passed): `tests/official-entrypoint.test.py` for R2/R3; `tests/official-renderer.test.py` for R4, including missing import never qualifying as real rendering; `tests/official-layout-regression.test.py` for R5; `tests/official-offline.test.py` or equivalent container assertions for R6. Commands must collect nonzero tests, preserve exact logs/exit codes and name source SHA/cwd/host. Public sample corpus includes 4/11/17 elements and the deliberate missing holiday badge. Add identity resize, duplicate/missing IDs, absent resources, role-free inputs, extreme target, image aspect ratio/cover distinction, actual font family and style/group/rotation controls. Reject mutation of task input; distinguish allowed source bleed warnings from output acceptance rather than weakening checks globally.

Evidence output is proposed `reports/adobe-A*/` and a reviewed dated snapshot under `docs/evidence/`; generated caches/builds/weights are not committed as documentary proof. No test or benchmark result is asserted by this plan.

## 6. Worker Loop
Use the established Quoroum event-driven mode after explicit restart. Coordinator reads authoritative history and paused/source state, binds one owner and reviewer, posts scope and source SHA, and sends finite implementation handoffs. A runtime return is not acceptance. DoD triggers NEXT_PLAN within the authorized window; an external blocker gets one bounded recovery and exact escalation. No indefinite nested worker loops, extra timers or broad process kills.

## 7. Mandatory Wait/Catch-Up Protocol
On every wake or handoff return, refresh All and relevant peer history, handle new human instructions first, then review findings, then implementation; persist processed message cursor in project runtime state. Existing REST messages are verified catch-up transport, not an invented native wait tool. User pause overrides earlier run authorization. Do not ask again for routine reversible development choices already covered by the task.

## 8. Communication Rules
All chat receives consequential plan/results/blockers; routine mechanics target coordinator only. Results include exact SHA, owned files, host/cwd, command/exit/counts/skips, artifact paths/hashes, review verdict and remaining limits. Keep credentials, mailbox content, account identity/priority and raw private logs out of channel/public docs. GitHub authentication stays on the Mac bridge. No force push main, protections bypass, sealed source exposure, registrations or mail sending.

## 9. Reviewer Messages Are Active Work
Reviewer inspects the final combined SHA, verifies source/protected-field behavior and genuine renderer evidence, and separates local passing tests from scoring/native acceptance. Owner addresses actionable findings before unrelated work, reruns relevant checks and requests review on the new SHA. Current-main integration changes SHA and requires corresponding evidence; identical trees alone do not satisfy bridge ancestry requirements. No approval based solely on an agent's success claim.

## 10. Development Topology
Source reconciliation is on the authenticated local Mac. Existing engineering/validation host is `nala@100.71.232.111`, with isolated agent checkouts; coordinator/reviewer exchange refs synchronize objects but do not synchronize working trees. Resolve the proposed submission workspace, Python environment, renderer dependency installation and available container engine before A1/A4. User-owned dependencies may be installed within authorized scope; shared caches stay intact. Mac bridge publishes and merges, then refreshes main. Adobe reference hardware is M5 Pro with exact limits pending; do not invent a match. No deployment topology is introduced.

## DoD Checklist
- [ ] R1: source pin/version/hash and ambiguity record confirmed.
- [ ] R2/R3: Python contract and protected properties pass meaningful nonzero tests with no input mutation or role sidecar requirement.
- [ ] R4: all three sample PNGs positively use genuine renderer; fallback fault control fails qualification.
- [ ] R5/R7: complete attempted-case ledger and independent review; no sealed/test contamination or official-quality overclaim.
- [ ] R6: fresh network-disabled container reproduction with identical documented inputs/dependencies.
- [ ] R8: final-SHA internal/full build gates, independent review and GitHub head/main inclusion observed.
- [ ] Scoped plan, ownership, cursor catch-up and durable handoffs recorded; useful skills tried on real work rather than automatically proliferated.

## Handoff Note
First read the October 5 source audit, upstream README/RULES/schema/resize/main and the new roadmap. Reflow is paused: preserve code and do not activate this packet until the parent completes source reconciliation and issues the restart instruction. Start A1 with a finite genuine-renderer reproduction plan, not an algorithm rewrite or another advisory-only improvement.
