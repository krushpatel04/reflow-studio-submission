# Viewer font cost and format review — 2026-10-29

The worker loads every bundled font subset serially for each request, including unused families and weights. The inspector requires closing and reopening to compare formats. Reduce that repeated work and make reviewing actual artwork easier without adding dependencies or changing source content.

Scope: select fonts needed by the current source, load independent faces concurrently while retaining declaration order, and add previous/next format controls to the existing inspector. Preserve cancellation, worker isolation, export validation, zoom, and focus restoration. Unsupported or empty copy retains all matching subsets to preserve fallback metrics. Do not change the Python submission contract; the separate medium-campaign plan owns engine quality work.

Risks: overlapping Unicode ranges, unsupported glyph metrics, changed wrapping, stale inspected results, and crowded mobile controls. Font timings are local measurements, not a portable service guarantee.

1. Capture the existing worker for paired browser profiling and screenshot the current inspector.
2. Add a failing real-worker regression: a broken unused font must not block supported artwork, while missing used fonts remain errors. Characterize full output parity on multilingual and fallback controls. Add selector boundary/order tests.
3. Implement minimal selection and concurrent loading; compare complete outputs and font load counts with the frozen worker.
4. Add failing navigation tests for boundaries, zoom, displayed artwork and original-opener focus. Implement navigation and inspect desktop/mobile screenshots.
5. Run Node/build/verify/benchmark/browser gates, independent adversarial review, and publish only validated changes. Record measured evidence and remaining bottlenecks in dated evidence linked from README. Python changes require separate clean-source qualification.

Acceptance: exact layout outputs except timing; fewer loaded faces for Latin artwork; used-face failures visible; existing unsupported-copy behavior unchanged; review navigation stays inside displayed successful cards, preserves zoom and restores the original opener; no mobile overflow. Existing benchmark warnings remain disclosed. No new reusable skill is expected: existing verification workflow covers this task.

## Execution evidence

Initial Playwright regression run: 2 expected failures (unused missing face reports a network error; navigation buttons absent), 2 existing inspector controls passed. `reports/viewer-efficiency-2026-10-29/red.txt`. Initial selector tests failed because the new selector export did not exist; the real-worker failure is the behavioral red evidence. Targeted implementation run: 16/16 passed.

Review found that typography also measures `Ágj` and normalized spaces. Font selection now includes this shared reference even for Greek-only/Cyrillic-only text. Added full-output browser characterization cases before changing the probe handling; all three already passed on this browser. No artificial failure was introduced. This is a conservative metric-preservation guard, not a claimed observed glyph regression.

Final viewer gates: 744 Node, build, 30 native layouts, 30 benchmark cases /70 artifact sets, 34 browser tests, production browser flow and Astra adversarial review pass. The benchmark retains eight warnings; the build retains its existing main-bundle warning. Final paired profile covers all ten fixtures and three fallback/multilingual controls with exact output hashes. See the linked evidence receipt.

Final visual boundary: at320px the arrow wrapped separately from the navigation label. The added one-line label/browser-overflow check failed with two rendered text fragments. `white-space: nowrap` on navigation buttons keeps each label intact and lets the toolbar wrap controls as units. Final browser/build checks cover the correction; no design content changed.

Integration requirement: the medium-campaign Python change must pass the complete Python suite after preserving the older rigid-group and independent font containment checks. Qualify a committed clean checkout with the existing harness and separately run all five changed public-derived formats through the offline Linux image. Do not present the original three public cases alone as coverage of the new medium branch. Preserve the rejected candidate's failure log; no existing test is weakened.
