import type { Design, TextElement } from '../../src/model';

/** Authored development control, distinct count/aspect/fonts from product-pairs. */
export function productShelf(): Design {
  const text = (id: string, copy: string, x: number, y: number, width: number, height: number, fontSize: number): TextElement => ({
    id, text: copy, type: 'text', role: 'content', x, y, width, height, fontSize,
    fontFamily: 'Inter', fontWeight: 600, color: '#16362a', lineHeight: 1.2,
  });
  return {
    schemaVersion: 'reflow.design.v0', id: 'four-product-shelf', name: 'Four everyday tools',
    description: 'Four rigid photo/label/price groups with mixed-role price backings', provenance: 'synthetic development',
    width: 1800, height: 1000, background: '#f3eee4',
    groups: Array.from({ length: 4 }, (_, i) => ({ id: `item-${i}`, label: `Item ${i}` })),
    elements: [
      text('title', 'Tools for a slower morning', 80, 60, 1640, 110, 65),
      ...['Stone cup', 'Tea bowl', 'Coffee pot', 'Serving tray'].flatMap((name, i) => {
        const x = 80 + i * 420, groupId = `item-${i}`;
        return [
          { id: `photo-${i}`, type: 'image' as const, role: 'content' as const, groupId, x, y: 250, width: 360, height: 330,
            assetId: 'product', fit: 'contain' as const, focalPoint: { x: 0.5, y: 0.5 } },
          { ...text(`name-${i}`, name, x, 610, 360, 65, 36), groupId },
          { id: `plate-${i}`, type: 'rect' as const, role: 'decoration' as const, groupId, x, y: 710, width: 360, height: 90, color: '#16362a', radius: 12 },
          { ...text(`cost-${i}`, `$${20 + i * 8}`, x + 20, 725, 320, 60, 32), groupId, color: '#ffffff' },
        ];
      }),
      text('footer', 'AVAILABLE IN THE WORKSHOP', 80, 875, 1640, 65, 30),
    ],
  };
}

/** Valid-source dense-copy control: the original title fits above the product band. */
export function longHeadlineProductShelf(): Design {
  const source = productShelf();
  source.id = 'four-product-shelf-long-headline-valid-source';
  const title = source.elements.find(e => e.id === 'title');
  if (title?.type !== 'text') throw new Error('Missing title in authored control');
  title.text = 'Tools for a slower morning\nMade carefully for everyday rituals';
  title.height = 180;
  return source;
}
