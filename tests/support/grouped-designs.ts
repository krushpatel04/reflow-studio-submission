import type { Design, Element, Role } from '../../src/model';

export function badge(backingRole: Role = 'decoration', labelRole: Role = 'content'): Design {
  return {
    schemaVersion: 'reflow.design.v0', id: `badge-${backingRole}-${labelRole}`, name: 'Grouped badge',
    description: 'White label on an explicitly grouped dark plate', provenance: 'synthetic',
    width: 1000, height: 1000, background: '#ffffff', groups: [{ id: 'button', label: 'Button' }],
    elements: [
      { id: 'plate', type: 'rect', role: backingRole, groupId: 'button', x: 100, y: 100, width: 500, height: 200, color: '#16362a' },
      { id: 'label', type: 'text', role: labelRole, groupId: 'button', x: 140, y: 160, width: 420, height: 70, text: 'CALL TODAY', fontFamily: 'Inter', fontSize: 40, fontWeight: 700, lineHeight: 1.1, color: '#ffffff' },
    ],
  };
}
export function imagePrice(): Design {
  const design = badge();
  const image: Element = { id: 'image', type: 'image', role: 'content', groupId: 'button', x: 100, y: 100, width: 500, height: 400, assetId: 'product', fit: 'contain', focalPoint: { x: 0.5, y: 0.5 } };
  design.elements[0].y = 500; design.elements[0].height = 100;
  design.elements[1].y = 520; design.elements[1].height = 60;
  if (design.elements[1].type === 'text') design.elements[1].text = '$24';
  design.elements.unshift(image);
  return { ...design, id: 'image-price', name: 'Image, price and backing' };
}
