# Hosted network-disabled container smoke — September 22, 2026

[Issue #24](https://github.com/kj-squared-labs/reflow-studio/issues/24) · [plan and red/green record](../../plans/hosted-container-smoke.md) · [CI workflow](../../../.github/workflows/ci.yml) · [smoke orchestration](../../../scripts/container-smoke.mjs)

## Gate

The new independent CI job builds the existing provisional Dockerfile, then invokes its CLI with Docker runtime networking disabled. The valid case must return `reflow.cli.v0`, source `cli-example`, a 1080 × 1080 editable `reflow.design.v0` output retaining the `headline` ID and exact `A new size, same message` copy, a complete one-element inventory, zero detected errors, a findings array and numeric process timing. A malformed JSON invocation must emit no editable stdout and return exit 2 with an `input` / `invalid-json` error.

The orchestrator supervises the image build for at most 300 seconds and each run for 45 seconds. Containers additionally use 768 MiB memory and 64-process limits. The Actions step is limited to seven minutes and its job to eight. It writes raw stdout/stderr, parsed output/error, command metadata/durations and a summary under `reports/ci/container-smoke/`. The artifact step uses `always()`.

## Test-first control and local result

Before the workflow job existed, the smoke orchestrator was run against the real container with its test-only `missing-content` assertion fault:

```sh
CONTAINER_RUNTIME=podman REFLOW_CONTAINER_SMOKE_FAULT=missing-content node scripts/container-smoke.mjs
```

The image built and valid container invocation completed, then the gate failed exactly at `expected editable output to retain headline element ID` (exit 1). This proves that a successful container exit with missing editable content is rejected. The fault changes only an in-memory assertion copy; retained raw container JSON stays authentic. No failing workflow or fault was committed as a main default.

The restored command passed with Podman 5.8.0 against a Linux/arm64 local image:

```sh
CONTAINER_RUNTIME=podman node scripts/container-smoke.mjs
```

The cached local observation took 1.868 seconds total: build 0.910 seconds, valid run 0.539 seconds, malformed run 0.413 seconds. The valid output retained `headline`, exact copy, zero errors/warnings and no findings; malformed input returned the expected structured exit 2. These timings are local cached observations, not hosted limits or engine latency.

## Hosted evidence

Implementation commit [`f579dd4`](https://github.com/kj-squared-labs/reflow-studio/commit/f579dd43795463aec4c3b533a22faaaaf1716abb) was rebased over the concurrent CLI regular-input hardening before publication.

- [Passing push run 35762327808](https://github.com/kj-squared-labs/reflow-studio/actions/runs/35762327808): both `container-smoke` and the existing `verify` job passed. The downloaded smoke artifact records Docker, `networkMode: none`, status `passed`, retained `headline`, zero errors/warnings/findings and malformed-input exit 2 / `invalid-json`. Total clean-runner smoke duration was 18.123 seconds.
- [Expected failing dispatch 35762346878](https://github.com/kj-squared-labs/reflow-studio/actions/runs/35762346878): the existing verification job passed; only `container-smoke` failed. Its always-uploaded artifact records fault `missing-content`, status `failed`, duration 20.388 seconds and failure `expected editable output to retain headline element ID`. Raw successful container stdout was retained separately in that artifact. This dispatch did not change main or production behavior.

Final local checks on the combined source: **320 tests pass**, `npm run build` passes, the workflow YAML parses, the smoke script passes `node --check`, Markdown links resolve and `git diff --check` is clean.

## Limits

This checks the provisional internal example and bundled resources on one hosted Linux runner. Runtime networking is disabled, while image build dependency installation uses network access. The gate does not establish Adobe schema/renderer compatibility, aesthetic quality, an official hardware/runtime budget, or independent teammate reproduction. Those remain parent #8/#4 work.
