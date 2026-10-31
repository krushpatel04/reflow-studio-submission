# Rebuild the approved LICA batch

Run from the repo root with Python 3.11 and the pinned official starter checked out at `a44a06046b0413f0785e7203955c3822e0acbc32`. Use a virtual environment with the starter's `requirements.txt`, `fonttools` and `brotli`. The Node dependency is the repo's existing Playwright Chromium; install its browser in the user cache if needed. Nothing needs a system install.

One command prepares resources, generates and schema-checks tasks, renders sources, calls the local `engine.resize` for seven targets, renders outputs, and writes contact sheets and measurements:

```sh
python -m scripts.lica_official.batch \
  --lica-data ../reflow-studio-spikes/lica-data \
  --upstream ../reflow-studio-spikes/chameleon-official \
  --output reports/lica-official
```

The input dataset must include `metadata.csv`, `layouts/` and `images/`. `batch-selection.json` pins the approved source bytes and metadata, all exclusions, categories, development/validation splits and seven targets. It selects 44 active designs from 51 proposed designs. Sealed template IDs, including both spares, are refused before opening any source file. Unselected layouts are not opened. The converter retains the accepted displayed-text, weight, alignment and ID rules.

`render.run(output, None, upstream, schema)` renders from an already prepared bundle with NO reference images: `raw=None` skips the `images/` check and writes no `contact-sheets/sources.png` (references feed only that sheet; no measurement uses them). Output sheets and every measurement are unchanged.

`--tasks-only` prepares the input bundle without source/output rendering. `--offline` refuses missing cached resources. `--asset-cache` and `--font-cache` accept existing caches; defaults are `.cache/lica-import/assets` and `.cache/lica-import/fonts`. Asset cache entries are either URL-SHA256 files or URL-SHA256 directories containing originals. Font cache entries follow `<font-id>/package/{files,LICENSE}`. Missing resources are fetched from the recorded URLs unless offline. A missing resource or browser capture gets at most two attempts before stopping. No fallback renderer is available.

## Modules and artifacts

- `batch.py`: metadata selection, exclusions, conversion/task generation, schema gates and size accounting.
- `resources.py`: WOFF2-to-TTF conversion, asset acquisition and shared hash storage. `font-sources.json` pins the source/license/converted hashes. Original SVGs are kept; the existing `rasterize.cjs` produces PNGs at `max(1, ceil(2 × box))` pixels, with Chromium version and exact dimensions recorded.
- `render.py`: exact font byte registration, real upstream converter/renderer, local engine execution, rule/off-canvas audits, source/output contact sheets and measurements. It never changes `engine/` files.
- `schema.py`: stdlib validator for every keyword used by the pinned official schema. Unknown keywords fail explicitly.

The output root is the portable input bundle: `manifest.json`, `input-ledger.json`, `conversion-ledgers/`, `sources/`, `tasks/`, `resources/index.json`, `resources/blobs/`, `ATTRIBUTION.md` and `package-size.json`. Each binary exists once, named by SHA256. Sources/tasks refer to raster assets by hash; the manifest associates each design with its own font hashes. Font originals, TTF derivatives, font licenses, asset originals and raster derivatives share the same store. Acquisition caches are not part of the bundle.

Rendered evidence is in `<output>/reports/`: `README.md`, `summary.json`, `source-render-ledger.json`, `task-ledger.json`, `results/`, `sources/`, `output-measurements.{json,csv}`, `measurement-summary.json` and `contact-sheets/gallery.html`. Paths in the ledgers are relative. The report records the current local engine commit, warnings and metric font hashes; rerunning after engine changes can change results. Generated evidence is not a quality score.

Coverage is a canvas-clipped enclosing box, including gaps. Reports record all-element coverage and foreground coverage, since full-canvas backgrounds otherwise make the measurement 100%. Background IDs are chosen from the source. Smallest rendered text uses the real renderer's integer font-size truncation; bitmap lettering is not measured.

`package-size.json` separates task bytes, shared binary bytes, and total bundle bytes. Reports are excluded. If tasks plus shared resources exceed 25,000,000 bytes, propose a ZIP for a private GitHub release; otherwise propose `corpus/lica-official/` with attribution. Running the command does not copy data into the corpus, make a ZIP, publish a release, post a comment or commit anything.

## Checks

```sh
CHAMELEON_UPSTREAM=../reflow-studio-spikes/chameleon-official python -m unittest discover -s tests_python -t . -v
npm test
npm run build
```

The entry-point smoke uses synthetic image-only input: it proves shared hash storage, schema checks, unchanged raw bytes, metadata-first sealed exclusion and byte-identical retries. Renderer controls prove native output dimensions and refusal of missing exact faces. Existing converter, SVG, rule audit and measurement controls remain in the suite.
