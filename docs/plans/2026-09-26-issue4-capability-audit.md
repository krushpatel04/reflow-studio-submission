# Issue #4 capability audit — September 26, 2026

## Problem and scope

Live issue #4 is open at intake `c4af8e7`. The September 22 access attempt stopped at Adobe sign-in; local renderer evidence does not establish native editing. Full acceptance includes two observed design workflows, a native editable operation, source → adapter → engine → official renderer → native round trip, edit/save/reopen, undo/failure/retry, font/asset fidelity, and authoritative competition/runtime/model constraints.

This bounded slice owns only this plan, `docs/express-workflow.md`, and `docs/evidence/2026-09-26-issue4/`. No shared interface, engine, README, progress, competition adapter, or submission code changes. Work stops by September 27 00:19 UTC. Publish a `jo/` branch for coordinator integration.

## Risks and intended behavior

Separate official documentation from observed host behavior, experimental from stable APIs, SDK capabilities from competition authorization, and missing evidence from unsupported features. Avoid silent flattening, discarded nodes, inferred authentication, invented timings, and asset/font parity claims. Preserve concurrent work and original designs. No outreach or vault writes.

## Steps

1. Read repository context and current issue; record acceptance gaps.
2. Verify official SDK/document-sandbox pages and accessible competition sources; make a dated support matrix with direct links and unresolved limits.
3. Use a dedicated browser session to check Express/Playground access. If authenticated and feasible, perform the smallest documented native operation in a scratch document; otherwise record the exact stopping step.
4. Produce a reproducible next-run checklist and narrowly scoped probe only if its documented API contract can be verified. Never claim an unexecuted probe passed.
5. Update workflow with evidence links, verify content/local links and whitespace, commit only owned files, fetch and push branch, and deliver SHA, validation, blocker and next steps.

## Acceptance checks (before editing)

- Every capability row has an official source, documented status, host-tested status, and remaining test/limitation.
- Competition model/hardware/runtime/schema questions retain explicit unknowns unless a current authoritative source resolves them.
- Host log records UTC time, access route, exact stop, and any actual mutation; no secrets or account details.
- No issue acceptance is checked complete from API documentation alone.
- Markdown relative links resolve; `git diff --check` passes; changed paths stay within ownership.
- Documentation only: no artificial code tests. Any executable probe requires a contract/syntax check and is marked host-unverified unless actually executed.

## Results

The current official hub supplies brief v1.5 and FAQ v3. The brief removes the stage-one viewer requirement and links a public starter at `a44a06046b0413f0785e7203955c3822e0acbc32`; the schema exists but is explicitly provisional. This changes the first qualification checkpoint to the offline adapter/official-renderer path. The native roundtrip remains a product/finale gate. Conflicting viewer/finalist-count/freeze statements are retained in the [contract audit](../evidence/2026-09-26-issue4/competition-contract.md).

Completed the [evidence handoff](../evidence/2026-09-26-issue4/README.md), all 28 schema element fields, wrapper/canvas/style-run mapping, current SDK matrix and native continuation runbook. Host access reached sign-in using agent-browser 0.38.1, including the Playground destination; no authenticated canvas or native edit was tested. No production or executable probe code changed. Plan updated to prioritize the released contract over a speculative native probe.

Content checks: seven Markdown files, 32 relative links resolved, all 28 element-field rows and all five style-run fields present; JSON manifest parses. Checks rerun after evidence links/results were added. Source manifest freezes ten inspected files by Git blob SHA and SHA-256. Screenshot inspection verifies the access gate and source identity/page content. `git diff --check` passed. No artificial tests/build for documentation. Remaining native/official-renderer execution and policy questions are explicit; proposed tests are not passing-result claims.

Skill assessment: existing browser/PDF skills plus repository workflow are sufficient; no new reusable skill. No vault updates, shared-interface edits, issue mutations or organizer outreach.
