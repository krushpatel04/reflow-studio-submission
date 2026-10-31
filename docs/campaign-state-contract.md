# Draft campaign-state contract for issue #14

> **Current navigation — October 8:** The [repository audit](repository-audit-2026-10-08.md) records delivered Python work and remaining evidence gaps. The [Tuesday work queue](execution/2026-10-13/README.md) controls this run and reserved collaborator ownership. Older dated source/migration/pause statements below are historical; Adobe remains authoritative.


**Status: review draft, September 22, 2026. No campaign-state module, persistence, correction UI, or Adobe adapter implements this document.** The local workbench currently resets edits on reload/design selection. Native capabilities in [#4](https://github.com/kj-squared-labs/reflow-studio/issues/4), creator findings in [#10](https://github.com/kj-squared-labs/reflow-studio/issues/10), and independent automatic quality evidence in [#7](https://github.com/kj-squared-labs/reflow-studio/issues/7) are still needed before #14 implementation. This contract is a set of proposals and questions for those gates, not an approved product or official Adobe schema. See the [task plan](plans/campaign-state-contract.md), [internal design contract](design-contract.md), and [Express workflow probe](express-workflow.md).

## 1. What exists today, and the proposed boundary

| Current, verified in repository | Proposed here; requires later evidence |
| --- | --- |
| A validated `reflow.design.v0` source and target can enter one `reflow` call. The output keeps source design and element IDs, text, assets, protected styles, paint order and explicit group membership; geometry, text size and rectangle radius may change. | A separate campaign record ties one source revision to target variants, rules, exceptions, locks and native nodes across sessions. |
| Element IDs are unique **within one design**. An explicit group uses a common positive uniform scale and translation across its members; `group-geometry` detects a violation. | A stable mapping from those internal IDs to editable host nodes survives apply, reopen and manual native edits. Host ID stability is unknown. |
| `reflow` returns diagnostics for one generated candidate. Native SVG/PNG output and local preview are not proof of Adobe editability or appearance. | Preview and apply use host-supported surfaces, detect stale edits, and recover from partial writes. Native transactions, undo and persistence are unverified. |
| The automatic engine has no campaign-correction input and can run without human edits. | Corrections remain a separate, optional later product stage. They never enter untouched first-round automatic evaluation. |

Campaign metadata belongs in a **sidecar record**, not additional fields on `Design`: the current design validator rejects unknown fields. A native adapter may have its own supported storage location; this document assumes no particular Adobe metadata API.

## 2. Identity and revision model proposed for review

The following names describe logical fields, not a TypeScript interface or a claim that a host exposes them. IDs are opaque and never derived from names, array positions, target dimensions or generated geometry.

Authority is split deliberately: the validated source owns `sourceDesignId` and `sourceElementId`; the campaign sidecar owns campaign/target/variant/rule IDs and its monotonic revisions; the adapter observes opaque host refs, native revision tokens and read-back fingerprints; the engine build owns `algorithmVersion`; the operation journal owns apply status. A creator supplies the intent of a rule, lock or exception, but the adapter must verify any native state used to anchor it. No sidecar revision is evidence of a native edit unless a fresh adapter observation confirms it.

| Field | Proposed meaning and rule | Evidence needed |
| --- | --- | --- |
| `campaignId` | Stable sidecar record ID. One campaign tracks one logical source and its variant set; never reused for a different source. | #4 storage/reopen location and ownership. |
| `sourceDesignId` | The validated source `Design.id`, immutable within a campaign. | Already preserved by internal engine; #4 must map import identity. |
| `sourceElementId` | An original `Design.elements[].id` scoped to `sourceDesignId`. Every rule and lock refers to this, never an element index, display text, or a generated node ID. | Internal preservation exists; #4 must test host mapping after reopen. |
| `hostSourceRef`, `hostNodeRef` | Optional opaque adapter references kept in a separate mapping. They cannot replace internal IDs. If a host recreates node IDs, the adapter must verify correspondence before edits. | #4 must demonstrate stable IDs or a safe remapping method. |
| `targetId` | Stable campaign key for an intended placement. Changing dimensions or label increments its target revision; it does not create an unnoticed second target. | #10 should test whether target names/changes are understandable. |
| `variantId` | Stable ID for the persisted editable variant for a `targetId`, distinct from source `Design.id` (which the engine preserves) and from any host page/node ID. Regeneration updates that logical variant only after precondition checks. | #4 must show supported native variant/page identity and duplicate-free updates. |
| `campaignRevision` | Monotonic sidecar revision incremented for source adoption, target, rule, exception or lock edits. Every preview names one revision. It is not a host revision. | Requires durable compare-and-set or equivalent; #4. |
| `sourceRevision` | Monotonic campaign source revision plus a captured source fingerprint and any verified opaque host revision token. A changed native source invalidates previews. A fingerprint is a detection aid, not proof that unsupported native content was captured. | #4 must test read-after-write, external native edits and unsupported nodes. |
| `variantRevision[targetId]` | Last confirmed native state/fingerprint and sidecar revision for that variant. A later native edit must be detected before applying a new preview. | #4 must test native editing, save/reopen, and change detection. |
| `campaignSchemaVersion`, `designSchemaVersion`, `algorithmVersion` | Version the sidecar format, current `reflow.design.v0` input/output, and exact layout implementation/configuration respectively. Old previews cannot be applied with a different value without regeneration. An algorithm version should identify a committed build plus relevant parameters, not a marketing label. | #4 must establish migration/reopen support; official schema may require a separate adapter version. |
| `ruleId`, `ruleRevision`, `operationId` | Stable IDs for a rule, each edit to that rule, and each intended apply operation. Tombstones and the operation journal retain identity across retries. | #4 must establish durable storage and retry semantics. |

The source fingerprint should cover a canonical serialization of the **supported imported design** (including copy, protected styles, geometry, order, IDs and asset references) and resource identity/version where available. It must not include volatile signed URLs. If the adapter cannot account for a native field or cannot detect a later native edit, reopening/applying must stop with an explicit unsupported or uncertain-state result. Hash agreement alone does not authorize overwriting a native document. If imported node correspondence is ambiguous, create a new campaign or require manual relinking; never guess by matching text or coordinates.

### Illustrative sidecar shape (not accepted or implemented)

```json
{
  "campaignSchemaVersion": "draft.campaign.v0",
  "campaignId": "campaign-17",
  "campaignRevision": 8,
  "source": { "sourceDesignId": "catalog-card", "sourceRevision": 3, "fingerprint": "sha256:...", "hostSourceRef": "opaque" },
  "versions": { "designSchemaVersion": "reflow.design.v0", "algorithmVersion": "commit+config-hash", "adapterVersion": "unverified" },
  "targets": [{ "targetId": "square", "targetRevision": 1, "width": 1080, "height": 1080, "variantId": "variant-square" }],
  "rules": [{ "ruleId": "r1", "ruleRevision": 2, "kind": "associated", "subjects": ["bag-image", "bag-price"], "anchor": "bag-image", "scope": { "targetIds": ["square"] }, "maxGapRatio": 0.2, "editProvenance": { "actor": "creator", "at": "2026-09-22T00:00:00Z", "sourceRevision": 3 } }],
  "exceptions": [], "locks": [],
  "variantRevisions": { "square": { "revision": 4, "fingerprint": "sha256:..." } }, "operations": []
}
```

`sha256:...`, the host reference, timestamp and version labels above are illustrative placeholders. The shape demonstrates separation from the strict internal `Design` object. The format, storage medium and exact migration policy remain decisions after #4.

## 3. Correction scope, rigid groups, locks and exceptions

### Current rigid relationship versus a proposed reflowable rule

An existing source `groupId` means its members retain one common rectangle scale and translation under the current engine. A correction must **not** reinterpret such a group as freely rearrangeable or rewrite its membership silently. Group labels and paint order remain protected. If the desired correction contradicts a rigid group, preview reports a conflict and asks for an explicit source-level change; it cannot quietly weaken the invariant.

A proposed `associated` rule instead names two or more **source element IDs** and a relation that allows orientation to change between targets. It does not ask for identical pixel offsets. A rule record needs `ruleId`, `ruleRevision`, subject IDs, scope (`all targets` or an explicit target-ID set), a predicate and its parameters, and edit provenance (who/what made the change, when, and from which source revision). A rule without a testable predicate is not ready for implementation.

For review, one possible predicate for a two-element pair is: the Euclidean gap between their axis-aligned rectangles must be no larger than `maxGapRatio × max(anchor.width, anchor.height)` in the target. Gap is zero when the rectangles touch or overlap, and otherwise uses the horizontal/vertical edge gaps. `anchor` is a named subject; `maxGapRatio` is stored on the rule. This is a **candidate semantic**, not a tuned default or proof of a good layout. #10 must check whether creators mean this when they say “keep together,” and #7 must check whether satisfying it helps visible output. Rigid group geometry remains separately enforced. A rule finding cannot substitute for visibility, legibility or human quality evidence.

Proposed `geometryLock` is target-local: it records a source element ID, `targetId`, the intended native geometry and the native state/revision from which it was captured. It means “do not change this target's geometry during the next apply,” not “freeze content/styles” (those already have internal preservation checks). Changing the target dimensions makes this lock stale until explicitly rebased or removed. The draft does not promise the current engine can produce a candidate satisfying arbitrary locks.

A proposed exception is `{ruleId, targetId, mode: "suppress", reason, revision}`. It disables that shared rule **only** for the named target; it never edits the source or other targets. If a creator wants a different relation in that target, it is a separate target-local rule with its own ID. Deleting or editing the shared rule does not silently delete an exception: the exception becomes visibly dormant or is explicitly migrated by the creator. This keeps reopening and undo understandable.

All active hard constraints must hold together. Existing design preservation and rigid groups cannot be overridden by a lock, exception or proposed relation. An exception removes only its referenced shared rule from one target. A geometry lock that conflicts with any remaining hard rule produces an explicit infeasible preview and blocks apply. There is no hidden “last edit wins” ordering. Soft preferences or automatic candidate scores may rank feasible outputs, but cannot silently waive these constraints. #5's group behavior and #7's quality review should inform whether these rule types are useful.

### Rule edits and removal

Editing a rule creates a new `ruleRevision` and increments `campaignRevision`; all prior previews for its affected targets are stale. Removal creates a tombstone rather than reusing `ruleId`. Future previews omit the rule. Already applied native geometry is **not** automatically restored, because the pre-rule state or host undo may be unavailable. The preview must show the proposed new geometry and identify which targets changed. A removal can be applied only through the same stale checks as any correction.

## 4. Preview boundary and stale-edit detection

Preview is a read-only proposal from a captured source, campaign state and observed native variant state. It must not create or edit host nodes. Each preview records:

- `previewId` and digest of source revision/fingerprint, campaign revision, target definitions/revisions, rule revisions/exceptions/locks, design/algorithm/adapter versions, and each affected variant's observed native revision/fingerprint;
- per-target editable candidate identity, diagnostics and an explicit diff of IDs and fields proposed to change; targets suppressed by exceptions remain visible as unaffected or independently changed;
- conflicts and unsupported operations, including a missing host mapping, lock/rule infeasibility, unsupported content, incomplete render, or unknown native state.

Before apply, reread all preconditions. Any source edit, target/rule/exception/lock edit, algorithm or adapter change, or native edit to an affected variant invalidates the preview. The user must regenerate it. A changed native variant can be offered for explicit resolution as (a) a source edit, (b) a target-local lock/exception, or (c) a deliberate replacement, **only if #4 proves the adapter can distinguish and preserve it**. Until then, apply blocks. The preview must show the effect across every affected target before a shared correction is applied. #10 must test whether people understand this display and when they expect a local exception.

No generated preview counts as a native editable result. If the host render can differ from the local preview, #4 must either provide a faithful native preview with known limits or revise this workflow. Source and output copy, IDs, assets, styles and group constraints must still pass the existing engine checks; new rule/lock checks add to them rather than replacing them.

## 5. Apply, retry, partial failure and undo (proposed protocol)

Apply takes an explicit `operationId` and exact `previewId`/digest. It requires a durable operation journal before the first native write. The adapter must check the captured source, campaign and native revisions again immediately before writing, then record each target as `pending`, `applied-and-verified`, `failed`, or `uncertain`. Verification means reading back editable native nodes and matching the intended identity/content/geometry, not accepting a write API's success response alone. A successful apply advances recorded variant revisions and campaign revision only for confirmed changes.

An identical retry with the same `operationId` and digest returns the prior confirmed result or resumes only targets proven unapplied. A crash between native write and journal update makes a `pending` target **uncertain** on recovery. If a target is `uncertain`, the adapter must inspect it before retrying; if correspondence cannot be established, block and ask for manual recovery. Reusing an `operationId` with different content is an error. This is the **required observable idempotency behavior**, not a claim that Adobe currently provides transactions or idempotency keys. If no durable journal or reliable read-back exists, do not implement multi-variant apply.

If native operations are atomic across all affected variants, #4 must demonstrate that behavior. Otherwise a partial failure leaves confirmed variants visible as applied and remaining variants unchanged or uncertain, with an explicit recovery list. Never label the campaign “fully applied,” create duplicate pages/nodes on retry, or silently roll back a creator's later edits. Undo may use a verified host undo unit or a separately verified inverse operation; its scope and effect after later manual edits must be shown to the user. Without a verified undo path, say undo is unavailable and require an explicit recovery plan before promising the workflow. A retained pre-apply snapshot alone does not prove safe undo.

## 6. Worked sequences to challenge the proposal

1. **Shared association with an exception.** A source product image `bag-image` and price text `bag-price` have stable source IDs. The creator proposes rule `r1` associating them in square, story and landscape targets. Story already has a deliberate distant price treatment, so exception `{ruleId:r1,targetId:story,mode:suppress}` is recorded. Preview shows proposed square and landscape arrangements and labels story as exempt. Apply cannot change `bag-price.text`, asset ID, explicit rigid groups or paint order. If square has a target-local geometry lock that prevents the association, square is infeasible and the multi-target apply is blocked until the creator resolves the conflict; landscape is not silently applied alone.
2. **Rule revision/removal.** The creator changes `r1`'s gap parameter. `ruleRevision` and `campaignRevision` advance; the old preview cannot apply. A new preview names affected square/landscape and retains the story exception. Later deletion tombstones `r1`; it stops shaping future candidates, but the already applied native geometry remains until a new preview/apply or verified undo changes it. The story exception is shown as dormant, not erased invisibly.
3. **External native edit after preview.** Preview `p7` is created while square variant revision is 4. The creator edits its price position directly in the native canvas, making observed revision/fingerprint 5. Applying `p7` must return `stale-variant`, identify square, and write **nothing**. Repreview may represent that edit as a target-local lock or exception only after the creator chooses and #4 proves the adapter can identify the exact native node. A source text edit similarly invalidates all affected previews through `sourceRevision`.
4. **Partial native apply and retry.** With two eligible targets, operation `op9` writes square and verifies its nodes, then fails while writing landscape. The journal says square `applied-and-verified`, landscape `failed` or `uncertain`, and never “all applied.” Retrying `op9` checks square's current fingerprint and skips it only if it still matches; landscape is retried only after proving no duplicate target exists. A changed square since the failure blocks automatic retry. Undo is offered only if #4 verifies a safe host undo or inverse operation for the actual state.

These examples are acceptance scenarios for a future implementation, not test results or product validation.

## 7. Requirement-to-evidence and decision matrix

| #14 requirement | Current evidence on September 22 | Proof still needed; owner/gate | Decision if absent |
| --- | --- | --- | --- |
| Stable source/element/target identity and revisions | Internal `Design.id`/element IDs and target fields are validated; one-call preservation is tested. No campaign or host mapping exists. | #4: native IDs or safe remapping across apply, direct edit and reopen; stable variant/page identity; revision or full supported-state read-back. | Keep local-only stateless generation; do not persist or synchronize corrections. |
| Schema/algorithm versioned campaign record | `reflow.design.v0` is provisional; no campaign schema or migration code. | #4: supported persistence location, migration/upgrade behavior, official adapter version and read-back. | Treat old campaigns as unsupported/import-only; no silent conversion. |
| Rigid groups and reflowable relationships | Current explicit groups use uniform transforms and group-geometry diagnostics; no reflowable rule engine exists. | #5/#7: feasible rule semantics and independent visual outcomes; #10: creator interpretation of “together.” | Omit shared relationship control or narrow it to explicitly supported cases. |
| Locks and per-target exceptions | No locks/exception state. Local workbench edits reset. | #10: distinguish shared versus local edits; #4: persist and map local native edits without loss. | Use manual native editing without claiming regeneration preserves exceptions. |
| Rule revision/removal without losing explicit exceptions | No rule store or history. | #4: reopen/version/tombstone behavior; #10: understanding of dormant exceptions and non-reverted geometry. | Limit corrections to a single unsaved preview or drop shared rules. |
| Affected-variant preview before apply | Local comparison page exists; no correction preview or host-supported preview surface. | #4: faithful native preview surface and diff; #10: comprehension of affected/unaffected variants. | Keep explicit separate previews or drop bulk apply. |
| Stale source/native edit detection | Engine validates a supplied snapshot only; it cannot observe later host edits. | #4: edit/read-back/reopen experiments, including external edits and unsupported content. | Block apply when freshness is uncertain. |
| Durable apply, idempotent retry, partial-failure recovery and undo | No native apply or campaign journal; Express probe table marks undo pending. | #4: write/read-back, persistence, duplicate prevention, partial write and undo experiments with actual native documents. | Do not offer multi-variant apply or undo claims; reduce to one explicit operation if safe. |
| Useful correction workflow | Team plan and Express storyboard are hypotheses. No #10 creator results or #7 independent automatic quality study. | #10: observed repeated corrections, exceptions, comprehension, keep/change/drop; #7: quality/readiness and separate cleanup-time evidence. | Defer or drop the optional finale feature. |
| Complete correction → preview → exception → apply → reopen/undo journey | No implemented journey; only a proposed storyboard. | After #4/#7/#10 gates, test one native editable campaign through every step and retain failures as well as successes. | Do not present the storyboard as functioning software. |
| Isolation from automatic qualification | Current `reflow` has no correction input. | Future tests must run automatic evaluation without campaign state or human repair and record product-stage outcomes separately. | Stop any integration that contaminates first-stage comparisons. |

## 8. Questions to resolve before an implementation plan

1. Which native document/page/node IDs and revision signals survive save/reopen, duplication and direct edits? Can unsupported content be enumerated without flattening?
2. Can an add-on store a campaign sidecar and operation journal durably and read it back? What are the permission, offline and migration constraints?
3. Can a preview show true native editable output or a faithful documented approximation, and how are partial writes/undo grouped by the host?
4. What relation does a creator actually intend when they say image and price should “stay together”? Is a target-local suppress exception clear, or does their workflow need a different control?
5. Is the automatic engine sufficiently reliable on unfamiliar designs to justify optional correction-transfer work within the released competition rules and timeline?

Until those answers are backed by #4/#10/#7 evidence, #14 remains a specification draft and implementation stays gated.
