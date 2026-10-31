#!/bin/sh
# Assemble the Docker build context for Dockerfile.python-submission into OUT, at build time only.
# Upstream starter files (renderer/, brand_kit/, schema, engine/main.py) have no LICENSE and are never committed here.
# Usage: submission/assemble_context.sh OUT [UPSTREAM_CHECKOUT]
#   With UPSTREAM_CHECKOUT (clean, at the pin) no network is used; without it the pinned commit is cloned to a temp dir.
# Safety: OUT is resolved (symlinks followed) and refused if it is /, $HOME, the repo, the upstream, inside either, or an
# ancestor of either. A non-empty OUT is replaced only if it carries the marker this script writes. The context is built in a
# temp sibling of OUT and swapped in, so a failed or interrupted run never leaves a partial OUT and never touches a good one.
set -eu
PIN=a44a06046b0413f0785e7203955c3822e0acbc32
MARKER=.assembled-by-assemble_context
OUT_ARG=${1:-}
[ -n "$OUT_ARG" ] || { echo "usage: assemble_context.sh OUT [UPSTREAM_CHECKOUT]" >&2; exit 2; }
REPO=$(cd "$(dirname "$0")/.." && pwd -P)
CLONE= STAGE= OLD=
cleanup() { [ -z "$STAGE" ] || rm -rf "$STAGE"; [ -z "$OLD" ] || rm -rf "$OLD"; [ -z "$CLONE" ] || rm -rf "$CLONE"; }
trap cleanup EXIT
trap 'exit 143' INT TERM HUP
die() { echo "assemble_context: $*" >&2; exit 2; }

if [ -n "${2:-}" ]; then UP=$(cd "$2" && pwd -P) || die "cannot read upstream $2"
else CLONE=$(mktemp -d); git clone -q https://github.com/jhaaj08/chameleon "$CLONE"; git -C "$CLONE" checkout -q "$PIN"; UP=$(cd "$CLONE" && pwd -P); fi
[ "$(git -C "$UP" rev-parse HEAD)" = "$PIN" ] || die "upstream is not at $PIN"
[ -z "$(git -C "$UP" status --porcelain)" ] || die "upstream checkout is dirty"
for r in renderer/converter brand_kit/fonts brand_kit/assets; do
  [ -d "$UP/$r" ] && [ -n "$(ls -A "$UP/$r")" ] || die "upstream is missing required resource (absent or empty): $r"
done
for r in chameleon_design_schema_v0.9.json engine/main.py; do [ -s "$UP/$r" ] || die "upstream is missing required resource (absent or empty): $r"; done

# Python is already required by the submission; avoid GNU-only realpath -m on macOS.
resolve_path() { python3 -c 'from pathlib import Path; import sys; print(Path(sys.argv[1]).resolve())' "$1"; }
OUT=$(resolve_path "$OUT_ARG")
[ ! -L "$OUT_ARG" ] || die "OUT must not be a symlink: $OUT_ARG"
HOME_R=$(resolve_path "${HOME:-/nonexistent}")
for p in / "$HOME_R" "$REPO" "$UP"; do [ "$OUT" != "$p" ] || die "refusing OUT=$OUT"; done
case "$OUT/" in "$REPO"/*|"$UP"/*) die "OUT is inside the repo or upstream: $OUT";; esac
case "$REPO/" in "$OUT"/*) die "OUT is an ancestor of the repo: $OUT";; esac
case "$UP/" in "$OUT"/*) die "OUT is an ancestor of the upstream: $OUT";; esac
if [ -e "$OUT" ]; then
  [ -d "$OUT" ] || die "OUT exists and is not a directory: $OUT"
  [ -z "$(ls -A "$OUT")" ] || [ -f "$OUT/$MARKER" ] || die "OUT is non-empty and was not made by this script: $OUT"
fi

mkdir -p "$(dirname "$OUT")"
STAGE=$(mktemp -d "$OUT.tmp.XXXXXX")
mkdir "$STAGE/engine"
cp -R "$UP/renderer" "$UP/brand_kit" "$UP/chameleon_design_schema_v0.9.json" "$STAGE/"
cp "$UP/engine/main.py" "$STAGE/engine/"            # upstream entrypoint; this repo has no engine/main.py
cp "$REPO"/engine/*.py "$STAGE/engine/"             # overlay this repo's engine
cp "$REPO/Dockerfile.python-submission" "$REPO/requirements-python-submission.txt" "$REPO/constraints-python-submission.txt" "$STAGE/"
find "$STAGE" -name __pycache__ -prune -exec rm -rf {} +
echo "built by submission/assemble_context.sh from upstream $PIN" > "$STAGE/$MARKER"   # constant content: keeps manifests reproducible

# Two renames, not one atomic syscall; a crash between them leaves OUT.old.* (never a partial OUT). Upgrade: renameat2(RENAME_EXCHANGE).
if [ -e "$OUT" ]; then OLD=$(mktemp -d "$OUT.old.XXXXXX"); rmdir "$OLD"; mv "$OUT" "$OLD"; fi
mv "$STAGE" "$OUT" || { [ -z "$OLD" ] || mv "$OLD" "$OUT"; die "could not promote $STAGE"; }
STAGE=
echo "context ready: $OUT (upstream $PIN, repo $(git -C "$REPO" rev-parse HEAD 2>/dev/null || echo unknown))"
