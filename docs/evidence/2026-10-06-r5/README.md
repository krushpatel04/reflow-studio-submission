# R5: offline container build and run, 2026-10-06

Base: main 2f89053. Host: nala, uid 1000, podman 6.1.3 at `~/.local/bin/podman`, no docker, no `newuidmap`/`newgidmap`, `/etc/subuid` = `nala:100000:65536`.

## Result
Image built and ran on this host WITHOUT root and WITHOUT `newuidmap`, using a single-ID user namespace. The committed `Dockerfile.python-submission` did NOT build unchanged here: apt's `_apt` sandbox needs `setgroups`/uid 42 (see Failures). The built image used a diagnostic copy with one extra apt line (below). Plain rootless podman with the default config still fails (`newuidmap` missing).

## Build context (upstream files are not committed; upstream has no LICENSE)
Source: `/home/nala/.local/share/reflow-runtime/chameleon-a44a060` (jhaaj08/chameleon @ a44a06046b0413f0785e7203955c3822e0acbc32, verified by `git rev-parse HEAD`).
```
UP=/home/nala/.local/share/reflow-runtime/chameleon-a44a060; C=/tmp/r5-ctx
mkdir -p $C
cp -r $UP/renderer $UP/brand_kit $UP/chameleon_design_schema_v0.9.json $C/
cp -r $UP/engine $C/engine && rm -rf $C/engine/__pycache__   # upstream engine/main.py is required; it is not in this repo
cp engine/*.py $C/engine/                                    # overlay this repo's engine (main has only resize.py; text_fit is not on main)
cp Dockerfile.python-submission requirements-python-submission.txt $C/
sed 's|^RUN apt-get update|RUN echo '"'"'APT::Sandbox::User "root";'"'"' > /etc/apt/apt.conf.d/99r5-nosandbox \&\& apt-get update|' $C/Dockerfile.python-submission > $C/Dockerfile.r5-diag
```
`Dockerfile.r5-diag` differs from the committed file only by `echo 'APT::Sandbox::User "root";' > /etc/apt/apt.conf.d/99r5-nosandbox &&` in front of `apt-get update`.

## Rootless single-ID podman recipe
Scripts: `build.sh`, `run.sh`, `crun-wrap.sh`, `proof.py` in this dir. Invoke as `unshare --user --map-root-user --mount sh build.sh`.
- Private state under `/tmp/r5-podman2` (`root`, `run`, `xdg`, `tmp`, `home/.config/containers` copied from `~/.config/containers`). The vfs driver needs about 8 GB there.
- `containers.conf`: `[engine] helper_binaries_dir=["~/.local/lib/podman"], conmon_path=["~/.local/lib/podman/conmon"], runtime="/tmp/r5-wrap/crun", cgroup_manager="cgroupfs", events_logger="file"`; `[containers] cgroups="disabled", netns="host", userns="host"`.
- `storage.conf`: `driver="vfs"`, `ignore_chown_errors="true"`, private `graphroot`/`runroot`.
- `/tmp/r5-wrap/crun` is `crun-wrap.sh`: it deletes the `gid=5` devpts option from the OCI spec (gid 5 is unmapped), then execs the real crun.
- `mount -t tmpfs tmpfs /var/cache` and `/run` inside the namespace (podman and crun try to create dirs there).
- `podman --tmpdir /tmp/r5-podman2/tmp`.

## Run (fresh output dir, `--network none`)
`run.sh`: `podman run --rm --network none -v $UP/input:/app/input:ro -v /tmp/r5-out:/app/output reflow-python-submission` (entrypoint `python -m engine.main`). Exit 0, 3 samples, 6 output files.
`proof.py` (log `logs/proof.log`): `engine.resize.__file__ = /app/engine/resize.py`, **3 REAL / 0 FALLBACK**, exit 0, `socket.create_connection` fails with `Network is unreachable`. No RuntimeWarning appears. That check proves nothing about text_fit: it is not on main (`text_fit absent`), so it is untested here.
Level 2 prints one self-check warning (`deco_circle_1` off-canvas); it exits 0.

Output hashes (`hashes.txt`; a second run into a fresh dir was byte-identical, `cmp`):
```
97193ea3f25bf3bd01a6d745f98ccd7cb60e0f19f21854aa8b04c651f93cbcf6  chameleon_sample_level1_warmup_output.json
494caf37aae64d8ca8fcccb05402bab86079cec0eff7abd251294db8117d8c2d  chameleon_sample_level1_warmup_output.png
416cac59d99f607c766dba853b6d03250e0c6655977a4ffa6f902262b0bddc53  chameleon_sample_level2_core_output.json
b2c880e29b2a3736f5bbdc70829188d3d4515350c8835b9903dbb713fe098d3a  chameleon_sample_level2_core_output.png
630bf5d7def67840691e0c495b1e19eb81d553345fbb83b484b6bc751358953d  chameleon_sample_level3_advanced_output.json
afd52c4d1d4f438f68b1eebe66c484525a84a904d16b3db6a39d3123552ddf12  chameleon_sample_level3_advanced_output.png
```

## Failures hit, in order (logs in `logs/`)
1. Default: `Error: command required for rootless mode with multiple IDs: exec: "newuidmap": executable file not found in $PATH` (`logs/podman-probe.log`).
2. `--storage-driver vfs` alone: `database graph driver "overlay" does not match our graph driver "vfs"` (`logs/build-vfs.log`); needs a fresh graphroot.
3. In the namespace, with no `ignore_chown_errors`: `lchown /etc/gshadow: invalid argument` while pulling python:3.11-slim (`logs/build.log`).
4. With `ignore_chown_errors`, committed Dockerfile: `E: setgroups 65534 failed`, `E: seteuid 42 failed`, `apt-get` exit 100 (`logs/build-apt-failure.log`). Fixed by the diag apt line.
5. Run: `mkdir /run/crun: permission denied`, then `mount devpts to dev/pts: Invalid argument`; fixed by tmpfs `/run` and the crun wrapper.

## Logs and checks
`logs/` holds `proof.log`, `build-ok.log` (successful diag build), `build-apt-failure.log`, `build.log`, `build-vfs.log`, `podman-probe.log`, force-added because `*.log` is gitignored. Only change from the originals: the prefix `/home/nala/.local/share/reflow-runtime` was replaced by `$RUNTIME`. Originals stay in `~/.local/share/reflow-runtime/results/midnight-run/r5/`.
`check-evidence.sh` confirms every file this README names exists in the commit (prints `missing 0`).

## Hash provenance
All six hashes above equal the original P1 baseline, `docs/evidence/2026-10-06-python-p1/sample-output.sha256` (3 JSON + 3 PNG), so the container output matches the earlier host-venv output.

## Limits
- The P4 baseline has `text_fit absent`, so the "no RuntimeWarning" check is UNPROVEN, not passed.
- Not evidence for the Mac/Docker path. The unmodified Dockerfile has not been built anywhere. In a real Docker or full-userns podman the extra apt line should not be needed.
- Not a hermetic build: the build pulled python:3.11-slim, Debian packages, and the pinned cr-renderer from the network. Only the RUN is `--network none`.
- The wrapper, `netns=host`, `cgroups=disabled` and `ignore_chown_errors` are diagnostic hacks for this host, not a supported setup.
- Image digest is not pinned (`python:3.11-slim` is a moving tag).
