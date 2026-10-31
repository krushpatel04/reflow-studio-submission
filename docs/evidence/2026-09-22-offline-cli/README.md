# Provisional offline CLI and container — September 22, 2026

[Plan and test record](../../plans/offline-cli-container.md) · [Sample editable output](sample-output.json) · [ten fixture observations](observations.json) · [example input](../../../examples/cli-design.json) · [issue #8](https://github.com/kj-squared-labs/reflow-studio/issues/8)

## What was exercised

On macOS arm64, Podman built the repository `Dockerfile` from the pinned lockfile using `node:24.20.0-bookworm-slim`. The final local image was `sha256:0294e2ab07b87a3b304c171c8198acf4829e3855d35b2845af7a8bf936fbbfce` (`linux/arm64`); Node inside reported `v24.20.0`. This is a local build identifier, not a published immutable image digest. Docker Desktop's daemon was unavailable, so the same Dockerfile was built and run through Podman. The container had network access during dependency installation at build time and **no network during the runs**. Final checks were run after rebasing on sibling #5 commit `ffe9b93`.

```sh
podman build -t reflow-offline:local .
podman run --rm --network none --memory 768m --pids-limit 64 \
  -v "$PWD/examples:/inputs:ro" reflow-offline:local \
  --input /inputs/cli-design.json --width 1080 --height 1080 > result.json
```

The archived [sample output](sample-output.json) is from that memory-limited command. It retains the input element ID and exact text, emits an editable `reflow.design.v0` design at 1080 × 1080, and reports zero detected findings. Its observed worker peak RSS was 111,420 KiB and supervisor process wall time 210.1 ms; the reported engine layout took 9.1 ms. These are one cold invocation's observations in a local Podman VM, not a latency or memory guarantee. The 512 MiB V8 child heap cap does not bound all native memory; the 768 MiB container limit provides a separate overall cap for this run.

All ten authored fixtures were serialized from `src/fixtures.ts` and run at 1080 × 1080 in separate `--network none` containers after the other validation jobs completed. Each completed, retained the complete set of element IDs, and returned zero detected hard errors. The observed supervisor wall times ranged from 155.2 to 273.1 ms; the largest reported worker peak RSS was 118,972 KiB. Seven cases returned zero warnings and three returned one warning. These fixtures are development examples, not an independent quality set. The [observation file](observations.json) lists every case, strategy, findings counts, source hash, timing and ID check. The generated input/output files used for the full sweep remain under ignored `reports/cli/`; the source fixtures and command are reproducible.

Two separate runs of the example produced equal JSON after removing only the `timing` object. A malformed JSON file returned exit 2 with `invalid-json`; valid designs referencing an unavailable font or asset returned exit 2 with `unsupported-font` or `missing-asset`. A 1 ms deadline returned exit 124. The existing 100-element dense-text stress input, run with a 500 ms deadline in the network-disabled container, also returned exit 124 with `deadline-exceeded` and no editable output; the supervising process killed the synchronous worker. The stress case was for termination behavior, not throughput. Local process tests also cover valid bundled image resources, target boundaries and repeated deterministic output.

## Validation and limits

Initial tests were written before the CLI existed. The first run failed because `scripts/reflow-cli.ts` could not be resolved; this established the missing public command, but did not by itself prove the later validation and timeout behavior. After implementation, process tests covered those outcomes directly. Final commands after the rebase: `npm test` (264 passing), `npm run build`, `npm run verify`, `npm run benchmark`, and `PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npm run verify:browser` (one Playwright suite, 12 workbench checks). Native verification completed 30 layouts; benchmark generated 30 cases and the existing 70 rendered document/image pairs; the browser acceptance suite passed after installing its pinned Chromium binary. One representative product image was inspected. CLI code does not alter layout or rendering logic.

The bounds, CLI schema, font/assets, image and input limits are internal choices. No Adobe official adapter, official limit comparison, teammate clean-machine reproduction, long-tail latency distribution, native rendering export, independent output-quality judgment, model path, or browser cancellation is established. Timeout has an explicit failure response, not an editable fallback. Additional #8 acceptance remains open.
