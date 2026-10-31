# September 26 audit evidence

Baseline: `c4af8e7f27ec028b22d0473e3f9040f39a029a70`. [Audit and handoff](../../project-audit-2026-09-26.md).

## Fresh verification

- `npm test`: 447 passed, 0 failed.
- `npm run build`: TypeScript and Vite passed.
- `npm run corpus:check`: 0 errors, 1 warning (0/3 independent test families).
- `npm run --silent corpus:preflight`: 21 sources, 147 cases, all catalog-ready; rendering/engine not run.
- `node --import tsx scripts/issue7-source-audit.ts --manifest corpus/manifest.json --output reports/2026-09-26-audit/source-audit.json`: all source/resource/text rows measured successfully; 76/293 over threshold, 11/21 sources affected, all 293 coverage declarations unknown.
- Main GitHub CI: [36050912871](https://github.com/kj-squared-labs/reflow-studio/actions/runs/36050912871), success.

Fresh local logs/reports are under ignored `reports/2026-09-26-audit/`. Archived September 24 browser/native/crop/benchmark evidence was inspected as historical evidence, not rerun or claimed newly visually reviewed. No engine/layout/font/UI change is made by the coordinator.

## Pull requests

- [#1: Share complete benchmark evidence and visual comparison gallery](https://github.com/kj-squared-labs/reflow-studio/pull/1): MERGED; merged 2026-09-15T21:50:06Z.
- [#15: Publish adversarial review, evidence, and technical priorities](https://github.com/kj-squared-labs/reflow-studio/pull/15): MERGED; merged 2026-09-16T01:02:31Z.
- [#16: Clarify sign-shop story context and preserve project scope](https://github.com/kj-squared-labs/reflow-studio/pull/16): MERGED; merged 2026-09-16T01:30:52Z.
- [#17: Require plan-first and tests-first development](https://github.com/kj-squared-labs/reflow-studio/pull/17): MERGED; merged 2026-09-16T01:40:53Z.
- [#18: [Engine] Harden editable design validation and preservation (#2)](https://github.com/kj-squared-labs/reflow-studio/pull/18): MERGED; merged 2026-09-16T02:08:04Z.

## Live board snapshot

Observed via `gh project item-list 7 --owner ojedaJD --limit 100 --format json`; the previously recorded Project API access blocker is no longer reproduced. This snapshot precedes the two new issue sessions. No board or issue states were changed.

| Issue | Board status |
| --- | --- |
| [#2](https://github.com/kj-squared-labs/reflow-studio/issues/2) | Done |
| [#3](https://github.com/kj-squared-labs/reflow-studio/issues/3) | Done |
| [#4](https://github.com/kj-squared-labs/reflow-studio/issues/4) | Ready |
| [#5](https://github.com/kj-squared-labs/reflow-studio/issues/5) | In progress |
| [#6](https://github.com/kj-squared-labs/reflow-studio/issues/6) | In progress |
| [#7](https://github.com/kj-squared-labs/reflow-studio/issues/7) | Ready |
| [#8](https://github.com/kj-squared-labs/reflow-studio/issues/8) | In progress |
| [#9](https://github.com/kj-squared-labs/reflow-studio/issues/9) | Backlog |
| [#10](https://github.com/kj-squared-labs/reflow-studio/issues/10) | Backlog |
| [#11](https://github.com/kj-squared-labs/reflow-studio/issues/11) | In progress |
| [#12](https://github.com/kj-squared-labs/reflow-studio/issues/12) | In progress |
| [#13](https://github.com/kj-squared-labs/reflow-studio/issues/13) | Done |
| [#14](https://github.com/kj-squared-labs/reflow-studio/issues/14) | Backlog |
| [#19](https://github.com/kj-squared-labs/reflow-studio/issues/19) | Ready |
| [#20](https://github.com/kj-squared-labs/reflow-studio/issues/20) | Ready |
| [#21](https://github.com/kj-squared-labs/reflow-studio/issues/21) | Backlog |
| [#22](https://github.com/kj-squared-labs/reflow-studio/issues/22) | Ready |
| [#23](https://github.com/kj-squared-labs/reflow-studio/issues/23) | Done |
| [#24](https://github.com/kj-squared-labs/reflow-studio/issues/24) | Done |
| [#25](https://github.com/kj-squared-labs/reflow-studio/issues/25) | Backlog |
| [#26](https://github.com/kj-squared-labs/reflow-studio/issues/26) | Backlog |
| [#27](https://github.com/kj-squared-labs/reflow-studio/issues/27) | Backlog |
| [#28](https://github.com/kj-squared-labs/reflow-studio/issues/28) | Backlog |
| [#29](https://github.com/kj-squared-labs/reflow-studio/issues/29) | Backlog |
| [#30](https://github.com/kj-squared-labs/reflow-studio/issues/30) | Backlog |
| [#31](https://github.com/kj-squared-labs/reflow-studio/issues/31) | Backlog |
| [#32](https://github.com/kj-squared-labs/reflow-studio/issues/32) | Backlog |
| [#33](https://github.com/kj-squared-labs/reflow-studio/issues/33) | Backlog |
| [#34](https://github.com/kj-squared-labs/reflow-studio/issues/34) | Backlog |
| [#35](https://github.com/kj-squared-labs/reflow-studio/issues/35) | Backlog |

#3 is Done here but the issue remains OPEN. #31/#32/#33/#34 have landed partial work despite Backlog. Closure requires acceptance reconciliation, not merely a green suite.

## Recent commit inventory

Command: `git log origin/main --since=2026-09-15 --date=short`. Entire recent history is inventoried; targeted technical review concentrates on changes since the September 22 roadmap. Generated report rows and binaries were not all individually re-reviewed.

| Commit | Date | Subject |
| --- | --- | --- |
| [`c4af8e7`](https://github.com/kj-squared-labs/reflow-studio/commit/c4af8e7) | 2026-09-24 | Add verified corpus resource catalog and preflight accounting |
| [`3b5e606`](https://github.com/kj-squared-labs/reflow-studio/commit/3b5e606) | 2026-09-24 | Keep source audit sealed and font isolated |
| [`68cd183`](https://github.com/kj-squared-labs/reflow-studio/commit/68cd183) | 2026-09-24 | Add reproducible source fidelity audit |
| [`80b86c9`](https://github.com/kj-squared-labs/reflow-studio/commit/80b86c9) | 2026-09-24 | Record hosted rendered-verdict pass and fault runs (#6) |
| [`4d454ef`](https://github.com/kj-squared-labs/reflow-studio/commit/4d454ef) | 2026-09-24 | Record rendered verification and defect-control pack evidence (#6) |
| [`e10c973`](https://github.com/kj-squared-labs/reflow-studio/commit/e10c973) | 2026-09-24 | Require matching browser and native rendered verdicts (#6) |
| [`e5fa88d`](https://github.com/kj-squared-labs/reflow-studio/commit/e5fa88d) | 2026-09-24 | Verify visibility on rendered pixels and build a defect-control pack (#6) |
| [`e0db2b2`](https://github.com/kj-squared-labs/reflow-studio/commit/e0db2b2) | 2026-09-24 | Localize occlusion, contrast, collision and crop findings (#6) |
| [`e57fe44`](https://github.com/kj-squared-labs/reflow-studio/commit/e57fe44) | 2026-09-24 | Record crop and layering evidence and contract (#6) |
| [`94e0c70`](https://github.com/kj-squared-labs/reflow-studio/commit/94e0c70) | 2026-09-24 | Compare browser SVG and native PNG crops in acceptance (#6) |
| [`81d3583`](https://github.com/kj-squared-labs/reflow-studio/commit/81d3583) | 2026-09-24 | Report newly obscured, illegible and heavily cropped content (#6) |
| [`97a9179`](https://github.com/kj-squared-labs/reflow-studio/commit/97a9179) | 2026-09-24 | Share continuous focal crops between SVG and PNG (#6) |
| [`3d08dd9`](https://github.com/kj-squared-labs/reflow-studio/commit/3d08dd9) | 2026-09-22 | Document M1 Express access and Level 1 review |
| [`91c3e55`](https://github.com/kj-squared-labs/reflow-studio/commit/91c3e55) | 2026-09-22 | Add bounded append-only LICA expansion path |
| [`d2a123e`](https://github.com/kj-squared-labs/reflow-studio/commit/d2a123e) | 2026-09-22 | Record outcomes for every LICA import input |
| [`09deb9e`](https://github.com/kj-squared-labs/reflow-studio/commit/09deb9e) | 2026-09-22 | Freeze corpus family splits for independent evaluation (#7) |
| [`55bd10c`](https://github.com/kj-squared-labs/reflow-studio/commit/55bd10c) | 2026-09-22 | Discover remote default branch before Copilot checkout |
| [`0419921`](https://github.com/kj-squared-labs/reflow-studio/commit/0419921) | 2026-09-22 | Select ready Copilot tasks automatically with shared reservations |
| [`5bc5987`](https://github.com/kj-squared-labs/reflow-studio/commit/5bc5987) | 2026-09-22 | Add private vault context and collaborator launcher setup |
| [`2bb2d11`](https://github.com/kj-squared-labs/reflow-studio/commit/2bb2d11) | 2026-09-22 | Add one-command isolated Copilot issue launcher |
| [`5f046bc`](https://github.com/kj-squared-labs/reflow-studio/commit/5f046bc) | 2026-09-22 | Add bounded delegation and independent validation workflows |
| [`2977f4c`](https://github.com/kj-squared-labs/reflow-studio/commit/2977f4c) | 2026-09-22 | Document local Copilot collaborator workflow |
| [`e92cf42`](https://github.com/kj-squared-labs/reflow-studio/commit/e92cf42) | 2026-09-22 | Plan offline milestones and adversarial gap follow-ups |
| [`4adaba4`](https://github.com/kj-squared-labs/reflow-studio/commit/4adaba4) | 2026-09-22 | Record hosted container smoke controls |
| [`f579dd4`](https://github.com/kj-squared-labs/reflow-studio/commit/f579dd4) | 2026-09-22 | Gate network-disabled container smoke in CI |
| [`a313fa0`](https://github.com/kj-squared-labs/reflow-studio/commit/a313fa0) | 2026-09-22 | Reject non-regular CLI inputs before reading |
| [`41dae3b`](https://github.com/kj-squared-labs/reflow-studio/commit/41dae3b) | 2026-09-22 | Add first LICA corpus batch (#7) |
| [`ed2d29a`](https://github.com/kj-squared-labs/reflow-studio/commit/ed2d29a) | 2026-09-22 | Add LICA converter and importer for the independent corpus (#7) |
| [`ad9fb8d`](https://github.com/kj-squared-labs/reflow-studio/commit/ad9fb8d) | 2026-09-22 | Keep four-product row across wider transition |
| [`ae14b23`](https://github.com/kj-squared-labs/reflow-studio/commit/ae14b23) | 2026-09-22 | Draft durable campaign state and recovery contract |
| [`63393d5`](https://github.com/kj-squared-labs/reflow-studio/commit/63393d5) | 2026-09-22 | Add provisional offline CLI and container harness |
| [`ffe9b93`](https://github.com/kj-squared-labs/reflow-studio/commit/ffe9b93) | 2026-09-22 | Add readable four-product row for dense square layouts |
| [`b4ba15c`](https://github.com/kj-squared-labs/reflow-studio/commit/b4ba15c) | 2026-09-22 | Add measured whole-group product grid alternatives |
| [`36b31fa`](https://github.com/kj-squared-labs/reflow-studio/commit/36b31fa) | 2026-09-22 | Generate fresh font parity reference before browser acceptance |
| [`3772c3e`](https://github.com/kj-squared-labs/reflow-studio/commit/3772c3e) | 2026-09-20 | Verify font and text parity across browser, SVG, and PNG #3 |
| [`f590e74`](https://github.com/kj-squared-labs/reflow-studio/commit/f590e74) | 2026-09-19 | Add per-card SVG export button |
| [`8a2568c`](https://github.com/kj-squared-labs/reflow-studio/commit/8a2568c) | 2026-09-17 | Add corpus manifest validator for independent evaluation (#7) |
| [`958ec8b`](https://github.com/kj-squared-labs/reflow-studio/commit/958ec8b) | 2026-09-16 | Add research-backed ML tasks for preference data and ranking |
| [`4894fa6`](https://github.com/kj-squared-labs/reflow-studio/commit/4894fa6) | 2026-09-16 | Assign ML implementation and evaluation to Junho and Krush |
| [`33e55f4`](https://github.com/kj-squared-labs/reflow-studio/commit/33e55f4) | 2026-09-16 | Plan independent quality evaluation and bounded ML experiment |
| [`1f8ae8b`](https://github.com/kj-squared-labs/reflow-studio/commit/1f8ae8b) | 2026-09-16 | Archive measurement reuse validation and hosted CI evidence |
| [`90bc454`](https://github.com/kj-squared-labs/reflow-studio/commit/90bc454) | 2026-09-16 | Reuse bounded text measurements and equivalent layouts (#8) |
| [`0757de5`](https://github.com/kj-squared-labs/reflow-studio/commit/0757de5) | 2026-09-16 | Save handoff for the next engine issue |
| [`1906a80`](https://github.com/kj-squared-labs/reflow-studio/commit/1906a80) | 2026-09-16 | Complete the archived passing artifact upload excerpt |
| [`00d53e8`](https://github.com/kj-squared-labs/reflow-studio/commit/00d53e8) | 2026-09-16 | Record hosted CI failure and pass evidence (#13) |
| [`56757a7`](https://github.com/kj-squared-labs/reflow-studio/commit/56757a7) | 2026-09-16 | Add main-branch CI and browser regression artifacts (#13) |
| [`9070582`](https://github.com/kj-squared-labs/reflow-studio/commit/9070582) | 2026-09-16 | Add team Kanban board and workflow guide |
| [`11b9b1f`](https://github.com/kj-squared-labs/reflow-studio/commit/11b9b1f) | 2026-09-15 | Sync research tasks and adopt jo branch names |
| [`040fa13`](https://github.com/kj-squared-labs/reflow-studio/commit/040fa13) | 2026-09-15 | Implement source-aware engine ranking (#12) |
| [`d5a8258`](https://github.com/kj-squared-labs/reflow-studio/commit/d5a8258) | 2026-09-15 | Document competitive research and qualification priorities |
| [`920f6fc`](https://github.com/kj-squared-labs/reflow-studio/commit/920f6fc) | 2026-09-15 | Keep mixed-role groups together through layout transforms |
| [`98b2eb1`](https://github.com/kj-squared-labs/reflow-studio/commit/98b2eb1) | 2026-09-15 | Make PRs and reviewer approval optional for the hackathon |
| [`a88bb32`](https://github.com/kj-squared-labs/reflow-studio/commit/a88bb32) | 2026-09-15 | Record engine contract PR and review handoff |
| [`6bc0259`](https://github.com/kj-squared-labs/reflow-studio/commit/6bc0259) | 2026-09-15 | Harden editable design validation and preservation contract |
| [`e71bd95`](https://github.com/kj-squared-labs/reflow-studio/commit/e71bd95) | 2026-09-15 | Merge pull request #17 from ojedaJD/codex/plan-first-test-first-workflow |
| [`cf30c95`](https://github.com/kj-squared-labs/reflow-studio/commit/cf30c95) | 2026-09-15 | Require implementation plans and tests before production changes |
| [`dac1a5b`](https://github.com/kj-squared-labs/reflow-studio/commit/dac1a5b) | 2026-09-15 | Merge pull request #16 from ojedaJD/codex/sign-shop-story-context |
| [`ed33b34`](https://github.com/kj-squared-labs/reflow-studio/commit/ed33b34) | 2026-09-15 | Record sign-shop context for the presentation without expanding scope |
| [`ee6a4e0`](https://github.com/kj-squared-labs/reflow-studio/commit/ee6a4e0) | 2026-09-15 | Merge pull request #15 from ojedaJD/codex/adversarial-review-plan |
| [`84d07ad`](https://github.com/kj-squared-labs/reflow-studio/commit/84d07ad) | 2026-09-15 | Publish adversarial review and prioritize technical follow-up |

## Source of technical finding

The audit document contains a directly executed minimal reproduction for malformed data URIs reaching `reflow`/`renderSvg`. It is separate from the passing valid-input regression suite. No exploit, external fetch, or failure of the bundled example assets is claimed.

## Integrated review-export validation

The recovered generator and completed exporter were integrated on main as `20f205e` and `61053e7`. Coordinator reran `npm test` (465/465 passed), `npm run build` (passed) and `git diff --check` after integration. Push confirmed remote main `61053e7a00ead778e5ba5f5b5997e21aeba8dfd3`. [Hosted CI 36281386849](https://github.com/kj-squared-labs/reflow-studio/actions/runs/36281386849) also passed for that exact code SHA. The later #4/audit additions are documentation and evidence, with separate link/content validation.
