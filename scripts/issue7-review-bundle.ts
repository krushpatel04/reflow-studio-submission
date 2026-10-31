import { createHash } from 'node:crypto';
import { mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export type CaseStatus = 'eligible' | 'excluded' | 'failed';
export type AcceptabilityChoice = 'yes' | 'no' | 'unsure';
export type PreferenceChoice = 'A' | 'B' | 'tie' | 'neither' | 'unsure';

export interface SourceArtifactInput {
  id: string;
  artifactHash: string;
  inputPath: string;
}

export interface OutputArtifactInput extends SourceArtifactInput {
  method: string;
}

export interface ReviewCaseInput {
  id: string;
  source: SourceArtifactInput;
  outputs: OutputArtifactInput[];
  status: CaseStatus;
  reason?: string;
}

export interface ReviewBundleInput {
  seed: number;
  reviewerIds: string[];
  cases: ReviewCaseInput[];
  reviewsPerCase?: number;
  hiddenReversedControlsPerReviewer?: number;
}

interface ReviewerArtifact {
  artifactHash: string;
  filename: string;
}

interface BlankVote {
  acceptA: null;
  acceptB: null;
  preference: null;
}

export interface ReviewerAssignment {
  assignmentId: string;
  reviewerId: string;
  presentationId: string;
  source: ReviewerArtifact;
  A: ReviewerArtifact;
  B: ReviewerArtifact;
  vote: BlankVote;
}

interface DecodedPosition {
  outputId: string;
  method: string;
  artifactHash: string;
  inputPath: string;
}

interface PresentationDecode {
  caseId: string;
  sourceId: string;
  sourceInputPath: string;
  positionA: DecodedPosition;
  positionB: DecodedPosition;
  controlOfPresentationId?: string;
}

export interface ReviewBundleResult {
  reviewerBundle: {
    bundleId: string;
    reviewerIds: string[];
    rubric: {
      acceptabilityChoices: AcceptabilityChoice[];
      preferenceChoices: PreferenceChoice[];
    };
    assignments: ReviewerAssignment[];
  };
  privateDecode: {
    bundleId: string;
    presentations: Record<string, PresentationDecode>;
  };
  accounting: {
    bundleId: string;
    summary: { requested: number; eligible: number; excluded: number; failed: number };
    ledger: Array<{
      caseId: string;
      status: 'excluded' | 'failed';
      reason: string;
      sourceId: string;
      sourceArtifactHash: string;
      sourceInputPath: string;
    }>;
  };
}

const HASH_PATTERN = /^[a-f0-9]{64}$/;

function opaque(seed: number, ...parts: string[]): string {
  return createHash('sha256').update([String(seed), ...parts].join('\0')).digest('hex').slice(0, 20);
}

function validateArtifact(artifact: SourceArtifactInput, context: string): void {
  if (!artifact || typeof artifact !== 'object') throw new Error(`${context} must be an artifact object`);
  if (!artifact.id?.trim()) throw new Error(`${context}.id is required`);
  if (!HASH_PATTERN.test(artifact.artifactHash)) throw new Error(`${context}.artifactHash must be a lowercase SHA-256 hex digest`);
  if (!artifact.inputPath?.trim()) throw new Error(`${context}.inputPath is required`);
}

function validateAndNormalize(input: ReviewBundleInput): Required<Omit<ReviewBundleInput, 'cases'>> & { cases: ReviewCaseInput[] } {
  if (!input || typeof input !== 'object') throw new Error('review bundle input must be an object');
  if (!Number.isSafeInteger(input.seed)) throw new Error('seed must be a safe integer');
  if (!Array.isArray(input.reviewerIds) || input.reviewerIds.length === 0) throw new Error('reviewerIds must contain at least one reviewer');
  if (input.reviewerIds.some(id => typeof id !== 'string' || !id.trim())) throw new Error('reviewerIds must be non-empty strings');
  if (new Set(input.reviewerIds).size !== input.reviewerIds.length) throw new Error('duplicate reviewer IDs are not allowed');
  if (!Array.isArray(input.cases) || input.cases.length === 0) throw new Error('cases must contain at least one requested case');

  const reviewsPerCase = input.reviewsPerCase ?? Math.min(2, input.reviewerIds.length);
  if (!Number.isSafeInteger(reviewsPerCase) || reviewsPerCase < 1 || reviewsPerCase > input.reviewerIds.length) {
    throw new Error('reviewsPerCase must be an integer between 1 and the reviewer count');
  }
  const hiddenReversedControlsPerReviewer = input.hiddenReversedControlsPerReviewer ?? 0;
  if (!Number.isSafeInteger(hiddenReversedControlsPerReviewer) || hiddenReversedControlsPerReviewer < 0) {
    throw new Error('hiddenReversedControlsPerReviewer must be a nonnegative integer');
  }

  const caseIds = new Set<string>();
  const cases = [...input.cases]
    .map(item => ({ ...item, outputs: [...item.outputs].sort((a, b) => a.id.localeCompare(b.id)) }))
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const item of cases) {
    if (!item?.id?.trim()) throw new Error('every case requires a non-empty id');
    if (caseIds.has(item.id)) throw new Error(`duplicate case id: ${item.id}`);
    caseIds.add(item.id);
    if (!['eligible', 'excluded', 'failed'].includes(item.status)) throw new Error(`invalid status for case ${item.id}`);
    validateArtifact(item.source, `case ${item.id} source`);
    if (!Array.isArray(item.outputs)) throw new Error(`case ${item.id} outputs must be an array`);
    if (item.status === 'eligible' && item.outputs.length !== 2) throw new Error(`eligible case ${item.id} requires exactly two outputs`);
    if (item.status !== 'eligible' && !item.reason?.trim()) throw new Error(`${item.status} case ${item.id} requires a reason`);
    const outputIds = new Set<string>();
    const methods = new Set<string>();
    for (const output of item.outputs) {
      validateArtifact(output, `case ${item.id} output`);
      if (!output.method?.trim()) throw new Error(`case ${item.id} output method is required`);
      if (outputIds.has(output.id)) throw new Error(`duplicate artifact id in case ${item.id}: ${output.id}`);
      if (methods.has(output.method)) throw new Error(`eligible comparison methods must be distinct in case ${item.id}`);
      outputIds.add(output.id);
      methods.add(output.method);
    }
  }
  return { ...input, cases, reviewsPerCase, hiddenReversedControlsPerReviewer };
}

function visibleArtifact(seed: number, presentationId: string, position: 'source' | 'A' | 'B', artifactHash: string): ReviewerArtifact {
  return {
    artifactHash,
    filename: `${position.toLowerCase()}-${opaque(seed, presentationId, position)}.artifact`,
  };
}

function decoded(output: OutputArtifactInput): DecodedPosition {
  return {
    outputId: output.id,
    method: output.method,
    artifactHash: output.artifactHash,
    inputPath: output.inputPath,
  };
}

export function generateReviewBundle(rawInput: ReviewBundleInput): ReviewBundleResult {
  const input = validateAndNormalize(rawInput);
  const identity = JSON.stringify({
    reviewers: [...input.reviewerIds].sort(),
    reviewsPerCase: input.reviewsPerCase,
    hiddenReversedControlsPerReviewer: input.hiddenReversedControlsPerReviewer,
    cases: input.cases.map(item => ({
      id: item.id,
      status: item.status,
      reason: item.reason ?? null,
      source: [item.source.id, item.source.artifactHash],
      outputs: item.outputs.map(output => [output.id, output.method, output.artifactHash]),
    })),
  });
  const bundleId = `bundle-${opaque(input.seed, 'bundle', identity)}`;
  const eligible = input.cases.filter(item => item.status === 'eligible');
  const reviewerIds = [...input.reviewerIds].sort((a, b) => {
    const left = opaque(input.seed, 'reviewer', a);
    const right = opaque(input.seed, 'reviewer', b);
    return left.localeCompare(right) || a.localeCompare(b);
  });
  const assignments: ReviewerAssignment[] = [];
  const presentations: Record<string, PresentationDecode> = {};

  for (let caseIndex = 0; caseIndex < eligible.length; caseIndex += 1) {
    const item = eligible[caseIndex];
    const presentationId = `p-${opaque(input.seed, 'primary', item.id)}`;
    const shouldSwap = Number.parseInt(opaque(input.seed, 'order', item.id).slice(-2), 16) % 2 === 1;
    const [positionA, positionB] = shouldSwap ? [item.outputs[1], item.outputs[0]] : item.outputs;
    presentations[presentationId] = {
      caseId: item.id,
      sourceId: item.source.id,
      sourceInputPath: item.source.inputPath,
      positionA: decoded(positionA),
      positionB: decoded(positionB),
    };
    for (let offset = 0; offset < input.reviewsPerCase; offset += 1) {
      const reviewerId = reviewerIds[(caseIndex * input.reviewsPerCase + offset) % reviewerIds.length];
      assignments.push({
        assignmentId: `a-${opaque(input.seed, presentationId, reviewerId, 'primary')}`,
        reviewerId,
        presentationId,
        source: visibleArtifact(input.seed, presentationId, 'source', item.source.artifactHash),
        A: visibleArtifact(input.seed, presentationId, 'A', positionA.artifactHash),
        B: visibleArtifact(input.seed, presentationId, 'B', positionB.artifactHash),
        vote: { acceptA: null, acceptB: null, preference: null },
      });
    }
  }

  for (let reviewerIndex = 0; reviewerIndex < reviewerIds.length; reviewerIndex += 1) {
    const reviewerId = reviewerIds[reviewerIndex];
    const primary = assignments.filter(item => item.reviewerId === reviewerId);
    for (let controlIndex = 0; controlIndex < input.hiddenReversedControlsPerReviewer; controlIndex += 1) {
      if (primary.length === 0) break;
      const original = primary[(reviewerIndex + controlIndex) % primary.length];
      const originalDecode = presentations[original.presentationId];
      const presentationId = `p-${opaque(input.seed, original.presentationId, reviewerId, 'reverse', String(controlIndex))}`;
      presentations[presentationId] = {
        caseId: originalDecode.caseId,
        sourceId: originalDecode.sourceId,
        sourceInputPath: originalDecode.sourceInputPath,
        positionA: originalDecode.positionB,
        positionB: originalDecode.positionA,
        controlOfPresentationId: original.presentationId,
      };
      assignments.push({
        assignmentId: `a-${opaque(input.seed, presentationId, reviewerId, 'control')}`,
        reviewerId,
        presentationId,
        source: visibleArtifact(input.seed, presentationId, 'source', original.source.artifactHash),
        A: visibleArtifact(input.seed, presentationId, 'A', original.B.artifactHash),
        B: visibleArtifact(input.seed, presentationId, 'B', original.A.artifactHash),
        vote: { acceptA: null, acceptB: null, preference: null },
      });
    }
  }

  assignments.sort((a, b) => a.reviewerId.localeCompare(b.reviewerId) || a.assignmentId.localeCompare(b.assignmentId));
  const counts = { requested: input.cases.length, eligible: 0, excluded: 0, failed: 0 };
  for (const item of input.cases) counts[item.status] += 1;
  const ledger = input.cases.filter(item => item.status !== 'eligible').map(item => ({
    caseId: item.id,
    status: item.status as 'excluded' | 'failed',
    reason: item.reason!,
    sourceId: item.source.id,
    sourceArtifactHash: item.source.artifactHash,
    sourceInputPath: item.source.inputPath,
  }));

  return {
    reviewerBundle: {
      bundleId,
      reviewerIds,
      rubric: {
        acceptabilityChoices: ['yes', 'no', 'unsure'],
        preferenceChoices: ['A', 'B', 'tie', 'neither', 'unsure'],
      },
      assignments,
    },
    privateDecode: { bundleId, presentations },
    accounting: { bundleId, summary: counts, ledger },
  };
}

function validateNeutralPng(bytes: Buffer, path: string): void {
  // Retain rendering data only. Reject textual/EXIF/private chunks rather than
  // silently rewriting the pinned artifact and losing its provenance hash.
  const allowed = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'sRGB', 'gAMA', 'cHRM', 'pHYs', 'sBIT', 'bKGD']);
  let offset = 8;
  let ended = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (!allowed.has(type)) throw new Error(`PNG chunk ${type} not allowed: ${path}`);
    if (offset + length + 12 > bytes.length) throw new Error(`truncated PNG chunk: ${path}`);
    offset += length + 12;
    if (type === 'IEND') {
      ended = length === 0;
      break;
    }
  }
  if (!ended || offset !== bytes.length) throw new Error(`incomplete PNG or trailing data: ${path}`);
}

// Check every eligible input before creating a distributable directory. Keep the
// bytes we verified so a later source-file change cannot alter the exported copy.
async function materializeArtifacts(result: ReviewBundleResult, baseDirectory: string): Promise<Map<string, Buffer>> {
  const maxBytes = 16 * 1024 * 1024;
  const maxTotalBytes = 256 * 1024 * 1024;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const inputs = new Map<string, Buffer>();
  const files = new Map<string, Buffer>();
  let totalBytes = 0;
  for (const assignment of result.reviewerBundle.assignments) {
    const decode = result.privateDecode.presentations[assignment.presentationId];
    for (const [visible, inputPath] of [
      [assignment.source, decode.sourceInputPath],
      [assignment.A, decode.positionA.inputPath],
      [assignment.B, decode.positionB.inputPath],
    ] as const) {
      const path = resolve(baseDirectory, inputPath);
      let bytes = inputs.get(path);
      if (!bytes) {
        // O_NONBLOCK avoids hanging while opening a FIFO; fstat then rejects it.
        const handle = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
        try {
          const stat = await handle.stat();
          if (!stat.isFile()) throw new Error(`artifact must be a regular file: ${path}`);
          if (stat.size > maxBytes) throw new Error(`artifact exceeds 16 MiB: ${path}`);
          if (totalBytes + stat.size > maxTotalBytes) throw new Error('artifacts exceed 256 MiB total');
          // Bound the read even if the file grows after fstat.
          const buffer = Buffer.alloc(stat.size + 1);
          let size = 0;
          while (size < buffer.length) {
            const read = await handle.read(buffer, size, buffer.length - size, null);
            if (read.bytesRead === 0) break;
            size += read.bytesRead;
          }
          if (size !== stat.size) throw new Error(`artifact changed while reading: ${path}`);
          bytes = buffer.subarray(0, size);
          if (!bytes.subarray(0, signature.length).equals(signature)) throw new Error(`artifact is not a PNG: ${path}`);
          validateNeutralPng(bytes, path);
          totalBytes += size;
          inputs.set(path, bytes);
        } finally {
          await handle.close();
        }
      }
      if (createHash('sha256').update(bytes).digest('hex') !== visible.artifactHash) {
        throw new Error(`artifact hash mismatch: ${path}`);
      }
      visible.filename = visible.filename.replace(/\.artifact$/, '.png');
      files.set(visible.filename, bytes);
    }
  }
  return files;
}

async function runCli(args: string[]): Promise<void> {
  const options = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (!['--input', '--output-dir', '--materialize'].includes(option)) throw new Error(`unknown option: ${option}`);
    if (options.has(option)) throw new Error(`duplicate option: ${option}`);
    if (option === '--materialize') options.set(option, 'true');
    else {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`missing value for ${option}`);
      options.set(option, value);
    }
  }
  const inputPath = options.get('--input');
  const outputDirectory = options.get('--output-dir');
  if (!inputPath || !outputDirectory) {
    throw new Error('Usage: node --import tsx scripts/issue7-review-bundle.ts --input <input.json> --output-dir <new-directory> [--materialize]');
  }
  const input = JSON.parse(await readFile(inputPath, 'utf8')) as ReviewBundleInput;
  const result = generateReviewBundle(input);
  const artifacts = options.has('--materialize')
    ? await materializeArtifacts(result, dirname(resolve(inputPath)))
    : new Map<string, Buffer>();
  await mkdir(outputDirectory);
  try {
    await mkdir(resolve(outputDirectory, 'reviewer'));
    await mkdir(resolve(outputDirectory, 'private'), { mode: 0o700 });
    // Sequential writes avoid unbounded handles and ensure cleanup cannot race
    // writes still running after a sibling promise rejects.
    for (const [filename, bytes] of artifacts) {
      await writeFile(resolve(outputDirectory, 'reviewer', filename), bytes, { flag: 'wx' });
    }
    await writeFile(resolve(outputDirectory, 'private', 'decode.json'), `${JSON.stringify(result.privateDecode, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await writeFile(resolve(outputDirectory, 'accounting.json'), `${JSON.stringify(result.accounting, null, 2)}\n`, 'utf8');
    await writeFile(resolve(outputDirectory, 'reviewer', 'manifest.json'), `${JSON.stringify(result.reviewerBundle, null, 2)}\n`, 'utf8');
  } catch (error) {
    await rm(outputDirectory, { recursive: true, force: true });
    throw error;
  }
  process.stdout.write(`${outputDirectory}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli(process.argv.slice(2)).catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
