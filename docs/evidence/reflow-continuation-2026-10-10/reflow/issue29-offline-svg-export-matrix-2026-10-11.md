# #29 offline SVG export test-design matrix and claim map — October 11, 2026

Docs only. This is test design. CLI2 read local Git objects with `git show` / `git cat-file`. Nothing was checked out, fetched, imported, executed, rendered or downloaded. No visual reproduction is claimed. #28 is not repeated here.

## 1. Provenance and revision caveat

- **Issue body was unavailable to CLI2.** Root read the live #29 body at integration: OPEN, unassigned, body SHA256 `05e826c745fddc069020a0af579fca067df43266ac5cc065c0fb102b5efec431`. Its acceptance requires actual baseline and selected downloads independent of overlay state, clean network-blocked reopening with no app font CSS, supported font-family/weight/Unicode positive controls, visible failures for missing resources, and recorded size/resource inventory. The historical matrix below comes from `docs/roadmap-2026-09-22.md` L38, L62 and L87 @ `3c3c378`, labelled **historical roadmap, not issue body**.
  - L38: the actual downloaded SVG uses "preview DOM with font-family references and optional diagnostic overlays". It is a "code-observed risk, not a visually reproduced download failure". The criteria are to "Test the actual download in a clean offline context and export artwork independently of overlays".
  - L62: the title is "Export self-contained offline SVG without diagnostic overlays".
  - L87: the distribution gate includes a "real SVG download".
  - The body was later amended: `docs/plans/2026-09-26-roadmap-reconciliation.md` L38 and `docs/plans/2026-10-04-official-source-sync.md` L27 @ `3c3c378` record #29 among the amended bodies. The live issue remains the acceptance authority; the matrix below was augmented to cover its explicit checks.
- Roadmap L38 cites `src/main.ts:99–103`. Those numbers refer to the roadmap-era `ffe9b93` `src/main.ts` (blob `ae1a511b…`). They match the export handler at L110-115 of `6920ab65` below.
- `src/main.ts`: root verified current main `485873a96b46ee8c87832ffa3b60d26a9efd3deb` blob `3d709c0663e4602e4f4b34f17bba47d621ba9788` (16390 B, SHA256 `dfd8a975ee2730aaf687ce4db4023209c6bb4235e929a49be0d9477c4b9219f9`), equal to `6920ab65:src/main.ts`. CLI2 did not independently verify current main. All `main.ts` line numbers below refer to that blob.
- `src/render.ts`: blob `59072ee9`, identical at `3c3c378` and `6920ab65`. Root verified the same `src/render.ts` blob `59072ee94bec3c7d6bff615e3a1106544edcd9e1` (3946 B, SHA256 `a995bc31ab3d5a15b97d99016e75de529cc42b428b10ece03d2de8080e5f13b3`) at current main `485873a9`.
- The only prior #29-related commit is `f590e743465bd7c144768ce4341868bb928e9a48` (2026-09-19, "Add per-card SVG export button"). It is an ancestor of `3c3c378`, and it adds only the button.

| Ref:path | Blob | Bytes | SHA256 |
| --- | --- | --- | --- |
| `6920ab65:src/main.ts` | `3d709c0663e4602e4f4b34f17bba47d621ba9788` | 16390 | `dfd8a975ee2730aaf687ce4db4023209c6bb4235e929a49be0d9477c4b9219f9` |
| `3c3c378:src/render.ts` (= `6920ab65`) | `59072ee94bec3c7d6bff615e3a1106544edcd9e1` | 3946 | `a995bc31ab3d5a15b97d99016e75de529cc42b428b10ece03d2de8080e5f13b3` |
| `6920ab65:tests/browser-checks.ts` | `0431e19fb222b57af79979ae656e0350cab4ce0c` | 23890 | `e392cd02b0457cb9759394df3ff7eb88ee3e84417b06f087c6d5b44e48ead23e` |
| `3c3c378:docs/roadmap-2026-09-22.md` | `c43f916f4a1a3749634a3c4547e2f507de34e1e2` | 15764 | `b961071177d7ed6261544231c93944cbeab9678cdaca6ff0dd73d572754cb12f` |
| `3c3c378:docs/plans/2026-09-26-roadmap-reconciliation.md` | `732483b70d17704b5066354e5f99629f095ae20c` | 5282 | `8e443a2d9af5a266ce07cadafcbaabba7cb4beb357add4e5a19db540becf9cfe` |
| `3c3c378:docs/plans/2026-10-04-official-source-sync.md` | `81f68280bdb60de040fb954cfe68e884838a979b` | 3076 | `dbee6c68b531d552e01432a33867eef1e05cc939f5e1cd2a8559a80db36e28a0` |
| `3c3c378:src/resources.ts` | `c2ee2be48fa7a47a5e93c2dcb335d5288939f80c` | 1564 | `d75c487af38ee7f9594c205c0331fa10debaea412c370ef5e56d83d226c2473d` |
| `3c3c378:src/assets.ts` | `dbee38f2fa73c04961215f6df2ad3cbc6d079cf2` | 1619 | `1879f13711cfc3050a4391f16493babc31ba85f7ab1dbfa856408d2c13300508` |
| `3c3c378:tests/resources.test.ts` | `493edbaab10af92d8e0676a73346c35cff8bf6a2` | 4031 | `fb20b7dbaf42d9bc8ad802b8298d8eb2a5462af3db394e22cec6f5e73ca3cd88` |
| `3c3c378:tests/corpus-resources.test.ts` | `27692c395636e813825484960ce0c44fb132c44c` | 11614 | `43592b69b7c223e0d87d4a5d0e2070b9170c2b6ec38b9df396ddd0d99276def8` |

Code facts, cited line by line:

- `main.ts` L50-54: `downloadFile` builds a Blob and clicks an anchor.
- `main.ts` L74: the card renders `renderSvg(card.design, measure, overlay ? card.metrics : undefined)` together with `export-svg-btn` `data-format="${esc(card.label)}"`.
- `main.ts` L109: overlay toggle.
- `main.ts` L111-114: the export takes the card's DOM `svg.outerHTML` and passes it to `downloadFile(\`${source.id}-${button.dataset.format}.svg\`)`, so the overlay is included whenever it is toggled on.
- `main.ts` L164-166: fonts are loaded into the page only.
- `render.ts` L9: `renderSvg(design, measure, metrics?, resources)`.
- `render.ts` L31: `<image href="${asset}">`. Bundled assets are `data:image/svg+xml` (`assets.ts`, `svgAsset`), resolved via `resources.ts` L10.
- `render.ts` L37: text uses `font-family="'…'"` only, with no embedded face.
- `render.ts` L41-42: overlay rects are built when `metrics` is passed.

Existing patterns to reuse. These are **not #29 coverage**:

- `browser-checks.ts` @ `6920ab65` L255-261 embeds bundled faces as `@font-face … src:url(data:font/woff2;base64,…)`, then rasterizes through `Image`/`drawImage` (L268-271). It is used only by the defect-pack check (L252), and the crop check is at L220.
- `resources.test.ts` L43/L50 and `corpus-resources.test.ts` L27/L168 assert `data:` URIs.
- No existing test reads the actual downloaded file.

## 2. Test-design matrix

Layer: **U** unit (Node, string-level), **D** DOM (viewer harness, download intercepted), **B** browser offline (clean context, network denied). No row restates crop parity (L220) or defect-pack visibility (L252). Rows compare the downloaded artifact with the preview, not native vs browser.

| ID | Precondition | Action | Expected observable | Negative control | Layer | Motivation |
| --- | --- | --- | --- | --- | --- | --- |
| X01 | Overlay toggle ON; card with ≥1 finding | Click `export-svg-btn`; capture `downloadFile` content | Downloaded SVG has no overlay `<rect fill="none" stroke=…>`; element `<g data-element-id>` set equals render without metrics | Same capture on today's code contains overlay rects (expected FAIL before fix) | D | roadmap L38 "independently of overlays"; main.ts L74, L113; render.ts L41-42 |
| X02 | Overlay OFF | Export same card | Artwork and embedded-resource inventories match X01 after canonicalizing generated clip IDs together with all their references; overlay state does not affect the artifact | A leaked overlay rect or dangling/mismatched clip reference makes the comparison fail | D | roadmap L38; main.ts L109; render.ts generates per-render IDs |
| X03 | Overlay ON | Inspect preview DOM after export | Preview still shows overlay (export must not strip the UI) | Overlay missing from preview after export = regression | D | main.ts L74, L109 |
| X04 | Text card | Parse export | Every used `font-family` has a matching `@font-face` with `data:font/…` src, or text is converted to outlines | Today: `font-family` only, zero `@font-face` (expected FAIL) | U/D | roadmap L38 "font-family references"; render.ts L37; main.ts L164-166 |
| X05 | Card with image | Parse export | Every `href`/`xlink:href`/`url(…)` is `data:` or same-document `#id` | Inject an `http:` asset via test resources; check must flag it | U | render.ts L31; resources.ts L10; assets.ts `svgAsset` |
| X06 | Exported file saved | Open it as a top-level doc in a fresh context with all network denied and no page fonts | Loads with zero network requests; zero failed resource events | Same file with `@font-face` stripped renders fallback glyph metrics different from preview (X07 detects) | B | roadmap L38 "actual download in clean offline context"; L87 "real SVG download" |
| X07 | X06 context | Compare the reopened downloaded SVG against a controlled viewer screenshot of the same card at the same size, with overlays OFF and local fonts verified loaded | Artwork and supported glyph bounds meet a declared tolerance; record both images and measurement settings | Remove a used embedded font: the reopened export must fail glyph-bound comparison rather than sharing a fallback oracle | B | roadmap L38; preview screenshot is independent of exported SVG serialization |
| X08 | Download hooked | Stub `URL.createObjectURL`/anchor click; read Blob text | Assertions run on Blob passed to `downloadFile`, with `type` `image/svg+xml` | Asserting on `renderSvg()` string alone does not satisfy row (review rule) | D | main.ts L50-54, L114 |
| X09 | — | Read anchor `download` attr | Filename `${source.id}-${format}.svg` with path separators, control chars, `..` and reserved chars removed/replaced | `source.id`/label containing `/`, `\`, `..`, `:` produces an unsafe name today unless sanitized | U/D | main.ts L114, L74 `data-format` |
| X10 | Format label with `"`, `<`, `&` | Export | `data-format` round-trips; filename derived from decoded label is sanitized | Raw label injected into attribute breaks markup (must not) | D | main.ts L74 `esc(card.label)` |
| X11 | Mode = selected, then baseline | Export same format in each mode | Each export matches its own mode's preview (X07 tolerance); the two differ when layouts differ | Exporting baseline while selected mode shown = FAIL | D/B | main.ts L68 `outcome.result[mode]` |
| X12 | Original (source) card | Export original | Self-contained per X01/X04/X05; filename distinguishes original | Original export containing overlay or font ref only = FAIL | D | main.ts L74 `original-card` |
| X13 | Failure card (`kind === 'failure'`) | Look for export control | No export button, or export disabled with accessible reason; no empty/partial SVG downloaded | Click path producing a zero-element SVG = FAIL | D | main.ts L72 |
| X14 | Text with non-ASCII, combining marks, `&<>"'` | Export, parse as XML | Well-formed XML; text content equals model text; embedded faces cover used glyphs | Unescaped `&` or `<` makes XML parse fail | U/B | render.ts L6 `escapeHtml`, L37 |
| X15 | Design name with markup chars | Export | `aria-label` escaped; root `<svg>` has `xmlns` | Missing `xmlns` blocks standalone open | U | render.ts L43 |
| X16 | Embedded fonts/assets present | Inspect actual downloaded Blob | Record exact byte size and inventory of each embedded resource with used-family/weight mapping; unused full fonts are not duplicated | A repeated unused face or omitted used face fails inventory review; numeric production budget is deferred to #30 | U/D | live #29 acceptance; roadmap L39 owns budget |
| X17 | Cards exercise every supported local font family and weight, plus Latin, non-ASCII and combining glyphs | Download, reopen offline, compare supported glyph bounds/text with preview | All supported combinations remain visible and within a declared geometric tolerance | Remove one used face: test must fail rather than silently pass on fallback | D/B | live #29 positive-control requirement |
| X18 | One required font or asset is unavailable in a controlled test | Export and reopen offline | Export reports a visible actionable missing-resource failure; it does not silently substitute or claim completeness | With all required local resources present, export succeeds | U/D/B | live #29 missing-resource requirement |

`main.ts` L68 selects each card's design and metrics via `outcome.result[mode]`; X11 tests that actual card/export path, not the summary.

## 3. Claim and prerequisite map

| Item | Detail | Trigger to proceed |
| --- | --- | --- |
| File: `src/main.ts` L110-115 | Export handler (DOM `outerHTML`) to replace with a clean export path | #28 follow-up in `main.ts` not in flight, or coordinated by root |
| File: `src/render.ts` | Overlay separation, optional font embedding/outlines | Root-bound current blob recorded above; coordinate exclusive claim before edits |
| File: `tests/browser-checks.ts` or new test file | X06/X07 offline rows; X01-X15 DOM/unit rows | Owner assigned; no overlap with crop/defect-pack checks |
| Claim: Engine3 (engine/worker) | Must not be touched by #29 | Unchanged; #29 stays viewer/render-side |
| Claim: #28 follow-up (`main.ts`) | Same file; merge-order risk | Root confirms follow-up state |
| Overlap: #30 offline startup | X06 clean context and X16 size touch #30 scope | #30 owner agrees on split: #29 = artifact, #30 = startup and budgets |
| Prerequisite: live #29 body | Root readback recorded above; current issue acceptance controls | Recheck only on changed issue-body hash |
| Prerequisite: #26/#27 first | Ordering per Coordinator | Root reports #26/#27 closed or explicitly waived |
| Owner | Unassigned (root-reported) | Root assigns |

## 4. Boundaries

- Test design only. No code edits, no test edits, nothing executed, rendered, downloaded or visually reproduced.
- Root-bound current-main `main.ts` and `render.ts` and live issue body are recorded above; historical line references remain tied to named refs. No code execution or acceptance follows from source binding.
- No rows for crop parity or defect-pack visibility. `browser-checks.ts` is cited only as a pattern to reuse.
- No closure, assignment or merge claim. Root publishes.
