import { ASSETS } from './assets';
import { DesignValidationError, validateDesign, type Design } from './model';

/** Callers supply already available resources and a matching measurer/renderer. No I/O. */
export type DesignResources = {
  resolveAsset: (id: string) => string | undefined;
  supportsFont: (family: string, weight: number) => boolean;
};
export const BUNDLED_RESOURCES: DesignResources = {
  resolveAsset: id => Object.hasOwn(ASSETS, id) ? ASSETS[id] : undefined,
  supportsFont: (family, weight) => family === 'Inter' ? [400, 500, 600, 700].includes(weight) : family === 'Source Serif 4' && weight === 600,
};

/** A well-formed resource reference is distinct from an available resource. */
export function validateResources(input: unknown, resources: DesignResources = BUNDLED_RESOURCES): asserts input is Design {
  validateDesign(input);
  for (const [i, e] of input.elements.entries()) {
    const path = `$.elements[${i}]`;
    if (e.type === 'image') {
      const asset = resources.resolveAsset(e.assetId);
      if (typeof asset !== 'string' || !asset.trim()) throw new DesignValidationError('resource', 'missing-asset', `${path}.assetId`, `Asset "${e.assetId}" is unavailable; supply it through resolveAsset.`);
    }
    if (e.type === 'text' && !resources.supportsFont(e.fontFamily, e.fontWeight)) {
      throw new DesignValidationError('resource', 'unsupported-font', `${path}.fontFamily`, `Font "${e.fontFamily}" at weight ${e.fontWeight} is unavailable; register it in the measurer/renderer and declare supportsFont.`);
    }
  }
}
