# Offline Packaging Limitations and Provenance
Channel: `reflow-offline` (RF-OFFLINE-20261006). Date: 2026-10-06.

## Current status
- **BLOCKED**: this host (kernel 7.0.0-34) now refuses unprivileged user namespaces (`apparmor_restrict_unprivileged_userns=1`; `unshare --user --map-root-user` fails with `Operation not permitted` on `/proc/self/uid_map`). No container build or run is possible here until an administrator grants an AppArmor profile for the runtime or installs `uidmap` with subuid/subgid uid-mapping for the user. Admin note: grant a narrow profile or uid-mapping; never disable the host restriction globally. No workaround was attempted.
- **Proof scope**: all container evidence below covers only tree `fd73cbcd15fa1fedbe23750d1be194102ee242a2`. Note: current main is unproven in a container: it was not rebuilt or run after the block.
- **Host-only checks that do run**: `tests_python/test_submission_files.py`, `tests_python/test_offline_smoke.py` (fake runtime), `tests_python/test_fingerprint.py`. They check script behaviour and file consistency, not that the image works, and are not a quality claim about rendering.
- **Drift gate**: `python3 submission/fingerprint.py verify MANIFEST --inputs DIR` fails on any change to engine modules, packaging files, base digest, upstream pin or public inputs relative to the manifest it is given. No manifest was ever recorded for `fd73cbcd`; `validate.sh` writes one from the current tree before the build and verifies it after the smoke run, so it only catches drift during that run. It is not container evidence.
- **validate.sh fingerprint wiring** (write before build, verify after smoke) is syntax-checked only (`sh -n`) and untested until the container runs.
- **Next proof**: ordered steps are in README.md, "Run after admin enables userns". It is text only; no run has happened under it.

1. **Host-Specific Single-ID Rootless Podman**: The Dockerfile builds and runs under a single-ID rootless podman namespace (`unshare --user --map-root-user --mount`), with `vfs` storage driver, `netns=host`, `cgroups=disabled`, `ignore_chown_errors`, and a crun wrapper stripping devpts `gid=5`. This is a host-specific workaround for nala's lack of `newuidmap` / standard unprivileged user namespaces, not a supported Docker or Mac production environment.
2. **Build-Time Apt Sandbox Override**: Debian's `apt-get update` drops privileges to user `_apt`, which fails under single-ID userns without `newuidmap`. The build therefore supplies `APT::Sandbox::User "root";` via `--volume` into `/etc/apt/apt.conf.d/99nosandbox`. The committed `Dockerfile.python-submission` itself remains unmodified.
3. **Upstream Source Pinning**: Upstream files (`renderer/`, `brand_kit/`, `chameleon_design_schema_v0.9.json`, and `engine/main.py`) are pulled dynamically at build time from `https://github.com/jhaaj08/chameleon @ a44a06046b0413f0785e7203955c3822e0acbc32` via `submission/assemble_context.sh`. They are not committed in this repo because upstream has no LICENSE.
4. **Base Pinned, Apt Not**: The base is pinned to the linux/amd64 manifest `python:3.11-slim@sha256:e529028263dbe6910a2d96f7d2b8f5266385e917fd45d286ef166977c094a51e` (Python 3.11.17, Debian trixie, verified with `podman manifest inspect` on 2026-10-06). Pip transitives are pinned by `constraints-python-submission.txt` (from `pip freeze` of the previously validated image). Debian apt packages are NOT pinned (old versions are dropped from the archive), so `apt-get update` still resolves current trixie packages at build time; the digest may also be garbage-collected upstream later. Layer digests apply to one host build only; no bit-for-bit image reproducibility is claimed.
5. **Network Boundary**: Build-time networking is active (to pull apt packages and the pip cr-renderer dependency). Runtime is strictly offline (`--network none`).
6. **No Node/npm**: The runtime image contains zero Node.js toolchains or runtimes.

## Result of the validation run (tree 3c2cef80258f8aa5799dc9e3dd603be03e314c63 = origin/github/main 8d119dc + packaging; `git diff origin/github/main -- engine/` empty)
Evidence files are committed in the next commit; engine/, Dockerfile.python-submission, submission/ and scripts/ are byte-identical to the validated tree (the commit only adds evidence files).
- Host: nala, Linux 7.0.0-31 x86_64, rootless single-ID podman 6.1.3 (not Docker, not the Mac). Image arch amd64/linux, id d0e5bce8a2b9.
- Build exit 0 (build-time network on, first run; base then a moving tag). Run: `--network none`, input `:ro`.
- 3 public samples: 3 REAL (cr-renderer) / 0 FALLBACK, probe exit 0, network blocked, 6 output files, input hashes unchanged, 0 `RuntimeWarning`. Output hashes in case-ledger.json. Level 1/2 equal R5b; level 3 differs from R5b (R6 image occlusion now on main); not independently checked here.
- Entrypoint run and probe run produced identical output hashes (determinism within one image).
- Controls (controls.log, control-ledgers/): renderer absent -> smoke exit 1 (probe cannot import renderer; note the plain entrypoint still exits 0 with box fallback, so the exit code alone does NOT detect a missing renderer, only the probe does); input altered after run -> exit 1; write to `:ro` input -> `Read-only file system`; zero input cases -> exit 1.
- Fontconfig prints `unknown element "reset-dirs"` warnings (Debian fontconfig config, not a Python warning) and Level 2 prints 1 self-check warning (`deco_circle_1`), both exit 0.
- Host workarounds: podman state is on disk (tmpfs /tmp has a user quota), crun wrapper must be named `crun`, DNS target re-bound after `/run` is masked.

## Re-validation with pinned base and pip constraints (tree fd73cbcd15fa1fedbe23750d1be194102ee242a2, evidence files above are from THIS run and replace the 3c2cef80 logs)
- Dockerfile `FROM ... python:3.11-slim@sha256:e529...a51e` and `pip install -c constraints-python-submission.txt` (build.log STEP 5). Image id 11ac215ca519, amd64/linux, `image.txt` records the base line.
- Build exit 0; smoke PASS: 3 REAL / 0 FALLBACK, probe network blocked, inputs unchanged, 6 outputs. Output hashes are IDENTICAL to the 3c2cef80 run (pins did not change rendering).
- Controls repeated: renderer-absent exit 1, input-altered exit 1, ro-write blocked, zero-input exit 1.
- The 3c2cef80 results above (older logs, replaced in-tree) remain in git history at 0052bef.
