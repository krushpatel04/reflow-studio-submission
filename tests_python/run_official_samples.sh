#!/usr/bin/env bash
# Runs the pinned upstream orchestrator (python -m engine.main) with THIS repo's engine/resize.py on the 3 public samples.
# Proves (a) our resize.py is the imported module, (b) the real cr_renderer path ran and the box fallback did not.
# Env (nala host): UPSTREAM=/home/nala/.local/share/reflow-runtime/chameleon-a44a060, PY=<venv python>, SYSLIBS=<.../usr/lib/x86_64-linux-gnu>
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
UPSTREAM="${UPSTREAM:-/home/nala/.local/share/reflow-runtime/chameleon-a44a060}"
PY="${PY:-/home/nala/.local/share/reflow-runtime/chameleon-venv311/bin/python}"
SYSLIBS="${SYSLIBS:-/home/nala/.local/share/reflow-runtime/chameleon-syslibs/root/usr/lib/x86_64-linux-gnu}"
OUT="${1:-$(mktemp -d)}"; WORK="$(mktemp -d)"
cp -a "$UPSTREAM/." "$WORK/"; cp "$REPO"/engine/*.py "$WORK/engine/"; mkdir -p "$WORK/output"
cd "$WORK"
LD_LIBRARY_PATH="$SYSLIBS" "$PY" - <<'EOF' | tee "$OUT/run.log"
import json, sys, runpy
import engine.resize as r
print("engine.resize.__file__ =", r.__file__)
import engine.main as em
events = []
fb = em._fallback_render
em._fallback_render = lambda d, p: (events.append(["FALLBACK", str(p)]), fb(d, p))[1]
import renderer.converter.convert as conv, cr_renderer
orig = conv.render_design_to_png
conv.render_design_to_png = lambda d, a, o: (events.append(["REAL", conv.__file__, cr_renderer.__file__, str(o)]), orig(d, a, o))[1]
import warnings
warnings.simplefilter("error", RuntimeWarning)  # any text_fit RuntimeWarning fails the run
rc = em.main()
print("exit", rc)
print("events", json.dumps(events))
assert rc == 0 and len(events) == 3 and all(e[0] == "REAL" for e in events), "real renderer not proven"
print("PROOF real renderer x3, 0 fallback")
EOF
cp output/* "$OUT/"; ls -l "$OUT"
