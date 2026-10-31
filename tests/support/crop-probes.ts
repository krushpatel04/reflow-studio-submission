import type { Design, ImageElement } from '../../src/model';

/** Crop probes shared by the native test, the native parity report and the browser check.
 * Expected colours are hand-derived from the bundled asset SVG source (src/assets.ts), not from
 * src/crop.ts, so they are an independent oracle. Samples sit ≥ 3px from any edge. */
export type CropSample = { label: string; x: number; y: number; color: string };
export type CropProbe = { design: Design; samples: CropSample[] };

const RED = '#ff0000';
const probe = (id: string, image: Omit<ImageElement, 'id' | 'type' | 'role'>): Design => ({
  schemaVersion: 'reflow.design.v0', id, name: id, description: 'Crop probe', provenance: 'synthetic',
  width: 400, height: 400, background: RED, groups: [],
  elements: [{ id: 'image', type: 'image', role: 'content', ...image }],
});

export const cropProbes: CropProbe[] = [
  {
    // landscape 1200×800 in 100×300: scale 0.375, drawn 450×300 at x = 100 + (100 − 450) × 0.83 = −190.5.
    design: probe('cover-tall-edge-subject', { assetId: 'landscape', fit: 'cover', focalPoint: { x: 0.83, y: 0.55 }, x: 100, y: 50, width: 100, height: 300 }),
    samples: [
      { label: 'figure head (950, 390)', x: 166, y: 196, color: '#1a2b30' },
      { label: 'figure body (950, 580)', x: 166, y: 268, color: '#1a2b30' },
      { label: 'sun (980, 210)', x: 177, y: 129, color: '#f7b27f' },
      { label: 'sky (800, 100)', x: 110, y: 88, color: '#d4dcf1' },
      { label: 'outside left', x: 96, y: 200, color: RED },
      { label: 'outside right', x: 204, y: 200, color: RED },
      { label: 'outside above', x: 150, y: 46, color: RED },
      { label: 'outside below', x: 150, y: 354, color: RED },
    ],
  },
  {
    // product 600×800 contained in 380×160: scale 0.2, drawn 120×160 at x = 20 + (380 − 120) × 0.25 = 85.
    design: probe('contain-wide-product', { assetId: 'product', fit: 'contain', focalPoint: { x: 0.25, y: 0.5 }, x: 20, y: 200, width: 380, height: 160 }),
    samples: [
      { label: 'label dot (300, 418)', x: 145, y: 284, color: '#cb6e49' },
      { label: 'product backdrop (40, 40)', x: 93, y: 208, color: '#ddd5c9' },
      { label: 'left letterbox', x: 50, y: 280, color: RED },
      { label: 'right letterbox', x: 300, y: 280, color: RED },
      { label: 'outside above', x: 150, y: 196, color: RED },
    ],
  },
  {
    // landscape in 400×100: scale 1/3, drawn 400×266.67 at y = 100 + (100 − 266.67) × 0.27 = 55; the frame clips it.
    design: probe('cover-wide-intermediate-y', { assetId: 'landscape', fit: 'cover', focalPoint: { x: 0.5, y: 0.27 }, x: 0, y: 100, width: 400, height: 100 }),
    samples: [
      { label: 'sun (980, 210)', x: 327, y: 125, color: '#f7b27f' },
      { label: 'sky (200, 150)', x: 67, y: 105, color: '#d4dcf1' },
      { label: 'mountain (270, 400)', x: 90, y: 188, color: '#667ca4' },
      { label: 'clipped above', x: 200, y: 96, color: RED },
      { label: 'clipped below', x: 200, y: 204, color: RED },
    ],
  },
];
