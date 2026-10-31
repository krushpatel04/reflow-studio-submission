# Large integer input boundary

Problem/evidence: `_num` calls `math.isfinite` on any Python integer; `10**1000` raises `OverflowError` rather than the documented path-specific `ValueError` for an invalid geometry/scalar. JSON can contain such integers. The prior invalid-element-type fix does not cover this numeric boundary.

Scope: test huge integers in element geometry and an optional scaled scalar; keep valid integer controls. Make `_num` return false when conversion overflows. No schema or layout change.

Risks: rejecting ordinary finite integers or masking an unrelated arithmetic error. Constrain the exception handling to `_num` and preserve existing valid-type/geometry tests.

Steps/acceptance: add a regression and run it red on current code; fix `_num` minimally; run the focused contract suite, pinned full Python gate, `npm test`, and `npm run build`. Require zero skips. This is input-boundary hardening, not visual or offline-container qualification.
