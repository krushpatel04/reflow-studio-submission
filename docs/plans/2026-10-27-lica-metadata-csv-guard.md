# LICA metadata CSV integrity guard (#32)

## Problem and evidence
The importer uses `parseCsv` for LICA `metadata.csv`. An unterminated quoted field or a short row currently produces a plausible layout record (and may fold subsequent lines into one field or fill missing columns with empty strings). The resulting 1,148-row import ledger could omit or misidentify outcomes while appearing well formed. This is an input-boundary defect, not permission for new corpus admission.

## Why it matters
A corrupted downloaded metadata file must fail before conversion, selection, image fetching, or manifest/ledger writes. Full-denominator accounting is only meaningful when every CSV row is structurally valid.

## Scope and intended behavior
Keep the existing zero-dependency parser and valid LICA metadata behavior. Reject unterminated quoted fields, quotes in unquoted fields, trailing characters after quoted fields, duplicate/blank headers, and rows with too many/few fields. Continue accepting escaped quotes, CRLF and a final row without a newline. Do not change selection, corpus files, official inputs, or teammate-owned PRs.

## Risks and acceptance
Overstrict rejection could block real metadata: compare parsed row count against the pinned ledger and retain the existing quoted/CRLF positive control. Incorrect line-end treatment could mishandle CRLF or embedded newlines. Tests first: add invalid/positive parser cases, run red on main, implement minimal state tracking, then run focused and full Node tests/build; no Python/renderer or browser behavior changes. Recheck diff and source ownership; do not close #32 from this limited integrity slice.

## Ownership and execution record
Base `fe3601ef8b88fcc931024b0b17ad1725269e9b47`, branch `jo/lica-metadata-csv-guard`. Only `scripts/lica-batch.ts`, `tests/lica-batch.test.ts` and this plan. No source downloads or human decisions. Red: focused `tsx --test tests/lica-batch.test.ts` produced 23 passes, 1 failure, `Missing expected exception` for malformed CSV; valid embedded-newline/escaped-quote/CRLF control passed. Initial command from outside the worktree had a test syntax typo, corrected before this behavioral result. Green: focused suite 24/24, zero skipped. `npm ci --ignore-scripts --no-audit --no-fund`, `npm test` 720/720, zero skipped, `npm run build` passed; `git diff --check` passed. No corpus import, private inputs, browser or Python submission run: parser-only development-tool change. Actual archive `metadata.csv` was unavailable locally; pinned corpus admission was not changed. #32 stays open pending reviewed source coverage and permissions. Existing workflow covers this repeatable check; no new skill needed.
