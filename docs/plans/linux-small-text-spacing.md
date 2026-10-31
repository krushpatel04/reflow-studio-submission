# Pinned Linux small-text spacing experiment — 2026-10-15

Owner A; reviewer D; baseline f97c5aab9871446ee678c3302b57dae8dda4f4f7.
Production freeze 16:54:10Z; no heavy jobs after 17:24:10Z; stop 17:49:10Z.

Issue #148 reports platform-dependent gaps at 6–8 px. Existing macOS evidence
shows fractional/integer render identity in roomy boxes, but cannot isolate the
Linux mechanism or establish human readability. Raising the floor without this
evidence could damage groups and geometry. No engine or official renderer edits
are proposed in this diagnostic slice.

1. Characterize the archived 50-render reproducer: exact denominator, all five
   strings and rotations, nonempty real ink, pinned face events, no fallback,
   and twenty fractional/integer pairs. Run against the existing script first;
   passing characterization is expected and no artificial RED is introduced.
2. Extract a reusable bounded diagnostic CLI. Retain PNGs and JSON beneath
   reports/ci/python/spacing for the existing hosted artifact uploader. Record
   actual source/renderer hashes, versions, glyph IDs, advances, default font
   policy and separate diagnostic metric-policy observations. Never monkeypatch
   the renderer. Save 1x and nearest-neighbor 2x views for human review.
3. Run unchanged behavioral characterization against the extracted tool; run
   npm test/build and required full Python gate in the coordinated shared-host
   slot. D reviews exact candidate before root publishes/dispatches Ubuntu CI.
4. Compare matched Linux/macOS measurements and actual images. Separate measured
   advance differences, integer truncation and any unisolated raster behavior.
   Do not claim a causal fix from a scalar or AI visual observation. A production
   remedy, if justified, needs its own behavioral RED and Linux before/after.

Acceptance: all 50 rows and 20 paired controls accounted for, exact face bytes,
real renderer/no fallback, original text/geometry retained, reproducible files
and provenance, explicit no-human-verdict status. Issue #148 remains open until
actual Linux 1x/2x human acceptance; parent #3 is not closed by this slice.
Fallback: bounded existing-font/script qualification inventory, no model work,
sealed inputs, downloads, renderer fork, or global font floor adjustment.

Reusable skill assessment: existing project workflow suffices; this is a small
repository diagnostic rather than a new skill.

## Initial evidence

Archived reproducer characterization: 2 tests passed, 50 renders/20 pairs.
During extraction, inspection found zero glyph IDs/advances in the separate
metric face despite correct real-renderer PNGs. The new nonzero-glyph/advance
assertion failed (2 tests, 1 failure); retaining the loaded font bytes for the
Skia face lifetime made the unchanged test pass (2/2). Logs are preserved under
`docs/evidence/2026-10-15-linux-spacing/`. This corrects the diagnostic's borrowed
font-data lifetime; it does not alter engine or renderer policy. Metrics from the
archived inline temporary-byte probe must not be treated as qualified without
checking their glyph/advance values. PNG evidence has independent real-renderer
font binding and remains distinct.
