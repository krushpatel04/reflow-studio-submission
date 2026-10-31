import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { checkManifest, type CorpusManifest } from '../src/corpus';
import { checkCorpusFiles } from './corpus-files';
import { checkCorpusSplitFile } from './corpus-split-files';
import { checkImportLedgerFile } from './lica-outcomes-file';

// Usage: npm run corpus:check [manifest path]. File paths in the manifest are relative to its directory.
const manifestPath = process.argv[2] ?? 'corpus/manifest.json';
let input: unknown;
try {
  input = JSON.parse(await readFile(manifestPath, 'utf8'));
} catch (e) {
  console.error(`Cannot read ${manifestPath}: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
const issues = checkManifest(input);
// File checks assume a well-formed manifest; skip them until structural errors are fixed.
if (!issues.some(i => i.code === 'invalid-structure' || i.code === 'unsupported-schema')) {
  issues.push(...await checkCorpusFiles(input as CorpusManifest, dirname(manifestPath)));
  issues.push(...await checkCorpusSplitFile(input as CorpusManifest, dirname(manifestPath)));
  issues.push(...await checkImportLedgerFile(input as CorpusManifest, dirname(manifestPath), resolve(manifestPath) === resolve('corpus/manifest.json')));
}
issues.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1));
for (const i of issues) console.log(`${i.severity.toUpperCase()} ${i.code} ${i.path}: ${i.message}`);
const errors = issues.filter(i => i.severity === 'error').length;
console.log(`${manifestPath}: ${errors} error(s), ${issues.length - errors} warning(s).`);
process.exitCode = errors ? 1 : 0;
