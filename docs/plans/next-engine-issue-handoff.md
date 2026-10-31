# Next engine issue — session handoff, September 16, 2026

> Scope note, October 5: this is a retained internal/scoped plan. The [current Adobe execution sequence](2026-10-05-adobe-execution.md) and [source audit](../evidence/2026-10-05-adobe-launch/README.md) govern next work; this plan is not proof of official Python entrypoint or genuine renderer compatibility.


## Handoff plan and acceptance

The user requested saved notes and a new conversation to continue another issue with the same workflow. Preserve verified results and unfinished scope so the next session does not repeat completed work or treat partial fixes as full acceptance. Documentation-only scope: check referenced files, confirm Git state, publish these notes, then start a new task that reads them and checks live issue dependencies. No artificial code tests are needed for this handoff.

## Completed and verified

- #2: provisional structural/resource validation and preservation contract completed.
- #5: coherent mixed-role group transforms and visible badge regression implemented; broader typography-dependent product/candidate work remains open.
- #12: source-aware ranking fixes near-source composition jumps; larger transitions, independent quality, and general visibility/crop work remain open. Selected warnings increased from 6 to 11; do not hide this tradeoff.
- #13: main-branch CI completed and issue closed; board moved to Done. Implementation `56757a7`, evidence `00d53e8`, corrected passing-upload excerpt `1906a80`.
- Final CI at `1906a80` [passed](https://github.com/ojedaJD/reflow-studio/actions/runs/35056868169): 160 tests, build, 30 native cases, benchmark export and 11 required browser checks. Working tree was clean before this handoff.
- A real badge-separation [negative control](https://github.com/ojedaJD/reflow-studio/actions/runs/35056385226) failed the glyph assertion and retained 229 files; the [restored control](https://github.com/ojedaJD/reflow-studio/actions/runs/35056493606) passed on the same engine. Failure artifacts expire after 14 days; compact logs/reports and reviewed local imagery are committed.

Read [progress](../progress.md), [team plan](../team-plan.md), [development workflow](../development-workflow.md), [CI guide](../ci.md), and [CI evidence](../evidence/2026-09-16-ci/README.md), plus the repository README and AGENTS.md.

## Choose the next issue

Check live [roadmap #11](https://github.com/ojedaJD/reflow-studio/issues/11), [board](https://github.com/users/ojedaJD/projects/7/views/1), and current issue bodies before implementation. Prefer JD-owned engine work. Inspect [#8](https://github.com/ojedaJD/reflow-studio/issues/8) first: reproducible offline CLI/container delivery and bounded execution remain important. Its last-read scope had dependencies on pending typography #3; determine what is now unblocked rather than assuming all of #8 is ready. If needed choose a clearly bounded, unblocked engine issue or slice, preserving remaining acceptance criteria. Do not silently take over teammates' typography/integration interfaces.

#8 must eventually add its offline/container smoke check to the new CI workflow. #4 must add official-renderer coverage when available. Neither exists today. #7's sealed corpus and independent quality assessment remain separate from development tuning. Dense-input runtime remains unbounded despite CI's external timeouts. The provisional engine is not Adobe-integrated or submission-ready.

## Required workflow and user preferences

1. Read local instructions and load only skills that materially help the chosen task before implementation. Prior work used verification and browser verification/control skills.
2. Save a proportionate problem/evidence/risk/scope/steps/acceptance plan under `docs/plans/`. Proceed without an extra plan approval gate.
3. Write meaningful behavioral tests and record expected failures before production changes. Include normal, boundary, invalid-input and valid-design controls. Characterization for behavior-preserving changes may already pass; infrastructure failures are not behavioral red evidence.
4. Implement the smallest correct change, then refactor with tests green. Preserve IDs, copy/assets, paint order, group membership and brand styles. Keep diagnostics, rendered visibility, human quality and integration evidence distinct.
5. Run `npm test` and `npm run build`; for layout/fonts also native verification, benchmark and image inspection. For UI/browser changes inspect `/verify.html` and affected interactions. Check hosted CI for the published revision; archive reviewed evidence separately from generated reports.
6. Fetch before publishing; preserve concurrent changes. Direct commits/pushes to **main** remain the default. PRs/reviewer approvals are optional. Any optional branch must use **jo/**, never codex. Use the configured human Git identity without AI co-author credits.
7. Update progress and issue/board status accurately, including any remaining scope. At completion assess whether a reusable skill would help; create one only for a useful repeatable procedure not already covered.

## Practical verification notes

- CI pins Node 24.20.0 and Playwright 1.63.0 on Ubuntu 24.04. Use `npm ci --cache .cache/npm` locally. Generated output belongs under `reports/`; dependencies/caches/build output stay uncommitted.
- This desktop denied standalone Chromium launch through its Mach-port sandbox. Connected-browser acceptance worked, and the actual headless specification passed on GitHub Linux. Do not weaken tests or label a launch denial a product regression.
- In the prior session GitHub CLI authentication was expired and the connector returned 404 for this private repository; SSH Git and the signed-in browser worked. Recheck available capabilities in the new session; do not inspect or extract browser credentials.
- Check command exit codes explicitly. Use `set -e` or separate calls so a later successful command cannot mask a failed acceptance script. GitHub's virtualized logs can produce incomplete excerpts: verify required content is present before archiving.
- No local server from this task remains running. Permissions and browser bindings may not transfer to the new task.

Skill assessment for this documentation handoff: repository instructions and these notes cover the repeatable process; no new skill is warranted.
