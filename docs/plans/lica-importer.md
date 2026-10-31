# LICA importer and first real corpus (#7, second slice)

## Problem and evidence

#7 needs outside designs, and the engine has only ever run on our ten synthetic fixtures. Slice 1 ([corpus manifest plan](corpus-manifest.md), `8a2568c`) added the `reflow.corpus.v0` record and `npm run corpus:check`, but the corpus is empty. JD asked for real designs to run the engine on, and #5/#12 need them to tell "no good candidate was generated" apart from "a good one was generated but not chosen" ([quality protocol §2](../quality-and-ml.md#2-diagnose-the-actual-bottleneck--jd--krush-5712)).

The Sep 17 LICA spike (throwaway code, outside the repo) showed the source is usable. The public sample has 1,148 layouts, 1,011 of them static, from 392 templates, under CC BY 4.0 ([dataset](https://github.com/purvanshi/lica-dataset)). 270 static layouts from 102 templates convert to `reflow.design.v0`: 36 without loss and 234 with recorded losses. The other 741 cannot be represented (rotation 457, non-rectangular shapes 391, image masks 157, mirrored images 155; a layout can have several). 86 of 87 font families are on Fontsource under open licenses. A ten-layout visual check found 4 close matches, 5 differences caused by LICA's own PNG disagreeing with its JSON or by our renderer, and 1 failure (a font weight that does not exist).

Adobe's brief (§2.4) grades three difficulty levels with the same scorer and calls Level 2 "the main discriminator": many elements, grouped pieces, overlapping and semi-transparent shapes, and a very different target ratio such as square to wide banner. The corpus should lean toward those cases.

## Why it matters

Until outside designs run through the engine, every quality claim comes from designs we wrote to suit it. A batch that looks fine but skips overlap and transparency, or that keeps only the designs that convert cleanly, would repeat that problem with a bigger number attached.

## Intended behavior and scope

Two new pieces:

1. `src/lica.ts`: `convertLica(layout, meta)` is pure, with no I/O. It takes one LICA layout JSON object and its metadata and returns `{ design, status, losses, blockers, fonts, images }`. `status` is `supported` (no loss), `adapted` (representable with every loss listed) or `unsupported` (every blocker listed). It never drops content silently: each omitted, changed or unrepresentable feature appears in `losses` or `blockers`.
2. `scripts/lica-import.ts`, run as `npm run corpus:import-lica -- --lica <dir> [--out corpus]`. It reads a local LICA download, selects a batch, converts it, copies each design's image and font files, writes design files and `corpus/manifest.json`, then runs the slice 1 checks and exits nonzero on any error.

Conversion rules, carried over from the spike and now tested:

| LICA input | Result |
| --- | --- |
| `TEXT` with hex/rgb(a) color | `text` element. `textTransform: uppercase` is applied to the text value (loss recorded). Letter spacing, italic, other text transforms and justified alignment are dropped with a loss each. Line height below 1 is raised to 1 (loss) |
| `GROUP` with a solid fill and rectangular or no clip | `rect`; `background` role when it covers the canvas, otherwise `decoration`. No solid fill: omitted with a loss |
| `IMAGE` with rectangular or no clip | `image` with `fit: 'cover'` and a centered focal point; `background` role when it covers the canvas, otherwise `content` |
| Rotation, mirroring, non-zero translation, non-identity matrix, non-rectangular clip or mask, curved text, rich-text markup, unusable font name, unknown component type, more than 100 elements, or a result that fails `validateDesign` | Blocker: `unsupported` |
| Canvas background that is not a hex/rgb color | White, with a loss |
| Zero-size component | Omitted, with a loss |

LICA `GROUP` components are shapes, not element groups. The converter emits `groups: []`, so this batch cannot cover Level 2's grouped pieces. That gap is written into `corpus/lica/ATTRIBUTION.md` and the handoff, not hidden.

**Selection.** A deterministic, seeded choice of 20 to 30 layouts from 8 to 10 templates, drawn only from layouts that convert. The rule, in order:
- Prefer Level 2 features: overlapping element boxes (not counting full-canvas backgrounds), opacity below 1, text boxes over images, and element count.
- Include at least three layouts with text over an image, for #6 (Junho).
- Cap any one LICA category at a third of the batch. Presentations are 138 of the 270 convertible layouts and would otherwise dominate.
- Exclude layouts whose fonts are not on Fontsource at the needed weight.

The script prints the rule, the seed and per-feature counts for the chosen batch and for the whole convertible pool, so the skew is visible.

**Families and splits.** One family per LICA template. Every layout of a template stays in that family (the slice 1 validator enforces this with `templateId`). Families are split by seed into development and validation, about two thirds to one third. No LICA family goes into `test`: sealed test families come from outside creators later, so the three-test-family readiness warning is expected.

**Targets (v0).** One global target list in the manifest: the existing square 1080×1080, story 1080×1920 and landscape 1920×1080, plus portrait 1080×1350, banner 1500×500, leaderboard 728×90 and skyscraper 160×600. For each source and target pair, the report labels the ratio change r = max(a_t/a_s, a_s/a_t), where a is width/height: near when r ≤ 1.5, far when 1.5 < r ≤ 4, extreme when r > 4. Every common LICA source shape (16:9, 1:1, about 4:5) then gets near, far and extreme targets. These sizes are ours. Adobe's release on Oct 5 may replace them; that would be a new manifest version, not an edit to a frozen one.

**Files written.**

```
corpus/manifest.json
corpus/lica/designs/<layout_id>.json
corpus/lica/assets/<asset file>
corpus/lica/fonts/<family>-<weight>.woff2   (plus each font's license text)
corpus/lica/ATTRIBUTION.md                   (CC BY 4.0 notice, source URL, what was modified)
corpus/lica/VISUAL-CHECK.md                  (per-design visual check result)
```

Every source has `provenance.kind: 'dataset'`, name LICA, license CC-BY-4.0, attribution and URL, `templateId`, `conversion.importer: 'lica-import@1'`, and resources with sha256 hashes. Before writing, the script prints the total size. Above 25 MB it stops without writing, and we decide between a smaller batch and a fetch script. The repository is private; tell JD before pushing binary files.

**Visual check.** For each imported design, the script writes a side-by-side image (LICA's render beside ours) to `reports/corpus-import/` (git-ignored). I inspect every pair before freezing and record close / differs (why) / failed per design in `corpus/lica/VISUAL-CHECK.md`, because manifest sources have no free-text field and slice 1's schema stays unchanged. A design that fails the check stays in the manifest and is listed as failed there, rather than disappearing.

Out of scope: running the engine or benchmark over the corpus, wiring corpus fonts into `scripts/native.ts` (Junho's) or a shared resource catalog, the blind-review bundle, outside-creator designs, and any engine, typography or rendering change. Shared files touched: `package.json` (one script) and `.gitignore` if needed.

## Risks and failure modes

- **Silent loss.** A converter bug that drops a text box or changes copy without a loss entry would make a design look supported. Tests cover each rule, and a round-trip test counts LICA components against elements plus recorded omissions.
- **LICA's render is not ground truth.** The spike found LICA PNGs showing outlines, underlines, bold and ~1.5× text sizes that the JSON does not contain. A visual difference can be LICA's fault, and the check records which side is wrong.
- **Image rights.** LICA declares CC BY 4.0, but its paper does not describe rights to the photos inside designs, and images are fetched from each component's `src` URL. Attribution is recorded; the repository is private; the rights question stays open in the handoff.
- **Selection bias.** Choosing layouts that convert cleanly and look Level 2-ish is a biased sample of LICA, and LICA is a biased sample of real design work. The printed pool-vs-batch counts and the unsupported total (741 of 1,011) keep this visible. Results on this batch are development evidence only.
- **Repository size.** Photo assets can be large. The 25 MB stop prevents an accidental large commit.
- **Font drift.** Fontsource file versions can change. Font files are copied and hashed; the hash check fails if they change.
- **Target churn.** Adobe's Oct 5 release may change target sizes or the format. Converting LICA to our v0 format may need redoing, which the tests make cheap.

## Test cases and acceptance criteria

`tests/lica.test.ts` uses small hand-written LICA-shaped inputs (a few components each), not dataset files:

- Positive controls: a text, rect and image layout converts `supported` with exact geometry, fonts, colors and paint order, and the result passes `validateDesign`. Canvas-covering shapes and images get the `background` role.
- One adapted case per loss rule in the table, each asserting the loss text and the converted value (for example, uppercase applied, line height 1).
- One unsupported case per blocker (rotation, mirroring, curved path clip, curved text, markup, unknown type, 101 elements), each asserting the blocker. An identity transform such as `rotate(0deg) scale(1)` is not a blocker.
- Accounting: every input component is either an output element or named in `losses`/`blockers`.
- Invalid input: missing or non-numeric size, non-array components. These throw a clear error rather than producing a design.

`tests/lica-batch.test.ts` covers the pure batch logic in `scripts/lica-batch.ts` (selection, splits, targets, manifest assembly) on synthetic pool records. `tests/lica-files.test.ts` covers safe corpus writes, and `tests/lica-preview.test.ts` the preview renderer:

- The same pool and seed give the same batch. A different seed gives a different valid batch.
- The category cap holds. At least three text-over-image layouts are chosen when the pool has them. Unsupported layouts and layouts with missing fonts are never chosen.
- All layouts of a template share one family and one split. No family is `test`.
- Near/far/extreme labels at the boundaries (r = 1.5 and r = 4).
- The assembled manifest passes `checkManifest` with no errors and only the expected readiness warnings.

Red evidence: both modules start as stubs, so tests fail on assertions rather than imports.

Acceptance:
- `npm test` and `npm run build` pass.
- On the real LICA download, `npm run corpus:import-lica` writes a batch of 20 to 30 designs from 8 to 10 templates under 25 MB, and `npm run corpus:check` reports no errors.
- Every imported design's visual check is recorded in `corpus/lica/VISUAL-CHECK.md`.
- The printed counts show the batch composition next to the pool.

## Implementation steps and ownership

Owner: krushpatel04 (#7). New files: `src/lica.ts` (pure converter), `scripts/lica-batch.ts` (pure selection, splits, targets, manifest), `scripts/lica-files.ts` (file and network I/O), `scripts/lica-preview.ts` (visual-check renderer), `scripts/lica-import.ts` (CLI), their tests `tests/lica.test.ts`, `tests/lica-batch.test.ts`, `tests/lica-files.test.ts`, `tests/lica-preview.test.ts`, and `corpus/`. One `package.json` script. The network helpers and CLI wiring are exercised by the real import rather than unit tests.

1. Download the LICA sample to a folder outside the repository. Record the download URL and archive hash.
2. Stub `convertLica` and write `tests/lica.test.ts`; record red. Implement; green.
3. Stub selection, splits, targets and manifest assembly and write `tests/lica-import.test.ts`; record red. Implement; green.
4. Add file copying, the size stop and the visual-check images. Run on the real download and inspect every pair.
5. Run `npm run corpus:check`, `npm test` and `npm run build`. Update this record with results and limits.
6. Tell JD before pushing the corpus files; post the handoff on #7 and tag JD (designs to run) and Junho (text-over-image cases).

## Validation and handoff

Report the tests before and after, the build result, the import and `corpus:check` output, batch-versus-pool counts, every visual-check result, total size, and remaining limits. No engine, font or UI code changes, so native verify, benchmark and browser acceptance are not required.

## Execution record

Implemented 2026-09-22 on `main` at `63393d5`.

**Baseline.** `npm test` before any change: 318 tests are the end state; the starting point was 264 passing, 0 failing.

**Source data.** `lica-data.zip` from `https://storage.googleapis.com/lica-assets/websites/blog/lica-data.zip`, 985,000,206 bytes, sha256 `0208145f9fbd7f0da0fd1b4390a9ddb68f21dc8a4cc62efb04cf873d38877caa`, unpacked outside the repository. 1,148 metadata rows, 1,011 of them static.

**Tests first.** Each module started as a stub, so the failures are assertions rather than import errors.

| Module | Red (`npx tsx --test`) | Green |
| --- | --- | --- |
| `src/lica.ts` | 0 pass, 33 fail | 33 pass |
| `scripts/lica-batch.ts` | 2 pass, 12 fail | 14 pass |
| `scripts/lica-files.ts` + `scripts/lica-preview.ts` | 0 pass, 7 fail | 7 pass |

The two batch tests that pass on the stub are "the same pool and seed give the same batch" and "limits hold", both of which an empty batch satisfies. The file and preview stubs fail on assertions plus `ENOENT` from the write that never happens and `loadImage: empty image data`. `fetchCached` and `fontsourceFont` have no unit tests; the real import exercises them, as does the CLI wiring.

**Dry run.** `npm run corpus:import-lica -- --lica <dir> --dry-run`, 1 min 37 s including packing the Fontsource tarballs:

```
Static layouts: 1011 (0 without layout JSON). Status: {"unsupported":741,"adapted":234,"supported":36}. Available (fonts found): 250.
Batch: {"layouts":21,"templates":10,"withOverlap":21,"translucent":8,"textOverImage":21,"categories":{"Business Documents":3,"Presentations":10,"Art & Design":1,"Flyers":2,"Instagram Posts":1,"Education":4}}
Batch source x target ratio classes: {"near":43,"far":72,"extreme":32}
Planned: 21 designs from 10 templates, 278 files, 15.6 MB.
```

The 270 convertible layouts match the September 17 spike exactly, so making translation and non-identity matrix transforms blockers cost nothing.

**Import.** Same command without `--dry-run`: `0 error(s)`, one warning, `too-few-test-families`, which is expected because LICA supplies no test families. `npm run corpus:check` agrees: `corpus/manifest.json: 0 error(s), 1 warning(s).` `du -sh corpus` is 16 MB. Running the import again reproduces every file in `corpus/` byte for byte and leaves `VISUAL-CHECK.md` untouched. All 21 sources are `adapted`; none converted without loss. Families split 7 development, 3 validation, 0 test.

**Visual check.** All 21 side-by-side images inspected. 3 close, 17 differ, 1 failed, recorded per design in `corpus/lica/VISUAL-CHECK.md`. Three patterns account for almost all the differences:

1. LICA text boxes are shorter than the line metrics in `src/typography.ts`: 189 of 293 text elements need more than 115% of their box height, across 16 of 21 designs. LICA's boxes follow the browser's CSS line box; ours use the font's ascent and descent. The engine may report these source designs as overflowing before any resize.
2. Three invoice designs have shapes that LICA's PNG shows as translucent while its JSON records no opacity. In `fey9nqkL7Kfsad6zkf0C` this leaves one table row's text covered by the row fill.
3. 40 of the SVG assets, used in 8 designs, draw their borders with `vector-effect="non-scaling-stroke"`. The preview renderer scales the stroke with the image, so thin frames look thick. This is the preview, not the design data.

`A5ijgpumOCZpbBwUaoE0` is the failure: four body paragraphs have no height in LICA's JSON and were omitted as zero-size text, with the losses recorded. Only 4 of the 7,675 TEXT components in the whole sample lack a height, and all four are in that layout, so the converter was left unchanged.

**Final validation.** `npm test`: 318 pass, 0 fail. `npm run build`: built in 137 ms. `npm run corpus:check`: 0 errors, 1 warning. `npx tsc --noEmit`: clean. `git diff --check`: clean. No engine, font or UI change, so native verify, benchmark and browser acceptance were not run.

## Remaining limits

- LICA `GROUP` components are shapes, not element groups, so every design has `groups: []`. This batch cannot exercise Adobe's Level 2 grouped pieces.
- No design in the batch puts text on a busy photo. The importer's text-over-image count of 21 of 21 counts SVG decorations and frames, so it overstates. #6 needs a different source for busy-image cases.
- Rights to the photos inside LICA designs are undocumented. The dataset is CC BY 4.0 and attribution is recorded in `corpus/lica/ATTRIBUTION.md`; the repository is private.
- Fonts are Fontsource latin subsets. 20 of the 270 convertible layouts were excluded because a font or weight was missing.
- The target sizes are ours, not Adobe's. A different official list on October 5 means a new manifest version, not an edit to this one.
- The batch is a biased sample: layouts that convert cleanly and lean Level 2, from a dataset that is itself a biased sample. Results on it are development evidence only.
- The text-box and non-scaling-stroke findings above are open questions for the engine and renderer owners.
