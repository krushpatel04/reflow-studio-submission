import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { FIXTURES } from '../src/fixtures';
import { TARGETS } from '../src/model';
import { reflow } from '../src/engine';
import type { Design, TextElement } from '../src/model';
import { layoutText, type Measure } from '../src/typography';
import { measure } from '../scripts/native';
import { FONT_COVERAGE, findUncoveredText, type CodepointRange } from '../src/font-coverage';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const afterDark = FIXTURES.find(f => f.id === 'after-dark')!;
const baseText = afterDark.elements.find((e): e is TextElement => e.type === 'text' && e.id === 'eyebrow')!;

/** A minimal design containing a single text element, for coverage probes that don't need a full fixture. */
function withText(id: string, text: string, fontFamily = 'Inter'): Design {
  return { ...afterDark, elements: [{ ...baseText, id, text, fontFamily }] };
}

// ---- layoutText, measured with the real native (Skia) measurer, not the synthetic one used elsewhere ----

test('a long unbroken word wraps under real font metrics without dropping characters', () => {
  const word = 'Supercalifragilisticexpialidocious';
  const out = layoutText({ ...baseText, text: word, width: 80, fontSize: 24 }, measure);
  assert.equal(out.lines.join(''), word, 'no characters may be dropped while wrapping');
  assert.ok(out.lines.length > 1, 'expected the word to wrap across more than one line at this width');
});

test('explicit newlines are preserved as separate paragraph breaks', () => {
  const text = 'Line one\nLine two\nLine three';
  const out = layoutText({ ...baseText, text, width: 1000, fontSize: 24 }, measure);
  assert.deepEqual(out.lines, ['Line one', 'Line two', 'Line three']);
});

test('repeated interior whitespace collapses in rendered lines but the source text element is never mutated (documented intended behavior, not a bug to fix)', () => {
  const element = { ...baseText, text: 'Hello    world', width: 1000, fontSize: 24 };
  const before = structuredClone(element);
  const out = layoutText(element, measure);
  assert.deepEqual(out.lines, ['Hello world']);
  assert.deepEqual(element, before, 'layoutText must not mutate the element it was given');
  assert.equal(element.text, 'Hello    world', 'e.text must retain the original spacing');
});

test('leading and trailing whitespace is dropped from rendered lines but not from the source text (documented intended behavior)', () => {
  const element = { ...baseText, text: '   Hello world   ', width: 1000, fontSize: 24 };
  const out = layoutText(element, measure);
  assert.deepEqual(out.lines, ['Hello world']);
  assert.equal(element.text, '   Hello world   ');
});

test('a combining mark is never split from its base character across a line break', () => {
  const word = 'cafe' + '́'; // base "e" plus a combining acute accent, kept as two code points (not a precomposed "e-acute")
  const out = layoutText({ ...baseText, text: word, width: 6, fontSize: 24 }, measure);
  assert.equal(out.lines.join(''), word, 'no characters may be dropped while wrapping');
  assert.ok(!out.lines.includes('́'), 'the combining mark must never appear alone on its own line');
  assert.ok(out.lines.some(line => line.endsWith('e' + '́')), 'the base character and its combining mark must stay on the same line');
});

test('an emoji ZWJ sequence is never split across a line break', () => {
  const woman = '\u{1F469}', zwj = '‍', palette = '\u{1F3A8}';
  const sequence = woman + zwj + palette; // "woman artist" as a single ZWJ emoji sequence
  const text = 'AAAA' + sequence + 'AAAA';
  const out = layoutText({ ...baseText, text, width: 40, fontSize: 24 }, measure);
  assert.equal(out.lines.join(''), text, 'no characters may be dropped while wrapping');
  assert.ok(out.lines.some(line => line.includes(sequence)), 'the ZWJ sequence must stay together on one line');
});

// ---- findUncoveredText: normal, boundary, invalid-input and positive-control cases ----

test('findUncoveredText flags the arrow already shipped in the ticket-label fixture', () => {
  // Regression for finding #2 in docs/plans/typography-font-parity.md: no Inter subset's
  // unicode-range covers U+2192, and this exact fixture ships it today.
  const findings = findUncoveredText(afterDark);
  const ticket = findings.find(f => f.elementId === 'ticket-label');
  assert.ok(ticket, 'expected a finding for ticket-label');
  assert.ok(ticket!.offenses.some(o => o.codepoint === 0x2192 && o.character === '→'));
});

test('findUncoveredText flags emoji as uncovered', () => {
  const thumbsUp = '\u{1F44D}';
  const findings = findUncoveredText(withText('emoji', 'Great job ' + thumbsUp));
  const finding = findings.find(f => f.elementId === 'emoji');
  assert.ok(finding);
  assert.ok(finding!.offenses.some(o => o.codepoint === 0x1f44d));
});

test('findUncoveredText flags Arabic and Hebrew with a message naming bidirectional text as unsupported', () => {
  const arabic = findUncoveredText(withText('arabic', 'مرحبا')); // "marhaba"
  const hebrew = findUncoveredText(withText('hebrew', 'שלום')); // "shalom"
  for (const findings of [arabic, hebrew]) {
    assert.equal(findings.length, 1);
    assert.match(findings[0].message, /bidirectional/i);
    assert.ok(findings[0].offenses.length > 0);
  }
});

test('findUncoveredText does not flag ordinary Cyrillic or Greek text (positive control: fontsource declares dedicated subsets for both, so a stricter check must not reject them)', () => {
  assert.deepEqual(findUncoveredText(withText('cyrillic', 'Привет мир')), []); // "Privet mir"
  assert.deepEqual(findUncoveredText(withText('greek', 'Καλημέρα')), []); // "Kalimera"
});

test('findUncoveredText returns nothing for the ordinary ASCII text in the bundled fixtures (positive control), except the known ticket-label arrow', () => {
  for (const design of FIXTURES) {
    const findings = findUncoveredText(design);
    if (design.id === 'after-dark') assert.deepEqual(findings.map(f => f.elementId), ['ticket-label']);
    else assert.deepEqual(findings, [], `expected no findings for all-ASCII fixture "${design.id}"`);
  }
});

test('findUncoveredText returns nothing for an element with no text-worthy content (boundary: empty string)', () => {
  assert.deepEqual(findUncoveredText(withText('empty', '')), []);
});

// ---- drift test: the committed FONT_COVERAGE constant must match the unicode-range declarations
// that @fontsource ships today, so a dependency bump can't silently invalidate it. ----

function parseUnicodeRanges(css: string): CodepointRange[] {
  const ranges: CodepointRange[] = [];
  for (const declaration of css.matchAll(/unicode-range:\s*([^;]+);/g)) {
    for (const token of declaration[1].split(',')) {
      const m = /^\s*U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?\s*$/.exec(token);
      if (!m) throw new Error(`Could not parse unicode-range token: "${token}"`);
      const start = parseInt(m[1], 16);
      ranges.push([start, m[2] ? parseInt(m[2], 16) : start]);
    }
  }
  return ranges;
}

function mergeRanges(ranges: CodepointRange[]): CodepointRange[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

test('FONT_COVERAGE has not drifted from the unicode-range declarations @fontsource ships in node_modules', () => {
  const interCss = readFileSync(resolve(root, 'node_modules/@fontsource/inter/400.css'), 'utf8');
  const interRanges = mergeRanges(parseUnicodeRanges(interCss));
  assert.deepEqual(FONT_COVERAGE.Inter, interRanges,
    'Inter coverage table drifted from node_modules/@fontsource/inter/400.css; regenerate src/font-coverage.ts');

  // All four bundled Inter weights are expected to declare identical subset ranges.
  for (const weight of [500, 600, 700]) {
    const css = readFileSync(resolve(root, `node_modules/@fontsource/inter/${weight}.css`), 'utf8');
    assert.deepEqual(mergeRanges(parseUnicodeRanges(css)), interRanges, `Inter ${weight} unicode-range differs from Inter 400`);
  }

  const sourceSerifCss = readFileSync(resolve(root, 'node_modules/@fontsource/source-serif-4/600.css'), 'utf8');
  const sourceSerifRanges = mergeRanges(parseUnicodeRanges(sourceSerifCss));
  assert.deepEqual(FONT_COVERAGE['Source Serif 4'], sourceSerifRanges,
    'Source Serif 4 coverage table drifted from node_modules/@fontsource/source-serif-4/600.css; regenerate src/font-coverage.ts');

  // Per docs/plans/typography-font-parity.md: Inter ships 7 subsets per weight, Source Serif 4 600 ships 6.
  assert.equal((interCss.match(/unicode-range:/g) ?? []).length, 7);
  assert.equal((sourceSerifCss.match(/unicode-range:/g) ?? []).length, 6);
});

// ---- Fit clearance: a fitted size must not sit on a wrap boundary ----

test('no fitted text element flips its line breaks under sub-pixel measurement noise', () => {
  // Chromium and Skia measure the same string at the same size a few hundredths of a pixel
  // apart. fitText binary-searches the largest size that fits, so without a clearance it can
  // converge onto a wrap boundary, and the two engines then wrap the same text differently —
  // the preview disagrees with the export. product-pairs/story/headline did exactly this.
  // 0.3%: the worst relative width difference measured between Chromium and Skia over the
  // font-parity corpus is 0.2856%, on short strings dense with kern pairs.
  const noise = 0.003;
  const shifted = (factor: number): Measure => (text, e) => {
    const m = measure(text, e);
    return { ...m, width: m.width * factor };
  };
  const fragile: string[] = [];
  for (const source of FIXTURES) for (const target of TARGETS) {
    for (const e of reflow(source, target, measure).selected.design.elements) {
      if (e.type !== 'text' || !e.text.trim()) continue;
      const base = layoutText(e, measure).lines;
      for (const factor of [1 + noise, 1 - noise]) {
        if (JSON.stringify(layoutText(e, shifted(factor)).lines) !== JSON.stringify(base)) {
          fragile.push(`${source.id}/${target.id}/${e.id}`);
          break;
        }
      }
    }
  }
  assert.deepEqual(fragile, [], `Fitted text sitting on a wrap boundary: ${fragile.join(', ')}`);
});
