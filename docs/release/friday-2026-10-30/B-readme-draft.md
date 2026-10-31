# B-2 — proposed submission README text

**Draft only.** Agent A owns final README edits and must reconcile this text with the organizer's final instructions. Replace `RELEASE_SHA` with the actual integrated Git SHA; never leave it in a shipped README.

---

# Reflow Studio — Chameleon Python engine

This repository implements the official Chameleon starter's `engine.resize.resize(source, target_canvas)` contract in Python. It preserves structured design elements; the pinned starter's orchestrator reads each task JSON, writes `<stem>_output.json`, and renders `<stem>_output.png`. The root `Dockerfile` is an older TypeScript workbench; use `Dockerfile.python-submission` **from the assembled context** for the Python submission. Source under review: `RELEASE_SHA`.

## Build and run

Requires Docker with a running daemon and linux/amd64 support, Git, Python 3 and a POSIX shell. Run these commands from the checked-out repository; replace the release SHA only after independent validation.

```sh
set -eu
REPO=$(pwd -P)
RUN_ROOT=$(mktemp -d)
git clone https://github.com/jhaaj08/chameleon.git "$RUN_ROOT/chameleon"
git -C "$RUN_ROOT/chameleon" checkout --detach a44a06046b0413f0785e7203955c3822e0acbc32
CHAMELEON_UPSTREAM="$RUN_ROOT/chameleon"
sh "$REPO/submission/assemble_context.sh" "$RUN_ROOT/context" "$CHAMELEON_UPSTREAM"
docker build --platform linux/amd64 \
  -f "$RUN_ROOT/context/Dockerfile.python-submission" \
  -t reflow-python-submission "$RUN_ROOT/context"
mkdir "$RUN_ROOT/output"
docker run --rm --network none \
  -v "$CHAMELEON_UPSTREAM/input:/app/input:ro" \
  -v "$RUN_ROOT/output:/app/output" reflow-python-submission
```

Inspect one JSON/PNG pair per input under `"$RUN_ROOT/output"`. The three official public inputs are development examples, not hidden-scoring evidence. `input/` and `output/` are **runtime mounts**, not embedded in the build context or image. Do not mount private evaluation inputs for tuning.

**Renderer qualification:** the pinned orchestrator can silently draw labeled-box placeholders if its real renderer import fails. A successful process/PNG does not prove correct rendering. On a fresh release SHA/image, execute `python3 "$REPO/scripts/offline_submission_smoke.py" --runtime docker --image reflow-python-submission --input "$CHAMELEON_UPSTREAM/input" --work "$RUN_ROOT/smoke" --timeout 300` with a fresh `smoke` path. Require the case ledger to report `pass: true`, real converter calls for every case, zero box fallback/warnings, no network access, unchanged read-only inputs, and stable repeated JSON/PNG hashes. Record image ID and SHA-256 hashes. Local evidence is not organizer acceptance.

The official public Level 3 sample intentionally references an asset absent from the bundled brand kit. Its converter draws an image-specific missing-asset placeholder; do not fabricate image content or confuse that with full renderer fallback. Check all other missing assets explicitly. Upstream structural self-check warnings do not change the process exit code. The engine does not require external inference at run time. Python packages and Linux graphics libraries install at image **build** time; apt packages and pip artifacts are not hash-locked, despite a pinned base image, Git dependency and pip versions.

**Known boundaries:** independent visual quality, native Express/creator acceptance, hidden scoring and final offline proof remain separate. Submission deadline time/timezone, precise upload/repository format and viewer requirement need organizer confirmation. The starter's `RULES.md`, design schema and Adobe's latest direct communications control over this draft.
