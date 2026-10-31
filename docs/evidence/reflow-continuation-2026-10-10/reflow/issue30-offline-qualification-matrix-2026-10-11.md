# #30 production offline qualification test matrix and claim/budget map, 2026-10-11

This is a docs-only test design. CLI2 read local Git objects with `git show`, `git cat-file` and `git ls-tree`. Nothing was checked out, fetched, imported, built, served, executed or measured. This doc contains **no measured number**. Every number quoted below is a roadmap quote or a config value. None of them is a baseline or a gate. #29 is not repeated here.

## 1. Provenance and revision caveat

- **Issue body was unavailable to CLI2.** Root read the live #30 body at integration: OPEN, unassigned, body SHA256 `fdf7fe61c47fd88156b7f76c6b561e8206e0c56ead9f189f48adbf890d1526cd`. It requires clean offline viewer startup and full flow; local-server versus `file://` distinction; named hardware/browser, compressed and raw assets, cold/warm timing, peak and repeated-use memory; baseline-derived budgets with negative/restored controls; missing-resource and restart recovery; corpus exclusion; supported environment matrix. The historical criteria below come from `docs/roadmap-2026-09-22.md` @ `3c3c378`. This is a **historical roadmap, not the issue body**. Personal names are omitted from the quotes.
  - L39: "test clean production startup without external networking, whole select/edit/compare/export flow, missing resources, repeated-use memory and artifact cost. The review's local dist observation (~1.58MB uncompressed) is not a fresh release baseline. Record a reproducible baseline before setting a regression gate."
  - L72: "Add a dependency only with measured incremental size, startup, resident memory and runtime cost. Native fonts/assets remain local; no hidden external API or runtime download."
  - L73: "#8 retains full cold startup/load/parse/resource setup/layout/render/export and process/container memory accounting … on named hardware; report sample counts and distributions before claiming p95/p99."
  - L75: the proposed "100ms … 250ms … 50ms" viewer targets "are internal starting targets to measure, not verified performance". #30 "records final hardware-specific tolerances, startup/artifact/memory budgets".
  - L85: Runtime/recovery row: "Cold/warm, repeated calls …" for #8/#28/#30.
  - L87: Distribution/integration row: "Clean external-network-denied startup, complete local assets, real SVG download … exact artifact hashes" for #4/#8/#29/#30/#35.
- `docs/plans/2026-09-26-roadmap-reconciliation.md` L38 and `docs/plans/2026-10-04-official-source-sync.md` L27 @ `3c3c378` record that the #30 body was amended. This doc treats that as an **event only**. The live body is now bound by root and remains authoritative. The matrix below is extended for its explicit viewer checks.
- **Current main binding by root.** At `afb7ce9894940436eae197d524e3fc05ca86d447`, `src/main.ts` blob `3d709c0663e4602e4f4b34f17bba47d621ba9788` matches the historical row. `package.json`, `index.html`, `playwright.config.ts`, `Dockerfile`, `tests/browser/acceptance.spec.ts` and `src/resources.ts` also match the historical rows below in blob, bytes and SHA256. `.github/workflows/ci.yml` has changed: current blob `1450f9202172ea99c53fd997d3dc74999bb872b0` (6677 B, SHA256 `64e6c0f56d6e2c99b33e0456bf7724c55b68a44b8dbf8b8e349ebd956d201367`); historical line citations below are not silently rebound to that new file. CLI2 did not independently verify current main.

| Ref:path | Blob | Bytes | SHA256 |
| --- | --- | --- | --- |
| `3c3c378:package.json` | `f3071e1a54fdd930ad75a89b688ff55c787b16d6` | 1786 | `d797f199796726600298e4a2c1059154e1a231c654569e6026dd3b8ca7649c79` |
| `3c3c378:.github/workflows/ci.yml` | `3e1491c61dd91e0190c8e016003708337865d544` | 4675 | `71fe88d07ff314ec0b175e38ecf8c93b62eb490c42e9c68d80ac91c1c492f3ad` |
| `3c3c378:Dockerfile` | `fa301f43e1e5c4e32933695b399707afaa63fd0c` | 333 | `8357e923240c07c675b6fa2bf663f3c8b39c927c99cc691ac2f50f4481bff416` |
| `3c3c378:index.html` | `3678383dee2b2a0556445d16491125031762a1a1` | 398 | `8f8090f0b2ce8e2803d1319f755049bf77caa666e23bcc5e758463b3ed5fc09c` |
| `3c3c378:playwright.config.ts` | `170bc42c35f9fe527acf7dd1a7ab6d7a64d17446` | 773 | `9376cb7bee679b909b6f95172102938f32ba691003f116256be6a427033fcfb8` |
| `3c3c378:tests/browser/acceptance.spec.ts` | `399580a6aa27855edcc9c0005ace8aae2ad01eef` | 2101 | `7d58ec075bc0cb3a41d63a3a11d2c4693375942e663bd614ca5ae9d1c95fa621` |
| `3c3c378:scripts/container-smoke.mjs` | `1d0a8aed48a2503dc1c2742d30873f79b1e6cb03` | 5619 | `502533af90a65d0516a7b8bf30a01983956d42659a9b760fbd49832e39d5b2ee` |
| `6920ab65:src/main.ts` (root-reported current-main equal) | `3d709c0663e4602e4f4b34f17bba47d621ba9788` | 16390 | `dfd8a975ee2730aaf687ce4db4023209c6bb4235e929a49be0d9477c4b9219f9` |
| `afb7ce98:Dockerfile.python-submission` | `1c487ea48bcd9753f96eea0e924db2d81f708692` | 2136 | `27408ff506d4dc1b63e254895c0b78dad9ea21709098d5b7f381365c40366b92` |
| `3c3c378:src/resources.ts` | `c2ee2be48fa7a47a5e93c2dcb335d5288939f80c` | 1564 | `d75c487af38ee7f9594c205c0331fa10debaea412c370ef5e56d83d226c2473d` |
| `3c3c378:docs/roadmap-2026-09-22.md` | `c43f916f4a1a3749634a3c4547e2f507de34e1e2` | 15764 | `b961071177d7ed6261544231c93944cbeab9678cdaca6ff0dd73d572754cb12f` |

### Code facts and existing adjacent coverage (not #30 coverage)

**Build and viewer code**

- `package.json` L8: `"build": "tsc --noEmit && vite build"`. L7: `dev` runs `vite --host 127.0.0.1`. No preview or production-serve script exists. There is no `vite.config.*` in the `3c3c378` tree.
- `package.json` L34-40: the dependencies are `@fontsource/inter`, `@fontsource/source-serif-4`, `@napi-rs/canvas`, `@spectrum-web-components/button` and `@spectrum-web-components/theme`.
- `index.html` L11: a single module entry, `/src/main.ts`. It has no external `<link>` or `<script>`.
- `main.ts` L1-10: imports Spectrum theme/button and `@fontsource` CSS at module level.
- `main.ts` L164-166: calls `document.fonts.load` / `ready`.
- `main.ts` has no `fetch(`.
- `main.ts` viewer flow handlers:

  | Line(s) | Handler |
  | --- | --- |
  | L86 | `#fixture` select |
  | L90 / L95 | `#update-copy` / `#custom-apply` edit |
  | L103 | `#mode-selected` / `#mode-baseline` compare |
  | L109 | `#show-issues` |
  | L110-115 | per-card SVG export |
  | L122 | `#export` JSON |
  | L138 | `#run-benchmark` |

- `resources.ts` L21 / L24: throws `DesignValidationError` with `missing-asset` / `unsupported-font`.

**CI container smoke (CLI only)**

- `ci.yml` L42-44 runs `node scripts/container-smoke.mjs`.
- `container-smoke.mjs` L51 builds the `Dockerfile`, and L55 runs it with `--network none --memory 768m`.
- The `Dockerfile` L6-7 copies only `src/` and `scripts/native.ts`, `scripts/reflow-cli.ts` and `scripts/reflow-worker.ts`. L10 sets the entrypoint to `scripts/reflow-cli.ts`.
- **This covers the CLI container, not the production viewer.** No row below repeats it.

**Browser acceptance (dev server)**

- `playwright.config.ts` L21 sets `webServer.command` to `npm run dev -- --port 4173`, and L22 sets the URL to `/verify.html`. It has no network-deny setting.
- `acceptance.spec.ts` L11/L16 loads `/verify.html` and collects `pageerror` / console errors (L9-10).
- **This runs against the Vite dev server and the verify page. It does not run against a production `dist` build of the viewer, and it does not run with external networking denied.** It is a pattern to reuse only.

**Other**

- #29 X16 (`issue29-offline-svg-export-matrix-2026-10-11.md`, root-integrated per the Coordinator) records the embedded-font export size and defers the budget to #30. It is **linked, not repeated**: row Q14.

## 2. Test-design matrix

Layers: **U** unit, **Bd** build (inspect `dist` after `npm run build`), **BO** browser-offline (the production `dist` served on loopback in a clean browser context with every non-loopback request aborted and recorded), **C** container. Placeholders N, M, T and tolerance are **unset**; each is chosen only after Q12 records a baseline. No row restates the CI CLI container smoke (`ci.yml` L42-44) or #29 X01-X16.

| ID | Precondition | Action | Expected observable / measurement | Negative control | Layer | Motivation |
| --- | --- | --- | --- | --- | --- | --- |
| Q01 | Clean checkout, `npm ci` from lockfile | Build twice from clean; record `dist` file list, bytes, sha256 | File lists and hashes identical across the two builds (reproducible) | Change one source byte; hash of affected chunk differs | Bd | L39 "reproducible baseline"; L87 "exact artifact hashes"; `package.json` L8 |
| Q02 | Q01 `dist` | Scan HTML/JS/CSS for absolute `http(s):`/protocol-relative URLs | Only an allowlist of non-fetched namespace strings (e.g. SVG `xmlns`) remains; every hit listed | Copy of `dist` with an injected `https://example.invalid/x.woff2` in CSS is flagged | Bd | L72 "no hidden external API or runtime download"; L87 |
| Q03 | Q01 `dist` | List font and Spectrum assets | Inter weights loaded at `main.ts` L164 and Source Serif 4 600 (L165) present as local files; Spectrum theme/button code bundled (L1-5) | `dist` copy with one font file removed fails the listing | Bd | `main.ts` L1-10, L164-165; L87 "complete local assets" |
| Q04 | Q01 `dist` served on loopback; context aborts and logs non-loopback requests | Load viewer root (not `/verify.html`) | External request count 0; full request log retained | `dist` copy with injected `<link href="https://example.invalid/…">`: count 1, row FAILS | BO | L39 clause 1; L87; contrast `playwright.config.ts` L21-22 (dev server, verify page) |
| Q05 | Q04 context | Wait for startup | `window.reflowLab` defined (`main.ts` L168); zero `pageerror`/console errors; `document.fonts.check` true for each loaded face | Abort the local font routes: font check false and failure reported, not a silent pass | BO | L39 clause 1; `main.ts` L164-168; error-collection pattern `acceptance.spec.ts` L9-10 |
| Q06 | Q05 started | Drive select (L86), edit (L90/L95), compare (L103), overlay (L109), JSON export (L122), per-card SVG export (L110-115) | Each step produces its UI change; both downloads captured; external request count stays 0 across the flow | Skip a step or fail to capture a download: row fails; route injecting one external fetch mid-flow is counted | BO | L39 clause 2; SVG content assertions owned by #29, not repeated |
| Q07 | `dist` copy with one font file deleted | Start viewer offline | Explicit, visible failure or documented degraded state; behaviour recorded (today UNKNOWN, not executed) | Unmodified `dist`: no such failure | BO | L39 clause 3; `main.ts` L164-166 |
| Q08 | Controlled viewer fixture/resource-injection harness (no production `#custom-apply` design input exists) | Inject a valid-shape design with an unknown asset, then unsupported font, through the fixture-loading boundary | Viewer surfaces `missing-asset` / `unsupported-font` explicitly and preserves prior valid source; production UI acceptance is a separate follow-up | Same harness with all required resources present succeeds | BO | L39 clause 3; `resources.ts` L15-24; L74 "Preserve source on failure" |
| Q09 | Q01 `dist` | List `dist` for corpus, annotation, training or archived-report files | None present | `dist` copy with a planted `corpus/` file is flagged | Bd | L72 "Keep corpus downloads … outside production engine/viewer artifacts" |
| Q10 | Valid-shape design and controlled `DesignResources` resolver (`src/resources.ts` L6-10) | Call `validateResources` (L15-26) with an absent asset ID | `resolveAsset` may return `undefined`, and validation throws named `missing-asset` at L21; no silent substitute. Link an existing equivalent test instead of duplicating it | Present asset resolves and validation passes | U | L39 clause 3; L74 |
| Q11 | Q05 started | N redraws (mode/overlay toggles) and M exports; sample JS heap after forced GC every k iterations | Heap trend recorded; pass only if slope within tolerance T set from Q12 | Harness build that retains one array per redraw: slope exceeds T, row FAILS | BO | L39 clause 4 "repeated-use memory"; L85 "repeated calls" |
| Q12 | Named hardware, browser and Node versions recorded | Record baseline: `dist` total and per-file bytes (raw and compressed), Q05 startup timing, Q11 heap; sample counts and distributions | Baseline document only; **no pass/fail**. The roadmap ~1.58MB figure is not used | Baseline lacking hardware name or sample count is rejected as a baseline | Bd/BO | L39 "not a fresh release baseline. Record a reproducible baseline before setting a regression gate"; L73 |
| Q13 | Q12 baseline accepted by root | Gate `dist` bytes against baseline plus a justified tolerance | Gate value derived from Q12 only | Deliberately retain a measured payload that exceeds the chosen budget: gate fails; restore original artifact: gate passes | Bd | L39 clause 5 "artifact cost"; L72 "measured incremental size" |
| Q14 | #29 X16 size recordings exist | Set the export-size budget from X16 records | Budget cites X16 records; no export assertions repeated here | Budget proposed without an X16 record is rejected | Bd | L75 "#30 records … artifact … budgets"; #29 X16 (link only) |
| Q15 | Q05 started; long-task and event-timing observers attached | Measure visible feedback, cancellation acknowledgement (where a cancel control exists at readback) and main-thread tasks over the declared workload | Distributions recorded as **candidates** for the 100ms/250ms/50ms targets; **no pass/fail** | Injected synthetic busy loop appears in the long-task log (instrument sanity) | BO | L75 "internal starting targets to measure, not verified performance" |
| Q16 | Q01 `dist` and lockfile | Attribute `dist` bytes per dependency (`package.json` L34-40) | Per-dependency size listed; native-only `@napi-rs/canvas` expected absent from `dist`, flagged if present | Scratch build importing a native-only module into the viewer is flagged | Bd | L72 dependency cost policy |
| Q17 | Named viewer hardware/browser and accepted Q12 baseline | Measure viewer cold startup after process/browser reset and warm reload separately; record sample counts, distributions and worst case | Both distributions recorded with setup and cache state; no p95/p99 claim from one run | Warm-only samples labelled cold make the evidence fail | BO | live #30 body; engine process/container accounting remains #8 |
| Q18 | Only if a viewer distribution container is introduced (none at `3c3c378`: `Dockerfile` is CLI-only; `Dockerfile.python-submission` L38 runs `engine.main`) | Serve `dist` from that container with networking off; repeat Q04-Q05 | Same observables as Q04-Q05; otherwise row N/A | Container with networking on and an injected external URL: request counted | C | L87; distinct from CLI smoke `container-smoke.mjs` L55 |
| Q19 | Q06 full flow on named hardware | Record peak viewer JS heap and browser process resident memory during flow plus Q11 repeated-use trend | Peak and trend recorded with measurement method; viewer data is separate from #8 engine container accounting | Synthetic retained array makes peak/trend exceed the later baseline-derived tolerance | BO | live #30 peak-memory and repeated-use criteria |
| Q20 | Local viewer server running offline | Stop server, trigger a reload or required local-resource request while it is unavailable, then restart and reload | Unavailable request fails visibly; clean restart restores the documented flow without silently mixing old and new source state | Server stays unavailable: reload/recovery check fails visibly | BO | live #30 restart-recovery criterion |
| Q21 | Supported browser/environment list defined from product needs | Run Q04-Q08 and Q20 in every declared environment | Record browser/version/OS/hardware matrix, pass/fail and exclusions | Unrun environment labelled supported is rejected | BO | live #30 supported-environment criterion |
| Q22 | Production `dist` has a documented loopback-server launch | Compare loopback-server startup with `file://` loading | State explicitly whether `file://` is supported; a failing unsupported path is documented and does not masquerade as offline-server failure | Test claiming `file://` support solely from loopback success is rejected | BO | live #30 local-server versus file support |

### L39 clause coverage

| Clause | Rows |
| --- | --- |
| 1 Clean network-denied production startup | Q02-Q05, Q18 |
| 2 Whole select/edit/compare/export flow | Q06 (SVG content: #29) |
| 3 Missing resources | Q07, Q08, Q10 |
| 4 Repeated-use memory | Q11 and viewer peak memory Q19; engine process/container accounting stays with #8 |
| 5 Artifact cost | Q01, Q09, Q12, Q13, Q14, Q16 |

## 3. Claim, prerequisite and budget map

| Item | Detail | Trigger to proceed |
| --- | --- | --- |
| File: `package.json` | Possible production-serve/qualification script (none at `3c3c378`) | Root readback at `485873a9` |
| File: `playwright.config.ts` or a new config | Second project serving `dist` with external requests aborted | Root readback at `485873a9`; existing dev-server acceptance stays unchanged |
| File: new `tests/browser/offline-qualification.spec.ts` (name proposed) | Q04-Q08, Q11, Q15 | Owner assigned |
| File: new build-inspection script under `scripts/` (name proposed) | Q01-Q03, Q09, Q12-Q14, Q16 | Owner assigned |
| File: `.github/workflows/ci.yml` | Optional new job; must not alter the container-smoke job L30-52 | Root readback at `485873a9`; Q12 baseline accepted before any gate job |
| File: `index.html`, `src/main.ts` | Read-only for #30 unless Q07 shows a silent font failure needing a fix | Q07 outcome; coordinate with the #28 follow-up |
| Overlap: CI container smoke | CLI only (`Dockerfile` L10); #30 does not duplicate it | Q18 activates only for a viewer container |
| Overlap: #29 rows | Export content and X16 size records belong to #29 | Q06 captures downloads only; Q14 links X16 |
| Overlap: #8 accounting | Engine process/container memory and native cold/warm path remain #8; #30 measures viewer cold/warm and browser peak separately | #8 results available only if a combined acceptance report is needed |
| Overlap: #28 `main.ts` follow-up | Same file as the Q06/Q07 drive targets | Root confirms follow-up state before `main.ts` edits |
| Prerequisite: current-main readback | Root bindings above resolve package, HTML, Playwright, Dockerfile, acceptance and resources; CI workflow changed and must be reviewed at its current blob before any edit | New current head or CI job proposal |
| Prerequisite: live #30 body | Root binding above supplies current criteria; issue remains OPEN | Changed issue-body hash |
| Prerequisite: named hardware | Required for Q11-Q13, Q15 (L73, L75) | Root/owner names hardware and browser/Node versions |
| Prerequisite: #26/#27 first | Ordering per Coordinator | Root reports #26/#27 closed or explicitly waived |
| Owner | Unassigned (root-reported) | Root assigns |

### Budget slots (all unset)

| Budget | Value | Source of value |
| --- | --- | --- |
| `dist` total and per-file bytes | **unset** | Q12 baseline, then Q13 tolerance |
| Startup time (viewer, offline) | **unset** | Q12 and Q17 on named hardware; #8 owns engine cold/warm path |
| Repeated-use heap slope T | **unset** | Q11 after Q12 |
| Export SVG size | **unset** | #29 X16 records via Q14 |
| Interaction targets | **candidates only** (L75 quotes) | Q15 distributions; final tolerances recorded by #30 later |

## 4. Boundaries

- Test design only. No code, test, config or CI edits. Nothing built, served, executed, measured or visually reproduced.
- No measured number. No figure here is a baseline or a gate. The ~1.58MB and 100/250/50ms quotes are roadmap text only.
- Root-bound current-main source and live issue body are recorded above; historical CI workflow line references remain tied to `3c3c378`. No runtime acceptance follows from source binding.
- No rows duplicating the CI container smoke or #29 X01-X16.
- No closure, assignment or merge claim. Root publishes.
