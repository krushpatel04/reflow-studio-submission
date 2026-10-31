# Bounded, append-only LICA expansion (#32)

## Problem and evidence

The frozen 21-source corpus uses a ten-template batch cap. Raising selection limits currently fails because the importer builds a replacement manifest from only the newly selected batch; the preservation check correctly rejects missing old sources. The split lock also pins the pilot config hash. The 1,148-row LICA download is local, and all rows have import outcomes, so a new download is unnecessary.

## Intended behavior and scope

Allow explicit, bounded selection caps for LICA imports. A changed selection config needs an explicit reviewed config-version record with reason and date. New template families additionally need the existing family-approval flag after near-duplicate review. Merge selected sources into the existing manifest without changing any old family/source record or any old design/resource file. Retain the frozen target list and family splits. LICA additions remain seen development or validation evidence. Preserve human visual notes and add pending rows for new designs.

This adds capacity; it does not import a new unreviewed family, claim sealed tests, change the engine or renderer, or close #7. A real expansion should happen only after candidate visual review and an actual need from #33.

## Files and steps

1. `scripts/lica-batch.ts`, `tests/lica-batch.test.ts`: validate bounded positive integer CLI cap values and build an append-only manifest merge. Reject duplicate IDs with different records and keep old source/family order and data.
2. `scripts/corpus-splits.ts`, `tests/corpus-splits.test.ts`: record a baseline and sequential config versions when the config changes. Require a nonempty review reason and date, reject tampered or missing history, and continue accepting the existing v1 lock unchanged. Keep deterministic assignments and forbid LICA test families.
3. `scripts/lica-import.ts`: parse bounded cap flags and config review arguments; load the previous manifest before selection; choose only additional candidates within the total caps; reconcile all selected template IDs; merge before ledger/preservation checks; plan writes only for new files; append visual-check rows without rewriting existing notes. Preserve existing attribution entries.
4. Focused tests cover deterministic growth, old manifest records, cap exhaustion, skipped unavailable inputs, reviewed config history, and human visual notes. Exercise the full CLI against an isolated copy of the committed corpus and a failed budget in a second copy.
5. Run focused tests, full `npm test`, `npm run build`, `npm run corpus:check`, `git diff --check`, and real full-archive dry runs. Compare the original corpus with isolated copies for old design/resource bytes, manifest sources, split assignments, and human visual notes. Do not commit new candidate assets in this slice.

## Risks and acceptance checks

- Existing 21 source records and design/resource bytes remain identical; the existing split lock remains valid.
- Any growth is deterministic for the same metadata, config, and existing corpus. Caps apply to the resulting total, not merely newly selected cases.
- Invalid/noninteger/excessive cap values fail before any write. Missing fonts/images remain excluded and accounted for in the outcome ledger.
- A changed config is blocked without a reviewed version entry. New families require explicit approval and remain seen development/validation.
- Existing visual-check notes survive a successful expansion; new layouts get pending review rows.
- A no-op import does not rewrite tracked corpus files. A failed budget, lock, or preservation check writes nothing.

## Execution record

Red first: the focused suite failed with missing `mergeManifest`/`parseBatchOptions` exports and a config-change rejection despite a supplied review record. The visual-check append test likewise failed on its absent export. After implementation, the focused suites passed.

The unchanged-config full LICA rerun selected the original 21 and planned zero writes; `git diff --exit-code -- corpus` was clean. A larger-cap simulation (`40` layouts, `12` templates, `4` per template) selected four additional layouts from two new template families, planning 11.0 MB. Without family approval it stopped at the expected guard. With simulated approval in `--dry-run`, it planned no writes.

An actual import into an isolated copy under `/private/tmp` added four sources to make 25 from 12 families. The original 21 source records, ten family/split records, every old design/resource byte, and all human visual notes remained unchanged. `corpus:check` on that copy returned zero errors and the known no-sealed-test warning. Repeating the same import planned zero writes. A separate 0.1 MB budget simulation exited before writing; directory comparison with the original corpus was identical. The four candidate source PNGs were viewed, but no new candidate was admitted to the committed corpus or cleared for family independence/source fidelity.

Final verification: `npm test` passed 375 tests, `npm run build` passed, `npm run corpus:check` returned zero errors and the known warning, and `git diff --check` passed. No renderer, engine, or UI path changed. #7 remains open for JD's real #33 run, source fidelity, outside-creator sealed families, and blind review.
