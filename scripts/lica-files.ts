import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

/** File I/O for the LICA importer. Network helpers cache under the given directory (default .cache/lica-import, git-ignored). */
export const sha256 = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');

export async function readLicaJson(path: string): Promise<{ kind: 'value'; value: unknown } | { kind: 'missing' } | { kind: 'invalid' }> {
  let source: string;
  try { source = await readFile(path, 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { kind: 'missing' };
    throw error;
  }
  try { return { kind: 'value', value: JSON.parse(source) }; }
  catch (error) {
    if (error instanceof SyntaxError) return { kind: 'invalid' };
    throw error;
  }
}

export async function writeCorpusFile(root: string, file: string, data: Buffer | string): Promise<{ file: string; sha256: string }> {
  const full = resolve(root, file);
  const rel = relative(resolve(root), full);
  if (isAbsolute(file) || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`${file} is outside ${root}.`);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, data);
  return { file, sha256: sha256(data) };
}

export async function fetchCached(url: string, cacheDir: string): Promise<Buffer> {
  const path = join(cacheDir, 'assets', sha256(url));
  if (existsSync(path)) return readFile(path);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const data = Buffer.from(await response.arrayBuffer());
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
  return data;
}

export const fontsourceId = (family: string) => family.toLowerCase().replaceAll(' ', '-');

/** Unpacks @fontsource/<id> once with `npm pack` (nothing installed) and returns its latin, normal-style file for the weight. */
export function fontsourceFont(family: string, weight: number, cacheDir: string): { woff2: string; license?: string } | undefined {
  const id = fontsourceId(family);
  const dir = join(cacheDir, 'fonts', id);
  const pkg = join(dir, 'package');
  if (!existsSync(pkg)) {
    if (existsSync(join(dir, 'missing'))) return undefined;
    mkdirSync(dir, { recursive: true });
    try {
      execFileSync('npm', ['pack', `@fontsource/${id}`, '--silent', '--pack-destination', dir], { stdio: 'pipe' });
      const tgz = readdirSync(dir).find(f => f.endsWith('.tgz'));
      if (!tgz) throw new Error('no tarball');
      execFileSync('tar', ['-xzf', join(dir, tgz), '-C', dir]);
    } catch {
      writeFileSync(join(dir, 'missing'), '');
      return undefined;
    }
  }
  const woff2 = join(pkg, 'files', `${id}-latin-${weight}-normal.woff2`);
  if (!existsSync(woff2)) return undefined;
  const license = join(pkg, 'LICENSE');
  return existsSync(license) ? { woff2, license } : { woff2 };
}
