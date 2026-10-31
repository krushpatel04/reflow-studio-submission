# October 8 repository reconciliation and cleanup

## Problem and decision
The October 5/6 entry documents predate the merged Python engine and Quoroum milestones. CI covers the TypeScript workbench but not the canonical Python path; packaging tests and engine font discovery assume a contributor's host. Large historical JSON reports are useful evidence but needlessly inflate the current checkout.

Keep one Python submission engine using the official starter orchestrator, renderer and schema at `a44a06046b0413f0785e7203955c3822e0acbc32`. Keep the TypeScript workbench/corpus tools as optional development/reference code. Do not restart a rewrite or delete useful algorithms, fixtures, evidence, or unmerged collaborator work. Adobe's released brief/starter are authoritative; no all-repository language restriction was found.

## Scope and steps
1. Read Adobe launch communication, current brief/starter, merged history, open issues/PRs and both Reflow Quoroum channels. Separate reported progress from repository/test evidence.
2. Make README and status navigation current; preserve the old workbench guide and dated evidence. Record limits and prioritized follow-ups in one audit.
3. Replace host-specific engine/test prerequisites with explicit `CHAMELEON_UPSTREAM`; test missing-resource and valid-resource behavior before changing font lookup. Add a Python CI job using the pinned starter and fail on skipped tests.
4. Losslessly gzip the four large September 22 product review/benchmark JSON archives; repair links and verify byte-for-byte recovery. Preserve all assets and Git history.
5. Run Python regression tests, Node tests/build, link/archive checks and review the final diff. Update affected issues with precise current evidence; fetch before publishing.

## Risks and acceptance
- Existing reports and scripts must remain usable. Check archive references; leave runtime report generation unchanged.
- Missing dependencies/fonts must not silently produce a green Python job. Run a missing-font negative control and actual tests with the pinned resources.
- Do not call host tests an offline-container proof or technical scores human visual approval. Current-tree offline, independent visual review and native Express gates remain explicit.
- Preserve unrelated local changes by using the clean audit checkout; original checkout filesystem reads stalled.
- Documentation edits require link/status checks, not tests that assert prose. No new skill is needed for this bounded maintenance task.

## Additional observed portability defect
Existing assembly behavior tests fail on macOS because BSD `realpath` rejects `-m`. Use Python standard-library path resolution (Python is already required) and rerun the existing path/symlink/collision/interruption controls; do not weaken safety checks.

## Validation record
Completed results are recorded in [the October 8 audit](../repository-audit-2026-10-08.md#validation-of-this-cleanup): font red/green controls, assembly regression controls, 267 Python tests with zero skips, 685 Node tests, build, 30 native layouts, benchmark and archive/link checks.

## Hosted regression discovery
The newly enabled Linux Python job on `9b4c71a` ran 266 tests and exposed six existing assertions failing: three output hashes and three wrap-cap subcases. Local Pillow has RAQM unavailable and uses BASIC; Pillow otherwise selects RAQM automatically. Pin BASIC explicitly to preserve the established measured behavior across hosts, add a fractional-size metric characterization against explicit BASIC, and retain all existing assertions. BASIC does not qualify complex-script shaping. The hosted failing run is [37801378730](https://github.com/kj-squared-labs/reflow-studio/actions/runs/37801378730); re-run Linux plus local regression checks after the fix.

The next Linux run (`b22bdb0`, run 37802175214) confirmed RAQM available / FreeType 2.14.3. All six original failures passed; one independent overflow helper still auto-selected RAQM. Make its measurement backend explicitly BASIC as well, while retaining its separate wrapping/overflow implementation, all thresholds and the genuine Skia tests. Do not relabel this as renderer glyph parity.
