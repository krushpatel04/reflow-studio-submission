# Invalid element type boundary

Problem/evidence: `_fields` checks untrusted `type` with dictionary membership; a JSON array such as `["text"]` raises `TypeError` instead of the path-specific `ValueError` promised by the input boundary. This hides the invalid field from callers. The existing contract suite covers valid text/image/shape and malformed outer containers, not this field shape.

Scope: add a focused invalid-type regression in `tests_python/test_contract.py`; guard the type before membership in `engine/resize.py`. Preserve the current accepted type values and output unchanged. No schema expansion.

Risk: a broader guard might reject valid string types or change other diagnostics. Keep the existing identity test for all three valid types as positive control.

Steps/acceptance: run the new test against main and record its expected TypeError failure; implement the smallest guard; rerun the focused test and full pinned Python gate, `npm test`, and `npm run build`. All tests must pass with zero skips. No container qualification or visual-quality claim follows from this validation fix.
