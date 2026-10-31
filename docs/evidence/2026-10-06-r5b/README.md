# R5b: Unmodified Dockerfile.python-submission build and run evidence

Base: main `d48a548`. Host: nala, uid 1000, rootless podman 6.1.3, single-ID userns.

## Conclusion
The committed `Dockerfile.python-submission` (sha256 `351f5f4e5f366ad8bab94c4382ad8c057b9b1986b2bf5575c73f1d7ea6f59a7d`, byte-identical to the file in the build context) builds and runs **unmodified** on this host, given the build-invocation fix below. Exit sidecars: `logs/build.exit`, `logs/run.exit`, `logs/proof.exit`, all 0.

## Why the `_apt` sandbox failed previously (R5)
During `apt-get update`, Debian's apt drops root privileges to user `_apt` inside its build sandbox. In a single-ID rootless podman container without `newuidmap`, unmapped uids/gids cause `seteuid(42)` and `setgroups` to fail with `Invalid argument` or `Operation not permitted`.

## The fix (lives in the build invocation, not the Dockerfile)
We supply an apt configuration snippet (`APT::Sandbox::User "root";`) via build-time volume mounting, forcing apt to remain root inside the container build sandbox:
```
podman build \
  --volume /tmp/r5b-apt-nosandbox.conf:/etc/apt/apt.conf.d/99r5-nosandbox:ro \
  -f Dockerfile.python-submission -t reflow-python-submission-r5b .
```

## Run and proof (`--network none`)
- Run command: `podman run --rm --network none -v <input>:/app/input:ro -v <output>:/app/output reflow-python-submission-r5b`
- Exit code: 0 across all 3 public samples.
- Proof script (`proof.py`): **3 REAL / 0 FALLBACK**, 0 `RuntimeWarning`s, network connectivity blocked (`Network is unreachable`).
- Image ID: `fb1434a523d01e6e81b7e4bf03014ed67695b1386803ab115e69cd78e73e5633`.
- Image digest `sha256:09840aa25e45301ea0c44cf51da04a3ea95a2562d2127714f121c1d7d8e7ca0e`; 12 RootFS layers, listed in `logs/image-inspect.txt`; entrypoint `[python -m engine.main]`, no CMD.
- Output hashes (levels 1 and 2 match R5; level 3 differs because main now includes `text_fit`):
  - `chameleon_sample_level1_warmup_output.json`: `97193ea3f25bf3bd01a6d745f98ccd7cb60e0f19f21854aa8b04c651f93cbcf6`
  - `chameleon_sample_level1_warmup_output.png`: `494caf37aae64d8ca8fcccb05402bab86079cec0eff7abd251294db8117d8c2d`
  - `chameleon_sample_level2_core_output.json`: `416cac59d99f607c766dba853b6d03250e0c6655977a4ffa6f902262b0bddc53`
  - `chameleon_sample_level2_core_output.png`: `b2c880e29b2a3736f5bbdc70829188d3d4515350c8835b9903dbb713fe098d3a`
  - `chameleon_sample_level3_advanced_output.json`: `35d75ec9d72f52d35f07d64bd90e992391dc1d474b8f171d956d4e7937a4a0a9`
  - `chameleon_sample_level3_advanced_output.png`: `2d844047d1e9626cc066e604a503f25ba5cf891be1f2bb053c44b1002765081e`

## Build context
Same as `docs/evidence/2026-10-06-r5/README.md`, minus the `sed`/diag Dockerfile: upstream `renderer/`, `brand_kit/`, schema and `engine/` from chameleon-a44a060 (not committed), then this repo's `engine/*.py` overlaid (now includes `text_fit.py`), plus the unmodified Dockerfile and requirements. Podman state, `containers.conf`, `storage.conf` and the crun wrapper are the R5 recipe (fresh graphroot for this run).

## Still host workarounds (R5 recipe, not in the Dockerfile)
single-ID `unshare --user --map-root-user --mount`, vfs + `ignore_chown_errors`, `netns=host`, `cgroups=disabled`, tmpfs on `/var/cache` and `/run`, crun wrapper stripping devpts `gid=5` (run only). The new piece in R5b is only `--volume ...:/etc/apt/apt.conf.d/99r5-nosandbox:ro`.

## Files
`build.sh`, `run.sh`, `proof.sh`, `proof.py`, `apt-nosandbox.conf`, `logs/` (`build.log`, `run.log`, `proof.log`, `image-inspect.txt`, exit sidecars). Logs have `/home/nala/.local/share/reflow-runtime` replaced by `$RUNTIME`; originals in `~/.local/share/reflow-runtime/results/midnight-run/r5b/`.

## Limits
- Not Docker, not the Mac, not a full-userns podman. This proves the Dockerfile text, not those paths.
- Not hermetic: the build pulled python:3.11-slim (moving tag), Debian packages and the pinned cr-renderer over the network. Only the run is `--network none`. Reproducibility of image layers is not claimed; the layer digests above are for this build only.
- Level 3 hashes differ from R5 because main now has `text_fit`; no independent check of that output is made here.
- `--volume` on `podman build` is the fix; Docker `build` has no equivalent flag, but Docker with full userns should not need it.
