/**
 * Writes native (Skia) text measurements for a fixed probe corpus to
 * reports/font-parity/native-metrics.json, so a browser-side comparator (tests/browser-checks.ts,
 * owned separately) can fetch this file from the dev server and diff it against live
 * `browserMeasure()` results for the same probes. Per docs/plans/typography-font-parity.md, the
 * binding assertion across engines is that `layoutText` produces the SAME `lines` array for a
 * given probe — advance-width deltas are recorded as observational evidence, not pass/fail.
 *
 * ---- reports/font-parity/native-metrics.json schema (schemaVersion: "reflow.font-parity.v1") ----
 *
 * {
 *   "schemaVersion": "reflow.font-parity.v1",
 *   "probes": [
 *     {
 *       "id": string,
 *         // Stable identifier. Fixture-derived probes: "<fixtureId>/<targetId>/<elementId>",
 *         // using the SELECTED reflow candidate's element (post-fit, as actually rendered).
 *         // Documented synthetic probes: "probe/<name>" (see PROBE_STRINGS below for the fixed
 *         // set: a long unbroken word, explicit "\n" breaks, repeated whitespace, a combining
 *         // mark, an emoji ZWJ sequence, and labelled Cyrillic/Greek/Vietnamese/Arabic samples).
 *       "source": "fixture" | "probe",
 *       "text": string,          // exact text measured (unwrapped; e.text for fixture probes)
 *       "fontFamily": string,
 *       "fontWeight": number,
 *       "fontSize": number,      // rounded to 3 decimals
 *       "lineHeight": number,
 *       "align": "left" | "center" | "right" | null,
 *       "box": { "width": number, "height": number },  // wrap box passed to layoutText, rounded
 *       "metrics": { "width": number, "ascent": number, "descent": number },
 *         // measure(text, element) on the whole, unwrapped text. Rounded to 3 decimals.
 *       "layout": {
 *         "lines": string[],      // layoutText(element, measure).lines — THE comparison that
 *                                 // matters: two engines must agree on where text breaks.
 *         "width": number, "ascent": number, "lineStep": number,  // rounded to 3 decimals
 *         "emergencyBreaks": number
 *       }
 *     },
 *     ...
 *   ]
 * }
 *
 * Determinism: probes appear in a fixed order (FIXTURES order, then TARGETS order, then each
 * design's paint order, then PROBE_STRINGS in declaration order below); every numeric field is
 * rounded to 3 decimal places; there is no timestamp or environment field. Two runs against the
 * same code and installed fonts produce byte-identical output.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { FIXTURES } from '../src/fixtures';
import { TARGETS, type TextElement } from '../src/model';
import { reflow } from '../src/engine';
import { layoutText } from '../src/typography';
import { measure } from './native';

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Documented probe strings (docs/plans/typography-font-parity.md step 6), each paired with the
 * wrap box it is measured under. Non-Latin samples use dedicated-script text (no English label
 * text) so their measurement isn't itself a mixed-script case; the probe `id` is the label. */
const PROBE_STRINGS: { id: string; text: string; width: number; height: number; fontSize?: number }[] = [
  { id: 'long-unbroken-word', text: 'Supercalifragilisticexpialidocious', width: 80, height: 400 },
  { id: 'explicit-line-breaks', text: 'Line one\nLine two\nLine three', width: 1000, height: 200 },
  { id: 'repeated-whitespace', text: 'Hello    world,   with     gaps', width: 1000, height: 100 },
  { id: 'combining-mark', text: 'cafe' + '́', width: 6, height: 200 }, // "e" + combining acute accent
  { id: 'emoji-zwj-sequence', text: 'AAAA' + '\u{1F469}' + '‍' + '\u{1F3A8}' + 'AAAA', width: 40, height: 200 }, // "woman artist" ZWJ sequence
  { id: 'cyrillic-sample', text: 'Привет, мир', width: 400, height: 100 }, // "Hello, world"
  { id: 'greek-sample', text: 'Καλημέρα κόσμε', width: 400, height: 100 }, // "Good morning, world"
  { id: 'vietnamese-sample', text: 'Xin chào thế giới', width: 400, height: 100 }, // "Hello world"
  { id: 'arabic-sample', text: 'مرحبا بالعالم', width: 400, height: 100 }, // "Hello world" (RTL; declared unsupported, not reordered)
];

type Probe = ReturnType<typeof probeFrom>;
function probeFrom(id: string, source: 'fixture' | 'probe', e: TextElement) {
  const raw = measure(e.text, e);
  const layout = layoutText(e, measure);
  return {
    id, source,
    text: e.text,
    fontFamily: e.fontFamily,
    fontWeight: e.fontWeight,
    fontSize: round(e.fontSize),
    lineHeight: e.lineHeight,
    align: e.align ?? null,
    box: { width: round(e.width), height: round(e.height) },
    metrics: { width: round(raw.width), ascent: round(raw.ascent), descent: round(raw.descent) },
    layout: { lines: layout.lines, width: round(layout.width), ascent: round(layout.ascent), lineStep: round(layout.lineStep), emergencyBreaks: layout.emergencyBreaks },
  };
}

const probes: Probe[] = [];
for (const source of FIXTURES) {
  for (const target of TARGETS) {
    const result = reflow(source, target, measure);
    for (const e of result.selected.design.elements) {
      if (e.type === 'text') probes.push(probeFrom(`${source.id}/${target.id}/${e.id}`, 'fixture', e));
    }
  }
}
for (const p of PROBE_STRINGS) {
  const element: TextElement = {
    id: p.id, type: 'text', role: 'content', text: p.text,
    x: 0, y: 0, width: p.width, height: p.height,
    fontSize: p.fontSize ?? 32, fontWeight: 400, fontFamily: 'Inter', color: '#000000', lineHeight: 1.2,
  };
  probes.push(probeFrom(`probe/${p.id}`, 'probe', element));
}

const report = { schemaVersion: 'reflow.font-parity.v1', probes };
await mkdir('reports/font-parity', { recursive: true });
await writeFile('reports/font-parity/native-metrics.json', JSON.stringify(report, null, 2));
console.log(`Wrote ${probes.length} probes to reports/font-parity/native-metrics.json`);
