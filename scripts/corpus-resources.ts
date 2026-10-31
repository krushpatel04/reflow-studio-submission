import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { open, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { CorpusSource, CorpusResource } from '../src/corpus';
import { validateDesign, type Design } from '../src/model';
import { validateResources, type DesignResources } from '../src/resources';
import { assetSize, type Size } from '../src/crop';

export type ResourceLimits = { maxSourceBytes: number; maxResourceBytes: number; maxTotalBytes: number; maxResources: number };
export const DEFAULT_RESOURCE_LIMITS: Readonly<ResourceLimits> = Object.freeze({
  maxSourceBytes: 2 * 1024 * 1024, maxResourceBytes: 16 * 1024 * 1024,
  maxTotalBytes: 64 * 1024 * 1024, maxResources: 256,
});
export type LoadedFile = CorpusResource & { byteLength: number };
export type LoadedFont = { family: string; weight: number; file: string; sha256: string; bytes: Buffer };
export type LoadedAsset = { id: string; mediaType: string; dimensions: 'known' | 'unverified'; intrinsicSize?: Size };
export type LoadedCorpusSource = { design: Design; resources: DesignResources; files: LoadedFile[]; fonts: LoadedFont[]; assets: LoadedAsset[]; totalBytes: number };

export class CorpusResourceError extends Error {
  constructor(readonly code: string, readonly path: string, message: string) {
    super(message); this.name = 'CorpusResourceError';
  }
}
const fail = (code: string, path: string, message: string): never => { throw new CorpusResourceError(code, path, message); };
const inside = (root: string, path: string) => {
  const rel = relative(root, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
};
export const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

/** Bounded, regular local files only. The cache and byte budget belong to one source. */
export class CorpusFileReader {
  private cache = new Map<string, Buffer>();
  totalBytes = 0;
  constructor(private root: string, private maxTotalBytes: number) {}

  async read(file: string, maxBytes: number): Promise<Buffer> {
    const root = await realpath(this.root);
    if (isAbsolute(file) || /^[a-z][a-z\d+.-]*:/i.test(file) || !inside(root, resolve(root, file))) {
      return fail('file-outside-corpus', file, 'File must be a relative path inside the corpus directory.');
    }
    let path: string;
    try { path = await realpath(resolve(root, file)); }
    catch { return fail('missing-file', file, 'File is missing or inaccessible.'); }
    if (!inside(root, path)) return fail('file-outside-corpus', file, 'Resolved file escapes the corpus directory.');
    const cached = this.cache.get(path);
    if (cached) {
      if (cached.length > maxBytes) return fail('file-byte-limit', file, `File exceeds ${maxBytes} bytes.`);
      return cached;
    }
    // O_NONBLOCK prevents opening a FIFO from hanging before fstat can reject it.
    const handle = await open(path, constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW);
    try {
      const stat = await handle.stat();
      if (!stat.isFile()) return fail('unsupported-file-type', file, 'Expected a regular file.');
      const checkSize = (size: number) => {
        if (size > maxBytes) fail('file-byte-limit', file, `File exceeds ${maxBytes} bytes.`);
        if (this.totalBytes + size > this.maxTotalBytes) fail('total-byte-limit', file, `Source and resources exceed ${this.maxTotalBytes} bytes.`);
      };
      checkSize(stat.size);
      const chunks: Buffer[] = [];
      let size = 0;
      while (true) {
        const chunk = Buffer.alloc(Math.min(64 * 1024, maxBytes - size + 1, this.maxTotalBytes - this.totalBytes - size + 1));
        const { bytesRead } = await handle.read(chunk);
        if (!bytesRead) break;
        size += bytesRead; checkSize(size); chunks.push(chunk.subarray(0, bytesRead));
      }
      const bytes = Buffer.concat(chunks, size);
      this.totalBytes += size; this.cache.set(path, bytes);
      return bytes;
    } finally { await handle.close(); }
  }
}

function assetUri(bytes: Buffer, file: string): string {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (bytes.length >= 33 && bytes.subarray(0, 8).equals(png) && bytes.readUInt32BE(8) === 13 && bytes.toString('ascii', 12, 16) === 'IHDR') {
    const uri = `data:image/png;base64,${bytes.toString('base64')}`;
    if (assetSize(uri)) return uri;
  }
  // Corpus extensions are not reliable: sniff verified bytes and never transcode them.
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217) {
    return `data:image/jpeg;base64,${bytes.toString('base64')}`;
  }
  if (bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
    && bytes.readUInt32LE(4) + 8 === bytes.length && ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('ascii', 12, 16))) {
    return `data:image/webp;base64,${bytes.toString('base64')}`;
  }
  const svg = bytes.toString('utf8');
  if (/^\s*(?:<\?xml[^?]*\?>\s*)?<svg[\s>]/i.test(svg)) {
    // Conservative offline envelope check, not a general SVG sanitizer.
    // Keep unsupported dependency-bearing constructs visible instead of rewriting source art.
    if (/<!DOCTYPE|<!ENTITY|<\s*(?:script|foreignObject)\b|\bon\w+\s*=|@import|\\|&(?:#|[a-z])/i.test(svg)
      || /\b(?:\w+:)?href\s*=\s*["'](?!#)/i.test(svg)
      || /url\s*\(\s*["']?(?![#\s"'])/i.test(svg)) {
      return fail('external-svg-dependency', file, 'SVG contains unsupported dependency-bearing or active constructs.');
    }
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }
  return fail('unsupported-asset-format', file, 'Expected a PNG, JPEG, WebP or self-contained SVG envelope; decoding is not verified here.');
}

function checkFont(bytes: Buffer, file: string) {
  if (bytes.length < 48 || bytes.toString('ascii', 0, 4) !== 'wOF2' || bytes.readUInt32BE(8) !== bytes.length
    || bytes.readUInt16BE(12) === 0 || bytes.readUInt16BE(14) !== 0) {
    fail('unsupported-font-format', file, 'Expected a WOFF2 envelope. Font decoding, family identity and glyph coverage require renderer validation.');
  }
}

/** Requires a structurally validated manifest source. No bundled fallbacks or global font registration. */
export async function loadCorpusSource(root: string, source: CorpusSource, overrides: Partial<ResourceLimits> = {}): Promise<LoadedCorpusSource> {
  const limits = { ...DEFAULT_RESOURCE_LIMITS, ...overrides };
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) fail('invalid-limit', key, 'Expected a positive safe integer.');
  }
  if (source.conversion.status === 'unsupported') fail('unsupported-conversion', source.file, 'Unsupported conversions are not loaded.');
  if (source.resources.length > limits.maxResources) fail('resource-count-limit', source.id, `More than ${limits.maxResources} resources declared.`);
  const reader = new CorpusFileReader(root, limits.maxTotalBytes);
  const verified = async (record: { file: string; sha256: string }, maxBytes: number) => {
    const bytes = await reader.read(record.file, maxBytes);
    if (sha256(bytes) !== record.sha256) fail('hash-mismatch', record.file, 'Bytes do not match the manifest SHA-256.');
    return bytes;
  };
  const sourceBytes = await verified(source, limits.maxSourceBytes);
  let design: Design;
  try { const parsed: unknown = JSON.parse(sourceBytes.toString('utf8')); validateDesign(parsed); design = parsed; }
  catch (error) { return fail('invalid-design', source.file, error instanceof Error ? error.message : 'Invalid design.'); }

  const assets = new Map<string, string>();
  const assetMetadata: LoadedAsset[] = [];
  const fontBytes = new Map<string, { resource: CorpusResource; bytes: Buffer }>();
  const seen = new Map<string, string>();
  const files: LoadedFile[] = [];
  for (const resource of source.resources) {
    const key = JSON.stringify([resource.kind, resource.id]);
    const prior = seen.get(key);
    if (prior && prior !== resource.sha256) fail('conflicting-resource', resource.file, `Conflicting ${resource.kind} binding: ${resource.id}.`);
    const bytes = await verified(resource, limits.maxResourceBytes);
    if (prior) continue;
    seen.set(key, resource.sha256);
    files.push({ ...resource, byteLength: bytes.length });
    if (resource.kind === 'asset') {
      const uri = assetUri(bytes, resource.file), intrinsicSize = assetSize(uri);
      assets.set(resource.id, uri);
      assetMetadata.push({ id: resource.id, mediaType: uri.slice(5).split(/[;,]/)[0], dimensions: intrinsicSize ? 'known' : 'unverified', intrinsicSize });
    }
    else { checkFont(bytes, resource.file); fontBytes.set(resource.id, { resource, bytes }); }
  }
  const fonts: LoadedFont[] = [];
  const pairs = new Set<string>();
  for (const element of design.elements) {
    if (element.type !== 'text') continue;
    const { fontFamily: family, fontWeight: weight } = element;
    const pair = JSON.stringify([family, weight]);
    const face = fontBytes.get(`${family}-${weight}`);
    if (!face || pairs.has(pair)) continue;
    pairs.add(pair);
    fonts.push({ family, weight, file: face.resource.file, sha256: face.resource.sha256, bytes: face.bytes });
  }
  const resources: DesignResources = {
    resolveAsset: id => assets.get(id),
    supportsFont: (family, weight) => pairs.has(JSON.stringify([family, weight])),
  };
  validateResources(design, resources);
  return { design, resources, files, fonts, assets: assetMetadata, totalBytes: reader.totalBytes };
}
