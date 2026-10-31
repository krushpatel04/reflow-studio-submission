import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CorpusManifest, ManifestIssue } from '../src/corpus';
import { checkImportLedger, LICA_METADATA, type ImportLedger } from './lica-outcomes';

export async function checkImportLedgerFile(manifest: CorpusManifest, root: string, required: boolean, expectedMetadata: { sha256: string; total: number; entriesSha256?: string } | undefined = required ? LICA_METADATA : undefined): Promise<ManifestIssue[]> {
  const path = join(root, 'lica/import-outcomes.json');
  let text: string;
  try { text = await readFile(path, 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return required ? [{ severity: 'error', code: 'missing-import-ledger', path, message: 'LICA import outcomes are missing.' }] : [];
    }
    return [{ severity: 'error', code: 'invalid-import-ledger', path, message: `Cannot read LICA import outcomes: ${error instanceof Error ? error.message : String(error)}` }];
  }
  try {
    const ledger = JSON.parse(text) as ImportLedger;
    if (!ledger || !Array.isArray(ledger.entries) || !ledger.counts || typeof ledger.counts !== 'object') throw Error('Invalid ledger structure.');
    return checkImportLedger(ledger, manifest, expectedMetadata).map(message => ({ severity: 'error', code: 'invalid-import-ledger', path, message }));
  } catch (error) {
    return [{ severity: 'error', code: 'invalid-import-ledger', path, message: `Cannot validate LICA import outcomes: ${error instanceof Error ? error.message : String(error)}` }];
  }
}
