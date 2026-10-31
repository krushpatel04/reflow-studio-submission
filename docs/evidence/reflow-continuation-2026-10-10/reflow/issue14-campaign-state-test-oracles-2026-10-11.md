# #14 campaign-state test-oracle matrix, 2026-10-11

This is test design only. CLI2 read local Git objects with `git show`, `git cat-file` and `git ls-tree`. Nothing was checked out, fetched, imported, executed or edited. The doc adds one **oracle** to each contract scenario: a negative control, a layer and a testability class. It does **not** restate `docs/campaign-state-contract.md`; the contract is cited by line. It makes no claim about native-host or creator capability.

## 1. Provenance and revision caveat

- **Live issue #14 body readback (2026-10-11):** open, assigned to `ojedaJD`; the current October 5 amendment keeps campaign/correction scope separate from immediate A1–A4 qualification and retains #4/#10/#7 gates. Its acceptance criteria include stable IDs/revisions, preview and exceptions, persistence/reopen with stale-edit detection, native recovery/undo, a complete journey, and isolation from automatic evaluation. The matrix below maps proposed test oracles to the contract §6 sequences (L101-104) and §7 rows (L112-122); those are a historical draft contract, not evidence that the issue acceptance criteria have passed. The contract says the sequences are "acceptance scenarios for a future implementation, not test results" (L106) and that "#14 remains a specification draft and implementation stays gated" (L132).
- **Contract revision.** `git diff 390cb324 6352d95d` is +3 lines, 0 removed. The three lines are the October 5 alignment note (L3) and two blank lines (L4-5). Nothing else changed; every later line shifts by +3. All contract line numbers below refer to `6352d95d` (132 lines).
  - The two blobs are carried as follows. The list is not exhaustive, and no claim is made about other exchange refs.

    | Blob | Refs (as read locally) |
    | --- | --- |
    | `6352d95d` (newer) | `exchange/github/main` = `3c3c378`; `exchange/a3-p12` = `6658e0b` |
    | `390cb324` (older, without the note) | `exchange/agent-1/jo/reflow-coordinator` = `f08a795`; `6920ab65` (`exchange/agent-3/jo/reflow-milestone-viewer-request-lifecycle`); `4bc8731c` (`exchange/agent-1/jo/reflow-integration-final`); `a1581ea7` (`exchange/agent-3/jo/reflow-engine-28`) |

  - The October 5 note names `roadmap-2026-10-05.md` as "current authority". This doc does **not** use that roadmap as the #14 criteria. Any mention of it is labelled **historical roadmap dated Oct 5, not issue body or current main**.
- **Contract authorship:** commit `ae14b23` (2026-09-22, "Draft durable campaign state and recovery contract"). The author's name is withheld here.
- **Gating context, both @ `3c3c378`:**
  - `docs/roadmap-2026-09-22.md` L23: M5 is "conditional" ("Only if #10 supports it … A documented defer/drop decision is legitimate").
  - `docs/project-audit-2026-09-26.md` gates #14 on "#4 native persistence/recovery and #7 engine quality", after "#10 validation". **Cite correction:** the brief named audit L103/L108. In this blob, L103 is the #9 row and L108 is blank. The #14 row is **L105**, and that is the line cited here.
- **Root current-main readback:** `a8fd28f5295712d5bcbef53f4f014d0417ae5e08` has contract blob `7d971306`, engine blob `07d29d82`, main blob `3d709c06`, and existing test blobs `43ef7818`/`3586a0e9`/`78f57256` for engine/preservation/reflow-targets respectively. The cited historical contract blob `6352d95d` is not the current-main contract. Root verified these Git objects; CLI2 did not.
- **Plan check:** `docs/plans/campaign-state-contract.md` L29 says "No artificial code tests for prose". This doc adds no tests. It specifies oracles for future code.

| Ref:path | Blob | Bytes | SHA256 |
| --- | --- | --- | --- |
| `3c3c378:docs/campaign-state-contract.md` | `6352d95d9b7d65c669bbcb83b1c297d0a656d34f` | 24070 | `86c470cf36bbacc1a0b152deebdd57810986062777da5de42da1742ca9005b91` |
| `f08a795`/`6920ab65`/`4bc8731c`/`a1581ea7:docs/campaign-state-contract.md` | `390cb324b502e379f332cd54ececa0ee90660904` | 23357 | `d06a7e55782a6c4e830a0d079ea16b3a85a3988e8b78859e181d6b2d34aa5481` |
| `3c3c378:docs/plans/campaign-state-contract.md` | `68e97e2ce5a107b600948007210735e41f7b8483` | 4447 | `0ce8cd295fa7106baf0e94330823603c0e6ffa8f6eb7d7bd0969438981150b0b` |
| `3c3c378:docs/roadmap-2026-09-22.md` | `c43f916f4a1a3749634a3c4547e2f507de34e1e2` | 15764 | `b961071177d7ed6261544231c93944cbeab9678cdaca6ff0dd73d572754cb12f` |
| `3c3c378:docs/project-audit-2026-09-26.md` | `9f4f45315f6c530aea50ae8f15477a10717ebc9d` | 22779 | `f85ecc6675f9ff296b10b5446fb14326c3f70314065bd7796cfbdf8482e017f0` |
| `3c3c378:src/engine.ts` | `07d29d821d0b0a460434bfe8a07164cb563a5b49` | 13394 | `df14208e854612eaa074db7a96f35d96c8aae69306a8b128fe6a5f992fac2588` |
| `6920ab65:src/main.ts` (root-reported current-main equal) | `3d709c0663e4602e4f4b34f17bba47d621ba9788` | 16390 | `dfd8a975ee2730aaf687ce4db4023209c6bb4235e929a49be0d9477c4b9219f9` |

### Code facts used by the oracles

- `3c3c378:src/engine.ts` L186 has the signature `reflow(source, target, measure, resources = BUNDLED_RESOURCES)`. It takes no campaign or correction parameter, which is consistent with contract L122 "no correction input".
- `main.ts` L122-126 is the `#export` handler. It downloads `${source.id}-reflow.json` with `format: 'reflow.campaign.v0'`, `renderer`, `source`, `variants[]` (target, strategy, design, findings) and `failedTargets[]`.
- Existing local suites at `3c3c378` that future NOW-local rows would extend: `tests/engine.test.ts`, `tests/preservation.test.ts` and `tests/reflow-targets.test.ts`. They are cited as locations only, not as #14 coverage.

## 2. Test-oracle matrix

**Layer:** **U** unit (pure functions over sidecar/`Design` objects), **D** DOM (viewer harness), **H** host-native (actual native editable document).

**Testability:**
- **NOW-local** means it can be specified and run against local code once an implementation exists, with no host or creator evidence.
- **GATED** names its gate: #4 host, #10 creator or #7 quality.

Rows marked NOW-local still need an owner, and for the sidecar rows a campaign module that does not yet exist (contract L6: "No campaign-state module … implements this document").

| ID | Contract line | Precondition | Action | Expected observable | Negative control | Layer | Testability |
| --- | --- | --- | --- | --- | --- | --- | --- |
| O01 | §7 L122 isolation | Fixture corpus and targets; a campaign record with ≥1 rule/lock/exception exists | Run automatic `reflow` (`engine.ts` L186) for each fixture × target with and without the campaign record present in process/state | Deterministic `Result` fields equal in both runs after excluding the nondeterministic `elapsedMs` timing field; timing and evaluation outputs recorded separately from any product-stage outcome | Inject a correction into the automatic path (e.g. pre-applied lock moving one element): outputs differ, row FAILS | U | NOW-local |
| O02 | §2 L36 versions | Preview built under (`campaignSchemaVersion`, `designSchemaVersion`, `algorithmVersion`) = A | Change any one of the three values, then attempt apply | Apply refused with a version-mismatch result naming the field; regeneration required | Same versions unchanged: apply precondition passes this check | U | NOW-local (preview/apply precondition only; persistence/migration GATED #4) |
| O03 | §2 L29 stable IDs | Rule references `sourceElementId`s | Reorder `Design.elements` (paint order change kept as a separate source edit), rename display text | Rule still resolves to the same IDs; no reference stores an array index, text, or generated node ID | Sidecar fixture with an index-based reference (`subjects: [0]`) rejected by validation | U | NOW-local |
| O04 | §2 L34 source revision, L39 fingerprint | Preview names `sourceRevision`/fingerprint F | Edit one source text; recompute fingerprint | Fingerprint differs; preview invalidated (`stale-source`) | Re-serialize identical source with volatile field (signed URL) changed: fingerprint unchanged (L39 excludes volatile URLs) | U | NOW-local (fingerprint); native source detection GATED #4 |
| O05 | §2 L33/L37 revisions | Campaign at revision r | Make target, rule, exception or lock edit | `campaignRevision` strictly increases; every preview names exactly one revision | No-op save (no field change) does not advance revision, or does so only per declared policy; regression in revision fails | U | NOW-local |
| O06 | §4 L87 preview invalidation | Preview digest D over L83 inputs | Mutate each digest input in turn (source, target, rule, exception, lock, algorithm, adapter) | Each mutation alone invalidates D | Mutating a field outside the digest (e.g. UI theme) does not invalidate | U | NOW-local (local inputs); native variant input GATED #4 |
| O07 | §4 L81 read-only preview | Any preview | Generate preview | Zero host writes; local check: preview function has no write side effect on source/campaign objects (deep-equal before/after) | Harness preview that mutates the source object is detected | U / H | U NOW-local; host zero-write GATED #4 |
| O08 | §6 L101 seq 1; §7 L114 | `bag-image`/`bag-price`, rule `r1` over square/story/landscape, story `suppress` exception | Preview, then apply | Preview lists square/landscape affected, story exempt; `bag-price.text`, asset ID, rigid groups, paint order unchanged; square lock conflict blocks multi-target apply | Remove the exception: story appears as affected; drop the lock: square no longer blocked | U (preview); H (apply) | U NOW-local; apply GATED #4; "together" semantics GATED #10/#5/#7 (L114) |
| O09 | §6 L102 seq 2; §7 L116 | `r1` applied once | Change gap → new preview; then delete `r1` | Old preview refused; tombstone kept; story exception shown dormant; applied geometry untouched until new apply/undo | Hard-delete of `r1` (no tombstone) or erased dormant exception fails the row | U | NOW-local (sidecar semantics); reopen/version GATED #4; comprehension GATED #10 (L116) |
| O10 | §6 L103 seq 3; §7 L118 | Preview `p7` at square variant revision 4 | Native edit to price position (revision 5), apply `p7` | `stale-variant` naming square; **zero writes** | Same apply with no native edit proceeds past the freshness check | H | GATED #4 (native edit detection, L118) |
| O11 | §6 L104 seq 4; §7 L119 | `op9` over square + landscape; fault injected after square write | Apply, then retry `op9` | Journal: square `applied-and-verified`, landscape `failed`/`uncertain`, never "all applied"; retry skips square only if fingerprint matches; no duplicate node/page | Reuse `op9` with different content: error. Changed square since failure: automatic retry blocked | U (journal state machine, fake adapter); H (native) | Journal logic NOW-local with fake adapter; native behaviour GATED #4 (L119) |
| O12 | §5 L95 crash recovery | Journal entry `pending` | Simulate crash between write and journal update, recover | Target becomes `uncertain`; no retry until inspected | Recovery that marks it `applied` or retries blindly fails | U (fake adapter) / H | U NOW-local; H GATED #4 |
| O13 | §5 L97 undo | Applied operation | Request undo | Undo offered only with a verified path; otherwise "undo unavailable" shown | Fake adapter without undo capability: UI/API must not offer undo | U / H | Refusal NOW-local; verified undo GATED #4 |
| O14 | §7 L115 locks/exceptions | Per-target lock | Regenerate | Lock honoured in that target only | Same lock leaking into another target fails | U | NOW-local semantics; shared-vs-local comprehension GATED #10 |
| O15 | §7 L117 affected preview, L120 useful workflow, L121 full journey | — | — | **Deferred**: native preview surface, creator usefulness and full correction→reopen/undo journey | n/a: deferred rows make no claim; any doc presenting them as tested is rejected | H | GATED #4/#10/#7 |
| O16 | `main.ts` L122-126 vs contract L45, L49 | — | — | **FINDING, unresolved:** viewer JSON export already uses `format: 'reflow.campaign.v0'` (variants + failedTargets, no campaign IDs/revisions); contract's illustrative sidecar uses `campaignSchemaVersion: "draft.campaign.v0"` with `designSchemaVersion: "reflow.design.v0"`. Owner decides naming; this doc does not | A future campaign record that reuses `reflow.campaign.v0` without owner decision is flagged in review | U | Decision pending owner |

### Coverage of §6 and §7

| Contract item | Rows |
| --- | --- |
| §6 seq 1 (L101) | O08 |
| §6 seq 2 (L102) | O09 |
| §6 seq 3 (L103) | O10, O04 (source-edit half) |
| §6 seq 4 (L104) | O11, O12 |
| §7 L112 identity/revisions | O03, O05 |
| §7 L113 versioned record | O02, O16 |
| §7 L114 groups/relationships | O08 |
| §7 L115 locks/exceptions | O14 |
| §7 L116 rule revision/removal | O09 |
| §7 L117 affected-variant preview | O06, O07 (local); native surface deferred in O15 |
| §7 L118 stale detection | O04, O06, O10 |
| §7 L119 apply/retry/recovery/undo | O11, O12, O13 |
| §7 L120 useful workflow | O15 (deferred, #10/#7) |
| §7 L121 full journey | O15 (deferred, #4/#7/#10) |
| §7 L122 isolation | O01 |

## 3. Claim and prerequisite map

| Item | Detail | Trigger to proceed |
| --- | --- | --- |
| File: new campaign module under `src/` (name proposed only) | Sidecar validation, revisions, digest, journal state machine (O02-O09, O11-O14) | #14 implementation un-gated by root; owner assigned |
| File: new `tests/campaign-*.test.ts` (name proposed) | U rows | Same trigger; fake adapter scoped to tests |
| File: extend `tests/engine.test.ts` or a new isolation test | O01 | Can be written before the campaign module exists, using a stub record; owner assigned |
| File: `src/main.ts` L122-126 | Touched only if the owner renames the export format (O16) | Owner decision on O16; coordinate with the #28 `main.ts` follow-up |
| File: `docs/campaign-state-contract.md` | **Not edited here.** Any revision belongs to the contract author | Contract author accepts O16 finding or the oracles |
| Claim: contract authorship | `ae14b23` author owns contract text and decisions | Author/root review |
| Claim: #28 `main.ts` follow-up | Same file as O16 | Root confirms follow-up state |
| Gate: #4 host | O07 (H), O08 apply, O10, O11 (H), O12 (H), O13 verified undo, O15 | #4 evidence published by its owner |
| Gate: #10 creator | O08 semantics, O09/O14 comprehension, O15 | #10 findings published |
| Gate: #7 quality | O08 visual outcome, O15 | #7 independent quality evidence |
| Prerequisite: #14 body | Root read current open issue body; matrix covers test-design portions of acceptance, with implementation/native and creator criteria still gated | Recheck if issue body changes |
| Prerequisite: current-main readback | Root verified `a8fd28f5` objects above; historical contract differs from current-main blob | Recheck only on relevant source change |
| Prerequisite: #26/#27 first | Ordering per Coordinator | Root reports #26/#27 closed or waived |

## 4. Boundaries

- Test design only. No code, test or contract edits. Nothing executed.
- No claim of native-host or creator capability or validation. GATED rows wait on #4, #10 and #7 evidence.
- Current-main and issue-body claims are limited to the root readback above; the matrix still describes future test design, not completed issue acceptance.
- O16 records the format-name conflict without resolving it.
- No closure, assignment or merge claim. Root publishes.
