import type { Design } from '../src/model';
import { rasterScale, renderedVerdict, shareFromPixels, subjectArea, subjectVerdict, visibilityVariants, type Pixels, type Share } from '../src/rendered-visibility';
import { assetSize } from '../src/crop';
import { ASSETS } from '../src/assets';
import { measure, renderCanvas } from './native';

/** Native (Skia) rendered-visibility evidence; see src/rendered-visibility.ts for the method. */
export function rasterize(design: Design): Pixels {
  const canvas = renderCanvas(design);
  return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
}
export function nativeShare(design: Design, id: string): Share {
  const v = visibilityVariants(design, id, measure);
  return shareFromPixels({ full: rasterize(v.full), without: rasterize(v.without), black: rasterize(v.black), white: rasterize(v.white) }, v.text, rasterScale(design), v.bounds);
}
export function nativeRenderedVerdict(source: Design, output: Design, id: string) {
  const before = nativeShare(source, id), after = nativeShare(output, id);
  return { source: before, output: after, verdict: renderedVerdict(before, after) };
}
/** Pixels of the bundled landscape figure (#1a2b30) kept in an image frame. */
export function nativeSubjectVerdict(source: Design, output: Design, id: string, color = '#1a2b30') {
  const area = (d: Design) => {
    const e = d.elements.find(e => e.id === id);
    if (e?.type !== 'image') throw new Error(`Expected image: ${id}`);
    return subjectArea(rasterize(d), d, id, assetSize(ASSETS[e.assetId])!, color);
  };
  const before = area(source), after = area(output);
  return { source: before, output: after, verdict: subjectVerdict(before, after) };
}
