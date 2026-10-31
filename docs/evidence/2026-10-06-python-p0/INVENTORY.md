# Python P0 inventory (2026-10-06)

Base: main `9930871fc6f733800927d4eca23d1604cd83c421`. Upstream: `https://github.com/jhaaj08/chameleon` @ `a44a06046b0413f0785e7203955c3822e0acbc32`. Observed from the pinned checkout; no Python engine is written or claimed here. Python is selected (`docs/plans/2026-10-06-python-migration.md`); this file does not reopen that.

## A. Official field matrix
Sources: `chameleon_design_schema_v0.9.json` (title says "v0.9, provisional, pending sign-off"), `engine/resize.py` docstring and body, `engine/main.py`, `renderer/converter/*.py` grep for each key.
Root: `canvas` + `elements` required, `additionalProperties: false`. `canvas`: `width`,`height` integer >= 1, no extras. `elements`: array, minItems 1. Element object has no `additionalProperties` constraint (the samples carry non-schema `_note` / `_adversarial_note` keys).

Starter `resize()` = shallow `dict(el)` copy, then multiplies `x,width` by `W'/W` and `y,height` by `H'/H` (non-uniform stretch), and for text sets `font_size = max(1, font_size * min(sx, sy))`. Every other key, including unknown ones, is carried through unchanged (shallow: nested `style_runs` list objects are shared with the source). `self_check` in `main.py` tests only id set equality, required keys, and off-canvas.

| Field | Schema | Starter resize | Renderer (`convert.py`/`shapes.py`) |
|---|---|---|---|
| `id` | string, required | kept | n/a |
| `type` | text/image/shape, required | kept | selects branch |
| `x`,`y` | number, required | scaled non-uniformly | used |
| `width`,`height` | number >= 0, required (zero allowed) | scaled non-uniformly (image aspect distorted, breaks the ~5% rule) | used |
| `rotation` | number, default 0 | kept, NOT adapted to new geometry | used (angle) |
| `opacity` | 0..1, default 1 | kept | used (shape fill alpha multiplied in) |
| `z_index` | integer | kept | used (paint order) |
| `group_id` | string/null, default null | kept, but group is not treated as a unit | not referenced by renderer |
| `content` | string, required for text | kept | used |
| `font_family` | string, required for text | kept | used |
| `font_size` | number >= 1, required for text | scaled by min(sx,sy), floor 1 | used |
| `font_weight` | regular/bold | kept | used |
| `font_style` | normal/italic | kept | used |
| `color` | string, required for text | kept | used |
| `text_align` | left/center/right | kept | used |
| `line_height` | number, default 1.2 | kept | used |
| `letter_spacing` | number, default 0 | kept | used |
| `max_lines` | integer/null | kept | not referenced by renderer |
| `style_runs[]` | `start`,`end` int >= 0 required; `color`,`font_weight`,`font_style` | kept (offsets stay valid because content unchanged) | used |
| `asset_id` | string, required for image | kept | resolved in `brand_kit/assets` via `assets.py` |
| `fit` | contain/cover/fill, default contain | kept | used |
| `shape_type` | rectangle/ellipse/line, required for shape | kept | used in `shapes.py` |
| `fill_color` | string, required for shape | kept | used |
| `stroke_color`,`stroke_width`,`corner_radius` | optional | kept | used in `shapes.py` |
| unknown keys (`_note`, `_adversarial_note`) | not constrained | kept | ignored |

Contract rules from `resize.py` / `RULES.md` to carry into any Python engine: every source `id` exactly once, none added or removed; no asset pixel regeneration (disqualifying); non-background images keep source aspect within ~5% unless full-bleed / `fit: cover`; `font_size` may change, `font_family` and `content` must not (stage one); nothing outside the target canvas. The starter satisfies the ID rule and copy/font rules, and violates the image-aspect and (for L2 `deco_circle_1`) in-bounds rules; that is the baseline to beat.
Public samples: L1 1080x1080 -> 1080x1350 (4 elements, no groups); L2 1080x1080 -> 1600x400 (11 elements, 4 with `group_id`, `style_runs`, opacity, shapes); L3 1080x1350 -> 728x90 (17 elements, 10 with `group_id`, rotation, and `solstice_holiday_badge_2025.png`, intentionally absent from `brand_kit/assets`).

## B. Upstream provenance
- Pinned commit `a44a06046b0413f0785e7203955c3822e0acbc32`, author Ajit Kumar, 2026-09-24, "Flatten repo to starter root, drop dummy-submission". Cloned over HTTPS from the URL above; HEAD verified equal to the pin.
- File hashes: all 31 files are in `docs/evidence/2026-10-05-adobe-launch/source-manifest.json`; the checkout matched 31/31 (`docs/evidence/2026-10-06-adobe-a1/logs/manifest-verify.log`).
- License: the repository has **no LICENSE file** and the READMEs state no code license; treat reuse terms as unstated and ask before copying upstream code into a published artifact beyond what the challenge requires. `brand_kit/README.md` says the fonts are renamed Lora (headline) and Poppins (everything else), SIL Open Font License, and that the three PNG assets and fonts are **placeholders**, not final brand assets, "licensed for redistribution" only for the final kit. Fonts/assets must not be treated as production brand.
- Declared dependencies: `requirements.txt` = `Pillow>=10.0`, `git+https://github.com/CyberAgentAILab/cr-renderer` (unpinned; resolved to `a17e1fb9a732959dd6c21ae168d5ee09d74bd64f` on 2026-10-06, transitive `skia-python 144.0.post2`). Dockerfile: `python:3.11-slim` linux/amd64, apt `git libgl1 libegl1 libglib2.0-0 fontconfig`; entrypoint `python -m engine.main`. A cutover must pin the cr-renderer ref; the host needs the same system libs (see A1 findings: a missing `libEGL.so.1` silently falls back to box rendering with exit 0).

## C. TS test -> pure-Python engine behavior map
Classes: **required** = Python engine must reproduce the behavior (port as a Python test); **retain** = keep the TS test/code for the legacy frontend, nothing to port yet; **reference** = use as a design/regression oracle for a Python test, but exact TS semantics are not binding; **deferred** = not needed until a later milestone. Based on test titles and imports read from this checkout, not on running them. TS output is developer-only and never defines official correctness; schema and `RULES.md` outrank any TS snapshot.

| TS test | What it covers (from titles) | Class | Python note |
|---|---|---|---|
| `contract.test.ts` | malformed root/target, duplicate IDs, immutability, optional defaults, geometry overflow, color forms | **required** (subset) | Port: ID uniqueness/exactly-once, input never mutated (deep copy of nested dicts), target canvas validation (integer >= 1), non-finite/overflow geometry, booleans not numbers. Do NOT port internal element/group count ceilings or "unimplemented ellipse radius" rejections: they are internal TS limits, not Adobe rules. Zero width/height is legal per schema, so no blanket rejection. |
| `preservation.test.ts` | protected fields, defaults equivalence, only layout fields change, deletion detected, frozen source | **required** | This is the M3 core: only `x,y,width,height,font_size` (and reviewed rotation handling) may change; `content`, `font_family`, `asset_id`, `style_runs`, `z_index`, `group_id`, colors, `fit` kept; unknown keys kept. Port as direct dict comparisons against the source. |
| `grouped-layout.test.ts` | group members stay a unit under uniform scale + translation, backgrounds fill, identity exact, native pixel check | **required** (geometry), **deferred** (pixel part) | Group-as-unit bounds is an M4 requirement. The native-pixel assertion uses the TS native renderer; replace with the genuine cr-renderer PNG check later. |
| `crop.test.ts` | cover/contain crop math, focal points, intrinsic dimensions from PNG/SVG, native render | **reference** | The crop/focal math informs cover-vs-contain handling and aspect preservation (the starter's stretch breaks the ~5% rule). Python reads PNG size through Pillow, not the TS data-URI path; SVG handling and native render parts do not apply. |
| `engine-background-bleed.test.ts` | ungrouped background stretched to full target, grouped background not, identity keeps partial background, no-role snapshot, ids once | **required** (behavior), **reference** (snapshots) | Full-bleed background vs intentional layering must be decided from official data (no role sidecar, no id/name heuristics). The role-free byte-identical snapshot (N4) is TS-specific and not portable. |
| `official-adapter.test.ts` | TS adapter round-trip of official shapes; rejects rotation, `line` shapes, rich style_runs, `fill` fit; roles map; report option | **reference** (retain for TS CLI) | Many of its rejections are exactly what the migration plan says not to reproduce (needless schema rejection, lossy rgba->hex). Reuse the fixtures and the official-sample facts (L2 `end` overshoot by one passes through; unresolved `asset_id`; group membership kept; paint order via `z_index`). The roles-map and report-sidecar parts are TS-adapter features: **deferred**/not required. Keep the file for the TS CLI (`scripts/official-cli.ts`) until cutover. |
| `typography-invalid-measures.test.ts` | non-finite/negative/overflow measurements rejected, cache never stores bad values | **required** (if Python measures text), else **deferred** | Needed when P3 wraps/fits text with measured metrics: reject NaN/Infinity/negative metrics visibly, never cache them. Depends on the measurer chosen (cr-renderer font behavior), not on `src/measurement-cache.ts`. |
| `typography-parity.test.ts` | wrapping of long words, newlines, whitespace collapse, grapheme/ZWJ/combining marks not split, font coverage flags | **reference** | Unicode cases (combining marks, ZWJ sequences, newlines, non-covered glyphs) become Python test inputs; Python indexes by code point, JS by UTF-16 unit, so expected values must be recomputed, and `style_runs` offsets need an explicit decision. The `FONT_COVERAGE` drift check is `@fontsource`-specific: **not applicable**. Parity numbers depend on a Python-side measurer that does not exist yet. |
| `measurement-cache.test.ts` | cache reuse, immutability of returned metrics, capacity/eviction, UTF-16 ceilings, zero capacity, exceptions not cached | **deferred** | Add a cache only if profiling in P3 shows need; key must include font/resource identity and style. TS UTF-16 ceiling and capacity limits are internal and not carried over. |
| `no-valid-candidate-cli.test.ts` | numeric overflow gives structured no-valid-candidate failure, never success JSON; finite control still succeeds | **required** (principle) | Impossible/overflow cases must fail visibly (nonzero exit, structured error) and a valid-shape control must still succeed. CLI shape differs: the Adobe entry is `python -m engine.main`, which today returns 0 even on a fallback render, so the failure path must be defined for the Python entry. |

Summary: required for Python = contract/identity/immutability, protected-field preservation, group-as-unit geometry, background bleed decision, visible failure on impossible input; reference-only = crop math, Unicode/wrapping cases, adapter fixtures; deferred = measurement cache, roles/report sidecar, native-pixel assertions. Nothing is deleted from TS; the legacy suite stays runnable until a reviewed cutover.

## Limits of this inventory
Read-only: nothing was executed against the TS tests, no Python engine exists, no layout-quality, scoring, container, hardware or license-clearance claim is made. License status above is an absence of evidence in the pinned checkout, not legal advice.
