# Issue #26 criterion 1: generated underflow/degenerate boundaries

**Owner:** Engine3. **Source:** exact `240f0b6d6a278d7141edcd7e8dc46a351dc76be7`. **Scope:** characterization tests only.
Paths: `tests/engine.test.ts` (append), this plan, `docs/evidence/demo-20261015-generated-boundaries.md`. No production change.

## Gap
Existing #26 tests cover multiplicative overflow (`1e308`), injected selector findings and fixture controls. No real `reflow()`
input reaches the structural gate through generated underflow or degenerate division. Criterion 1 is "no structurally invalid
success": an allowed result must itself validate; a valid fallback is acceptable.

## Source facts
- `src/model.ts:84-87,140-142`: element width/height finite and > 0, endpoints finite. `5e-324` is valid input.
- `src/evaluate.ts:121-127`: invalid output short-circuits to one `invalid-design` before `groupGeometry` (`:51-73`).
- `src/engine.ts:10-20`: uniform multiplies by `s`; 8000→1080 gives `s=0.135`, so `5e-324*s === 0`.
- `src/engine.ts:22-24,84`: ungrouped backgrounds bleed to the target.
- `src/engine.ts:37-50`: single text/image units take cell geometry; other units scale by `min(cw/bw, ch/bh)`. Decorations are not units (`:33`).
- `src/engine.ts:180-185`: best structurally eligible candidate, else `NoValidCandidateError`.

## Fixtures (canvas 8000×8000, target 1080×1080, existing fake measure)
| ID | Input | Predicted |
|---|---|---|
| U1 | text + ungrouped decoration rect w=5e-324 | every candidate width 0 → throws, all `invalid-design`, source unchanged |
| U1+ | same rect as ungrouped background | bleeds → success, selected validates |
| U2 | ungrouped content text w=5e-324 | baseline invalid, stack/split valid → returns valid alternative |
| D1 | text + ungrouped content rect at 0,0, w=h=5e-324 | uniform 0×0; put scale ∞ → width ∞, x NaN → throws, all `invalid-design` |
| G1 | declared group: content plate 2000×2000 at 1000,1000 + decoration label w=5e-324 | label width 0 in every candidate → throws, all `invalid-design` |
| G1+ | same with label w=1 | success, selected validates, members inside target |

Every success asserts independently: `validateDesign(selected.design)`, no structural findings, finite positive geometry, source
deep-equal. No forced `NoValidCandidateError` where a real valid alternative exists; no injected findings or invalid sources.
G1+ deliberately adds no transform helper: coherence remains covered by `tests/grouped-layout.test.ts` `coherent()`.

Grouped-bounds residual left open: no real reflow() run has yet produced a candidate that passes structural validation but breaks its group transform. The rejection path src/evaluate.ts:51-73 feeding src/engine.ts:180-185 remains covered by injected findings and evaluator mutations, not this grouped-underflow child. G1 rejects invalid-design before groupGeometry; G1+ is a positive control. No #26 closure; final review must identify the remaining original-criteria proof/fixture gap or evidence of unreachability.

## Validation (one guarded window, ≤3 commands, each once)
Via `python3 /home/nala/.local/share/reflow-run-20261015/heavy_job.py timeout --signal=TERM --kill-after=5s 900s ...`:
1. `node_modules/.bin/tsx --test tests/engine.test.ts`  2. `npm test`  3. `npm run build`.
Launch only with ≥960 s of window left. Prediction mismatch: record actual findings as the oracle. A structurally invalid
success is a real RED: stop and report a separate fix claim. Passing characterization is acceptable.

## Limits
Fake measurer, no rendering, not CI or full qualification. Independent review and root publication remain.

## Normative correction 2026-10-14 (appended; the text above, including the residual note, is historical and unchanged)
**Source:** exact `9d261c6daf6bc3789c295cdc169602b433d66e57`. Original #26 body (root-persisted, SHA-256 `7acd736f4ca0bfe1ab50af7d3e30f1f27a6199b203967433979e21011f953f8c`). Acceptance, verbatim:
> - [ ] Regression covers overflow, underflow/degenerate geometry and grouped bounds; no success response contains a structurally invalid document.

**Root adjudication (recorded):** original #26 does not require `reflow()` itself to generate a fault. A joined chain at the real component boundary is a legitimate grouped-bounds regression:
actual generated candidates, then one finite test-authored fault on valid output, then production `evaluate`, then production `selectCandidate`.

**Test** (append to `tests/engine.test.ts`): `source = badge()`, target `square` (1080×1080).
- `r = reflow(source, square, measure)`; `others` = every candidate except `r.selected`.
- `shift` clones a candidate, moves `label` by `x += 10`, then re-evaluates the clone with production `evaluate`.

**Twin disclosure:** `badge` has no image unit, so `split` is a byte-identical clone of `stack` (`src/engine.ts:201-203`), and no group-grid exists.
If stack or split is selected, the valid fallback can be its twin.

The steps:
1. **Precondition:** no unmutated candidate has structural findings, and `others.length >= 1`.
2. **P0, unmutated control:** each candidate's `evaluate` output equals its stored metrics. `selectCandidate(r.candidates)` returns `r.selected`.
3. **P1, one candidate shifted:**
   - The shifted candidate validates.
   - Its only structural finding is `group-geometry` on `label` and `plate`.
   - `selectCandidate([m, ...others])` does not pick `m`; it picks the same candidate as `selectCandidate(others)`.
   - The picked candidate validates and has no structural findings.
4. **P2, every candidate shifted:** after re-checking the precondition, selection throws `NoValidCandidateError`. Every finding is `group-geometry`, and the source is unchanged.

Not used: injected findings or metrics, a mirror, an invalid source, `src` changes.
**Limits:**
- This does not claim `reflow()` spontaneously generates a group-broken candidate.
- The internal call at `src/engine.ts:213` is read statically, not exercised with one.
- No CLI, worker, browser or native execution.

Not newly tested by this child: criterion 3 'engine/CLI tests agree' (worker mapping) and native/browser checks. This tests-only append does not alter or invalidate the prior criterion 2/3 evidence; root's PR143 CI supplies the current integrated checks. No new gap is asserted.
