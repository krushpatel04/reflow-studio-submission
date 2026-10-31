# Issue 31 — October 20 split-lock evidence

Status: **characterization and independent review complete; combined full validation pending; issue remains open.** Source baseline is `b7e8eab86df265580fa3ffab9ccda335ee8f6ef3`. [Plan](../../plans/astra12-d-20261020.md).

## What changed

Only tests and this evidence/plan were changed. Existing split modules already implement versioned assignments, deterministic reviewed additions, target/config hashes, retirement and exposure migration. No production defect was demonstrated, so no artificial failing test or speculative rewrite was introduced.

Three new characterization tests exercise actual temporary-file serialization and reload, repeated/reordered inputs, omission and return of known families, retained config review history, and synthetic exposure migration. They verify that a falsified prior-exposure record and resurrection of a retired identity are rejected. The template-marker control accepts same-family derivative files and rejects putting a shared template into a separate family. Synthetic approval/exposure metadata is explicitly test-only; it is not real family admission, permission or visual-independence evidence.

## Every original criterion

| Original issue requirement | Engineering evidence | Remaining acceptance |
|---|---|---|
| Persist versioned assignments; add/reorder/remove cannot move known families | Existing immutable family assignments plus new serialization/reload, duplicate-input, omission/return controls. Focused tests pass. | A accepted exact candidate 726ba37 with no findings and independently passed all 17 focused tests; combined full tests/build pending. |
| Explicit migration records old/new assignments and exposure; touched holdouts retired | Existing migration API records old/new family/split, prior exposure, reason/date; new persisted synthetic migration verifies retirement and rejects tampering. | Actual committed lock has no migrations; no claim of a real exposure review or actual private-source retirement. |
| New families, repeated templates/near-duplicate markers, restart/reorder; approved additions deterministic | Reviewed-addition reason/date survives reload; deterministic ordering, same-template derivative positive control and cross-family rejection pass. | Actual near-duplicate/independence and new-family admission remain custodian work. A template marker or nonempty review string does not prove visual independence. |
| Freeze target ratios/config/hash and reserve fresh external test families before tuning | Committed lock fingerprints and existing drift tests remain intact; current lock audit has no errors. | Zero test families in committed lock. Custodian must establish permissions, independent families and frozen private evaluation records; historical sealed selections are not opened or re-sourced. |

## Evidence observed

- Live issue snapshot: issue31 OPEN, no comments, last updated October11. The September26 amendment explicitly retains actual new-family/near-duplicate/exposure admission as unfinished.
- Baseline focused suite:14 tests pass, zero skips.
- Added characterization:17 tests pass, zero skips; production source unchanged.
- Actual committed split lock:10 families, all seen, zero test families and zero migrations. No corpus files changed.
- Host: macOS15.4 arm64, Node24.20.0. Focused tests used an existing tsx loader after verifying identical package-lock hashes; no historical candidate source was reused.

Commands and full results are in the accompanying text logs. Root canceled D's separate full-suite queue and assigned C to run `npm test` and `npm run build` on combined integration candidate `9ffb3088016df87e1e99a1e0c5dcdbcf0de789da`. [Source binding](integration-source-binding.json) verifies byte-identical D production modules and characterization tests in that candidate. Those combined checks are pending, not reported as passed. [A review receipt](independent-review-A.json) records independent acceptance of exact D candidate `726ba37ab97350e6c13c29642de8d4315435a594`. This task changes no layout, font or UI path; renderer/browser runs do not establish corpus family independence.

## Blocker and next action

Owner: source custodian, with an independent family/permissions reviewer. Action: supply an authorized admission decision and frozen private records for genuinely new external families, including duplicate/exposure disposition. Trigger: concrete new permission/review records and root-authorized admission scope. Until then, keep issue31 open and keep its original acceptance requirements; do not count this characterization slice toward the twelve-issue goal.

Existing repository tests-first and evidence procedures suffice. No new reusable skill was created; no vault or memory write occurred.
