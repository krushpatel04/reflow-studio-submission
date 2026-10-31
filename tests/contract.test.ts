import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES } from '../src/fixtures';
import { validateDesign } from '../src/model';
import { reflow } from '../src/engine';

// Deliberately unknown runtime inputs, like decoded documents at an adapter boundary.
function setPath(value: any, path: string, replacement: unknown) {
  const keys = path.split('.');
  const last = keys.pop()!;
  for (const key of keys) value = value[key];
  value[last] = replacement;
}
function errorAt(run: () => unknown, path: string, category = 'structure') {
  assert.throws(run, (error: any) => {
    assert.equal(error.name, 'DesignValidationError');
    assert.equal(error.category, category);
    assert.equal(error.path, path);
    assert.ok(error.code && error.message.includes(path));
    return true;
  });
}
const cases: [string, unknown][] = [
  ['id', undefined], ['name', '  '], ['description', null], ['provenance', 3],
  ['width', NaN], ['height', Infinity], ['width', 0], ['height', 8001],
  ['background', 'not-a-color'], ['background', '#12'], ['background', {}],
  ['groups', null], ['groups.0', null], ['groups.0.label', undefined], ['groups.0.id', ''],
  ['elements', {}], ['elements', []], ['elements.0', null], ['elements.0', []],
  ['elements.0.id', ' '], ['elements.0.groupId', 0], ['elements.0.groupId', ''],
  ['elements.0.groupId', 'missing'], ['elements.0.role', 'hero'],
  ['elements.0.opacity', -0.1], ['elements.0.opacity', 1.1], ['elements.0.opacity', NaN], ['elements.0.opacity', null],
  ['elements.0.x', '10'], ['elements.0.y', Infinity], ['elements.0.width', 0], ['elements.0.height', -1],
  ['elements.0.text', 12], ['elements.0.text', 'a'.repeat(10001)],
  ['elements.0.fontFamily', undefined], ['elements.0.fontFamily', ''], ['elements.0.fontFamily', 'Inter, serif'],
  ['elements.0.fontSize', 0], ['elements.0.fontWeight', 0], ['elements.0.fontWeight', 1001],
  ['elements.0.fontWeight', '700'], ['elements.0.lineHeight', 0.9], ['elements.0.color', 'garbage'],
  ['elements.0.align', 'justify'], ['elements.0.align', null],
  ['elements.2.assetId', undefined], ['elements.2.assetId', ''], ['elements.2.fit', 'stretch'],
  ['elements.2.focalPoint', undefined], ['elements.2.focalPoint', null], ['elements.2.focalPoint', []],
  ['elements.2.focalPoint.x', -0.01], ['elements.2.focalPoint.y', 1.01], ['elements.2.focalPoint.x', NaN],
  ['elements.5.radius', -1], ['elements.5.radius', Infinity], ['elements.5.color', null],
];
for (const [path, value] of cases) test(`reject malformed ${path}: ${String(value).slice(0, 22)}`, () => {
  const input = structuredClone(FIXTURES[0]);
  setPath(input, path, value);
  errorAt(() => validateDesign(input), '$.' + path.replace(/\.(\d+)/g, '[$1]'));
});
for (const [path, value] of [
  ['schemaVersion', 'adobe.v1'], ['extra', true], ['groups.0.parentId', 'nested'],
  ['elements.0.type', 'path'], ['elements.0.rotation', 45], ['elements.2.focalPoint.z', 0],
] as [string, unknown][]) test(`explain unsupported ${path}`, () => {
  const input = structuredClone(FIXTURES[0]); setPath(input, path, value);
  errorAt(() => validateDesign(input), '$.' + path.replace(/\.(\d+)/g, '[$1]'), 'unsupported');
});
test('malformed root values produce actionable errors', () => {
  for (const input of [null, undefined, 4, 'design', [], true]) errorAt(() => validateDesign(input), '$');
});
test('duplicate element/group IDs are rejected at the second occurrence', () => {
  const input = structuredClone(FIXTURES[0]); input.elements[1].id = input.elements[0].id;
  errorAt(() => validateDesign(input), '$.elements[1].id');
  const groups = structuredClone(FIXTURES[0]); groups.groups.push({ ...groups.groups[0] });
  errorAt(() => validateDesign(groups), '$.groups[2].id');
});
test('all fixtures, optional defaults, valid boundaries and non-fixture metadata remain legal and immutable', () => {
  for (const fixture of FIXTURES) assert.doesNotThrow(() => validateDesign(fixture));
  const input: any = structuredClone(FIXTURES[0]);
  input.provenance = 'authored'; input.description = ''; input.width = 1; input.height = 8000;
  input.background = '#abcd'; input.elements[0].text = ''; input.elements[0].opacity = 0;
  input.elements[0].fontFamily = 'Archive Serif'; input.elements[0].fontWeight = 1;
  input.elements[0].align = undefined; input.elements[0].x = -5;
  input.elements[1].opacity = 1; input.elements[1].fontWeight = 1000;
  input.elements[1].text = 'a'.repeat(10000); input.elements[1].color = '#ABCDEF00';
  input.elements[2].focalPoint = { x: 0, y: 1 }; input.elements[5].radius = 0;
  input.groups.push({ id: 'unused', label: '' });
  const before = structuredClone(input); validateDesign(input); assert.deepEqual(input, before);
});
test('element and group count ceilings are enforced without rejecting their boundaries', () => {
  const input = structuredClone(FIXTURES[0]);
  input.elements = Array.from({ length: 100 }, (_, i) => ({ ...input.elements[0], id: `e${i}` }));
  input.groups = Array.from({ length: 100 }, (_, i) => ({ id: `g${i}`, label: '' }));
  assert.doesNotThrow(() => validateDesign(input));
  input.elements.push({ ...input.elements[0], id: 'extra' }); errorAt(() => validateDesign(input), '$.elements');
  input.elements.pop(); input.groups.push({ id: 'extra', label: '' }); errorAt(() => validateDesign(input), '$.groups');
});
test('reflow rejects malformed targets before measuring', () => {
  for (const [target, path] of [[null, '$target'], [{ id: '', label: 'X', width: 100, height: 100 }, '$target.id'], [{ id: 'x', label: 'X', width: '100', height: 100 }, '$target.width']] as const) {
    errorAt(() => reflow(FIXTURES[0], target as any, () => { throw new Error('must not measure'); }), path);
  }
});

test('nested objects, wrong-type optionals and unimplemented ellipse radius are diagnosed', () => {
  const cases: [string, unknown, string][] = [
    ['groups.0', [], 'structure'], ['groups.0.label', 0, 'structure'],
    ['elements.0.fontFamily', null, 'structure'], ['elements.0.groupId', null, 'structure'],
    ['elements.2.focalPoint.x', undefined, 'structure'], ['elements.2.focalPoint.y', '0.5', 'structure'],
    ['elements.2.focalPoint', { x: 0.5, y: 0.5, metadata: null }, 'unsupported'],
  ];
  for (const [path, value, category] of cases) {
    const input = structuredClone(FIXTURES[0]); setPath(input, path, value);
    const expected = path === 'elements.2.focalPoint' ? path + '.metadata' : path;
    errorAt(() => validateDesign(input), '$.' + expected.replace(/\.(\d+)/g, '[$1]'), category);
  }
  const ellipse: any = structuredClone(FIXTURES.find(f => f.id === 'layered-art'));
  ellipse.elements[0].radius = 0;
  errorAt(() => validateDesign(ellipse), '$.elements[0].radius', 'unsupported');
});
test('finite fields may not overflow geometry endpoints', () => {
  const input = structuredClone(FIXTURES[0]);
  input.elements[0].x = Number.MAX_VALUE; input.elements[0].width = Number.MAX_VALUE;
  errorAt(() => validateDesign(input), '$.elements[0].width');
});
test('all documented color forms and optional omissions validate without rewriting', () => {
  for (const color of ['#123', '#1234', '#AAbbCC', '#AAbbCC00']) {
    const input = structuredClone(FIXTURES[0]); input.background = color;
    input.elements.forEach(e => { delete e.opacity; delete e.groupId; if (e.type === 'text') e.color = color; if (e.type === 'rect') delete e.radius; });
    input.groups = [];
    const before = structuredClone(input); validateDesign(input); assert.deepEqual(input, before);
  }
});
