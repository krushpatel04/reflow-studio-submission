# Judge-facing README cleanup

## Problem and evidence
The root README opens with dated internal status notes and links across several work streams before the run command. It presents two long setup paths, an outdated October 8 status, and historical qualification details that obscure the canonical Python submission.

## Why and risk
A reviewer should quickly identify the engine, build/run command, expected outputs, and verification limits. Removing operational details must not lose the pinned upstream, offline runtime, renderer-fallback warning, or honest unverified gates.

## Scope and steps
Edit the root README. Keep one copyable Docker path from a clean checkout, then a short verification/development section and links to the full operator runbook and evidence. Preserve the legacy Dockerfile distinction and explicit non-acceptance of native/visual gates. Do not change product code, official inputs, packaging, or evidence. Do not assert a release-image digest from a hosted check. After two PR checks timed out installing Ubuntu packages before browser tests (at the current five-minute step limit), extend only that installer step and its enclosing job timeout; keep the browser assertion mandatory.

## Acceptance
Check every relative link target exists; verify shell commands and expected output paths against `submission/assemble_context.sh`, `Dockerfile.python-submission`, and the runbook; verify pinned SHA and no stale October 8 status; `git diff --check`; confirm README remains concise. For the CI timeout adjustment, require a fresh hosted run through actual browser acceptance; prior two attempts stopped during Ubuntu package download, not product tests. Documentation-only: no artificial code test or local full suite.
