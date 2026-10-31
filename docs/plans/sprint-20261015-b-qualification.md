# Lane B exact-source qualification plan — 2026-10-15

The baseline is 8ac29a0103bdb8c092c59ab88160a5a58952181a. Historical image proof does not cover the integrated sprint source. Lane B owns packaging and qualification only; no production change is planned without a reproduced defect.

Use the existing GitHub Ubuntu 24.04 workflow, with publication coordinated through D/root. Preserve its pinned upstream a44a06046b0413f0785e7203955c3822e0acbc32 and four negative controls. Do not repeat the known unsupported userns path or modify runtime privileges. Record recent timings and select a useful dispatch at T+50. Common start 14:35:47Z; production freeze 15:40:47Z; no new heavy jobs 16:10:47Z; hard stop 16:35:47Z.

Steps: run the named host regression suite with pinned upstream and reject skips; inspect command/artifact accounting; receive a published immutable ref from D/root; dispatch existing workflow only at that verified ref; read back actual run head and artifacts; verify output bytes and all ledgers; hand exact hashes to D. A packaging defect, if found, requires a behavioral failing test and positive control before the smallest repair, then full Python/npm validation.

Acceptance: source HEAD, clean fingerprint, image digest and linux/amd64 agree; three public inputs yield six outputs; genuine renderer records REAL 3/FALLBACK 0; runtime network is none/blocked; input hashes unchanged and read-only write refused; same-image ordinary repeat bytes identical; all four controls fail for intended reasons. Retain capability separately from image proof. Candidate/current/merged SHA claims remain separate. Native/human/organizer acceptance remains open. Failure or deadline exhaustion produces a bounded partial receipt, not acceptance.

Documentation checks: commands match current workflow/harness; receipts contain actual host, SHA, exit, count/skips, artifact hashes and limitations. Existing workflow is sufficient; no new reusable skill is needed.

## Observed packaging correction, 14:54Z

Candidate A 3fdd1b38 passed all six Linux clipping tests but failed the existing dependency contract: direct skia import is not allowed by the Pillow-only assertion. Skia144.0.post2 already exists as a transitive constraint of pinned cr-renderer. Because engine code now imports it directly, declare it directly at the same exact pin and derive allowed import modules from explicit declared distributions (Pillow/PIL and skia-python/skia); do not permit arbitrary installed transitives. D explicitly transferred requirements/constraints scope if needed. Constraints need no version change.

Record focused existing-test RED against A, then test direct requirement and allowlist behavior with missing/unknown-dependency controls. Run four packaging modules with no skips, full canonical Python gate on hosted integrated source, plus npm test/build locally as required. Full hosted gate and image remain separate. Only packaging requirements/test/plan edits belong to B.

D coordination update: D owns one combined npm test/build and canonical Mac/Linux validation after integration. B npm test was interrupted promptly when this coordination arrived; no result claimed. Focused B host packaging suite validates the candidate; no duplicate full jobs.
