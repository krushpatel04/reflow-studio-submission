# Issue #24: hosted network-disabled container smoke gate

## Problem and evidence

The provisional CLI/container harness landed in `63393d5`, but hosted CI still checks only the Node, native and browser paths. A local Podman run does not prove that a clean Linux runner can build the Dockerfile and execute the packaged command without runtime network access. Issue #24 is the bounded CI follow-up; parent #8 retains the official-contract and teammate-reproduction work.

## Why it matters

A container can build while omitting a required file, fail on Linux native dependencies, run with accidental network access, or exit zero with structurally meaningless output. A main-branch gate must inspect editable output and explicit failure behavior, and retain enough evidence to diagnose a failed clean-runner invocation.

## Intended behavior and scope

Add one smoke orchestrator owned by this issue and a separate hosted CI job. It builds the existing Dockerfile, runs the existing example with `--network none`, checks schema/source/target/content IDs and text plus diagnostics, then runs malformed JSON and requires structured exit 2. Build and each invocation have external deadlines. Logs and JSON stay under `reports/ci/container-smoke/` and upload even on failure. Do not change CLI, worker, engine, model or their regression tests.

## Risks and failure modes

- Checking only exit zero would accept missing or corrupted editable content.
- A test that parses a locally generated file instead of actual container stdout would miss packaging failures.
- Runtime networking could be accidentally enabled; the command must always include `--network none` and record it.
- Builds or runs can hang; both the job and child processes need independent bounds.
- Error output may be lost when assertions fail; write raw stdout/stderr and a summary before throwing.
- Docker and Podman differ slightly; orchestration must use only shared flags exercised locally and on hosted Docker.

## Tests and acceptance checks

1. Build the image and run the representative input in a network-disabled container.
2. Assert `reflow.cli.v0`, expected source/target dimensions, retained `headline` ID and exact text, editable output inventory, zero errors, findings array and numeric timing.
3. Run malformed JSON; require exit 2, empty stdout, and structured `invalid-json` input error.
4. Set the test-only smoke fault to remove the expected headline from assertion input. The smoke must fail for the intended missing-content assertion after the real container succeeds; the normal run must then pass unchanged.
5. Confirm logs/JSON/summary exist, relative documentation links resolve, and workflow YAML exposes bounded build/run plus always-uploaded evidence.
6. Run `npm test` and `npm run build`; final hosted workflow must pass before closing #24.

## Implementation steps and ownership

Own `scripts/container-smoke.mjs`, `.github/workflows/ci.yml`, this plan and focused dated evidence/docs. First add the assertion/orchestration script and demonstrate the intentional red locally against the existing image contract. Then wire the hosted job, run normal local Dockerfile smoke through Podman, validate repository checks, fetch/rebase concurrent main, publish, and inspect hosted artifacts/status. The sibling owns `scripts/reflow-cli.ts` and its tests; do not edit them.

## Validation and handoff

Record the exact red/green commands, versions, durations, outputs, hosted run and limitations in `docs/evidence/2026-09-22-hosted-container-smoke/README.md`. Link the plan/evidence on #24 and close only after all acceptance checks pass. The GitHub Project board cannot be read or moved with the current token's missing `read:project` scope, so issue closure is the verified completion signal and the board limitation must be disclosed.

## Execution record

The smoke orchestrator was added before workflow wiring. `CONTAINER_RUNTIME=podman REFLOW_CONTAINER_SMOKE_FAULT=missing-content node scripts/container-smoke.mjs` built and ran the real container, then exited 1 at `expected editable output to retain headline element ID`; this was the intended behavioral red rather than a missing-runtime/setup error. `CONTAINER_RUNTIME=podman node scripts/container-smoke.mjs` then passed the unchanged normal assertions and malformed-input control. Raw evidence remained under ignored `reports/ci/container-smoke/`. Final local/hosted validation and exact results are recorded in the [dated evidence](../evidence/2026-09-22-hosted-container-smoke/README.md).

After rebasing over concurrent CLI input hardening, the smoke passed locally again. The main push run passed both the new smoke and existing verification jobs. A manual `missing-content` dispatch failed only the smoke job for the expected assertion, while its verification job passed and its artifact upload succeeded. Every #24 acceptance item is satisfied; parent #8 limits remain explicit.
