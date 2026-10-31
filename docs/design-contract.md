# Editable design contract: reflow.design.v0

> **Current navigation — October 8:** The [repository audit](repository-audit-2026-10-08.md) records delivered Python work and remaining evidence gaps. The [Tuesday work queue](execution/2026-10-13/README.md) controls this run and reserved collaborator ownership. Older dated source/migration/pause statements below are historical; Adobe remains authoritative.


This is Reflow's **provisional internal format**, not an official Adobe schema or a native integration. An eventual adapter must map supported features explicitly and report unsupported content. Structural preservation does not establish visibility, visual quality, font coverage, licensing, or a successful editable round trip.

Implementation: [model](../src/model.ts), [resources](../src/resources.ts), [evaluator](../src/evaluate.ts). Background and evidence: [issue #2 plan](plans/engine-contract.md).

## Validation and errors

`validateDesign(input: unknown)` asserts the structure without resolving resources. `validateResources(input, resources?)` first validates structure, then checks asset availability and exact font family/weight support. `reflow` and both render entry points perform these checks before measurement or rendering. `evaluate` validates its source, returns error findings for malformed candidates, and evaluates preservation/geometry for structurally valid candidates. It does not validate resources; its optional fourth `resources` argument (default `BUNDLED_RESOURCES`, passed through by `reflow`) is used only to read image dimensions for crop diagnostics. The exported `uniform` helper assumes already validated inputs; use `reflow` at an input boundary.

Failures throw `DesignValidationError` with `category`, `code`, `path`, and an actionable message. Validation reports the first problem in deterministic traversal order. Example: `$.elements[2].focalPoint.x: Expected a finite number between 0 and 1.`

| Category | Meaning | Example codes |
| --- | --- | --- |
| `structure` | Missing/malformed fields, invalid values, duplicate IDs or broken group references | `invalid-type`, `invalid-value`, `duplicate-id`, `unknown-group` |
| `unsupported` | Unknown schema, element type, or field needing an explicit adapter/implementation | `unsupported-schema`, `unsupported-element`, `unsupported-field` |
| `resource` | Well-formed reference whose asset or font is unavailable in the selected environment | `missing-asset`, `unsupported-font` |

Inputs are plain data objects, as from decoded JSON. No coercion, field stripping, normalization, fallback fonts, or source mutation occurs. JavaScript accessors/proxies and throwing resource callbacks are not an untrusted-code sandbox. Unknown fields are rejected at every object level so unsupported content cannot silently disappear. Optional `undefined` values are treated as omitted; `null` is invalid.

## Supported fields

All fields are required unless marked optional. Nonempty strings must contain a non-whitespace character; IDs are opaque strings and remain unchanged. Numeric values must be numbers, not numeric strings, and must be finite.

| Object | Fields and limits |
| --- | --- |
| Design | `schemaVersion: 'reflow.design.v0'`; nonempty `id`, `name`, `provenance`; string `description` (may be empty); `width`, `height` in **[1, 8000]**; `background` color; `groups`; **1–100** `elements` |
| Group | Nonempty unique `id`; string `label` (may be empty). At most **100** flat definitions. Unused groups are allowed. Group IDs have their own namespace, independent of element IDs. |
| Every element | Nonempty unique `id`; supported `type`; `role: 'content' \| 'background' \| 'decoration'`; finite `x`, `y`; positive finite `width`, `height` with finite right/bottom endpoints; optional `groupId` referencing a defined group; optional `opacity` in **[0, 1]**, default **1** |
| Text | `type: 'text'`; string `text` of at most **10,000 UTF-16 code units**, including empty text; nonempty `fontFamily` naming one family using letters/numbers/spaces/underscore/hyphen and starting with a letter/number; positive `fontSize`; `fontWeight` in **[1, 1000]**; `lineHeight` at least **1**; `color`; optional `align: 'left' \| 'center' \| 'right'`, default **left** |
| Rectangle | `type: 'rect'`; `color`; optional finite nonnegative `radius`, default **0** |
| Ellipse | `type: 'ellipse'`; `color`. Radius is not supported on ellipses. |
| Image | `type: 'image'`; nonempty `assetId`; `fit: 'contain' \| 'cover'`; `focalPoint: { x, y }`, each coordinate in **[0, 1]** |
| Target | Nonempty `id`, `label`; `width`, `height` in **[1, 8000]**. Checked by `reflow` with paths beginning `$target`. |

Colors support hexadecimal RGB/RGBA only: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, case insensitive for validation. Named colors, CSS functions/variables, gradients, and other paint definitions need an adapter. Preservation compares the original color strings exactly.

`provenance` can record `synthetic`, author attribution, or a permission/source description for a supplied design. It is caller-provided metadata; validation does not establish ownership or permission. Original copy, whitespace, metadata and resource references remain verbatim in output.

Zero opacity is valid, including on content. Off-canvas source geometry, deliberate overlaps, empty text, large corner radii and fractional dimensions are structurally legal. Geometry/readability diagnostics are separate from structure. These provisional count/size ceilings do not guarantee bounded execution or sensible geometry at extreme numeric magnitudes.

Unsupported features include nested/inferred groups, rotation, paths, masks, rich text, gradients, effects, and arbitrary additional metadata fields. Explicit group members share one uniform rectangle scale and translation, regardless of role, except a group with a plate and a label under the 6px floor after scaling (P6): that group is scaled rigidly by one per-group k >= the canvas scale (members keep relative rects and rotation) and repacked; if no k packs the geometry stays the uniform placement and (P10) a sub-floor label font is raised to 6px in place only when its measured text fits its own scaled box (all sub-floor labels of the group or none; not with letter_spacing). This is not a floor guarantee: a label whose text does not fit stays under 6px. The label keeps its box, so it stays top-aligned in the plate (P9) and the label/plate proportion changes. A group participates in content layout when any member is content. Groups containing only background/decoration retain a uniform fallback; only ungrouped backgrounds may stretch to fill the target. Text fitting inside transformed rectangles remains legal.

## Resource and capability boundary

The engine has no dependency on fixture document IDs. Callers may supply their own synchronous, deterministic resource resolver and matching font measurer/renderer:

```ts
import { reflow } from '../src/engine';
import { renderSvg } from '../src/render';
import { validateResources, type DesignResources } from '../src/resources';

const resources: DesignResources = {
  resolveAsset: id => availableImageUris.get(id),
  supportsFont: (family, weight) => registeredFonts.has(`${family}:${weight}`),
};
validateResources(input, resources); // Also narrows input to Design.
const result = reflow(input, target, measure, resources);
const svg = renderSvg(result.selected.design, measure, undefined, resources);
```

`availableImageUris`, `registeredFonts`, `target`, `input`, and `measure` above are caller-supplied. `resolveAsset` returns a nonempty renderable URI or `undefined`. It must return the same result for the duration of an operation. `supportsFont` declares that the exact family/weight is available to the actual measurer/renderer; it must not promise unregistered resources. These callbacks do no automatic fetching, font loading, URI decoding, or image-content verification. The host owns trusted asset loading and any URI/network policy. Validate resolved bytes and font/glyph coverage in that host before declaring support.

Existing three-argument `reflow(source, target, measure)` and `renderSvg(design, measure, metrics?)` calls use `BUNDLED_RESOURCES`. The default includes `orbit`, `landscape`, and `product` from [the local asset catalog](../src/assets.ts), Inter weights 400/500/600/700 and Source Serif 4 weight 600. Other structurally valid fonts, weights, or asset IDs receive resource errors unless supplied. The old `ASSETS` export from fixtures remains compatible. The native PNG benchmark stays bundled; custom native resources require a host renderer/loader and are outside this change. Neither the default nor a custom declaration proves full multilingual glyph coverage.

### Glyph coverage and renderer parity

`supportsFont` declares that a family/weight is registered. It never sees the text, so it cannot decide whether the glyphs in that text exist. Coverage is a separate, additive diagnostic: [font-coverage.ts](../src/font-coverage.ts) holds each bundled family's declared codepoint ranges and `evaluate` reports any text outside them as an `unsupported-glyph` **warning**, naming the element and the offending codepoints.

It is a warning rather than a resource error deliberately. The bundled `after-dark` fixture's `ticket-label` reads `SAVE YOUR SEAT  →`, and U+2192 is in no Inter subset, so a hard error would reject a design that renders acceptably. The warning keeps the substitution visible in the workbench, `npm run benchmark` and the archived reports instead of hiding it. Right-to-left text is reported through the same finding regardless of declared coverage, because `layoutText` and `renderSvg` position tspans left to right with no bidi handling.

The ranges come from the `unicode-range` declarations `@fontsource` ships, re-parsed by the test suite so a dependency bump cannot silently invalidate them. That is Google's subsetting metadata, not a `cmap` read: a font whose declared range overstates its glyphs would not be caught.

Two renderer-parity constraints follow from this and are enforced by tests:

- **Native registration must match what the browser loads.** `src/main.ts` imports the full `@fontsource` stylesheets, so the browser resolves seven Inter subsets per weight and six Source Serif 4 subsets. `GlobalFonts.registerFromPath` does **not** union files registered under one family name — only the first registration for a `(family, weight)` is consulted — so [native.ts](../scripts/native.ts) registers each subset under a private alias and measures and draws text in runs by covering subset. A comma-separated fallback list is not an alternative: Skia shapes the whole string with one font chosen from its leading character and mismeasures the rest.
- **Fitted sizes keep clearance.** `fitText` fits against `width × (1 − 0.005)` rather than converging onto the wrap boundary. A size whose longest line ends flush against its box can wrap one way in the browser and another natively, making a preview disagree with its export. The 0.5% figure is measured against the corpus, not assumed: relative width differences between Chromium and Skia for supported single-line text have a median of 0.01% but reach **0.29%** on short strings dense with kern pairs, which Blink applies in `measureText` and Skia does not. Widening `fitText`'s old `+0.01px` acceptance epsilon would not have achieved this — that epsilon admits overflow, so enlarging it permits more of it while the search still converges onto the boundary.

Rendered lines normalize whitespace: `layoutText` splits paragraphs on `/\s+/`, so runs of spaces and tabs collapse and leading/trailing whitespace is dropped from the rendered result. The document's `text` is never modified, so preservation is unaffected, but rendered output does not reproduce source spacing.

Declared coverage, matched registration, and fit clearance together establish that the renderers agree on supported content. None of them establishes multilingual capability: only Latin, Greek, Cyrillic and Vietnamese ranges are covered at all, and bidi, complex shaping and colour emoji remain unsupported and reported.

### Measurement reuse

The measurer must be synchronous, deterministic for its text/element inputs during one operation, and must not mutate those inputs. `reflow` now caches repeated query strings for the **same immutable element object** during a call. Different objects, including fitting iterations and identically styled elements, have separate contexts; no subset of font properties is assumed to describe a caller's full measurement behavior. New calls start empty so newly loaded fonts or different measurers cannot see stale results. Returned metric objects are copied; exceptions and nonfinite/negative metrics are not cached or hidden.

The cache retains at most **4,096 entries** and **262,144 UTF-16 query code units**, evicting oldest entries when full and bypassing oversized queries. These ceilings bound cache retention only, not process memory or execution time. When explicit layout units lack either images or non-image content, stack and split use the same arrangement. The completed stack candidate is copied into an independent split entry without repeating fitting/evaluation. All three public entries, source preservation, diagnostics and ranking remain unchanged. See the [#8 slice plan](plans/measurement-cache.md); deadlines, cancellation/fallback and offline packaging remain pending.

## Preservation policy

The evaluator rejects extra, missing, replaced, or duplicate elements, changed element types, changed element paint order, changed groups/labels/membership, and protected content/styles **across all roles**. Group definition array order is immaterial; element array order is paint order, back to front. Existing valid layering remains allowed by collision diagnostics.

Only these layout fields may change:

- Design `width` and `height`.
- Every element's `x`, `y`, `width`, and `height`.
- Text `fontSize`, for scaling and fitting.
- Rectangle `radius`, which existing transforms scale.

All other supported values remain protected: document ID/name/description/provenance/background/schema, element IDs/types/roles/groups/opacity, exact text, font family/weight/line height/alignment/color, shape color, asset identity, image fit and focal point. Omitted opacity equals 1 and omitted text alignment equals left when comparing. Rectangle radius is layout-controlled, including adding/removing its default. No blanket exemption exists for numeric properties. Changing originally visible content to opacity zero is a preservation failure; an unchanged transparent source is legal.

`group-geometry` reports member rectangles that cannot share one positive uniform scale and translation, comparing in source coordinates with a small relative tolerance. It applies across all roles and contributes to the error count before readability ranking. This is a group relationship check, not proof of visible output.

`missing-content` retains identity/type/copy/asset/inventory failures and duplicate output IDs. `preservation` reports protected style/metadata/order changes. `invalid-design` marks malformed candidates and skips geometry/measurement, returning finite diagnostic metrics. Messages contain a document path and element IDs when available. A malformed source throws a validation error. Geometry metrics still run for structurally valid preservation failures; they are diagnostic observations, not permission to publish corrupted output.

Preservation checks cannot prove visibility: a geometrically legal move may obscure content while leaving inventory and styles intact. The rendered-visibility checks below cover that separately. Broader group layout/candidate quality (#5), transition quality (#12), bounded runtime (#8), independent evaluation and official/native integration remain separate work.

## Image crops and rendered visibility

**Crop geometry.** [crop.ts](../src/crop.ts) defines one crop for SVG, PNG and diagnostics. `cover` scales the asset uniformly by `max(frame/asset)` and `contain` by `min(frame/asset)`. The scaled asset is offset by `(frame − scaled) × focalPoint` on each axis, the same as CSS `object-position: fx fy`. Focal values 0, 0.5 and 1 reproduce the former `xMin/xMid/xMax` output; intermediate values are no longer quantized. Under `cover`, the focal point is always visible and keeps its relative position in the visible window. Both renderers draw that rectangle clipped to the element rectangle. Intrinsic dimensions come from SVG `width`/`height` (else `viewBox`) or PNG headers in data URIs. For any other URI, SVG keeps the former nearest alignment and crop diagnostics are skipped. That is an approximation, not a verified crop.

**Diagnostics.** All of these compare output with source by element ID, so layering, contrast or cropping present in the source is legal. The engine is judged only on what it makes worse. Each finding names the affected element (and, for occlusion, the layers responsible) so a candidate generator can repair it.

| Kind | Severity | Reported when |
| --- | --- | --- |
| `occlusion` | error | A content element's sampled area is obscured by later-painted rect, ellipse or image layers of **any role** by more than 0.10 over its source obstruction. Coverage composites opacity and colour alpha as `1 − Π(1 − α)`. |
| `low-contrast` | error | The share of a content text element's known samples reaching WCAG 3:1 against the composited backing falls more than 0.10 below the source share. The backing is the background plus earlier-painted shapes, with alpha. |
| `collision` | error | As before, except that an originally overlapping pair stays exempt only while its overlap share of the smaller box grows by at most 0.10. |
| `crop-loss` | warning | An image of any role with known dimensions retains under 50% of its source-visible asset region. |

Because `crop-loss` now covers images of any role, warning counts can be higher than in earlier builds for cropped background and decoration images. This widens diagnostics only; it is not a layout change.

Each of these findings carries an optional `region` in design coordinates:

- `occlusion`: the extent of samples at least half hidden.
- `low-contrast`: the extent of illegible samples.
- `collision`: the overlap rectangle.
- `crop-loss`: the element frame.

`region` is additive, and other kinds omit it.

Text is sampled over laid-out line boxes (alignment, measured line width, ascent + descent), not glyph ink. Images are treated as opaque within their drawn region, and a backing under an image is unknown and excluded from contrast. A text element entirely over imagery gets no contrast verdict. Thresholds are provisional engineering values, not calibrated perception. `crop-loss` measures retained region, not subject retention; the schema has no subject box. **Rendered verification.** [rendered-visibility.ts](../src/rendered-visibility.ts) checks visibility independently on actual pixels. It is used for verification and the defect-control pack, not for selection. An element's core pixels are where it alone renders the same over black and white; text is drawn in fixed black ink over its full laid-out height. A text core pixel counts as legible at ≥ 3:1 contrast between the full render and the render without the element; other core pixels count as visible when they differ there by ≥ 32 in some channel. A share drop of more than 0.10 against the source is a defect, and fewer than 20 core pixels gives no verdict. This covers text over imagery and glyphs clipped by their own box, which the geometric evaluator cannot judge. Native (Skia PNG) and browser (Chromium SVG with embedded bundled fonts) verdicts must match on every pack case. The official Adobe renderer has not been checked.

See the [plan](plans/focal-crop-and-layering.md) and [evidence](evidence/2026-09-24-crop-layering/README.md).

## Source-aware selection

The available strategy identifiers are exported as `CANDIDATE_STRATEGIES`; consumers must handle the additive `group-grid-1` through `group-grid-4` entries. Existing identity/uniform/stack/split entries and hard-check precedence are retained.

`reflow` retains its original alternatives and return/document/metric structures, with up to four additional eligible product grids. Selection first minimizes hard diagnostic errors. Among equally feasible candidates, [ranking.ts](../src/ranking.ts) balances the worst squared readability shortfall against source composition change. Reading size uses the existing 360px short edge and 9px threshold. Font growth above 9px earns no extra reward; empty text is excluded. Warning counts and thresholds remain unchanged and visible, but a slightly warned composition may be preferred to a large rearrangement.

Composition compares the candidate to a centered uniform transform of its source:

- Element-center movement, normalized by the target short edge.
- Changes to common source left/center/right and top/middle/bottom alignments.
- Changes to signed pair gaps, including deliberate overlapping spacing.
- Changes to relative text sizes and image prominence.
- Cover-image frame aspect change as **crop risk**, not measured asset pixel loss. Contain images do not incur this crop term.

The five bounded terms have equal weight. Their mean is multiplied by the smaller of the target/source aspect ratio and its reciprocal, so the source preference relaxes smoothly as formats diverge. The total soft cost is that weighted penalty plus eight times the worst squared reading deficit. These fixed heuristic choices are documented for ablation, not fitted aesthetic scores. Ties prefer identity/uniform, stack, split, then product grids in ascending column order. `compareCandidates(a, b, source)` exposes this ordering; the existing two-argument call retains the previous ordering for compatibility and comparison scripts.

Uniform letterboxing has no source-change penalty. This intentionally preserves healthy sparse layouts and nearby geometry, but can leave large empty margins. Discrete transitions between candidates can still jump. No mutable history, dimension deadband, or fixture ID controls selection. Ranking still uses its crop-risk proxy. Occlusion, contrast and measured crop retention are separate evaluator findings: errors affect selection through the error count, and the `crop-loss` warning is not a ranking term. See the [test-first plan](plans/source-aware-ranking.md) and [dated evidence](evidence/2026-09-16-source-ranking/README.md).

## Whole-product-group grids

The bounded #5 slice adds one-, two- and three-column grids of **rigid existing groups**, with at most six total candidates for those designs. A fourth, single-row column arrangement is available only with exactly four groups and target width/height at least 0.8; it raises that design's maximum to seven candidates. The earlier upper 1.25 cutoff caused an unjustified one-pixel strategy jump and was removed in [the transition review](evidence/2026-09-22-grid-transition/README.md). The source-aware selector can still choose uniform on wide pages. Tall targets below 0.8 keep larger photos through the existing multi-row alternatives. The slice supports 2–6 content units containing an explicitly grouped image and content text, plus at most four ungrouped text bookends above/below their combined band. Units must not overlap one another in the source; intentional overlaps *within* a group remain legal. Unrelated decorations, sidebar text, ambiguous/ungrouped image associations and larger product sets keep the original alternatives. Ungrouped backgrounds retain the existing canvas-fill policy.

Bookend text uses the existing preferred size (source size × target/source short-edge ratio × 1.2). Measured wrapping reserves its height at that size, with the current 0.5% fit-width clearance, before the remaining height is divided into grid rows. If preferred bookends cannot fit, or require emergency word breaks, this slice declines the grid. Products retain one shared rectangle scale/translation per group; text fitting uses the existing measurements and limits. Membership, paint order, text/assets/styles, shape radii behavior and image fit/focal settings are preserved. Final-row groups are centered. New duplicates are skipped, while the legacy stack/split entries remain independently mutable as before.

This does not declare product relations reflowable or change the schema/group-geometry check. The typed rigid-versus-reflowable distinction, internal product rearrangement and defect-specific repair remain future coordinated work. Every generated candidate keeps its diagnostics, and the existing hard-error-first ranker selects the result. See [all-candidate evidence and limitations](evidence/2026-09-22-product-grid/README.md): readable alternatives can lose selection, dense bookends can still leave all candidates inadequate, and additional candidates cost runtime.
