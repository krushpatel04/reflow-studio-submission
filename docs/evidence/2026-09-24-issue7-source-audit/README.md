# Issue #7 source-fidelity audit evidence

This snapshot supports the source-fidelity prerequisite in #34 within #7. It accounts for the current permissioned manifest before engine execution; it is not an engine-quality result.

## Reproduce

From the repository root with the locked dependencies installed:

```sh
node --import tsx scripts/issue7-source-audit.ts \
  --manifest corpus/manifest.json \
  --output docs/evidence/2026-09-24-issue7-source-audit/report.json
```

The command exits nonzero if any source, declared resource, or measurable text row fails. The implementation plan and red/green record are in [the issue #7 source-audit plan](../../plans/issue7-source-audit.md).

## Reviewed result

Environment: Node v24.20.0, macOS arm64, `@napi-rs/canvas` 1.0.9, manifest SHA-256 `213a4fdba7eda5cb6ad5e5d63d46cc1cbe5589a67a9863d4e66ef4062f953eb7`.

| Accounting | Result |
| --- | ---: |
| Manifest sources / source rows | 21 / 21 |
| Declared resources / resource rows | 270 / 270 |
| Discovered text elements / text rows | 293 / 293 |
| Failed sources / resources / text rows | 0 / 0 / 0 |
| Sealed-test sources / resources excluded before file access | 0 / 0 |
| Measured height ratio strictly over 1.15 | 76 / 293 texts |
| Sources with at least one over-threshold text | 11 / 21 |
| Text rows with unknown declared glyph coverage | 293 / 293 |

The complete machine-readable rows, hashes, measurement values, runtime/configuration, and structured status fields are in [report.json](report.json).

## Reconciliation and evidence boundary

The historical collaborator observation was **189/293** text elements over 115% across **16/21** sources. Its original probe, per-element rows, font-registration details, and complete runtime/renderer configuration are unavailable here, so this audit records it as unreproduced.

This audit finds **76/293** across **11/21** using hash-verified manifest font bytes registered under aliases containing the declared family, exact weight, and content SHA-256, the existing `layoutText` function, and `@napi-rs/canvas` TextMetrics. Content-bound aliases prevent one source's face from contaminating another source that declares different bytes under the same family/weight. The measured ratio is layout height divided by the converted text box height, with `> 1.15` as the strict triage rule. The report intentionally sets the canonical count to `null`: incomplete method parity means neither observation replaces the other.

These counts are not visible clipping counts. They do not establish CSS/source renderer parity, because line-box and clipping semantics can differ. All 293 imported text rows use families absent from the existing `FONT_COVERAGE` table, so their glyph coverage is reported as unknown rather than as 293 missing-glyph failures.

## Source findings versus engine output quality

- Source/conversion evidence: all selected source and resource bytes match their manifest hashes; every converted text element received a measurement row; 76 rows cross the stated triage threshold; coverage metadata is unknown for all imported families.
- Sealed-test policy: any future source assigned to a `test` family remains present as source/resource declaration rows with `excluded-sealed-test` status, but its files are not opened, hashed, registered, or measured. This audit has no unsealing option. The current manifest contains no test-family sources.
- Not measured: source screenshot fidelity, visible clipping, renderer parity, reflow execution, output correctness, aesthetics, or preference.
- Existing production-path blocker remains separate: the engine CLI does not yet consume this manifest resource context. This audit validates and measures the source inputs without patching the engine, renderer, resource loader, typography, or corpus.
