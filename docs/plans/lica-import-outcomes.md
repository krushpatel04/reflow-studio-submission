# Account for every LICA import input (#7 / #32, first slice)

## Problem and evidence

The importer scans the full LICA metadata and prints aggregate counts, but the committed manifest retains only selected convertible designs. Unsupported layouts, missing resources and eligible layouts excluded by the pilot budget have no durable per-input record. The local download has 1,148 metadata rows: 1,011 static PNG layouts and 137 animated MP4 layouts. The current 21-design manifest cannot be used as the denominator for an import or quality claim.

## Intended behavior and scope

Write a versioned `corpus/lica/import-outcomes.json` beside the successful import. Every metadata layout ID appears exactly once with its template/category, final disposition (`supported`, `adapted`, `unsupported`, `unavailable`, or `not-selected`), a stable reason code, and conversion losses or blockers when relevant. Animated designs are explicitly unsupported. Convertible static designs outside the selected batch are `not-selected`; their image URLs have not been checked. Missing source files, missing fonts, and failed image retrieval for selected candidates are `unavailable`. The chosen supported/adapted IDs must exactly match the LICA IDs in `corpus/manifest.json`. Pin the metadata file hash, row count and identity digest so a shortened or substituted ledger cannot pass by adjusting its own totals. Keep the existing manifest and split lock, target list, selection, resources and source files byte-for-byte unchanged on a rerun.

This slice records the current bounded pilot. It does not raise the locked ten-template/30-layout limits, approve new families, import new LICA designs, classify busy photos, claim photo rights, run the engine, or create sealed test families. Those remain #32/#34/#33/#7 follow-ups. An over-budget or otherwise failed attempt must leave the committed corpus untouched; a successful import writes the ledger only after accounting checks pass.

## Files and steps

1. Write focused tests for a pure outcome builder/checker in `tests/lica-outcomes.test.ts`; run them red against absent behavior.
2. Add `scripts/lica-outcomes.ts` to classify each scanned metadata row, enforce unique IDs and complete accounting, and check selected IDs against a manifest.
3. Wire scan observations and image-fetch failures through `scripts/lica-import.ts`, add the ledger to the planned files and size check, and validate it before any corpus write.
4. Add a ledger check to `npm run corpus:check` for the committed LICA corpus, while keeping custom fixture manifests usable without a LICA ledger.
5. Run the real importer on the existing local download and verify all prior tracked corpus bytes are unchanged. Inspect counts and representative unsupported/unavailable/not-selected rows.

## Acceptance checks

- Hand-checked rows exercise selected supported/adapted, unsupported transform, animated input, missing render/JSON/font/image, and a valid unselected case; an available design stays valid rather than being mislabeled as failed.
- Duplicate IDs, missing rows, selected IDs absent from the manifest, and manifest LICA IDs absent from the ledger fail. The disposition counts sum to the metadata count.
- A tiny byte budget exits without changing committed corpus files. The normal rerun yields 1,148 distinct outcomes and the same 21 designs, ten families, seven targets and split lock.
- Focused tests fail for the missing behavior before implementation, then pass. `npm test`, `npm run build`, `npm run corpus:check`, and `git diff --check` pass afterward. No layout/font/UI behavior changes, so native and browser checks do not prove this slice.

## Execution record

The focused pure-accounting tests failed 4/4 against stubs for missing outcomes, missing rejection, manifest mismatch and tampered counts, then passed 4/4. An invalid-source case failed for the expected classification (unsupported instead of unavailable) before the branch was added. The file-check test failed on a missing required ledger before implementation, then passed. A later selected-template/conversion regression failed before the cross-check was added, then passed.

The full local download was present, so no download was needed. The real dry-run scanned 1,148 metadata rows (1,011 static, 137 animated) and planned the unchanged 21-design/ten-template batch. A zero-MB run exited before writing; `git diff --exit-code` found no tracked corpus change. The normal import wrote the ledger with 1,148 distinct IDs: 21 adapted selected, 878 unsupported (741 conversion-blocked, 137 animated), 20 unavailable for missing fonts, and 229 convertible/font-available but not selected; their image URLs are unchecked. The ledger is 642,989 bytes. Existing manifest, lock, designs, assets, fonts, attribution and visual-check files remained byte-for-byte unchanged.

Review found four gaps and all were fixed before handoff: metadata row/hash/identity pins now reject deletion or substitution, the disposition check uses declared keys only, JSON I/O failures outside missing-file and syntax errors propagate, and the not-selected reason explicitly says asset availability is unchecked. Tests for these cases failed first, then passed. The TypeScript build exposed an inferred optional-parameter type that rejected the small file-check fixture; an explicit parameter type resolved it.

Final validation after those corrections: `npm test` 370 pass, 0 fail; `npm run build` passes TypeScript and Vite; `npm run corpus:check` reports zero errors and the expected one missing-test-family warning; `git diff --check` is clean. The new ledger does not verify embedded-photo permissions or source-render fidelity. It also does not expand the locked pilot budgets, so #32 remains open for reviewed bounded expansion.
