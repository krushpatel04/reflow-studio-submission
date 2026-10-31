# September 26 review-bundle export handoff — partial Issue #7 / #20

## Outcome and scope

The existing seeded manifest generator (`df465a00f269af591b476f912e658ad22cab3072`, reused unchanged as `f51a5f5`) could name reviewer artifacts but could not export them. This continuation adds an opt-in verified PNG export on top of main `c4af8e7`. It does not complete #7 or #20, run the real corpus engine, contact reviewers, or create any votes.

Owned changes: `scripts/issue7-review-bundle.ts`, `tests/issue7-review-bundle.test.ts`, [the plan](../../plans/issue7-review-bundle.md), and this directory. The September 24 evidence directory is inherited unchanged from the reused commit. No shared README/progress/package files were edited.

## Use

```sh
node --import tsx scripts/issue7-review-bundle.ts \
  --input /absolute/path/to/review-input.json \
  --output-dir /absolute/path/to/new-bundle \
  --materialize
```

The input contract remains in the plan. Relative artifact paths resolve against the input JSON directory. Without `--materialize`, the existing manifest-only mode remains available and does not read artifact files. Unknown, duplicate, or missing-valued CLI options now fail rather than silently ignoring an intended mode.

A successful materialized export contains:

- `reviewer/manifest.json` and its opaque `.png` source/A/B artifacts, including reversed controls; all acceptability/preference fields remain `null`.
- `private/decode.json`, readable only by its owner on POSIX, under an owner-only private directory. It retains original method IDs and paths.
- `accounting.json`, retaining excluded/failed rows and reasons. Share only `reviewer/`, not the bundle root.

Only eligible assignments cause artifact file access. Excluded/failed files, including the synthetic sealed row, are never opened. This is a caller-supplied status boundary, not an independent corpus split-lock check. A caller must apply the real split/fidelity/resource policy upstream.

Pinned SHA-256 hashes are checked against the exact copied bytes. Artifact handles must identify regular files; FIFO opens are nonblocking and then rejected. Reads are bounded to 16 MiB per file and 256 MiB of unique resolved-path input bytes, with the verified bytes retained for writing. These are input-buffer limits, not a total process-memory or output-disk quota. Repeated presentations create separate opaque output files.

All eligible input checks complete before output-directory creation. Existing output directories are refused and preserved. Artifacts and private/accounting files are written before the reviewer manifest; ordinary write errors remove the newly created directory. A killed process or failed cleanup can still leave partial files: consumers must require successful process exit, not directory existence.

## Metadata and blinding boundary

A conservative chunk allowlist permits `IHDR`, `PLTE`, `IDAT`, `IEND`, `tRNS`, `sRGB`, `gAMA`, `cHRM`, `pHYs`, `sBIT`, and `bKGD`. Text, compressed text, international text, EXIF, ICC profiles, unknown/private chunks, and trailing/truncated data are rejected, not stripped. Original and exported hashes therefore remain equal. Renderers emitting extra chunks need a separately audited neutral render and a new pinned hash.

This is signature/chunk framing inspection, not a full PNG decoder, CRC checker, or visual assessment. It cannot remove method labels painted into pixels, recognize stylistic identity, establish faithfulness, or prove complete blinding. Public artifact hashes and recognizable repeated pixels can reveal duplicate/reversed presentations; no claim of cryptographically hidden controls is made. The generator still relies on trustworthy neutral renders and an independently reviewed protocol.

## Test-first evidence

1. After fresh-checkout dependency installation, the original six tests passed and six new tests failed for missing export/validation behavior. [First red run](red.txt): filenames stayed `.artifact`; invalid artifact inputs and an unknown option incorrectly exited zero.
2. The initial export implementation passed those tests, but four additional metadata regressions failed because text/EXIF chunks were accepted. [Metadata red run](metadata-red.txt): 12 passed / 4 failed. Metadata checks followed that failure evidence.
3. [Final focused run](green.txt): 18 passed / 0 failed. It includes distinct red/blue output pixels, correct decoded bytes in every source/A/B and control, excluded/failed nonexistent inputs, null votes, existing-directory refusal, hash/missing/non-PNG/size failures, metadata rejection, directory/FIFO rejection, and cleanup after an injected final-manifest write failure.

Commands:

```sh
node --import tsx --test tests/issue7-review-bundle.test.ts
npm test
npm run build
git diff --check
```

Full-suite/build outcomes are recorded in [validation.txt](validation.txt). No engine, layout, font, or UI behavior changed; layout benchmark and browser checks were not required for this packaging slice. All fixtures are controlled synthetic data. No corpus quality score or real reviewer result was generated.

## Remaining steps for the coordinator

1. Integrate both branch commits (the reused generator and this export slice), or take the complete branch diff against `c4af8e7`. Do not cherry-pick only the export commit onto a checkout lacking the generator.
2. Finish actual eligible development/validation corpus engine/render integration with pinned source/output/render/font/asset provenance and unfiltered failed/quarantined rows. Catalog readiness alone is insufficient.
3. Audit neutral rendered inputs, enforce frozen split exclusions upstream, and build a real pack. Keep final test families sealed.
4. Freeze the review/analysis protocol, collect real independent votes, preserve disagreements/ties, and aggregate by family with uncertainty. Add the remaining dimension-specific defect labels and generation-versus-selection analysis required by #20/#7 separately.
5. Review whether artifact hashes should remain public and how reversed-control concealment should work before treating reviewer consistency as independent evidence.

Skill assessment: no new skill created. This bounded exporter is repository-specific; existing plan/test/evidence guidance already covers the repeatable workflow.
