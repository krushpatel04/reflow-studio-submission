import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CorpusManifest, ManifestIssue } from '../src/corpus';
import { checkSplitLock, type SplitLock } from './corpus-splits';

export async function loadSplitLock(root: string): Promise<SplitLock> {
  const input: unknown = JSON.parse(await readFile(join(root, 'split-lock.json'), 'utf8'));
  if (!input || typeof input !== 'object' || !Array.isArray((input as SplitLock).families)) throw Error('Expected a split lock with families.');
  return input as SplitLock;
}

export async function checkCorpusSplitFile(manifest: CorpusManifest, root: string): Promise<ManifestIssue[]> {
  try { return checkSplitLock(manifest, await loadSplitLock(root)); }
  catch (error) {
    const missing = (error as NodeJS.ErrnoException).code === 'ENOENT';
    return [{ severity: 'error', code: missing ? 'missing-split-lock' : 'invalid-split-lock', path: '$.split-lock.json', message: error instanceof Error ? error.message : String(error) }];
  }
}
