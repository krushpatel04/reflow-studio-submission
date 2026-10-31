import test from 'node:test';
import assert from 'node:assert/strict';
import { convertLica, cssHex, LICA_PROVENANCE, type LicaConversion } from '../src/lica';
import { validateDesign, type TextElement } from '../src/model';

const meta = { layoutId: 'L1', templateId: 'T1', category: 'Flyers' };
const text = (extra: object = {}) => ({ type: 'TEXT', left: 10, top: 20, width: 200, height: 40, text: 'Hello', fontFamily: 'Montserrat', fontWeight: 500, fontSize: 24, lineHeight: '120%', color: '#112233', textAlign: 'center', ...extra });
const shape = (extra: object = {}) => ({ type: 'GROUP', left: 0, top: 0, width: 400, height: 300, backgroundColor: '#ffeecc', ...extra });
const image = (extra: object = {}) => ({ type: 'IMAGE', left: 50, top: 60, width: 100, height: 80, src: 'https://example.test/assets/photo-1.png', ...extra });
const layout = (...components: object[]) => ({ width: '400px', height: '300px', background: '#ffffff', components });
const textOf = (c: LicaConversion) => c.design.elements.find(e => e.type === 'text') as TextElement;

// Positive controls

test('text, shape and image convert as supported with exact values and a valid design', () => {
  const c = convertLica(layout(shape(), image(), text()), meta);
  assert.equal(c.status, 'supported');
  assert.deepEqual(c.losses, []);
  assert.deepEqual(c.blockers, []);
  assert.deepEqual(c.design.elements, [
    { id: 'group-0', type: 'rect', role: 'background', x: 0, y: 0, width: 400, height: 300, color: '#ffeecc' },
    { id: 'image-1', type: 'image', role: 'content', x: 50, y: 60, width: 100, height: 80, assetId: 'photo-1.png', fit: 'cover', focalPoint: { x: 0.5, y: 0.5 } },
    { id: 'text-2', type: 'text', role: 'content', x: 10, y: 20, width: 200, height: 40, text: 'Hello', fontFamily: 'Montserrat', fontWeight: 500, fontSize: 24, lineHeight: 1.2, color: '#112233', align: 'center' },
  ]);
  assert.deepEqual(c.fonts, [{ family: 'Montserrat', weight: 500 }]);
  assert.deepEqual(c.images, [{ assetId: 'photo-1.png', src: 'https://example.test/assets/photo-1.png' }]);
  assert.doesNotThrow(() => validateDesign(c.design));
});

test('design metadata records the layout, template and LICA provenance', () => {
  const c = convertLica(layout(text()), meta);
  assert.equal(c.design.id, 'lica-L1');
  assert.equal(c.design.name, 'LICA Flyers L1');
  assert.equal(c.design.description, 'Converted from LICA layout L1 (template T1).');
  assert.equal(c.design.provenance, LICA_PROVENANCE);
  assert.deepEqual([c.design.width, c.design.height, c.design.background, c.design.groups], [400, 300, '#ffffff', []]);
});

test('css colors become lowercase hex, with alpha when translucent', () => {
  assert.equal(cssHex('#AABBCC'), '#aabbcc');
  assert.equal(cssHex('rgb(10, 20, 30)'), '#0a141e');
  assert.equal(cssHex('rgba(0,0,0,0.5)'), '#00000080');
  assert.equal(cssHex('linear-gradient(red, blue)'), undefined);
  assert.equal(cssHex(undefined), undefined);
});

test('a canvas-covering image is a background; opacity is kept', () => {
  const c = convertLica(layout(image({ left: 0, top: 0, width: 400, height: 300 }), text({ opacity: 0.4 })), meta);
  assert.equal(c.design.elements[0].role, 'background');
  assert.equal(textOf(c).opacity, 0.4);
  assert.equal(c.status, 'supported');
});

test('line heights in percent, px and bare numbers convert without loss', () => {
  assert.equal(textOf(convertLica(layout(text({ lineHeight: '150%' })), meta)).lineHeight, 1.5);
  assert.equal(textOf(convertLica(layout(text({ lineHeight: '36px' })), meta)).lineHeight, 1.5);
  assert.equal(textOf(convertLica(layout(text({ lineHeight: 1.4 })), meta)).lineHeight, 1.4);
  assert.equal(textOf(convertLica(layout(text({ lineHeight: undefined })), meta)).lineHeight, 1.2);
});

test('identity transforms and rectangular clips are not blockers', () => {
  for (const transform of ['none', 'rotate(0deg) scale(1)', 'matrix(1, 0, 0, 1, 0, 0)', 'translate(0px, 0px)']) {
    assert.equal(convertLica(layout(text({ transform })), meta).status, 'supported', transform);
  }
  const clip = 'path("M0,0 L100,0 L100,80 L0,80 Z")';
  assert.equal(convertLica(layout(image({ clipPath: clip })), meta).status, 'supported');
});

// Adapted: each loss rule records its loss and the converted value

const adapted: [string, object, string, (c: LicaConversion) => void][] = [
  ['uppercase', layout(text({ textTransform: 'uppercase' })), 'uppercase styling applied to the text value', c => assert.equal(textOf(c).text, 'HELLO')],
  ['other text transform', layout(text({ textTransform: 'capitalize' })), 'textTransform capitalize dropped', c => assert.equal(textOf(c).text, 'Hello')],
  ['letter spacing', layout(text({ letterSpacing: '0.1em' })), 'letter spacing dropped', () => {}],
  ['italic', layout(text({ fontStyle: 'italic' })), 'italic dropped', () => {}],
  ['justify', layout(text({ textAlign: 'justify' })), 'justified text set to left', c => assert.equal(textOf(c).align, 'left')],
  ['line height below 1', layout(text({ lineHeight: '80%' })), 'line height below 1 raised to 1 (component 0)', c => assert.equal(textOf(c).lineHeight, 1)],
  ['unreadable line height', layout(text({ lineHeight: 'weird' })), 'line height weird not understood, set to 1.2 (component 0)', c => assert.equal(textOf(c).lineHeight, 1.2)],
  ['missing text color', layout(text({ color: undefined })), 'missing text color set to black', c => assert.equal(textOf(c).color, '#000000')],
  ['shape without solid fill', layout(shape({ backgroundColor: undefined, background: 'linear-gradient(red, blue)' }), text()), 'shape with no solid fill omitted (component 0)', c => assert.equal(c.design.elements.length, 1)],
  ['gradient canvas', { ...layout(text()), background: 'linear-gradient(red, blue)' }, 'canvas background linear-gradient(red, blue) replaced with white', c => assert.equal(c.design.background, '#ffffff')],
  ['zero-size component', layout(image({ width: 0 }), text()), 'zero-size image omitted (component 0)', c => assert.equal(c.design.elements.length, 1)],
];
for (const [name, input, loss, check] of adapted) {
  test(`adapted: ${name}`, () => {
    const c = convertLica(input, meta);
    assert.equal(c.status, 'adapted', JSON.stringify(c.blockers));
    assert.ok(c.losses.includes(loss), JSON.stringify(c.losses));
    assert.deepEqual(c.blockers, []);
    check(c);
    assert.doesNotThrow(() => validateDesign(c.design));
  });
}

// Unsupported: each blocker is named

const blocked: [string, object, string][] = [
  ['rotation', layout(text({ transform: 'rotate(15deg)' })), 'rotation 15deg'],
  ['mirroring', layout(image({ transform: 'scale(-1, 1)' })), 'mirrored'],
  ['translation', layout(shape({ transform: 'translate(10px, 0px)' })), 'translate'],
  ['non-identity matrix', layout(shape({ transform: 'matrix(0, 1, -1, 0, 0, 0)' })), 'matrix'],
  ['curved clip on a shape', layout(shape({ clipPath: 'path("M0,0 C10,10 20,20 30,30 Z")' })), 'non-rectangular shape'],
  ['curved image mask', layout(image({ clipPath: 'path("M0,0 C1,1 2,2 3,3 Z")' })), 'non-rectangular image mask'],
  ['curved text', layout(text({ curvature: 30 })), 'curved text'],
  ['rich text', layout(text({ text: '<b>Hi</b>' })), 'rich-text markup'],
  ['unknown component', layout({ type: 'VIDEO', left: 0, top: 0, width: 10, height: 10 }), 'component type VIDEO'],
  ['unsupported text color', layout(text({ color: 'hsl(0, 0%, 0%)' })), 'unsupported text color'],
  ['unusable font name', layout(text({ fontFamily: 'Figma Hand!' })), 'unsupported font family'],
  ['too many elements', layout(...Array.from({ length: 101 }, (_, i) => shape({ left: i, width: 10, height: 10 }))), '101 elements exceeds the 100-element limit'],
  ['nothing representable', layout(), 'no representable elements'],
  ['fails schema validation', layout(text({ fontSize: 0 })), 'converted design fails validation'],
];
for (const [name, input, blocker] of blocked) {
  test(`unsupported: ${name}`, () => {
    const c = convertLica(input, meta);
    assert.equal(c.status, 'unsupported');
    assert.ok(c.blockers.some(b => b.includes(blocker)), JSON.stringify(c.blockers));
  });
}

// Accounting: nothing disappears silently

test('every component becomes an element or is named in a loss or blocker', () => {
  const input = layout(shape(), image({ width: 0 }), { type: 'VIDEO', left: 0, top: 0, width: 5, height: 5 }, text({ color: 'hsl(1,1%,1%)' }), shape({ backgroundColor: undefined }), text(), image());
  const c = convertLica(input, meta);
  const notes = [...c.losses, ...c.blockers];
  input.components.forEach((_, i) => {
    const kept = c.design.elements.some(e => e.id.endsWith(`-${i}`));
    assert.ok(kept || notes.some(n => n.includes(`(component ${i})`)), `component ${i} vanished: ${JSON.stringify(notes)}`);
  });
});

// Invalid input

test('malformed layouts throw clear errors instead of producing a design', () => {
  assert.throws(() => convertLica(null, meta), /must be an object/);
  assert.throws(() => convertLica({ width: '0px', height: 10, components: [] }, meta), /positive width and height/);
  assert.throws(() => convertLica({ width: 10, height: 10, components: 'x' }, meta), /components array/);
});
