import { uniform } from '../../src/engine';
import { FIXTURES } from '../../src/fixtures';
import type { Design, Element } from '../../src/model';

/** Author-labelled rendered defect/control pairs for #6 and the #7/#19/#20/#22 handoff.
 * Labels are the implementer's judgement, not independent review. `elements` are the affected
 * content IDs. `method` names the rendered evidence: 'pixels' (visible/legible core pixels),
 * 'subject' (pixels of the landscape figure, colour #1a2b30) or 'none' (evaluator only). */
export type DefectCategory = 'occlusion' | 'contrast' | 'contrast-over-image' | 'clipping' | 'crop' | 'glyph' | 'paint-order' | 'opacity' |
  'legal-overlay' | 'transparency' | 'faint-source' | 'legal-crop' | 'engine-output';
export type DefectCase = {
  id: string; category: DefectCategory; label: 'defect' | 'legal'; attractive?: boolean;
  elements: string[]; method: 'pixels' | 'subject' | 'none'; note: string; source: Design; output: Design;
};

const design = (id: string, elements: Element[], extra: Partial<Design> = {}): Design => ({
  schemaVersion: 'reflow.design.v0', id, name: id, description: 'Defect-control case', provenance: 'synthetic',
  width: 1000, height: 1000, background: '#ffffff', groups: [], elements, ...extra,
});
const text = (id: string, x: number, y: number, width: number, height: number, value: string, fontSize: number, color = '#111111', extra: Partial<Element> = {}): Element =>
  ({ id, type: 'text', role: 'content', x, y, width, height, text: value, fontFamily: 'Inter', fontSize, fontWeight: 700, lineHeight: 1.1, color, ...extra } as Element);
const rect = (id: string, x: number, y: number, width: number, height: number, color: string, extra: Partial<Element> = {}): Element =>
  ({ id, type: 'rect', role: 'decoration', x, y, width, height, color, ...extra } as Element);
const photo = (id: string, x: number, y: number, width: number, height: number, extra: Partial<Element> = {}): Element =>
  ({ id, type: 'image', role: 'content', assetId: 'landscape', fit: 'cover', focalPoint: { x: 0.5, y: 0.5 }, x, y, width, height, ...extra } as Element);
const headline = () => text('headline', 100, 100, 800, 120, 'A clear headline here', 64);
const body = () => text('body', 100, 300, 800, 60, 'Quiet supporting copy', 36, '#333333', { fontWeight: 500 });
const plate = (extra: Partial<Element> = {}) => rect('plate', 100, 100, 500, 200, '#16362a', extra);
const label = (extra: Partial<Element> = {}) => text('label', 140, 160, 420, 70, 'CALL TODAY', 40, '#ffffff', extra);
const edit = (d: Design, id: string, patch: Partial<Element>): Design => {
  const out = structuredClone(d);
  Object.assign(out.elements.find(e => e.id === id)!, patch);
  return out;
};
const resize = (d: Design, width: number, height: number) => uniform(d, { id: 'case', label: 'Case', width, height });
const fixture = (id: string) => FIXTURES.find(f => f.id === id)!;

const covered = design('opaque-decoration-over-headline', [headline(), body(), rect('sticker', 700, 700, 200, 200, '#e34850')]);
const camouflage = design('camouflaged-cover', [headline(), body(), rect('panel', 800, 800, 100, 100, '#ffffff')]);
const veil = design('veil-over-text', [headline(), rect('veil', 700, 700, 200, 200, '#16362a', { opacity: 0.8 })]);
const underImage = design('image-over-caption', [text('caption', 100, 100, 800, 90, 'Meet at the north gate', 48), photo('photo', 100, 400, 800, 500)]);
const onPlate = design('label-on-plate', [plate(), label()]);
const translucent = design('label-on-translucent-plate', [plate({ color: '#000000', opacity: 0.6 }), label()]);
// The photo spans 100..900 × 100..633 at scale 2/3. Sky sits above design y ≈ 220; the dark
// foreground (#21394c, the caption's own colour) covers the lower-left corner.
const onSky = design('caption-on-photo', [photo('photo', 100, 100, 800, 533.333), text('caption', 120, 110, 300, 60, 'WALKING CLUB', 36, '#21394c')]);
const clipped = design('headline-box', [headline(), body()]);
const subject = design('edge-subject-photo', [photo('photo', 100, 100, 600, 400, { focalPoint: { x: 0.83, y: 0.55 } })]);
const glyph = design('uncovered-glyph', [text('greeting', 100, 100, 800, 120, '你好 — hello', 64)]);
const tint = design('tint-over-text', [headline(), rect('tint', 100, 100, 800, 120, '#00000033')]);
const slight = design('slight-overlap', [headline(), rect('sticker', 60, 90, 80, 140, '#e34850')]);
const faint = design('faint-label', [plate({ color: '#000000', opacity: 0.25 }), label({ color: '#ffffffee' })]);

export const DEFECT_CASES: DefectCase[] = [
  { id: 'opaque-decoration-over-headline', category: 'occlusion', label: 'defect', elements: ['headline'], method: 'pixels',
    note: 'A decoration-role sticker moves on top of the headline.', source: covered, output: edit(covered, 'sticker', { x: 90, y: 90, width: 820, height: 140 }) },
  { id: 'camouflaged-cover', category: 'occlusion', label: 'defect', attractive: true, elements: ['headline'], method: 'pixels',
    note: 'A background-coloured panel hides the headline; the result looks like a clean, sparse layout.', source: camouflage, output: edit(camouflage, 'panel', { x: 90, y: 90, width: 820, height: 140 }) },
  { id: 'veil-over-text', category: 'occlusion', label: 'defect', elements: ['headline'], method: 'pixels',
    note: 'An 80% opaque dark veil moves over dark text.', source: veil, output: edit(veil, 'veil', { x: 90, y: 90, width: 820, height: 140 }) },
  { id: 'image-over-caption', category: 'occlusion', label: 'defect', elements: ['caption'], method: 'pixels',
    note: 'A later-painted photograph moves over earlier text.', source: underImage, output: edit(underImage, 'photo', { y: 60 }) },
  { id: 'paint-order-reversed', category: 'paint-order', label: 'defect', elements: ['label'], method: 'pixels',
    note: 'The label is painted before its opaque plate.', source: onPlate, output: { ...structuredClone(onPlate), elements: structuredClone(onPlate.elements).reverse() } },
  { id: 'zero-opacity-label', category: 'opacity', label: 'defect', attractive: true, elements: ['label'], method: 'pixels',
    note: 'The label becomes fully transparent; the plate looks like a clean empty button.', source: onPlate, output: edit(onPlate, 'label', { opacity: 0 }) },
  { id: 'label-off-plate', category: 'contrast', label: 'defect', attractive: true, elements: ['label'], method: 'pixels',
    note: 'White text leaves its dark plate and lands on white canvas.', source: onPlate, output: edit(onPlate, 'label', { y: 600 }) },
  { id: 'label-half-off-translucent-plate', category: 'contrast', label: 'defect', elements: ['label'], method: 'pixels',
    note: 'White text half leaves a 60% black plate.', source: translucent, output: edit(translucent, 'label', { x: 520 }) },
  { id: 'caption-onto-matching-photo-region', category: 'contrast-over-image', label: 'defect', attractive: true, elements: ['caption'], method: 'pixels',
    note: 'Dark caption moves within the photo from pale sky onto the dark foreground of the same colour. The overlap share is unchanged and the backing is an image, so the geometric evaluator has no contrast verdict.',
    source: onSky, output: edit(onSky, 'caption', { x: 110, y: 560 }) },
  { id: 'headline-clipped-by-box', category: 'clipping', label: 'defect', elements: ['headline'], method: 'pixels',
    note: 'The headline box shrinks below its line height and clips the glyphs.', source: clipped, output: edit(clipped, 'headline', { height: 40 }) },
  { id: 'subject-cropped-out', category: 'crop', label: 'defect', elements: ['photo'], method: 'subject',
    note: 'A 1:8 frame keeps the focal point but cuts the figure.', source: subject, output: edit(subject, 'photo', { width: 50 }) },
  { id: 'uncovered-glyph', category: 'glyph', label: 'defect', elements: ['greeting'], method: 'none',
    note: 'The CJK characters are outside the bundled Inter coverage and each renderer substitutes its own fallback. Present in the source, so not a reflow change.', source: glyph, output: resize(glyph, 1080, 1080) },

  { id: 'intentional-overlap-story', category: 'legal-overlay', label: 'legal', elements: ['headline', 'description'], method: 'pixels',
    note: 'Headline on its panel over a photograph, uniformly scaled.', source: fixture('intentional-overlap'), output: resize(fixture('intentional-overlap'), 1080, 1920) },
  { id: 'layered-art-landscape', category: 'transparency', label: 'legal', elements: ['headline', 'eyebrow', 'footer'], method: 'pixels',
    note: 'Translucent decorative orbs behind text.', source: fixture('layered-art'), output: resize(fixture('layered-art'), 1920, 1080) },
  { id: 'label-on-plate-extreme', category: 'legal-overlay', label: 'legal', elements: ['label'], method: 'pixels',
    note: 'Text on its plate at an extreme ratio.', source: onPlate, output: resize(onPlate, 1000, 3000) },
  { id: 'translucent-plate-nearby', category: 'transparency', label: 'legal', elements: ['label'], method: 'pixels',
    note: 'Text on a 60% plate at a nearby size.', source: translucent, output: resize(translucent, 999, 1001) },
  { id: 'tint-over-text-kept', category: 'transparency', label: 'legal', elements: ['headline'], method: 'pixels',
    note: 'An intentional 20% tint over text is preserved.', source: tint, output: resize(tint, 1080, 1920) },
  { id: 'slight-overlap-kept', category: 'legal-overlay', label: 'legal', elements: ['headline'], method: 'pixels',
    note: 'A slight source overlap is preserved under scaling.', source: slight, output: resize(slight, 1600, 900) },
  { id: 'faint-source-kept', category: 'faint-source', label: 'legal', elements: ['label'], method: 'pixels',
    note: 'Faint by design in the source (about 1.7:1); preserving it is not a reflow defect.', source: faint, output: resize(faint, 1920, 1080) },
  { id: 'caption-on-photo-kept', category: 'legal-overlay', label: 'legal', elements: ['caption'], method: 'pixels',
    note: 'Caption over photographic sky, uniformly scaled.', source: onSky, output: resize(onSky, 1080, 1350) },
  { id: 'subject-kept-narrow-crop', category: 'legal-crop', label: 'legal', elements: ['photo'], method: 'subject',
    note: 'A 1:2 frame loses most of the image area but keeps the whole figure. crop-loss measures region, not subject.', source: subject, output: edit(subject, 'photo', { width: 200 }) },
];
