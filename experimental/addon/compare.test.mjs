import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyze } from './compare.mjs';

const TAG = 'reflow.sourceId';

function node(id, text, overrides = {}) {
  return {
    id,
    type: 'Text',
    text,
    bounds: { x: 100, y: 200, width: 300, height: 40 },
    rotation: 0,
    addOnData: { [TAG]: 'probe-1' },
    ...overrides,
  };
}

function snap(label, nodes) {
  return { label, takenAt: '2026-10-08T20:00:00Z', nodes };
}

const moved = { bounds: { x: 140, y: 200, width: 300, height: 40 } };

// A realistic clean run: created, natively edited, reopened unchanged, moved by a retried op.
function cleanRun() {
  return [
    snap('A-created', [node('n1', 'Reflow probe JH-01')]),
    snap('B-edited', [node('n1', 'Reflow probe edited')]),
    snap('C-reopened', [node('n1', 'Reflow probe edited')]),
    snap('D-retried', [node('n1', 'Reflow probe edited', moved)]),
  ];
}

test('a clean round trip has no findings and reports each real change', () => {
  const result = analyze(cleanRun(), { expectSame: [['B-edited', 'C-reopened']] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.findings, []);
  const fields = result.transitions.map((t) => t.changes.map((c) => c.field));
  assert.deepEqual(fields, [['text'], [], ['bounds']]);
  assert.deepEqual(result.transitions[0].changes[0], {
    sourceId: 'probe-1', field: 'text', before: 'Reflow probe JH-01', after: 'Reflow probe edited',
  });
});

test('untagged nodes the person added are ignored', () => {
  const run = cleanRun();
  run[1].nodes.push({ ...node('n9', 'Someone else'), addOnData: {} });
  assert.equal(analyze(run).ok, true);
});

test('a retried operation that creates a second tagged node is a duplicate', () => {
  const run = cleanRun();
  run[3].nodes.push(node('n2', 'Reflow probe edited', moved));
  const result = analyze(run);
  assert.equal(result.ok, false);
  assert.deepEqual(result.findings, [
    { kind: 'duplicate', label: 'D-retried', sourceId: 'probe-1', ids: ['n1', 'n2'] },
  ]);
});

test('a source ID whose native ID changes is reported', () => {
  const run = cleanRun();
  run[2].nodes = [node('n7', 'Reflow probe edited')];
  run[3].nodes = [node('n7', 'Reflow probe edited', moved)];
  const kinds = analyze(run).findings.map((f) => [f.kind, f.label, f.from, f.to]);
  assert.deepEqual(kinds, [
    ['id-changed', 'C-reopened', 'n1', 'n7'],
    ['id-changed', 'D-retried', 'n1', 'n7'],
  ]);
});

test('a known node that lost its tag is metadata loss, not a missing node', () => {
  const run = cleanRun();
  run[2].nodes = [{ ...node('n1', 'Reflow probe edited'), addOnData: {} }];
  const result = analyze(run);
  assert.deepEqual(result.findings, [
    { kind: 'metadata-lost', label: 'C-reopened', sourceId: 'probe-1', id: 'n1' },
  ]);
});

test('a source ID with no tagged node and no known ID is missing', () => {
  const run = cleanRun();
  run[2].nodes = [];
  const result = analyze(run);
  assert.deepEqual(result.findings, [{ kind: 'missing', label: 'C-reopened', sourceId: 'probe-1' }]);
});

test('a change across an expected-same transition is reported; other changes are not', () => {
  const run = cleanRun();
  run[2].nodes = [node('n1', 'Add your title')];
  const result = analyze(run, { expectSame: [['B-edited', 'C-reopened']] });
  assert.equal(result.ok, false);
  assert.deepEqual(result.findings, [
    {
      kind: 'unexpected-change', from: 'B-edited', to: 'C-reopened', sourceId: 'probe-1',
      field: 'text', before: 'Reflow probe edited', after: 'Add your title',
    },
  ]);
  // Positive control: the same run without an expectation only reports the change.
  assert.equal(analyze(run).ok, true);
});

test('rotation changes are reported like other fields', () => {
  const run = cleanRun();
  run[3].nodes = [node('n1', 'Reflow probe edited', { rotation: 15 })];
  assert.deepEqual(analyze(run).transitions[2].changes.map((c) => c.field), ['rotation']);
});

test('source-tag-only records cannot pass an expected-same comparison', () => {
  const record = { addOnData: { [TAG]: 'probe-1' } };
  assert.throws(() => analyze([snap('A', [record]), snap('B', [record])], {
    expectSame: [['A', 'B']],
  }), /invalid tracked node/);
});

test('malformed tracked fields are rejected in every snapshot', () => {
  const malformed = [
    ...['id', 'text', 'bounds', 'rotation'].map((field) => {
      const record = node('n1', 'valid');
      delete record[field];
      return record;
    }),
    ...['', null, 1].map((id) => node(id, 'valid')),
    node('n1', null), node('n1', 'valid', { bounds: null }),
    ...['x', 'y', 'width', 'height'].flatMap((field) => [
      node('n1', 'valid', { bounds: { ...node('n1', '').bounds, [field]: undefined } }),
      node('n1', 'valid', { bounds: { ...node('n1', '').bounds, [field]: NaN } }),
    ]),
    node('n1', 'valid', { rotation: Infinity }),
    node('n1', 'valid', { rotation: '0' }),
    ...['', null, 1].map((sourceId) => node('n1', 'valid', { addOnData: { [TAG]: sourceId } })),
  ];
  for (const record of malformed) {
    for (const index of [0, 1]) {
      const run = [snap('A', [node('n1', 'valid')]), snap('B', [node('n1', 'valid')])];
      run[index].nodes = [record];
      assert.throws(() => analyze(run), /invalid tracked node/);
    }
  }
  for (const record of [null, undefined, 1]) {
    const run = cleanRun();
    run[1].nodes.push(record);
    assert.throws(() => analyze(run), /invalid node/);
  }
  const run = cleanRun();
  run[2].nodes = [{ id: 'n1', addOnData: {} }];
  assert.throws(() => analyze(run), /invalid tracked node/);
});

test('valid empty text and zero geometry pass; unrelated incomplete records are ignored', () => {
  const record = node('n1', '', { bounds: { x: 0, y: 0, width: 0, height: 0 }, rotation: 0 });
  assert.equal(analyze([snap('A', [record, { id: 'unrelated' }]), snap('B', [record])], {
    expectSame: [['A', 'B']],
  }).ok, true);
});

test('invalid input is rejected rather than passed', () => {
  assert.throws(() => analyze([]), /at least two snapshots/);
  assert.throws(() => analyze([snap('A', []), { label: 'B' }]), /nodes/);
  assert.throws(() => analyze([snap('A', []), snap('A', [])]), /duplicate label/);
  assert.throws(() => analyze(cleanRun(), { expectSame: [['B-edited', 'Z']] }), /unknown label "Z"/);
  // The first snapshot must contain the tagged node, or nothing is being tracked.
  assert.throws(() => analyze([snap('A', []), snap('B', [])]), /no tagged nodes/);
});
