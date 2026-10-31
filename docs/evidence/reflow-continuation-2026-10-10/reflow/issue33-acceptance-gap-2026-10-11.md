# #33 acceptance-gap map (corpus resources and preflight) — October 11, 2026

Docs only. CLI2 read local Git objects at one revision with `git show` / `git cat-file`. Nothing was checked out, fetched, imported, executed, scanned or tested. Every count is quoted from the cited blob line, and none is new. The #33 issue body was not supplied, so the gap criteria come from the plan and README only. Nothing from the #31/#32 map is repeated.

## 1. Revision and binding caveat

Revision read: `3c3c378137071bcfc98849930226815f32cb7a36`, the local exchange mirror of github/main, dated 2026-10-07. `868e23fc` is not present locally.

- **Bound to current main:** only `scripts/corpus-preflight.ts`. Root's `868e23fc` readback reports blob `d67e82e5`, and that equals the blob at `3c3c378`.
- **Valid at `3c3c378` only:** every other row, until root reads it back.

| Path @ `3c3c378` | Blob | Bytes | SHA256 | Binding |
| --- | --- | --- | --- | --- |
| `scripts/corpus-preflight.ts` | `d67e82e5b37d64dc85a465d2c4d56a286767692a` | 7036 | `c45b9baa9c9ab9fa01bfe1f30d570aa0bdb02f20e99ce874493fc362f28a0aee` | root-bound @ `868e23fc` |
| `scripts/corpus-resources.ts` | `1a276082078200150082e36ab2ebab8c44f097b0` | 9714 | `6aa0f4e8a923cea5ef056fa8a730f46ea7ffc57234413b5a22ab2e49fc4b2dff` | `3c3c378` only |
| `docs/plans/corpus-resource-preflight.md` | `63f66b6f293cb7d18f8080419c131e0dd74ae076` | 6309 | `87a981d1c48fc5f4eda4827a131664579ffd80363b2880043c3674bbbd16d731` | `3c3c378` only |
| `docs/evidence/2026-09-24-corpus-preflight/README.md` | `950e8959249f44a96ccae281e8110f050af46ae7` | 5293 | `994620b212da8ca2037d3d7a8dfb0a922ffa58c6c26a00533e626a84c0f7f765` | `3c3c378` only |
| `docs/evidence/2026-09-24-corpus-preflight/report.json` | `ff1307bce1a7ef5068cd31751c95f32d18c23188` | 209981 | `9c62c428b7b7ad53a6da7c6ab45c93694fa9fa4f642134c9760fd44ae3287a81` | `3c3c378` only |
| `docs/evidence/2026-09-26-project-audit/README.md` | `087e1e3f9bba46d33c51838fb9b5c1030adebb42` | 15052 | `1b3ddf0505272a0447b40d0d8723d9cdb0c8914a5d18029933d69eb746238e66` | `3c3c378` only |

## 2. What landed (author-recorded; CLI2 reran nothing)

Commit `c4af8e7f27ec028b22d0473e3f9040f39a029a70` (2026-09-24T15:50:56-04:00, "Add verified corpus resource catalog and preflight accounting"). It adds:

- `scripts/corpus-resources.ts` and `scripts/corpus-preflight.ts`
- tests `tests/corpus-resources.test.ts`, `tests/corpus-preflight.test.ts` and `tests/support/corpus-resource-fixture.ts`
- the plan, the dated evidence and `package.json`

Recorded results:

- Plan L92-96: "Final targeted run: 35/35 passing; full suite: 447/447 passing". `corpus:check` gives zero errors plus its existing no-test-families warning. Preflight has "21 catalog-ready sources / 147 accounted rows, with 67 unknown intrinsic asset sizes explicitly retained".
- Plan L78-84: baseline 406. Loader 18 red then 18 green; preflight 11 red then 11 green.
- README L9 and L84: "21/21 sources, 147/147 rows catalog-ready". README L83: `corpus:check` 0 errors / 1 warning. README L26: unverified dimensions "67: 38 SVG, 24 WebP, 5 JPEG".
- `report.json` L6279-6287: `sources` 21, `cases` 147, `byStatus` `catalog-ready` 147, `blocked` 0, `skipped-test` 0, `unsupported-conversion` 0.
- Project audit L57 and L61 list #33 as Backlog with partial work, where "Closure requires acceptance reconciliation".

## 3. Gap table — plan-declared, not issue-body

The criteria are the ones plan L26-27 lists as unverified and README L15-17 states are not established. `report.json` L6289-6297 records them as `evidence` fields.

| Criterion | Recorded state | Existing evidence | What would satisfy it | Prerequisite / owner | Event trigger |
| --- | --- | --- | --- | --- | --- |
| Engine execution | `engineExecution: "not-run"` (L6290) | **Partial.** One authored loader integration control uses a custom asset and a matching bundled measurer, which "proves resource plumbing for that authored control only" (README L87-89). | Engine runs over every catalog-ready source × target, with every case retained in the output matrix, including failed and quarantined ones (README L94-96). | Engine owner assigned by root; source at verified main. | Root assigns an engine-over-catalog slice. |
| Font registration / glyph coverage | `fontRegistrationAndCoverage: "unverified"` (L6291) | **None.** Preflight "performs no font registration" (README L59). Filename bindings "do not prove the embedded font family or coverage" (README L33). | Source-specific registration of the bound font bytes, plus per-source glyph-coverage results for the requested text. | Typography/renderer owner (plan L38). | A registration slice lands at verified main. |
| Rendering (incl. image decoding, dimensions) | `rendering: "not-run"`, `imageDecoding: "unverified"` (L6292-6293) | **None.** 67 intrinsic sizes are unknown (README L26). Envelope checks do not prove a decoder accepts the file (README L32-33). | Production SVG/PNG export for the catalog, with dimensions established for all formats before crop diagnostics are trusted (README L30-31, L94-95). | Renderer owner; depends on the two rows above. | Engine and registration rows are satisfied. |
| Permissions clearance | `permissions: "unverified"` (L6294) | **None established.** README L16 says permissions clearance is not established. Plan L72-73 says to keep file/hash diagnostics distinct from permissions. | A per-asset permission record supplied by an authorized human. | Rights owner or authorized human, recorded by root. Never inferred by an agent. | A permission record is supplied. |
| Source fidelity | `sourceFidelity: "unverified"` (L6295) | **None.** All 21 sources "remain adapted, with their conversion losses retained" (README L17-18; plan L29). | A rendered source-vs-original comparison per source, with losses enumerated. Adapted sources cannot count as faithful-quality wins. | Corpus/protocol owner (plan L39), together with the #34 source audit (README L96). | The rendering row is satisfied. |
| Human acceptance | `humanAcceptance: "unverified"` (L6296) | **None.** No human votes or measured aesthetic claims exist (plan L63-64). | The three-person pilot, combining #34's source audit and #20's review bundle (README L96-97). | Human reviewers; root to coordinate. | All rows above are satisfied, and the pilot is scheduled. |

Cross-reference, cited once and not counted here: the Engine3 consumer receipt for `67e8c30f` was already counted under #102. `67e8c30f` is not a local object, so CLI2 did not read it.

## 4. Boundaries

- There is **no closure claim** for #33. The README itself says "Keep #33 open" (L97).
- No permission is inferred. A declared `CC-BY-4.0` provenance license is not cleared permission.
- `catalog-ready` means "available verified bytes/references, not an acceptable design" (plan L28). "Exit 0 certifies no broader gate" (README L47). No quality claim is made.
- No current-main claim is made beyond the `d67e82e5` row. No new counts, no private paths or identities, no code or test edits, and no commit.
