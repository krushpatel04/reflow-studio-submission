> Historical checkpoint: subsequent publication and review progress is tracked in [the publication queue](../../plans/reflow-through-2026-10-10/publication-queue.md). Consumer receipt and ownership corrections in this snapshot supersede earlier missing-receipt/proposed-owner entries. No full issue completion is implied.

# Package DoD map: #102 KR-01, #103 KR-02, #104 JH-01, #105 JH-02, #112 Krush — 2026-10-11

Prerequisite-slice accounting only; not a new audit. No edits or claims in any packet path, no commit or export.

## Sources

- #102, #103, #104, #105 and #112 issue bodies: root-supplied authenticated metadata relayed by Coordinator; excerpts only, cited as the root-supplied issue bodies. They supersede only the "body not supplied" wording for these five issues in `ownership-release-2026-10-11.md` (SHA256 `60df64fc…`, commit `199360ec`), which is otherwise unchanged.
- The ownership release and the Tuesday cutoff supersede the historical assignment text ("Human claimant — Package A", "channels keep these areas reserved"). Human acceptance gates are retained.
- Existing approved evidence is cited, not re-reviewed:
  - closure `accepted-development-closure-01.json`, 42376 bytes, SHA256 `b740635c…`, with a prior independent Reviewer PASS (Coordinator-reported);
  - `human-review-index-01.md` (SHA256 `ae387e87…`), recording human acceptance of three version bindings (flowers and financial development-v4 revision-2; INSPIRING development-v3) with science quarantined;
  - frozen manifest `67e8c30f…` with 49 payload files and a prior independent artifact PASS; Engine3 consumer receipt not supplied;
  - RF04 limits per `next-action-handoff.md` and its correction.
- Local facts: `docs/evidence/kr-01/` is absent in this checkout. Baseline `42ce598` resolves to a commit locally. Validation against current main has not been done. No KR-02 or JH-01 scope path is tracked locally (`docs/evaluation/rubric.md`, `docs/evaluation/blind-review/`, `docs/evidence/kr-02/`, `reports/kr-02/`, `docs/express/`, `experimental/addon/`, `docs/evidence/jh-01/`, `reports/jh-01/`, `docs/plans/kr-02-2026-10-13.md`, `docs/plans/jh-01-2026-10-13.md`). No JH-02 or #112 scope path is tracked locally (`docs/evaluation/typography/`, `docs/plans/jh-02-2026-10-13.md`, `docs/evidence/jh-02/`, `reports/jh-02/`, `docs/plans/krush-next-2026-10-08/implementation.md`, `docs/evidence/kr-01-next/`, `reports/kr-01-next/`). Objects `63688bc7` and `75f0ac12` resolve to commits locally; `d3016a6a` does not resolve locally.

## #102 KR-01 DoD map

| Item (root-supplied body) | Existing evidence | Missing | Status |
| --- | --- | --- | --- |
| Task: audit sources/ledgers against original copy, assets, hashes, fonts, crop semantics | Closure `b740635c…` records source layers, 21 tasks, element mappings, asset originals/derivatives, font faces/licenses and actual index hashes; Reviewer PASS | Crop-semantics audit not separately supplied; scope is three accepted bindings, not all admitted sources | PARTIAL |
| Task: resolve or explicitly exclude unsupported cases, with accounting and positive controls | Science `7Q7IF7mtixq3LY18EIAZ` explicitly quarantined (human review index) | Accounting of all admitted sources; positive controls not supplied | PARTIAL |
| Task: freeze a versioned bundle for RF-04 (no substitution/relabeling/sealed material/family change) | Manifest `67e8c30f…`, 49 payload files, prior artifact PASS; v3/v4 namespaces kept separate | Engine3 consumer receipt not supplied; family-assignment invariance check not supplied | PARTIAL |
| Task: hand off source-fidelity evidence for an independent review closing #34 | not supplied | Handoff and #34 review | OPEN |
| KR-01-D1 protected fields, rules, source provenance checked | Closure PASS covers source-layer provenance and hashes for the three bindings | Protected-field rules check not supplied | PARTIAL |
| KR-01-H1 scoped behavior plus paired controls/evidence | not supplied | Paired controls | OPEN |
| KR-01-V1 actual checks, exact-SHA independent review, integrated CI, limits | Exact-hash Reviewer PASS for the closure only. RF04 limits: integrated tree/CI not qualified; full suite 480 with 12 failures + 1 error; npm prerequisite FAIL | Gates `verify_python.py`, `npm test`, `npm run build` on current main; integrated CI | OPEN |
| Ownership, dependencies, catch-up and cutoff rules followed | Ownership release recorded (commit `199360ec`); cutoff Tue 2026-10-13 12:00Z | Exact-file claim before any KR-01 edit (none made) | OPEN |
| Independent reviewer: named teammate plus channel reviewer; no self-approval | Channel Reviewer PASS on the closure only | Named teammate reviewer not supplied | OPEN |
| Issue/card updated from evidence; parent stays open unless all criteria met | — | No update recommended; #102 and parent #34 stay open | OPEN |
| Artifact KR-01-E1 `docs/evidence/kr-01/README.md` (PROPOSED) | Absent locally | Commands, machine, exact hashes, failure/positive controls, nonzero test count, zero unexplained skips, review receipt | OPEN |
| Human acceptance gate | Human dispositions for three bindings (human review index) | Independent human evaluation for further DoD remains a gate no agent can satisfy | RETAINED |

## #103 KR-02 DoD map

Parent #7. Depends on KR-01 (#102, above: no item MET) and RF-04 (#98: integrated tree, CI and accepted49 not qualified; all 21 outcomes UNKNOWN). `docs/evaluation/typography/**` is historical Package B scope; out of KR-02 scope.

| Item (root-supplied body) | Existing evidence | Missing | Status |
| --- | --- | --- | --- |
| Task: freeze a compact rubric before viewing candidates (fidelity, readable text, hierarchy, intended relationships, severe defects) | not supplied (`docs/evaluation/rubric.md` not tracked locally) | Rubric frozen before candidate viewing | OPEN |
| Task: blind identity, randomized order, reviewer identity, missing judgments/ties, objective checks separate, unblind after decisions | Tooling commits `20f205ea` (seeded blinded bundle generator) and `61053e7a` (PNG export). These are tooling only, not a review result | Blind review run and records | OPEN |
| Task: human work not reassigned to an AI channel; no sealed generalization claim | Human gate retained by this map | Human reviewer result | RETAINED |
| KR-02-D1 / H1 / V1 | not supplied | Receipts for each | OPEN |
| Ownership, dependencies, catch-up and cutoff rules followed | Ownership release recorded (commit `199360ec`); cutoff Tue 2026-10-13 12:00Z | KR-01 and RF-04 dependencies unmet; exact-file claim before any edit (none made) | BLOCKED |
| Issue/card updated from evidence | — | No update recommended; #103 and parent #7 stay open | OPEN |
| Artifact KR-02-E1 `docs/evidence/kr-02/README.md` (PROPOSED) | Absent locally | Whole artifact | OPEN |
| Human blind-review gate | — | Independent human blind review; no agent can satisfy it | OPEN — blocked on KR-01 and RF-04 |

## #104 JH-01 DoD map

Parent #4. CLI2 viewer `714e25a3` is not a #104 claim; the CLI2 owner proposal awaits root.

| Item (root-supplied body) | Existing evidence | Missing | Status |
| --- | --- | --- | --- |
| Task: read current official Adobe SDK and challenge/viewer wording | not supplied | Dated reading record | OPEN |
| Task: minimal native editable-object round-trip probe in `experimental/addon/**`, or exact access/schema blocker | not supplied (`experimental/addon/` not tracked locally) | Probe or documented blocker | OPEN |
| Task: capture editable IDs/text/assets before and after | not supplied | Before/after capture | OPEN |
| Task: keep the Stage 1 viewer discrepancy visible | not supplied in this map's inputs | Discrepancy record | OPEN |
| Constraint: no broad UI rewrite, no authenticated submission, no automatic `src/**` transfer | None performed here | — | PRESERVED |
| Native host probe needs collaborator Express access | Access not supplied | Collaborator Express access; otherwise a named blocker | BLOCKED |
| JH-01-D1 / H1 / V1 | not supplied | Receipts for each | OPEN |
| Ownership, dependencies, catch-up and cutoff rules followed | Ownership release recorded (commit `199360ec`); cutoff Tue 2026-10-13 12:00Z | Exact-file claim before any edit (none made) | OPEN |
| Issue/card updated from evidence | — | No update recommended; #104 and parent #4 stay open | OPEN |
| Artifact JH-01-E1 `docs/evidence/jh-01/README.md` (PROPOSED) | Absent locally | Whole artifact | OPEN |

## #105 JH-02 DoD map

Depends on RF-01. Reserved scope: `docs/evaluation/typography/**`, `docs/plans/jh-02-2026-10-13.md`, `docs/evidence/jh-02/**`, `reports/jh-02/**`. The owner cannot self-approve.

| Item (root-supplied body) | Existing evidence | Missing | Status |
| --- | --- | --- | --- |
| Independent typography and source-fidelity inspection (from title) | not supplied | Inspection result | OPEN |
| Dependency RF-01 | not supplied | RF-01 completion receipt | BLOCKED |
| Human review, not silently reassigned to an AI channel | Human gate retained by this map | Independent human result | RETAINED |
| Independent reviewer; no self-approval | not supplied | Named reviewer receipt | OPEN |
| JH-02-D1 / H1 / V1 | not supplied | Receipts for each | OPEN |
| Ownership, dependencies, catch-up and cutoff rules followed | Ownership release recorded (commit `199360ec`); cutoff Tue 2026-10-13 12:00Z | RF-01 unmet; exact-file claim before any edit (none made) | BLOCKED |
| Issue/card updated from evidence | — | No update recommended; #105 stays open | OPEN |
| Artifact JH-02-E1 (PROPOSED) | not supplied | Whole artifact | OPEN |

## #112 Krush DoD map

Scope: `docs/plans/krush-next-2026-10-08/implementation.md`, `docs/evidence/kr-01-next/{selection.json,README.md,manifest.json,review.zip}`, `reports/kr-01-next/**`. Follow-up rubric files are allowed only after the first slice handoff.

| Item (root-supplied body) | Existing evidence | Missing | Status |
| --- | --- | --- | --- |
| First audit preserved as is | Root-supplied: first audit `d3016a6a`, rendered `63688bc7`, all quarantined, zero faithful-eligible | Must not be relabelled; none relabelled here | PRESERVED |
| Audit faithful development positives | Human review index: human dispositions accept three bindings (flowers and financial development-v4 revision-2; INSPIRING development-v3); science quarantined. Closure `b740635c…`, prior Reviewer PASS | `docs/evidence/kr-01-next/` artifact set not supplied locally | PARTIAL |
| Selection frozen before outcomes; no fourth-source substitution | Index records three bindings and no fourth pair; frozen manifest `67e8c30f…` (49 payload files) | Selection-before-outcome receipt for `kr-01-next` not supplied | PARTIAL |
| Prepare human blind evaluation | not supplied | Packet preparation | BLOCKED |
| Blind run gated on accepted KR-01 + RF-04 pairs | KR-01 has no item MET; RF-04 not qualified and all 21 outcomes UNKNOWN | Both gates | BLOCKED |
| Follow-up rubric files only after first slice handoff | First slice handoff not supplied | Handoff | BLOCKED |
| Main ref currency | `75f0ac12` is an Oct-8 observation, not current | Current main ref | OPEN |
| Human blind-evaluation gate | — | Independent human result; no agent can satisfy it | RETAINED |
| Ownership and cutoff; issue/card update | Ownership release recorded (commit `199360ec`); cutoff Tue 2026-10-13 12:00Z | No update recommended; #112 stays open | OPEN |

## Boundaries

PARTIAL means existing receipts cover only the named part. No item in any package is MET. Any conversion change requires a new versioned bundle; none is proposed here. Human acceptance gates are retained. Import379 stays rejected.
