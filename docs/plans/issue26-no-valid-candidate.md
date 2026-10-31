# Issue #26: reject structurally invalid generated output

**Owner:** engine. **Branch:** `jo/reflow-engine`, base `f08a795`.

## Problem and evidence
`reflow()` ranks candidates by `metrics.errors` and always returns the best one. A 1×1 source with a finite
decoration `width: 1e308` scaled to 8000×8000 overflows to `Infinity`. Every candidate then gets one
`invalid-design` finding (`evaluate` short-circuits), yet `selected` is the "least bad" one and the CLI
serializes the `Infinity` as JSON `null` with exit 0. Probe: all candidates `errors=1 [invalid-design]`, selected `uniform`, width `null`.

## Why it matters
Callers and the CLI treat a returned `selected` as success. Structurally broken output (non-finite geometry,
lost/duplicated content, changed protected fields, broken group transform) must never be reported as success.

## Intended behavior
- Structural failures = findings of kind `invalid-design`, `missing-content`, `preservation`, `group-geometry`.
  Candidates carrying any are not eligible for selection.
- Eligible candidates are ranked by the existing comparator. Layout findings (`collision`, `text-overflow`,
  `out-of-bounds`, `occlusion`, `low-contrast`) and warnings stay visible in metrics and do NOT disqualify:
  they are unresolved quality findings, reported separately.
- If none is eligible, `reflow` throws `NoValidCandidateError` (code `no-valid-candidate`, carries per-candidate
  structural findings). Source is never mutated. `baseline` is not returned as a fallback.
- Worker reports it as structured stderr `{category:'engine', code:'no-valid-candidate'}` with exit 1 (output fault, not input fault); no stdout.

## Scope
`src/engine.ts` (gate, error class, exported `selectCandidate`), `scripts/reflow-worker.ts` catch mapping only.
No typography/CLI-collector changes.

## Payload and known limitation
`NoValidCandidateError.findings` is deduplicated by kind+message and capped at 20; `total` keeps the full count.
Known limitation: `reflow()` can now throw, and `src/main.ts` (`redraw`, benchmark) plus `scripts/{benchmark,verify,defect-pack,font-parity}.ts`
do not catch per target. No bundled fixture triggers it (suite green); per-target error display belongs to #28 (viewer request lifecycle).

## Risks
Over-rejecting legitimate designs → positive controls: all fixtures × several targets still succeed; warnings
(small text, unsupported glyph, crop-loss), intentional overlap, and unresolved text-overflow still return a result.

## Acceptance
1. Overflow probe throws `no-valid-candidate`; source deep-equal before/after.
2. `selectCandidate` skips structurally invalid candidates even if they have fewer errors count; throws when none.
3. Controls above stay green; worker emits structured failure, no stdout.
4. `npm test`, `npm run build` pass.
