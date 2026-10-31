# Dense-banner follow-up — October 27

Same official Level3 input, real renderer, Linux/amd64. Left/before is hosted-qualified source `2445e72`; after is the bounded trailing-artwork adjustment described in the [readiness plan](../../plans/2026-10-27-submission-readiness.md). This is a public-sample development comparison, not a hidden score.

Before, native728×90:

![Before](banner-before-linux.png)

After, native728×90:

![After](banner-after-linux.png)

The intentionally absent image remains present as the official converter's placeholder at12×5.333 rather than31.5×14. Its ID, original asset reference, opacity and paint order are preserved. Header logo remains36×11.25; all eight texts remain9px. Labels remain centered as the row becomes narrower. No asset pixels were generated or replaced. The product/logo remain small and headline hierarchy is constrained by the90px height.

The rule uses source geometry: ancillary artwork after the main subject is capped at the established uniform scale; header/alongside artwork retains its existing slot. Controls cover absent and real assets, anonymous IDs, reversed paint order, nearby wide/tall sizes, a legitimate enlarged header logo and a secondary image alongside a tall subject. The new regression first failed in six intended subcases; all20 focused tests subsequently passed. Mac and Linux official-renderer output were inspected separately. All21 accepted development PNGs are unchanged from the previous finish snapshot.

Canonical sorted-JSON SHA256 for revised L3: Mac `77633c5be4f7b15c80ef89fe743fde35317c89d2a4021902bc342e3d6b59f8e1`; Linux `0ba3602618ed7d34ce66015205b54ae7e1056c41dbef2af0b2db65c6bc81ce0a`. These platform-specific output hashes are not source/image hashes. Final source-bound qualification is recorded in the [submission review packet](../../release/2026-10-27-submission-review.md).

[Reviewed qualification summary](qualification-summary.json) binds clean starting source `4da7bb45962dbe96403a8b15622e72251e064349`, the actual passing image, package/input/output hashes, test counts, the retained first-attempt timeout-control failure and the unchanged-gate retry. Local Docker qualification passed; hosted execution of this follow-up remains unavailable because of GitHub billing. This documentation snapshot does not change the qualified engine files.

To check engine/package/input equality from the repository root, run `python3 submission/fingerprint.py verify docs/evidence/2026-10-27-readiness/package-fingerprint.json --inputs /path/to/pinned/chameleon/input`. The separate fingerprint is the verification manifest; the qualification summary is a review ledger, not that tool's manifest schema.
