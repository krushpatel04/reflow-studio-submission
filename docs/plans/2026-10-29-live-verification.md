# Live verification — October 29, 2026

## Intended behavior and scope

Verify current main (`d23cea0384dbd33274cb09fc530487f46c078c24`) against the actual product flows: public structured designs enter the offline Python package and produce faithful editable JSON plus real rendered PNGs; the retained TypeScript workbench supports preview, editing, validation and exports. These are separate implementations. Browser success does not certify the Python engine or native Adobe integration.

The qualified runtime fingerprint currently matches. The old qualified Docker image is absent, so rebuild using the documented assembly path and record the new image identity. Preserve all existing collaborator files and archived evidence. No sealed inputs, feature expansion, submission, account changes or vault writes.

## Steps and acceptance

1. Verify remote/local source identity and archived runtime fingerprint; capture tool versions. Build a fresh named linux/amd64 image from current source and the pinned public starter, keeping build output in a new reports directory.
2. Run the existing offline smoke against fresh output directories. Require all three public cases, real renderer calls with no fallback, disabled networking, unchanged read-only inputs and identical repeated outputs. Compare current output hashes against qualified evidence and inspect all three PNGs visually. Report geometry/readability limits separately.
3. Build the workbench and run existing browser acceptance and production offline/recovery tests, with their own server lifecycles. Inspect a live desktop/mobile preview and `/verify.html`, capturing screenshots and browser errors. Existing regression tests provide behavioral coverage; no artificial new test is needed for a verification-only task.
4. Investigate a demonstrated failure at its boundary before changing code. Any production fix requires a meaningful failing regression first. Avoid unrelated changes and expensive repetitions when the checks pass.
5. Save a concise evidence report with exact source/image, commands, results and limitations; show the working local preview to JD. Stop test-owned servers and retain only the explicitly shown preview if useful. No claim of organizer acceptance or submission follows.

Risks: old build artifacts can mislead, emulated amd64 can be slow, synthetic browser fixtures differ from official Python inputs, and success on exposed samples does not establish hidden-design quality. Fresh directories, provenance controls and actual visual inspection address those boundaries. Documentation links and diff checks complete the handoff; existing workflow is sufficient, with no new skill needed.

## Observed result

Fresh Python build/smoke PASS: three real renders, no fallback, blocked network, unchanged read-only inputs, repeat outputs identical and all six output hashes match the qualified receipt. Direct source/output comparison preserves element inventory/order and non-geometry content/styles/assets. Actual three output PNGs inspected.

Workbench build PASS; browser suite27/27, verification page20/20 and production offline/recovery/resource test1/1 PASS. Extra live desktop/mobile light/dark interaction preserves edited copy in exported JSON, rejects zero width, accepts1600×600 and has no browser errors, external/failed requests or horizontal overflow. Screenshots inspected. No production fix required; small banner/mobile-preview text remains a disclosed limit. Test-owned servers stopped; separate preview4190 retained for JD. [Dated evidence](../evidence/2026-10-29-live-verification/README.md) records source/image and boundaries. No full-unit/failure-matrix/resource-profile rerun or organizer acceptance is claimed.
