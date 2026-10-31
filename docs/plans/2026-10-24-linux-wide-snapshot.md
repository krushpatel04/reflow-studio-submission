# Linux wide-text snapshot parity

Problem/evidence: After the wide text ink fix, macOS produces Level 2 JSON SHA-256 `ffb1c47a38c4b7cec22de370e40507360418bf8953a19de3d3b59a52c9a06a4c`, while pinned Linux CI on PR #149 produces `aff4133377a8b693eead2219df8533c7ad162ab4c3ac19bd507a1ec8c7b27204`. Both snapshot tests fail on Linux; the real-renderer ink assertion passes there. Skia metrics already produce platform-specific Level 3 snapshots.

Scope: Record the two observed platform-specific Level 2 snapshot hashes in the existing tests. Keep Level 1 and Level 3 expectations, the independent rendered-ink assertion, and production behavior unchanged. Do not claim visual-quality acceptance from hashes.

Risk: A snapshot could conceal an unintended geometry regression. Bind the Linux value to this exact CI run and retain the real-renderer ink and structural suites as independent controls. Reject unknown platforms rather than silently accepting any output.

Checks: The existing regression fails twice on Linux in [PR #149 CI run 40135548171](https://github.com/kj-squared-labs/reflow-studio/actions/runs/40135548171), with actual hash `aff413...` versus macOS expected `ffb1c...`. Update only the expected values; run pinned Python verification, Node tests/build, native verify/benchmark, and browser acceptance locally, then require fresh Linux CI to pass the Python test step before merging. Artifact upload quota remains a separate failure and must stay visible.
