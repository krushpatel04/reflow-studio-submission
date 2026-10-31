import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { CorpusManifest, ManifestIssue } from '../src/corpus';
import { validateDesign } from '../src/model';

/** Compares a structurally valid manifest (see checkManifest) with the files under root. Paths are checked lexically; a symlink inside root is followed. */
export async function checkCorpusFiles(manifest: CorpusManifest, root: string): Promise<ManifestIssue[]> {
  const issues: ManifestIssue[] = [];
  const error = (code: string, path: string, message: string) => issues.push({ severity: 'error', code, path, message });
  const load = async (file: string, path: string): Promise<Buffer | undefined> => {
    const full = resolve(root, file);
    const rel = relative(resolve(root), full);
    if (isAbsolute(file) || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
      error('file-outside-corpus', path, `${file} is outside the corpus directory.`);
      return undefined;
    }
    try { return await readFile(full); } catch {
      error('missing-file', path, `${file} could not be read.`);
      return undefined;
    }
  };
  const matches = (data: Buffer, expected: string, path: string, file: string) => {
    const actual = createHash('sha256').update(data).digest('hex');
    if (actual !== expected) error('hash-mismatch', path, `${file} has sha256 ${actual}; the manifest records ${expected}.`);
  };

  for (const [i, source] of manifest.sources.entries()) {
    const path = `$.sources[${i}]`;
    const data = await load(source.file, `${path}.file`);
    if (data) {
      matches(data, source.sha256, `${path}.sha256`, source.file);
      if (source.conversion.status !== 'unsupported') {
        try { validateDesign(JSON.parse(data.toString('utf8'))); } catch (e) {
          error('invalid-design', `${path}.file`, `${source.file} is not a valid reflow design: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
    for (const [r, resource] of source.resources.entries()) {
      const bytes = await load(resource.file, `${path}.resources[${r}].file`);
      if (bytes) matches(bytes, resource.sha256, `${path}.resources[${r}].sha256`, resource.file);
    }
  }
  return issues;
}
