# Reflow Studio

Reflow Studio resizes structured designs for Adobe's Project Chameleon. Its **Python engine** implements the pinned starter's `resize(source, target_canvas)` contract and produces editable JSON plus rendered PNGs. The TypeScript viewer is a development workbench, not the submission engine.

**Status:** The [actionable team review checklist](docs/release/2026-10-27-submission-review.md) records the candidate source, engine/package hashes, image identity, actual qualification results and remaining decisions. Checks apply to their recorded source and image; earlier passes do not qualify later edits. The packet is prepared for team review; nothing has been submitted.

## Stage 1 scope

Current work covers demonstrated Python layout/readability and performance issues, final qualification, and the separately authorized refinement of the existing development viewer. The current challenge PDF describes an engine submission for Stage 1 and a full add-on for the finale; the starter FAQ still requires an unscored Stage 1 viewer. That conflict remains open in the [review packet](docs/release/2026-10-27-submission-review.md). ML experiments, campaign state, creator studies, corpus expansion and full native-editor development are deferred. Existing viewer tools remain available while the minimum required viewer deliverable is clarified. See the [readiness plan](docs/plans/2026-10-27-submission-readiness.md). Deferred and superseded issues are closed as not planned in the [issue disposition](docs/release/2026-10-27-issue-scope.md); [#35](https://github.com/kj-squared-labs/reflow-studio/issues/35) is the Stage 1 parent rollup, with assigned review/input tasks #157–#160 in the team checklist.

## Approach

The Python engine starts with a uniform fit and tries guarded geometric arrangements for heading/body articles, artwork and dense campaign layouts when the source structure supports them. It fits text using measurements from the exact bundled fonts and keeps the established fallback for unsupported cases. Layout changes preserve source copy, image assets, element IDs, paint order, group membership and protected brand styles. Processing is local; the engine uses no external model or runtime API.

## Run offline

Requires Git, Python 3 and Docker with a Linux/amd64 build. From this repository's root, assemble the Python image from the [official starter](https://github.com/jhaaj08/chameleon) at `a44a06046b0413f0785e7203955c3822e0acbc32`, then run its public samples without runtime network access:

```sh
RUN_ROOT=$(mktemp -d)
git clone https://github.com/jhaaj08/chameleon.git "$RUN_ROOT/chameleon"
git -C "$RUN_ROOT/chameleon" checkout --detach a44a06046b0413f0785e7203955c3822e0acbc32
sh submission/assemble_context.sh "$RUN_ROOT/context" "$RUN_ROOT/chameleon"
docker build --platform linux/amd64 -f "$RUN_ROOT/context/Dockerfile.python-submission" \
  -t reflow-python "$RUN_ROOT/context"
mkdir "$RUN_ROOT/output"
docker run --rm --network none \
  -v "$RUN_ROOT/chameleon/input:/app/input:ro" \
  -v "$RUN_ROOT/output:/app/output" reflow-python
```

Inspect the JSON and PNG files in `$RUN_ROOT/output`. Build-time dependency installation needs network access; **runtime does not**. A successful run or PNG alone cannot prove real rendering: the starter can fall back to box images after an import failure. For renderer-provenance checks, input/output hashes, negative controls and troubleshooting, use the [operator runbook](docs/release/friday-2026-10-30/B-runbook.md). The root `Dockerfile` is the older TypeScript path; use `Dockerfile.python-submission` as shown.

## Verify and explore

The [Python verification gate](docs/ci.md) needs the same pinned starter, Python 3.11 and the test dependencies. Set `CHAMELEON_UPSTREAM` to the checkout above, then run `python scripts/verify_python.py`; skipped tests do not count as acceptance. The [workbench guide](docs/workbench.md) covers the optional TypeScript UI (`npm ci`, `npm run dev`) and its checks. Node/Chromium and corpus tooling are not included in the Python image.

## Evidence and limitations

- [October 30 professional viewer refinement](docs/evidence/2026-10-30-professional-viewer/README.md): consistent application chrome and artboard framing, persistent desktop properties, and responsive toolbar clearance. 744 Node/55 browser tests and production resource checks pass; includes reviewed light/dark screenshots.
- [October 29 ten additional viewer cycles](docs/evidence/2026-10-29-ten-cycle-viewer/README.md): draft recovery, keyboard editing, local issue inspection, drag panning, remembered theme, guarded export and refined artwork controls. 744 Node/53 browser tests plus clean-source production resource checks pass; Python qualification remains source-bound and unchanged.
- [October 29 five-cycle viewer refinement](docs/evidence/2026-10-29-five-cycle-refinement/README.md): preserved in-flight drafts, 35.5% fewer native browser measurement calls with identical outputs, removable custom formats, centered zoom and larger tablet artboards. 744 Node/43 browser tests and production budgets pass; the qualified Python artifact is unchanged.
- [October 29 finalist-focused refinement](docs/evidence/2026-10-29-finalist-pass/README.md): bounded exact glyph/font reuse, unchanged public and compact PNG/JSON hashes, measured 25% public Level 3 layout improvement, artwork-first mobile review, in-preview comparison, patched development dependencies, and clean-source qualification on `8b0485a`.

- [October 29 final viewer and compact-layout integration](docs/evidence/2026-10-29-medium-campaign/integration.md): 552 Python/744 Node tests, clean-source offline qualification on `14b9738`, five compact Linux formats with 9px+ text, viewer timing improvements and remaining costs.
- [October 29 compact campaign readability](docs/evidence/2026-10-29-medium-campaign/README.md): source-preserving improvement for small medium-aspect campaigns, five public-derived before/after comparisons and an explicit quality-versus-runtime tradeoff.
- [October 29 worker efficiency and review navigation](docs/evidence/2026-10-29-viewer-efficiency/README.md): 34→8 font loads, paired output preservation, and direct navigation through full-size formats.
- [October 29 final performance and viewer pass](docs/evidence/2026-10-29-final-performance/README.md): repeated font work removed, font retention capped, clean-source offline qualification on `5020706`, 544 Python/741 Node/29 browser tests and a readable workspace with actual-size inspection. Includes measured tradeoffs and a bottleneck disposition.

- [October 29 qualified engine refinement](docs/evidence/2026-10-29-engine-refinement/README.md): faster text search, stronger campaign readability, Astra review, 536 Python tests and clean-source offline qualification on `126c186`; public and 21 accepted development outputs preserved.
- [October 29 offline engine quality/speed slice](docs/evidence/2026-10-29-quality-speed/README.md): test-first font measurement reuse, measured local layout improvement, identical public JSON/PNG hashes and full dirty-source offline controls; historical precursor to the clean refinement above.
- [October 29 live verification](docs/evidence/2026-10-29-live-verification/README.md): fresh pre-optimization Python image and offline sample run, unchanged qualified output hashes, 27 browser tests, 20 verification-page checks and production/mobile interaction evidence.
- [October27 layout/readability evidence](docs/evidence/2026-10-27-layout-finish/README.md): five repaired development compositions, preserved source invariants and adversarial renderer controls. This is exposed development evidence.

- [Completed delegated Astra review](docs/release/2026-10-27-astra-jd-review.md): bounded technical/visual acceptance and unresolved organizer/access/participant facts.
- [Headless workbench verification](docs/evidence/2026-10-27-team-review/README.md): 27 browser tests, 20 verification-page checks, built-viewer offline/recovery checks and desktop/mobile screenshots. This is TypeScript workbench evidence, separate from Python qualification.
- [Current submission review packet](docs/release/2026-10-27-submission-review.md): candidate identity, qualification, visual review and remaining decisions. The [operator runbook](docs/release/friday-2026-10-30/B-runbook.md) retains detailed commands and troubleshooting; its earlier lane status is historical.
- [Current audit](docs/repository-audit-2026-10-08.md), [development history](docs/progress.md), and [CI](docs/ci.md): prior results are source-bound, not transferable to a changed image.
- [Official rules](https://github.com/jhaaj08/chameleon/blob/main/RULES.md): source-content preservation, JSON and rendered-PNG evaluation, offline execution. This repository's checks are not Adobe's scoring or acceptance.

Text fitting combines Pillow BASIC with pinned-renderer glyph measurements; complex-script shaping is not qualified. One public Level 3 sample deliberately refers to a missing badge asset, which the upstream converter renders as a placeholder. That is distinct from a full box-renderer fallback. See the [runbook](docs/release/friday-2026-10-30/B-runbook.md) before interpreting that sample.
