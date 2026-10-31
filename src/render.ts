import type { Design, Metrics } from './model';
import { layoutText, type Measure } from './typography';
import { validateResources, BUNDLED_RESOURCES, type DesignResources } from './resources';
import { assetSize, cropGeometry } from './crop';

export const escapeHtml = (s: unknown) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const n = (value: number) => Number(value.toFixed(3));
let renderId = 0;
export function renderSvg(design: Design, measure: Measure, metrics?: Metrics, resources: DesignResources = BUNDLED_RESOURCES): string {
  validateResources(design, resources);
  const prefix = `design-${++renderId}`;
  const elements = design.elements.map((e, index) => {
    const x = n(e.x), y = n(e.y), w = n(e.width), h = n(e.height), opacity = e.opacity ?? 1;
    let content = '';
    if (e.type === 'rect') content = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${e.radius ?? 0}" fill="${escapeHtml(e.color)}"/>`;
    if (e.type === 'ellipse') content = `<ellipse cx="${n(x + w / 2)}" cy="${n(y + h / 2)}" rx="${w / 2}" ry="${h / 2}" fill="${escapeHtml(e.color)}"/>`;
    if (e.type === 'image') {
      const asset = resources.resolveAsset(e.assetId);
      if (!asset) throw new Error(`Unknown asset: ${e.assetId}`);
      const clip = `${prefix}-image-${index}`, size = assetSize(asset);
      let placement: string;
      if (size) {
        const { drawn } = cropGeometry(e, e.fit, e.focalPoint, size);
        placement = `x="${n(drawn.x)}" y="${n(drawn.y)}" width="${n(drawn.width)}" height="${n(drawn.height)}" preserveAspectRatio="none"`;
      } else {
        // Unknown intrinsic size: nearest SVG alignment approximates the focal point.
        const alignX = e.focalPoint.x < 0.34 ? 'xMin' : e.focalPoint.x > 0.66 ? 'xMax' : 'xMid';
        const alignY = e.focalPoint.y < 0.34 ? 'YMin' : e.focalPoint.y > 0.66 ? 'YMax' : 'YMid';
        placement = `x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="${alignX}${alignY} ${e.fit === 'cover' ? 'slice' : 'meet'}"`;
      }
      content = `<defs><clipPath id="${clip}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs><image clip-path="url(#${clip})" href="${escapeHtml(asset)}" ${placement}/>`;
    }
    if (e.type === 'text') {
      const layout = layoutText(e, measure), clip = `${prefix}-clip-${index}`;
      const anchor = e.align === 'center' ? 'middle' : e.align === 'right' ? 'end' : 'start';
      const tx = e.align === 'center' ? x + w / 2 : e.align === 'right' ? x + w : x;
      content = `<defs><clipPath id="${clip}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#${clip})"><text fill="${escapeHtml(e.color)}" font-family="'${escapeHtml(e.fontFamily)}'" font-size="${e.fontSize}" font-weight="${e.fontWeight}" text-anchor="${anchor}">${layout.lines.map((line, i) => `<tspan x="${n(tx)}" y="${n(y + layout.ascent + i * layout.lineStep)}">${escapeHtml(line)}</tspan>`).join('')}</text></g>`;
    }
    return `<g data-element-id="${escapeHtml(e.id)}" opacity="${opacity}">${content}</g>`;
  }).join('');
  const flagged = new Map(metrics?.findings.flatMap(f => f.elementIds.map(id => [id, f.severity] as const)) ?? []);
  const overlay = metrics ? design.elements.filter(e => flagged.has(e.id)).map(e => `<rect x="${n(e.x)}" y="${n(e.y)}" width="${n(e.width)}" height="${n(e.height)}" fill="none" stroke="${flagged.get(e.id) === 'error' ? '#e34850' : '#bd7900'}" stroke-width="${Math.min(design.width, design.height) * 0.004}" stroke-dasharray="12 8"/>`).join('') : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${design.width} ${design.height}" width="${design.width}" height="${design.height}" role="img" aria-label="${escapeHtml(design.name)}"><rect width="100%" height="100%" fill="${escapeHtml(design.background)}"/>${elements}${overlay}</svg>`;
}
