import type { Design, Target } from './model';
import type { Measure } from './typography';
import { requiredLayoutFonts, type ExportFontFace } from './svg-export';
import { reflowMany } from './reflow-targets';
import { evaluate } from './evaluate';

export type LayoutInput = { source: Design; targets: Target[]; faces: ExportFontFace[] };
export type LayoutOutput = { batch: ReturnType<typeof reflowMany>; originalMetrics: ReturnType<typeof evaluate> };
const scope = globalThis as unknown as { fonts: FontFaceSet; onmessage: (event: MessageEvent<LayoutInput>) => void; postMessage: (data: unknown) => void };
scope.onmessage = async ({ data }) => {
  try {
    const faces = requiredLayoutFonts(data.source, data.faces).map(f => {
      if (new URL(f.url).origin !== location.origin) throw new Error('Layout font must be bundled locally');
      return new FontFace(f.family, `url("${f.url}")`, { weight: String(f.weight), unicodeRange: f.unicodeRange });
    });
    await Promise.all(faces.map(face => face.load()));
    // Completion order must not change precedence for overlapping Unicode ranges.
    for (const face of faces) scope.fonts.add(face);
    const ctx = new OffscreenCanvas(1, 1).getContext('2d');
    if (!ctx) throw new Error('Worker canvas is unavailable');
    const measure: Measure = (text, e) => {
      ctx.font = `${e.fontWeight} ${e.fontSize}px "${e.fontFamily}"`;
      const m = ctx.measureText(text);
      return { width: m.width, ascent: Math.max(m.actualBoundingBoxAscent, m.fontBoundingBoxAscent), descent: Math.max(m.actualBoundingBoxDescent, m.fontBoundingBoxDescent) };
    };
    scope.postMessage({ stage: 'computing' });
    const result: LayoutOutput = { batch: reflowMany(data.source, data.targets, measure), originalMetrics: evaluate(data.source, data.source, measure) };
    scope.postMessage({ result });
  } catch (error) { scope.postMessage({ error: error instanceof Error ? error.message : String(error) }); }
};
