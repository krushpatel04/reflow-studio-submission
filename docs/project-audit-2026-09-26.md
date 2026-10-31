# Reflow project audit and handoff — September 26, 2026

> Historical September 26 record. The [October 1 source refresh](evidence/2026-10-01-competition/README.md) supersedes its current-document names and date assumptions; retain this record for the evidence observed at the time.

Follow-up correction and current priorities: [Figma intake](figma-intake.md) · [updated roadmap](roadmap-2026-09-26.md). The execution record below describes the initial audit; later issue/project reconciliation is recorded in the linked roadmap plan.

## Scope and conclusion

The project has a working, tested local prototype and substantial corpus preparation. It does **not** yet have independent held-out quality evidence, a verified official offline adapter/renderer path, or a verified native Adobe round trip. Issues [#7](https://github.com/kj-squared-labs/reflow-studio/issues/7) and [#4](https://github.com/kj-squared-labs/reflow-studio/issues/4) remain open; completing small slices does not satisfy their full acceptance.

Audit baseline: `c4af8e7f27ec028b22d0473e3f9040f39a029a70`, matching fetched `origin/main`. Reviewed September 15–26 commit history, every listed PR, all 30 issues, live project statuses, local branch inventory, recent source/test changes, and dated evidence. The detailed change focus is since the September 22 roadmap baseline `4adaba4`: 200 files, mostly reports/corpus evidence. This is a delivery audit with targeted technical review, not a claim that every generated artifact received a new visual inspection. [Plan](plans/2026-09-26-project-audit.md) · [Commit/PR inventory and fresh checks](evidence/2026-09-26-project-audit/README.md).

The requested two issue sessions were started in separate worktrees with disjoint ownership. Their results and integration status are recorded below. The coordinator owns this audit and its README link. No unrelated untracked files, vault updates, reviewer votes, or external outreach are included.

## New official evidence changes the critical path

The separate #4 audit directly inspected the official PDF hub and the linked starter. [Full dated contract and conflicts](evidence/2026-09-26-issue4/competition-contract.md) · [Field-level support matrix](evidence/2026-09-26-issue4/schema-support.md).

- **Challenge v1.5 (added September 24) explicitly removes the Stage 1 viewer requirement.** The starter FAQ still requires it. Use the revised brief as the working planning assumption, retain the contradiction, and resolve it before submission. Native Express is still relevant to the finale; do not quietly delete that acceptance from #4.
- The [official-linked starter](https://github.com/jhaaj08/chameleon/tree/a44a06046b0413f0785e7203955c3822e0acbc32) now publishes a **provisional v0.9 schema**, Python entry point and renderer. “No schema available” is no longer an accurate blocker. Availability is not final sign-off, pre-release reuse permission, or successful Reflow compatibility.
- Stage 1 has **no hard execution-time deadline** in the reviewed brief/rules. Existing Reflow bounds remain internal reliability controls. Exact resource allocations and model eligibility details remain unresolved.
- The brief and FAQ disagree on advancing-team count and finale code-change policy. The hardware description and amd64 starter also need reconciliation. Do not carry older top-three, mandatory-viewer or unreleased-schema assumptions forward without the dated source record.
- The next technical #4 checkpoint is **official source → adapter → existing engine → official JSON/renderer**. Font/image fidelity and unsupported-field reporting feed #7 directly. A native editable probe remains a separate host/product track.

## Recent work: completed and integrated

| Work | Landed evidence | What completion establishes |
| --- | --- | --- |
| Internal contract and preservation | #2; PR #18; `6bc0259` | Validated provisional schema and content/style/inventory checks; not Adobe schema compatibility |
| CI and bounded offline entry point | #13, #23, #24 closed; `63393d5`, `a313fa0`, `f579dd4`, `4adaba4` | Provisional CLI/container, regular-file rejection, hosted network-disabled smoke and retained fault controls |
| Typography and product-layout slices | `3772c3e`, `b4ba15c`, `ffe9b93`, `ad9fb8d`; #3/#5/#12 | Font parity probes, whole-product grids, four-product row and transition repairs; not broad independent visual superiority |
| LICA import and accounting | `ed2d29a`, `41dae3b`, `09deb9e`, `d2a123e`, `91c3e55`; #7/#31/#32 | 21 external designs; stable family split lock; all 1,148 input dispositions; bounded append-only expansion tooling |
| Crop/visibility and renderer checks | `97a9179` through `80b86c9`; #6 | Continuous focal crops, localized findings, browser/native rendered controls, 24 author-labelled defect cases; independent labels and native Adobe checks remain |
| Source audit | `68cd183`, `3b5e606`; #7/#34 | Reproducible source/resource hashes and text measurements; sealed files excluded before access; content-bound font aliases |
| Corpus resource catalog/preflight | `c4af8e7`; #33 | 21 sources / 147 source-target rows catalog-ready; actual font/image decoding, engine execution and rendering remain separate |
| Contributor tooling and discovery record | `2977f4c` through `55bd10c`; `3d08dd9` | Isolated launcher/reservations, default-branch discovery, and honest Express access/Level 1 notes |

All five PRs are merged: [#1](https://github.com/kj-squared-labs/reflow-studio/pull/1), [#15](https://github.com/kj-squared-labs/reflow-studio/pull/15), [#16](https://github.com/kj-squared-labs/reflow-studio/pull/16), [#17](https://github.com/kj-squared-labs/reflow-studio/pull/17), [#18](https://github.com/kj-squared-labs/reflow-studio/pull/18). No open PR review is blocking delivery. Most later work landed directly on main, consistent with repository policy. Latest baseline [hosted CI passed](https://github.com/kj-squared-labs/reflow-studio/actions/runs/36050912871). The recent failed `rendered-mismatch` workflow is an explicitly injected negative control, not an unexplained main regression.

## In progress, blockers and audit findings

- **#7 quality gate:** [Figma sourcing is complete for two practice designs and two privately recorded sealed selections](figma-intake.md); they are not admitted to the committed manifest. The manifest has 10 corpus families (7 development, 3 already-seen validation, **0 test**). All 21 sources are adapted. Catalog readiness cannot clear conversion losses, embedded-photo permissions, missing grouped/busy-photo coverage, or independent review.
- **#33 runtime gap:** the default benchmark still uses authored fixtures; the native renderer/CLI still use bundled resources. The new loader supplies source-specific bytes but does not connect arbitrary corpus fonts and images to the production render path. **67/229 asset dimensions remain unverified** in the preflight inventory.
- **#34 fidelity gap:** fresh audit reproduces **76/293 texts above 115% box height across 11/21 sources**. Historical collaborator evidence was 189/293 across 16/21; method parity is unavailable, so neither is a canonical visible-clipping count. All 293 imported text rows have unknown declared glyph coverage. Preserve the historical **3 close / 17 differ / 1 failed** visual check and four dropped missing-height paragraphs as source/conversion findings.
- **#4 integration gates:** this session again reached Adobe sign-in in a dedicated browser session, so no native operation is verified. The published offline contract has concrete gaps: nonzero rotation, italic/letter spacing, rich style runs, strokes/lines, zero-size elements, and semantic roles are not faithfully supported. Official input supplies no role labels; role assignment is a design decision, not lossless serialization. The starter can produce a fallback PNG, so adapter verification must assert that the actual official renderer ran.
- **P2 resource error boundary, reproduced:** `assetSize` directly calls `decodeURIComponent`/`atob`. With custom resources returning `data:image/svg+xml,%not-valid` or `data:image/png;base64,%%%%`, both `renderSvg` and `reflow` throw raw `URIError`/`InvalidCharacterError`. `validateResources` accepts either nonempty string. This is not a failure of the bundled valid assets or the hash-verified catalog. Add malformed-data controls and structured failure/unknown-size policy before broad adapter input (#4/#33, coordinate #6). No production fix is claimed here.
- **Tracking drift:** the live board is accessible. #3 is **Done** on the board but **OPEN** as an issue; reconcile its full acceptance before choosing a final state. #31/#32 remain Backlog despite landed slices, and #7/#4 are Ready despite the newly started sessions. Historical status paragraphs in `docs/progress.md` are chronological, not a single current status. Do not close umbrellas merely to make counts tidy.
- **Existing unfinished work:** unmerged review-bundle commit `df465a0` was found on `jo/issue7-review-bundle` and assigned to the #7 session for recovery. An old #25 worktree remains present; its edits are not assumed validated or integrated. The three pre-existing untracked files were left untouched.

Reproduce the resource-boundary finding from the repository root (no network or input mutation):

```sh
node --import tsx --input-type=module - <<'JS'
import { FIXTURES } from './src/fixtures.ts';
import { reflow } from './src/engine.ts';
import { measure } from './scripts/native.ts';
const design = FIXTURES.find(d => d.elements.some(e => e.type === 'image'));
const resources = { resolveAsset: () => 'data:image/svg+xml,%not-valid', supportsFont: () => true };
reflow(design, { id: 'square', label: 'Square', width: 1080, height: 1080 }, measure, resources);
JS
```

Expected audit observation at baseline: `URIError: URI malformed`, rather than a structured resource diagnostic.

## Issue #7: requirements, plan and dependencies

**Owner:** Krush, with JD on execution and Junho on rendering. **Status:** open; corpus plumbing is substantially landed, but the independent quality study is not complete.

Requirements include permissioned external designs, stable family/target splits, untouched test families, matched uniform/group-aware/current outputs, all-input failure accounting, seeded blind review with separate acceptability/preferences, raw votes and family-level uncertainty. The original six-family/three-held-out gate and later 20-source pilot are staged internal targets; final adoption evidence calls for broader untouched-family coverage. Existing seen LICA families cannot be relabelled as a clean holdout. The [reconciled Figma intake](figma-intake.md) records two practice designs and two privately recorded sealed selections. The earlier audit omitted the completed private selections; zero test families refers only to the committed manifest. Selection is complete, while permission clearance, conversion fidelity, family/exposure review and frozen admission remain separate.

1. Recover and validate `df465a0`; complete a usable artifact-export slice with method-blind reviewer files, private decoding, hashes, reversed controls and blank votes. This is the current separate-session scope.
2. Complete #34 source classification: missing-height copy, line-box/font semantics, non-scaling SVG strokes, actual glyph coverage and resource permissions. Quarantine unresolved rows while retaining the denominator.
3. Complete #33 on development/validation only: connect `loadCorpusSource(root, source)` to a matching source-isolated measurer/renderer; resolve image dimensions; run unchanged source plus uniform, competent group-aware and current outputs under external per-case bounds. Retain crash, timeout and infeasible rows.
4. Complete #31/#32 remaining coverage/intake: permissioned fresh external families, near-duplicate review, explicit grouped and busy-photo coverage, target/config freeze and exposure ledger. Do not open sealed files during development.
5. Feed eligible matched artifacts into the shared #7/#20 review pipeline; collect real independent judgments, including ties/neither/unsure and each output's acceptability. Team-only judgments remain exploratory.
6. Analyze by family and failure category, separate missing-candidate from wrong-selection defects, freeze final analysis before unsealing, and archive reproducible outputs/hashes/uncertainty. Integrate #4's official offline renderer first and matched native comparisons when available.

**Dependencies/blockers:** #2 is complete; #33/#34 are prerequisite child work; #3/#6 supply font/render constraints; #4 supplies official adapter/renderer fidelity, native comparison and eligibility information; #8 supplies runtime budgets. Human judgments, creator permissions and fresh untouched families cannot be fabricated or replaced with heuristic scores. Not all #7 preparation must wait for #4.

## Issue #4: requirements, revised plan and dependencies

**Owner:** Krush, coordinating JD/Junho. **Status:** open; no native completion claim at the audit baseline. The smallest native operation is an early checkpoint, not the full exit gate.

1. Use the newly pinned official starter/schema and this session's support matrix to define the smallest supported offline slice. Record source versions, renderer dependency versions and the outstanding rule conflicts before claiming qualification compliance.
2. Write meaningful adapter tests for exact IDs/copy/assets/z-order and original-object preservation; add positive plain-text/shape/image controls alongside unsupported rotation, rich text, strokes, line shapes, zero dimensions and >100 elements. Define role assignment explicitly instead of inferring semantic truth from IDs.
3. Implement the smallest adapter boundary around the existing engine, including exact-byte font/image resolution. Run unchanged source and transformed output through the actual official converter/renderer; an advisory self-check or placeholder PNG is not a pass.
4. Exercise the Python/container entry point under network-disabled execution with bounds, malformed/missing resources and all-failure accounting. Match #33 output provenance to #7 review artifacts. Keep organizer hardware/model questions separate from operational safeguards.
5. In the separate native track, authenticate to Express, use a disposable permissioned document, and prove editable text/shape creation plus undo. Then map text/images/groups/layers and preserve native identity/copy/styles/paint order.
6. Complete native read → transform → apply → edit → save/reopen, including partial failure and retry without duplicates. Hand both offline and native evidence to #35, with Stage 1 versus finale scope explicit.

**Dependencies/blockers:** the published provisional schema permits implementation to start now. Final sign-off, rule conflicts, actual font/renderer fidelity, runtime reproduction and usable host authentication remain separate gates. A documentation page or successful local build cannot certify native behavior. Do not make the offline adapter wait for native sign-in; do not claim a native result from an offline PNG.

## What these issues unblock

These are acceptance dependencies from live issue bodies, not claims that every dependent issue is wholly blocked today.

| Pending issue/task | Gate supplied by #7/#4 | Work that becomes actionable; remaining conditions |
| --- | --- | --- |
| [#5](https://github.com/kj-squared-labs/reflow-studio/issues/5), [#12](https://github.com/kj-squared-labs/reflow-studio/issues/12) | #7 independent candidate-versus-selection evidence | Prioritize generation/ranking/transition fixes from real failure categories and validate gains; ordinary regression repairs can already proceed |
| [#20](https://github.com/kj-squared-labs/reflow-studio/issues/20) | #7 faithful eligible outputs and review pipeline | Collect the real preference/acceptability pack; source rights, renderer controls and human review still required |
| [#21](https://github.com/kj-squared-labs/reflow-studio/issues/21) | #7/#20 labels; #4 eligibility | Fit/evaluate a duplicate-safe learned baseline; #8 cost limits and #6 features still apply; interface tests can start now |
| [#19](https://github.com/kj-squared-labs/reflow-studio/issues/19), [#22](https://github.com/kj-squared-labs/reflow-studio/issues/22) | #7 independent evidence plus #4 model/dependency rules | Run the bounded optional ranker/scorer experiment and keep/stop decision; #8 hardware/runtime and adequate labels remain gates |
| [#9](https://github.com/kj-squared-labs/reflow-studio/issues/9) | #4 host capability findings | Finalize host-specific interaction choices with #3/#6; local keyboard/mobile work need not wait |
| [#10](https://github.com/kj-squared-labs/reflow-studio/issues/10) | #4 observed Express behavior; #7 cleanup measurements | Test a truthful storyboard with three creators and measure correction effort; actual participant work remains |
| [#14](https://github.com/kj-squared-labs/reflow-studio/issues/14) | #4 native persistence/recovery and #7 engine quality | Implement durable campaign corrections only after #10 validation, preservation/visibility readiness and verified finale rules |
| [#8](https://github.com/kj-squared-labs/reflow-studio/issues/8), native part of [#6](https://github.com/kj-squared-labs/reflow-studio/issues/6) | #4 official resource/runtime/renderer contract | Implement against the published provisional contract and verify the real renderer; final hardware/model limits remain unsettled, and profiling/local fixes can proceed now |
| [#35](https://github.com/kj-squared-labs/reflow-studio/issues/35) | #4 official offline compatibility and #7 M3 quality evidence; native evidence for finale | Rehearse exact release artifacts in a second environment; #8/reliability gates remain, while mandatory Stage 1 viewer scope needs reconciliation against revised brief |

#31–#34 are prerequisites feeding #7, not tasks waiting for #7 to close. #25–#30 contain useful correctness/viewer work that is not generally blocked by #7/#4. Avoid putting the entire backlog behind these two umbrellas.

## Timeboxed execution and next-session handoff

- Coordinator baseline verification: **447/447 tests**, production build, corpus check (**0 errors / 1 expected missing-test-family warning**), and preflight (**21 sources / 147 catalog-ready rows**) passed. Source audit freshly reproduced 76/293 and 11/21; no quality inference follows.
- **#7 completed slice and publication:** recovered generator integrated as `20f205e`; verified PNG export integrated as `61053e7` and pushed to main (remote SHA verified). [Detailed handoff and red/green evidence](evidence/2026-09-26-issue7-review-bundle/README.md). Integrated full suite **465/465**, build passed; [hosted CI also passed at 61053e7](https://github.com/kj-squared-labs/reflow-studio/actions/runs/36281386849). Opt-in `--materialize` checks exact PNG hashes and metadata, bounded regular-file reads, opaque source/A/B copies, null votes, excluded/failed accounting and ordinary-error cleanup. Synthetic packaging only; caller still enforces split/fidelity eligibility. No corpus quality or human review claim.
- **#4 completed audit slice:** current official contract/conflict record, all 28 schema element fields mapped, SDK capability matrix, pinned starter `a44a060`, actual Express/Playground sign-in evidence and unexecuted native probe checklist. [Detailed handoff](evidence/2026-09-26-issue4/README.md). No adapter, official renderer execution or native operation is claimed. Integration/publication SHA is recorded in the final execution record below.
- No full resolution of either umbrella is expected without the human/host/source evidence above. Keep both issues open.
- Next session should first verify remote main and this handoff's final SHAs, then choose one finite remaining slice: **#4 official Level 1 adapter/real-renderer round trip**, coordinated with #33 source-specific rendering and #34 triage. Native authentication/probe can proceed separately for the finale track. Do not repeat completed manifest, preflight, review-export or contract-audit work.
- Skill assessment: no new reusable skill is warranted for this audit; repository workflow and existing browser tooling cover the repeatable steps.

### Immediate next steps by owner

- **JD + Krush:** agree the official Level 1 adapter boundary and role-assignment policy; start preservation/unsupported-input tests, then wire the existing engine and real official renderer. Treat fallback PNG output as a failed rendering claim.
- **Junho + Krush:** reproduce source font metrics/line boxes and actual image decoding, classify #34 losses, and supply #33 a source-isolated matching renderer. Do not change source text or shrink it to hide conversion defects.
- **Krush:** reserve genuinely new permissioned test families, close coverage/permission gaps, and run the review-export tool only on eligible neutral artifacts. Collect actual reviewers' independent labels after the protocol is frozen.
- **Team coordination:** reconcile #3 board/issue state and #31–#34 landed checklists; clarify viewer/finalist/finale-freeze/hardware conflicts with organizers through an explicitly authorized communication. No outreach was sent during this audit.
- **Native track:** authenticate in a usable Express development session and execute the recorded scratch-document probe. This does not block offline adapter work.

### Final execution record

- #7 session: `01a0e025-6c9d-7e02-8932-13d3c7e47893`, branch `jo/issue7-review-bundle-export`; branch head `c6e3083` integrated on main as `20f205e` + `61053e7` and pushed. Code validation: 465 tests, build and hosted CI pass.
- #4 session: `01a0e025-6c9d-7e02-8932-13e5321ce5db`, branch `jo/issue4-capability-audit`; branch head `2ad18d7` integrated as `3a45184`. Documentation-only validation: source/field coverage, JSON parsing, local links and whitespace; no invented code tests or host acceptance.
- Coordinator: completed the 60-commit/five-PR/30-issue inventory, live board reconciliation findings, baseline reruns, targeted malformed-resource reproduction, dependency mapping, two issue plans and this handoff. README now points to the revised qualification evidence.
- Both umbrella issues remain OPEN. No board status change, issue closure, external outreach, reviewer vote, source import, model adoption or vault update was performed.
- The completed integration and audit are to be pushed together after final link/diff checks within the requested 30-minute window. The final response records the verified remote commit; inspect `git log` for the audit commit containing this document.
