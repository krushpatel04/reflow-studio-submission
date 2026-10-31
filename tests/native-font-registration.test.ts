import test from 'node:test';
import assert from 'node:assert/strict';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { resolve } from 'node:path';
import { measure } from '../scripts/native';
import { layoutText } from '../src/typography';
import { FIXTURES } from '../src/fixtures';
import type { TextElement } from '../src/model';

// These tests exercise the real native (Skia) measurer exported by scripts/native.ts, not a
// synthetic one. They exist to pin the empirical finding behind issue #3 / docs/plans/typography-font-parity.md:
// @napi-rs/canvas's GlobalFonts does NOT merge multiple files registered under one family name
// (later registrations for an already-used family+weight are silently shadowed, not unioned), so
// scripts/native.ts must resolve each grapheme against the subset that actually covers it.

const baseText = FIXTURES[0].elements.find((e): e is TextElement => e.type === 'text')!;
const el = (text: string, overrides: Partial<TextElement> = {}): TextElement => ({ ...baseText, text, fontSize: 40, fontWeight: 400, fontFamily: 'Inter', ...overrides });

/** A gold measurer: registers ONLY the given single subset file under a private alias, so its
 * measurement is unambiguous ground truth for glyphs that subset covers. */
function goldMeasurer(subsetFile: string, weight = 400) {
  const alias = `Gold_${subsetFile}_${Math.random().toString(36).slice(2)}`;
  const key = GlobalFonts.registerFromPath(resolve(`node_modules/@fontsource/inter/files/inter-${subsetFile}-${weight}-normal.woff2`), alias);
  if (!key) throw new Error(`Could not register gold font for ${subsetFile}`);
  const ctx = createCanvas(1, 1).getContext('2d');
  return (text: string) => {
    ctx.font = `${weight} 40px "${alias}"`;
    return ctx.measureText(text).width;
  };
}

// Runs that split across more than one measureText() call (any text mixing subsets, including a
// pure non-Latin sentence with plain-ASCII spaces) accumulate ~1e-5px of ordinary floating-point
// summation noise versus a single monolithic call — irrelevant at rendering precision, but not
// bit-exact. assertClose tolerates that; assert.equal (used below for single-run text) does not
// need to, and its exactness is itself a regression check that no drift was introduced.
function assertClose(actual: number, expected: number, message: string) {
  assert.ok(Math.abs(actual - expected) < 0.01, `${message} (actual=${actual}, expected=${expected})`);
}

test('a pure Cyrillic string measures within floating-point tolerance of a solo-registered Cyrillic subset (real coverage, not fallback)', () => {
  const text = 'Привет мир';
  const gold = goldMeasurer('cyrillic')(text);
  const actual = measure(text, el(text)).width;
  assertClose(actual, gold, 'native measure() must resolve Cyrillic glyphs to the Cyrillic subset, not a fallback/default font');
});

test('a pure Greek string measures within floating-point tolerance of a solo-registered Greek subset', () => {
  const text = 'Γειά σου κόσμε';
  const gold = goldMeasurer('greek')(text);
  const actual = measure(text, el(text)).width;
  assertClose(actual, gold, 'expected the Greek run to resolve to the Greek subset');
});

test('a Vietnamese string containing plain-Latin consonants and Vietnamese-only precomposed vowels measures as the sum of each correctly-resolved run (not as if the whole string were one script)', () => {
  const text = 'Tiếng Việt xin chào';
  // "chào" ends in U+00E0 (a-grave), which is within the *latin* subset's own declared range
  // (Latin-1 Supplement), not the vietnamese subset - so the correct ground truth for this string
  // is a mix of latin runs (T,i,n,g,V,x,i,n,c,h,à,o, spaces) and vietnamese-only runs (ế, ệ), not
  // a monolithic measurement under either single face.
  const goldLatin = goldMeasurer('latin');
  const goldViet = goldMeasurer('vietnamese');
  const expected = goldLatin('Ti') + goldViet('ế') + goldLatin('ng Vi') + goldViet('ệ') + goldLatin('t xin chào');
  const actual = measure(text, el(text)).width;
  assertClose(actual, expected, 'expected each run to resolve independently to the subset that actually covers it');
});

test('a Latin-Extended string measures as the sum of each correctly-resolved run', () => {
  // Ł/ź/ż/ł/ć/Š (U+0141,U+017A,U+017C,U+0142,U+0107,U+0160) fall in latin-ext's declared range
  // (U+0100-02BA); ó/à and plain ASCII fall in latin's own U+0000-00FF Latin-1 Supplement range.
  const text = 'Łódź żółć Škoda';
  const goldLatinExt = goldMeasurer('latin-ext');
  const goldLatin = goldMeasurer('latin');
  const expected = goldLatinExt('Ł') + goldLatin('ód') + goldLatinExt('ź') + goldLatin(' ') +
    goldLatinExt('ż') + goldLatin('ó') + goldLatinExt('łć') + goldLatin(' ') + goldLatinExt('Š') + goldLatin('koda');
  const actual = measure(text, el(text)).width;
  assertClose(actual, expected, 'expected each run to resolve independently to the subset that actually covers it');
});

test('an ASCII label prefix followed by non-Latin content measures each run against its own covering subset (regression: a naive single-family fallback list picks one shaping font for the whole string based on the first character)', () => {
  const label = 'Cyrillic: ';
  const body = 'Привет мир';
  const goldLatin = goldMeasurer('latin');
  const goldCyr = goldMeasurer('cyrillic');
  const expected = goldLatin(label) + goldCyr(body);
  const actual = measure(label + body, el(label + body)).width;
  assertClose(actual, expected, 'mixed-script text must be measured run-by-run, not shaped entirely under one font');
});

test('plain ASCII measurement is unchanged by the wider subset registration (no regression for the overwhelmingly common case)', () => {
  const text = 'SAVE YOUR SEAT';
  const goldLatin = goldMeasurer('latin', 700);
  const expected = goldLatin(text);
  const actual = measure(text, el(text, { fontWeight: 700 })).width;
  assert.equal(actual, expected, 'kerning/advance for pure-Latin text must not regress when other subsets are also registered');
});

test('a Vietnamese paragraph wraps across multiple lines under a narrow box without emergency character-level breaks', () => {
  const text = 'Tiếng Việt xin chào các bạn học sinh và giáo viên';
  const out = layoutText(el(text, { width: 220, height: 400 }), measure);
  assert.equal(out.lines.join(' ').replace(/\s+/g, ' '), text.replace(/\s+/g, ' '));
  assert.ok(out.lines.length > 1, 'expected the paragraph to wrap across more than one line');
  assert.equal(out.emergencyBreaks, 0, 'real (non-fallback) glyph widths should not force character-level emergency breaks');
});
