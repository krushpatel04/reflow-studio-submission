# TypeScript workbench and historical evidence

The retained internal workbench uses `reflow.design.v0`. It is optional development/reference tooling; the Python submission path is documented in the [current README](../README.md). Run the commands below from the repository root. Historical benchmark claims and ownership tables below describe their dated experiments, not current qualification.

## Shared work

| Start here | Contents |
| --- | --- |
| [Kanban board](https://github.com/users/ojedaJD/projects/7/views/1) | Live progress, priorities, and team ownership; see the [board guide](../docs/kanban.md) |
| [Current roadmap and issue priorities](../docs/roadmap-2026-10-05.md) | Revised qualification/finale gates, Figma intake and actionable dependencies |
| [September 22 historical review](../docs/roadmap-2026-09-22.md) | Original adversarial findings and scoped follow-ups |
| [Figma practice and sealed-source intake](../docs/figma-intake.md) | Completed sourcing, private sealed status and remaining admission/fidelity checks |
| [Team plan](../docs/team-plan.md) | Product direction, differentiation, prior-winner research, three-person workflow, and milestones |
| [Current status](../docs/progress.md) | What is implemented, validation results, limits, and next tasks |
| [September 26 audit and handoff](../docs/project-audit-2026-09-26.md) | Verified recent work, issue #7/#4 execution plans, blockers and dependent issue gates |
| [Independent quality and ML plan](../docs/quality-and-ml.md) | Unseen-family evaluation, blind review, candidate diagnosis, and a bounded local-model experiment |
| [ML research and teammate tasks](../docs/research/2026-09-16-ml-gap-analysis.md) | DesignSense/TASTE findings, resource limits, and scoped data/ranking/qualification issues for Krush and Junho |
| [Adversarial review](../docs/adversarial-review.md) | Reproduced failures, missing system capabilities, priorities, and presentation scope |
| [Sign-shop story](../docs/sign-shop-story.md) | Krush's reported workflow, the adaptation step Reflow addresses, and truthful demo wording |
| [Review evidence](../docs/evidence/2026-09-15-adversarial/README.md) | Fault injections, invisible grouped text, nearby-size instability, and runtime measurements |
| [Team roadmap](https://github.com/ojedaJD/reflow-studio/issues/11) | Assigned GitHub tasks, dependencies, and completion gates |
| [All 30 visual comparisons](../docs/evidence/2026-09-15/gallery.md) | Original, baseline, and selected previews directly viewable on GitHub |
| [Benchmark evidence](../docs/evidence/2026-09-15/README.md) | Complete findings, candidate data, editable documents, SVG/PNG output, and reproduction instructions |
| [Express workflow](../docs/express-workflow.md) | Walkthrough checklist, integration probe, and proposed storyboard |
| [Contributing](../CONTRIBUTING.md) | Clone/run instructions and collaboration workflow |
| [Collaborator launcher setup](../docs/collaborator-quickstart.md) | Own-account setup, optional private Obsidian context, and sharing instructions |
| [Press-play Copilot launcher](../docs/copilot-launcher.md) | Double-click launcher or npm run assist; isolated issue work, logs and usage limits |
| [Local Copilot support](../docs/copilot-workflow.md) | Isolated collaborator tasks, usage limits, and validation handoffs |
| [Development workflow](../docs/development-workflow.md) | Required problem/risk plan and tests-before-code process |
| [CI checks](../docs/ci.md) | Main-branch test/native/browser runs, external timeouts, and retained failure artifacts |
| [CI failure/pass evidence](../docs/evidence/2026-09-16-ci/README.md) | Real hosted badge regression, passing control, and retained artifacts |
| [CI parity prerequisite repair](../docs/evidence/2026-09-22-ci-parity/README.md) | Fresh native reference generation, stale-data regression, and both real browser fault controls |
| [Engine contract](../docs/design-contract.md) | Supported fields, structured errors, resources, and preservation policy |
| [Engine plan and test evidence](../docs/plans/engine-contract.md) | Issue #2 decisions, failing-before/passing-after tests, and remaining limits |
| [Grouped-layout evidence](../docs/evidence/2026-09-16-grouped-layout/README.md) | Mixed-role badge repair, native/browser checks, and remaining #5 scope |
| [Product-grid evidence](../docs/evidence/2026-09-22-product-grid/README.md) | Measured text space, rigid product grids, all-candidate review, runtime and remaining ranking tradeoffs |
| [Four-product row evidence](../docs/evidence/2026-09-22-four-product-row/README.md) | Valid long-headline square regression, readable product row, unchanged original benchmark and paired runtime |
| [Source-ranking evidence](../docs/evidence/2026-09-16-source-ranking/README.md) | Nearby stability, aspect-aware transitions, ablation, runtime, and quality limitations |
| [Grid-transition evidence](../docs/evidence/2026-09-22-grid-transition/README.md) | Measured four-product boundary, missing-candidate fix, lower-boundary limit, ablation and browser/native checks |
| [Measurement reuse evidence](../docs/evidence/2026-09-16-measurement-cache/README.md) | Bounded per-call caching, equivalent arrangement reuse, unchanged outputs and measured runtime |
| [Offline CLI/container evidence](../docs/evidence/2026-09-22-offline-cli/README.md) | Provisional command, network-disabled container smoke, deadline failures, runtime and memory observations |
| [CLI regular-input evidence](../docs/evidence/2026-09-22-cli-regular-inputs/README.md) | FIFO blocking regression, regular-file/symlink policy, structured failures and process cleanup |
| [Hosted container smoke evidence](../docs/evidence/2026-09-22-hosted-container-smoke/README.md) | Main-branch image build, network-disabled editable-output/error assertions and retained failure evidence |
| [Crop and layering evidence](../docs/evidence/2026-09-24-crop-layering/README.md) | Shared continuous focal crops; browser/native crop and rendered-visibility parity with fault controls; paired occlusion/contrast/collision/crop controls; the author-labelled defect-control pack; unchanged selections |
| [Corpus resource preflight](../docs/evidence/2026-09-24-corpus-preflight/README.md) | Hash-verified local assets/fonts, all 147 source-target rows, and explicit rendering/quality limits |
| [Contract verification evidence](../docs/evidence/2026-09-16-engine-contract/README.md) | Mutation detection and unchanged benchmark output after hardening |

For the hackathon, completed work can be committed and pushed directly to `main`; PRs and reviewer approval are optional. Plans, tests-before-code, and required verification still apply. See [contributing](../CONTRIBUTING.md).

The source, tests, fixture assets, font dependencies, and benchmark scripts are included in this repository. Download or clone the repository to open the archived HTML report locally without installing the application.

## Run it

Requires Node.js 22.12 or newer. Node 24 was used for the first run.

```sh
npm ci --cache .cache/npm
npm run dev
```

Open the URL printed by Vite. The workbench lets you choose a design, change its headline, compare baseline and selected layouts, inspect findings, add a custom size, and export editable JSON. Edits reset when you switch designs or reload. No account or API key is required.

Use **Inspect** on any preview for Fit, 100% or 200% artwork review. Switch between Reflow and Baseline inside the preview without losing zoom or changing the exported result. Previous/Next moves through formats. Escape or Close returns to its button; large artwork scrolls inside the dialog. Mobile opens on the artwork; use Design settings to reveal the source, headline, custom dimensions and JSON export controls. The local HTTP server must remain available for worker/font resources; a disconnect retains the last result and exposes Retry. [Current viewer evidence](evidence/2026-10-29-studio-polish/README.md).

The interface uses Spectrum Web Components with the Express theme. The wide comparison workbench is a development tool; the eventual add-on panel and native document workflow still need in-host validation.

## Check and compare

### Provisional offline command

This command accepts one `reflow.design.v0` JSON file and integer target dimensions (1–8000). It emits one `reflow.cli.v0` JSON object on stdout with the selected editable `output`, `strategy`, `diagnostics`, source/target IDs and timing/memory observations. Errors are JSON on stderr with a nonzero exit status. Diagnostics can contain unresolved findings even when an editable output is returned. This internal format and its bounds are provisional, not Adobe's official schema or runtime contract.

```sh
npm ci
npm run --silent reflow:cli -- --input examples/cli-design.json --width 1080 --height 1080 > result.json
docker build -t reflow-offline:local .
docker run --rm --network none --memory 768m --pids-limit 64 -v "$PWD/examples:/inputs:ro" reflow-offline:local \
  --input /inputs/cli-design.json --width 1080 --height 1080 > result.json
```

The optional `--deadline-ms` defaults to 30000 and accepts 1–120000. It starts when the worker launches, includes native font setup and layout, and kills the worker if exceeded. Exit code 124 means timeout, 2 means invalid input/resource, and 1 means worker failure. The supervisor caps input at 2 MiB, child heap at 512 MiB and buffered output at 20 MiB. A timeout or resource failure produces no output design; callers should retain the source and handle the structured failure. All limits are provisional pending the official contract. The command uses bundled fonts/assets and no model or external API. The container build installs locked dependencies; the documented run disables its network.

`--input` must resolve to a regular file. A symbolic link is supported when its resolved target is a regular file. Directories, FIFOs, devices, sockets, and links resolving to those unsupported types fail before reading with exit 2, empty stdout, and structured code `unsupported-input-type`. Missing and broken-link paths use `input-read-failed`. This type check prevents ordinary special-file blocking reads; it is not a guarantee against filesystem replacement races or general storage latency. See the [process-level regression evidence](../docs/evidence/2026-09-22-cli-regular-inputs/README.md).

`timing` separates worker JSON parsing, validation, native font/asset setup and layout; `processWallMs` measures worker launch through exit as seen by the supervisor and `peakRssKiB` is the worker's reported peak resident memory. Parent startup/file reading and container startup are outside these fields. No raster or SVG export is performed by this command.

```sh
npm test
npm run build
npm run verify
npm run benchmark
```

- `test`: invariants, unchanged copy/assets/styles, identity resizing, grapheme handling, and deliberately broken layouts.
- `build`: strict TypeScript checking plus a production browser build.
- `verify:browser`: headless Chromium runs the complete `/verify.html` acceptance page and rejects incomplete or failed reports; see [CI setup](../docs/ci.md).
- `verify`: all 30 layouts with locally registered font metrics and PNG rendering.
- `benchmark`: writes `reports/latest/index.html`, all candidate results, and 70 PNG/SVG/document triples. Open the HTML file directly or visit `/reports/latest/index.html` on the dev server. SVG files embed their fonts; the report needs no CDN.
- `review:probes`: records adversarial diagnostics and example images under `reports/adversarial-latest/`. This is an exploratory report, not a passing quality gate.
- `review:stability`: sweeps nearby sizes and observed layout transitions, with previous/current/ablation comparisons in `reports/stability/`.
- `review:stability-runtime`: compares the pre-ranking engine and current engine in paired native runs; requires the recorded base Git commit.
- `review:stress`: measures dense-text reflow separately; the recorded 100-element case took about 28 seconds. Timings vary by machine and load.
- `review:measurements`: compares the engine before/after measurement reuse on 30 fixture targets and four dense cases, asserting complete output equality apart from timing; requires base commit `0757de5` locally. See the [reviewed snapshot](../docs/evidence/2026-09-16-measurement-cache/README.md). This is a performance observation, not a runtime deadline.
- `review:products`: compares all alternatives with the engine at `36b31fa`, records grid-removal ablation and paired native runtime on 45 authored development cases, and renders every product candidate under `reports/product-grid/`. See the [reviewed snapshot](../docs/evidence/2026-09-22-product-grid/README.md).
- `corpus:check [manifest]`: checks an independent-evaluation corpus manifest (default `corpus/manifest.json`), its adjacent `split-lock.json`, and the default LICA import-outcomes ledger for split and target drift, missing provenance, undisclosed conversion loss, file hash drift, and selected-input accounting. It exits nonzero on errors and warns while the corpus is below pilot size. The LICA ledger records a disposition for all 1,148 metadata layouts; the selected corpus still has 21 designs from ten seen development/validation families, with no sealed test families. See the [corpus manifest plan](../docs/plans/corpus-manifest.md), [split-freeze plan](../docs/plans/frozen-corpus-splits.md), [import-outcomes plan](../docs/plans/lica-import-outcomes.md), and [September 22 review](../docs/roadmap-2026-09-22.md).
- Browser acceptance checks: visit `/verify.html` while the dev server is running. Results appear at the top. This runner dispatches DOM events and checks real SVG glyph bounds; manual pointer, keyboard, accessibility, and mobile checks remain separate.

After dependencies are installed, the engine, fixtures, fonts, and report generation work locally without external API calls. The provisional offline container and hosted smoke gate are implemented. Adobe's official schema/renderer and complete independent reproduction remain integration work.

## First benchmark

The table below describes the [September 15 snapshot](../docs/evidence/2026-09-15/README.md). Fresh `reports/latest/results.json` reflects the current engine; see [progress](../docs/progress.md) for subsequent changes. Timings vary by machine and load.

| Diagnostic | Uniform baseline | Selected layouts |
| --- | ---: | ---: |
| Cases completed | 30 | 30 |
| Geometry/content errors detected | 0 | 0 |
| Readability warnings | 42 | 6 |

The six remaining warnings are small product labels/prices in the square product design. “Readable” is currently a simple proxy: a font smaller than 9px at a normalized 360px short edge triggers a warning. It is not an accessibility standard or Adobe score.

The selector uses the same diagnostics as this report, so improvement on these counts is expected and does not independently establish visual quality. All designs are authored synthetic fixtures, including the artwork. There is no held-out benchmark yet. Review the images, especially product group layouts and deliberate whitespace, before calling the output better.

## Shared interface and ownership

```ts
reflow(source: Design, target: Target, measure: Measure, resources?: DesignResources): Result
```

| Owner | Files | Next deliverable |
| --- | --- | --- |
| [ojedaJD](https://github.com/ojedaJD) — engine | `src/model.ts`, `src/engine.ts`, `src/evaluate.ts` | Harden validation and preservation, fix mixed-role groups, improve layout stability, bound execution |
| [JunhoHwoang](https://github.com/JunhoHwoang) — typography/rendering | `src/typography.ts`, `src/render.ts`, `scripts/native.ts` | Verify font behavior and rendered visibility, contrast, layering, and crops |
| [krushpatel04](https://github.com/krushpatel04) — evaluation/integration | `src/fixtures.ts`, `scripts/benchmark.ts`, `docs/express-workflow.md` | Establish independent evaluation and prove an editable native round trip |

`src/main.ts` and `src/style.css` implement the comparison workbench. Coordinate edits there with the other two teammates. The full proposal is in [the team plan](../docs/team-plan.md).

## Current limits

- Starts with structured elements; no image-to-layer extraction or Adobe document import.
- Only explicit, flat groups. No inferred relationships, nested groups, rotations, paths, masks, rich text, or manual per-format exceptions yet.
- Uniform, vertical and image/text split candidates, plus up to four whole-product-group grids for conservative eligible designs. The fourth uses a single row of exactly four groups when width/height is at least 0.8; source-aware ranking can still select the original layout on wider pages. Source-sized output uses identity. There is no model or aesthetic evaluator; [grid eligibility and limits](../docs/design-contract.md#whole-product-group-grids) remain narrow.
- Validation checks the [document/resource contract](../docs/design-contract.md), and diagnostics enforce inventory, paint order, copy, protected styles, IDs, asset references, and group membership. Explicit groups now share one rectangle transform across roles, with separation diagnostics; see the [grouped-layout evidence](../docs/evidence/2026-09-16-grouped-layout/README.md). General visibility and layout quality remain open.
- Image cropping uses continuous focal points shared by SVG and PNG. Dimensions are read only from SVG/PNG data URIs; other assets fall back to coarse alignment in SVG. The default resource catalog and native benchmark use bundled examples; engine/SVG callers can supply their own resource capabilities.
- Text wrapping collapses repeated whitespace in the preview while preserving the original string in the document. Full multilingual shaping, font fallback, and rich typography need dedicated coverage.
- Native measurement/rendering registers bundled subsets through coverage-aware aliases. Supported browser/Node text has parity probes; uncovered glyphs and RTL remain explicit warnings. Geometry checks cannot recognize every occlusion or judge hierarchy and aesthetics.
- Arbitrary extreme sizes may produce explicit warnings/errors. “Checks clear” means only that the implemented checks found no issue.
- Browser acceptance evidence and outstanding integration work are tracked in [progress](../docs/progress.md). Competition eligibility, the official input/output contract, and runtime limits remain to be confirmed against released rules.

Krush's family business is presentation context only. Features, benchmarks, and delivery gates target general structured-design reflow and the Adobe workflow; they do not depend on that business.

## Fonts and components

Inter and Source Serif 4 are bundled through Fontsource under the SIL Open Font License. Their license texts are in [THIRD-PARTY-NOTICES.md](../THIRD-PARTY-NOTICES.md). Spectrum components are provided by Adobe under Apache-2.0. Our abstract fixture illustrations are authored SVGs.
