# Adobe Express workflow and integration probe

> **Current navigation — October 8:** The [repository audit](repository-audit-2026-10-08.md) records delivered Python work and remaining evidence gaps. The [Tuesday work queue](execution/2026-10-13/README.md) controls this run and reserved collaborator ownership. Older dated source/migration/pause statements below are historical; Adobe remains authoritative.


## Status

The local comparison workbench is implemented. On September 23, 2026, the school account reached Adobe Express in Edge. The home screen showed **Start free trial**. A blank custom 1,080 × 1,350 px canvas opened and a native title layer was inserted. Its text field briefly showed `Campus Night Market`, but after reopening the document the canvas still showed `Add your title`; that text edit is **not verified as saved**. On that canvas, the Resize panel labeled the feature **Premium feature**, stated that it automatically updates the layout, and offered **Upgrade**. Krush independently confirmed the same panel state. Later, Krush reported that Resize worked in a different student-account flyer tab. That tab's observed Resize panel had no Premium or Upgrade message, but its canvas appeared blank and no completed resize was observed by us. Availability therefore differs between the observed sessions or documents; the school account's working Resize entitlement is not yet established from a populated-design test. The editor intermittently stalled or rendered blank during panel transitions. The two-design walkthrough and repair timings are incomplete. The September 26 [capability audit](evidence/2026-09-26-issue4/README.md) used a separate dedicated browser session, which stopped at Adobe sign-in, including the Playground route; the [host log](evidence/2026-09-26-issue4/host-check.md) records that blocker and the next probe. No save/reopen, undo or retry has been verified in any session.

**Qualification scope changed:** the current official hub's Chameleon Challenge.pdf (rechecked October 4) omits the stage-one viewer requirement and links a public starter with provisional v0.9 schema and an offline renderer. The first qualification checkpoint is now official source → adapter → same Reflow engine → official JSON/renderer. Native editable roundtrip remains the finale/product integration gate. The starter FAQ still contains conflicting older viewer wording; read the [current contract, source versions/pages and conflicts](evidence/2026-10-04-competition/README.md) before making submission claims.

The [field matrix](evidence/2026-09-26-issue4/schema-support.md) covers every released element field and local incompatibilities. The [SDK matrix](evidence/2026-09-26-issue4/sdk-support.md) separates documented APIs from host tests and experimental capabilities. No adapter or host probe is implemented by this audit. The [Level 1 local reference check](evidence/2026-09-22-m1-level1/README.md) remains separate from both native Express and official-renderer evidence.

## Walkthrough: two designs, 60–90 minutes

Use an event poster and a product promotion that the team has permission to edit.

1. Create/open the original and record its text, image groups, layering, and typography.
2. Use Express's available resizing workflow to make a square, story, and landscape version.
3. Record each manual correction, its reason, and time spent. Note which work Express already completes successfully.
4. Edit a date or product label and observe how that change can be carried across variants.
5. Try a deliberate exception for one format. Record whether shared and local changes are distinguishable.
6. Note selection, grouping, preview, undo, panel width, and loading/error conventions.

| Observation | Event poster | Product promotion |
| --- | --- | --- |
| Source and access | Initial blank 1,080 × 1,350 px canvas tested; a grouped workshop event poster is selected for the full walkthrough. | Single-page Super Sale retail design selected; separate text, image, and grouped layers observed. |
| Existing resize behavior | Earlier blank canvas: **Premium feature** and **Upgrade**. Later blank flyer tab: no gate shown, but no populated design or completed resize observed. | Not tested. |
| Manual corrections and time | None measured because no resized output exists. Do not count the setup or stalled panel as a repair. | None measured. |
| Repeated relationship fixes | Not tested; no variants exist. | Not tested. |
| Useful native interaction patterns | Custom-size creation and native title insertion worked. The selected text exposed font, style, size, color, position, layer and Undo controls. A field edit appeared transiently, but the reopened canvas retained the placeholder; saved text editing is unverified. | Not tested. |
| Unsupported or unnecessary proposed features | Resize availability varies across the observed tabs; a successful populated-design resize is still unverified. Grouping, format exceptions and cross-variant edits are unknown. | Unknown. |

### September 23 host trace and evidence limit

1. Signed-in Edge home loaded and displayed **Start free trial**. The earlier 18 × 24 in blank poster creation tab was open, but contained no design.
2. A new blank custom 1,080 × 1,350 px canvas opened. The Resize panel displayed **Premium feature** and an **Upgrade** button. The panel listed square and story targets, but none was applied. A premium badge alone was not treated as proof; the panel's explicit gate is the account observation.
3. Text → Add a title created one selected text layer. The editable text field briefly changed from `Add your title` to `Campus Night Market`; Undo became enabled and the layer appeared in the layer list. On reopening, the canvas still showed `Add your title`, so the edit was not proved persistent.
4. Opening Add content → Elements left the editor in a stalled menu state. Reopening the saved document URL eventually restored the canvas and Resize panel. No grouping, undo action, resize output, product promotion, or manual correction was verified.
5. Krush reported that the student account could now resize through a [flyer creation link](https://new.express.adobe.com/new?width=8.5&height=11&unit=in&taskID=flyer&pixelsPerInch=300&aspectRatioLock=true&pageCount=1&category=templates&assetCollection=urn%3Aaaid%3Asc%3AVA6C2%3A6abed329-8b94-4418-b499-19c6a4c7432c&pageId=51d273eb-5e91-42c6-b7fa-7d72ac206e73). In the open Edge tab, Resize showed 8.5 × 11 in custom dimensions and recommended targets without a Premium or Upgrade gate. The visible canvas was blank; both bottom action buttons were disabled because no target had been selected. This does not establish how a populated template resizes or whether edits persist.

The in-session canvas and Resize-panel screenshots were captured during observation, but no image file was exported to the repository. There are no timed manual fixes to report. Resume with a populated design in the working student-account tab; record whether an actual target can be applied and whether layout, edits, and grouping survive.

Two template links were supplied for the next pass. The [event-poster template](https://new.express.adobe.com/design/template/urn:aaid:sc:VA6C2:ae94482d-b4fe-4855-a58b-fb40ff10e886) opened in Edge but remained blank in the observed tab, so its content and editability have not been checked. The [second template](https://new.express.adobe.com/design/template/urn:aaid:sc:VA6C2:cff9b082-62d7-550a-8a7e-745fcd914631) loaded as a five-page A4 media proposal with separate image, shape, and text layers. Its cover says `PROPOSAL` and `Media Proposal for Streaming Platforms`; it is not a single-page product promotion and will not be used for that case. A product ad/post with a product image, offer or price, and CTA is still needed.

A [replacement event template](https://new.express.adobe.com/design/template/urn:aaid:sc:VA6C2:2b8ae82b-9925-4b7a-b930-6c8e86f70fd9) loaded at 776 × 1,200 px. It shows a workshop events schedule with headline, multiple dates/descriptions/prices and a website. Express exposed one group containing 22 layers, plus a separate layer and background. This is a useful grouped, text-heavy event source for the host walkthrough. It has no obvious product image and does not fill the product-promotion slot. No resize, edit, undo or repair time has yet been measured on this template.

A later [candidate from a “product” template search](https://new.express.adobe.com/design/template/urn:aaid:sc:VA6C2:55771672-82e2-441d-988a-df60ad92b8d6) loaded as a **Supper Club** event flyer. It shows a food photograph, a date/time, and a dining-hall venue; Express exposed three text layers and a background layer. The search term is not a description of the selected design. With no product offer, price, or shopping CTA, this candidate is not the product-promotion source. No design operation or repair timing was measured on it.

A [new single-page sale design](https://new.express.adobe.com/id/urn:aaid:sc:VA6C2:0f389b2f-12dd-440e-8c0d-b28106589e84) is the product-promotion source for the walkthrough. The visible page has a **SUPER SALE** headline, a photograph of a bottle and packaged goods, **50% OFF EVERYTHING**, **LIMITED TIME**, and **VISIT US AT MAIN ST, DOWNTOWN AREA**. Express exposes four text layers, an image layer, a group of three layers, and two other layers. The photographed goods have no visible product name; the design tests a general retail offer rather than a specific SKU. Initial source screenshot was observed in Edge, but no screenshot file was exported to the repository. Resize, text editing, group operation, undo, and repair time remain unmeasured on this design.

When both signed-in templates were available for the operation pass, the computer-use capture of the selected Super Sale tab became a solid gray area with no Express canvas or controls visible, although Edge still showed the document URL. Refresh did not restore the visible editor. The event tab still exposed its layer tree through accessibility, but its visible capture was also gray; invoking its Resize button through accessibility produced no panel change. No resize was applied and no correction clock was started. This may be an Express rendering stall or a capture limitation; the account holder's visible state is being checked before attributing the failure to Express.

## Minimal in-host probe

Use [Code Playground Add-on Mode](https://developer.adobe.com/express/add-ons/docs/guides/getting-started/code-playground-addon-mode) and the [document sandbox documentation](https://developer.adobe.com/express/add-ons/docs/references/document-sandbox/). Use the [current proxy pattern and documented API caveats](evidence/2026-09-26-issue4/sdk-support.md), rather than assuming every illustrative snippet is current. Record actual host/API configuration before implementing the probe.

The smallest success is a Spectrum button in the add-on that performs one documented operation on the native Express document. Then verify the required operations individually:

| Operation | Evidence required | Status |
| --- | --- | --- |
| Render an Express-themed panel | In-host screenshot and keyboard interaction | Pending |
| Pass a UI request to document sandbox | Successful request/response with a small payload | Pending |
| Access selected editable elements | Actual supported fields and coordinate system | Pending |
| Create/update native text and shapes | User can select and edit the result in Express | Pending |
| Represent images, grouping, and paint order | Documented supported operations and limitations | Pending |
| Produce variants on supported surfaces | Confirm page/artboard behavior and practical UI limits | Pending |
| Undo an operation | Observe host undo behavior | Pending |

Do not substitute a flattened SVG/image import for proof of editable native text and shapes. If an operation is unavailable, record the limitation and adjust the product storyboard.

## Required follow-through after the first operation

The [adversarial review](adversarial-review.md) identifies a complete native editable round trip as the integration gate. A single editable text operation is an early checkpoint.

1. Read a representative supported design containing text, images, groups, and layering.
2. Serialize it through the documented adapter and run the same automatic engine used for evaluation.
3. Apply the result to native elements; verify identity, copy, styles, associations, and paint order.
4. Edit a generated element in Express, save/reopen, and inspect the result.
5. Exercise undo, partial-failure recovery, and retry without creating duplicates. Record unavailable operations explicitly.

Record SDK/API versions, stable/experimental status, coordinate and asset/font handling, and reproducible evidence for every capability. Metadata support alone is not proof of persistence or synchronization. Campaign correction state and exception semantics should follow this evidence and the general creator storyboard tests.

This workflow uses general supported designs. The family-business presentation story adds no import/export, print-production, or customer-validation requirements.

## Working storyboard to validate

1. User opens an editable source in the native Express canvas.
2. Add-on offers target formats and generates initial variants automatically.
3. User compares previews on a host-supported surface and selects a variant to edit.
4. User expresses a shared relationship, such as keeping a product image with its price.
5. Regenerated previews show the effect across sizes before applying the change.
6. User marks a format-specific exception and retains direct native editing.

Steps 3–6 are product hypotheses. The present prototype provides local comparison and pre-authored groups; shared relationship correction and exceptions are not implemented.

Use the [Adobe design implementation guide](https://developer.adobe.com/express/add-ons/docs/guides/build/design/implementation-guide) for Spectrum and host conventions. Treat the full-width development dashboard as an inspection surface, not evidence that Express supports the same layout inside an add-on.
