import type { Design, Element, ImageElement, ShapeElement, TextElement } from './model';

export { ASSETS } from './assets';
const text = (id: string, value: string, x: number, y: number, width: number, height: number, size: number, color = '#172b25', extra: Partial<TextElement> = {}): TextElement => ({
  id, type: 'text', role: 'content', text: value, x, y, width, height, fontSize: size, color, fontWeight: 500, fontFamily: 'Inter', lineHeight: 1.14, ...extra,
});
const shape = (id: string, x: number, y: number, width: number, height: number, color: string, extra: Partial<ShapeElement> = {}): ShapeElement => ({ id, type: 'rect', role: 'content', x, y, width, height, color, ...extra });
const image = (id: string, assetId: string, x: number, y: number, width: number, height: number, extra: Partial<ImageElement> = {}): ImageElement => ({ id, type: 'image', role: 'content', assetId, x, y, width, height, fit: 'cover', focalPoint: { x: 0.5, y: 0.5 }, ...extra });
const design = (id: string, name: string, description: string, width: number, height: number, background: string, elements: Element[]): Design => ({
  schemaVersion: 'reflow.design.v0', id, name, description, provenance: 'synthetic', width, height, background, elements,
  groups: [...new Set(elements.map(e => e.groupId).filter((s): s is string => !!s))].map(id => ({ id, label: id.replaceAll('-', ' ') })),
});

export const FIXTURES: Design[] = [
  design('after-dark', 'Design after dark', 'An event poster with a headline, hero image, event details, and a grouped ticket button.', 1080, 1350, '#f3f0e5', [
    text('eyebrow', 'THE CAMPUS CREATIVE SERIES', 72, 62, 936, 45, 27),
    text('headline', 'Design\nafter dark.', 72, 138, 936, 276, 112, '#172b25', { fontWeight: 700 }),
    image('hero', 'orbit', 72, 418, 936, 494),
    text('date', 'Friday, October 16 · 7 PM', 72, 970, 936, 52, 38, '#172b25', { groupId: 'event-details', fontWeight: 700 }),
    text('venue', 'The student union · Everyone welcome', 72, 1036, 936, 48, 30, '#172b25', { groupId: 'event-details' }),
    shape('ticket-background', 72, 1130, 936, 132, '#172b25', { groupId: 'ticket', radius: 66 }),
    text('ticket-label', 'SAVE YOUR SEAT  →', 102, 1171, 876, 50, 32, '#ffffff', { groupId: 'ticket', align: 'center', fontWeight: 700 }),
  ]),
  design('long-headline', 'A headline with more to say', 'A long title needs real wrapping without losing words or flattening the hierarchy.', 1200, 900, '#f4ddcf', [
    text('eyebrow', 'IDEAS WORTH BUILDING', 65, 50, 1060, 48, 30),
    text('headline', 'The future belongs to people who make things together.', 65, 142, 1060, 330, 84, '#382922', { fontWeight: 700 }),
    text('body', 'An evening of stories, experiments, and unfinished ideas. Bring something you are curious about.', 65, 545, 615, 160, 35, '#382922'),
    image('hero', 'orbit', 760, 525, 365, 285),
    text('details', 'THURSDAY · 6:30 PM\nTHE DESIGN LAB', 65, 756, 620, 92, 29, '#382922'),
  ]),
  design('dense-program', 'A full evening', 'A dense schedule with several independent content groups.', 1080, 1350, '#182731', [
    text('headline', 'Open studio\nWeek 01', 72, 75, 930, 250, 93, '#f5f0e2', { fontWeight: 700 }),
    ...['18:00  Doors & introductions', '18:30  Make something small', '19:15  Share what surprised you', '20:00  A conversation over coffee'].flatMap((label, i) => [
      text(`session-${i}`, label, 72, 365 + i * 170, 936, 57, 39, '#f5f0e2', { groupId: `session-${i}`, fontWeight: 700 }),
      text(`detail-${i}`, ['Meet the people behind the projects.', 'Choose a prompt. Follow your curiosity.', 'A five-minute story from every table.', 'Stay a little longer. Ask another question.'][i], 72, 433 + i * 170, 936, 60, 30, '#b6c7c5', { groupId: `session-${i}` }),
    ]),
    text('footer', 'FREE ENTRY · MATERIALS PROVIDED', 72, 1177, 936, 74, 31, '#ddad7b', { fontWeight: 700 }),
  ]),
  design('grouped-details', 'Keep the details together', 'Two semantic clusters must retain their internal arrangement.', 1200, 900, '#e6ebdf', [
    text('headline', 'A little room\nfor big ideas.', 68, 65, 690, 239, 82, '#283929', { fontFamily: 'Source Serif 4', fontWeight: 600 }),
    image('hero', 'orbit', 810, 64, 320, 405),
    text('date', 'SAT 24 OCT', 70, 415, 640, 78, 58, '#283929', { groupId: 'when-where', fontWeight: 700 }),
    text('venue', '12:00–16:00\nNorth campus workshop', 70, 515, 640, 112, 36, '#283929', { groupId: 'when-where' }),
    shape('cta-bg', 70, 727, 1060, 110, '#283929', { groupId: 'cta', radius: 16 }),
    text('cta', 'RESERVE YOUR WORKBENCH', 90, 758, 1020, 52, 32, '#ffffff', { groupId: 'cta', align: 'center', fontWeight: 700 }),
  ]),
  design('intentional-overlap', 'Designed to overlap', 'Text intentionally overlays artwork; that overlap should not be scored as a collision.', 1080, 1350, '#f7f3e9', [
    image('hero', 'landscape', 60, 65, 960, 845, { groupId: 'hero-composition' }),
    shape('title-panel', 98, 515, 840, 286, '#f7f3e9', { groupId: 'hero-composition', radius: 14 }),
    text('headline', 'Find your\noutside.', 132, 555, 765, 222, 89, '#22394b', { groupId: 'hero-composition', fontWeight: 700 }),
    text('description', 'A walk, a sketchbook,\nand a different perspective.', 72, 980, 936, 142, 43, '#22394b'),
    text('footer', 'SUNDAY 09:00 · MEET AT THE NORTH GATE', 72, 1190, 936, 73, 30, '#22394b', { fontWeight: 700 }),
  ]),
  design('layered-art', 'Layers of possibility', 'Transparent decorative shapes preserve paint order and intentional overlap.', 1080, 1080, '#ece4f1', [
    shape('orb-1', 430, 110, 565, 565, '#8263bc', { type: 'ellipse', role: 'decoration', opacity: 0.55 }),
    shape('orb-2', 225, 300, 590, 590, '#e7aa6e', { type: 'ellipse', role: 'decoration', opacity: 0.65 }),
    text('eyebrow', 'EXPERIMENT / 006', 68, 64, 900, 52, 30, '#2b1e3d'),
    text('headline', 'Make\nsomething\nunexpected.', 68, 202, 940, 415, 106, '#2b1e3d', { fontWeight: 700 }),
    text('footer', 'OPEN LAB · WEDNESDAY · 18:00', 68, 902, 940, 92, 33, '#2b1e3d', { fontWeight: 700 }),
  ]),
  design('product-pairs', 'Small batch, good things', 'Three product and label groups should remain associated across formats.', 1440, 1080, '#f5eee3', [
    text('headline', 'Made for everyday.', 70, 70, 1300, 155, 99, '#294239', { fontFamily: 'Source Serif 4', fontWeight: 600 }),
    ...['The market bag', 'The weekend bag', 'The everywhere bag'].flatMap((label, i) => [
      image(`product-${i}`, 'product', 70 + i * 450, 280, 400, 490, { groupId: `product-${i}`, fit: 'contain' }),
      text(`label-${i}`, label, 70 + i * 450, 806, 400, 57, 31, '#294239', { groupId: `product-${i}`, fontWeight: 700 }),
      text(`price-${i}`, ['$24', '$32', '$38'][i], 70 + i * 450, 882, 400, 50, 33, '#294239', { groupId: `product-${i}` }),
    ]),
    text('footer', 'THOUGHTFULLY MADE. READY TO GO.', 70, 982, 1300, 54, 27, '#294239'),
  ]),
  design('quiet-brand', 'Room to breathe', 'Sparse, asymmetric editorial composition tests whether reflow overfills deliberate whitespace.', 1080, 1350, '#f0ede5', [
    text('eyebrow', 'FIELD NOTES / VOL. 04', 80, 74, 910, 45, 27, '#413a30'),
    text('headline', 'Less,\nbut better.', 80, 365, 920, 310, 111, '#413a30', { fontFamily: 'Source Serif 4', fontWeight: 600 }),
    shape('rule', 82, 740, 125, 5, '#413a30', { role: 'decoration' }),
    text('body', 'A conversation about attention,\ncraft, and choosing what matters.', 80, 805, 875, 124, 34, '#413a30'),
    text('footer', 'OCTOBER 22 · THE READING ROOM', 80, 1190, 915, 66, 28, '#413a30'),
  ]),
  design('edge-subject', 'Keep the subject in view', 'A synthetic figure near the image edge exercises focal-point cropping. This is not a photograph.', 1350, 1080, '#dce4ed', [
    image('hero', 'landscape', 60, 60, 1230, 710, { focalPoint: { x: 0.83, y: 0.55 } }),
    text('headline', 'Take the long way.', 60, 825, 1230, 130, 84, '#21394c', { fontWeight: 700 }),
    text('footer', 'WALKING CLUB · EVERY SATURDAY', 60, 971, 1230, 65, 31, '#21394c'),
  ]),
  design('type-pairing', 'Two voices, one design', 'Locally bundled serif and sans-serif fonts exercise font-sensitive measurement.', 1080, 1350, '#2a352e', [
    text('eyebrow', 'THE INDEPENDENT READING SERIES', 72, 65, 936, 54, 28, '#e4dec8', { fontWeight: 700 }),
    text('headline', 'Words\nworth\nstaying for.', 72, 196, 936, 550, 132, '#e4dec8', { fontFamily: 'Source Serif 4', fontWeight: 600 }),
    text('body', 'Three writers. An open door.\nAn evening without an agenda.', 72, 836, 936, 153, 41, '#e4dec8'),
    text('footer', 'TUESDAY 20 OCT · 19:00\nTHE OLD BOOKSHOP', 72, 1120, 936, 136, 34, '#e4dec8', { fontWeight: 700 }),
  ]),
];
