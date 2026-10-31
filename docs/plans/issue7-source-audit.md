# Issue #7 source-fidelity audit

## Problem and evidence

The permissioned corpus has 21 converted LICA sources and 293 text elements, but the current evidence is not reproducible from one checked-in command. A historical probe reported 189/293 text layouts above 115% of their source box height across 16/21 sources, while a September 23 probe using manifest fonts and `layoutText` reported 76/293 across 11/21. Neither observation is a clipping count, and the historical probe's per-element rows and runtime/configuration are unavailable. The engine CLI also rejects corpus designs with `missing-asset` because the manifest resource catalog is not wired through that path.

## Why it matters

Issue #7 cannot distinguish conversion/source defects from reflow output defects unless every selected source, text measurement, resource, and failure remains accounted for. Silently dropping a source with a missing file or treating unknown font coverage as a proven missing glyph would produce misleading quality evidence.

## Intended behavior and scope

Add a read-only command with explicit manifest and output arguments. It will:

- emit one machine-readable row for every manifest source, every declared resource, and every converted text element;
- verify source and resource SHA-256 hashes without modifying the corpus;
- register each declared manifest font face under its converted design family and measure source text with the existing `layoutText` implementation;
- report the measured layout-height/box-height ratio at an explicit 1.15 triage threshold;
- report glyph coverage as `unknown` when the existing coverage table does not know the family, not as a missing-glyph assertion;
- retain failed source/resource/text rows with structured errors and a nonzero exit status;
- record runtime/platform/package configuration and preserve both the historical 189/293 observation and the reproducible current result as different methods.

This slice does not run or modify the engine, renderer, corpus, schema, loaders, or typography. It does not establish visible clipping, source faithfulness, or output quality.

## Risks and failure modes

- Global native font registration can make repeated in-process audits ambiguous. The command is intended to run once per process; tests use distinct families and explicit fixtures.
- A manifest font ID must map to the design family/weight. Ambiguous or missing mappings must become visible failures rather than silent fallback.
- Font-declared glyph coverage is unavailable for the imported families. Reporting fallback glyph behavior as proven coverage would overstate evidence.
- Invalid JSON, missing files, mismatched hashes, and individual measurement errors must not abort later rows.
- Text layout height is a metric-model result. It does not reproduce CSS clipping or the inspection/production renderers.

## Test cases and acceptance criteria

- Positive control: a complete fixture produces one source row, all resource rows, every text row, correct hashes, and an explicit threshold classification.
- Boundary: a ratio exactly 1.15 is not classified as `over-threshold`; a ratio above 1.15 is.
- Missing resource: the resource and source remain in the report, later text/source rows are still emitted, and the run fails.
- Invalid source JSON: the source remains in the report and the run continues to the next source.
- Unknown coverage: imported-family text reports `unknown` without claiming missing characters.
- Reconciliation: the report labels 189/293 as historical/unreproduced and compares it with the current method's computed count without choosing or guessing a canonical number.
- CLI: requires explicit `--manifest` and `--output`, writes JSON deterministically apart from recorded runtime fields, and exits nonzero on audit failures.

## Implementation steps and ownership

1. Add behavioral tests in `tests/issue7-source-audit.test.ts` and record the expected initial module/behavior failure.
2. Implement only `scripts/issue7-source-audit.ts`, reusing `layoutText` and the existing coverage lookup where correct.
3. Run focused tests, then the full test/build checks.
4. Run the audit on `corpus/manifest.json` and preserve the reviewed JSON plus a concise README in `docs/evidence/2026-09-24-issue7-source-audit/`.

Exclusive ownership is limited to this plan, the audit script, its test, and the dated evidence directory.

## Validation and handoff

Required: focused red/green evidence, `npm test`, `npm run build`, a real corpus audit, accounting checks over its JSON, and a diff limited to owned files. No visual/layout verification is required because this task does not change rendering or layouts.

## Execution record

- 2026-09-24: plan written before test or implementation changes. Repository dependencies were not yet installed in this worktree; an exploratory `node --import tsx` command failed with `ERR_MODULE_NOT_FOUND`, which is setup evidence rather than a behavioral regression.
- Red: `npx tsx --test tests/issue7-source-audit.test.ts` failed because `scripts/issue7-source-audit` did not exist. This is the expected behavioral red state: the audit API and full-accounting behavior were absent, not a broken fixture or dependency setup.
- Green: the focused command passed 4/4 tests after implementing the audit. The real corpus run accounted for 21/21 sources, 270/270 declared resources, and 293/293 text rows; it reported 76/293 text rows across 11/21 sources strictly over 1.15 and 293/293 rows with unknown declared glyph coverage.
- An initial `npm run build` caught a missing serialized `lineCount` field. The field was added, the evidence report regenerated, and the build passed. Final validation: `npm test` (410/410), `npm run build`, focused 4/4 tests, the real corpus audit, `jq` accounting assertions, and `git diff --check`.
- Remaining limits: the historical 189/293 observation is not reproducible without its original rows/config; the audit does not render or execute the engine; the production CLI still lacks the manifest resource context. No available skill captured a reusable procedure beyond the repository's existing plan/test/evidence workflow, so no skill was created or changed.
- Integration correction, 2026-09-24: review found that the first implementation would open any future sealed-test source and registered different source fonts under a shared family name. The revised acceptance checks require sealed-test source/resource declaration rows marked excluded without file access, no opt-in path in this tool, and content-hash-specific font aliases whose measurements remain stable across reversed source order and repeated in-process audits.
- Correction red: the focused suite passed its original 4 tests but failed both new regressions. The sealed source was reported `failed` after attempted missing-file reads instead of `excluded-sealed-test`; Poppins and Open Sans declared under the same `Audit Face` family produced the same contaminated width. After the correction, all 6 focused tests pass.
- Correction validation: the regenerated current corpus evidence remains 76/293 across 11/21 with 21/21 sources, 270/270 resources and 293/293 text rows accounted; the manifest currently contains zero sealed-test sources. Final checks after the correction: focused 6/6, full `npm test` 412/412, and `npm run build` pass.
