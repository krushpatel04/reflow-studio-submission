# Astra Stage 1 readiness review — 2026-10-27

## Plan (recorded before review changes)

Problem: a qualified offline engine is not by itself a complete Stage 1 review package. Source conflicts, stale release instructions, renderer provenance, output quality and packaging hygiene can still prevent an informed human review or submission.

Scope: independent read-only inspection of source `2445e72c99372062bcd286f3d04e69f55cfcb96a`, current remote, qualification artifacts, release documentation and representative output images. This report is the only owned write. No production changes, publication, organizer communication, submission or vault updates.

Risks: confusing historical results with current qualification; treating development outputs or AI judgment as hidden/human acceptance; assuming a full Express editor is required; overlooking required unscored deliverables or form/access/eligibility blockers. Preserve collaborator files and changes.

Steps:
1. Establish exact current source and evidence provenance; inspect release/operator instructions and image qualification.
2. Inspect representative archived outputs and submission context boundaries independently.
3. Identify concrete blockers with file/line evidence and the simplest remedy, separating technical readiness, official requirements and human decisions.
4. Recheck concurrent changes and record validation/limitations for root's repair loop.

Acceptance checks: every finding is traceable to inspected source/artifacts; qualification is source-bound; requirements conflicts are explicit; no unsupported quality/acceptance claim; no production edits; final report names unresolved human decisions and a reusable-skill assessment.

## Review findings

### Verdict at reviewed source 2445e72

**Not ready to freeze as the final human-review candidate yet.** One visible regression and stale submission entrypoints require bounded repair. No reason found to expand into ML, a new corpus, a second engine or a full native editor. Official viewer disposition remains a separately owned requirements decision.

### R1 — P1: ancillary missing-asset placeholder was enlarged into the content row

`engine/composition.py:411–414` scales every ancillary image into a 36×14 bounding box; `:368` has the equivalent portrait rule. The exact hosted Level 3 JSON has `holiday_watermark` at **31.5×14**, and the real PNG shows a conspicuous red broken-image box beside the CTA/labels. Its source asset is intentionally absent; this is a missing-resource placeholder, **not** full renderer fallback. The source identity and asset reference remain present.

The [October 27 19:30 UTC human reviewer comment](https://github.com/kj-squared-labs/reflow-studio/pull/150#issuecomment-6451576304), read directly in this review, independently calls this “must fix,” records prior size12×5 and accepts the L2 output while judging current L3 readability better than prior versions. Its test-run claims remain teammate-reported; the hosted evidence below is independently checked.

**Smallest remedy:** preserve the absent asset/reference/ID and all protected fields while preventing its new enlargement into a prominent label-row defect. Keep the legitimate logo enlargement and text readability improvements. Add meaningful regression plus positive-control tests; avoid an ID-, text- or sample-specific exemption. Render the actual output again and inspect it. Any production change requires renewed source-bound validation and image qualification; previous passes do not transfer.

### R2 — P1 for review handoff: release entrypoints identify obsolete candidate and unfinished work

`README.md:5` links qualification of `f6b919f`; its linked `docs/release/friday-2026-10-30/A-submission-handoff.md:5,19` identifies `6d82709`, no assigned final image, and pending A-2/A-3. The B package audit describes29files and only three engine modules although the current fingerprint includes `engine/composition.py` and the later local receipt records30files. `B-runbook.md` retains internal Agent A slot instructions, so it is an operator draft rather than fully self-contained judge instructions.

**Smallest remedy:** publish one current, clearly scoped review handoff with exact candidate SHA, image ID, qualification links, manifest/output hashes, visual verdict and unresolved decisions. Point README there and explicitly mark superseded audits historical. Give judges runnable instructions without internal agent ownership prerequisites. Do not require an image archive unless the final official transport actually requests one.

### R3 — P1 for fresh hosted qualification: current Actions execution failure needs honest disposition

Actions run [40554022530](https://github.com/kj-squared-labs/reflow-studio/actions/runs/40554022530) at `2445e72` has all three jobs failed with empty step lists. This review independently read that API state. Junho's comment attributes the failure to account payment/spending restrictions; that cause is teammate-reported here, with root independently investigating. The earlier dispatch qualification did run successfully at the same source; neither erase its evidence nor describe the later push run as passed.

**Smallest remedy:** resolve the actual account restriction or use an already authorized equivalent execution host with explicit provenance and limitations, then validate the revised candidate. Never weaken gates or treat jobs that never started as product regression or success. Whether current hosted CI is required for handoff remains root's documented gate; a new source does not inherit the old qualification.

### Requirements and submission boundaries

The current repository handoff records GitHub-link transport and unresolved viewer/deadline/private-access matters. Root owns current official correspondence/form/PDF verification. This review does not settle those from historical docs. A full native editable Express integration should only enter Stage 1 scope if current authoritative requirements actually demand it; a required unscored viewer is a different deliverable. Registration, roster, finale eligibility, judge repository access and exact cutoff must be stated as verified or unresolved. Preparing this packet is not submission.

### Independently checked positive evidence

- `git ls-remote origin refs/heads/main` and local HEAD both resolved to `2445e72c99372062bcd286f3d04e69f55cfcb96a` during review.
- Live Actions API reported [40552811440](https://github.com/kj-squared-labs/reflow-studio/actions/runs/40552811440) success at that exact SHA; the image build/qualification step actually ran.
- Recovered `../hosted-final/qualification.json` and `fingerprint.json` identify clean source, the pinned starter, linux/amd64 image `sha256:f1660f0399912191ddb717c5ce65ee85468caf703bb8a0e9c1df793c2c463bc1`, three real converter events, blocked networking, read-only unchanged inputs, identical repeats, four adversarial qualification controls and all six failure-matrix cases passing.
- Independently SHA-256 checked every current engine/package file listed in the hosted fingerprint and every recovered official output JSON/PNG: **zero mismatches**. This links inspection to actual source/output bytes, not only filenames.
- Visually inspected all five archived development comparisons. Financial portrait/narrow layouts show a clear heading/body association and materially larger usable text; financial banner separates the three sections. Floral narrow/banner preserve the artwork and use the available canvas more effectively. The full illustration in a90px banner remains intrinsically small. These are exposed development/AI judgments, not hidden-test or human-study acceptance. The portrait comparison was display-resized; no new actual-size claim is inferred from it.
- Inspected the actual qualified official L3 PNG and JSON, independently identifying R1. Its readable label treatment and the enlarged placeholder can coexist; a minimum-font metric cannot clear visual quality by itself.
- Tracked-file hygiene scan found no dependency/cache directories or matching common private-key/GitHub-token/AWS-key patterns. This bounded pattern scan is not a comprehensive secret audit. Two tracked `reports/friday-2026-10-30/B` JSON files are deliberate historical package evidence, not dependency caches.
- Assembly script copies the explicit Python/resource context; Dockerfile copies only that context's engine, renderer, brand kit, schema and dependency files. The TypeScript viewer, corpus and development docs are excluded from the runtime image. Build-time dependencies require network; qualified execution does not.

### Verification and handoff limits

This is a documentation-only, read-only review with the plan recorded before the report. No artificial regression test was added. No production files, remote refs, shared workflows, vault files or external conversations were changed. Existing suite results were inspected as source-bound evidence, not rerun or relabeled as this lane's tests. Root owns R1 repair and final reconciliation; request another review at the revised exact source before freezing.

Acceptance checks: findings cite inspected locations/artifacts; source and output hashes matched; official-source uncertainty and AI/human distinctions are explicit; only this owned report was edited. Existing plan/test/qualification workflows already cover the repeatable process; **no new reusable skill is warranted**.


## Follow-up plan — documentation reconciliation and fix review

Root assigned this lane README, the old A handoff and B package audit in addition to this report. Root owns the new canonical `docs/release/2026-10-27-submission-review.md`, engine/tests and final qualification. Before editing: update the three entrypoints to identify that canonical packet, preserve dated audit facts, distinguish engine-first Stage 1 from unresolved viewer requirements, and avoid premature pass claims. Acceptance: relative links resolve once root creates the packet; old29-file/A-2/A-3 statements are explicitly historical; exact source/evidence remain centralized; no other file ownership changes. Then inspect the production diff/tests and revised actual render without claiming unobserved final qualification.

### Follow-up inspection — bounded fix and entrypoints

README now points to the canonical review packet, explains the local Python method and records the unresolved Stage 1 viewer conflict. Historical A handoff and B audit facts remain intact under explicit superseded/historical banners. Root created the canonical target during this pass. All local Markdown links in the three owned entrypoints resolve; `git diff --check` passed. The canonical packet explicitly marks the revised-source qualification pending and discloses the viewer, access and participant questions.

The production diff uses one `ancillary_scale` helper in both tall and wide arrangements. It caps artwork following the main subject at the established uniform scale without inspecting IDs, asset names or resource availability. The meaningful regression covers missing and present assets, arbitrary IDs, adjacent target sizes and a tall target; header-logo enlargement is a positive control. A second positive control protects lower-half artwork alongside the main subject. This addresses the objection to an arbitrary canvas-half rule. No new production blocker found in this bounded diff. New test lookup is positional after anonymizing IDs; test-side explicit mapping would be clearer if the test is extended, but the current pinned input makes this nonblocking. Final render and qualification remain pending.

### Provisional fix acceptance — direct Mac render

Independently ran `CHAMELEON_UPSTREAM="$PWD/.cache/chameleon" .cache/venv/bin/python -m unittest tests_python.test_composition_finish.CampaignReadability -v`: **9 tests passed in107.749s, no skips**, including both new tests and real-rendered-ink/positive controls. This run preceded root's later test-only cleanup/order-control addition; final gate remains root-owned.

Inspected `../readiness-official-mac/level3.png` at original728×90 resolution, its adjacent JSON, the hosted-final Linux before image and the earlier `official-frozen` Mac image. The placeholder is now12×5.333 instead of31.5×14 and no longer forms a prominent broken box. Header logo stays36×11.25, product is48.58square, and all eight text sizes remain9px. No new visible clipping, collision or readability regression was observed in the Mac comparison. This is **provisional AI visual acceptance of the bounded fix**, not human or organizer acceptance; Mac/Linux text wrapping differs, so fresh Linux qualification and image review are still required. The intentional missing-asset reference remains visible rather than being replaced or deleted.

Current disposition: R1 provisionally fixed pending final-source Linux proof; R2 entrypoint reconciliation complete with working links; R3 hosted account restriction remains explicit and any local qualification must retain its host identity. No new stop-ship issue found in the bounded code/documentation diff. Root's revised exact source and final evidence still require review before freezing.

## Final technical verdict — qualified engine source 4da7bb4

**PASS for this bounded technical candidate and its review artifacts. HOLD for actual Stage 1 submission.** Exact reviewed engine source: `4da7bb45962dbe96403a8b15622e72251e064349`. No further code or visual stop-ship issue was found in the bounded trailing-artwork change. The official viewer conflict, exact cutoff, judge repository access/frozen-ref arrangements and participant facts remain unresolved; this verdict does not waive them or establish organizer acceptance.

### Independently verified final bindings

Read the completed `../readiness-qualification-retry/qualification.json` and fingerprint directly. Qualification passes with no failures, source `4da7bb45962dbe96403a8b15622e72251e064349`, captured `git_dirty: false`, fingerprint verification exit0 and Linux/amd64 image **`sha256:80a78acf1578af5f4d12a05c03377c4fc22144652d1ebf0c7673869fed00e7b4`**. Every engine/package file listed in the fingerprint independently matched current SHA-256 bytes. The host is local Docker Desktop with an ARM host running the amd64 image, not GitHub's hosted runner or Adobe's scoring machine.

All four qualification controls pass; the actual entrypoint/probe records three REAL converter events, blocked network, read-only inputs, identical repeats, all six failure-matrix cases passing and a passing resource profile. The timeout control actually emitted both `PARENT_READY` and `CHILD_READY`, timed out, recorded kill exit0/container exit137 and confirmed container absence. The first attempt remains a real failed qualification: its timeout killed the container before startup markers were observed. It was preserved, and one isolated retry passed with unchanged source, gates and assertions. The successful retry image ID above differs from the first attempt; do not conflate their evidence.

Viewed the final Linux728×90 output at original resolution. The placeholder is restrained to12×5.333, header logo stays36×11.25, product stays47.3357square and all eight texts remain9px. No new visible clipping/collision or readability regression was found. The archived `banner-after-linux.png` is byte-identical to the inspected PNG and to both qualified entrypoint/repeat outputs: SHA-256 **`bf12d20ccf9384bd7f040942879ee3c4b8ed55465b0c47ee9ec2f5a1a9430475`**. Independently reproduced the documented sorted-JSON hash `0ba3602618ed7d34ce66015205b54ae7e1056c41dbef2af0b2db65c6bc81ce0a`. The anonymous-ID test now maps identities explicitly and reverses element order in the real-asset control; both that test and the platform pin update were inspected.

Read final logs: Python518 passed with no skips; focused Linux29 passed; Node741 passed with no failures/skips; UI build passed; native verification completed30layouts; benchmark produced70PNG/SVG/editable-document sets. Benchmark warnings are retained, not counted as universal quality acceptance. Linux focused tests used read-only harness mounts for test helpers/dependencies; those are not additions to the runtime image. The earlier9-test independent CampaignReadability run is additional scoped evidence, not a replacement for the final suites. Existing27-browser-test evidence belongs to the prior hosted source; no fresh browser run is claimed in this review.

### Remaining handoff caveats

The default root `Dockerfile` remains the older TypeScript path. Pinned starter instructions demonstrate `docker build .`, but no inspected text explicitly mandates that repository-root path or forbids a documented assembly step. The qualified Python assembly and named Dockerfile are clearly documented. This is a judge-automation compatibility caveat to disclose, not grounds for an unrequested packaging rewrite or a claim of root-default compatibility. Follow the README's Python build instructions.

README, canonical packet and archived-evidence local links resolve. Root will append final source/evidence bindings to the canonical packet and commit documentation-only receipts after this review. Those later documentation commits must be described as receipts for the qualified engine source, with engine/package fingerprint verification; they are not a fresh hosted qualification. An unrelated collaborator audit appeared after the clean-source capture and was preserved; it does not change the captured qualification identity or authorize claiming the entire later working tree clean. No runtime files were changed by this reviewer. Existing workflows suffice; no new reusable skill was created.
