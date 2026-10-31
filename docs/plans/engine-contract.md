# Engine kickoff: contract validation and preservation

**Issue:** [#2](https://github.com/ojedaJD/reflow-studio/issues/2)  
**Owner:** ojedaJD — engine  
**Status:** implemented and verified under the owner-requested direct-push workflow. [PR #18](https://github.com/ojedaJD/reflow-studio/pull/18) was opened under the previous policy; reviewer approval is no longer required. Branch `codex/engine-contract-issue-2`, based on `e71bd95`.

This plan follows the [required workflow](../development-workflow.md). Decisions below were refined against the current engine before writing regression tests or production changes.

## Problem and evidence

The [adversarial review](../adversarial-review.md) reproduced incomplete input validation and output-preservation checks. Missing font family, unknown asset, missing focal point, and invalid opacity can pass validation. Rendering can then fail or silently use unintended behavior.

The evaluator also accepts independently injected changes to headline opacity, brand color, group membership, paint order, and element inventory. This lets destructive output appear to pass internal checks. See the [dated evidence](../evidence/2026-09-15-adversarial/README.md) and `scripts/adversarial-probes.ts`.

## Why it matters

Real inputs and the future Adobe adapter need a dependable boundary. Layout ranking cannot be trusted when invalid or altered content still looks feasible to its checks. Silent changes to copy, branding, or associations also undermine editability and user confidence.

## Intended behavior and scope

- Validate the documented provisional design contract and report actionable document/element-level problems before layout or rendering.
- Separate structural validation from asset/font availability. Define an explicit resource-resolution contract independent of synthetic fixture definitions; document how callers supply capabilities and how the existing bundled path remains usable.
- Validate output inventory, IDs, element types, copy, assets, roles, groups, paint order, and protected styles against the source.
- Specify which properties layout may change. Current transforms change target dimensions, element geometry, text size, and rectangle radius; do not accidentally reject legitimate transformations or permit arbitrary style edits through an overly broad exemption.
- Preserve valid existing behavior, identity output, and source immutability. Document supported features and explicit unsupported cases without calling the internal format Adobe's official schema.

The mixed-role geometry fix belongs to #5; rendered visibility/contrast/layering belongs to #6; nearby-size stability belongs to #12. Keep those failures visible and hand off dependencies. This first task does not implement campaign UI, change the story scope, or specialize the engine to any business.

## Risks and failure modes

| Risk | Consequence | Planned check |
| --- | --- | --- |
| Checking only known source IDs | Extra or duplicate output elements escape detection | Exact inventory and duplicate-ID cases |
| Validating only content-role elements | Decoration can hide or alter important content | Preservation checks across all roles; visibility remains a separate gate |
| Treating every changed numeric field as legal | Opacity, weight, or line height can silently change | Explicit per-field policy and mutation tests |
| Comparing everything byte-for-byte | Legitimate resize, text fitting, or corner-radius scaling is rejected | Positive controls from every existing candidate |
| Fixture-coupled resource validation | General documents cannot supply assets/fonts | Resolver with a non-fixture resource and explicit missing-resource cases |
| Calling unsupported inputs invalid without explanation | Callers cannot distinguish malformed data from unavailable resources | Actionable error categories/locations and documented limits |
| Partial checks on malformed nested values | Raw TypeErrors reach users | Null/type/non-finite and nested-field cases |

Decide handling of optional defaults (for example omitted opacity versus 1), finite/range limits, color syntax, font capabilities, resource availability, and group metadata in the plan before implementation. Test legal opacity 0 and 1 as schema values; a change from visible to invisible output is a separate preservation failure. Keep prototype resource ceilings explicitly provisional.

## Test cases and acceptance criteria

Write executable tests before changing production code. Start with a small failing slice; repeat red → green → refactor rather than making a large unverified rewrite.

| Test family | Required cases and expected outcome |
| --- | --- |
| Valid inputs | All current fixtures pass; valid optional/default and boundary values follow the documented contract |
| Malformed inputs | Missing/unsupported font fields, invalid colors/styles, missing/invalid focal points, invalid fit/align values, invalid opacity, non-finite geometry, malformed groups and references return actionable errors |
| Resource availability | Unknown/missing asset or unsupported font capability is diagnosed before rendering; caller-provided supported resources are not restricted to fixture IDs |
| Destructive output mutations | Independently change each protected field; remove/add/duplicate an element; alter roles, group membership, asset identity or paint order. Detect the intended violation |
| Legal layout changes | Identity, uniform, stack and split preserve the contract while allowed geometry/text-size/radius changes remain legal |
| Immutability | Validation/evaluation/reflow do not mutate the supplied source |
| Positive controls | Valid intentional layering still passes its relevant checks; structural success alone is not called visible correctness |

Use minimal synthetic cases as well as the archived examples. Tests must assert outcomes independently of the selector's own ordering. Verify the first regression failures are behavioral, record their commands/output, and only then change the production implementation.

## Implementation steps and ownership

### Refined contract decisions (September 16, 2026)

- Slice 1: `validateDesign(unknown)` checks structure only, with a `DesignValidationError` carrying `category`, `code`, and `path`. Reject unknown fields (including unsupported types/version), malformed nested values, duplicate IDs, invalid group references, and non-finite values. Keep the first error deterministic and actionable. Validate target objects at the reflow boundary too.
- Required metadata: nonempty design ID/name/provenance; string description (empty allowed). Provenance and font family become strings so callers can describe authored/imported documents and registered non-fixture fonts. IDs and references are opaque, nonblank strings. Font family is a single name using letters, numbers, spaces, `_`, or `-`, avoiding CSS font-list/quote ambiguity.
- Supported colors are hexadecimal RGB/RGBA (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`). Canvas dimensions remain 1–8000; 1–100 elements; at most 100 flat groups; text at most 10,000 UTF-16 units. Geometry must be finite with positive extents and finite endpoints. Font size positive, weight 1–1000, line height at least 1, focal coordinates/opacity 0–1 inclusive, rectangle radius nonnegative. No new performance guarantee is implied by these ceilings.
- Optional values use existing rendering defaults: opacity 1, text align left, rectangle radius 0, absent groupId means ungrouped. Explicit undefined is treated like omission; null is invalid. Empty text, transparent source content, off-canvas source geometry, intentional overlaps, and unused group definitions are structurally legal. Ellipse radius and other unimplemented fields are rejected rather than silently ignored.
- Slice 2: add a resource interface with `resolveAsset(id)` and `supportsFont(family, weight)`, plus separate resource validation. The bundled default resolves existing assets and exact installed font weights. Move the asset catalog out of fixtures, retaining its existing re-export. Reflow takes an optional fourth resource argument; SVG rendering takes an optional fourth argument after metrics. The supplied measurer/renderer must actually provide the declared fonts/assets. No network fetch or dynamic font installation. Native benchmark remains bundled; add its boundary check without redesigning its renderer.
- Slice 3: evaluate exact inventory, duplicate IDs, element array order, all metadata/groups, and every supported protected element field across all roles. Keep existing `missing-content` findings for lost/changed identity, type, copy, assets; add `preservation` for styles/metadata/order and `invalid-design` for malformed candidates. Errors include paths. Only canvas dimensions, element x/y/width/height, text fontSize, and rectangle radius may vary. Compare defaults semantically without mutating input. Geometry diagnostics still run for structurally valid destructive output.
- Shared-interface coordination: publish these additive call signatures and finding kinds in issue #2 before production edits; make the interface notes available to JunhoHwoang and krushpatel04; review is optional. No teammate agreement or review is presumed. Ownership stays with JD; changes in rendering/native files are narrow prerequisites for resource checks.
- Documentation acceptance: link the complete field/resource/preservation policy from README and progress, verify relative links and diff, preserve historical evidence and clearly separate structural checks from visual quality.

1. Read the current issue, model, engine, evaluator, typography/rendering call sites, fixtures, and tests. Confirm baseline state and refine this plan's field/resource policy.
2. Write and run focused validation regressions first; record failures, implement a coherent validation boundary, and retain valid-input controls.
3. Write and run strict preservation regressions first; implement the protected-field and allowed-change policy, retaining valid candidate coverage.
4. Introduce resource/capability boundaries only as needed for the issue, with tests first. Coordinate shared interfaces with Junho's typography/rendering work and Krush's import/evaluation work; document the agreed interface without claiming a teammate reviewed it when they have not.
5. Document the contract, run required validation, and publish the implementation linked to #2. A PR is optional under the hackathon workflow. Keep separate remaining issues open.

Primary files: `src/model.ts`, `src/evaluate.ts`, engine entry-point wiring where needed, and focused tests under `tests/`. The new task owns this engine slice. Teammates may edit the same repository; do not revert their work. A separate branch/worktree is optional when it helps avoid overlap.

## Validation and handoff

- Record baseline and new failing-test commands before production edits, followed by their passing results.
- Run `npm test`, `npm run build`, `npm run verify`, and `npm run benchmark`; inspect representative outputs because changing feasibility checks can affect selection.
- Re-run `npm run review:probes` and explain what now changes. It is an observation script, not a pass/fail gate.
- Confirm earlier group, visibility, stability, and runtime limitations are not accidentally described as fixed.
- Update status/contract documentation with actual evidence. Use the human Git identity and no AI co-author trailers. Teammate review is optional under the hackathon workflow; do not wait for reviewer approval.

## Execution record

- Setup: confirmed empty unborn repository with no user files/remotes; added authorized SSH origin, fetched, checked out tracking main, then created the focused branch. Base `e71bd95` includes PR #17. Human Git identity confirmed. No unrelated files copied.
- Baseline: `npm ci --cache .cache/npm` succeeded; `npm test` passed all 9 existing tests before production edits.
- Commands/results below record each slice; generated logs remain under ignored `reports/issue-2/`.
- Slice 1 red: `node_modules/.bin/tsx --test tests/contract.test.ts` on unchanged production code: 68 tests, 1 pass, 67 fail. Missing font family/focal point, invalid opacity/colors/metadata/unknown fields produced `Missing expected exception`; existing generic errors lack category/path; null target produced `TypeError`. Valid fixture/default controls passed. Full local output: `reports/issue-2/structure-red.txt` (ignored).
- Slice 1 green: `npm test` passed 77/77; `npm run build` passed. Common typed validation helpers consolidate field checks without mutating input. Shared-interface coordination comment posted on issue #2 before production edits.
- Slice 2 red: `node_modules/.bin/tsx --test tests/resources.test.ts` on the slice-1 implementation: 10 tests, 1 pass, 9 fail. Reflow accepted missing assets (including inherited-property names), unavailable fonts/weights and ignored supplied capabilities. SVG raised a generic unknown-asset error for caller-provided artwork; default fixture rendering passed. Output: `reports/issue-2/resources-red.txt`.
- Slice 2 green: `npm test` passed 87/87; `npm run build` passed. Resource declarations now travel through additive arguments; the asset catalog moved without changing fixture artwork. Native rendering checks its bundled resource boundary.
- Slice 3 red: `node_modules/.bin/tsx --test tests/preservation.test.ts`: 31 tests, 2 pass, 29 fail. Style/opacity/group/order/extra-element injections produced no protected-field findings; malformed text reached measurement. Existing removed/copy/type/asset/duplicate detection did fire but lacked actionable paths, so those tests fail only their new path expectation. Identity/candidate/allowed-geometry and layering characterization controls passed. Output: `reports/issue-2/preservation-red.txt`.

- Slice 3 green: `npm test` passed 118/118; `npm run build` passed. Preservation uses explicit field projections and semantic defaults; malformed candidates return findings before measurement.
- Refactor/characterization: added nested/optional/color/finite-endpoint/deep-freeze and deletion controls; `npm test` passed 123/123 before narrowing the TypeScript shape union to match the already-enforced ellipse/rectangle policy and removing numeric casts. Final `npm test` again passed 123/123; final `npm run build` passed. No artificial failure was introduced for this behavior-preserving cleanup.
- Final `npm run verify`: all 30 native layouts passed. `npm run benchmark`: 30 cases; zero source/baseline/selected errors; 42 baseline and six selected warnings. All 70 design JSONs and 70 PNGs are byte-identical to the September 15 archive; no strategy changes. Timing runs overlapped other validation work and are not performance evidence.
- `npm run review:probes` completed as observational evidence: five protected-content mutations now report one error each; malformed font/focal/opacity fields fail structure checks; unknown asset remains structure-valid and receives a resource error before rendering. Mixed-role geometry still yields invisible white text with zero findings; 8/10 nearby-size choices still rearrange.
- Visual inspection: intentional-overlap story retains legible layered text; product-pairs square retains small labels/prices and sparse composition; mixed-role output still loses visible label placement. Native images are unchanged, so no new browser acceptance run was needed; the prior browser result remains historical.
- Complete [contract documentation](../design-contract.md) and [dated evidence](../evidence/2026-09-16-engine-contract/README.md) added, linked from README/progress. Relative-link/content checks and final diff review are required before publishing.
- Handoff checks: 45 relative links across five edited/new documents resolved; `git diff --check` passed. Reviewed production diff and scope; fetched origin again and main remained `e71bd95`, with no intervening shared changes. No dependency/lockfile, typography algorithm, layout candidate, probe script, or historical archive changes.
- Published implementation commit `6bc02595522dc244886798446f444b5558ea2399` in [PR #18](https://github.com/ojedaJD/reflow-studio/pull/18), linked to #2. Requested JunhoHwoang and krushpatel04 review by @mention in the PR; GitHub's reviewer picker showed no match for either account, so formal assignment remains pending availability. PR is open and unmerged.
- Owner policy change: after PR creation, the owner requested removing mandatory PRs/reviewers. The [hackathon workflow plan](hackathon-workflow.md) retains plan/test/verification requirements and allows direct pushes. Earlier PR/review notes above are historical; they no longer block landing this work.
