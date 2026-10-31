# Typography #3 — font and text parity across browser, SVG and PNG

Recorded September 19, 2026. Plan: [typography-font-parity.md](../../plans/typography-font-parity.md). Issue: [#3](https://github.com/ojedaJD/reflow-studio/issues/3).

These are development measurements from one machine and one browser. They establish that the two renderers agree on supported content; they do not establish multilingual capability, visual quality, or Adobe integration.

## Environment

| | |
| --- | --- |
| Browser | HeadlessChrome 153.0.8010.12 (Chromium, macOS) |
| Node | v22.23.2, darwin arm64 |
| Native renderer | `@napi-rs/canvas` 1.0.9 (Skia) |
| Fonts | Inter 400/500/600/700, Source Serif 4 600 — `@fontsource`, all declared subsets |

## What was wrong

1. **The browser resolved more glyphs than the native renderer.** `src/main.ts` imports the full `@fontsource` stylesheets, so Chromium loaded seven Inter subsets per weight and six Source Serif 4 subsets. `scripts/native.ts` registered only the `latin` file per face. Latin-ext, Cyrillic, Greek and Vietnamese text therefore measured correctly in the browser and silently fell back to a Skia default font natively.
2. **A shipped fixture already relied on an uncovered glyph.** `after-dark`'s `ticket-label` reads `SAVE YOUR SEAT  →`; U+2192 is in no Inter subset. Every renderer substituted its own fallback, with no diagnostic.
3. **Nothing compared the renderers.** Each was internally consistent and separately tested.
4. **`fitText` converged onto wrap boundaries**, leaving fitted sizes vulnerable to sub-pixel engine differences.

## What changed

| Area | Change |
| --- | --- |
| `scripts/native.ts` | Registers every `@fontsource` subset under a private alias; measures and draws text in runs by covering subset |
| `src/font-coverage.ts` | Declared coverage table parsed from `@fontsource` `unicode-range`, plus `findUncoveredText` and RTL detection |
| `src/model.ts`, `src/evaluate.ts` | Additive `unsupported-glyph` warning finding |
| `src/typography.ts` | `fitText` keeps a 0.5% proportional clearance |
| `scripts/font-parity.ts` | Generates the 150-probe native metrics reference |
| `tests/browser-checks.ts` | Cross-renderer line-break check, gated in CI, with fault injection |

### Skia does not merge font subsets

`GlobalFonts.registerFromPath` consults only the **first** registration for a given `(family, weight)`; later files under the same family name are silently shadowed. Registering all seven Inter subsets under `'Inter'` measured identically to registering `latin` alone — a change that would have looked correct and done nothing.

A comma-separated fallback list is not an alternative either: Skia selects one font to shape the whole string based on its leading character, then substitutes glyphs for the rest at the wrong advance widths. A Vietnamese sentence beginning with a Latin-covered character measured 290px instead of 358px.

The working approach registers each subset under a private alias (`Inter::cyrillic`) and splits text into runs by covering subset.

## Results

### Cross-renderer agreement

**150 of 150 probes agree exactly on line breaks** between Chromium and Skia — 141 derived from all ten fixtures across the three targets, plus nine documented probes (long unbroken word, explicit `\n`, repeated whitespace, combining mark, emoji ZWJ, Cyrillic, Greek, Vietnamese, Arabic). Line-break equality is the binding assertion, because it is what makes a preview match its export. Full data in [`browser-report.json`](browser-report.json) and [`native-metrics.json`](native-metrics.json).

### Measured width differences

Relative width deltas for **supported, single-line** content (105 probes):

| | |
| --- | --- |
| Median | 0.0105% |
| p90 | 0.0002% |
| Maximum | **0.2856%** |

The worst cases are short strings dense with kern pairs — `"Friday, October 16 · 7 PM"` (0.2856%) and `"FIELD NOTES / VOL. 04"` (0.1373%). The difference scales with font size rather than being a fixed offset, consistent with Blink applying kerning in `measureText` where Skia does not. This is a genuine engine difference, not a defect in either renderer.

Raw deltas for the remaining 45 probes are recorded but not meaningful as parity evidence:

- 40 probes contain a literal `\n`. The recorded whole-string metric is not what layout uses — `layoutText` splits paragraphs before measuring — and the engines treat an embedded newline differently in an unwrapped measurement. This produces the report's headline 883px `maxWidthDelta`, which is a probe artifact.
- The remaining large deltas are all **declared-uncovered** content: `probe/arabic-sample` (119.6px), `after-dark/story/ticket-label` (11.0px, the `→`), `probe/emoji-zwj-sequence` (10.0px). Each engine substitutes a different fallback, which is precisely what the `unsupported-glyph` warning predicts.

### Fit clearance

`fitText` previously accepted any size whose measured width came within `+0.01px` of the box, converging onto the wrap boundary. `product-pairs/story/headline` landed 0.005px inside its box, and the two engines wrapped `"everyday."` differently.

Widening that epsilon would have made matters worse: it admits overflow, so enlarging it permits more overflow while the search still converges onto the boundary. The fix is clearance in the opposite direction — fitting against `width × (1 − 0.005)`.

The 0.5% figure is measured against the corpus:

| Clearance | Elements refit | Worst font-size drop | Elements still flipping under 0.3% noise |
| --- | --- | --- | --- |
| 0.05% | 0 / 141 | — | 1 |
| 0.20% | 1 / 141 | 0.19px | 1 |
| **0.50%** | **1 / 141** | **0.48px** | **0** |
| 1.00% | 1 / 141 | 0.97px | 0 |

0.5% is the smallest tested clearance that survives the worst measured engine difference. Corpus fragility was measured directly by perturbing every measurement: at ±0.001% no element changes its line breaks, at ±0.01% exactly one does. Every other element carries at least 20px of margin, which is why a tighter fit was never needed elsewhere.

### Benchmark impact

Against unmodified `main`, across all 70 generated outputs:

- **69 of 70 PNGs byte-identical**; **69 of 70 design JSONs byte-identical.**
- The single changed output is `product-pairs-story-selected`, whose JSON differs by one line: `fontSize` 98.46 → 97.96. The rendered result is in [`images/`](images/).
- Errors remain **0** source / **0** baseline / **0** selected. Candidate selection is unchanged (`identity 1, uniform 18, stack 10, split 1`).
- Warnings rise **42 → 45** baseline and **11 → 14** selected. Every new warning is the same pre-existing condition: `after-dark`'s `ticket-label` arrow, reported once per target per variant.

Standalone SVGs all changed, and are now **smaller** in aggregate (11.3MB → 5.4MB across 70 files) despite carrying real coverage, because each file now embeds only the faces its own text resolves to with correct `unicode-range`, instead of five faces without one. Stripping the embedded `<style>` block, every SVG's `<text>`/`<tspan>` content is byte-identical to before.

## Validation

| Command | Result |
| --- | --- |
| `npm test` | 241 passed |
| `npm run build` | clean |
| `npm run verify` | 30 layouts verified |
| `npm run verify:browser` | 12/12 checks, 0 line-break findings |
| `REFLOW_BROWSER_FAULT=font-parity-mismatch` | fails as required |
| `REFLOW_BROWSER_FAULT=separate-badge` | fails as required |

Both fault injections confirm the gates catch real divergence rather than passing vacuously.

## Limitations

- One browser, one platform, one run. Font rasterization and kerning behavior differ across browsers and operating systems; these deltas are not a cross-platform guarantee.
- Coverage is derived from `@fontsource`'s declared `unicode-range`, which is Google's subsetting metadata rather than a `cmap` read. A font whose declared range overstated its glyphs would not be detected.
- A warning does not prevent a mismatched export. It makes the substitution visible; it does not make uncovered text render correctly.
- Bidirectional text, complex shaping and colour emoji remain unsupported and are reported as such. Nothing here establishes multilingual support.
- The `ticket-label` arrow is unresolved by design: whether to replace U+2192 or keep the standing warning is a shared-fixture decision for the engine owner.
