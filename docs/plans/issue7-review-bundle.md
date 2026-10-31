# Issue #7 / #20: review-bundle generator

## Problem and evidence

The repository has documented goals for a blind review bundle: hide method identity from reviewers, keep output/asset provenance private, separate reviewer-facing A/B records from a private decode key, and retain excluded/failed cases in a ledger instead of silently dropping them. The research note for 2026-09-23 explicitly calls for the following behavior: a review bundle with opaque case IDs, A/B presentation order, balanced reviewer assignments, hidden reversed controls, and a separate method-decoding map. The current checkout has no implementation for this bundle builder, so a deterministic synthetic bundle is required before real corpus outputs from #33 are available.

## Why it matters

A trustworthy review pack is a prerequisite for independent evaluation and downstream defect triage. If method names leak through filenames or metadata, reviewers can become biased; if excluded or failed cases disappear from the accounting ledger, the audit trail becomes misleading; if assignment counts drift, some cases will be under-reviewed and hidden controls will not meaningfully check consistency.

## Intended behavior and scope

This task stays strictly within the agreed ownership boundary. The generator will accept an explicit list of source and matched output artifacts, produce a deterministic method-blind bundle, and keep the decode map out of the reviewer-facing record. The implementation will not create votes, will not depend on UI code, will not modify package.json, and will use only synthetic fixtures until trustworthy corpus outputs exist.

The generator supports:

- explicit source-output case lists
- blank per-output acceptability fields and a blank preference field, with allowed choices of yes/no/unsure and A/B/tie/neither/unsure documented in the reviewer manifest
- physically separate private method decoding and reviewer-facing manifests
- hidden reversed controls
- balanced reviewer assignment across eligible cases
- accounting ledger entries for excluded and failed rows
- deterministic seeding so repeated runs produce stable output

### Explicit input and output contract

The CLI accepts one JSON file and a new output directory:

```sh
node --import tsx scripts/issue7-review-bundle.ts \
  --input /absolute/path/to/review-input.json \
  --output-dir /absolute/path/to/new-review-bundle
```

Each input case names the source artifact and the two matched method outputs. Every artifact supplies its stable ID, lowercase SHA-256 hash, and local input path. Eligible cases require two distinct methods. Excluded or failed cases require an explicit reason; a failed case may have no output artifact.

```json
{
  "seed": 20260924,
  "reviewerIds": ["reviewer-1", "reviewer-2", "reviewer-3"],
  "reviewsPerCase": 2,
  "hiddenReversedControlsPerReviewer": 1,
  "cases": [{
    "id": "synthetic-case-1",
    "status": "eligible",
    "source": {
      "id": "source-1",
      "artifactHash": "<64 lowercase hex characters>",
      "inputPath": "/absolute/path/to/source.png"
    },
    "outputs": [{
      "id": "output-1",
      "method": "uniform",
      "artifactHash": "<64 lowercase hex characters>",
      "inputPath": "/absolute/path/to/uniform.png"
    }, {
      "id": "output-2",
      "method": "current-reflow",
      "artifactHash": "<64 lowercase hex characters>",
      "inputPath": "/absolute/path/to/reflow.png"
    }]
  }]
}
```

The new directory contains `reviewer/manifest.json`, `private/decode.json`, and `accounting.json`. Only `reviewer/` is reviewer-facing. It contains opaque presentation/file names, pinned hashes, allowed rubric choices, and blank vote fields. The private file maps A/B back to source, output, method and input path. Accounting retains every excluded/failed case and its reason. The command refuses to reuse an existing output directory so stale files cannot survive regeneration.

## Risks and failure modes

- Leaking method names via filenames, metadata, or comments would contaminate the blind review.
- Mixing reviewer-facing records and private decoding in one exported file could expose the mapping in downstream review packages.
- Dropping failed or excluded cases would hide evidence and bias the review sample.
- Uneven reviewer assignment could make some cases under-sampled and reduce the value of controls.
- Reordering outputs or using a non-deterministic seed could make repeated runs unstable and hard to audit.

## Test cases and acceptance criteria

The test suite covers:

- valid synthetic bundle creation with deterministic output even when the explicit input list is reordered
- method-blind reviewer records that omit method names while a private decode key preserves them
- blank vote records with the allowed acceptability and preference choices declared separately
- excluded and failed rows staying in a ledger while being omitted from reviewer items
- balanced reviewer assignments across eligible cases
- hidden reversed controls that actually swap A/B and remain unmarked in reviewer records
- invalid input rejection for malformed hashes, duplicate IDs/reviewers, missing reasons, or impossible assignment counts
- a CLI export with reviewer, private-decode, and accounting files in separate locations

Acceptance requirements:

- The bundle remains deterministic for a fixed seed.
- The bundle identity changes when pinned artifact content changes, while mere input-list reordering does not change it.
- Reviewer-facing records never include raw method names, source case IDs, or input paths.
- Excluded/failed cases are visible in the accounting ledger but absent from review items.
- Balanced assignments are stable and reproducible.
- Control reversal is encoded without creating any reviewer votes.

## Implementation steps and ownership

1. Define the input schema and validation rules in the bundle generator.
2. Write regression tests covering the required behaviors.
3. Implement the smallest deterministic generator that enforces the schema and assignment logic.
4. Validate against the focused suite and direct `node --import tsx` execution.
5. Record exact red/green evidence in this issue's evidence directory.

This task is scoped only to `scripts/issue7-review-bundle.ts`, `tests/issue7-review-bundle.test.ts`, `docs/plans/issue7-review-bundle.md`, and `docs/evidence/2026-09-24-issue7-review-bundle/`.

## Validation and handoff

Validation will use the focused Node test file and direct script execution. Build/test checks will be run without modifying package.json. The final handoff will include the files changed, command outputs, limitations, and the exact evidence captured for the red and green runs.

## Execution record

- Initial Copilot red evidence: the first focused run failed because the generator module did not exist.
- Coordinator review found that the first green implementation pre-populated vote values, emitted private decoding alongside reviewer data, and encoded controls without reversing A/B. The tightened behavioral tests are run red before the corrective implementation and their exact failures are retained in the evidence directory.
- Corrective red evidence: the tightened suite first reported 0/6 passing; a later content-identity regression reported 5/6 passing before the bundle ID fix.
- Green evidence: focused suite 6/6, post-rebase repository suite 418/418, and TypeScript/Vite build passed. See [the dated evidence record](../evidence/2026-09-24-issue7-review-bundle/README.md).
- Remaining limitations: only synthetic fixtures are used; real #33 corpus outputs remain out of scope until trustworthy asset resources exist.

## September 26 bounded continuation: verified PNG export

Issue #7 remains open. Main `c4af8e7` has resource preflight, but no real corpus engine/render integration or independent votes. Reuse `df465a0` (cherry-picked as `f51a5f5`), whose CLI writes manifests only and silently ignores unknown flags.

Plan before implementation: add an explicit `--materialize` CLI mode that copies eligible source/A/B PNG bytes under the manifest's opaque filenames, verifies their pinned SHA-256 hashes, and resolves relative input paths against the input manifest. Preserve manifest-only compatibility. Validate all eligible artifacts before creating output; never open excluded/failed paths, including sealed rows supplied as excluded. Refuse existing output directories and unknown/duplicate/malformed CLI options. No corpus traversal, new data, votes, HTML UI, or shared-file changes.

Risks: supplied eligibility can be wrong (upstream split enforcement remains required); byte copying preserves embedded PNG metadata and visible method labels, so producers must supply audited neutral renders before external review. PNG signature checking is not full image validation. Materialization must not silently produce a partial pack after an input failure. Bound individual reads to 16 MiB and total unique input bytes to 256 MiB; memory and disk limits are provisional. Filesystem write failures may leave an incomplete directory; only a successful exit certifies packaging.

Acceptance checks, written before code: process-level tests verify byte/hash equality for every exported source/A/B including reversed controls; null votes and private decoding stay unchanged; excluded/failed nonexistent files are not read; relative paths work outside the manifest directory; bad hash, missing file, non-PNG, oversized file, and existing directory fail; input failures leave no output directory. Legacy manifest-only mode still works without reading paths. Test malformed CLI flags. Run focused tests red then green, `npm test`, and `npm run build`. No engine/layout/UI changes, so layout benchmarks and browser verification do not apply.

Owned changes remain generator, its tests, this plan, and `docs/evidence/2026-09-26-issue7-review-bundle/`. Existing September 24 evidence is inherited unchanged with the reused commit. Stop implementation before 2026-09-27 00:19 UTC. Push the validated `jo/issue7-review-bundle-export` branch for coordinator integration; do not close #7/#20.

September 26 red evidence: after `npm ci --cache .cache/npm` fixed the fresh checkout's missing tsx dependency, `node --import tsx --test tests/issue7-review-bundle.test.ts` yielded 6 inherited passes and 6 new behavioral failures. Materialized filenames remained `.artifact`; hash/missing/non-PNG/oversized inputs and an unknown option incorrectly exited 0. The dependency setup failure is not counted as red evidence. Full behavioral output: `reports/issue7-review-bundle/red.txt` (archived in the dated evidence directory at handoff).

Refinement before second code change: the coordinator requested protection against embedded PNG method metadata. Four valid-CRC chunk regressions (`tEXt`, `zTXt`, `iTXt`, `eXIf`) fail with exit 0 against the first materialization implementation (12 pass / 4 fail, `metadata-red.txt`). Add a conservative rendering-chunk allowlist and reject trailing/truncated chunk data; do not transform bytes or hashes. This supersedes the initial metadata-preservation limitation: embedded text/EXIF and other non-allowlisted chunks are now rejected, but visible labels and recognizable duplicate/control pixels still require producer/protocol review. Remove the newly created output directory on export failure, including disk-write failures; never remove a preexisting directory.

Final September 26/27 continuation validation: focused 18/18, full `npm test` 465/465, `npm run build` passed, and `git diff --check` passed. Distinct red/blue native PNG test fixtures confirm correct decoded byte copying including controls. Characterization tests additionally confirm regular-file/FIFO rejection and cleanup after injected manifest-write failure. No actual corpus images, reviewer votes, or quality claims were produced. See [the complete handoff and archived evidence](../evidence/2026-09-26-issue7-review-bundle/README.md). No reusable skill was warranted beyond existing repository workflow guidance.
