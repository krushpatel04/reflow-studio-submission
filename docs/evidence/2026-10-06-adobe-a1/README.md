# A1: Adobe starter renderer reproduction (2026-10-06)

Upstream `https://github.com/jhaaj08/chameleon` pinned at `a44a06046b0413f0785e7203955c3822e0acbc32`. All 31 files in `docs/evidence/2026-10-05-adobe-launch/source-manifest.json` hash-match (`logs/manifest-verify.log`, exit 0).
Host: Linux 7.0.0-31 x86_64, Ubuntu 26.04, no root. Python: uv CPython 3.11.16 (Dockerfile pins 3.11; system 3.14.4 not used). Only the declared `requirements.txt` deps: Pillow 12.3.0, cr-renderer `a17e1fb9a732959dd6c21ae168d5ee09d74bd64f`, transitive skia-python 144.0.post2 (`versions.txt`).
Scope: this proves the real renderer runs on the three public samples. It says nothing about layout quality (upstream `resize()` is the naive stretch), and no hardware, scoring or container claim.

## Findings
1. **Silent fallback.** `engine/main.py` catches `ImportError` from `renderer.converter.convert` and draws labeled boxes instead. When `skia` cannot load (`ImportError: libEGL.so.1`, `libGL.so.1` missing), `python -m engine.main` still prints `OK`, writes PNGs and **exits 0**. Exit code and the OK line are not evidence of real rendering (`logs/main-plain-nolibs.*`).
2. **Dependency error, diagnosed once.** `python -c 'import skia'` -> `ImportError: libEGL.so.1: cannot open shared object file` (`logs/dependency-diagnosis.log`). The Dockerfile apt-installs `libgl1 libegl1 fontconfig`. Required intervention: `apt-get install libegl1 libgl1 libfontconfig1` as root.
3. **LD_LIBRARY_PATH workaround (no root).** Download the Ubuntu packages, extract them into a user-owned dir, and point `LD_LIBRARY_PATH` at it. This is host-specific and unsupported by upstream; the real fix is the apt install above.
4. **Real renderer positively used.** With the libs, `trace_run.py` records 3x `renderer.converter.convert.render_design_to_png` and 3x `CrelloV5Renderer.render`, 0 fallback calls (`events-real.json`). Untraced `python -m engine.main` PNGs are byte-identical.
5. **Fault control.** Forcing `cr_renderer` imports to raise `ImportError` gives 3 fallback calls, exit 0, PNGs byte-identical to the no-libs run (`events-fault.json`). It does not qualify as real rendering.
6. **Warnings kept.** `Fontconfig error: Cannot load default config file` once (cosmetic, fonts rendered). L2 self-check: `element 'deco_circle_1' is off-canvas (1600x400)`, from the naive stretch. Output JSON identical across all runs.

| Sample | Result | Real PNG | Fallback PNG |
|---|---|---|---|
| level1_warmup | PASS | 1080x1350, 113157 B, 3969 colors | 9116 B, 138 colors |
| level2_core | PASS (off-canvas warning) | 1600x400, 52510 B, 2132 colors | 8715 B, 353 colors |
| level3_advanced | PASS (renders; text unreadable at 728x90) | 728x90, 12504 B, 860 colors | 5356 B, 460 colors |

PASS = real renderer imported and called, PNG not fallback. SHA-256 of every PNG: `hashes.txt`. Container run (A4) was not done: rootless podman fails with `newuidmap: executable file not found` and there is no sudo.

## Reproduce (copy-paste; needs network for pip/git/apt download, no root)
```bash
set -euo pipefail
EVID="$PWD/docs/evidence/2026-10-06-adobe-a1"   # run from the reflow-studio checkout root
W=$(mktemp -d) && cd "$W"
git clone -q https://github.com/jhaaj08/chameleon up && git -C up checkout -q a44a06046b0413f0785e7203955c3822e0acbc32
uv venv --python 3.11 venv && (cd up && uv pip install --python ../venv/bin/python -r requirements.txt)
mkdir debs && (cd debs && apt-get download libegl1 libgl1 libglx0 libopengl0 libglvnd0 libfontconfig1 && for d in *.deb; do dpkg-deb -x "$d" ../libs; done)
export LD_LIBRARY_PATH="$W/libs/usr/lib/x86_64-linux-gnu"
cd up && mkdir -p output
# real render (exit 0); then confirm it was real, not fallback:
../venv/bin/python -m engine.main
cp "$EVID/trace_run.py" .
rm -f output/*; PYTHONPATH=. ../venv/bin/python trace_run.py --events ../events-real.json && grep -c REAL ../events-real.json   # expect 3
# fault control:
rm -f output/*; PYTHONPATH=. ../venv/bin/python trace_run.py --fail-import --events ../events-fault.json && grep -c FALLBACK ../events-fault.json   # expect 3
sha256sum output/*.png   # fallback hashes here (last run was the fault control); real hashes: rerun without --fail-import
cd "$EVID" && sha256sum -c hashes.txt >/dev/null && echo committed-hashes-ok
```
Layout of this directory: `trace_run.py`, `events-*.json`, `versions.txt`, `png-stats.txt`, `hashes.txt`, `png-real/`, `png-fallback/`, `logs/*.log` (10 files) with `.exit` sidecars (9), and `logs/ORIGINAL-SHA256SUMS.txt`. **Scrub notice:** in `events-real.json`, `logs/dependency-diagnosis.log`, `logs/dependency-diagnosis-2.log` and `logs/pip-install.log`, the validation host's runtime directory prefix `/home/nala/.local/share/reflow-runtime` was replaced with `$RUNTIME`; nothing else was edited. All other logs are verbatim. `logs/ORIGINAL-SHA256SUMS.txt` has the SHA-256 of every `.log` and events file as produced (before the scrub), for the verbatim ones they match the committed bytes. `*.log` is gitignored, so the logs were added with `git add -f` on exactly those paths. No credentials. `logs/dependency-diagnosis.log` is the first diagnosis attempt (its `ldd`/`ldconfig` lines failed); `logs/dependency-diagnosis-2.log` is the corrected one that shows `libEGL.so.1`/`libGL.so.1` as not found.
