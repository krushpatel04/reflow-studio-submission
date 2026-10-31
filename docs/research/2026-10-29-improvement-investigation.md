# Reflow: performance and competitive-quality investigation

October 29, 2026 · [Investigation plan](../plans/2026-10-29-deep-improvement-investigation.md) · [Reproducible evidence](../evidence/2026-10-29-deep-investigation/README.md)

## Decision

The strongest next investment is **robust readable layouts on ordinary source variations**, alongside two small, output-preserving speed changes. The engine already has useful geometry, font and packaging safeguards. Its largest demonstrated competitive weakness is that small changes in source structure disable the specialized compositions. Adding ML, more viewer features or a new engine architecture would not address these failures efficiently.

Adobe explicitly prioritizes quality over speed and evaluates both JSON and the official-renderer PNG. There is no published hard Stage 1 execution-time limit. The reference machine is described as an Apple M5 Pro, with exact limits still unconfirmed. These facts favor improving readable, faithful outputs before chasing a latency number. No numeric rubric weights or competitor scores were established, so this investigation cannot estimate a top-three probability. [Official rules, checked October 29](https://github.com/jhaaj08/chameleon/blob/main/RULES.md).

## Scope and confidence

Reviewed Python validation/scaling, font fitting, composition selection, pinned official conversion/rendering, package assembly, profiling/qualification tools, the workbench boundary and current release queue. Ran fresh five-trial alternating layout measurements, an isolated search-stop prototype, an instrumented dense workload, six quality probes and official rendering. Astra independently reviewed the existing font optimization and challenged the quality conclusions.

Committed baseline: `2fd7a89afbde50ae2e2ae886861adb2b7d4cbf1a`, also remote main when checked. The shared working tree additionally contains another contributor's two-line glyph-width optimization. Its `engine/text_fit.py` hash is `fede1c58a8f04d605a1c15543f7ae99787f58ebe5cc6d2eca1000a0e868dae18`. Experiments used frozen copies, not edits to production files. The additional floor-stop exists only in those diagnostic copies. Existing dirty-source qualification is evidence for its recorded bytes/image, not a clean published release.

These are exposed development cases, not unseen evaluation. No sealed inputs were accessed. Full Python/Node/browser/container suites were not rerun for this documentation-only investigation; earlier full-suite receipts remain attached to their original source. Neither speed nor test counts establish Adobe acceptance.

## 1. Quality: small changes disable the useful layout

### A singleton group makes legal text effectively invisible

Repro: take public Level 3, retain its 728×90 target, and add `group_id: "legal-copy"` to the legal text. Nothing else changes. The normal campaign makes that text 9 px; the modified input produces **1 px** text, without an engine warning. The official PNG confirms the line is effectively invisible. All IDs, text, styles, assets and the newly supplied group ID survive.

Cause: [composition.py:275](../../engine/composition.py#L275) rejects the entire campaign when any group is not exactly a plate/label pair. The fallback then protects singleton grouped text from the free-text fitter. This is an interaction between conservative guards, not data loss in JSON.

**Smallest useful fix:** support singleton text as a movable one-element unit while retaining its group ID and normal collision constraints. Do not flatten real multi-element groups or weaken their protected transformations. Acceptance requires a failing regression, singleton positive controls, multi-member/rotated negative controls, source invariants and rendered visibility. Give grouped and ungrouped unmet readability an honest diagnostic.

### A tiny decoration drops label sizes

Repro: add one 5×5, 10%-opacity ellipse near the source's upper-left corner. The normal 9 px label/legal layout falls back to **6 px** labels/legal. The renderer shows a visibly smaller supporting-text arrangement. A decorative addition need not leave the layout identical, but a disproportionate readability drop is a robustness warning.

Cause: [composition.py:305](../../engine/composition.py#L305) rejects every ungrouped non-background shape. All three composition strategies then fail eligibility. This is not an ID-based hardcoded solution, but its structural assumptions are still brittle.

**Smallest useful fix:** keep eligible text/plate groups together and preserve ancillary shapes with bounded placement and collision checks. Test a small decoration, an important large shape, overlapping foreground shapes, rotations and genuine obstacles. Never discard arbitrary shapes or exempt them all from collision handling.

### Readability needs hierarchy, not one shared font size

At **970×250**, campaign composition assigns every text element **16 px**: headline, body, labels and legal. The source uses 40 px headline, 22 px body and 12 px legal. The rendered result retains font-family/weight differences, but relative size emphasis is flattened and legal copy receives substantial space. At 728×90 all eight text elements become 9 px. Small format constraints matter; equal sizes are not automatically a defect, but the larger output demonstrates room to investigate a better allocation.

Cause: the campaign searches one shared `size` for free text and labels ([composition.py:329](../../engine/composition.py#L329)). Article mode separately caps its wide title at 9 px while body can be 9 px or larger ([line 179](../../engine/composition.py#L179)); that is a static concern requiring its own rendered probe, not a demonstrated failure here.

**Smallest useful fix:** derive a bounded relative type scale from the source, preserving headline/body/legal ordering when feasible. Allocate space by measured text demand and source emphasis. Review real images: a test that merely checks headline > legal can pass while the layout becomes worse. Preserve minimum readable supporting copy and all content; do not rewrite or remove copy.

### Aspect-ratio thresholds leave gaps

The 300×250 variation never enters composition adaptation; its supporting copy is small and its arrangement looks less coherent in the inspected PNG. [composition.py:241](../../engine/composition.py#L241) returns unchanged when relative aspect change is between 0.5 and 2. Campaign also requires an absolute wide/tall aspect ([line 267](../../engine/composition.py#L267)). Removing only the outer guard will not solve this case.

**Next refinement, after the two concrete structural fixes:** test target sizes just inside/outside both thresholds, plus square, portrait, landscape and common ad formats. Permit a small bounded alternative only when existing output has demonstrated readability/spacing problems. Retain uniform fit as a baseline. Do not replace guarded behavior with an unrestricted search or build a learned scorer for this slice.

## 2. Speed: measured opportunities, in order

Fresh local Python layout medians, five alternating trials per variant; Pillow font cache cleared per call. Native libraries were partly warmed, with residual first-use effects retained in raw trials. These are neither container timings nor M5 Pro results.

| Workload | Committed code | Existing local glyph reuse | Isolated repeated-size stop |
| --- | ---: | ---: | ---: |
| 16 texts × 128 characters | 58.5 ms | 13.0 ms | 12.8 ms |
| Public Level 3 | 85.3 ms | 39.3 ms | 39.0 ms |
| Deliberately infeasible 1×1 target | 157.4 ms | 129.9 ms | 53.4 ms |

Every variant/trial produced the same canonical output JSON hash for its workload. Warnings remain recorded. Successful small workloads show no material floor-stop benefit; difficult failures do. The existing glyph change gives about **4.5× and 2.2× faster layout** on the first two cases, not those factors for the whole application.

**A. Finish the existing per-block glyph reuse.** [text_fit.py:118](../../engine/text_fit.py#L118) previously called Pillow for every character, even repeated characters. The local change measures each distinct character once per block. Astra's additional differential check reported 360 matching cases across four real fonts, fractional sizes, Unicode and wrap boundaries. This preserves the current BASIC per-character policy; it does not add complex-script shaping support. Keep the collaborator's ownership, test/evidence and exact source identity.

**B. Stop searching once a size vector repeats.** [text_fit.py:275](../../engine/text_fit.py#L275) tries 61 steps even after all fonts reach 6 px. In dense100, four strategies evaluate 244 vectors although only 32 are distinct within their respective searches. The isolated prototype stops only the inner size loop when its vector repeats, retaining later caps and obstacle policies.

Fresh instrumented dense100 run: **39.23 s → 5.19 s**, equal JSON hashes and the same unmet-floor warning. `_block_widths` calls fall **97,600 → 12,800**; renderer-width calls **24,400 → 3,200**. This is a single profiled pair, with renderer probes briefly overlapping the first run, not a stable end-to-end speed claim. The call reduction is the stronger evidence. It makes failure cheaper; it does not make an impossible layout readable.

Before production: test exact-floor success, impossible fit, mixed starting sizes and success only in a later cap/obstacle strategy. Compare complete outputs and diagnostics over existing valid cases, then perform clean Linux qualification.

**C. Remove duplicate work before adding bigger caches.** When the two obstacle-ignore policies are identical, skip the duplicate strategy without changing first-success order. Within an element/size trial, reuse its Pillow advance array for the first wrap and returned-width recount. Re-measure after A/B; do not assume the gains multiply.

**D. Font-face reuse is smaller and should be request-scoped.** `_renderer_widths` rereads the font and constructs a Skia face; `_lane_fit` and composition metrics also reload faces. In the floor-stop dense profile, wrapping still consumes ~3.33 s cumulative, whereas `_renderer_widths` consumes ~0.53 s. This makes face caching a later improvement, not the first fix. Scope it to an exact font identity and request; test changed bytes, context isolation and bounded memory. Avoid global path-only caches. `_font` already uses an unbounded cache: inspect multi-task memory growth before enlarging its lifetime further.

**Do not infer end-to-end speed from layout alone.** The existing pre-change emulated-container profile shows roughly 2.1 s of imports and 0.25–0.55 s of render/export on public cases, versus 0.01–0.36 s of instrumented layout. These older timings explain why a 2× layout gain need not mean a 2× engine gain. Keep cold container time, warm per-task time, render/export, peak memory and tail latency separate. The starter already processes multiple files per process. Avoid adding a server, rewriting the official renderer or changing image quality merely to improve a benchmark.

## 3. Improvements to the project as a whole

1. **Make Python-rendered quality the primary improvement gate.** Existing Node/browser checks validate a different TypeScript engine. Retain them, but do not count green Playwright tests as Python visual evidence. Use existing development cases plus a small, fixed set of source perturbations: singleton groups, ancillary shapes, varied copy length, nearby target sizes, brand-kit fonts and important-image placement. Preserve source labels and show the full denominator, including rejected/unmeasured cases. This is bounded regression coverage, not reopening the deferred corpus project.
2. **Add a simple review sheet for worst outputs.** Show source, baseline and candidate at native size; record readable copy, hierarchy, source preservation, collisions and subject/logo prominence separately. Have reviewers judge without seeing which candidate is newer. Retain disagreements and infeasible cases. Keep this a bounded review exercise, not a new mandatory study or teammate approval gate. Avoid a homegrown score that rewards the selector's own rules. Nothing in this investigation constitutes new human acceptance.
3. **Expose missing-resource and rendering failures.** The pinned converter returns missing-asset warnings, but the upstream `render_to_png` ignores that return. Existing diagnostics observed silent success. Import failure can also lead to box fallback. Preserve the intentional public missing-asset placeholder, but ensure the operator sees missing-resource findings and qualification requires the real renderer. A valid PNG or exit 0 is insufficient. Change neither the official renderer semantics nor its pin casually.
4. **Reduce submission-path ambiguity.** The root Dockerfile is the old TypeScript path; the Python path requires assembly and an alternate Dockerfile. The README already explains this. Prefer a small, documented release/build command or prepared exact-source package over reorganizing the whole repo. Test the documented procedure from a fresh checkout with no development cache dependency.
5. **Restore trustworthy CI and freeze evidence once.** Main's latest Actions run is failed with all three jobs reporting no steps; it is not a passing test run. The previously identified billing restriction is operational, not evidence of a new engine defect. Keep source-bound local receipts until CI executes. Commit and qualify the chosen runtime bytes before final review; do not attach the old qualification to the local optimization.
6. **Close the existing handoff decisions.** The current open release issues are #35, #158, #159 and #160. Reproduction and human typography review remain useful evidence; organizer/viewer/access/registration facts and actual submission status must stay explicit. No new release decision or teammate acceptance was inferred from this investigation.

## Recommended sequence and stopping rules

| Order | Work packet | Acceptance |
| --- | --- | --- |
| 1 | Finish existing glyph reuse; implement repeated-size stop separately | Test-first behavior coverage, unchanged valid outputs/diagnostics, fresh paired timings, clean-source qualification |
| 2 | Fix singleton-group readability and ancillary-shape sensitivity | Separate failing repros; preserve real group semantics; all IDs/copy/assets/styles retained; native-size official PNG improvement; no known-case regression |
| 3 | Restore hierarchy where space permits | Source-relative emphasis and legible supporting copy; blinded rendered comparison across ordinary and extreme formats |
| 4 | Broaden aspect eligibility only where evidence justifies it | Boundary/nearby-size controls; retain baseline and reject regressions; no blanket guard removal |
| 5 | Further measurement reuse and packaging polish | Profile shows remaining cost; exact-output checks; fresh package reproduction |

Before each production slice, convert the relevant acceptance criteria into meaningful failing tests. After it, run the repository-required checks and Python source-bound validation. Layout changes require official-rendered inspection; performance-only changes require complete output equality, not just screenshots. Roll back a candidate rather than weakening thresholds to make it pass. Keep a known qualified baseline available while experimenting.

Keep deferred: native Express development unless required for Stage 1, LLM/ML/ranker infrastructure, campaign state, broad corpus ingestion, a second engine rewrite, parallel renderer work and cosmetic viewer expansion. A focused Python-output preview may help review later; it is not evidence that the existing browser uses Python today.

## After Stage 1: the separate top-three product goal

The challenge brief separates an automated engine round from a finale built around an Adobe Express add-on, pitch and demo. Placing overall therefore needs both a robust engine and a convincing creator experience; no amount of Stage 1 microbenchmarking proves the latter. After the submission is frozen, prioritize one complete native editing flow: import the real design, generate another format, inspect it at useful size, make an ordinary correction and keep the result editable. Demonstrate diverse layouts and one honestly handled difficult case. Measure task completion and required manual corrections before claiming time saved. Add alternatives or element locks only if that exercise shows they solve a real editing problem. Avoid rebuilding campaign state or broad AI assistance just for feature count. [Official challenge brief](https://acrobat.adobe.com/id/urn:aaid:sc:US:9a9861db-a87a-4dc4-91fb-fff30ed022c6), retained locally in the organizer source register.

## Adversarial review and limitations

Astra independently confirmed the two visible structural failures and challenged the proposed fixes: singleton handling must preserve genuine groups, shapes must remain obstacles where appropriate, equal font sizes are not by themselves a visual verdict, and removing one aspect guard will not enable square layouts. Astra also caught a diagnostic immutability check comparing the same object to itself. It was corrected to compare against a pre-call deep copy, then rerun: **all six inputs unchanged**, exact target dimensions, identical ordered element IDs and preserved non-geometry fields. All six rendered through the actual pinned converter and returned only the expected missing-badge warning.

No production code changed in this investigation. No collaborator files were reverted, no sealed data was opened and nothing was submitted. Existing profiling, qualification and evidence workflows cover this procedure; no additional reusable skill is warranted.
