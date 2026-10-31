# Stage 1 layout finish — October 27

The five previously rejected development layouts have concrete composition changes. This is an exposed AI development review, not independent human acceptance or an Adobe score. The engine bytes are bound in [development-summary.json](development-summary.json); the historical comparison is main `f6b919f`. Final release CI/container results must match the chosen engine/package fingerprint.

| Previously unacceptable case | Result and reviewed comparison |
|---|---|
| Financial 1080×1920 | Three coherent heading/body sections use the portrait canvas. Minimum drawn text increases11→33px. [Native comparison](financial-story.png). |
| Financial160×600 | Each heading stays immediately above its paragraph; copy remains intact. Minimum drawn text6→10px. [Native comparison](financial-narrow.png). |
| Financial728×90 | Three issue columns retain their own headings and readable9px body copy, with a compact title/folio/footer rail. Small footer text is8px; it is not claimed to meet the body's9px target. [Native comparison](financial-banner.png). |
| Flowers160×600 | Main artwork width increases about82→150px; decorations use the ends of the tall canvas, retaining assets, proportions, rotations and paint order. [Native comparison](flowers-narrow.png). |
| Flowers728×90 | Main artwork height increases66→85px; corner decorations use the banner ends instead of clustering around a tiny central page. Full portrait artwork in a90px-high banner remains size-limited; no crop, rotation change or replacement pixels conceal that limit. [Native comparison](flowers-banner.png). |

The21-task replay uses only the three already accepted development sources and49 hash-verified payloads. Every task was actually rendered through the pinned real converter with exact font-byte binding. Across these outputs: zero inventory/copy/font/asset preservation errors, unchanged protected fields/group membership/paint order, and no new fully off-canvas elements. Thirteen PNGs are byte-identical to baseline; eight changed. The additional changed financial portrait and two wider floral outputs were inspected for regression. All21 final development PNGs remained byte-identical after the Linux eligibility safeguard corrections.

## Readability and adversarial checks

Dense official banners use measured label plates, a subject/ribbon rail and complete copy. When wrapping makes a vertical copy stack too tall, one side-by-side copy alternative is tried. Tall formats use the same measured pieces in a vertical flow. This is local Python/Skia/Pillow processing with existing dependencies, not a model, semantic-label sidecar, new dataset or external inference service.

The complete official728×90 banner draws every text at9px rather than retaining6px labels. Other affected narrow/wide formats have the same minimum9px regression requirement. Larger formats can use larger type. The Level2 split from Junho's PR154 enlarges the product and brings the CTA beside the headline; the original PR/branch remains intact. Original source copy, image assets, font families, colours, rotations, IDs and group membership are preserved. Backing rectangles may refit their label padding; ordinary-format rigid fallback is tested separately.

Regression controls cover the five failure cases, nearby dimensions, one extra headline word, a folio near the title, source immutability, reversed element order, arbitrary IDs, invalid targets, missing exact fonts, multi-image collages, full-canvas contain images/ellipses, overcrowded image rows, real rendered ink and fallback behaviour. New candidates must have valid rotated canvas bounds. Positive letter spacing and style runs retain the older fit because advance-only wrapping cannot certify their ink; no new readability guarantee is claimed for those unsupported styles. Positive controls prevent a restrictive heuristic from rejecting valid ordinary layouts.

Linux testing found a genuine platform difference: a9px ribbon's rotated bounding width was80.64px there versus74.77px on Mac. A fixed76.5px rail silently selected the old fallback. The corrected pass uses actual measured bounds and retains9px assertions. A narrower article title rail handles a platform-dependent extra line without separating headings or shrinking paragraphs below the intended limit. The temporary diagnostic script/workflow changes were removed.

## Reproduce and inspect

Use [reproduce.py](reproduce.py) with the existing accepted manifest, its49 extracted/hash-bound payloads and clean official starter `a44a06046b0413f0785e7203955c3822e0acbc32`. The script refuses missing/changed inputs and an existing output directory. It renders all21 tasks and records real renderer events, output hashes, geometry findings and warnings. Add `--engine-ref f6b919f` for the before comparison; no other source archive is needed or opened. It never downloads data or overwrites the input bundle.

Run `python scripts/verify_python.py` with the pinned setup and no skips, plus the repository's Node/build/native/benchmark gates. Local final validation and source-bound hosted qualification are recorded in the [finish plan](../../plans/2026-10-27-submission-finish.md) and GitHub Actions. Real renderer calls and successful tests are technical evidence; actual-size readability was also visually inspected. No hidden-family benchmark, new human study, universal legibility or competition-win claim follows from these development cases. Native Express integration and organizer/submission instructions remain separate release requirements.
