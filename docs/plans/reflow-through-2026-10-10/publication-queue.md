# Publication queue — October 11, 2026

## Scope and acceptance
The root publisher owns this queue. Local edits, remote commits, exported bundles, PRs and main integration are separate states. Preserve collaborator artifacts and file claims. Before each merge: refresh main, inspect exact diff and privacy, obtain independent exact-commit review, wait for every applicable hosted check to complete successfully, merge explicitly and verify remote main. Do not rely on automatic merge or absent branch protections. Human quality acceptance remains separate.

## Verified publications
| PR | Reviewed head | Main merge | Disposition |
|---|---|---|---|
| [123](https://github.com/kj-squared-labs/reflow-studio/pull/123) | c0b7c42 | 03044115 | Routing/ownership checkpoints and consumer correction. Merged before two checks completed; all three later passed. This timing must not recur. |
| [124](https://github.com/kj-squared-labs/reflow-studio/pull/124) | c0f20f3 | 17e07c55 | Historical issue ledger and ownership release; all three checks passed before merge. |
| [121](https://github.com/kj-squared-labs/reflow-studio/pull/121) | 9a9e197 | 04cedc9d | Offline component evidence; all three checks passed before merge. Not full parent DoD. |
| [122](https://github.com/kj-squared-labs/reflow-studio/pull/122) | d10153c | b17d92f9 | Manifest-bound preflight, not RF04 execution or quality acceptance; all three checks passed before merge. |

Current main receipt: b17d92f9086d83eb5de362bb80c2b769222557e3. The older container failures were Docker Hub manifest HTTP429. A single retry after newer successful registry evidence passed for each PR; they are no longer failed-check blockers.

## Remaining artifacts
| Artifact / exact identity | State and blocker | Next owner/action | Recheck trigger |
|---|---|---|---|
| Offline public copies, commit b456a41ee7f6dc5a4d4410395510b25a7981e6f3; docs/evidence/offline-publication-2026-10-11/issue8-35-dod-gap.md and issue104-official-contract-native-access.md | Exact remote diff/privacy review approved; export pending | Existing exporter supplies reviewed bundle; root integrates fresh main; independent reviewer checks final commit | New export result after one bounded coordinator recovery |
| Package DoD map, commit77260f3d; docs/evidence/unblock-acceptance/package-dod-map-2026-10-11.md | Approved remote commit; corrected export pending | Existing exporter then root/current-main review | Digest-verified bundle available |
| Receipt-attribution correction, commit509ae920; docs/evidence/unblock-acceptance/receipt-attribution-correction-2026-10-11.md | Approved remote commit; overlaps already published consumer correction, requires reconciliation | Root avoids duplicate/conflicting claims when integrating next bundle | Corrected export and exact diff available |
| #25 readiness and addendum, SHA3499cb5c / bade61d8 | Reviewed documents; publication commit not established | Reflow coordinator prepares public checkpoint, then root reviews integration | Reviewed commit/export receipt |
| Native #26/#27 and RF04 correction artifacts | Preserved, not integrated; current-source transfer remains explicitly rejected | Root waits for direct authorization and exclusive file claims, then exact tests/review | Direct authorization and source/claim receipt |
| issue-first.md, blocked-queue.md, publication-queue.md | Local workflow publication candidate; not yet on main at authoring | Root prepares focused branch and independent review, then hosted checks | Exact review and all checks pass |

Do not close parent issues from documentary publication. Keep all blocked work in blocked-queue.md with a next action and event-based trigger. Do not let one stalled exporter stop independent local publication work.
