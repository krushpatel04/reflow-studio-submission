# Engine refinement — October 29, 2026

Source **`126c18668db7817b753383c98ff095ecd25c6226`**. [Execution plan](../../plans/2026-10-29-engine-refinement.md) · [Search plan](../../plans/2026-10-29-search-efficiency.md) · [Validation summary](validation.json). This completes the bounded implementation following the [investigation](../../research/2026-10-29-improvement-investigation.md). Nothing submitted to Adobe.

## Changes

- Measure repeated characters once per block; stop identical minimum-font-size retries; skip duplicate obstacle policies. Later distinct wrap caps and obstacle policies remain available.
- Allow a singleton text group into campaign copy flow without changing its group ID. Genuine multi-element groups remain protected.
- Retain extra ungrouped shapes at baseline geometry only when their rotated bounds clear the proposed foreground. Large obstructing shapes retain conservative fallback.
- Try bounded source-relative type sizes on wide campaigns, with a 9 px supporting-copy floor and the previous uniform alternative as fallback. Tall layouts retain prior behavior. No new model, service, dependency or Express integration.

## Verification

| Check | Result |
| --- | --- |
| Full Python gate |536/536, zero skips |
| Node tests |741/741, zero skips |
| Build/native/benchmark |Pass;30 native layouts,70 PNG/SVG/JSON sets, zero selected errors,8 existing TypeScript warnings |
| Accepted development replay |21 real renders, zero fallback/preservation failures;21/21 PNGs byte-identical to accepted snapshot |
| Original public cases on macOS |All3 JSON/PNG pairs unchanged; ordinary portrait also byte-identical |
| Linux focused tests |17/17 passed with a read-only test-only `fontTools` mount; no production package change |
| Linux expanded offline smoke |9 cases, real rendering, zero fallback, repeatable outputs, immutable inputs, network disabled |
| Clean-source release qualification |PASS on clean `126c186`: 3 public cases, 4 negative controls, 6 failure cases, resource profile and final fingerprint |

[Qualification receipt](qualification.json) · [Package fingerprint](fingerprint.json) · [Expanded Linux smoke](linux-quality-smoke.json) · [Development results](development-summary.json).

Initial Linux focused testing found a missing **test-only** `fontTools` dependency in the deliberately small runtime image. Its first failure was retained in generated logs. Supplying that dependency via a read-only mount allowed all 17 tests, including independent rendered ink, to pass; it was not added to the submission image. Actual offline qualification and expanded input runs use the unmodified production image without the mount.

The clean image harness verifies all 3 original public cases, real-renderer provenance, four negative controls, six failure-matrix scenarios and the resource profile. Qualified image: `sha256:a35d805ad91618d36443d16472cddf62b57318f398a48bc83f859e79bec7ea5a`. The expanded nine-case smoke used a separately built image recorded in validation.json. Its source checkout is clean; the clean-tree gate was not bypassed. Published documentation may advance HEAD without changing the recorded runtime files; verify the fingerprint rather than treating an old receipt as qualification of arbitrary later code.

## Measured speed

[Raw alternating trials](timings.json), local native Python layout only. Five trials per small workload; three per dense stress workload. Per-call Pillow cache cleared, residual first-use effects retained, no claim about Adobe hardware or total container latency.

| Workload | Comparison | Median before → after |
| --- | --- | --- |
|16 texts ×128 characters |Committed baseline → refined |59.1→13.0ms |
| Public Level3 |Committed baseline → refined |89.8→48.7ms |
| Infeasible1×1 |Committed baseline → refined |166.0→56.0ms |
|100 texts ×1,000 characters |Previous glyph-reuse-only candidate → refined |21.39→1.36s |

All paired output JSON hashes match. Dense100 remains unable to satisfy the readability floor: the improvement removes wasted work, not the physical content limit. Baseline modules and prior glyph candidate are fingerprinted in the preceding [investigation archive](../2026-10-29-deep-investigation/source-manifest.json); refined files are in validation.json. The hierarchy alternative adds some work versus glyph reuse alone on a small banner; the net timing above compares against committed baseline and must not be presented as an additional identical factor over glyph reuse.

## Visual and adversarial review

Test-first [RED evidence](red.txt) covers the actual singleton, decoration and hierarchy failures. The first hierarchy attempt reduced portrait supporting text; the additional [portrait regression](portrait-red.txt) failed 9 < 10 before restricting emphasis to wide layouts. Source immutability, complete protected fields, group IDs, anonymous IDs/reversed order, rotated bounds, collisions, unsupported typography and real ink are tested.

Astra reviewed exact production hashes and the actual macOS/Linux PNGs. The singleton legal line improves 1→9 px; decoration labels/supporting text improve 6→9 px. Roomy 970×250 hierarchy becomes 24/16/12 px on Mac and 22/15/11 px on Linux for headline/body/legal. The 728×101 short banner improves headline 9→13 px on Mac but retains the readable uniform 9 px fallback on Linux. This platform difference is disclosed, not hidden behind one screenshot. No new clipping/collision was observed. Human acceptance and unseen-design quality remain separate.

| Case | Before, macOS | After, macOS | After, Linux |
| --- | --- | --- | --- |
| Singleton group |[Before](singleton-before-macos.png)|[After](singleton-after-macos.png)|[Linux](singleton-after-linux.png)|
| Extra decoration |[Before](decoration-before-macos.png)|[After](decoration-after-macos.png)|[Linux](decoration-after-linux.png)|
| Roomy banner |[Before](roomy-before-macos.png)|[After](roomy-after-macos.png)|[Linux](roomy-after-linux.png)|
| Short banner |[Before](short-banner-before-macos.png)|[After](short-banner-after-macos.png)|[Linux](short-banner-after-linux.png)|

## Reproduce and limits

Use the pinned starter and test environment from the repository README. Run `CHAMELEON_UPSTREAM=/absolute/pinned/starter python scripts/verify_python.py`, then the four npm gates. The existing [development replay](../2026-10-27-layout-finish/reproduce.py) takes only the previously accepted manifest and extracted payloads; no sealed inputs are involved. Run `scripts/qualify_python_submission.py image --upstream /absolute/pinned/starter --out /new/evidence/path` from a clean checkout for release qualification.

Generated complete logs, fresh input variations, source comparisons and measurement scripts remain under `reports/engineering-refinement-2026-10-29/`. Archived records bind their exact source and outputs. The host is Apple Silicon; Linux/amd64 execution is emulated locally, not hosted CI. GitHub Actions cannot start jobs because of the existing billing/spending restriction, so these checks are not represented as green hosted CI. Existing workbench bundle-size and Docker fixed-platform warnings remain visible.

No aspect-guard expansion, font-face cache, ML work, viewer rebuild or new dependency was included. Organizer requirements, registrations, judge access, teammate feedback and submission authorization remain in the existing release packet. Existing workflows suffice; no new skill was created.
