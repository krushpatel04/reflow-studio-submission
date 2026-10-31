# A-2: retain CI evidence when artifact storage is full

## Problem and evidence
Main40137470590 and latest40530289414 complete product/setup checks but fail at all three upload steps. PR15040521152450 also has a real setup timeout; it must stay failed. Upload quota is not product failure, but simply ignoring upload errors would lose mandatory evidence.

## Intended behavior and scope
Normal upload remains first choice. Only if that action fails, emit a full checksummed tar.gz for the same report roots into the job log. Upload may continue on error, but fallback must succeed; product/setup/test steps remain fatal. Recover exact archive bytes from downloaded logs, reject truncated/tampered data and unsafe/empty/oversized roots. Keep log archive bounded to32MiB compressed (initial16MiB corrected from actual failure evidence below); if exceeded, fail visibly rather than truncate or silently omit evidence. This limit is our conservative operational budget, not an organizer/GitHub limit claim. No quota deletions, no PR151 changes, no browser timeout weakening. Documentation records archive retention follows log retention rather than normal artifact links.

## Ownership
A owns ci.yml and new .github/scripts/ci-evidence.mjs, tests/ci-evidence.test.ts; no shared engine/packaging interfaces. A-prefixed evidence only. Source main6d82709.

## Test-first acceptance
Before implementation add executable regression tests that show quota-upload failure loses evidence, using a real shell command extracted from the current workflow (not a missing-module/import failure). Then add the helper/API tests and controls: byte-exact round trip including binary PNG bytes; unchanged input; nested directory/spaces; absent/empty/outside/symlink evidence rejection; size boundary; truncated/corrupt/missing-footer/duplicate/chunk-order rejection; existing output no overwrite. Exercise success and product-failure paths so retention does not turn failure into pass. Preserve command/assertion RED evidence before implementation.

## Steps
1. Record behavioral RED from current workflow's evidence-retention policy.
2. Implement standalone stdlib helper and scoped workflow fallback; run focused controls.
3. Run npm test/build. Publish an isolated review candidate and validate current ordinary CI plus one injected-fault run and recover actual hosted logs. Preserve artifacts/failures separately. No full Python rerun locally for unchanged Python; hosted applicable job still runs.
4. Fetch main before publication/integration; preserve concurrent commits; update A log and remaining blockers. Never mark failed/truncated recovery green.

## RED observed before implementation
`node --import tsx --test --test-name-pattern='workflow quota fallback' tests/ci-evidence.test.ts` on unchanged ci.yml/base6d82709: three expected assertion failures (Python/container/viewer): `Artifact quota rejection currently leaves no recoverable evidence route`. No helper import or broken setup was involved; absence of an executable workflow fallback is the observed defect. Full output retained at reports/friday-2026-10-30/A/red.txt.

## Local GREEN
Focused19controls pass; npm test passes739tests/0fail/0skip in107.963s; npm run build passes in1.274s. node --check and git diff --check pass. No Python/engine/layout/source data change. No artificial browser timing change. Hosted validation/recovery and injected-fault result remain pending.

## Evidence-driven budget correction
Normal hosted40536323722 passed all3jobs; full Python/container/viewer log archives recovered with exact SHA/bytes (viewer9,929,281bytes). The injected browser-fault job122302742363 failed its intended browser gate AND retention: full archive25,702,598bytes exceeds initial16MiB budget. No truncation occurred. The initial source is not final accepted retention. Add a >16MiB incompressible trace regression against the current helper; then raise the conservative bounded budget to32MiB, keep the128MiB recovery-log cap, and rerun actual hosted controls on the corrected head. This changes operational evidence capacity, not product assertions or an organizer limit.
Budget RED confirmed before the cap change: `node --import tsx --test --test-name-pattern='failure traces larger' tests/ci-evidence.test.ts` fails on an actual17,832,505byte binary trace archive with `exceeds16777216byte budget; nothing truncated`, exit1 instead of expected0. This is the intended retention-cap failure, not setup.
Corrected local GREEN:20focused controls; full Node740tests/0fail/0skip in104.366s; build0.828s. No engine/packaging/UI change. First source a1e0164 hosted normal green is historical only; its injected-fault evidence limit remained inadequate. Corrected source must bind new hosted controls and independent review.

## Convergence scope update
Concurrent mainfe3601e merged B's ten documentary/accounting files (PR153). A inspected B handoff and independently verified all9listedSHA256bindings; source/package implementation is unchanged. B's local Docker/Podman runtime is unavailable; static accounting is not container qualification.
JD's explicit subsequent delegation permits Astra to provide AI technical acceptance. C-H3-technical-review.md independently accepts exact PR151headce24831b0caf74caf9aaa56fc02236604043ba7a, including current qualification at synthetic10c4a95 with identical tree, retaining ordinary-CI failures and real evidence limits. This releases the technical-signature-only prerequisite for A-3. A now assigns integration of that exact author-completed scope to A-3 (no rewrite/ownership takeover); check live PR head before merging and preserve any newer author changes. A owns final integration, not Junho's branch. No current148 engine change is included. Combined candidate needs its own applicable checks and final main qualification. This updates the initial H-3 exclusion based on JD's authority and observed scoped acceptance; no human signature is fabricated.
