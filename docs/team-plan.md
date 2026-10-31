# Reflow Studio — Team Plan

## Current scope — October 27

The active Stage 1 finish line is the Python offline engine: faithful editable JSON, legible official-renderer PNGs, reproducible packaging and final release qualification. Work is limited to the five rejected development layouts, demonstrated label readability, regression protection and submission instructions. See [the finish plan](plans/2026-10-27-submission-finish.md).

ML/ranker/scorer experiments (#19–22), campaign state/correction transfer (#14), creator storyboard studies (#10), corpus expansion (#31/#32), native/viewer feature expansion (#9/#30) and parallel TypeScript engine features are deferred from Stage 1. Existing tools, provenance checks, evidence and unique collaborator work remain available; historical checklists below do not add Stage 1 requirements. Retain the existing viewer until organizer clarification. The full native editable workflow remains finale work. JD explicitly retired deferred work from the active issue queue on October 27. Such issues close as **not planned**, preserving their unfinished criteria and evidence; they are not marked completed. The [issue disposition](release/2026-10-27-issue-scope.md) records every closure. [#35](https://github.com/kj-squared-labs/reflow-studio/issues/35) is the parent release rollup; assigned tasks #157–#160 structure the delegated Astra audit, Junho/Krush reviews and JD's remaining input/authorization decisions. Deferred feature work stays closed.


> **Current status — October 8:** See the [repository audit](repository-audit-2026-10-08.md) and [Python quick start](../README.md). The Python engine, real-renderer controls and packaging have merged. The [hosted OF-02 operational packet](evidence/of-02/README.md) was accepted at exact source `75f0ac12`; later source trees require separate offline proof. Independent visual quality remains open. The older entries below are historical; their paused-worker, unavailable-renderer and migration-pending statements are superseded.

## Adobe University Hackathon 2026

Prepared September 15, 2026. Team size: three people.

> **Adapt one finished design across formats, compare the results together, and carry a design decision across the campaign.**

Reflow Studio is a proposed Adobe Express add-on backed by an offline layout engine. It starts from an existing structured, editable design and adapts its elements to new sizes while preserving content, readable typography, and meaningful relationships.

The finished product should let creators compare variants, preview relationship corrections across them, and keep format-specific exceptions. The first implementation priority is a reliable automatic engine with measurable results on difficult designs.

This plan includes the product direction, differentiation hypotheses, prior-winner comparisons, Adobe Express workflow discovery, team responsibilities, and first milestones. A local prototype and the first 30-case experiment are now implemented; see [current status](progress.md) and the [comparison gallery](evidence/2026-09-15/gallery.md). User validation, the authenticated host walkthrough, the submission engine, and competitive evaluation remain work to complete.

## Part I — Project proposal

### Review update and scope

The [quality and ML plan](quality-and-ml.md) makes the next evaluation work concrete: separate development/validation/test families, compare outputs blindly, identify missing candidates versus bad selection, and test a local ranker only when data, rules and execution budgets support it. Begin preparation now. This adds an experiment and adoption criteria; the current engine remains deterministic, and no ML improvement is claimed.

The [adversarial review](adversarial-review.md) and [evidence](evidence/2026-09-15-adversarial/README.md) supersede the initial task order below. First eliminate silent preservation/visibility failures, repair mixed-role grouping, improve source-aware stability, and establish independent evaluation with bounded offline execution. The [pinned roadmap](https://github.com/ojedaJD/reflow-studio/issues/11) is the current task list. Publishing this review does not fix those defects.

Krush's family business supplies personal context for the presentation. It creates no project features, required customer pilot, benchmark inputs, or acceptance gates. Keep the structured-input engine and Adobe workflow general. General creator validation remains useful and independent of the story. Describe any business demo as illustrative unless actual usage or measured benefits are established.

Krush subsequently described the sign-shop workflow: artwork creation or repair precedes adapting designs for a large sign, yard sign, banner, and flag. Use that adaptation step as the presentation example. The [story note](sign-shop-story.md) distinguishes reported facts from illustrative demo choices; vectorization, image enhancement, mockups, and production preparation remain outside scope.

### 1. What prior winners actually tell us

The challenge brief calls this North America event a **pilot**, and no previous winners of this exact competition were located in the research. The closest comparisons are other Adobe Express hackathons. Their results help us judge product appeal, but don’t establish a score needed to win Chameleon. [Official challenge materials](https://acrobat.adobe.com/link/spaces/urn:aaid:sc:US:175235eb-5b56-41fe-ba3e-9b6233979f9b)

| Prior winner | What it demonstrated | Implication for our entry |
|---|---|---|
| **[Think Post](https://devpost.com/software/think-post)** — Enterprise Efficiency, 2026 | One input becomes editable designs for different platforms. | The broad “design once, adapt everywhere” concept already has a winning precedent. We need a sharper technical distinction. |
| **[StyleSnatch](https://devpost.com/software/stylesnatch)** — Most Valuable to Express Users, 2025 | Image inspiration becomes editable design structure, grounded in a family store’s needs. | Preserving editability and solving a recognizable business problem make a compelling combination. |
| **[Checkpoint](https://devpost.com/software/adobe-checkpoint)** — [second overall at SCU, 2025](https://blog.developer.adobe.com/en/publish/2025/08/inside-ai-collaborate-s-24-hour-adobe-express-add-on-hackathon) | Intentional snapshots and visual comparisons between versions. | Creative control and understandable changes can be valuable demo features. |
| **[Side Note](https://devpost.com/software/side-note)** — Best Integration or Workflow Hack, 2025 | A focused notes/tasks experience inside Express. | A polished, easily understood workflow can be enough to distinguish a project. |

Adobe’s judges specifically praised StyleSnatch’s real small-business problem and Side Note’s polished integration. That supports using a concrete creator’s workflow in the presentation. [Adobe’s judges’ comments](https://blog.developer.adobe.com/en/publish/2025/08/meet-the-winners-of-the-first-adobe-express-add-ons-hackathon)

**The major difference for us:** Chameleon’s first stage evaluates an offline reflow engine on hidden designs; the current challenge requires engine code, Dockerfile and README for Stage 1; the unchanged starter FAQ still adds an unscored viewer. Engine generalization deserves most of the early effort. The finale is where the richer product experience matters. [Challenge brief](https://acrobat.adobe.com/link/spaces/urn:aaid:sc:US:175235eb-5b56-41fe-ba3e-9b6233979f9b)

### 2. Originality and existing research

Adobe already has research on:

- **[Agentic-DRS](https://research.adobe.com/news/agentic-design-review-system-teaching-ai-to-review-graphic-designs-the-way-experts-do/):** specialist agents reviewing typography, composition, spacing, and other design properties.
- **[Design-o-meter](https://research.adobe.com/publication/design-o-meter-towards-evaluating-and-refining-graphic-designs/):** scoring designs and suggesting refinements.
- Outside Adobe, **[LayoutPrompter](https://arxiv.org/abs/2311.06495)** already combines structured inputs, example selection, and ranking multiple generated layouts.

So **“agents critique and repair a design” is a useful mechanism, but a weak originality claim.**

The stronger claim to pursue is:

> **An existing design retains its identity, readable typography, and meaningful relationships through drastic size changes—with editable output and measurable reliability.**

That is a hypothesis we can demonstrate convincingly, even without inventing a new research field.

### 3. Engineering principles

| Principle | What it means for the project |
| --- | --- |
| Measure real typography | Treat font geometry and wrapping as part of layout, rather than a finishing step. |
| Explore coherent alternatives | Generate several complete arrangements and select one coherent result. |
| Keep search diverse and bounded | Avoid near-duplicate candidates and finish within the execution budget. |
| Validate rendered output | Check actual images and retain difficult cases for regression testing. |
| Preserve element identity | Trace each correction and defect to the intended element and output variant. |
| Fit the host application | Use Adobe Spectrum for the add-on and familiar interaction patterns for previews and correction controls. |
| Preserve visual character | Maintain meaningful hierarchy, deliberate whitespace, and the original design's brand character. |

These are implementation principles. Their value must be demonstrated through the evaluation plan below.

### 4. Product and engine design

**Pitch:** “Adapt one finished design across formats, compare the results together, and carry a design decision across the campaign.”

#### Agreed product direction

The target is a campaign workspace for a campus organizer or small-business creator. The input is an existing structured, editable design containing text, images, shapes, geometry, styling, and any explicit groups. Reconstructing editable elements from a flat screenshot is outside this project direction.

The finished workflow should let a creator:

1. Open an existing design and choose several output sizes.
2. Inspect the editable variants together with the original.
3. Express a relationship correction, such as “keep this price with this product.”
4. Preview how that relationship changes each layout before applying it.
5. Keep a format-specific exception when a shared rule does not suit that composition.

The proposed distinction is transferring the meaning of a correction across layouts. A shared rule such as “place the ticket button directly below the date” can be re-solved for each size; copying the same pixel displacement to every variant would not establish that capability.

#### Differentiation we must earn

The concern about originality is valid. Multi-format resizing, grouping, AI generation, and design critique alone are insufficient differentiation claims. Our two hypotheses are:

| Hypothesis | Evidence needed |
| --- | --- |
| Our engine handles difficult transformations better than a competent baseline. | Held-out comparisons covering typography, grouping, intentional overlap, and extreme aspect ratios, with runtime and failure rates reported. |
| Shared relationship corrections reduce repeated manual work. | Observed creator workflows, comparison with existing tools, and a prototype demonstrating fewer repeated edits while preserving useful exceptions. |

Neither hypothesis is a claim of global originality or proven superiority. If existing tools already handle the proposed correction workflow well, refine the product around a specific unmet need. If users do not benefit from sharing corrections, simplify the workflow instead of defending the feature.

Sketch and validate the finished experience early. Prioritize implementation of the automatic engine and its evaluation pipeline for the first round; implement the richer correction workflow after the engine performs well and within the permitted development window. The automatic engine must work without a person supplying corrections during evaluation.

#### Adobe Express workflow discovery comes first

Hands-on use of Adobe Express is part of the initial discovery work, before committing to UI layouts. Walk through real editing and resizing tasks, record what the application already handles, and identify the manual corrections that remain. Those observations supply a practical baseline for the product's value and inform the storyboard.

Follow the host's interaction conventions and use Spectrum Web Components with the Express theme for the add-on UI. Adobe explicitly recommends learning from existing panels. [Adobe implementation guide](https://developer.adobe.com/express/add-ons/docs/guides/build/design/implementation-guide)

Our proposed workspace keeps native document editing in the Adobe Express canvas and exposes size selection, previews, relationships, and exceptions through the add-on. Confirm which comparison surfaces and document operations are supported before committing to a wide dashboard or cross-variant controls.

Run a small integration experiment alongside early engine development. Code Playground Add-on Mode supports testing a UI directly inside Adobe Express. Use that to establish the basic interaction and document-editing path while the reflow engine is still developing. [Code Playground guide](https://developer.adobe.com/express/add-ons/docs/guides/getting-started/code-playground-addon-mode)

Sequence: use Adobe Express → map existing behavior and friction → sketch a host-compatible workflow → test a minimal in-host interaction → develop and benchmark the engine → integrate and polish the validated product. The walkthrough and integration experiment are planned work, not completed validation.

#### The automatic engine

1. **Recover relationships.** Identify headline/subheading, image/caption, price/product, and date/CTA relationships. Explicit groups get stronger protection than inferred ones.
2. **Explore different arrangements.** Try a small set of structurally different candidates: image above text, image beside text, or an appropriate overlay arrangement.
3. **Fit typography during layout.** Measure the actual font and line breaks while choosing widths and positions.
4. **Render and repair.** Detect clipping, important collisions, and broken relationships; make targeted changes and keep the best completed candidate within the runtime budget.

Consider a wide event poster becoming a narrow story:

- A long headline needs new line breaks.
- Date and location must remain associated.
- A decorative background overlap should survive.
- A photograph’s subject should remain visible.
- The result should retain the original hierarchy and atmosphere.

That example makes the technical problem understandable immediately.

#### Search and evaluation strategy

**A. Search over different interpretations**

Sometimes the first mistake is deciding what belongs together. If two elements are only *probably* a group, retain another interpretation as a candidate.

This goes deeper than moving boxes around: the engine can reconsider a mistaken assumption about the design. Start with a few explicit alternatives so this remains buildable.

**B. Reflow Lab: automatically find and simplify failures**

Build a development tool that varies aspect ratios, text lengths, grouping, and layered content, then retains failing cases.

When a complicated poster fails, reduce it to the smallest example that still exposes the problem—perhaps one headline, one image, and one background shape.

**Reflow Lab supports the submitted engine; it is not a separate submission.** Its value is faster, more reliable improvement on cases the team did not hand-pick.

#### The strongest optional finale feature

**Correct once, preview across sizes.**

A user says, “Keep the date next to the ticket button.” They confirm that relationship, and the other variants update while retaining their own arrangements.

Show the proposed changes across affected variants before applying the shared relationship. Let the creator preserve an exception for a particular format and revise the rule later. Relationship controls can begin as simple explicit UI actions; natural-language input is an optional interface choice that must justify its complexity.

Preserve element identity so corrections target the intended content across variants. Validate the interaction early; its implementation should follow automatic engine quality.

### 5. Component priorities

| Component | Priority |
|---|---|
| **IntentGraph** | Keep as the architectural foundation. Make uncertain relationships revisable. |
| **TypeFit** | Highest-priority technical component. Typography failures can undermine an otherwise attractive layout. |
| **ReflowGuard** | Keep as validation and repair. Its originality claim needs to come from demonstrated results. |
| **AspectPath** | Useful later for responsive behavior and presentation; lower initial priority. |
| **FocusMap** | Add selectively for image-heavy designs once the core handles text and groups reliably. |

**Combine IntentGraph + TypeFit + bounded candidate search + rendered repair into one focused entry.**

### 6. How we determine whether it could win

Use these gates before calling the entry competitive:

- **Held-out designs:** Start with a target such as 50 original designs across eight sizes. Keep entire design families out of tuning.
- **Serious baselines:** Compare against uniform scaling, a competent group-aware heuristic, and an allowed-model approach where feasible.
- **Rendered correctness:** Measure missing content, clipping, unintended collisions, and broken groups. Distinguish intentional overlap from defects.
- **Blind preferences:** Have people compare randomly ordered outputs without knowing which system produced them.
- **Worst-case performance:** Report difficult cases and runtime alongside average results.
- **Component evidence:** Remove typography fitting, relationship inference, or candidate search in turn to establish what actually helps.
- **Product evidence:** Observe whether cross-format relationship corrections reduce repeated edits and time to an acceptable campaign. Check whether creators understand the shared rule, preview, and exception behavior; keep these findings separate from first-round engine scores.

Adobe’s renderer can verify what the output looks like; it cannot provide a single objectively correct layout. Human comparison remains useful alongside automated checks.

For the finale, demonstrate one story: **a campus organizer or small retailer turns a finished campaign into several editable sizes**, then requests a fresh ratio and makes one relationship correction. Keep the explanation tied to visible outcomes.

### Recommendation

**Build Reflow Studio, and invest early in Reflow Lab.** Prioritize typography, group preservation, and difficult aspect ratios. Use the comparison UI and correction transfer to make that capability memorable.

Design the campaign workflow now and use creator feedback to sharpen it. Treat polish as clarity, control, and fewer repeated edits, supported by a reliable reflow engine.

The ideas have a credible path to being competitive. The strongest route to winning is to arrive with **better outputs on unfamiliar designs, evidence explaining why they’re better, and a demo that makes the benefit obvious.**

## Part II — Team kickoff and delivery plan

### First milestone

Produce an end-to-end experiment that takes 10 structured designs, generates square, portrait and landscape variants, and displays all 30 outputs beside their originals and a uniform-scaling baseline.

The first milestone proves that the pipeline works and that failures are visible. It does not establish competitive quality.

Alongside the technical experiment, produce a short storyboard of the final workflow: original design → variant comparison → shared relationship correction → preview → per-format exception. Use it in creator interviews. The storyboard informs the product without making the automatic engine depend on interactive corrections.

Begin the storyboard with a hands-on Adobe Express walkthrough. Test a minimal add-on inside the host early so that the proposed workflow fits its actual panel, document access, and editing behavior.

### Team ownership

| Owner | Responsibility | First deliverable |
| --- | --- | --- |
| ojedaJD — engine | Design contract, preservation, groups, candidate generation/ranking, runtime, CI coordination | Fix silent structural failures and nearby-size instability; provide bounded execution evidence |
| JunhoHwoang — typography/rendering | Typography, rendering, visibility/contrast/layering, crop diagnostics, workbench interaction | Detect invisible/obscured content and verify supported font behavior across renderers |
| krushpatel04 — evaluation/integration | Independent corpus/review, Adobe adapter and native workflow, general creator validation | Prove editable round trip; report held-out quality separately from internal diagnostics |

These responsibilities are agreed. Share one documented internal interface; coordinate shared changes before implementation.

ML experiment [#19](https://github.com/ojedaJD/reflow-studio/issues/19) is jointly assigned to **krushpatel04 and JunhoHwoang**. Krush owns data/labels, model eligibility, blinded evaluation and the keep/stop report. Junho owns the local ranker adapter, inference or fitting implementation, rendered features and fallback/runtime tests. JD retains the deterministic engine and coordinates its interface with them. See the [quality and ML plan](quality-and-ml.md) for prerequisites and acceptance criteria.

### What to do immediately

1. Finalize the three-person team and registration.
2. Agree on one user story: a campus organizer adapts an existing event poster for several placements, then corrects a relationship across the resulting variants.
3. Complete the Adobe Express walkthrough below with two representative designs; record both familiar interaction patterns and existing resizing capabilities.
4. Gather the full set of 10 original designs the team can use for testing. Prefer different design families over small variations of one template.
5. Sketch the variant-comparison, shared-correction, preview, and exception workflow within the host's actual UI constraints.
6. Interview three campus organizers or small-business content creators. First observe how they currently resize and correct designs, what breaks, and what must be preserved. Then test whether the storyboard addresses the repeated work they actually encounter.
7. Compare that observed workflow with Adobe Express and other relevant design tools. Record which steps are already supported, where friction remains, and what we would need to do measurably better. Revise the differentiation claim if it does not survive the comparison.
8. Resolve the competition contract questions below before treating preparation code as eligible submission work.

The current FAQ/info document lists registration by **October 4, 2026, 11:59 PM PST** (source wording), release October 5, the October 5–30 build window and submission October 30. The current official event page adds an **October 9 virtual info session** and specifies **November 20, 2026** for finalist notification, consistent with the FAQ’s month-wide November wording. The former November 23 date is superseded. Finale remains January 11–13, 2027, with at least two teammates attending to place. See the [source audit](evidence/2026-10-04-competition/README.md) for page references, timezone ambiguity and unresolved conflicts. Individual registration and eligibility are not verified here.

Source: [Adobe event](https://careers.adobe.com/us/en/event/6a90701b41b49ecd36166e14/Adobe-University-Hackathon-2026) and [official challenge materials](https://acrobat.adobe.com/link/spaces/urn:aaid:sc:US:175235eb-5b56-41fe-ba3e-9b6233979f9b).

### Step 0: Adobe Express walkthrough and integration probe

Status: planned; documentation reviewed, hands-on findings not yet collected.

#### Shared walkthrough — suggested 60–90 minutes

Use two representative designs with the tools available in the team's account:

- Create or open a design, select elements, edit text, group elements, and navigate pages or variants.
- Try the available resize workflow and manually repair its results. Record operations, elapsed time, and remaining defects without assuming our engine will outperform it.
- Inspect how built-in panels handle selection, controls, previews, progress, errors, and undo/recovery. Note the usable panel space and terminology.
- Try a relevant existing add-on to understand the transition between add-on controls and native canvas editing.

Each teammate records observations in their area: engine lead records layout failures; typography lead records wrapping and font behavior; integration lead consolidates the interaction map and API questions. Capture evidence only from the team's own test documents.

Deliver a short workflow map with four columns: task, existing behavior, remaining friction, proposed Reflow Studio behavior. This feeds both the differentiation assessment and the storyboard.

#### Interface direction

Use Spectrum Web Components with the Express theme for the add-on. Adobe recommends using its existing panels as interaction references. [Adobe implementation guide](https://developer.adobe.com/express/add-ons/docs/guides/build/design/implementation-guide)

Keep the document editable in Adobe Express's canvas. The proposed add-on controls target sizes, variant previews, shared relationships, and exceptions. Validate the preview surface before assuming a full-width comparison dashboard is available.

Check legibility and interaction in both light and dark host themes. [Adobe UI guidelines](https://developer.adobe.com/express/add-ons/docs/guides/build/distribute/guidelines/general/user-interface)

#### Small integration probe — alongside the initial engine work

When implementation is permitted, use Adobe's Code Playground Add-on Mode to test a small interface directly inside Adobe Express. [Code Playground guide](https://developer.adobe.com/express/add-ons/docs/guides/getting-started/code-playground-addon-mode)

Verify a supported document read/change, whether the result remains editable, and the available undo/recovery behavior. Record limitations in selection, groups, node access, preview placement, and document updates. A minimal probe should inform architecture before the complete engine or polished UI is ready.

The UI runs in the iframe context; document operations use the document sandbox and its communication APIs. Keep the offline reflow engine behind an adapter to this host integration. [Document sandbox reference](https://developer.adobe.com/express/add-ons/docs/references/document-sandbox/)

Completion evidence: workflow map, initial UI sketches constrained to the host, and recorded results of the minimal integration probe. These are distinct from engine benchmarks.

### First 10 test cases

| Case | What the original must exercise |
| --- | --- |
| Simple event poster | Headline, date/location, CTA and one image |
| Long headline | Wrapping and preservation of hierarchy |
| Dense event details | Several text blocks that must stay readable |
| Explicit group | A date/location/CTA cluster that must remain associated |
| Intentional overlap | Text on a filled shape or image; overlap is part of the design |
| Layered artwork | Transparent assets and meaningful stacking order |
| Multiple products | Several image/label pairs whose relationships matter |
| Brand whitespace | Deliberate empty space and asymmetric composition |
| Image subject near edge | Cropping that could cut off the important subject |
| Typographic variation | Multiple font sizes, weights and supported font families |

Reserve additional, separate design families for later held-out evaluation. Do not repeatedly tune on those families.

### First two build sessions

These are planning estimates for when the competition rules permit implementation.

#### Session 1: complete the loop

- In parallel, the integration lead runs the small in-host probe described above and feeds platform limitations back to the shared interface.
- Define a provisional internal design representation that preserves element IDs, text, fonts, colors, groups, stacking and geometry.
- Keep Adobe's eventual format behind an adapter; do not call the provisional format the official schema.
- Implement identity and uniform-scaling baselines.
- Render the original and baseline outputs.
- Produce the comparison page and results record automatically.

#### Session 2: make one measurable improvement

- Add a group-aware arrangement strategy.
- Add real text measurement and wrapping.
- Compare the improvement with uniform scaling on all 30 outputs.
- Label the three most frequent failure categories.
- Choose the next change based on those failures.

A shape's bounding box intersecting another box is not automatically a defect. Checks must account for intended layering and actual text overflow.

### Done means

- All 30 cases finish or return an explicit diagnostic; failures cannot disappear from the report.
- Every original content element is traceable into its output.
- The report identifies unintended out-of-bounds content and text clipping.
- The chosen fonts/assets and run settings are recorded.
- Original, baseline and candidate images can be inspected side by side.
- Runtime is recorded, with the renderer used clearly identified.
- The Adobe Express workflow map informs the storyboard, and the integration probe records which required host operations work or remain unresolved.
- Once Adobe supplies its renderer and schema, the official path is checked end to end. An interim renderer is an approximation.

### Build sequence after the contract is released

Continue validating the campaign workflow alongside this sequence. First-round evaluation must run the automatic engine without user corrections.

1. Integrate the official input/output and rendering contract immediately.
2. Establish a competent group-aware baseline.
3. Improve text fitting and relationship preservation.
4. Add a small number of structurally different candidate layouts only when the baseline has exposed their need.
5. Build Reflow Lab failure retention and simplification around real failure categories.
6. Evaluate unseen design families, remove components that do not help, and package the offline container.
7. Implement the validated correction-transfer workflow and polished candidate comparison after automatic engine performance is competitive and within the permitted development window. Include an affected-variant preview and format-specific exceptions. Start with explicit relationship controls; add natural-language input only if it improves the workflow.

### Questions for Adobe

- What pre-event code, existing libraries and other pre-existing code may be used, and what must be built during the event?
- What are the offline runtime, hardware, model, memory and execution-time limits?
- Which renderer, fonts and assets are available locally? Which changes to text, crops, groups and element properties are allowed?
- What is the code freeze, and which changes are permitted between first-round submission and the finale?

### First decision rule

For the engine, add complexity when it improves comparison against the strongest baseline on held-out cases. For the campaign workflow, add features when creator observation supports fewer repeated edits, faster completion, or clearer control. Keep those two forms of evidence separate.

The immediate deliverables are an Adobe Express workflow map, a minimal in-host integration probe, a working transformation, an honest comparison report, and a storyboard tested with creators. Candidate search and corrective UI implementation are later investments justified by that evidence.
