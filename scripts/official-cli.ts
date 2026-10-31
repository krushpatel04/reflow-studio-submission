import { closeSync, fsyncSync, linkSync, lstatSync, openSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptOfficial, OfficialAdapterError } from '../src/official-adapter';
import { BUNDLED_RESOURCES, type DesignResources } from '../src/resources';
import { measure } from './native';

// Provisional-subset adapter entry: no renderer, level-3 or visual claim.
const MAX_REQUEST_BYTES = 2 * 1024 * 1024, MAX_ROLES_BYTES = 64 * 1024, MAX_ASSET_BYTES = 8 * 1024 * 1024;
type Failure = { category: string; code: string; path: string; message: string };
function fail(error: Failure, exitCode = 2): never {
  process.stderr.write(JSON.stringify({ error }) + '\n');
  process.exit(exitCode);
}
const argument = (message: string, path = '$args'): never => fail({ category: 'input', code: 'invalid-argument', path, message });

/** Errno code only: raw error.message embeds absolute paths and is never printed. */
const errnoCode = (error: unknown, fallback: string) => typeof (error as NodeJS.ErrnoException)?.code === 'string' ? (error as NodeJS.ErrnoException).code! : fallback;

/** True when every path is absent or a REGULAR file (lstat: symlinks and directories are never replaced). */
function finalsAreRegularOrAbsent(paths: string[]): boolean {
  return paths.every(p => { try { return lstatSync(p).isFile(); } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return true; throw e; } });
}

/**
 * Transactional multi-file write. Stage temps (wx + fsync), hardlink-back-up existing regular finals, rename all, roll back on any error.
 * On failure every final is byte-identical to before (or absent if absent before) and no tmp/bak remains. The ORIGINAL error is always rethrown;
 * if a restore fails the surviving .bak is kept and named (basename) on stderr. ponytail: a crash between renames can leave a .bak; no journal.
 */
export function commitFiles(files: [string, string][], ops: { rename: typeof renameSync } = { rename: renameSync }): void {
  const temps: string[] = [], baks = new Map<string, string>(), renamed: string[] = [];
  const quiet = (fn: () => void) => { try { fn(); } catch { /* best-effort cleanup */ } };
  try {
    for (const [path, text] of files) {
      const temp = `${path}.${process.pid}.tmp`;
      const fd = openSync(temp, 'wx'); temps.push(temp);
      try { writeSync(fd, text); fsyncSync(fd); } finally { closeSync(fd); }
    }
    for (const [path] of files) {
      let regular = false;
      try { regular = lstatSync(path).isFile(); if (!regular) throw Object.assign(new Error('not a regular file'), { code: 'output-not-regular' }); }
      catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
      if (regular) { const bak = `${path}.${process.pid}.bak`; linkSync(path, bak); baks.set(path, bak); }
    }
    for (const [path] of files) { ops.rename(`${path}.${process.pid}.tmp`, path); renamed.push(path); }
  } catch (error) {
    let restoreFailed = false;
    for (const path of renamed.reverse()) {
      const bak = baks.get(path);
      try { if (bak) { ops.rename(bak, path); baks.delete(path); } else rmSync(path, { force: true }); }
      catch { restoreFailed = true; }
    }
    for (const temp of temps) quiet(() => rmSync(temp, { force: true }));
    for (const [path, bak] of baks) {
      if (restoreFailed && renamed.includes(path)) process.stderr.write(JSON.stringify({ warning: { code: 'restore-failed', message: `Original kept at ${basename(bak)}` } }) + '\n');
      else quiet(() => rmSync(bak, { force: true }));
    }
    throw error;
  }
  for (const bak of baks.values()) quiet(() => rmSync(bak, { force: true }));
}

function main() {
  const FLAGS = ['--input', '--output', '--assets', '--roles'];
  const options = new Map<string, string>();
  let report = false;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--report') { if (report) argument('--report given twice.'); report = true; continue; }
    if (!FLAGS.includes(flag) || !argv[i + 1] || options.has(flag)) argument('Expected --input FILE --output FILE [--assets DIR] [--roles FILE] [--report].');
    options.set(flag, argv[++i]);
  }
  if (!options.get('--input')) argument('--input is required.', '$args.input');
  if (!options.get('--output')) argument('--output is required.', '$args.output');

  function readCapped(path: string, cap: number, name: string): string {
    try {
      const status = statSync(path); // follows symlinks to regular files
      if (!status.isFile()) fail({ category: 'input', code: 'unsupported-input-type', path: `$args.${name}`, message: `${name} must resolve to a regular file.` });
      if (status.size > cap) argument(`${name} exceeds ${cap} bytes.`, `$args.${name}`);
      return readFileSync(path, 'utf8');
    } catch (error) {
      return fail({ category: 'input', code: errnoCode(error, 'input-read-failed'), path: `$args.${name}`, message: `${name} could not be read.` });
    }
  }
  const parseJson = (text: string, name: string): unknown => {
    try { return JSON.parse(text); } catch { return fail({ category: 'input', code: 'invalid-json', path: `$args.${name}`, message: `${name} is not valid JSON.` }); }
  };

  const inputPath = options.get('--input')!, outputPath = options.get('--output')!;
  const request = parseJson(readCapped(inputPath, MAX_REQUEST_BYTES, 'input'), 'input');

  let roles: Record<string, 'content' | 'background'> | undefined;
  if (options.has('--roles')) {
    const parsed = parseJson(readCapped(options.get('--roles')!, MAX_ROLES_BYTES, 'roles'), 'roles');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) argument('--roles must contain a JSON object mapping id to role.', '$args.roles');
    roles = Object.assign(Object.create(null), parsed);
  }

  // Local assets only: bare filenames, resolved inside the real assets directory, png/svg regular files.
  let assetsDir: string | undefined;
  if (options.has('--assets')) {
    try { assetsDir = realpathSync(options.get('--assets')!); if (!statSync(assetsDir).isDirectory()) throw Error('not a directory'); }
    catch { argument('--assets must be an existing directory.', '$args.assets'); }
  }
  const inside = (parent: string, child: string) => child === parent || child.startsWith(parent.endsWith(sep) ? parent : parent + sep);
  const resources: DesignResources = {
    supportsFont: BUNDLED_RESOURCES.supportsFont, // fonts the native measurer lacks are rejected, never guessed
    resolveAsset(id) {
      if (!assetsDir || !id || id !== basename(id) || /[\\\0]/.test(id) || id === '.' || id === '..') return undefined;
      const mime = id.endsWith('.png') ? 'image/png' : id.endsWith('.svg') ? 'image/svg+xml' : undefined;
      if (!mime) return undefined;
      try {
        const real = realpathSync(join(assetsDir, id));
        if (!inside(assetsDir, real)) return undefined;
        const status = statSync(real);
        if (!status.isFile() || status.size > MAX_ASSET_BYTES) return undefined;
        return `data:${mime};base64,${readFileSync(real).toString('base64')}`;
      } catch { return undefined; }
    },
  };

  // Output must not alias the input or live in the assets directory (compared by real path).
  const realTarget = (path: string) => join(realpathSync(dirname(resolve(path))), basename(path));
  let target: string, reportTarget: string;
  try {
    target = realTarget(outputPath); reportTarget = target + '.report.json';
    const realInput = realpathSync(inputPath);
    const targets = report ? [target, reportTarget] : [target];
    for (const t of targets) {
      if (t === realInput) argument('--output must not be the input file.', '$args.output');
      if (assetsDir && inside(assetsDir, t)) argument('--output must not be inside the assets directory.', '$args.output');
      try { if (realpathSync(t) === realInput) argument('--output must not alias the input file.', '$args.output'); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    }
    if (!finalsAreRegularOrAbsent(targets)) fail({ category: 'input', code: 'output-not-regular', path: '$args.output', message: '--output and its report path must be absent or regular files; symlinks and directories are not replaced.' });
  } catch (error) {
    fail({ category: 'input', code: errnoCode(error, 'invalid-argument'), path: '$args.output', message: '--output could not be resolved.' });
  }

  try {
    const outcome = adaptOfficial(request, measure, resources, { ...(roles ? { roles } : {}), ...(report ? { report: true as const } : {}) });
    const outputText = JSON.stringify(outcome.output, null, 2) + '\n';
    commitFiles([[target, outputText], ...(report ? [[reportTarget, JSON.stringify(outcome.report, null, 2) + '\n'] as [string, string]] : [])]);
    process.stdout.write(JSON.stringify({ output: target, ...(report ? { report: reportTarget } : {}), unsupported: outcome.unsupported }) + '\n');
  } catch (error) {
    if (error instanceof OfficialAdapterError) fail({ category: 'adapter', code: error.code, path: error.path, message: error.message });
    fail({ category: 'runtime', code: errnoCode(error, 'adapter-failed'), path: '$', message: 'Adapter run failed.' }, 1);
  }
}

/** Entry check on REAL paths: a symlinked directory or file must still run main (a false negative is a silent exit 0). Unresolvable argv[1] means imported, not run. */
const isEntry = (): boolean => { try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (isEntry()) main();
