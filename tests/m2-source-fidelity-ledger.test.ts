import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateLedger, type Ledger } from '../scripts/m2-source-fidelity-ledger';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/m2-source-fidelity-manifest.json', import.meta.url), 'utf8')) as Ledger;
const inventory = { elements: 2, copy_count: 1, text_count: 1 };
const eligible = {
  id: 'synthetic-control', category: 'eligible', reason: 'preserved',
  sourceInventory: inventory, convertedInventory: { ...inventory }, resources: [{ id: 'synthetic-resource', status: 'available', reason: 'synthetic-control' }], evidence: 'Synthetic validator positive control; not observed source evidence.',
} as const;

 test('the available practice rows remain in the denominator as not assessed', () => {
  assert.deepEqual(validateLedger(fixture), []);
  assert.equal(fixture.declaredSourceCount, 2);
  assert.deepEqual(fixture.rows.map(r => [r.id, r.category, r.reason]), [
    ['figma-practice-birthday-flyer', 'not-assessed', 'input-unavailable'],
    ['figma-practice-clyra-poster', 'not-assessed', 'input-unavailable'],
  ]);
});

test('an eligible synthetic positive control passes when inventories agree', () => {
  assert.deepEqual(validateLedger({ ...fixture, declaredSourceCount: 1, rows: [eligible] }), []);
});

test('rejects duplicate and missing source identifiers', () => {
  assert.ok(validateLedger({ ...fixture, declaredSourceCount: 2, rows: [fixture.rows[0], fixture.rows[0]] }).some(e => /duplicate.*id/i.test(e)));
  assert.ok(validateLedger({ ...fixture, rows: [fixture.rows[0], { ...fixture.rows[1], id: '' }] }).some(e => /missing.*id/i.test(e)));
});

test('rejects denominator mismatch and invalid category/reason pairs', () => {
  assert.ok(validateLedger({ ...fixture, declaredSourceCount: 3 }).some(e => /count/i.test(e)));
  assert.ok(validateLedger({ ...fixture, rows: [{ ...fixture.rows[0], category: 'eligible' as never, reason: 'input-unavailable' }, fixture.rows[1]] }).some(e => /category|reason/i.test(e)));
});

test('eligible row cannot pass when inventories or resource status disagree', () => {
  assert.ok(validateLedger({ ...fixture, declaredSourceCount: 1, rows: [{ ...eligible, convertedInventory: { ...inventory, text_count: 0 } }] }).some(e => /inventory|count/i.test(e)));
  assert.ok(validateLedger({ ...fixture, declaredSourceCount: 1, rows: [{ ...eligible, resources: [{ id: 'synthetic-resource', status: 'missing', reason: 'missing-resource' }] }] }).some(e => /resource/i.test(e)));
});
