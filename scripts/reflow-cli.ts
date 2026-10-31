import { spawn } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { StringDecoder } from 'node:string_decoder';
import { fileURLToPath } from 'node:url';

const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 20 * 1024 * 1024;
const DEFAULT_DEADLINE_MS = 30_000;
const MAX_DEADLINE_MS = 120_000;

type CliFailure = { category: string; code: string; path: string; message: string };
function fail(error: CliFailure, exitCode = 2): never {
  process.stderr.write(JSON.stringify({ error }) + '\n');
  process.exit(exitCode);
}
function argument(message: string): never {
  return fail({ category: 'input', code: 'invalid-argument', path: '$args', message });
}
function integer(value: string | undefined, name: string, min: number, max: number): number {
  if (value === undefined || !/^[0-9]+$/.test(value)) argument(`${name} must be an integer from ${min} to ${max}.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) argument(`${name} must be an integer from ${min} to ${max}.`);
  return number;
}

const options = new Map<string, string>();
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) {
  if (!['--input', '--width', '--height', '--deadline-ms'].includes(argv[i]) || !argv[i + 1] || options.has(argv[i])) {
    argument('Expected --input FILE --width N --height N [--deadline-ms N].');
  }
  options.set(argv[i], argv[i + 1]);
}
if (!options.get('--input')) argument('--input is required.');
const width = integer(options.get('--width'), '--width', 1, 8000);
const height = integer(options.get('--height'), '--height', 1, 8000);
const deadlineMs = options.has('--deadline-ms') ? integer(options.get('--deadline-ms'), '--deadline-ms', 1, MAX_DEADLINE_MS) : DEFAULT_DEADLINE_MS;
let input: string;
try {
  const path = options.get('--input')!;
  const status = statSync(path); // follows symlinks; links to regular files are supported
  if (!status.isFile()) {
    fail({ category: 'input', code: 'unsupported-input-type', path: '$args.input',
      message: 'Input must resolve to a regular file; directories and special files are unsupported.' });
  }
  if (status.size > MAX_INPUT_BYTES) argument(`Input exceeds ${MAX_INPUT_BYTES} bytes.`);
  input = readFileSync(path, 'utf8');
  if (Buffer.byteLength(input) > MAX_INPUT_BYTES) argument(`Input exceeds ${MAX_INPUT_BYTES} bytes.`);
} catch (error) {
  fail({ category: 'input', code: 'input-read-failed', path: '$args.input', message: error instanceof Error ? error.message : String(error) });
}

const worker = fileURLToPath(new URL('./reflow-worker.ts', import.meta.url));
const started = performance.now();
const child = spawn(process.execPath, ['--max-old-space-size=512', '--import', 'tsx', worker], { stdio: ['pipe', 'pipe', 'pipe'] });
let output = '', diagnostic = '', finished = false, timedOut = false, overflow = false;
const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, deadlineMs);
child.once('exit', () => clearTimeout(timer));
// Per-stream UTF-8 decoders keep split multibyte characters intact; limits count raw bytes.
const decoders = { out: new StringDecoder('utf8'), err: new StringDecoder('utf8') };
const received = { out: 0, err: 0 };
const collect = (chunk: Buffer, kind: 'out' | 'err') => {
  if (overflow) return;
  received[kind] += chunk.length;
  if (received[kind] > MAX_OUTPUT_BYTES) { overflow = true; child.kill('SIGKILL'); return; }
  const text = decoders[kind].write(chunk);
  if (kind === 'out') output += text; else diagnostic += text;
};
child.stdout.on('data', chunk => collect(chunk, 'out'));
child.stderr.on('data', chunk => collect(chunk, 'err'));
child.stdin.on('error', () => {});
child.stdin.end(JSON.stringify({ design: input, target: { id: 'cli-target', label: 'CLI target', width, height } }));
child.on('error', error => {
  if (finished) return;
  finished = true; clearTimeout(timer);
  fail({ category: 'runtime', code: 'spawn-failed', path: '$worker', message: error.message }, 1);
});
child.on('close', code => {
  if (finished) return;
  finished = true; clearTimeout(timer);
  if (!overflow) { output += decoders.out.end(); diagnostic += decoders.err.end(); }
  if (timedOut) fail({ category: 'runtime', code: 'deadline-exceeded', path: '$worker', message: `Worker exceeded ${deadlineMs} ms and was terminated.` }, 124);
  if (overflow) fail({ category: 'runtime', code: 'output-limit', path: '$worker', message: 'Worker output exceeded the provisional limit.' }, 1);
  if (code === 0) {
    try {
      const payload = JSON.parse(output);
      payload.timing.processWallMs = performance.now() - started;
      process.stdout.write(JSON.stringify(payload) + '\n');
    } catch {
      fail({ category: 'runtime', code: 'invalid-worker-output', path: '$worker', message: 'Worker output was not valid JSON.' }, 1);
    }
    return;
  }
  if (diagnostic.trim()) {
    try {
      const payload = JSON.parse(diagnostic);
      if (payload.error?.code && payload.error?.category) {
        process.stderr.write(JSON.stringify(payload) + '\n');
        process.exitCode = code || 1;
        return;
      }
    } catch { /* A native crash may write a stack trace instead of the worker protocol. */ }
  }
  fail({ category: 'runtime', code: 'worker-failed', path: '$worker', message: `Worker exited with status ${code}.` }, 1);
});
