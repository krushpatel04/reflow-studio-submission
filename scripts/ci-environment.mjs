import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { cpus, platform, release, arch } from 'node:os';

await mkdir('reports/ci', { recursive: true });
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const lock = await readFile('package-lock.json');
const report = {
  generatedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA ?? null,
  node: process.version, platform: platform(), release: release(), architecture: arch(), cpu: cpus()[0]?.model,
  schemaVersion: 'reflow.design.v0', lockSha256: createHash('sha256').update(lock).digest('hex'),
  fonts: Object.fromEntries(Object.entries(manifest.dependencies).filter(([name]) => name.startsWith('@fontsource/'))),
  nativeCanvas: manifest.dependencies['@napi-rs/canvas'], playwright: manifest.devDependencies['@playwright/test'],
  scope: 'Synthetic development corpus; no independent quality, Adobe renderer or offline-container certification.',
};
await writeFile('reports/ci/environment.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
