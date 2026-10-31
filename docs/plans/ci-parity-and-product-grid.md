# CI parity prerequisite and bounded product-grid slice — September 22, 2026

## Problem and evidence

At `3772c3e`, hosted run [35519242563](https://github.com/kj-squared-labs/reflow-studio/actions/runs/35519242563) fails because browser acceptance requires `reports/font-parity/native-metrics.json`, but the browser command/workflow never generates it. Ignored local reports can conceal this integration gap. Typography's supported-font measurement and 0.5% fit clearance are available; its uncovered arrow warning remains intentional.

Issue [#5](https://github.com/kj-squared-labs/reflow-studio/issues/5) remains open. Existing candidates uniformly scale or stack every product group; a square product layout still has small labels. Evaluate all candidates before choosing a bounded generation change. #7 has a validator, not a real independent corpus. The project board could not be read because the current token lacks `read:project`; issue bodies and ownership were verified directly.

## Why it matters

Fresh checkouts must exercise the parity assertion with current metrics. Product candidates should use available space to preserve readable labels and hierarchy while keeping each explicit group coherent.

## Intended behavior and scope

1. Make `npm run verify:browser` generate fresh native parity data before starting Playwright, retain the reference in CI, and expose both existing real fault injections through manual dispatch.
2. Add a bounded grid of whole image/text groups only where the source has an unambiguous contiguous product band, retaining existing baseline/stack/split entries and ranking. Allocate space to surrounding text using measured wrapping before assigning the grid region. Inspect generation separately from selection.
3. Preserve source strings, IDs/assets/styles/paint order and rigid group geometry. No schema relaxation, reflow inside groups, model, official Adobe integration, corpus imports, or shared typography/rendering changes.

## Risks and failure modes

- Stale metrics can falsely pass; generation errors must stop the browser command. Artifact retention must include the actual reference.
- A grid can shrink labels, flatten hierarchy, break deliberate overlap, change nearby healthy layouts, or consume too much runtime. Keep eligibility conservative and candidate count bounded; inspect every generated alternative and rigid-group positive controls.
- Fonts have limited declared coverage and renderer agreement is not visibility or aesthetic acceptance. Preserve warnings and distinguish development evidence from independent human review.

## Test cases and acceptance criteria

- Before production changes: reproduce missing-data failure from clean generated state; add an isolated browser-command regression that checks fresh generation and replacement of stale output.
- Browser normal control: all 12 checks and 150 parity probes pass. Badge separation and font mismatch fail at their respective real assertions, with evidence retained. Demonstrate hosted normal CI success.
- Product tests: native measured labels improve on square products; all candidates preserve content/order/groups; a distinct authored product count/shape checks generality; long text, identity/nearby targets, legal backing overlaps, unsupported arrangements, and extreme ratios remain honest and safe.
- Run `npm test`, `npm run build`, `npm run verify`, `npm run benchmark`, browser acceptance, and representative visual inspection. Record all 30 candidate/selection/error/warning changes, sparse behavior, generation ablation and runtime observations.
- Archive reviewed dated evidence under `docs/evidence/`, link README, verify documentation links and `git diff --check`. Leave broad #5 and teammate review pending.

## Implementation steps and ownership

JD engine/CI ownership: workflow, package command, orchestration regression, `src/engine.ts`, additive strategy type in `src/model.ts`, dedicated tests/review script and documentation. Existing typography/rendering/corpus code remains owned by Junho/Krush and is consumed through its current interfaces. No collaborator messages are authorized. No shared schema change is planned.

First repair and publish CI after red/green validation. Then freeze before evidence, add meaningful product failures, implement the smallest bounded generator, validate/render/diagnose alternatives, archive results, and publish directly to main after fetching. Preserve unrelated untracked `:memory:.ses` without reading or staging it.

## Validation and handoff

Record commands and observed failures/passes below; update scope if evidence requires it. Final handoff links the plan/evidence/commits, states hosted result and remaining limits, and assesses reusable skills. Vault writes are not authorized.

## Execution record

- Repository fast-forwarded cleanly from `958ec8b` to `3772c3e`; no tracked local edits. Read current contributor workflow, typography evidence/constraints and live #3/#5/#7 state. Loaded browser automation/verification skills.
- CI red evidence before edits: `npx tsx --test tests/browser-prerequisites.test.ts` fails on `browser command must generate its native reference from empty reports` after successfully listing the real browser suite. `PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npm run verify:browser`, with the existing metrics moved aside, fails on the exact missing `reports/font-parity/native-metrics.json` assertion (11/12 checks pass). Logs are under `reports/ci-parity-review/`.
- CI green: 242 tests, build, native 30/30 and benchmark pass; normal browser 12/12 with 150 line-break probes. Both fault runs fail specifically at their respective badge/parity assertions (11/12). Reviewed record: [CI evidence](../evidence/2026-09-22-ci-parity/README.md). Native benchmark before engine work retained under `reports/ci-parity-review/before-benchmark/`.
- Product red at `36b31fa`: `npx tsx --test tests/product-grid.test.ts` gives 3 expected failures / 5 passing controls. Square retains all six small product labels/prices; no two-column backed four-product alternative; no measured bookend allocation. Full output: `reports/product-grid/red.txt`. Existing square alternatives have 7/8/6 warnings (uniform/stack/split); all are geometrically valid, so this is a generation gap before ranking.
- Bounded generator details: 2–6 explicit image/text groups between up to four ungrouped text bookends; no cross-unit overlaps or unrelated decoration. Try 1–3 columns, preserving whole-group geometry. Measure preferred-size bookend wrapping before allocating remaining grid height; decline alternatives when bookends cannot fit. Existing source-aware ranking is unchanged. Additive strategy identifiers require minimal label/count updates in the workbench and benchmark/stability reports; no rendering, typography or corpus behavior changes.
- Initial product implementation passes all eight initial tests. A subsequent caller-mutation regression exposed shared bookend objects across grid alternatives; recorded red in `reports/product-grid/alias-red.txt`, fixed by cloning bookends per candidate. An impossible-copy control keeps original text and explicit legacy findings when measured bookends consume the canvas.
- Hosted CI repair confirmed: [35753284135](https://github.com/kj-squared-labs/reflow-studio/actions/runs/35753284135), exact commit `36b31fa73ea0cc80d1e24a43ef9b67e433e84a92`, all steps including browser and evidence upload passed.
- Final engine checks: 253 tests, build, 30 native cases, benchmark, and 12/12 browser checks / 150 parity probes pass. The existing preservation test's explicit strategy-coverage list was extended to include new grids; its content/style assertions remain intact. Additive strategy labels/counts and outdated UI copy were updated; product UI rendering and baseline toggle were inspected.
- All 30 originals retain zero errors; selected warnings 14→7. Square product labels/prices/footer improve 7→0. 68/70 documents and PNGs match before; only square/story products change. All legacy candidates compare exactly on 45 review cases; grid-removal ablation restores all prior selections. Frozen reviewed record: [product evidence](../evidence/2026-09-22-product-grid/README.md).
- Visual diagnosis: larger two-column story/four-product alternatives exist but lose selection to source-oriented three-column layouts; long-headline square still has no sufficiently readable product candidate. Leave ranking, reflowable-group schema and broader repair work open rather than tuning them on these synthetic examples. Paired product runtime rises 21.10→43.90 ms; there is no enforced budget.
- Documentation acceptance: verify new local links, current strategy counts, explicit development/agent-vs-human evidence limits, and clean diff before publication. Vite reports trace-file reload messages but all browser gates pass; no watcher change was justified. Existing skills and repository scripts suffice; no reusable skill created. No vault update or collaborator message authorized/performed.
