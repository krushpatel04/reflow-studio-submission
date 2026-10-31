# SVG derivative association integration — 2026-10-09

## Plan before production changes

The saved Resources proposal repairs missing URL-to-raster associations when distinct SVG URLs have identical original bytes and complete source boxes. Deduplicate rendering by the existing job ID, but retain every requesting URL; validate raster results before associating each URL/box. This changes provenance bookkeeping, not geometry or raster bytes. Preserve every immutable producer artifact and all acceptance/eligibility records.

Read-only preparation verified current `origin/main` at `8d88e386e976dfac4594e182eaa8968093e03913`. Its `scripts/lica_official/resources.py` is byte-identical to the previously tested baseline, SHA256 `249512a660d1816db1505b69f7890231d82299122b0654f2f743e24e9e214663`. The new regression path does not exist on main. Saved proposal, candidate and 19-test fingerprints match the reviewed checkpoint:

- proposal: `4fc5a7bd68313d86d2ba13a63aa8d777a952707fe14477be214f47d2698ef004`
- candidate: `aacef7280dd4f42f1164463e6765ddf3552c8b26890a126e4e852b486bfe940f`
- tests: `3b85daefe300801c5d79b2370deb4dbcd6837b569e61b1abdaada477980f6821`

Human Krush's [explicit acknowledgment](https://github.com/kj-squared-labs/reflow-studio/issues/112#issuecomment-6073017959) transfers only `scripts/lica_official/resources.py`, new `tests_python/test_svg_derivative_provenance.py`, separate `docs/evidence/astra-svg-provenance/**` and ignored `reports/astra-svg-provenance/**`; it states no pending Resources edits and reserves all other Package A work. This supersedes the older owner-ACK-pending checkpoint. Root's **current collision check and clean managed worktree are still pending**, so no production edit or new test run has occurred in this preparation.

## Execution after explicit coordinator clearance

1. Use only the clean managed worktree provided by root, verify base and status, preserve the old dirty proposal worktree unchanged. Confirm exact two code-path reservation and current-main compatibility again if main moved.
2. Copy the already reviewed 19 tests unchanged; run them against that worktree's unmodified production module. Require expected association/result-trust semantic RED, with positive controls and zero setup errors. Preserve fresh command/log and baseline hashes. Do not repeat archived causality/replay or prior proof solely for activity.
3. Apply the smallest compatible saved Resources patch. Preserve original-hash-plus-complete-box IDs, subprocess fields, byte-producing renderer, fonts and schema. Record exact diff/hash; run the same focused tests GREEN. If a new failure or compatibility gap occurs, report it and make at most a targeted scoped correction before rechecking.
4. Verify focused existing resource-contract compatibility where mocks keep it light. Root owns required broader qualification and any real versioned three-development-source rebuild through the existing Steward lease. No local browser/full-suite/expensive rendering, no new workers/routes or direct channel messages.
5. Deliver exact changed paths, RED/GREEN logs, compatibility evidence and residual limits for independent exact-patch review. Root is sole publisher. No old metadata rewriting, no historical lineage invention, no acceptance/admission mutation or RF04 unblock claim.

## Acceptance and risks

Preserve all requested URL/complete-box bindings across repeated calls, late aliases, reversed order, distinct bytes and multiple boxes. Valid raster originals and fractional/zero box behavior remain positive controls. Incomplete, duplicate, unexpected, corrupt, missing or dimension-invalid raster results cannot acquire trusted links. The previous 24-permutation coordinator check supports deterministic index order; mocks do not prove real rendering. Review partial mutation on exceptional store failure, repeated-run conflicts and version fields without expanding into unrelated hardening. Independent review and root-controlled qualification/publication remain explicit gates.

Preparedness outcome: no production drift detected; no additional ownership expansion needed. Await coordinator collision disposition and worktree before executing step 1.

## Executed integration and targeted review correction

Coordinator explicitly cleared the collision check (Engine private1805 and UnblockIntegration107) and supplied clean managed worktree `/Users/ojeda/.codex/worktrees/svg-resource-associations/Reflow`, base8d88e386. Branch `jo/svg-resource-associations` was created. The unchanged 19 regressions first produced fresh baseline RED: ten semantic failures, nine passing controls, zero errors. Applying the exact saved proposal made all19 pass; five existing lightweight blob-store/raster-dimension controls passed.

Independent parent review identified one partial-publication gap: the last result's missing `chromium_version` could raise only after earlier links were published. A new owned regression reproduced that semantic failure before correction. One targeted change now captures the required version field in the validation tuple before publication. All20 regressions pass; no field-type redesign or version-consistency hardening was added. Initial19-test GREEN and targeted RED are preserved separately from final20-test GREEN.

The two-path implementation, exact hashes, logs, qualification prerequisites and remaining limits are recorded in the managed worktree's `docs/evidence/astra-svg-provenance/2026-10-09-integration/`. No browser/full-suite/real-source rebuild ran locally. Main Resources matched the prior baseline; no protected source, archive, admission or human-evidence file changed. Current readiness is focused tests complete and parent exact-patch review pending; guarded broader qualification and publication belong to root.
