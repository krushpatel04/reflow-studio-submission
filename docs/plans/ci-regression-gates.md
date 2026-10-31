# Main-branch CI regression gates — issue #13

## Problem and evidence

The repository has 153 unit/native regression tests and a browser acceptance page, but no CI workflow. A push can therefore bypass all existing validation, and failures have no attached runtime details or rendered evidence. Issue #8's container/runtime work explicitly depends on pending typography findings; #13's initial workflow is unblocked and can protect the completed engine work now.

## Scope and intended behavior

- Run a locked dependency install, tests, type/build checks, native verification, benchmark artifact generation, and headless Chromium acceptance on pushes to `main`, optional PRs, and manual dispatch.
- Reuse the actual existing preservation, mixed-role native pixel/glyph, malformed-input, identity/scale/group-order, and nearby-size regressions. Keep exploratory score/probe reports separate from quality gates.
- Promote `/verify.html` into an executable browser CI check: fail on failed checks, missing/incomplete reports, console/page errors, or timeout. Retain JSON, screenshots/traces, native images, and runtime/font/schema metadata on failure.
- Demonstrate the failure path using a test-page-only mutation that separates a badge's text from its backing. It must fail the real glyph-bound assertion and a hosted workflow, followed by a normal passing run; no unconditional `exit 1` or production fault switch.
- Preserve direct commits to main. No branch protection, required reviews, or PR requirement. Optional branches use `jo/`.

## Risks and boundaries

Browser/native font metrics may differ on Linux. Installation or GitHub Actions restrictions may block hosted execution; report real results instead of treating a YAML file as a passing run. External job/step timeouts bound CI, not synchronous engine execution. Artifact upload is best effort after a hard job cancellation. Use read-only repository permissions, official actions pinned to verified commits, and no repository secrets. Do not add an offline/container check until #8 supplies one; official-renderer and sealed-corpus checks remain #4/#7 work. No app layout or shared document interface changes are planned.

## Steps and acceptance checks

1. Run the existing meaningful tests before edits as behavior-preserving characterization. Record the result. Define workflow acceptance up front; do not manufacture a failing product test when product behavior is unchanged.
2. Add the browser CI specification/config and test-only injected badge mutation. Prove the negative fixture produces failed glyph evidence and nonzero runner exit, then prove normal acceptance passes. Check malformed/empty report rejection in the runner assertions.
3. Add a documented Node runtime, pinned browser test dependency, workflow with external timeouts, useful failure artifacts, and manual negative-control input. Check workflow syntax and event/permission/timeout/artifact behavior.
4. Run install/test/build/native/browser checks locally, inspect the failed and passing badge screenshots, and publish directly to main after fetching. Verify real hosted failure and passing runs and artifacts; retain links and a compact dated evidence snapshot.
5. Update README/progress/CI instructions, assess whether a new skill is useful, and preserve concurrent changes. Close full acceptance only when hosted evidence supports it; future #8/#4 integration remains explicitly conditional.

## Execution evidence

Skills loaded: verification and browser verification/control. The verification path is repository push → locked runner environment → native/browser assertions → retained evidence and job conclusion.

- Before implementation, `npm test` passed **153/153** existing characterization/regression tests. The first invocation was blocked by the sandbox's local socket restriction; it was an environment failure, not behavioral red evidence. Granted network/local-socket access and reran successfully.
- No production engine/layout change is intended. Meaningful red evidence will come from the deliberately separated badge in the actual browser gate; characterization stays green rather than introducing a fake product failure.
- Local browser negative control: **10/11 passed**, with `uniform: actual glyph bounds separated from the dark backing`; the new report validator exited **1** on that report. Removed the test-only mutation: **11/11 passed**, validator exit **0**. Inspected the real failed badge: the source label was visible, the moved label disappeared against white. Chromium could not launch under this desktop's Mach-port sandbox; that infrastructure failure is excluded from behavioral evidence and hosted Playwright execution will be checked separately.
- Local final tests: **160/160**, including seven report-contract controls; locked `npm ci`, build, native verification and benchmark pass. Workflow YAML, event triggers, read-only permissions, action commit pins, timeout and upload condition were checked.
- Hosted implementation commit `56757a7`: [normal push](https://github.com/ojedaJD/reflow-studio/actions/runs/35056343493) passed; [injected badge separation](https://github.com/ojedaJD/reflow-studio/actions/runs/35056385226) failed the intended glyph assertion with exit 1 and uploaded 229 evidence files; [fault removed](https://github.com/ojedaJD/reflow-studio/actions/runs/35056493606) passed. All three used the same production engine. See the [reviewed dated snapshot](../evidence/2026-09-16-ci/README.md) for logs, reports, runtime, images, artifact links and limits.
- No additional skill is needed: existing verification/browser skills plus the checked-in CI guide cover the reusable procedure. Conditional offline and official-renderer checks remain assigned to #8/#4 when their interfaces become available. Main remains the default; optional branches use `jo/`, with no PR/reviewer gate.
