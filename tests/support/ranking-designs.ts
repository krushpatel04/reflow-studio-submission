import type { Design, Element, TextElement } from '../../src/model';

// Authored before ranking implementation, then promoted to development regressions
// after visual inspection exposed a tall-gallery failure. NOT an independent
// held-out corpus. Never import these into production ranking.
const text = (id: string, copy: string, x: number, y: number, width: number, height: number, fontSize: number, extra: Partial<TextElement> = {}): TextElement =>
  ({ id, type: 'text', role: 'content', text: copy, x, y, width, height, fontSize, fontFamily: 'Inter', fontWeight: 500, lineHeight: 1.14, color: '#172b25', ...extra });
const design = (id: string, width: number, height: number, elements: Element[]): Design => ({
  schemaVersion: 'reflow.design.v0', id, name: id, description: 'Frozen ranking validation family', provenance: 'synthetic', width, height, background: '#f3eee4', groups: [], elements,
});
export const RANKING_VALIDATION: Design[] = [
  design('gallery-diptych', 1400, 700, [
    text('title', 'Two ways of seeing', 60, 35, 1280, 80, 56, { fontWeight: 700 }),
    { id: 'left', type: 'image', role: 'content', assetId: 'orbit', x: 60, y: 165, width: 600, height: 350, fit: 'cover', focalPoint: { x: .5, y: .5 } },
    { id: 'right', type: 'image', role: 'content', assetId: 'landscape', x: 740, y: 165, width: 600, height: 350, fit: 'cover', focalPoint: { x: .9, y: .5 } },
    text('caption', 'A study in light and distance.', 60, 560, 1280, 90, 28),
  ]),
  design('centered-invitation', 800, 1200, [
    text('intro', 'YOU ARE INVITED', 80, 100, 640, 65, 30, { align: 'center' }),
    { id: 'seal', type: 'ellipse', role: 'decoration', x: 335, y: 260, width: 130, height: 130, color: '#c58652' },
    text('title', 'An evening\ntogether', 80, 465, 640, 200, 65, { align: 'center', fontFamily: 'Source Serif 4', fontWeight: 600 }),
    text('details', 'OCTOBER 30\nTHE OLD OBSERVATORY', 80, 820, 640, 140, 30, { align: 'center' }),
    text('footer', 'Doors open at seven', 80, 1060, 640, 60, 26, { align: 'center' }),
  ]),
  design('museum-sidebar', 1200, 1000, [
    { id: 'art', type: 'image', role: 'content', assetId: 'orbit', x: 65, y: 65, width: 590, height: 870, fit: 'contain', focalPoint: { x: .5, y: .5 } },
    text('title', 'Objects\nand origins', 720, 75, 420, 240, 60, { fontWeight: 700 }),
    text('body', 'How ordinary materials become the things we keep. A collection of small discoveries.', 720, 425, 420, 340, 32),
    text('footer', 'GALLERY THREE\nOPEN UNTIL SIX', 720, 830, 420, 100, 27),
  ]),
];
