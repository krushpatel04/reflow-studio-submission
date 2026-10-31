# Stage 1 review packet — October 27, 2026

**Status: technical candidate qualified; organizer requirements and registration confirmations still block a final submission decision. Nothing submitted.** This is the current handoff. Older A/B packets are dated historical evidence, not the current release state. Implementation and checks follow [the readiness plan](../plans/2026-10-27-submission-readiness.md); [Astra's adversarial review](../plans/2026-10-27-astra-readiness-review.md) records independent findings and their disposition.

## Start here — assigned review issues

### JD: the short remaining checklist (#160)

The delegated technical review is complete. Supply these inputs privately; record only completion status on the issue:

1. **Organizer source:** attach the offered session Word document or provide the relevant attributable reply. We will extract the Stage 1 viewer and private-repository access instructions. If the source does not answer them, those specific questions still need an organizer answer. Provide actual private-repository access instructions/accounts; do not guess judge identities or assume the URL grants access. A public release is a separate owner decision.
2. **Registration confirmation:** JD supplied the registered team name, all three participants’ names, university emails, majors and finale availability privately. Confirm that the team registration and all three individual registrations were actually completed, and that the supplied details match those registrations. A receipt or the submitting teammate’s confirmation is sufficient; an individual welcome email does not prove team registration.
3. **Final decision:** after the facts, access route and any demonstrated blockers are resolved, review the completed submission details and authorize submission. Consider available teammate findings; completion of #158/#159 is not a mandatory signoff. This is one final decision, not another technical audit.

**Prepared on JD's behalf:** repository URL `https://github.com/kj-squared-labs/reflow-studio`; current qualified runtime `8b0485acd90b0c23d1335c285f63a147117d44fa`, with [clean-source evidence](../evidence/2026-10-29-finalist-pass/README.md). Use the normal repository URL requested by the form and record the final chosen SHA in the handoff. Do not require special approval of a commit-specific URL; follow any actual organizer ref instructions if supplied. Reverify the fingerprint if source changes. The reported October 30 closing date still lacks a verified time/timezone.

**Fresh checks, October 27 Eastern:** the live submission form's first page says October 30, requests team name and a choice of two or three people, and permits any teammate to submit. Later pages were not traversed because confirmed registration values are missing. The accessible organizer launch correspondence supplies the remaining roster/major/repository/availability field list and says no separate upload. A targeted Gmail search found no team-registration receipt or newer viewer/access answer; that does not prove they do not exist elsewhere. No session Word file was found in the checked repository documentation/report paths. The current starter FAQ still conflicts with the challenge PDF about the viewer. No form fields were entered or submitted.

Junho's #158 and Krush's #159 remain their own tasks; JD does not need to redo them. Billing is a separate operational limitation, not an additional Adobe form requirement. Do not wait for an exact cutoff answer if a compliant, authorized early submission can be made.

Private reply template:

```text
Registered team name:
Team registration completed by / on (or receipt):
All members individually registered and meet eligibility requirements: confirmed / pending
Member 1: full name | registered university email | university | major | finale availability
Member 2: full name | registered university email | university | major | finale availability
Member 3, if applicable: full name | registered university email | university | major | finale availability
Organizer session document or reply:
Private-repository judge access instructions, if separate:
```

**Post evidence and suggestions on your assigned issue below.** [#35](https://github.com/kj-squared-labs/reflow-studio/issues/35) is the parent release rollup for cross-task decisions and blockers. These four bounded sub-issues replace the earlier single-thread workflow at JD's request; deferred research/product/finale issues remain closed. Use one comment per finding and the template below, replying there when it changes. Link the exact commit/artifact. A named assignment is a request, not evidence of completion.

The qualified Python runtime is engine `5020706b9e56eef543731feedd8c67323ca02ba9`. Later documentation-only commits can be reviewed with the same runtime only after fingerprint verification. Record `git rev-parse HEAD` in every technical note. Start from current `main` in a clean clone, preserving your existing work/branches. [README setup](../../README.md#run-offline) supplies the pinned starter and Python Docker commands; do not build the legacy root Dockerfile for submission.

| Issue / owner | Immediate action | Required result / status |
| --- | --- | --- |
| **[#157 — Astra, delegated by JD](https://github.com/kj-squared-labs/reflow-studio/issues/157)**; accountable account @ojedaJD | Verify current evidence and inspect all six visual cases; reconcile official requirements and decide technical blockers versus refinement. | Publish [Astra's delegated report](2026-10-27-astra-jd-review.md), with actual model provenance, verdicts and remaining-input handoff. **Audit complete: technical/visual ACCEPT; submission HOLD** for missing facts in #160. AI review does not invent human votes. |
| **[#158 — Junho](https://github.com/kj-squared-labs/reflow-studio/issues/158)** @JunhoHwoang | Inspect final Linux banner at1×/2× and five repaired compositions. Check word separation, copy, clipping, hierarchy, proportions and missing-badge prominence. | Explicit human ACCEPT / NEEDS FIX / NOT REVIEWED per case and screenshot/region. Final human review requested; prior L3 review predates footer resize/recentering. |
| **[#159 — Krush](https://github.com/kj-squared-labs/reflow-studio/issues/159)** @krushpatel04 | Reproduce the README Python assembly/build/run on your own machine. Inspect all three public outputs, five composition comparisons and handoff clarity. | Commit/environment/commands/output status, real-renderer evidence and actual reproduction verdict. Independent reproduction requested. |
| **[#160 — JD and participant confirmations](https://github.com/kj-squared-labs/reflow-studio/issues/160)** @ojedaJD | Supply the offered session Word document or attributable reply; resolve viewer/deadline/access decisions; collect each participant's real form facts privately; record final submission authorization. | Confirmed/pending status with sources. Astra handles the delegated technical review; JD need not repeat it. Roster and availability supplied privately; registration completion, organizer/access answers and final authorization remain pending. |

Everyone confirms their own participant details to JD through the team's existing private channel, then records status only in #160. Accurate finale availability is required for the form/prize decision; inability to attend is not by itself a Stage1 participation prohibition. The inspected general FAQ requires at least two teammates to attend in person to place/win; see [Astra's source reconciliation](2026-10-27-astra-jd-review.md). No issue implies permission to invent availability or to submit automatically.

### Review these exact artifacts

| Artifact | Review task |
| --- | --- |
| [Final official L3 Linux banner](../evidence/2026-10-27-readiness/banner-after-linux.png) and [before](../evidence/2026-10-27-readiness/banner-before-linux.png) | Review the complete 728×90 output at 1× and 2×; ensure every word remains readable and the retained missing-asset box is restrained. The footer change also recenters the label row. |
| [Financial portrait](../evidence/2026-10-27-layout-finish/financial-story.png) | Check heading/body association, complete copy and use of space. |
| [Financial narrow](../evidence/2026-10-27-layout-finish/financial-narrow.png) | Check paragraph order and readable text without losing headings. |
| [Financial banner](../evidence/2026-10-27-layout-finish/financial-banner.png) | Inspect three sections at native target size; the small footer is 8 px and remains a disclosed limit. |
| [Flowers narrow](../evidence/2026-10-27-layout-finish/flowers-narrow.png) and [banner](../evidence/2026-10-27-layout-finish/flowers-banner.png) | Check artwork proportions, decorative placement and whether the composition uses its space. These are textless sources. |
| [Current runtime evidence and fingerprint](../evidence/2026-10-29-finalist-pass/README.md) | Compare actual source/image identity and stated controls; keep local Docker, hosted CI, human review and AI review distinct. |

The five development files are labelled before/after composites: inspect each target panel at its native dimensions, rather than scaling the entire comparison to a phone screen. These are exposed development cases, not a fresh blind study. The full [layout report](../evidence/2026-10-27-layout-finish/README.md) retains counts and limitations. Krush's previously prepared blind-review archive remains preserved and deferred; it is not the final-engine review requested here.

### Optional workbench check — same steps for each teammate

The workbench runs the retained TypeScript engine on synthetic designs. Use the Python JSON/PNG artifacts above to judge the submission engine. No accounts or API keys are needed for the local workbench. Use Node **24.20.0**, pinned in [`.node-version`](../../.node-version); the package minimum is 22.12.

```sh
npm ci --cache .cache/npm
PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npx playwright install chromium --only-shell
PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npm run verify:browser
```

On Linux, install Chromium's OS dependencies as described in [CI setup](../ci.md#reproduce-locally). The test runner owns port 4173, starts/stops its server and generates fresh native prerequisites. Its report is `reports/ci/playwright.json`; failures retain screenshots/traces. A launch/setup failure is blocked verification, not a passing test. For manual steps 1–6 below, run `npm run dev` and use the printed root URL (`/`). Open `/verify.html` separately for automatic checks; that page changes UI state while running its checks.

1. Choose **Two voices, one design** (`type-pairing`) (a supported export control); switch Reflow/Baseline and toggle **Show issues**.
2. Change the headline, click **Update headline** and confirm both the displayed copy and exported editable JSON match the current version.
3. Open **Try a custom size**, enter a valid size and click **Add custom format**, then try zero width: expect a clear validation message with the last valid layout retained.
4. At a narrow viewport, paste a long headline (up to 500 characters), click **Update headline**, and use the keyboard to open **Inspect findings** and select an affected element. Confirm only the relevant preview is highlighted.
5. Export editable JSON and SVG for a supported design. Report any visible export error with its exact message; the default fixture's unsupported arrow glyph is a known explicit SVG limitation, not permission to drop text.
6. Inspect light/dark themes and **Run all 30 cases** if relevant to a finding. Record observed defects; do not treat automated geometry scores as visual approval.

### Copy this into your assigned issue comment

```text
Reviewer / date:
Reviewed commit + artifact/case (Python output or TypeScript workbench):
Environment / viewport or image scale:
Checks run and result (PASS / FAIL / BLOCKED / NOT RUN):
Decision (ACCEPT / NEEDS FIX / NOT REVIEWED):
Finding class (submission blocker / refinement / question):
Expected behavior → observed behavior:
Reproduction steps and screenshot/file link:
Smallest suggested change and possible regression:
```

For a successful review, say which cases you actually inspected. For a failure, report one reproducible finding per comment so discussion and resolution stay attached. Do not upload credentials, private mail or unapproved assets. Existing source quarantines, attribution and sealed-data restrictions continue to apply.

### How we decide what to change

- **Submission blocker:** mandatory contract failure, lost/changed source content, missing output, reproducible crash or a demonstrated severe layout/readability regression. Record Astra's technical disposition and the accepted fix/owner in the relevant issue, linking #35; meaningful regression first, smallest implementation, then affected verification and fresh qualification if runtime/package bytes change.
- **Refinement:** a promising improvement without a submission failure (hierarchy balance, a small product/logo, broader coverage, speed or memory). Keep the suggestion with evidence for the post-review refinement plan; do not reopen ML, corpus, campaign or native-finale projects automatically.
- **Question:** missing requirements or evidence. Assign an owner and exact source needed. An assumption is not a completed gate.

Close a finding with the fix commit and successful reproduction, or a reasoned scope deferral recorded by the delegated reviewer or JD. The final handoff requires viewer disposition, usable judge access, participant facts and the completed delegated review, with any available teammate findings considered and demonstrated blockers resolved. Teammate review assignments are not mandatory approval gates. JD retains final submission authorization; nobody submits automatically from this checklist.

### Current review notes

| Note | Evidence / disposition | Next action |
| --- | --- | --- |
| Stage 1 viewer wording conflicts | Challenge PDF omits viewer; starter FAQ requires one. Full native workflow remains deferred. | JD provides session source; record the minimal required deliverable in #35. |
| Dense banner hierarchy/product size | Earlier human review finds readability improved but hierarchy weaker and product/logo small; preserved limits. | Junho reviews final pixels and classifies any remaining problem. |
| Eight development benchmark warnings | Disclosed automated warnings, not eight proven submission failures. | Review concrete affected cases before proposing a fix. |
| Hosted CI cannot start | Account billing/spending restriction; final local Docker qualification is separate. | JD checks organization Billing & plans; no weakening gates. |
| Current workbench verification | 37/37 browser tests, 20/20 verification-page checks and the built-viewer resource test pass. [Current evidence and screenshots](../evidence/2026-10-29-finalist-pass/README.md). | Mobile opens on artwork; full-size inspection supports baseline/reflow, navigation and zoom. Judge the Python engine with its actual output PNGs. |

## Evidence ledger — read when checking a claim

## Current source and qualification ledger

**Current qualified runtime: `8b0485acd90b0c23d1335c285f63a147117d44fa`**, image `sha256:424c0eea2c0651e685e61694b2261fd14bef9096b2e19d9609bab6127ce9e51d`. The [finalist refinement packet](../evidence/2026-10-29-finalist-pass/README.md) records bounded font/glyph reuse, 25% local public L3 layout improvement, improved mobile/full-size comparison, dependency patches, 559 full Python tests plus eight focused resource tests, 744 Node tests, 37 browser tests and production gates. Clean-source offline qualification passes all controls and resources. **All six public and ten compact output hashes match** the previous qualified runtime. Geometry, source fidelity and rendered compositions are preserved; no new human acceptance or hidden-ranking evidence is claimed. Hosted CI remains blocked by account billing; organizer/access/registration decisions remain open. Nothing submitted.

The immediately preceding compact-layout candidate `14b973861faed93378a7b24f84e13931249df308` was also qualified; its [integration packet](../evidence/2026-10-29-medium-campaign/integration.md) supplies the preserved compact baseline. Older receipts below remain historical.

**Previous October 29 runtime: `5020706b9e56eef543731feedd8c67323ca02ba9`.** The [final performance/viewer evidence](../evidence/2026-10-29-final-performance/README.md) records reduced repeated font work, a 128-entry font cache, readable viewer controls and full-size artwork inspection. Final checks: 544 Python tests, 741 Node tests, 29 browser tests including 20 verification-page checks, build/native/benchmark and Astra review pass. Clean-source Linux/amd64 qualification passed all public cases, four negative controls, six failure scenarios, resources and final fingerprint. All six public JSON/PNG hashes remain identical to the previous candidate; no new public visual acceptance is invented. Timings and memory claims include their measured limits and cache reload tradeoff. Hosted CI remains subject to the existing account restriction. Nothing submitted.

**Previous October 29 runtime: `126c18668db7817b753383c98ff095ecd25c6226`.** [Refinement evidence](../evidence/2026-10-29-engine-refinement/README.md) records 536 Python tests, 741 Node tests, native/build/benchmark checks, 17 focused Linux tests, nine expanded offline cases and Astra’s adversarial image review. Fresh full qualification from a **clean checkout** passed three public cases, four negative controls, six failure scenarios, the resource profile and final fingerprint verification. The clean-tree gate was enforced. The original public outputs and all 21 accepted development PNGs remain unchanged; added variations exercise the new readability behavior. This supersedes the earlier [dirty-source glyph-only experiment](../evidence/2026-10-29-quality-speed/README.md), preserved as historical evidence. Hosted CI remains blocked before execution by billing/spending restrictions. Organizer/access/registration decisions remain open; nothing submitted.

### Historical qualification and review

Earlier hosted-qualified engine: **2445e72c99372062bcd286f3d04e69f55cfcb96a**. [Full CI40552805673](https://github.com/kj-squared-labs/reflow-studio/actions/runs/40552805673) passed all three jobs on that exact source. [Offline qualification40552811440](https://github.com/kj-squared-labs/reflow-studio/actions/runs/40552811440) passed on the same source, image `sha256:f1660f0399912191ddb717c5ce65ee85468caf703bb8a0e9c1df793c2c463bc1`: three real converter events, zero box-renderer fallback, blocked network, unchanged read-only inputs, deterministic repeated outputs and injected controls. Python516/Node741/browser27 checks passed. These links were revalidated directly October27.

Later [push CI40554022530](https://github.com/kj-squared-labs/reflow-studio/actions/runs/40554022530) on that same commit failed before any steps started: GitHub reports failed account payments or spending limit. This is an account execution blocker, not a passing rerun or a test failure. An organization owner must resolve Billing & plans; do not weaken checks or claim hosted execution for subsequent changes.

Junho's [human review and teammate reproduction](https://github.com/kj-squared-labs/reflow-studio/pull/150#issuecomment-6451576304) accept L2 and judge L3 readability improved over earlier versions, while flagging an enlarged missing-asset placeholder as must-fix. That bounded follow-up preserves the absent asset reference/element, caps trailing artwork at its established scale, and retains the header-logo and text improvements. It does not fabricate the intentionally absent image. Headline hierarchy and small product/logo remain disclosed format limits; no universal readability or competition-win claim follows.

Historical October 27 engine freeze: **4da7bb45962dbe96403a8b15622e72251e064349**. Fresh local Linux/amd64 qualification **PASS**, image `sha256:80a78acf1578af5f4d12a05c03377c4fc22144652d1ebf0c7673869fed00e7b4`. Three real converter events, zero box fallback, network blocked/none, unchanged read-only inputs, identical repeat outputs, four injected controls, six failure-matrix cases and resource-profile checks passed. The fingerprint records a clean starting source and verifies zero engine/package/input drift. The [reviewed summary](../evidence/2026-10-27-readiness/qualification-summary.json) binds actual hashes, controls and limitations. Docker Desktop ran amd64 on a Mac arm64 host; this is distinct from hosted CI and Adobe's reference machine.

The first local qualification failed because its five-second timeout control did not observe parent/child startup markers during concurrent checks. That failed receipt is preserved. One isolated retry passed both markers, timed termination and cleanup with unchanged gates. Two separately built images have different IDs; only the passing image above is the final qualification binding. All518 local Python tests pass with zero skips;29 focused Linux tests pass;741 Node tests/build,30 native layouts and70 benchmark artifact sets pass. The development benchmark retains8 warnings and zero selected errors; it is not Adobe's scoring. All21 accepted development PNGs are unchanged from the five-layout finish snapshot. A later documentation-only receipt does not claim a new hosted run or a new engine qualification; verify its runtime files against the archived fingerprint.

## Official contract and unresolved decisions

[Astra's completed delegated review](2026-10-27-astra-jd-review.md) supplies the latest source reconciliation, six image verdicts and exact remaining inputs. The technical review formerly assigned to JD is complete; #160 holds organizer/access/participant facts and final authorization.

Official starter HEAD was rechecked at `a44a06046b0413f0785e7203955c3822e0acbc32`. Its [rules](https://github.com/jhaaj08/chameleon/blob/a44a06046b0413f0785e7203955c3822e0acbc32/RULES.md) require faithful JSON and official-renderer PNGs, fixed copy/font families, proportional images, no regenerated asset pixels and offline runtime. Stage1 has no hard latency cutoff; quality takes priority. Exact M5 Pro resource specification remains unspecified. The engine uses no model weights or runtime API.

The [official challenge PDF](https://acrobat.adobe.com/id/urn:aaid:sc:US:9a9861db-a87a-4dc4-91fb-fff30ed022c6), pages8/14, was retrieved by the requirements lane and inspected directly: Stage1 engine/code, Dockerfile and short README; full Express add-on at finale. Retrieved SHA256 `8dca7a2fe1a005291004d51eb6eed6a70b6cb80a31dff3a459b8fd4a760ae5c2`. However, the [current starter FAQ Q5](https://github.com/jhaaj08/chameleon/blob/a44a06046b0413f0785e7203955c3822e0acbc32/FAQ.md) still explicitly requires an unscored viewer add-on. Native Express work remains deferred pending the identified organizer/session clarification; neither omission nor native integration is certified here.

The organizer launch correspondence and [live submission form](https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=Wht7-jR7h0OUrtLBeN7O4ZDstE0lQmpPpd8xizkT0otUN0pRSUVDR0ZFWExFVzE4VTgwMlpWQVZUMy4u), inspected by the requirements lane October27, specify one teammate submits a GitHub repository link and team details, with October30 closing date and no separate file upload. Those are lane-reported observations; no form was filled. Exact closing time/timezone and private-repository judge-access/frozen-ref instructions are still unconfirmed. Registration deadlines cannot supply the submission cutoff. The repository is currently private; do not guess judge accounts or change visibility.

JD offered to attach the session Word document. Inspect that source before resolving the viewer/deadline/access conflicts. A September15 Adobe Careers message confirms JD's event registration; it does not prove completed team registration or every teammate's eligibility. JD has since supplied the team name, roster, university emails, majors and finale availability privately. Completion of team and individual registrations remains unconfirmed; do not infer it from those supplied facts. Do not enter invented form data. Astra now executes JD's delegated technical/readiness review; JD retains final submission authorization and supplies private facts.

## Scope and next actions

The bounded visual regression and fresh technical qualification are complete. Resolve official and participant answers above, then hand JD the frozen repository link/ref and actual pass/fail/unmeasured ledger. Judges must follow the README's Python assembly/build command; the legacy root Dockerfile's default build is not qualified as the submission engine. The assembled Python context contains the repository engine modules and pinned upstream resources; workbench/corpus/docs/inputs/outputs/caches are excluded. The separately authorized October 29 engine and viewer refinements are complete with linked evidence above. ML/rankers, broader campaign features, corpus expansion, duplicate engine work and additional speculative tuning remain deferred. Preserve old experiments, evidence and unique collaborator refs. The collaborator-change monitor is paused at JD’s request; publication checks do not restart it. Existing workflows suffice; no new reusable skill is needed.

## Active issue queue

The [October 27 issue disposition](2026-10-27-issue-scope.md) supersedes historical directions to leave deferred issues open. [#35](https://github.com/kj-squared-labs/reflow-studio/issues/35) is the parent rollup; #157–#160 divide the delegated audit, named teammate reviews and missing inputs into bounded assigned tasks. The formal blind study and broader research/product/finale criteria are deferred, not passed. Astra executes JD's delegated review; available independent teammate findings and JD's final submission authorization remain separate; assignment does not create a mandatory reviewer signoff. Closing the backlog does not submit the project or resolve the official viewer conflict.

## Pull request disposition

Astra compared current file contents at `f51f928` with every open PR before cleanup. Applicable production fixes are incorporated or superseded; this is not a claim that every historical commit was merged. Unique experiments/evidence and all source branches remain available.

| PR | Disposition |
| --- | --- |
| [#154](https://github.com/kj-squared-labs/reflow-studio/pull/154) | Incorporated: wide-split engine and regression tests exactly match main. Preserve the branch's dated plan/images. |
| [#150](https://github.com/kj-squared-labs/reflow-studio/pull/150) | Superseded: the held 8 px proposal was replaced by the qualified 9 px composition and final footer correction. Preserve sweep/prototype evidence. |
| [#93](https://github.com/kj-squared-labs/reflow-studio/pull/93) | Deferred: remaining unique file is a corpus-expansion plan; no missing Stage 1 implementation. |
| [#68](https://github.com/kj-squared-labs/reflow-studio/pull/68) | Superseded: current text fitting is newer; unique files are historical P5 plans/logs/images. |
| [#63](https://github.com/kj-squared-labs/reflow-studio/pull/63) | Incorporated and strengthened: current contract retains the work with additional validation; no missing files. |
| [#59](https://github.com/kj-squared-labs/reflow-studio/pull/59) | Incorporated: adapter, CLI and focused tests exactly match main. |
| [#56](https://github.com/kj-squared-labs/reflow-studio/pull/56) | Incorporated: failure continuation and overflow/recovery browser regressions are retained on main. |
| [#36](https://github.com/kj-squared-labs/reflow-studio/pull/36) | Incorporated: target handling, typography and focused tests exactly match main. |

These historical PRs were closed without merging obsolete snapshots or deleting branches. Any later useful refinement should be a small change against current main with its own evidence.
