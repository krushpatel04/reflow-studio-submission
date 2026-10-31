import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { CorpusManifest } from '../src/corpus';
import { buildImportLedger, checkImportLedger, type ScanObservation } from '../scripts/lica-outcomes';

const scan = (layoutId: string, state: ScanObservation['state'], extra: Partial<ScanObservation> = {}): ScanObservation => ({
  layoutId, templateId: `template-${layoutId}`, category: 'Flyers', state, ...extra,
});
const converted = (layoutId: string, status: 'supported' | 'adapted' | 'unsupported', extra: Partial<ScanObservation> = {}) =>
  scan(layoutId, 'converted', { conversion: { status, losses: status === 'adapted' ? ['italic dropped'] : [], blockers: status === 'unsupported' ? ['rotation'] : [] }, ...extra });
const manifest = (ids: string[]): CorpusManifest => ({
  schemaVersion: 'reflow.corpus.v0', targets: [{ id: 'square', label: 'Square', width: 100, height: 100 }],
  families: ids.map(id => ({ id: `lica-template-${id}`, split: 'development', description: id })),
  sources: ids.map(id => ({ id: `lica-${id}`, familyId: `lica-template-${id}`, file: `lica/designs/${id}.json`, sha256: 'a'.repeat(64), templateId: `lica:template-${id}`, provenance: { kind: 'dataset', name: 'LICA', license: 'CC-BY-4.0', attribution: 'LICA' }, resources: [], conversion: { status: 'supported', importer: 'test', losses: [] } })),
});

test('every input has one truthful outcome and counts reconcile', () => {
  const scans = [
    converted('selected-supported', 'supported'),
    converted('selected-adapted', 'adapted'),
    converted('bad-transform', 'unsupported'),
    scan('animated', 'animated'),
    scan('no-render', 'missing-render'),
    scan('no-json', 'missing-json'),
    scan('bad-json', 'invalid-json'),
    converted('no-font', 'supported', { unavailable: { code: 'missing-font', detail: 'Font 700' } }),
    converted('no-image', 'supported', { unavailable: { code: 'image-unavailable', detail: 'photo.png' } }),
    converted('valid-unselected', 'supported'),
  ];
  const ledger = buildImportLedger(scans, ['selected-supported', 'selected-adapted'], 'f'.repeat(64));
  assert.equal(ledger.total, 10);
  assert.deepEqual(ledger.counts, { supported: 1, adapted: 1, unsupported: 2, unavailable: 5, 'not-selected': 1 });
  assert.deepEqual(Object.fromEntries(ledger.entries.map(e => [e.layoutId, [e.disposition, e.reason]])), {
    'selected-supported': ['supported', 'selected'], 'selected-adapted': ['adapted', 'selected'],
    'bad-transform': ['unsupported', 'conversion-blocked'], animated: ['unsupported', 'animated-layout'],
    'no-render': ['unavailable', 'missing-render'], 'no-json': ['unavailable', 'missing-json'], 'bad-json': ['unavailable', 'invalid-json'],
    'no-font': ['unavailable', 'missing-font'], 'no-image': ['unavailable', 'image-unavailable'],
    'valid-unselected': ['not-selected', 'batch-limit-assets-unchecked'],
  });
  assert.deepEqual(ledger.entries.find(e => e.layoutId === 'selected-adapted')?.losses, ['italic dropped']);
  assert.deepEqual(ledger.entries.find(e => e.layoutId === 'bad-transform')?.blockers, ['rotation']);
  const selectedManifest = manifest(['selected-supported', 'selected-adapted']);
  selectedManifest.sources[1].conversion.status = 'adapted';
  selectedManifest.sources[1].conversion.losses = ['italic dropped'];
  assert.deepEqual(checkImportLedger(ledger, selectedManifest), []);
});

test('duplicate scans, missing conversion, and impossible selection are rejected', () => {
  assert.throws(() => buildImportLedger([scan('a', 'animated'), scan('a', 'animated')], [], 'f'.repeat(64)), /duplicate/i);
  assert.throws(() => buildImportLedger([scan('a', 'converted')], [], 'f'.repeat(64)), /conversion/i);
  assert.throws(() => buildImportLedger([converted('a', 'unsupported')], ['a'], 'f'.repeat(64)), /selected/i);
  assert.throws(() => buildImportLedger([converted('a', 'supported')], ['missing'], 'f'.repeat(64)), /selected/i);
});

test('ledger and manifest must name the same selected LICA designs', () => {
  const ledger = buildImportLedger([converted('a', 'supported'), converted('b', 'adapted')], ['a'], 'f'.repeat(64));
  assert.match(checkImportLedger(ledger, manifest(['a', 'b'])).join(' '), /b/);
  assert.match(checkImportLedger(ledger, manifest([])).join(' '), /a/);
  assert.deepEqual(checkImportLedger(ledger, manifest(['a'])), []);
});

test('tampered counts and repeated ledger IDs cannot pass validation', () => {
  const ledger = buildImportLedger([converted('a', 'supported')], ['a'], 'f'.repeat(64));
  assert.match(checkImportLedger({ ...ledger, total: 3 }, manifest(['a'])).join(' '), /total/);
  assert.match(checkImportLedger({ ...ledger, entries: [...ledger.entries, ledger.entries[0]] }, manifest(['a'])).join(' '), /duplicate/i);
});

test('selected outcome must retain its manifest template and conversion status', () => {
  const ledger = buildImportLedger([converted('a', 'adapted')], ['a'], 'f'.repeat(64));
  const wrong = manifest(['a']);
  assert.match(checkImportLedger(ledger, wrong).join(' '), /conversion/i);
  wrong.sources[0].conversion.status = 'adapted';
  wrong.sources[0].conversion.losses = ['italic dropped'];
  assert.deepEqual(checkImportLedger(ledger, wrong), []);
  wrong.sources[0].templateId = 'lica:other';
  assert.match(checkImportLedger(ledger, wrong).join(' '), /template/i);
});

test('pinned metadata prevents an omitted row from passing adjusted self-counts', () => {
  const full = buildImportLedger([converted('a', 'supported'), converted('b', 'supported')], ['a'], 'f'.repeat(64));
  const shortened = { ...full, total: 1, counts: { ...full.counts, 'not-selected': 0 }, entries: full.entries.filter(e => e.layoutId !== 'b') };
  assert.match(checkImportLedger(shortened, manifest(['a']), { sha256: 'f'.repeat(64), total: 2 }).join(' '), /metadata.*total/i);
  assert.match(checkImportLedger(full, manifest(['a']), { sha256: 'a'.repeat(64), total: 2 }).join(' '), /metadata.*hash/i);
});

test('a prototype property is never accepted as a disposition', () => {
  const ledger = buildImportLedger([converted('a', 'supported')], ['a'], 'f'.repeat(64));
  const bad = { ...ledger, entries: [{ ...ledger.entries[0], disposition: 'toString' as typeof ledger.entries[0]['disposition'] }] };
  assert.match(checkImportLedger(bad, manifest(['a'])).join(' '), /invalid disposition/i);
});

test('pinned metadata identities reject a substituted row even at the same count', () => {
  const full = buildImportLedger([converted('a', 'supported'), converted('b', 'supported')], ['a'], 'f'.repeat(64));
  const entriesSha256 = createHash('sha256').update(JSON.stringify([['a', 'template-a', 'Flyers'], ['b', 'template-b', 'Flyers']])).digest('hex');
  const expected = { sha256: 'f'.repeat(64), total: 2, entriesSha256 };
  assert.deepEqual(checkImportLedger(full, manifest(['a']), expected), []);
  const swapped = { ...full, entries: full.entries.map(e => e.layoutId === 'b' ? { ...e, layoutId: 'c' } : e) };
  assert.match(checkImportLedger(swapped, manifest(['a']), expected).join(' '), /metadata.*identit/i);
});

test('metadata identity digest uses stable codepoint order for mixed-case IDs', () => {
  const ledger = buildImportLedger([converted('a', 'supported'), converted('A', 'supported')], [], 'f'.repeat(64));
  const entriesSha256 = createHash('sha256').update(JSON.stringify([['A', 'template-A', 'Flyers'], ['a', 'template-a', 'Flyers']])).digest('hex');
  assert.deepEqual(checkImportLedger(ledger, manifest([]), { sha256: 'f'.repeat(64), total: 2, entriesSha256 }), []);
});
