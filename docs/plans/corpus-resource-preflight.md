# Corpus resources and preflight — #33, first implementation slice

Date: September 24, 2026. Base: `80b86c9`.

## Problem and evidence

Krush's #33 request is blocked by `missing-asset`: corpus files and hashes exist,
but execution defaults to bundled fixture capabilities. Imported fonts also need
explicit family/weight bindings for Junho's renderer integration. A successful
file check does not prove rendering, source fidelity or visual quality.

Junho has now landed continuous crops, regional findings, rendered checks and a
24-case author-labelled defect pack (#6). Those changes supersede yesterday's
crop-mismatch observation. The separate #25 worktree has an active Copilot process;
this slice does not share its CLI collector files.

## Intended behavior and scope

Deliver an additive offline resource loader plus `corpus:preflight` for #33. It
loads each development/validation source with hash-verified local resources,
exposes asset data URIs and explicit font-byte bindings, and emits one status per
source/target. Test-family files and unsupported conversions are not opened.
Missing/corrupt/out-of-root/oversized inputs remain structured failures. No remote
fetch, font substitution, source repair or new resource dependencies.

The report explicitly leaves engine execution, registration/glyph coverage,
rendering, permissions clearance, source fidelity and human acceptance unverified.
`catalog-ready` means available verified bytes/references, not an acceptable design.
Adapted conversions retain their losses and cannot become faithful-quality wins.

## Ownership and implementation

- JD: new `scripts/corpus-resources.ts`, `scripts/corpus-preflight.ts`, related tests,
  npm command and handoff documentation. Preserve existing corpus check/split and
  import ledgers; no manifest edits.
- Existing `DesignResources` is reused, not extended. The loader is an input to
  a future matching measurer/renderer; it does not register fonts or claim coverage.
- Junho retains `scripts/native.ts`, typography/coverage/rendering interfaces;
  Krush retains corpus/protocol and #20 exporter. Their files remain untouched.
- Publish this bounded scope on #33 before production edits. #33 remains open;
  there is no new broad issue or competing renderer implementation.

## Tests first and acceptance checks

1. Write loader regression tests, then an importable baseline adapter using the
   current bundled validation path. Confirm a supplied external asset still fails
   as `missing-asset`; rejection tests must fail on assertions, not missing imports.
2. Cover local root resolution, source/resource hash drift, missing referenced
   assets/fonts, family names containing hyphens, duplicate/conflicting bindings,
   valid repeated bytes, default catalog isolation and preserved source data.
3. Reject URL/absolute/parent traversal and escaping symlinks; permit ordinary
   contained paths and contained symlinks. Reject nonregular files before reading.
   Enforce per-file and cumulative byte limits, including exact-limit controls.
4. Verify supported SVG/PNG/JPEG/WebP and WOFF2 envelopes explicitly. Unsupported/invalid
   formats remain visible. Font envelope checks do not prove decoding or glyphs.
5. Specify preflight matrix/accounting tests before implementing it: normal and
   adapted sources, source failure continued across targets, sealed test/unsupported
   files unopened, malformed manifests, stable IDs, invalid CLI use, resource
   payloads excluded from JSON, and no misleading engine/quality success.
6. Exercise loaded custom assets through existing reflow/SVG with a matching
   supported measurer as a positive integration control. Run the real 21-source,
   seven-target preflight without changing corpus bytes.
7. Run full npm test/build, corpus:check and diff checks. Archive concise dated
   preflight evidence, with no human votes or measured aesthetic claims.

## Risks and boundaries

Avoid treating an asset URI or font filename as a verified font/rendering result.
Check bytes before creating capabilities. Bound reads and retain failure rows.
Manifest font IDs currently encode `family-weight`; bind against actual text
requests instead of splitting arbitrarily on hyphens. Preserve source IDs while
recording manifest IDs separately. Keep file/hash diagnostics distinct from
permissions and fidelity. The existing split/ledger validator remains required
before publication; preflight is an additional preparation step.

## Execution record

- Baseline `npm test`: 406 passing tests at `80b86c9`.
- `node --import tsx --test tests/corpus-resources.test.ts`: 18 failures with the
  baseline bundled-resource adapter. The integration control failed on the real
  `missing-asset` path, with imports/setup working. All 18 passed after the loader.
- `node --import tsx --test tests/corpus-preflight.test.ts`: 11 failures with the
  initial manifest-only path (missing matrix/status/CLI behavior); all 11 passed
  after implementation. Logs are under `reports/corpus-preflight-work/`.
- The first real corpus run retained 147 rows: 42 catalog-ready, 105 blocked. Byte
  inspection found 24 WebP assets with misleading extensions, five JPEGs and
  SVGs with CSS sizing. Extend only format recognition, preserving bytes and
  recording unknown intrinsic dimensions; do not modify shared crop/render code.
  New format tests first failed on all three supported-format controls; the three
  additional external-dependency rejection controls passed. This refinement does
  not establish decoding, accurate crops or renderer readiness.
- Final targeted run: 35/35 passing; full suite: 447/447 passing on main including
  the independently landed source audit (`3b5e606`); build passes. `corpus:check`
  has zero errors and its existing no-test-families warning. Real preflight has
  21 catalog-ready sources / 147 accounted rows, with 67 unknown intrinsic asset
  sizes explicitly retained. See [dated evidence](../evidence/2026-09-24-corpus-preflight/README.md).
- No layout/font/rendering implementation changed; native benchmark/browser
  checks were not rerun for this slice. No applicable installed skill is needed
  for this TypeScript CLI/data-boundary work. Existing repository plans/scripts
  cover the repeatable process; no new reusable skill is warranted.
