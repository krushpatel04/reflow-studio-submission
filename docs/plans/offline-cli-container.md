# Issue #8: provisional offline command and container

## Problem and evidence

Issue #8 is open. The engine accepts an editable internal design but has no documented process invocation, external deadline, or network-disabled container smoke test. The existing 100-element stress observation is not a deadline or latency distribution.

## Why it matters

An evaluator or teammate needs reproducible input/output and visible failure behavior. An in-process timer cannot interrupt synchronous layout work.

## Intended behavior and scope

Add a command for one `reflow.design.v0` JSON file and target dimensions. Write selected editable design, strategy, diagnostics and timing as JSON. Invalid input and unavailable bundled resources fail with structured errors. A supervising process kills a child at a provisional wall-clock deadline and reports an explicit timeout. Package pinned dependencies, bundled fonts/assets and the command in a container. This is not an Adobe adapter or official submission contract.

## Risks and failure modes

- Spawn overhead and native font registration consume deadline time; defaults must remain provisional.
- A child may hang after timeout; supervisor must kill and await exit.
- Large input or output can exhaust memory; bound input and child heap, and fail visibly.
- Unsupported assets/fonts or malformed JSON must not silently fall back.
- A valid design with diagnostic findings must retain its editable output.

## Test cases and acceptance criteria

- Process-level normal fixture run preserves IDs, copy and deterministic selected JSON apart from timing.
- Boundary dimensions 1 and 8000 parse; invalid target, malformed/oversized JSON, unsupported font and missing asset return structured nonzero errors; a valid resource control succeeds.
- Deliberately slow worker exceeds deadline and terminates with timeout exit code, with no output JSON.
- Fresh container build and `--network none` representative invocation if Docker is available; record exact command and versions.

## Implementation steps and ownership

Own new `scripts/reflow-cli.ts`, `scripts/reflow-worker.ts`, tests, Dockerfile and this plan. Minimal `package.json` and README wiring. Reuse public `reflow`, bundled resources and native measure; do not edit engine/ranking/typography/rendering contracts.

## Validation and handoff

Run targeted red, implement, then `npm test`, `npm run build`; run native verification and benchmark for layout behavior if relevant. Run container smoke, compare repeated outputs, inspect failures and document measurements and remaining #8 acceptance. Fetch/rebase before direct push.

## Execution record

Tests were written first. Initial `node --import tsx --test tests/offline-cli.test.ts` failed 3/3 because the CLI entry point did not exist (`ERR_MODULE_NOT_FOUND`); this established the absent public command, but was not a behavioral red for validation or cancellation. After implementation, the focused suite passed normal, malformed/resource, deadline, dense synchronous deadline and extreme valid-resource cases. An initial extreme-case test then failed because its helper passed duplicate target flags; the helper was corrected without weakening the assertion. Final checks and reviewed local container observations are in [the dated evidence](../evidence/2026-09-22-offline-cli/README.md). The official adapter, independent quality, teammate reproduction and rule-derived limits remain outside this slice.
