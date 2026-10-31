# Engine #5: coherent mixed-role groups

## Problem, evidence and impact

The engine filters content roles before collecting group members. A white label sharing a group with a dark decorative backing moves independently and becomes invisible, even though IDs and group strings survive. Grouped backgrounds can also be stretched independently when a group has no content members. Issue #2 now protects the structural contract, but geometry diagnostics do not detect this separation.

## Scope and dependencies

Complete the ready mixed-role group slice of [#5](https://github.com/ojedaJD/reflow-studio/issues/5): resolve all explicit group members, preserve their relative rectangles through one translation/uniform scale, and flag incoherent grouped output. Text fitting may change font size inside its transformed box. Preserve paint order, IDs, copy, resources, roles and styles.

The broader product-grid/candidate/ranking work in #5 explicitly depends on [#3](https://github.com/ojedaJD/reflow-studio/issues/3), which is still open and must supply font/text constraints before tuning. Do not close #5 or claim its six product warnings, human quality comparison, new candidate families, stability (#12), general occlusion (#6), or runtime (#8) are resolved by this slice.

## Skills and workflow

Loaded `vercel:verification` and `vercel:agent-browser-verify`; reuse the previously loaded Browser skill/runtime for the available signed-in browser. The verification story is source design → grouped candidates → selection → editable output → SVG/native render. There is no API/database/deployment boundary in this local app. Inspect both group geometry and actual visible glyph evidence. Add the owner's policy to AGENTS: load applicable skills before work; assess reusable skills at task completion without automatically creating one.

## Intended implementation and ownership

1. Baseline the current 123 tests and save a native before image/geometry for the mixed-role example.
2. Write/run group placement and evaluator regression tests before changing engine code. Include dark backing/white badge, background-role plates, image/price groups, intentional layered groups, and groups containing only non-content roles. Assert relative geometry independently of candidate ranking; retain identity, source immutability, paint order, opaque IDs and ungrouped-background behavior.
3. Collect members before role selection. Reflow a whole group if any member is content; keep purely non-content groups coherent under uniform fallback. Only ungrouped background elements may stretch to fill the target.
4. Add a `group-geometry` finding for multi-member groups whose relative rectangles cannot be described by one positive uniform scale and translation. Use scale-relative numeric tolerance for floating arithmetic, not a target-size exemption. This is a relationship constraint, not a general visibility detector. JD owns engine/model/evaluator; new finding is additive, no typography/renderer production changes planned.
5. Add a native visible-pixel regression and a browser check that the white label has glyph ink inside its dark plate. Write/run these checks before production edits. Retain a rendered comparison for inspection.
6. Run test/build/verify/benchmark/probes; run `/verify.html` and inspect the app and mixed-role SVG. Compare all 30 outputs to the existing archive, disclose changed candidates/warnings/timing and preserve dated evidence.
7. Document results/remaining scope, assess whether a new skill would reduce future work, then fetch and publish directly to main. No PR/reviewer gate.

## Risks and acceptance

- Pulling a canvas-sized backing into a group may make that unit large. Honor the explicit relation; do not silently split it to improve readability scores.
- New geometry checks must allow legal uniform transforms and text font fitting, including fractional coordinates, declaration reordering and very small/large supported targets.
- Groups of only decorative/background members must not acquire inconsistent fallback transforms.
- Unrelated backgrounds retain their existing full-canvas behavior; unrelated ungrouped elements may move independently.
- Bounds containment alone is insufficient: move one member while keeping it inside the backing and the evaluator must still detect changed relative geometry.
- Native pixel evidence checks this supported light-label/dark-plate example; it cannot establish general contrast, occlusion or multilingual font coverage.
- Documentation uses relative-link/content and diff checks, not artificial prose unit tests. Benchmark comparisons are observational; no performance improvement claim from single runs.

## Execution record

- Started from clean main `98b2eb1`; fetched origin and confirmed no intervening changes. GitHub #5 and #3 dependency/acceptance text inspected before choosing this ready slice.
- Baseline: `npm test` passed 123/123 on unchanged engine code. `node_modules/.bin/tsx --test tests/grouped-layout.test.ts` then produced 8 failures / 3 passes: `label.x: 65 != 140.5`, missed group-geometry errors, and zero visible white glyph pixels in the selected dark backing. Uniform/identity/intentional-layering controls passed.
- Browser red: started Vite on 127.0.0.1:5174 (5173 was already in use). `/verify.html` passed 9/10 checks; the new test failed with `stack: actual glyph bounds separated from the dark backing`. Existing UI/glyph checks passed and browser errors were empty. Native before/source PNG and output JSON saved under `reports/grouped-layout/` before production changes.
- Green: `npm test` passed 134/134 after resolving groups before role filtering, preserving grouped background fallback, and adding group-geometry diagnostics.
- Browser recovery: the first post-change page still loaded Vite's cached pre-fix module (confirmed in the served engine source). Restarted only this task's dev server with `CHOKIDAR_USEPOLLING=true`; the next `/verify.html` run passed 10/10 with no startup errors or SVG glyph-bound findings. This was a local dev-server cache/watcher issue, not another production layout change. Browser report saved under `reports/grouped-layout/browser-green.json`.

- Final checks: 134 tests; production build; all 30 native verification cases; benchmark; and observational probes completed. All 70 benchmark JSONs and 70 PNGs match the original archive byte-for-byte; no selected strategies changed. Zero source/baseline/selected errors; 42 baseline and six selected warnings. Single benchmark run: median 21.61 ms, p95 47.94 ms (not a performance-improvement claim).
- Native and browser images inspected: the repaired mixed-role badge has visible white text on its dark plate in every ordinary candidate. Extreme target tests establish rectangle coherence, not guaranteed readability. Nearby-size probes still choose stack/split for 8/10 fixtures.
- [Dated evidence](../evidence/2026-09-16-grouped-layout/README.md) includes before/after/source PNGs, complete editable candidate output, browser results, probes and hashes. Broader #5 remains open pending typography constraints and later layout work; no reviewer wait is required.
- Skill assessment: no new skill created. The existing verification/browser skills and repository-native tests/plans already capture the repeatable process. The isolated Vite watcher workaround is recorded here; one incident does not justify a generic new skill. The owner's skill-loading and post-task assessment rule is now in AGENTS.
- Documentation verification: 48 relative links across six updated/new documents resolved; `git diff --check` passed. Production diff reviewed: group selection/fallback and additive diagnostics only; no candidate-ranking, typography or renderer production changes.
