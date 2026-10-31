import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import type { Design } from '../src/model';
import { layoutText, type Measure } from '../src/typography';

/** Inspection-only renderer for the LICA visual check. Not the engine's renderer (scripts/native.ts) and not used for scoring. */
type Img = Awaited<ReturnType<typeof loadImage>>;

export function registerFont(file: string, family: string) {
  if (!GlobalFonts.registerFromPath(file, family)) throw new Error(`Could not register ${file} as ${family}.`);
}

const probe = createCanvas(1, 1).getContext('2d');
export const measure: Measure = (text, e) => {
  probe.font = `${e.fontWeight} ${e.fontSize}px "${e.fontFamily}"`;
  const m = probe.measureText(text);
  return { width: m.width, ascent: Math.max(m.actualBoundingBoxAscent, m.fontBoundingBoxAscent), descent: Math.max(m.actualBoundingBoxDescent, m.fontBoundingBoxDescent) };
};

export function renderPreview(design: Design, images: Map<string, Img>, scale = 1): Buffer {
  const canvas = createCanvas(Math.ceil(design.width * scale), Math.ceil(design.height * scale));
  const g = canvas.getContext('2d');
  g.scale(scale, scale);
  g.fillStyle = design.background;
  g.fillRect(0, 0, design.width, design.height);
  for (const e of design.elements) {
    g.save();
    g.globalAlpha = e.opacity ?? 1;
    if (e.type === 'rect') { g.fillStyle = e.color; g.beginPath(); g.roundRect(e.x, e.y, e.width, e.height, e.radius ?? 0); g.fill(); }
    else if (e.type === 'ellipse') { g.fillStyle = e.color; g.beginPath(); g.ellipse(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, e.height / 2, 0, 0, Math.PI * 2); g.fill(); }
    else if (e.type === 'image') {
      const img = images.get(e.assetId);
      if (!img) throw new Error(`Missing image ${e.assetId}`);
      g.beginPath(); g.rect(e.x, e.y, e.width, e.height); g.clip();
      const s = e.fit === 'cover' ? Math.max(e.width / img.width, e.height / img.height) : Math.min(e.width / img.width, e.height / img.height);
      g.drawImage(img, e.x + (e.width - img.width * s) * e.focalPoint.x, e.y + (e.height - img.height * s) * e.focalPoint.y, img.width * s, img.height * s);
    } else {
      const layout = layoutText(e, measure);
      g.font = `${e.fontWeight} ${e.fontSize}px "${e.fontFamily}"`;
      g.fillStyle = e.color;
      g.textBaseline = 'alphabetic';
      g.textAlign = 'left';
      layout.lines.forEach((line, i) => {
        const w = measure(line, e).width;
        const x = e.align === 'center' ? e.x + (e.width - w) / 2 : e.align === 'right' ? e.x + e.width - w : e.x;
        g.fillText(line, x, e.y + layout.ascent + i * layout.lineStep);
      });
    }
    g.restore();
  }
  return canvas.toBuffer('image/png');
}

export async function sideBySide(left: Buffer, right: Buffer, labels: [string, string] = ['LICA render', 'Converted (Reflow schema)']): Promise<Buffer> {
  const [a, b] = await Promise.all([loadImage(left), loadImage(right)]);
  const h = b.height, aw = Math.round(a.width * h / a.height), gap = 16, strip = 24;
  const canvas = createCanvas(aw + gap + b.width, h + strip);
  const g = canvas.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#333333'; g.font = '14px sans-serif';
  g.fillText(labels[0], 0, 16); g.fillText(labels[1], aw + gap, 16);
  g.drawImage(a, 0, strip, aw, h);
  g.drawImage(b, aw + gap, strip, b.width, h);
  return canvas.toBuffer('image/png');
}
