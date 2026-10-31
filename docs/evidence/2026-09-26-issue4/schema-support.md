# Released v0.9 schema → Reflow support matrix

Source: [official-linked schema at a44a060](https://github.com/jhaaj08/chameleon/blob/a44a06046b0413f0785e7203955c3822e0acbc32/chameleon_design_schema_v0.9.json), inspected against Reflow `c4af8e7` [model](../../../src/model.ts) and [internal contract](../../design-contract.md). **This is a proposed mapping, not an implemented adapter.** No official input has passed source → Reflow → official renderer in this audit. Host-tested status for every field is **not tested**; [SDK matrix](sdk-support.md) addresses native support separately.

Legend: **Representable** = local type can carry the value after explicit conversion; **Partial** = only a subset is representable; **Unsupported** = meaningful values have no faithful local representation. None means “faithfully adapted and verified.” Preserve the original official object and patch only allowed output fields; never silently discard fields to satisfy local validation.

## Wrapper and collections

| Official field/contract | Local status | Required adapter behavior/test |
| --- | --- | --- |
| Task `source`, `target_canvas` | Partial | Unwrap source design; target needs internal ID/label metadata. Keep metadata out of official output. Python entry point returns a design, not Reflow's `Result` wrapper. |
| Design `canvas`, `elements` | Partial | Official top-level additional fields disallowed. Reflow requires schemaVersion/id/name/description/provenance/background/groups not present officially. Specify adapter-owned metadata without inventing source semantics. No extra output keys. |
| Canvas `width`, `height` | Partial | Official positive integers without published upper bound; local dimensions 1–8000. Reject unsupported sizes explicitly; never clamp. |
| Elements count | Partial | Official at least one, no maxItems; local max 100. Test 100 and 101 without dropping elements. |
| Element extra fields | Partial | Schema does not set element `additionalProperties: false`; local rejects unknown fields. Preserve unknown fields in original sidecar/output or reject with explicit loss; do not assume unlisted fields can be stripped. |
| Required-by-type fields | Partial | Validate official schema before mapping; absent field and default are distinct. Reject malformed input with structured diagnostics, retain original. |

## Every declared element field (28)

| Field | Local status and mapping | Next acceptance/negative control |
| --- | --- | --- |
| `id` | Representable → `id`; local requires nonblank unique IDs | Preserve every ID exactly once; repeated, blank and whitespace IDs must be diagnosed. Official self-check sets are insufficient. |
| `type` | Partial: text/image direct; shape splits into rect/ellipse | Dispatch shape subtype; unsupported type never becomes a blank placeholder silently. |
| `x` | Representable → `x` | Pixel coordinates; negative source allowed locally, output bounds checked separately. |
| `y` | Representable → `y` | Preserve canvas-top-left origin; distinguish parent-relative native coordinates. |
| `width` | Partial → `width`; official allows zero, local requires positive | Zero-width control; no epsilon repair without contract decision. |
| `height` | Partial → `height`; same zero-size mismatch | Zero-height/line control; finite endpoint validation. |
| `rotation` | Unsupported for nonzero values | Official clockwise degrees about center; no local rotation field. Reject nonzero, preserve explicit zero/default in output. Do not flatten rotated text. |
| `opacity` | Representable → `opacity` | Preserve zero and omitted default 1; test overlapping translucent objects through actual renderer. |
| `z_index` | Partial: local array order | Stable sort by z, retain original numeric z values and tie order for reconstruction; no renumbering/layer loss. |
| `group_id` | Partial → flat `groupId` plus generated group definitions | Null/omitted map to ungrouped; retain exact original grouping and restore null/omission. No semantic meaning supplied. Local group labels must be adapter metadata only. |
| `content` | Partial → `text` | Literal copy unchanged, including whitespace; local 10,000 UTF-16-unit limit and whitespace-normalizing rendering require explicit tests. |
| `font_family` | Partial → `fontFamily` | Actual Solstice fonts must be registered/measured by bytes; family-name mapping alone does not establish fidelity. Local name restrictions may reject official strings. |
| `font_size` | Representable → `fontSize` for official >=1 | Units px; test line breaks and actual official rendering at fit boundaries. |
| `font_weight` | Representable via regular→400/bold→700 | Preserve original spelling/omission; prove exact available font face, no fallback. |
| `font_style` | Partial: normal only; italic unsupported | Retain normal/default; reject italic until measurement and render support exist. |
| `color` | Partial: CSS-style rgba vs local hex | Parse/validate to equivalent color without alpha rounding losses; preserve original string on output. Shape `color` vs `fill_color` precedence needs explicit handling. |
| `text_align` | Representable → `align` | Left/center/right and default; compare official output anchoring. |
| `line_height` | Partial → `lineHeight` | Official multiplier default 1.2, no minimum stated; local minimum 1. Reject unsupported values, verify spacing. |
| `letter_spacing` | Unsupported for nonzero | Local has no field; preserve zero/default, reject meaningful spacing rather than measuring wrong widths. |
| `max_lines` | Unsupported for a meaningful cap | Local has no cap; null/omitted no-cap can be retained. Test official renderer behavior before adopting cap semantics. |
| `style_runs` | Unsupported for nonempty runs | Per-character color/weight/style must not collapse into one style. Empty array can be preserved. |
| `asset_id` | Partial → `assetId` | Resolve exact local bytes; no remote fetch/URI pass-through. Retain intentional missing resource as visible unsupported/error case, never invent pixels. |
| `fit` | Partial: contain/cover supported; fill unsupported | Match official crop anchor, transparency and image proportions. Local focalPoint has no official counterpart: don't invent an off-center crop. |
| `shape_type` | Partial: rectangle→rect, ellipse→ellipse; line unsupported | Native line API availability does not add local engine support. |
| `fill_color` | Partial → shape `color` | Same CSS→hex precision/alpha issue; preserve official literal. |
| `stroke_color` | Unsupported for visible stroke | Null can be retained; do not discard non-null styling or infer invisibility without stroke-width semantics. |
| `stroke_width` | Unsupported for nonzero stroke | Zero/default may be retained; test boundary geometry once implemented. |
| `corner_radius` | Partial → rect `radius` | Nonnegative local requirement; rules do not clearly authorize changing it. Keep protected unless clarified, despite existing local transform behavior. |

Style-run subfields are **`start`, `end`, `color`, `font_weight`, `font_style`**. Official indices are zero-based, end-exclusive. Nonempty runs are unsupported locally; original indexing must be retained, including astral Unicode. Static source concern: pinned converter `_append_text` loops through `end` inclusively after wrapping. This is a source-level mismatch to test, **not a reproduced renderer defect** in this audit.

The official input has **no semantic role labels**. Reflow requires `role` on each element and uses those roles in layout. An ID string resembling “headline” or “logo” is not authorization to treat hidden samples as labeled. Role inference/defaults are a substantive design decision requiring held-out controls; they cannot be presented as lossless format conversion.

## First failing-test candidates, in order

1. **Official envelope and inventory:** take the pinned Level 1 sample through adapter and round-trip serializer; exact ID count, content, asset refs, paint order and protected fields. Baseline should fail on absent adapter, not missing dependencies. Positive same-size control plus reordered IDs, duplicate IDs and unknown fields.
2. **Resource fidelity:** decode/register actual pinned font/image bytes; native official converter must be invoked. Deliberately break renderer import and assert no successful “real preview” result. Preserve and label the intentional Level 3 missing badge; keep it in totals.
3. **Unsupported-feature gate:** rotation, line, italic, letter spacing, nonempty style runs, strokes, fill fit, zero dimensions and >100 elements must produce precise unsupported outcomes with unchanged source. Positive plain-text/shape/image controls prevent blanket rejection.
4. **Coordinates and paint:** grouped translucent overlapping objects, equal z values, rotation rejection and normal contain/cover. Compare source render first, then target render; source mismatch quarantines quality scoring.
5. **Runtime boundary:** adapter Python entry → existing engine → official output files under network-disabled amd64 container. Record actual resolved dependencies, duration/memory, per-case failures and reference hardware mismatch; do not invent organizer limits.
6. **Malformed resources:** coordinator reported raw `URIError` for `data:image/svg+xml,%not-valid` and `InvalidCharacterError` for `data:image/png;base64,%%%%` in renderSvg/reflow on main; not reproduced by this audit. Include both future negative controls with valid bundled/local assets. Add remote/disallowed schemes, byte-signature mismatch, path escape and per-asset/aggregate size checks under a documented adapter-owned policy (#8/#30/#33).

No test above is marked passing or implemented by this documentation change.
