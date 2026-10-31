import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CorpusManifest } from '../src/corpus';
import { buildImportLedger } from '../scripts/lica-outcomes';
import { checkImportLedgerFile } from '../scripts/lica-outcomes-file';

const manifest: CorpusManifest = {
  schemaVersion: 'reflow.corpus.v0', targets: [{ id: 'square', label: 'Square', width: 100, height: 100 }],
  families: [{ id: 'lica-t', split: 'development', description: 'test' }],
  sources: [{ id: 'lica-a', familyId: 'lica-t', file: 'lica/designs/a.json', sha256: 'a'.repeat(64), templateId: 'lica:t', provenance: { kind: 'dataset', name: 'LICA', license: 'CC-BY-4.0', attribution: 'LICA' }, resources: [], conversion: { status: 'supported', importer: 'test', losses: [] } }],
};

test('a required ledger must exist and match the selected manifest sources', async t => {
  const root = await mkdtemp(join(tmpdir(), 'reflow-outcomes-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  assert.match((await checkImportLedgerFile(manifest, root, true)).map(i => i.code).join(' '), /missing-import-ledger/);
  assert.deepEqual(await checkImportLedgerFile(manifest, root, false), []);
  await mkdir(join(root, 'lica'));
  const ledger = buildImportLedger([{ layoutId: 'a', templateId: 't', category: 'Flyers', state: 'converted', conversion: { status: 'supported', losses: [], blockers: [] } }], ['a'], 'f'.repeat(64));
  await writeFile(join(root, 'lica/import-outcomes.json'), JSON.stringify(ledger));
  assert.deepEqual(await checkImportLedgerFile(manifest, root, true, { sha256: 'f'.repeat(64), total: 1 }), []);
  await writeFile(join(root, 'lica/import-outcomes.json'), JSON.stringify({ ...ledger, total: 2 }));
  assert.match((await checkImportLedgerFile(manifest, root, true, { sha256: 'f'.repeat(64), total: 1 })).map(i => i.code).join(' '), /invalid-import-ledger/);
});
