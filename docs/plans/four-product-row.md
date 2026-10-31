# Four-product row for dense square copy — September 22, 2026

## Problem and evidence

The bounded whole-group grids at `b4ba15c` try at most three columns. On the authored four-product shelf with a longer two-line source headline, the square target has eight small label/price warnings in every generated grid: one column makes four rows and two/three columns make two rows. The existing selection is the split at eight warnings. The saved all-candidate review at `docs/evidence/2026-09-22-product-grid/` diagnoses missing generation, rather than proof of a ranking defect. The prior long-headline control also had an undersized source headline box; this slice will add a valid-source control with enough room for its original copy.

## Why it matters

Four existing groups can fit in one row on a square without dissolving image/label/price/backing relationships. The current bounded search cannot express that arrangement. Any new strategy must still pass hard preservation/geometry checks and justify added runtime.

## Intended behavior and scope

Add one four-column, single-row alternative only for eligible designs containing exactly four whole product groups. Reuse the measured bookend allocation and existing rigid `put` transform. Keep the source-aware ranker and thresholds unchanged. The strategy ID/label and report enumeration are additive; no reflowable-group schema or teammate-owned typography/rendering changes. The first 30 authored fixtures include only a three-product shelf, so their selected output should remain unchanged.

## Risks and failure modes

- At some sizes, four columns may create tiny or clipped text. Evaluate and retain honest diagnostics; hard errors must never beat a feasible candidate.
- Rigid price backing and its white text must still move together. Preserve IDs, text, assets, fonts/colors, group membership, paint order and original input immutability.
- A source-relative ranker may reject a better new candidate or choose a poor narrow row. Compare every candidate before/after and inspect native/browser images; do not claim aesthetic preference from internal scores.
- The fourth candidate adds measured font calls and runtime only for four-group cases; bound it and report paired timing.

## Test cases and acceptance criteria

- Before production edits, add a valid source with a long headline and four backed products. Native-font regression must show selected square labels/prices at or above the existing 9px normalized reading proxy, no geometry/content errors, a headline still prominent, and all source strings unchanged. Establish expected behavioral red with current engine.
- Positive controls: short headline four-group shelf, four groups with a legal backing overlap, healthy source-sized/nearby outputs, the three-product fixture, and missing/ambiguous group associations. Extreme target and malformed input retain explicit findings/rejections. Assert rigid group transforms and candidate independence without inspecting selector internals as a proxy for user-visible behavior.
- All 30 standard selected outputs and benchmark PNG/document pairs remain unchanged; no new hard errors. Compare complete alternatives and current selection across the development cases. Inspect square/story/landscape images and sparse output.
- Run `npm test`, `npm run build`, `npm run verify`, `npm run benchmark`, `npm run verify:browser`, and the focused before/after review; verify hosted CI after publishing. Archive dated reviewed evidence linked from README, without replacing earlier snapshots.

## Implementation steps and ownership

JD owns `src/engine.ts`, the additive strategy identifier/label/report counts, focused tests and the product evidence. The sibling #8 task owns package/CI/CLI/container work in another checkout. Avoid those shared files and fetch before publishing. Plan and regression tests first; then add one bounded candidate, validate normal/negative cases, inspect rendered output, and publish directly to main. Preserve the unrelated untracked `:memory:.ses` file.

## Validation and handoff

Record red/green evidence, all candidate choices and warnings/errors, runtime and image inspection, hosted CI, and remaining #5 limitations here and in `docs/evidence/2026-09-22-four-product-row/`. The accepted work window ends 2026-09-22 17:49 UTC; stop new mutations then and hand off by that time. No vault update or collaborator message is authorized. Existing browser skills and repository tooling are available; assess whether any new reusable skill is warranted.

## Execution record

- 16:49 UTC: clean main at `b4ba15c` (aside from preserved untracked file); fetched origin. Issue #5 remains open. Read current contributor workflow, progress, team plan and previous candidate evidence. Prior browser skill already loaded in this conversation.
- Test first: `npx tsx --test tests/four-product-row.test.ts` at `b4ba15c` gives two expected behavioral failures and two passing controls. A structurally and visually valid long-headline source is accepted by `evaluate(source, source, nativeMeasure)` with zero errors, yet the selected square has all eight product name/price elements below the existing reading threshold. The short-copy four-product control also has eight small texts. The extreme/rigid-group and ambiguous/invalid controls pass. Raw log: `reports/four-product-row/red.txt`.
- Coordinated the additive strategy ID with the isolated #8 task before editing the shared model union. #8 retains package/CI/CLI ownership; this slice uses only engine/model/UI/report/test/doc files.
- Initial green for the dense square exposed a tall-story regression in visual inspection: the new four-column row rendered narrow photos within large empty vertical space. A behavioral positive-control test then failed on a 214.65px product photo in a 1080px story. Restrict the added row to near-square targets (aspect ratio 0.8–1.25); the existing two-row alternatives serve taller targets. `reports/four-product-row/story-red.txt` records that second red state.
- Final local run: 258 tests, build, 30 native cases, benchmark and 12/12 browser checks with 150 agreeing font probes pass. A 45-case paired review asserts all legacy candidates and diagnostics are identical, and removing only the fourth grid restores every previous selection. The only two changes are the authored four-product square cases; the valid long-headline source improves eight small texts to zero. All original 70 documents and 70 PNGs compare byte-for-byte. Reviewed snapshot: [four-product row evidence](../evidence/2026-09-22-four-product-row/README.md).
- Product runtime across 18 paired observations rises 48.81→52.17 ms median, with 45,738→47,868 native calls. Native square/story/landscape images were inspected. Remaining limits and source provenance are recorded in the evidence. No new skill is warranted beyond the browser skills and repo review script.
