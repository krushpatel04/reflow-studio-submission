# Automatic Copilot issue assistance

Problem: collaborators must currently choose an issue and type its number for every run. Deterministic selection should require no Codex session or model credits.

Behavior and scope: select the oldest open issue assigned to the authenticated GitHub user and explicitly labelled `copilot:ready`. Skip blocked, active, and reserved issues, including matching local worktrees. Preserve human ownership. Process one issue per click. An empty queue is a successful no-op. Preview is read-only. Existing manual mode remains available.

Risks: overlapping workers on different machines, stale issue state, starting broad or blocked epics, accumulating unreviewed diffs, and private context leaking into shared state. Use atomic GitHub branch reservations for the developer and issue, recheck eligibility before launch, and retain reservations through review. No private context belongs in reservation names or GitHub metadata. Reservations are coordination, not a security sandbox; all launchers must honor them. Explicit release follows review/integration or deliberate abandonment of retained work.

Implementation: add tested queue selection and reservation helpers; wire auto/preview/release commands into the launcher; make the macOS button run auto; document queue curation and recovery. Seed only bounded reviewed support tasks. Keep existing context, budget, isolation and validation behavior.

Acceptance: tests fail first for missing auto flags/behavior; cover own/other/unassigned/closed/blocked/active issues, deterministic order, existing reservations, empty queues, reservation conflicts and cleanup; verify preview does not claim or start a model; run npm test and npm run build; check shell syntax. Record evidence before publishing.

## Evidence and handoff

- Red: `npx tsx --test tests/copilot-auto.test.ts` failed on the baseline: `--auto` was unknown and selection/reservation behavior was absent. Captured locally in `/tmp/reflow-auto-red.log`.
- Green: seven focused tests cover eligibility, reservation races, collision cleanup, a real CLI preview with fake external executables, and the full launch/second-click/release lifecycle with mocked GitHub and Copilot. Wrong-issue release preserves claims and local work survives release.
- Live read-only preview selected #25 for `ojedaJD`; no Copilot run, claim, worktree or credits were used. GitHub `copilot:ready` was applied to #25 (JD), #29 (Junho) and #32 (Krush). #31 remains excluded because its prior trial has unreviewed local output.
- Full validation: 345 tests passed, production build passed, shell syntax and diff whitespace checks passed. A live GitHub claim/release smoke test for #25 created both coordination refs, verified a second preview refused new work, and removed both refs through --release. The ready label was restored afterward; zero claim refs remained and no model started.
- Limitations: ready labels encode dependency/file-ownership readiness; GitHub Project status is not queried. Separate older launchers or humans can bypass reservations. Post-acquisition failures retain claims for explicit recovery. Each run produces reviewable work, not an automatic claim of issue completion. Shared coordination commits contain only public metadata under the configured human identity.
- Skill assessment: no new skill is needed. The executable workflow and collaborator guide already capture the repeatable procedure without another overlapping instruction layer.
