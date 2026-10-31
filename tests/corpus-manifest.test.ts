import test from 'node:test';
import assert from 'node:assert/strict';
import { checkManifest, type CorpusManifest, type CorpusSource } from '../src/corpus';

const hash = (c: string) => c.repeat(64);
const source = (id: string, familyId: string, sha: string, extra: Partial<CorpusSource> = {}): CorpusSource => ({
  id, familyId, file: `designs/${id}.json`, sha256: sha,
  provenance: { kind: 'dataset', name: 'LICA', license: 'CC-BY-4.0', attribution: 'LICA dataset authors', url: 'https://github.com/purvanshi/lica-dataset' },
  resources: [{ kind: 'font', id: 'Inter-500', file: 'fonts/inter-500.woff2', sha256: hash('f') }],
  conversion: { status: 'supported', importer: 'lica-import@0', losses: [] },
  ...extra,
});
function valid(): CorpusManifest {
  return {
    schemaVersion: 'reflow.corpus.v0',
    targets: [{ id: 'square', label: 'Square', width: 1080, height: 1080 }, { id: 'banner', label: 'Banner', width: 1500, height: 500 }],
    families: [
      { id: 'lica-poster', split: 'development', description: 'LICA poster template and its variants' },
      { id: 'creator-menu', split: 'test', description: 'Cafe menu supplied by an outside creator' },
      { id: 'fixtures', split: 'development', description: 'Team-authored regressions' },
    ],
    sources: [
      source('lica-poster-1', 'lica-poster', hash('1'), { templateId: 'lica:t-100' }),
      source('menu-1', 'creator-menu', hash('2'), {
        provenance: { kind: 'author', name: 'Outside creator A', permission: 'Written permission by email, 2026-09-20' },
        conversion: { status: 'adapted', importer: 'manual@0', losses: ['Drop shadow on headline removed'] },
      }),
      source('after-dark', 'fixtures', hash('3'), { provenance: { kind: 'synthetic', name: 'Reflow team' } }),
    ],
  };
}
const errors = (input: unknown) => checkManifest(input).filter(i => i.severity === 'error').map(i => [i.code, i.path]);
function rejects(input: unknown, code: string, path: string) {
  assert.deepEqual(errors(input).filter(([c]) => c === code), [[code, path]], JSON.stringify(checkManifest(input), null, 1));
}

// Positive controls

test('a complete manifest with dataset, author and synthetic development sources has no errors', () => {
  assert.deepEqual(errors(valid()), []);
});
test('the same source file may be reused by two families in the same split', () => {
  const m = valid();
  m.families.push({ id: 'lica-flyer', split: 'development', description: 'Different family, same split' });
  m.sources.push(source('flyer-1', 'lica-flyer', hash('1')));
  assert.deepEqual(errors(m), []);
});
test('different templates in different families are accepted', () => {
  const m = valid();
  m.families.push({ id: 'lica-sale', split: 'validation', description: 'Sale banner' });
  m.sources.push(source('sale-1', 'lica-sale', hash('4'), { templateId: 'lica:t-200' }));
  assert.deepEqual(errors(m), []);
});
test('unsupported sources remain valid entries when their losses are listed', () => {
  const m = valid();
  m.sources.push(source('lica-poster-2', 'lica-poster', hash('5'), { conversion: { status: 'unsupported', importer: 'lica-import@0', losses: ['Rotated text is not supported'] } }));
  assert.deepEqual(errors(m), []);
});

// Split separation

test('the same source file in development and test families is rejected', () => {
  const m = valid();
  m.sources.push(source('menu-copy', 'lica-poster', hash('2')));
  rejects(m, 'cross-split-duplicate', '$.sources[3].sha256');
});
test('one template in two families is rejected even within one split', () => {
  const m = valid();
  m.families.push({ id: 'lica-poster-b', split: 'development', description: 'Mistaken second family' });
  m.sources.push(source('lica-poster-9', 'lica-poster-b', hash('6'), { templateId: 'lica:t-100' }));
  rejects(m, 'cross-family-template', '$.sources[3].templateId');
});
test('several sources from one template inside one family are accepted', () => {
  const m = valid();
  m.sources.push(source('lica-poster-2', 'lica-poster', hash('7'), { templateId: 'lica:t-100' }));
  assert.deepEqual(errors(m), []);
});
for (const split of ['validation', 'test'] as const) test(`synthetic team designs are rejected in ${split} families`, () => {
  const m = valid();
  m.families[2].split = split;
  rejects(m, 'synthetic-outside-development', '$.sources[2].provenance.kind');
});

// Provenance and resources

for (const field of ['license', 'attribution'] as const) test(`dataset sources without ${field} are rejected`, () => {
  const m = valid();
  delete m.sources[0].provenance[field];
  rejects(m, 'missing-provenance', `$.sources[0].provenance.${field}`);
});
test('author sources without a permission record are rejected', () => {
  const m = valid();
  m.sources[1].provenance.permission = '  ';
  rejects(m, 'missing-provenance', '$.sources[1].provenance.permission');
});
for (const bad of ['', 'abc', hash('A'), hash('g')]) test(`resource hash ${JSON.stringify(bad.slice(0, 4))}… is rejected`, () => {
  const m = valid();
  m.sources[0].resources[0].sha256 = bad;
  rejects(m, 'invalid-hash', '$.sources[0].resources[0].sha256');
});
test('a source without a valid file hash is rejected', () => {
  const m = valid() as any;
  delete m.sources[1].sha256;
  rejects(m, 'invalid-hash', '$.sources[1].sha256');
});

// Conversion disclosure

test('adapted sources must disclose what was lost', () => {
  const m = valid();
  m.sources[1].conversion.losses = [];
  rejects(m, 'undisclosed-loss', '$.sources[1].conversion.losses');
});
test('unsupported sources must say why', () => {
  const m = valid();
  m.sources[0].conversion = { status: 'unsupported', importer: 'lica-import@0', losses: [] };
  rejects(m, 'undisclosed-loss', '$.sources[0].conversion.losses');
});
test('supported sources cannot also list losses', () => {
  const m = valid();
  m.sources[0].conversion.losses = ['Gradient flattened'];
  rejects(m, 'contradictory-conversion', '$.sources[0].conversion.losses');
});

// Identity and structure

test('duplicate family, source and target IDs are rejected', () => {
  const m = valid();
  m.families.push({ ...m.families[0] });
  m.sources.push({ ...m.sources[0] });
  m.targets.push({ ...m.targets[0] });
  const found = errors(m).filter(([c]) => c === 'duplicate-id').map(([, p]) => p).sort();
  assert.deepEqual(found, ['$.families[3].id', '$.sources[3].id', '$.targets[2].id']);
});
test('sources must reference a declared family', () => {
  const m = valid();
  m.sources[0].familyId = 'nowhere';
  rejects(m, 'unknown-family', '$.sources[0].familyId');
});
test('non-object input and the wrong schema version are rejected', () => {
  for (const input of [null, [], 'manifest', 3]) rejects(input, 'invalid-structure', '$');
  rejects({ ...valid(), schemaVersion: 'reflow.corpus.v9' }, 'unsupported-schema', '$.schemaVersion');
});
test('unknown split, provenance kind and conversion status values are rejected', () => {
  const m = valid() as any;
  m.families[0].split = 'train';
  m.sources[0].provenance.kind = 'scraped';
  m.sources[0].conversion.status = 'mostly';
  const found = errors(m).filter(([c]) => c === 'invalid-structure').map(([, p]) => p);
  for (const path of ['$.families[0].split', '$.sources[0].provenance.kind', '$.sources[0].conversion.status']) assert.ok(found.includes(path), `${path} in ${found}`);
});
test('an empty target list and invalid target dimensions are rejected', () => {
  rejects({ ...valid(), targets: [] }, 'invalid-structure', '$.targets');
  const m = valid(); m.targets[1].width = 0;
  rejects(m, 'invalid-structure', '$.targets[1]');
});
test('missing or malformed families and sources arrays are rejected without throwing', () => {
  const m = valid() as any;
  delete m.families; m.sources = 'none';
  const found = errors(m).map(([, p]) => p);
  assert.ok(found.includes('$.families') && found.includes('$.sources'), String(found));
});

// Readiness

test('a small valid corpus reports readiness warnings, not errors', () => {
  const issues = checkManifest(valid());
  assert.deepEqual(issues.filter(i => i.severity === 'error'), []);
  assert.deepEqual(issues.filter(i => i.severity === 'warning').map(i => i.code).sort(),
    ['too-few-families', 'too-few-sources', 'too-few-test-families']);
});
test('synthetic sources do not count toward readiness', () => {
  const m = valid();
  const fams = Array.from({ length: 6 }, (_, i) => ({ id: `synthetic-${i}`, split: 'development' as const, description: 'team' }));
  m.families.push(...fams);
  m.sources.push(...Array.from({ length: 20 }, (_, i) => source(`syn-${i}`, fams[i % 6].id, hash('9'), { provenance: { kind: 'synthetic', name: 'Reflow team' } })));
  const warnings = checkManifest(m).filter(i => i.severity === 'warning').map(i => i.code).sort();
  assert.deepEqual(warnings, ['too-few-families', 'too-few-sources', 'too-few-test-families']);
});
test('a corpus meeting the pilot targets has no readiness warnings', () => {
  const m = valid();
  m.families = Array.from({ length: 6 }, (_, i) => ({ id: `fam-${i}`, split: i < 3 ? 'test' as const : 'development' as const, description: `family ${i}` }));
  m.sources = Array.from({ length: 20 }, (_, i) => source(`src-${i}`, `fam-${i % 6}`, i.toString(16).padStart(64, '0')));
  assert.deepEqual(checkManifest(m), []);
});
