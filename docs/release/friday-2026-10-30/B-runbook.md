# B-2 — Python submission operator runbook

Use with [package audit](B-package-audit.md) and [source/conflict register](B-source-conflicts.md). This is an **operator draft**, not an accepted submission or permission to start shared-host container work. Execute container steps only after Agent A grants a heavy-job slot; this lane did not run them. Keep all sample data public and unmodified. Do not open blind materials.

## 1. Preflight and assemble

From a clean checkout of the intended release commit, with Git, Python 3, a POSIX shell, and a **running** Docker daemon capable of linux/amd64 builds:

```sh
set -eu
REPO=$(pwd -P)
RUN_ROOT=$(mktemp -d)
PIN=a44a06046b0413f0785e7203955c3822e0acbc32
git status --porcelain    # stop if unexpected changes appear
git rev-parse HEAD        # record exact release SHA; do not substitute this draft's base

git clone https://github.com/jhaaj08/chameleon.git "$RUN_ROOT/chameleon"
git -C "$RUN_ROOT/chameleon" checkout --detach "$PIN"
CHAMELEON_UPSTREAM="$RUN_ROOT/chameleon"
test "$(git -C "$CHAMELEON_UPSTREAM" rev-parse HEAD)" = "$PIN"
test -z "$(git -C "$CHAMELEON_UPSTREAM" status --porcelain)"
python3 "$REPO/submission/fingerprint.py" write --inputs "$CHAMELEON_UPSTREAM/input" "$RUN_ROOT/fingerprint.json"
python3 "$REPO/submission/fingerprint.py" verify "$RUN_ROOT/fingerprint.json" --inputs "$CHAMELEON_UPSTREAM/input"
sh "$REPO/submission/assemble_context.sh" "$RUN_ROOT/context" "$CHAMELEON_UPSTREAM"
```

Inspect `"$RUN_ROOT/context"`: only Python engine, pinned upstream orchestrator/renderer/schema/brand kit, Python Dockerfile, requirements, constraints, and marker. Its input/output directories are deliberately absent. Reject a missing/dirty upstream checkout, missing resource directory, unknown extra file, or mismatched fingerprint. `assemble_context.sh` refuses unowned nonempty OUT and dangerous target paths; never remove another operator's directory to make it pass. Run the archive/allowlist inspection in [rehearsal](B-rehearsal.md) before distributing any context. Record hashes before transferring. This audit used no archive creation.

## 2. Build, execute offline, prove the renderer

Only after obtaining Agent A's shared-host slot, with Docker daemon online:

```sh
docker info --format '{{.ServerVersion}}'
docker build --platform linux/amd64 -f "$RUN_ROOT/context/Dockerfile.python-submission" \
  -t reflow-python-submission "$RUN_ROOT/context" \
  > "$RUN_ROOT/build.log" 2>&1
docker image inspect reflow-python-submission --format '{{.Id}}' > "$RUN_ROOT/image-id.txt"
mkdir "$RUN_ROOT/smoke"
python3 "$REPO/scripts/offline_submission_smoke.py" \
  --runtime docker --image reflow-python-submission \
  --input "$CHAMELEON_UPSTREAM/input" --work "$RUN_ROOT/smoke" \
  --timeout 300 > "$RUN_ROOT/smoke.log" 2>&1
```

Build-time network access installs pinned Python dependencies; **runtime** `--network none` is mandatory. `offline_submission_smoke.py` runs the actual entrypoint twice plus the same-code-path probe, checks `linux/amd64`, source input hashes before/after, JSON-object and PNG-signature outputs for every public input, identical repeat hashes/image ID, read-only input mount (failed write), container network mode, a failed network connection, **one REAL converter call per case**, zero FALLBACK calls and zero RuntimeWarning. Read `smoke/case-ledger.json` and `smoke/run.log`; require `pass: true`, no failures, all three unchanged samples attempted. The script has finite per-run timeouts, but build time depends on the host; arrange a bounded host slot and stop on failure rather than hiding logs. No skipped test is a pass. Preserve build/smoke logs, fingerprint, image ID, SHA-256 of public inputs and all output JSON/PNG in the release evidence. Re-run for the **final integrated SHA**; this draft's base and historic OF-02 proof are not transferable.

The direct/manual equivalent is `docker run --rm --network none -v "$CHAMELEON_UPSTREAM/input:/app/input:ro" -v "$RUN_ROOT/output:/app/output" reflow-python-submission` after `mkdir "$RUN_ROOT/output"`, but **that command alone does not establish renderer provenance or offline qualification**. `docker build .` from the repository uses the wrong, legacy TypeScript Dockerfile.

## 3. Troubleshoot without masking defects

- **Daemon unavailable / unsupported architecture:** stop; record `docker info` failure. Do not start/reconfigure a shared VM without ownership and a host slot. On another host, keep `--platform linux/amd64`, check image architecture with the smoke, and record actual image ID.
- **Assembly rejects upstream:** check exact HEAD, clean status, and nonempty `renderer/converter`, `brand_kit/fonts`, `brand_kit/assets`, schema, and `engine/main.py`. No unpinned substitute. If the output target is already occupied, select a fresh directory rather than deleting it.
- **Import fallback:** upstream `engine/main.py` catches renderer `ImportError` and creates labeled box PNGs; exit 0/PNG signature cannot certify real rendering. Fix missing dependency or graphics library in an explicitly owned production change, rebuild, then require zero FALLBACK in the probe.
- **Missing image asset:** pinned Level 3 deliberately references `solstice_holiday_badge_2025.png`, absent from the three bundled assets. The upstream converter draws a labeled missing-asset placeholder for that image; do not add fabricated pixels, drop the source ID, or confuse this expected fixture with the entire renderer falling back. Unexpected missing assets are failures to triage, not automatic passes.
- **Structural warning:** upstream self-check prints warnings but returns success; inspect JSON/PNG and actual renderer/probe evidence. Neither self-check nor this smoke substitutes for organizer scoring or human visual review.
- **Output/evidence reuse:** fresh empty `--work`, distinct input/output mounts; the smoke refuses existing evidence. Do not wipe evidence or treat a successful old ledger as proof for changed source, inputs or image.

## 4. Release gate still outside this runbook

Require final source-bound Python verification (`CHAMELEON_UPSTREAM` set and `python scripts/verify_python.py` with no skips), integrated offline/provenance proof, and independent visual and native/creator judgments where applicable. Agent A coordinates heavy jobs and publication. Ask organizers to confirm October 30 cutoff time/timezone, exact submission format/repository access, and whether a viewer is required; do not infer those from this draft.
