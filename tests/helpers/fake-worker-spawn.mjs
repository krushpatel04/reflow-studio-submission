// Test-only preload: replaces child_process.spawn with a controlled child that emits scripted
// 'data' events, so the unmodified supervisor sees exact chunk boundaries.
// REFLOW_FAKE_SCENARIO -> JSON file: { steps: [{ s: 'out'|'err', parts: [{ b64, times? }], chunk? }], code? (null = killed by signal), hang?, spawnError? }
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
const cp = createRequire(import.meta.url)('node:child_process');
const scenario = JSON.parse(readFileSync(process.env.REFLOW_FAKE_SCENARIO, 'utf8'));
cp.spawn = () => {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = Object.assign(new EventEmitter(), { end() {} });
  let closed = false;
  const close = (code, signal) => { if (closed) return; closed = true; child.emit('exit', code, signal); child.emit('close', code, signal); };
  child.kill = signal => { setImmediate(() => close(null, signal)); return true; };
  setImmediate(() => {
    for (const step of scenario.steps) {
      const target = step.s === 'out' ? child.stdout : child.stderr;
      const data = Buffer.concat(step.parts.flatMap(p => Array.from({ length: p.times ?? 1 }, () => Buffer.from(p.b64, 'base64'))));
      const chunk = step.chunk ?? (data.length || 1);
      for (let i = 0; i < data.length && !closed; i += chunk) target.emit('data', data.subarray(i, i + chunk));
    }
    if (scenario.spawnError) { child.emit('error', new Error(scenario.spawnError)); return; }
    if (!scenario.hang) close(scenario.code === null ? null : scenario.code ?? 0, scenario.code === null ? 'SIGSEGV' : null);
  });
  return child;
};
syncBuiltinESMExports();
