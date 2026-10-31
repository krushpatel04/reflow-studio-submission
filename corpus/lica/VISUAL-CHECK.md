# Visual check: LICA render vs converted design

One row per design, filled in after inspecting `reports/corpus-import/<layout>.png`. Result: close, differs or failed. When they differ, say which side is wrong: LICA's PNG can disagree with its own JSON.

Checked 2026-09-22 against the preview renderer in `scripts/lica-preview.ts` (inspection only, not the engine's renderer).

| Layout | Template | Result | Notes |
| --- | --- | --- | --- |
| fey9nqkL7Kfsad6zkf0C | 69a274dd-7f45-4883-8965-f27390a27179 | differs | LICA JSON: the header band and table-row shapes have no opacity, but LICA's PNG shows them translucent. The conversion follows the JSON, so fills are darker, and the row-4 shape (component 24, painted after its text) hides "Flyer Des. / 3 / 130 / 390". Text is present in the design but covered. |
| hH81rzxZ8FfIWQ6ThmmT | 203e4c31-a5c4-463c-83fc-9b511c6e07a7 | differs | LICA JSON: table cell fills lack the translucency LICA's PNG shows, so they are darker grey. All text visible. |
| YGhFPi34EQR0HK9fk5mI | 821bd959-68c9-4a92-8ac3-2eb77d968a1e | differs | LICA JSON: table column fills lack the translucency LICA's PNG shows, so they are more saturated. All text visible. |
| 3OcbtlfEs722hNRt0W1P | af4e202d-aa8d-a10c-a721-a0b77deda08c | close | LICA's PNG blurs the small body text; the conversion is readable. |
| 09udskj3Rw8KDeDaF27g | af4e202d-aa8d-a10c-a721-a0b77deda08c | close | Same template as above; LICA's PNG garbles small text. |
| KL2ivTudig6nuaXNWKMb | af4e202d-aa8d-a10c-a721-a0b77deda08c | differs | Headline "Potential Regulatory Development" needs 389 px at our line metrics but its LICA box is 313 px, so it runs into the paragraph below. Box-height mismatch (see below). |
| A5ijgpumOCZpbBwUaoE0 | af4e202d-aa8d-a10c-a721-a0b77deda08c | failed | Four body paragraphs (components 20, 24, 25, 26) have no height in LICA's JSON and were omitted as zero-size text (losses recorded). Only 4 of 7,675 TEXT components in the whole LICA sample lack a height, all in this layout. Headline and card labels are fine. |
| 9m0vuy2AiVnEq09YLKmA | 920c5b53-8e0d-431a-bc2a-afd5f36f5a6c | close | The Sc. 4 illustration at the component's `src` is different art from LICA's PNG. |
| B97PvhvRYj5UbiIgPavx | 2e4cd7af-488c-4483-b3d4-9d305ccef400 | differs | Preview renderer: SVG icons (moustache, globe) are rasterized at their small intrinsic size and look blurry. "BARBER" sits lower and overlaps "PRICES"; the menu rows use a large line height in one-line boxes (box-height mismatch). |
| eFlnAlIZr2D7QARKljAg | 2e4cd7af-488c-4483-b3d4-9d305ccef400 | differs | Same template as above: "BARBER" overlaps "PRICES". Icons render fine here. |
| GLkvpJGsVXVWUZtFfQnz | 00efc51e-f6b6-411b-a0cd-3227703b1129 | differs | "LOVE" letters render larger and higher than LICA's and overlap "VALENTINE'S" (box-height mismatch: 389 px needed, 333 px box). |
| 3ptehNaHfKmudzDJ5qLD | a902e896-7baa-4f3e-b5ab-aba3173990e7 | differs | Preview renderer: frame SVGs use `vector-effect="non-scaling-stroke"`; the canvas scales the stroke, so the thin blue borders become thick frames. Body text renders lighter than LICA's PNG. Design data looks right. |
| ja6KK5GYIQ6dwWR0vo6y | a902e896-7baa-4f3e-b5ab-aba3173990e7 | differs | Preview renderer: same non-scaling-stroke frames. |
| 2GagOUPHI9oByZN8oNry | a902e896-7baa-4f3e-b5ab-aba3173990e7 | differs | Preview renderer: the two thin rules around the band render as thick stripes (non-scaling stroke). |
| fGpZ7YM2q4gCM0xjwDTT | a902e896-7baa-4f3e-b5ab-aba3173990e7 | differs | Preview renderer: thick frame (non-scaling stroke). Body paragraph needs 445 px but its box is 313 px, so it runs past the panel. |
| 1ibPxEGwrCdKqRYTMH0V | a0a00d69-8655-4fb5-8a02-8027c3d5bd7e | differs | LICA's PNG shows bold text but its JSON says Fredoka 400 (LICA side). Dashed card frames render thicker (non-scaling stroke, preview renderer). |
| 2TyQpLjSXRSknj0xWwPe | a0a00d69-8655-4fb5-8a02-8027c3d5bd7e | differs | Same as above. |
| 8toUKdhqTxtp3TCIqJtO | a0a00d69-8655-4fb5-8a02-8027c3d5bd7e | differs | Same as above. |
| AEW2PipJY2mEx67hLU4l | a0a00d69-8655-4fb5-8a02-8027c3d5bd7e | differs | Same as above. |
| S2R6nZIgKSiOrWmgzs60 | 14d370ee-8144-48d7-beff-3376a627bc13 | differs | Conversion: dropped letter spacing and italic (recorded losses) change the paragraph's line breaks; photos are cropped around the center, where LICA crops differently. |
| Bv3tdlM47qjXGpmlKOHJ | 14d370ee-8144-48d7-beff-3376a627bc13 | differs | Conversion: dropped letter spacing and italic (recorded losses). Otherwise close. |

## Tally

3 close, 17 differs, 1 failed.

## Findings that apply across designs

- **Text boxes are shorter than our line metrics.** Measured with `layoutText` from `src/typography.ts` and the bundled Fontsource files, 189 of the 293 text elements need more than 115% of their LICA box height, in 16 of the 21 designs. LICA's boxes follow the browser's CSS line box, and ours use the font's ascent and descent. The engine may flag these source designs for overflow before any resize.
- **Shape translucency is missing from LICA's JSON** in three invoice designs. The PNGs show translucent fills that the JSON does not record.
- **SVG frames with non-scaling strokes** (40 asset files, used in 8 designs) render too thick in the preview renderer. Any renderer that scales SVGs as plain images will do the same.

## Text on busy images (for #6)

None of the 21 designs puts text directly on a busy photo. The importer's "text over image" count (21 of 21) includes SVG decorations and frames, so it overstates this. Mild cases: GLkvpJGsVXVWUZtFfQnz (text on a grain texture) and 9m0vuy2AiVnEq09YLKmA (text on a paper texture). In the four science slides (a902e896 template), text sits on solid panels over a faded photo.
