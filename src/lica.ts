import { validateDesign, type Design, type Element } from './model';

/** Converts one LICA layout (https://github.com/purvanshi/lica-dataset) into reflow.design.v0. Pure; never drops content silently. */
export type LicaMeta = { layoutId: string; templateId: string; category: string };
export type LicaConversion = {
  design: Design;
  /** supported: no loss. adapted: representable, every loss listed. unsupported: every blocker listed. */
  status: 'supported' | 'adapted' | 'unsupported';
  losses: string[];
  blockers: string[];
  fonts: { family: string; weight: number }[];
  images: { assetId: string; src: string }[];
};
export const LICA_PROVENANCE = 'LICA dataset (LICA WORLD), CC BY 4.0, https://github.com/purvanshi/lica-dataset; converted and modified for Reflow evaluation';

const ELEMENT_LIMIT = 100;
const NUM = String.raw`-?\d+(?:\.\d+)?(?:e-?\d+)?`;
const FAMILY = /^[A-Za-z0-9][A-Za-z0-9 _-]*$/;
type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
const px = (v: unknown) => typeof v === 'number' ? v : parseFloat(String(v ?? '0'));

export function cssHex(css: unknown): string | undefined {
  const s = String(css ?? '').trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) return s.toLowerCase();
  const m = s.match(/^rgba?\(([^)]*)\)$/);
  if (!m) return undefined;
  const [r, g, b, a = 1] = m[1].split(',').map(x => parseFloat(x));
  if (![r, g, b, a].every(Number.isFinite)) return undefined;
  const h = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}${a < 1 ? h(a * 255) : ''}`;
}

/** Describes a transform that changes geometry, or undefined for none/identity. */
function transformIssue(value: unknown): string | undefined {
  const s = String(value ?? 'none');
  for (const [, fn, args] of s.matchAll(/(\w+)\(([^)]*)\)/g)) {
    const v = [...args.matchAll(new RegExp(NUM, 'g'))].map(x => parseFloat(x[0]));
    if (fn === 'rotate' && Math.abs(v[0] ?? 0) % 360 > 0.5) return `rotation ${v[0]}deg`;
    if (fn === 'scale' && v.some(x => Math.abs(x - 1) > 1e-6)) return v.some(x => x < 0) ? 'mirrored' : `scale ${v.join(',')}`;
    if (fn.startsWith('translate') && v.some(x => Math.abs(x) > 1e-6)) return `translate ${v.join(',')}`;
    if (fn === 'matrix' && v.some((x, i) => Math.abs(x - [1, 0, 0, 1, 0, 0][i]) > 1e-6)) return `matrix ${v.join(',')}`;
    if (!['rotate', 'scale', 'matrix'].includes(fn) && !fn.startsWith('translate')) return `transform ${fn}`;
  }
  return undefined;
}

function rectangularClip(clip: unknown): boolean {
  if (!clip) return true;
  const d = String(clip).match(/path\("([^"]*)"\)/)?.[1];
  if (!d || /[CQASTHVcqasthv]/.test(d)) return false;
  const pts = [...d.matchAll(new RegExp(`(${NUM}),(${NUM})`, 'g'))].map(m => [+m[1], +m[2]]);
  return new Set(pts.map(p => p[0].toFixed(1))).size <= 2 && new Set(pts.map(p => p[1].toFixed(1))).size <= 2;
}

function lineHeightOf(value: unknown, fontSize: number): number | undefined {
  if (value === undefined || value === null || value === '' || value === 'normal') return 1.2;
  const s = String(value).trim();
  if (s.endsWith('%')) return parseFloat(s) / 100;
  if (s.endsWith('px')) return parseFloat(s) / fontSize;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function convertLica(layout: unknown, meta: LicaMeta): LicaConversion {
  if (!isObject(layout)) throw new Error(`LICA layout ${meta.layoutId} must be an object.`);
  const width = px(layout.width), height = px(layout.height);
  if (!(width > 0 && height > 0)) throw new Error(`LICA layout ${meta.layoutId} needs a positive width and height.`);
  if (!Array.isArray(layout.components)) throw new Error(`LICA layout ${meta.layoutId} has no components array.`);

  const losses = new Set<string>(), blockers = new Set<string>();
  const fonts = new Map<string, { family: string; weight: number }>();
  const images: { assetId: string; src: string }[] = [];
  const elements: Element[] = [];
  let background = cssHex(layout.background);
  if (!background) {
    if (layout.background !== undefined) losses.add(`canvas background ${String(layout.background).slice(0, 40)} replaced with white`);
    background = '#ffffff';
  }

  layout.components.forEach((raw: unknown, i: number) => {
    const where = `(component ${i})`;
    if (!isObject(raw)) { blockers.add(`malformed component ${where}`); return; }
    const c = raw;
    const type = String(c.type);
    const id = `${type.toLowerCase()}-${i}`;
    const box = { x: px(c.left), y: px(c.top), width: px(c.width), height: px(c.height) };
    const transform = transformIssue(c.transform);
    if (transform) blockers.add(`${type.toLowerCase()} ${transform} ${where}`);
    if (!(box.width > 0 && box.height > 0)) { losses.add(`zero-size ${type.toLowerCase()} omitted ${where}`); return; }
    const covers = box.x <= 1 && box.y <= 1 && box.width >= width - 1 && box.height >= height - 1;
    const opacityValue = Number(c.opacity);
    const extra = c.opacity !== undefined && Number.isFinite(opacityValue) && opacityValue !== 1 ? { opacity: opacityValue } : {};

    if (type === 'TEXT') {
      if (c.curvature && Number(c.curvature) !== 0) blockers.add(`curved text ${where}`);
      let text = String(c.text ?? '');
      if (/<[a-z/][^>]*>/i.test(text)) blockers.add(`rich-text markup ${where}`);
      const [familyPart, weightPart] = String(c.fontFamily ?? '').split('--');
      const family = familyPart.trim();
      if (!FAMILY.test(family)) { blockers.add(`unsupported font family "${family}" ${where}`); return; }
      const weight = Number(c.fontWeight ?? weightPart ?? 400) || 400;
      const fontSize = px(c.fontSize);
      let lineHeight = lineHeightOf(c.lineHeight, fontSize);
      if (lineHeight === undefined) { losses.add(`line height ${String(c.lineHeight)} not understood, set to 1.2 ${where}`); lineHeight = 1.2; }
      if (lineHeight < 1) { losses.add(`line height below 1 raised to 1 ${where}`); lineHeight = 1; }
      if (c.textTransform === 'uppercase') { text = text.toUpperCase(); losses.add('uppercase styling applied to the text value'); }
      else if (c.textTransform && c.textTransform !== 'none') losses.add(`textTransform ${String(c.textTransform)} dropped`);
      if (c.letterSpacing && !['0em', '0px', 'normal', '0'].includes(String(c.letterSpacing))) losses.add('letter spacing dropped');
      if (c.fontStyle && c.fontStyle !== 'normal') losses.add('italic dropped');
      if (c.textAlign === 'justify') losses.add('justified text set to left');
      const align: 'left' | 'center' | 'right' = c.textAlign === 'center' ? 'center' : c.textAlign === 'right' ? 'right' : 'left';
      let color = cssHex(c.color);
      if (!color && c.color === undefined) { color = '#000000'; losses.add('missing text color set to black'); }
      if (!color) { blockers.add(`unsupported text color ${String(c.color).slice(0, 40)} ${where}`); return; }
      fonts.set(`${family}/${weight}`, { family, weight });
      elements.push({ id, type: 'text', role: 'content', ...box, text, fontFamily: family, fontWeight: weight, fontSize, lineHeight, color, align, ...extra });
    } else if (type === 'GROUP') {
      if (!rectangularClip(c.clipPath)) blockers.add(`non-rectangular shape (clip path) ${where}`);
      const color = cssHex(c.backgroundColor || c.background);
      if (!color) { losses.add(`shape with no solid fill omitted ${where}`); return; }
      elements.push({ id, type: 'rect', role: covers ? 'background' : 'decoration', ...box, color, ...extra });
    } else if (type === 'IMAGE') {
      if (!rectangularClip(c.clipPath)) blockers.add(`non-rectangular image mask ${where}`);
      const src = typeof c.src === 'string' ? c.src : '';
      const assetId = src.split('/').pop()?.split('?')[0] ?? '';
      if (!assetId) { losses.add(`image without a source omitted ${where}`); return; }
      images.push({ assetId, src });
      elements.push({ id, type: 'image', role: covers ? 'background' : 'content', ...box, assetId, fit: 'cover', focalPoint: { x: 0.5, y: 0.5 }, ...extra });
    } else {
      blockers.add(`component type ${type} ${where}`);
    }
  });

  if (elements.length > ELEMENT_LIMIT) blockers.add(`${elements.length} elements exceeds the ${ELEMENT_LIMIT}-element limit`);
  if (!elements.length) blockers.add('no representable elements');
  const design: Design = {
    schemaVersion: 'reflow.design.v0', id: `lica-${meta.layoutId}`, name: `LICA ${meta.category} ${meta.layoutId}`,
    description: `Converted from LICA layout ${meta.layoutId} (template ${meta.templateId}).`,
    provenance: LICA_PROVENANCE, width, height, background, groups: [], elements,
  };
  let status: LicaConversion['status'] = blockers.size ? 'unsupported' : losses.size ? 'adapted' : 'supported';
  if (status !== 'unsupported') {
    try { validateDesign(design); } catch (e) {
      blockers.add(`converted design fails validation: ${e instanceof Error ? e.message : String(e)}`);
      status = 'unsupported';
    }
  }
  return { design, status, losses: [...losses], blockers: [...blockers], fonts: [...fonts.values()], images };
}
