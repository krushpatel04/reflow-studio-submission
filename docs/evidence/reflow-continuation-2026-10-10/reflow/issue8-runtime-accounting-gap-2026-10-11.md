# #8 runtime-accounting acceptance gap map, 2026-10-11

Documentary only. CLI2 read local Git objects @ `3c3c378` (the local mirror of `exchange/github/main`) with `git show`, `git cat-file` and `git ls-tree`. **This is not current main.** Root checked the cited legacy instrument/artifact blobs against current main `6b635d275b2c7077fd8ddf30db3066f3dec27a1f`; the sampled CLI, worker, engine, stability, stress, container-smoke and test blobs, plus three retained runtime artifacts, match. This readback does not establish equivalent Python phase instrumentation. Nothing was executed, built or containerized, and no Docker or registry was used. No numbers are re-measured; any values quoted come from retained artifacts at their blob and are labelled as such. Rows from #30 Q, #28, #29 and #14 are cross-referenced only.

## 1. Provenance

- **Live issue #8 body readback (2026-10-11):** open and assigned to `ojedaJD`. Its current October 8 audit says Python assembly, dependency pins, fingerprints and regression controls are merged, while a current-tree offline probe and Python-container qualification remain required. Its preserved acceptance checklist specifically requires cold/warm load, parse, font/asset setup, layout, render/export, peak memory, timeout and fallback outcomes; representative sample counts and worst cases; and independent clean-checkout reproduction. The rows below map only runtime accounting in legacy TypeScript instruments to that checklist. They do not qualify the current Python submission path. The detailed criteria cites below are historical roadmap/plan at `3c3c378`, not substitutes for the live issue body.
  - `docs/roadmap-2026-10-05.md` is labelled **historical roadmap dated Oct 5, not issue body or current main**.
- **Path correction:** the brief named `next-engine-issue-handoff.md`. At `3c3c378` the file is at `docs/plans/next-engine-issue-handoff.md`. `measurement-cache.md` resolves to `docs/plans/measurement-cache.md`.

### Criteria lines

| Cite | Text (quoted, names omitted) |
| --- | --- |
| `docs/roadmap-2026-09-22.md:13@c43f916f` | #23/#24 "Neither closes #8's remaining official-contract, profiling and independent reproduction requirements." |
| `docs/roadmap-2026-09-22.md:73@c43f916f` | "#8 retains full cold startup/load/parse/resource setup/layout/render/export and process/container memory accounting. Measure representative and worst cases separately on named hardware; report sample counts and distributions before claiming p95/p99. A single stress timing is not a latency guarantee." |
| `docs/roadmap-2026-09-22.md:85@c43f916f` | Runtime/recovery: "Cold/warm, repeated calls, dense worst case, cancellation, OOM/timeout, failed workers, output limits, stale response/retry" for #8/#28/#30 |
| `docs/roadmap-2026-09-22.md:87@c43f916f` | Distribution/integration: "Clean external-network-denied startup, complete local assets … exact artifact hashes" for #4/#8/#29/#30/#35 |
| `docs/roadmap-2026-10-05.md:13@6995cc7a` | A4 (#8/#35): "Test on actual available hardware; report M5 Pro limits as unresolved rather than inventing caps." |
| `docs/project-audit-2026-09-26.md:78@9f4f4531` | "#8 supplies runtime budgets." |
| `docs/project-audit-2026-09-26.md:106@9f4f4531` | #8 depends on the "#4 official resource/runtime/renderer contract"; "final hardware/model limits remain unsettled, and profiling/local fixes can proceed now" |
| `docs/plans/next-engine-issue-handoff.md:25@20ccf808` | "Dense-input runtime remains unbounded despite CI's external timeouts." |
| `docs/plans/measurement-cache.md:24@03fc17b4` | "Report sample counts/order and measured call reduction; no typical-latency or p95 claim from stress samples." |

### Instruments and artifacts (blob @ `3c3c378`)

| Path | Blob | Bytes | SHA256 | What it records |
| --- | --- | --- | --- | --- |
| `scripts/stability.ts` | `52086ad6216936b1d181c0b468fea5ba85922a0c` | 9901 | `e1318ae237aa085e12f52715bf460542c7c72e30ea33792fc3dcb0c7bfe9b59a` | L123 `medianLayoutMs`/`p95LayoutMs` from `elapsedMs`; L125 `node`, `cpu` (no platform) |
| `scripts/stability-runtime.ts` | `3ccdab8d04627b9d4507eae6eca71747b9e7b830` | 3347 | `84cb42617051e3d1eda4933a2bd8a1f0aeed2ff6fa70d64243689072d1e19bd6` | L23 one warmup, L25 three paired rounds; L33 `stats` = `n`/`median`/`p95`; L37 method "Excludes rendering/font loading" |
| `tests/stability.test.ts` | `b9f6ca3495f9d516f4bf94ebbbbd54cb66bea3b0` | 9418 | `ecbf5ba277e8063aaa1663f3840a251324c28e5409e698dba8993f4c5d470874` | Ranking/selection behaviour tests (L39-150); **no timing or memory assertion** (0 matches for `elapsedMs`/`performance`/`memoryUsage`) |
| `scripts/adversarial-stress.ts` | `d54d9703a4f0c3437922f7f7381def3221bdd006` | 1250 | `a8fc72587f6d40d540e315019a55b127907568ae50a937a452acd25947b04fbb` | L5 "Exploratory measurements, not pass/fail tests"; L11 dense 1/10/40/100; L15-17 one `performance.now` sample per count |
| `scripts/reflow-worker.ts` | `9197467a276f9747a115fb1b6c833d0a3a8954e0` | 1977 | `5f1a5176b60c9c1f541c868e96d44debe2c9fbc2ccadde094654a97b1cfde14d` | L24-26 `parseMs`, `validationMs`, `fontSetupMs`, `layoutMs`, `peakRssKiB` (`process.resourceUsage().maxRSS`) |
| `scripts/reflow-cli.ts` | `90d4326ff0515f86be584a7567e85c0913c44f0f` | 5394 | `d3d5a8eff3c673d894400a5b7c58ef106aad55aeb154d0968a75cb3ed705bb6e` | L54/L87 `processWallMs`; L55 worker `--max-old-space-size=512`; L8-9 deadline defaults |
| `src/engine.ts` | `07d29d821d0b0a460434bfe8a07164cb563a5b49` | 13394 | `df14208e854612eaa074db7a96f35d96c8aae69306a8b128fe6a5f992fac2588` | L189/L214 `elapsedMs` around layout/selection only |
| `scripts/container-smoke.mjs` | `1d0a8aed48a2503dc1c2742d30873f79b1e6cb03` | 5619 | `502533af90a65d0516a7b8bf30a01983956d42659a9b760fbd49832e39d5b2ee` | L32/L90 `durationMs` (`Date.now`) per command; L55 `--memory 768m` as a limit, not a measurement |
| `docs/evidence/2026-09-16-source-ranking/runtime.json` | `bae761a4c12dffc1ef6f67792953442f51313673` | 32467 | `4c4c53eb8002057b4814db77d267ee104e27627df21b8726c8a7f8eb0909792f` | Layout `n`=90 (development) / `n`=27 (additional) per engine, median+p95, `cpu` Apple M1, Node v24.20.0; 117 rows; method: "Local observation, not a enforced budget or cross-machine performance claim" |
| `docs/evidence/2026-09-16-measurement-cache/runtime.json` | `f476a8fd06fd43e6b3076a8492834793c4fd4b19` | 29497 | `fcc2c31c1c68457b1fdf3417a54a7f35a058bec76ec26713187998d210283e89` | 90 fixture pairs + 4 dense (one pair each); median only; Apple M1, darwin/arm64; "excludes loading, parsing and rendering … not a deadline or typical/p95 latency claim" |
| `docs/evidence/2026-09-16-measurement-cache/runtime-first.json` | `e7609c0f717447610c8258ed646c7fdf8ca47f94` | 29487 | `189960b489f4aaa3d139f2bebeaea62194bc48f5246b0604739368166394077b` | Same schema; superseded first run (`measurement-cache.md` L46: overlapped concurrent checks) |
| `docs/evidence/2026-09-15-adversarial/stress.json` | `133f3489ebad2581be9ece471e850e3459d9357f` | 640 | `a1444ef31561bfa624c7c25545476153bd61acca97ddcd0af8f789fefb0777d7` | 4 rows (one per dense count), single `elapsedMs` each; no hardware field |
| `docs/evidence/2026-09-22-offline-cli/observations.json` | `f05bdcbaa3c11fb29818fb40f81cb56e851d2847` | 2994 | `7f704ee232002d7f5986e532156061089553aa82cb925237fb205e6eb6dc6fc6` | 10 cases (one per fixture), `processWallMs` + `peakWorkerRssKiB` each; no hardware field in JSON |
| `docs/evidence/2026-09-22-offline-cli/sample-output.json` | `90419c5d0d4c6ab75de4b36f943b791e9f11175c` | 964 | `36fc7a7c187f5fee1a3c7100199c038fa62817d1486ebbcffbf2e4ddfe9ac9e2` | One run: worker phase timings + `peakRssKiB` + `processWallMs` |
| `docs/evidence/2026-09-22-offline-cli/README.md` | `662540be60a4f6027e19c01bae437ecbe9920272` | 4658 | `41b05ccf6c37fa69bed8ac8b3214517f6c3f9624f9e79804ae93a847bef4f533` | L7 macOS arm64, Podman, image `linux/arm64`; L11 `--memory 768m` run |
| `docs/evidence/2026-09-{19,22,24}-*/browser-runtime.json`, `2026-09-22-ci-parity/hosted-runtime.json` | `7c28a0e1`, `78225c8a`, `7b964823` (205/205/204 B) | — | `26575f33…`, `66b71e5b…`, `56b28be4…` | Environment only (`chromium`, `node`, `platform`, `errors[]`); **no timing or memory fields** |

`browser-runtime.json` covers 4 paths but only 2 distinct blobs: `7c28a0e1` (typography-parity, crop-layering) and `78225c8a` (four-product-row, product-grid).

## 2. Gap map: one row per #8 phase plus three method rows

**Status rule:** **measured** means a retained artifact with an explicit sample count. **partial** means an instrument exists but the phase is incomplete, has a single sample (n=1), or has no distribution. **absent** means no instrument or no retained artifact. Quoted values are artifact contents at the cited blob. They are not budgets, not re-measured, and not cross-machine claims.

**Oracle rule:** each oracle names the condition under which a future test or report validator must **fail**. `N_min`, the named hardware and the budgets are **unset** and owned by #8. This doc invents no numbers.

| ID | Phase | Criterion cite | Existing instrument | Status | Test-first oracle (must FAIL when …) |
| --- | --- | --- | --- | --- | --- |
| R01 | Cold startup | `docs/roadmap-2026-09-22.md:73@c43f916f`; `:85` "Cold/warm" | `scripts/reflow-cli.ts:54,87@90d4326f` `processWallMs` (spawn to result); `observations.json@f05bdcba` 10 cases, one sample each | partial (n=1 per case; no cold/warm label; includes all phases) | report lacks a `cold` series distinct from `warm`, or a cold sample was taken in a process or container that had already run a case, or `n` is missing |
| R02 | Load (input read) | `:73@c43f916f` "load" | no separately named load timer: `reflow-cli.ts:47@90d4326f` `readFileSync` precedes `started` at L54; worker `reflow-worker.ts:8-10@9197467a` reads stdin inside `parseMs`, so load is folded into parse there | absent | report has no `loadMs` (file read to bytes in memory) per sample, or `loadMs` is folded into `parseMs` |
| R03 | Parse | `:73@c43f916f` "parse" | `scripts/reflow-worker.ts:8-10,24@9197467a` `parseMs`; `sample-output.json@90419c5d` one run | partial (n=1) | `parseMs` has fewer than `N_min` samples, or the samples are not grouped by input size class |
| R04 | Resource setup | `:73@c43f916f` "resource setup" | `reflow-worker.ts:11-16,24-25@9197467a` `validationMs`, `fontSetupMs`; `sample-output.json@90419c5d` one run | partial (n=1); excluded from layout artifacts (`stability-runtime.ts:37@3ccdab8d`) | `fontSetupMs`/`validationMs` lack `N_min` cold samples, or font registration is timed after a warm import |
| R05 | Layout | `:73@c43f916f` "layout" | `src/engine.ts:189,214@07d29d82` `elapsedMs`; `stability-runtime.ts:23-37@3ccdab8d`; `source-ranking/runtime.json@bae761a4` n=90/27 per engine, median+p95, Apple M1; `measurement-cache/runtime.json@f476a8fd` 90 pairs, median | **measured** (warm, in-process, one machine) | layout series lacks `n`, the hardware ID or a warm/cold label, or p95/p99 is reported with `n` below `N_min` (R10) |
| R06 | Render | `:73@c43f916f` "render" | `scripts/native.ts:139-140@288609c0` `renderPng` has no timer; `scripts/benchmark.ts:22@78a8e2f7` times `elapsedMs` (layout) only | absent | report has no `renderMs` per sample (design to PNG buffer), or `renderMs` is computed from layout `elapsedMs` |
| R07 | Export | `:73@c43f916f` "export"; `:87` "exact artifact hashes" | none: `reflow-worker.ts:19@9197467a` stdout JSON write is untimed; no PNG encode/write timer | absent | report has no `exportMs` (serialize plus write of JSON/PNG) with an output byte count and sha256 per sample |
| R08 | Process memory | `:73@c43f916f` "process … memory" | `reflow-worker.ts:26@9197467a` `peakRssKiB` (`maxRSS`); `observations.json@f05bdcba` `peakWorkerRssKiB` 10 cases, one each; `reflow-cli.ts:55@90d4326f` heap cap `--max-old-space-size=512` (a limit) | partial (worker only, n=1 per case; parent CLI RSS absent) | report lacks a parent and worker peak RSS per sample, or reports a limit (`--max-old-space-size`) as a measurement |
| R09 | Container memory | `:73@c43f916f` "container memory" | `scripts/container-smoke.mjs:55@1d0a8aed` and `offline-cli/README.md:11@662540be` `--memory 768m` (a limit); no container-level usage instrument | absent | report lacks a container peak-memory reading taken from the runtime's own accounting, or presents `--memory` as observed usage |
| R10 | Sample count / distribution (p95/p99 rule) | `:73@c43f916f` "report sample counts and distributions before claiming p95/p99"; `docs/plans/measurement-cache.md:24@03fc17b4` | `stability-runtime.ts:33@3ccdab8d` emits `n` with median and p95; `scripts/stability.ts:123@52086ad6` emits `p95LayoutMs` **without `n` in the same object** (`distinctCases` at L111) | partial (layout only; no p99 anywhere; no distribution beyond median/p95) | any p95 or p99 field has no sibling `n` in the same object, or `n` is below `N_min`, or a percentile is derived from stress samples (`adversarial-stress.ts:5@d54d9703`) |
| R11 | Named hardware | `:73@c43f916f` "named hardware"; `docs/roadmap-2026-10-05.md:13@6995cc7a` "actual available hardware … M5 Pro limits as unresolved" | `stability-runtime.ts:36@3ccdab8d` and `stability.ts:125@52086ad6` record `cpu: cpus()[0]?.model` and `node`; `source-ranking/runtime.json@bae761a4` and `measurement-cache/runtime.json@f476a8fd` record Apple M1; `stress.json@133f3489` and `observations.json@f05bdcba` record none | partial (CPU model only on some artifacts; no RAM/OS build/power state; no M5 Pro run) | a timing or memory artifact lacks CPU model, core count, RAM, OS/arch, runtime versions and container runtime (where used), or a budget is set from hardware that is not named |
| R12 | Representative vs worst case | `:73@c43f916f` "representative and worst cases separately … A single stress timing is not a latency guarantee"; `docs/plans/next-engine-issue-handoff.md:25@20ccf808` "Dense-input runtime remains unbounded" | Representative: fixture series R05. Worst: `adversarial-stress.ts:11-17@d54d9703`, `stress.json@133f3489` 4 rows, n=1 each; `measurement-cache/runtime.json@f476a8fd` dense, one pair each | partial (worst case is n=1, with no bound) | the report mixes representative and worst-case samples in one distribution, or presents a single worst-case sample as a bound or guarantee |

### Coverage of the `:73` phrase list

| Item | Row |
| --- | --- |
| cold startup | R01 |
| load | R02 |
| parse | R03 |
| resource setup | R04 |
| layout | R05 |
| render | R06 |
| export | R07 |
| process memory | R08 |
| container memory | R09 |
| sample counts/distributions | R10 |
| named hardware | R11 |
| representative/worst | R12 |

Status totals: 1 measured, 7 partial, 4 absent.

## 3. Cross-references (not duplicated here)

- **#30 Q-rows** (`issue30-offline-qualification-matrix-2026-10-11.md`):
  - Q17 measures viewer cold/warm startup and Q19 measures browser peak memory. Engine cold/warm startup and process/container memory accounting remain #8, mapped here by R01, R08 and R09.
  - Q11 (viewer heap trend), Q12 (viewer baseline) and Q15 (interaction candidates) stay in #30.
- **#28:** cancellation, OOM/timeout, failed workers and stale responses (`:85`) are not rowed here.
- **#29:** export **content** and X16 size stay in #29. R07 is export **timing** only.
- **#14:** no overlap.
- **CI container smoke** (`ci.yml` L42-44, `container-smoke.mjs`): this is a pass/fail gate for network isolation. It is cited only as a container-memory limit source in R09.

## 4. Prerequisites and boundaries

- **Prerequisites:**
  - root current-main readback of the sampled legacy instruments and retained artifacts at `6b635d27` (completed; other historical citations remain version-pinned; Python equivalence unverified)
  - the live #8 body (read; current-tree Python and independent reproduction requirements remain)
  - the #4 runtime/renderer contract (`project-audit:106`)
  - named qualification hardware
  - `N_min` and the budgets set by the #8 owner
- **Boundaries:**
  - documentary gap map for legacy TypeScript runtime accounting only; the current Python A4 path requires separate current-tree measurements
  - no code or test edits
  - nothing executed, containerized or pulled
  - nothing on import379 or any registry
  - no budget, no `N_min`, and no p95/p99 claim
  - quoted artifact values are not re-measured
  - no secrets or private identities
  - no closure claim; root publishes
