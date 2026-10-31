# B-3 — unchanged-baseline rehearsal

**Status: static accounting DONE; container rehearsal HALTED.** Base repository `6d82709def61ae533fbc4f3ff59c2aa0a9c36bb3`, upstream `a44a06046b0413f0785e7203955c3822e0acbc32`, October 27, 2026. This baseline is not the final integrated code.

## Actually executed

| Check | Command / observation | Result |
| --- | --- | --- |
| Main and starter | `git fetch origin main`; `git rev-parse origin/main`; `git ls-remote https://github.com/jhaaj08/chameleon.git HEAD refs/heads/main`; isolated shallow clone `git rev-parse HEAD`; clean starter status | Both exact expected SHAs; upstream clone clean. |
| Tool preflight | `command -v docker`, `command -v podman`, `command -v python3`, `command -v shasum` | All binaries present; availability of a binary does not imply daemon readiness. |
| Docker daemon | `docker info --format '{{.ServerVersion}}'` | **FAILED:** `/Users/ojeda/.docker/run/docker.sock` absent; daemon not running. No image built. |
| Podman alternative | `podman info --format '{{.Host.Arch}}'` | **FAILED:** Podman VM connection refused at local socket. No alternative container run. |
| Safe assembly | `sh submission/assemble_context.sh /tmp/reflow-b-context-20261027 /tmp/reflow-b-upstream-20261027` from the isolated B checkout | **PASS**, fresh context; 29 files, 1,242,671 file bytes, exact source-byte comparisons and allowed-path inventory. See `reports/friday-2026-10-30/B/manifest.json`. |
| Source/input fingerprint | `python3 submission/fingerprint.py write --inputs /tmp/reflow-b-upstream-20261027/input reports/friday-2026-10-30/B/fingerprint.json`, then `verify` with same public inputs | **PASS** (`OK`): seven Python/packaging inputs and three public task JSONs. Git dirty is true only because lane documentation was untracked. |
| Resource cross-check | Parse public input image asset IDs; compare to pinned `brand_kit/assets` | One deliberately missing Level 3 image `solstice_holiday_badge_2025.png`; upstream `_adversarial_note` identifies it. No real-renderer invocation occurred. |
| Context exclusion | Compare all 29 paths to explicit expected source list; reject unexpected paths/prefixes | **PASS**: no root legacy Dockerfile, workbench, corpus, samples, tests, reports, `.git`, caches, or secrets in context. This is a context inventory, **not** a built-image filesystem inspection or a synthetic archive negative-control result. |

## What remains unmeasured

Image ID/digest after build: **NOT AVAILABLE**. Offline network mode, read-only mount enforcement, process exit, REAL/FALLBACK call counts, warnings, actual JSON/PNG output hashes, repeat stability, container architecture, image size/memory/runtime: **NOT RUN**. No output PNGs or container logs exist for this rehearsal. No heavy-job slot from Agent A was available or requested through another chat; even a working daemon would not permit competing shared-host work. The review MCP endpoint failed to connect in this session; it is not required for the static audit and its absence is not evidence of review acceptance.

After Agent A grants a host slot and a runtime is ready, run the fresh-context build and bounded smoke in [B-runbook](B-runbook.md). Record the actual final release SHA, image ID, host/runtime and build log; preserve `smoke/case-ledger.json`, `smoke/run.log`, `smoke.log`, `fingerprint.json`, all input/output SHA-256s, and failure output. If a step fails, stop; never convert a missing ledger or skipped case to a pass. Re-run on final integrated code after B's baseline. Do not alter official inputs, inspect blind cases, or silently substitute PR #151 qualification work.
