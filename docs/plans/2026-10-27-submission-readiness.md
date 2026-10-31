# Submission readiness — October 27

## Problem and evidence

Main `2445e72` has qualified offline Python output and repaired development layouts, but README/release entrypoints still describe older sources. Current Adobe challenge PDF and starter FAQ disagree about a Stage 1 viewer. Exact closing time and private-repository judge access remain unknown; a newer organizer reply reportedly exists in JD's inaccessible OSU Outlook mailbox. Junho's latest human review accepts L2 and finds L3 readability improved, but flags an enlarged missing-asset placeholder as a visible defect. GitHub's newest push checks never started because of billing; earlier exact-source dispatches passed.

## Intended outcome and scope

A minimal, reproducible Stage 1 package and one clear human-review handoff, grounded in current official instructions and actual checks. Fix demonstrated visual regressions; retain source IDs, copy, assets, styles, order and groups. Build native Express only if authoritative Stage 1 instructions require it. Defer performance tuning, new models/features, corpus expansion and finale workflow. Do not submit or invent roster/registration/access answers. Preserve collaborator work and original checkout.

## Steps and risks

1. Read current Adobe sources and the identified organizer answer when accessible; maintain explicit source conflicts meanwhile. Missing evidence cannot be resolved by agent preference.
2. Run Astra adversarial review and monitor collaborator commits/PRs/CI every ten minutes, quiet when unchanged. Coordinate edits; no destructive reconciliation.
3. Characterize and test the prominent-placeholder regression before the smallest source-preserving geometry change. Avoid asset-ID-specific layout and avoid reducing real product/logo art. Inspect official rendered output and positive controls.
4. Re-run applicable Python/Node/layout/browser checks and offline qualification for changed engine source; billing failures remain visible. Do not transfer old qualification to new code.
5. Publish a current concise review receipt and update stale entrypoints, preserving dated historical evidence. Separate technical qualification, exposed visual evidence, human decisions and organizer acceptance.

## Acceptance and definition of done

- Official Stage 1 deliverables, deadline and delivery/access instructions traced to attributable sources; unresolved conflicts remain explicit blockers rather than assumed waivers.
- Required artifacts runnable by a judge from documented instructions; faithful JSON and real renderer PNGs, offline runtime, no secrets/caches in assembled context.
- New behavioral regression observed failing for the expected reason before production edits, then passing with positive controls; full required checks and image inspection complete.
- Final engine/package hashes and actual check outcomes recorded; host/account failures distinguished from code failures. Exact final source independently reviewed by Astra.
- Real team/registration/finale details confirmed by participants before the form is considered complete. No invented form answers or actual submission.
- JD receives a concrete review package and remaining external requests. Do not declare ready to submit while mandatory answers or qualification are absent.

Documentation checks: links resolve locally, source IDs/counts/hashes match actual reports, README gives canonical Python command, historical audits clearly labeled. Existing workflow is adequate; assess reusable-skill need at handoff.

## Test-first execution

`CHAMELEON_UPSTREAM="$PWD/.cache/chameleon" .cache/venv/bin/python -m unittest tests_python.test_composition_finish.CampaignReadability.test_small_footer_art_keeps_its_source_prominence_and_header_logo_can_grow -v` failed in all six expected subcases before production edits: footer width31.5 exceeded established uniform widths12/12.267/26.667. Log: ignored `../placeholder-red.log`. Both missing and present assets, arbitrary IDs and nearby wide/tall targets were covered. A separate alongside-subject positive control characterizes valid secondary art.

Astra challenged a proposed lower-half heuristic as unnecessarily broad. Use the source main-subject bottom instead: ancillary artwork wholly following the main subject retains at most the uniform output scale, while header/alongside art keeps its existing slot. No missing-asset lookup, ID rule, pixel replacement or deletion. Docker Desktop was started successfully; Linux daemon is available for fresh amd64 offline qualification despite hosted billing block.

## Final technical checks and handoff

Engine frozen at `4da7bb45962dbe96403a8b15622e72251e064349`. All518 local Python tests passed with zero skips (551.137s);741 Node tests passed with zero skips; build,30 native layouts and70 benchmark artifact sets passed (zero selected errors,8 warnings). Focused Linux composition/preservation tests:29 passed, zero skips (108.711s). The initial focused-container invocation lacked host-only test scripts/fontTools; corrected read-only mounts supplied the existing pinned test dependency, with no production-image change. All21 accepted development PNGs remain byte-identical to the preceding finish snapshot.

Fresh local Docker qualification passed for the exact clean starting source, actual Linux/amd64 image `sha256:80a78acf1578af5f4d12a05c03377c4fc22144652d1ebf0c7673869fed00e7b4`; fingerprint verify returned0. Three real converter calls/zero fallback; network none/blocked; source inputs read-only/unchanged; outputs repeat-identical; four injected controls, six failure cases and descriptive resource profile passed. The first qualification's timeout control failed to observe startup markers during concurrent checks. Its failure is retained; one isolated unchanged-gate retry observed both parent/child markers and proved termination/cleanup. No test assertion, deadline or renderer gate was relaxed. Final qualified L3PNG is byte-identical to the archived after image. Mac/Linux image inspection and Astra review remain exposed technical/development evidence.

A separate collaborator's untracked independent audit appeared during final profiling; it is preserved outside this commit's owned edits and not mislabeled as our requested Astra review. Engine/package/input hashes remained unchanged. Latest main/PR readbacks found no intervening engine change. The original stale checkout, unique contributor refs and older evidence remain intact.

The current [submission review packet](../release/2026-10-27-submission-review.md) and [reviewed snapshot](../evidence/2026-10-27-readiness/README.md) replace stale entrypoint status. A documentation-only receipt is checked for runtime fingerprint equality rather than claiming a fresh hosted run. README now names the host Python3 prerequisite. Native integration remains deferred: current official PDF and starter FAQ conflict; session Word document pending. Exact cutoff/timezone, private judge access and verified team/form facts remain genuine external prerequisites. A September15 event-registration email supports JD individually, not team registration. No form submitted, repository visibility changed, organizer message sent, old fleet reactivated or vault/memory saved. Requested ten-minute collaborator monitor is active and quiet without actionable changes. Existing workflows are sufficient; no reusable skill added.
