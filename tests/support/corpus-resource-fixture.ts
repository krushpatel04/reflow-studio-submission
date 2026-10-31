import type { TestContext } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { CorpusManifest, CorpusSource } from '../../src/corpus';
import type { Design } from '../../src/model';

export const digest = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
export async function resourceFixture(t: TestContext) {
  const base = await mkdtemp(join(tmpdir(), 'reflow-resources-'));
  const root = join(base, 'corpus');
  await mkdir(root);
  t.after(() => rm(base, { recursive: true, force: true }));
  const asset = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#4353ff"/></svg>');
  const font = await readFile('node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2');
  const design: Design = {
    schemaVersion: 'reflow.design.v0', id: 'editable-source', name: 'External resource control',
    description: 'Authored development control', provenance: 'synthetic',
    width: 600, height: 800, background: '#ffffff', groups: [], elements: [
      { id: 'art', type: 'image', role: 'content', x: 50, y: 50, width: 200, height: 200,
        assetId: 'external-art', fit: 'contain', focalPoint: { x: 0.5, y: 0.5 } },
      { id: 'copy', type: 'text', role: 'content', x: 50, y: 300, width: 450, height: 200,
        text: 'Cafe launch', fontFamily: 'Inter', fontWeight: 400, fontSize: 32,
        lineHeight: 1.2, color: '#111111', align: 'left' },
    ],
  };
  const source: CorpusSource = {
    id: 'manifest-source', familyId: 'control-family', file: 'design.json', sha256: '',
    provenance: { kind: 'synthetic', name: 'Resource regression control' },
    conversion: { status: 'supported', importer: 'control@1', losses: [] },
    resources: [
      { kind: 'asset', id: 'external-art', file: 'art.svg', sha256: digest(asset) },
      { kind: 'font', id: 'Inter-400', file: 'font.woff2', sha256: digest(font) },
    ],
  };
  await writeFile(join(root, 'art.svg'), asset);
  await writeFile(join(root, 'font.woff2'), font);
  const saveDesign = async () => { const bytes = JSON.stringify(design); source.sha256 = digest(bytes); await writeFile(join(root, source.file), bytes); return Buffer.byteLength(bytes); };
  await saveDesign();
  const manifest: CorpusManifest = {
    schemaVersion: 'reflow.corpus.v0', sources: [source],
    families: [{ id: source.familyId, split: 'development', description: 'Control' }],
    targets: [{ id: 'square', label: 'Square', width: 1080, height: 1080 }, { id: 'story', label: 'Story', width: 1080, height: 1920 }],
  };
  const manifestPath = join(root, 'manifest.json');
  const saveManifest = () => writeFile(manifestPath, JSON.stringify(manifest));
  await saveManifest();
  return { base, root, asset, font, design, source, manifest, manifestPath, saveDesign, saveManifest };
}
