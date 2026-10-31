# Corpus manifest and split validator (#7, first slice)

## Problem and evidence

#7 needs an independent design corpus with development, validation and sealed test families. None exists: all ten fixtures are authored by the team and `provenance` is `synthetic`. The [quality protocol](../quality-and-ml.md#1-establish-independent-evidence-first--krush-7) requires recording each source's family, split, provenance/permission, asset/font hashes, conversion loss and targets, and its test matrix asks for a validator that rejects cross-split duplicates, missing provenance/resources and undisclosed conversion loss while accepting distinct families and intentional reuse within one split.

Sources are expected from the CC BY 4.0 [LICA dataset](https://github.com/purvanshi/lica-dataset) (organized by template family) and from designs supplied by people outside the team ([competitive research §4](../competitive-research-2026-09-15.md#a-concrete-corpus-opportunity)). Collection has not started, so the record format should exist before the first source is added.

## Why it matters

Adobe qualifies entries on hidden designs. Our own results only predict that if test families never influence tuning. A design that leaks between splits, a near-duplicate template in two families, an unlicensed file or silently dropped content would all make results look better than they are, and none of them is visible without a checked record.

## Intended behavior and scope

A `reflow.corpus.v0` manifest (JSON) and two checks:

1. `checkManifest(input)` in `src/corpus.ts`: pure, no I/O. Returns every issue found (errors and warnings) rather than throwing on the first, so a growing manifest shows all its problems at once.
2. `checkCorpusFiles(manifest, root)` in `scripts/corpus-files.ts`: reads the listed files, compares sha256 hashes, and validates design structure for sources that claim to be convertible. `npm run corpus:check [manifest]` runs both and exits nonzero on any error.

Manifest contents: frozen `targets`; `families` with one `split` each; `sources` with `familyId`, design `file` + `sha256`, optional `templateId`, `provenance` (`dataset` | `author` | `synthetic`, name, license, attribution, permission, url), `resources` (asset/font id, file, sha256) and `conversion` (`supported` | `adapted` | `unsupported`, importer version, losses).

Errors:

| Code | Rule |
| --- | --- |
| `invalid-structure`, `unsupported-schema` | Malformed manifest or wrong schema version |
| `duplicate-id`, `unknown-family` | Family/source/target IDs unique; sources reference a declared family |
| `cross-split-duplicate` | The same source file hash appears in families with different splits. Reuse inside one split is allowed |
| `cross-family-template` | One `templateId` appears in two families. A family includes all derivatives of a template |
| `missing-provenance` | `dataset` needs license + attribution; `author` needs a permission record |
| `synthetic-outside-development` | Team-authored synthetic sources may only be development regressions |
| `invalid-hash` | Source and resource hashes must be 64-character lowercase sha256 hex |
| `undisclosed-loss`, `contradictory-conversion` | `adapted`/`unsupported` must list losses; `supported` must list none |
| `missing-file`, `hash-mismatch`, `invalid-design` | File checks: listed file exists, hash matches, and non-`unsupported` designs pass `validateDesign` |

Warnings (readiness, not failure): fewer than 20 non-synthetic sources, fewer than six families with a non-synthetic source, fewer than three such test families. `unsupported` sources stay in the manifest so failures count against all attempted inputs.

Out of scope: collecting or converting designs, the LICA importer, a starter manifest with chosen targets, benchmark/report changes, the review bundle. No engine, typography, rendering or shared interface changes. Only `package.json` (one script) is a shared file.

## Risks and failure modes

- **False confidence:** the validator cannot detect visually near-identical designs without a shared `templateId`; this is disclosed and still needs manual inspection before freezing.
- **Overvalidation:** rejecting legitimate reuse within a split or healthy synthetic development regressions. Positive controls cover both.
- **Provenance is self-reported:** a permission string is a record, not proof, same as `provenance` in the [design contract](../design-contract.md).
- **Hash drift:** editing a design file after freezing must fail the file check, not pass silently.

## Test cases and acceptance criteria

`tests/corpus-manifest.test.ts`:

- Positive controls: a complete valid manifest (dataset, author and synthetic development sources) has no errors; the same file hash reused by two families in the same split is accepted; different templates in different families are accepted.
- One rejection per error code above, each asserting the code and JSON path.
- Invalid input: non-object, wrong schema, invalid split/kind/status values.
- Readiness: a small valid manifest reports the three warnings and no errors; synthetic sources do not count toward readiness.
- File checks in a temporary directory: matching files pass; a missing file, a changed byte and a structurally invalid design are reported; an `unsupported` source with an unparseable design is not reported as invalid.

Red evidence: the module starts as a stub that returns no issues, so rejection tests fail on their assertions rather than on a missing import.

Acceptance: `npm test` and `npm run build` pass; `npm run corpus:check` on a sample manifest in a temp directory prints issues and sets the exit code.

## Implementation steps and ownership

Owner: krushpatel04 (#7). New files only: `src/corpus.ts`, `scripts/corpus-files.ts`, `scripts/corpus-check.ts`, `tests/corpus-manifest.test.ts`; one `package.json` script.

1. Stub module + tests; record red.
2. Implement `checkManifest`; green.
3. File checks + CLI; red then green.
4. Refactor, full test/build, update this record.

## Validation and handoff

Report tests before/after, build result, CLI output, and remaining limits. No layout/font/UI change, so native verify, benchmark and browser acceptance are not required.

## Execution record

Baseline before changes: `npm test` 178/178 pass at `958ec8b`.

- **Red, manifest checks.** `src/corpus.ts` started as a stub returning no issues. `npx tsx --test tests/corpus-manifest.test.ts`: 29 tests, 6 pass (positive controls and the complete-corpus case), 23 fail, all with `ERR_ASSERTION` on the expected issue lists; no import or type errors.
- **Green.** Implemented `checkManifest`; 29/29 pass.
- **Red, file checks.** `scripts/corpus-files.ts` started as a stub. `npx tsx --test tests/corpus-files.test.ts`: 9 tests, 2 pass (matching files; unsupported source without a valid design), 7 fail on assertions.
- **Green.** Implemented `checkCorpusFiles` and the `corpus:check` CLI; 9/9 pass.
- **CLI.** On sample corpora outside the repo: a valid synthetic-only manifest printed three readiness warnings and exited 0; a synthetic source placed in a test family with a wrong hash printed `synthetic-outside-development` and `hash-mismatch` and exited 1; a missing manifest printed the read error and exited 1. Output lists errors before warnings.
- **Final.** `npm test` 216/216 pass (178 existing + 38 new). `npm run build` (strict TypeScript + Vite) passes. `git diff --check` clean. Native verify, benchmark and browser acceptance were not run: no engine, font, rendering or UI code changed.

## Remaining limits

- No corpus exists yet; the readiness warnings are expected until sources are collected. Target sizes are not chosen; they belong in the first real manifest before any comparison.
- Near-duplicate detection relies on a declared `templateId`. Visually similar designs without one still need manual inspection before freezing splits.
- Provenance and permission fields are records, not verification of rights.
- File paths are checked lexically; a symlink inside the corpus directory is followed.
- `checkCorpusFiles` validates design structure only. Font/asset availability for rendering (`validateResources`) is not checked because corpus resources are not yet wired into a resource catalog.

Next: the LICA spike (ten examples, license and conversion check) produces the first real manifest entries. Skill assessment: the repo workflow and existing TDD skill covered this task; no new skill is needed.
