# Freeze corpus family assignments (#7 / #31)

## Problem and evidence

`assignSplits` sorts all template IDs, draws seeded random values, then assigns the first two thirds to development. Adding a new template changes the draw order and the two-thirds cutoff, so a known family can cross from validation to development or back. The first LICA corpus already has seven development and three validation families. They have been inspected and discussed; none is a sealed test family.

## Intended behavior and scope

Keep #7's existing assignments stable while the corpus grows. Add a versioned split lock beside `corpus/manifest.json`, seeded from the existing manifest. Each family records its stable ID, split, template ID and exposure (`seen` for the current LICA batch). The lock also hashes the exact target list and import settings. A routine import uses locked assignments for known families. New LICA families require an explicit approval flag and are assigned deterministically without moving known families; they remain development or validation, never test. The corpus checker reports missing or changed lock records, template reuse across families, and target drift. A changed assignment is rejected until an explicit documented migration is added; an exposed validation family cannot silently become an untouched test family.

This slice does not recruit outside creators, run the engine, change conversion/rendering, or mark any current family as sealed. #7 remains open. A later source/target migration needs a new reviewed manifest version, not an in-place edit to old evidence.

## Files and steps

1. `tests/corpus-splits.test.ts`: reproduce drift and specify lock behavior for known/new/reordered/removed families, repeated template IDs, target drift and exposure. Run red against a small stub.
2. `scripts/corpus-splits.ts`: pure lock creation, reconciliation and checks. Keep I/O in the CLIs.
3. `corpus/split-lock.json`: snapshot the ten current families as `seen`, with exact targets and import settings hashed. Do not relabel any as test.
4. `scripts/lica-import.ts`: read the lock before writing. Reuse existing assignments, reject unapproved new families, and write an updated lock only after a successful import. Never overwrite the human visual check. Update `scripts/corpus-check.ts` to check the lock for the default committed corpus.
5. Record red/green evidence, `npm test`, `npm run build`, `npm run corpus:check`, and `git diff --check`. No engine/render/UI code changes, so native and browser checks do not prove this slice.

## Risks and checks

- Re-running the importer must not change any of the ten existing splits or target hashes.
- A new family can be added only after review; its split is deterministic and cannot be test through the LICA path.
- Removing a family from the current batch does not erase its lock entry, so reappearance restores the same split.
- A duplicate or near-duplicate without a shared template ID still needs manual review. Automated checks cannot prove visual independence.
- The existing three validation families are already seen. They are useful for development checks, not sealed test evidence.
- A split migration uses a new family ID, retires the old one, and records old/new splits, prior exposure, reason and date. The replacement is always marked seen. This is a pure operation for a reviewed migration, not an importer flag that can silently reassign a family.
- A routine LICA import refuses to remove or rewrite existing manifest sources. Adding creator families requires a separate collection path; rerunning the LICA importer after that will fail visibly instead of dropping them.

## Execution record

Baseline at `5bc5987`: `npm test` 338 passed, 0 failed. The first sandbox run could not open tsx's local pipe (`EPERM`); the authorized rerun completed normally.

Tests first: `node --import tsx --test tests/corpus-splits.test.ts` was 0/6 against the stubs, then 6/6 after the pure lock functions. `tests/corpus-split-files.test.ts` was 0/2 against the stub, then 2/2 after the file checker. A later manual LICA-to-test case failed 1/7 for the expected assertion before the guard was added; the focused suite then passed 7/7.

The migration cases failed 2/10 against the migration stub, then passed. One new regression exposed that a retired identity and its replacement share a template ID; the importer initially rejected that valid migration, then passed after looking up active families. The import-preservation case failed against its stub, then passed after existing source records were protected.

The lock snapshots the existing manifest: 10 families, seven development, three validation, all `seen`, zero test. Its target hash is `9d4bf17d204b5327fd0eab9ab0cf4ae7bb255384ac706befa0a2056c2b1bc453`. A real dry-run scanned 1,011 static layouts and planned the same 21-design, 10-template, 15.6 MB batch. A real importer rerun wrote 0 errors and retained the expected `too-few-test-families` warning; `git diff --exit-code -- corpus/manifest.json corpus/lica` confirmed all previously tracked corpus bytes stayed unchanged.

Final validation after migration and import-preservation guards: `npm test` 351 passed, 0 failed; `npm run build` passed TypeScript and Vite; `npm run corpus:check` returned 0 errors and the expected one warning (`too-few-test-families`); `git diff --check` was clean. The real importer was rerun after these guards and wrote 0 errors; the post-import corpus check returned the same result. No native/render/browser checks were run because this slice changes no layout, font, renderer or UI behavior.

Remaining #31 acceptance: reserve fresh outside-creator test families before tuning and review near duplicates before approving them. The migration ledger exists, but no actual family has been migrated. #32's configurable batch growth will need a reviewed import-config version change because the current lock intentionally pins the pilot settings. With the current 10-template cap, a larger LICA batch also cannot pass the import-preservation guard until #32 provides a reviewed append/merge path. This slice is not a closure claim for #7 or #31.
