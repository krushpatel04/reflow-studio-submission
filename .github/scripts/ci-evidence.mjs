// Full, bounded CI evidence fallback. No product result is changed by this tool.
import { lstatSync, readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const LIMIT = 32 * 1024 * 1024;
const digest = data => createHash('sha256').update(data).digest('hex');
function argumentsFor(argv) {
  const mode = argv.shift(); const options = {}; const paths = [];
  while (argv.length) {
    const value = argv.shift();
    if (value.startsWith('--')) {
      if (!['--name', '--max-bytes', '--log', '--out'].includes(value) || options[value] !== undefined || !argv.length) throw Error('Invalid or duplicate option');
      options[value] = argv.shift();
    } else paths.push(value);
  }
  if (!['emit', 'recover'].includes(mode) || !/^[a-z][a-z0-9-]{0,63}$/.test(options['--name'] || '')) throw Error('Use emit|recover --name SAFE-NAME');
  return { mode, options, paths };
}
function inspectRoots(paths) {
  if (!paths.length || new Set(paths).size !== paths.length) throw Error('Unique evidence roots required');
  const existing = []; const absent = []; let files = 0;
  const walk = path => {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw Error('Evidence symlinks are refused');
    if (stat.isDirectory()) for (const child of readdirSync(path)) walk(join(path, child));
    else if (stat.isFile()) files++;
    else throw Error('Only regular evidence files are allowed');
  };
  for (const path of paths) {
    const parts = path.split('/');
    if (isAbsolute(path) || parts[0] !== 'reports' || parts.length < 2 || parts.some(p => !p || p === '.' || p === '..') || path.includes('\\')) throw Error('Evidence roots must be normalized paths below reports/');
    try {
      for (let i = 1; i <= parts.length; i++) {
        if (lstatSync(parts.slice(0, i).join('/')).isSymbolicLink()) throw Error('Evidence parent symlinks are refused');
      }
      walk(path); existing.push(path);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      absent.push(path);
    }
  }
  if (!files) throw Error('No evidence files exist; retention cannot succeed');
  return { existing, absent, files };
}
function emit(options, paths) {
  if (options['--log'] || options['--out']) throw Error('emit does not accept recovery options');
  const max = Number(options['--max-bytes'] || LIMIT);
  if (!Number.isSafeInteger(max) || max < 1 || max > LIMIT) throw Error('Archive budget must be a positive integer up to 32MiB');
  const roots = inspectRoots(paths); const temp = mkdtempSync(join(tmpdir(), 'reflow-ci-evidence-'));
  try {
    const archive = join(temp, 'evidence.tgz');
    const tar = spawnSync('tar', ['-czf', archive, '--', ...roots.existing], { encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024 });
    if (tar.error || tar.status !== 0) throw Error(`Evidence archive failed: ${tar.error?.message || tar.stderr}`);
    const size = lstatSync(archive).size;
    if (size > max) throw Error(`Evidence archive ${size} exceeds ${max} byte budget; nothing truncated`);
    const data = readFileSync(archive); const encoded = data.toString('base64');
    const chunks = Math.ceil(encoded.length / 4096);
    console.log('REFLOW_EVIDENCE_BEGIN ' + JSON.stringify({ version: 1, name: options['--name'], bytes: size, sha256: digest(data), chunks, roots: roots.existing, absent: roots.absent, files: roots.files }));
    for (let i = 0; i < chunks; i++) console.log(`REFLOW_EVIDENCE_DATA ${options['--name']} ${i} ${encoded.slice(i * 4096, (i + 1) * 4096)}`);
    console.log(`REFLOW_EVIDENCE_END ${options['--name']}`);
  } finally { rmSync(temp, { recursive: true, force: true }); }
}
function recover(options, paths) {
  if (paths.length || !options['--log'] || !options['--out'] || options['--max-bytes']) throw Error('recover requires --log FILE --out NEW-ARCHIVE');
  if (lstatSync(options['--log']).size > 128 * 1024 * 1024) throw Error('Log exceeds recovery budget');
  const lines = readFileSync(options['--log'], 'utf8').split(/\r?\n/);
  let header; let ended = false; const chunks = [];
  for (const line of lines) {
    const start = line.indexOf('REFLOW_EVIDENCE_BEGIN ');
    if (start >= 0) {
      const item = JSON.parse(line.slice(start + 'REFLOW_EVIDENCE_BEGIN '.length));
      if (item.name !== options['--name']) continue;
      if (header) throw Error('Duplicate archive header');
      if (item.version !== 1 || !Number.isSafeInteger(item.bytes) || item.bytes < 1 || item.bytes > LIMIT || !Number.isSafeInteger(item.chunks) || item.chunks < 1 || item.chunks !== Math.ceil(Math.ceil(item.bytes / 3) * 4 / 4096) || !/^[a-f0-9]{64}$/.test(item.sha256)) throw Error('Invalid archive header');
      header = item; continue;
    }
    const chunk = line.match(/REFLOW_EVIDENCE_DATA ([a-z][a-z0-9-]{0,63}) (\d+) ([A-Za-z0-9+/=]+)$/);
    if (chunk?.[1] === options['--name']) {
      if (!header || ended || Number(chunk[2]) !== chunks.length || chunks.length >= header.chunks) throw Error('Missing, duplicate or out-of-order archive chunk');
      chunks.push(chunk[3]); continue;
    }
    const end = line.match(/REFLOW_EVIDENCE_END ([a-z][a-z0-9-]{0,63})$/);
    if (end?.[1] === options['--name']) {
      if (!header || ended) throw Error('Unexpected archive footer');
      ended = true;
    }
  }
  if (!header || !ended || chunks.length !== header.chunks) throw Error('Incomplete archive in log');
  const encoded = chunks.join(''); const data = Buffer.from(encoded, 'base64');
  if (data.toString('base64') !== encoded || data.length !== header.bytes || digest(data) !== header.sha256) throw Error('Archive integrity verification failed');
  writeFileSync(options['--out'], data, { flag: 'wx' });
  console.log(JSON.stringify({ recovered: true, name: header.name, bytes: data.length, sha256: header.sha256, roots: header.roots, absent: header.absent }));
}
try {
  const { mode, options, paths } = argumentsFor(process.argv.slice(2));
  if (mode === 'emit') emit(options, paths); else recover(options, paths);
} catch (error) { console.error(`CI evidence: ${error.message}`); process.exitCode = 1; }
