import type { Design } from './model';

/**
 * Declared glyph coverage for the two bundled font families, derived from the
 * `unicode-range` declarations that @fontsource ships in its per-weight
 * stylesheets:
 *   - node_modules/@fontsource/inter/{400,500,600,700}.css (7 subsets per
 *     weight: latin, latin-ext, cyrillic, cyrillic-ext, greek, greek-ext,
 *     vietnamese — identical ranges across all four bundled weights)
 *   - node_modules/@fontsource/source-serif-4/600.css (6 subsets: latin,
 *     latin-ext, cyrillic, cyrillic-ext, greek, vietnamese — no greek-ext)
 *
 * Each entry below is a closed [start, end] codepoint range. Ranges are
 * sorted and merged (touching/overlapping ranges combined) but otherwise
 * describe exactly the codepoints the fontsource stylesheets declare as
 * covered — nothing added, nothing removed. tests/typography-parity.test.ts
 * re-parses the CSS at test time and fails if this table drifts from it.
 *
 * This describes @fontsource's *declared* subset coverage only. It says
 * nothing about which of those subset files scripts/native.ts actually
 * registers with Skia — that registration must cover the same subsets for
 * the native renderer to resolve the same codepoints as the browser, but
 * keeping the two in sync is done in scripts/native.ts, not here.
 *
 * This is a proxy for font content (Google's own subsetting metadata), not a
 * `cmap` read: a font whose declared range overstates its actual glyphs
 * would not be detected by this table.
 */
export type CodepointRange = readonly [start: number, end: number];

export const FONT_COVERAGE: Readonly<Record<string, readonly CodepointRange[]>> = Object.freeze({
  Inter: [
    [0x0000, 0x02cc], [0x02ce, 0x02d7], [0x02da, 0x02da], [0x02dc, 0x0301],
    [0x0303, 0x0304], [0x0308, 0x0309], [0x0323, 0x0323], [0x0329, 0x0329],
    [0x0370, 0x0377], [0x037a, 0x037f], [0x0384, 0x038a], [0x038c, 0x038c],
    [0x038e, 0x03a1], [0x03a3, 0x052f], [0x1c80, 0x1c8a], [0x1d00, 0x1dbf],
    [0x1e00, 0x206f], [0x20a0, 0x20c0], [0x2113, 0x2113], [0x2116, 0x2116],
    [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193], [0x2212, 0x2212],
    [0x2215, 0x2215], [0x2c60, 0x2c7f], [0x2de0, 0x2dff], [0xa640, 0xa69f],
    [0xa720, 0xa7ff], [0xfe2e, 0xfe2f], [0xfeff, 0xfeff], [0xfffd, 0xfffd],
  ],
  'Source Serif 4': [
    [0x0000, 0x02cc], [0x02ce, 0x02d7], [0x02da, 0x02da], [0x02dc, 0x0301],
    [0x0303, 0x0304], [0x0308, 0x0309], [0x0323, 0x0323], [0x0329, 0x0329],
    [0x0370, 0x0377], [0x037a, 0x037f], [0x0384, 0x038a], [0x038c, 0x038c],
    [0x038e, 0x03a1], [0x03a3, 0x052f], [0x1c80, 0x1c8a], [0x1d00, 0x1dbf],
    [0x1e00, 0x1eff], [0x2000, 0x206f], [0x20a0, 0x20c0], [0x2113, 0x2113],
    [0x2116, 0x2116], [0x2122, 0x2122], [0x2191, 0x2191], [0x2193, 0x2193],
    [0x2212, 0x2212], [0x2215, 0x2215], [0x2c60, 0x2c7f], [0x2de0, 0x2dff],
    [0xa640, 0xa69f], [0xa720, 0xa7ff], [0xfe2e, 0xfe2f], [0xfeff, 0xfeff],
    [0xfffd, 0xfffd],
  ],
});

/**
 * Right-to-left codepoint ranges. `layoutText` (src/typography.ts) and
 * `render.ts` split on whitespace and emit left-to-right positioned tspans
 * with no `direction`/`unicode-bidi` handling, so any text containing these
 * codepoints is reported as unsupported regardless of whether a bundled
 * family's declared range happens to include the codepoint.
 */
export const RTL_RANGES: readonly CodepointRange[] = [
  [0x0590, 0x05ff], // Hebrew
  [0x0600, 0x06ff], // Arabic
  [0x0700, 0x074f], // Syriac
  [0x0750, 0x077f], // Arabic Supplement
  [0x08a0, 0x08ff], // Arabic Extended-A
  [0xfb1d, 0xfdff], // Hebrew / Arabic Presentation Forms-A
  [0xfe70, 0xfeff], // Arabic Presentation Forms-B
];

function inRanges(codepoint: number, ranges: readonly CodepointRange[]): boolean {
  for (const [start, end] of ranges) if (codepoint >= start && codepoint <= end) return true;
  return false;
}

export type UncoveredTextFinding = {
  elementId: string;
  offenses: { character: string; codepoint: number }[];
  message: string;
};

/**
 * Reports text elements whose content is not fully covered by the declared
 * ranges of `FONT_COVERAGE`, or that contains right-to-left content. A text
 * element with both kinds of problems produces two findings (one per
 * reason) rather than one finding mixing unrelated causes.
 *
 * This only inspects declared coverage; it does not measure or render
 * anything, so it stays synchronous and dependency-free.
 */
export function findUncoveredText(design: Design): UncoveredTextFinding[] {
  const findings: UncoveredTextFinding[] = [];
  for (const e of design.elements) {
    if (e.type !== 'text') continue;
    const ranges = FONT_COVERAGE[e.fontFamily];
    const rtl = new Map<number, string>();
    const uncovered = new Map<number, string>();
    for (const character of e.text) {
      const codepoint = character.codePointAt(0)!;
      if (inRanges(codepoint, RTL_RANGES)) { rtl.set(codepoint, character); continue; }
      if (!ranges || !inRanges(codepoint, ranges)) uncovered.set(codepoint, character);
    }
    if (rtl.size > 0) {
      const sample = [...rtl.keys()][0];
      findings.push({
        elementId: e.id,
        offenses: [...rtl].map(([codepoint, character]) => ({ character, codepoint })),
        message: `Element "${e.id}" contains bidirectional text (e.g. U+${sample.toString(16).toUpperCase().padStart(4, '0')}), which is unsupported: layoutText and render.ts position tspans left-to-right with no direction/unicode-bidi handling.`,
      });
    }
    if (uncovered.size > 0) {
      const sample = [...uncovered.keys()][0];
      findings.push({
        elementId: e.id,
        offenses: [...uncovered].map(([codepoint, character]) => ({ character, codepoint })),
        message: ranges
          ? `Element "${e.id}" uses ${uncovered.size} character(s) not in "${e.fontFamily}"'s declared coverage (e.g. U+${sample.toString(16).toUpperCase().padStart(4, '0')}); renderers will substitute a fallback glyph.`
          : `Element "${e.id}" uses font family "${e.fontFamily}", which has no declared coverage table; its glyph coverage is unknown.`,
      });
    }
  }
  return findings;
}
