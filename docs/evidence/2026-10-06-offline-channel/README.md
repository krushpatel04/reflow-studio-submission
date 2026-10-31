# Offline Channel Packaging Evidence
RF-OFFLINE-20261006. Offline Engineer: agent-2.

Files:
- `Dockerfile.python-submission`: Unmodified Python-only submission Dockerfile.
- `requirements-python-submission.txt`: Pinned Pillow and cr-renderer commit.
- `submission/assemble_context.sh`: Reproducible build-time upstream context assembler (pin `a44a060`).
- `scripts/offline_submission_smoke.py`: Stdlib smoke runner verifying input hash preservation, zero fallback, zero RuntimeWarning, amd64, and case count.
- `docs/evidence/2026-10-06-offline-channel/validate.sh`: Full build, run, and control validator.
- `build.log`, `run.log`, `case-ledger.json`, `controls.log`, `image.txt`, `limitations.md`.

Run full validation under flock:
`flock /tmp/quoroum-full-validation.lock unshare --user --map-root-user --mount sh docs/evidence/2026-10-06-offline-channel/validate.sh`

Evidence reuse: tree identical, main 1746bb4. origin/github/main 1746bb4 differs from the validated base 8d119dc only in docs/plans/2026-10-07-python-r7-mutant-gap.md and tests_python/test_text_fit.py; engine/, Dockerfile.python-submission, submission/, scripts/ and requirements are unchanged, so the build/run/control evidence from validated tree 3c2cef80 (approved at 0052bef) is reused without rebuild.

Evidence reuse: merge-only updates of origin/github/main (a305c22, then 9bddea4 LICA batch pipeline) leave engine/, Dockerfile.python-submission, submission/, scripts/offline_submission_smoke.py, constraints/requirements and this evidence directory byte-identical; validated tree fd73cbcd (digest + constraints pins) is reused, no rebuild.

Fingerprint (host-only, no container): `python3 submission/fingerprint.py write --inputs DIR OUT.json` records sha256 of every `engine/*.py`, the Dockerfile, requirements, constraints and `assemble_context.sh`, plus the base image digest, the upstream pin and the public input JSON files (schema_version 1). `verify MANIFEST --inputs DIR` exits 1 and names every drifted, missing or unexpected key. It is a gate for a future one-shot container proof (an engine change invalidates old proof); it is not itself container evidence.

Current status: container runs are BLOCKED on this host (user namespaces denied) and proof covers only tree fd73cbcd; see `limitations.md` "Current status". Admins: never disable the AppArmor restriction globally; grant a narrow profile or uid-mapping instead.

## Run after admin enables userns
Text only. No run has happened under this runbook; the existing tree-`fd73cbcd` proof stays labelled as-is until a new run passes. Nothing here may be read as a result.

1. **Precheck**: `unshare --user --map-root-user true` must exit 0. If it does not, stop. No retries, no workarounds, and never disable the AppArmor/sysctl restriction; ask the administrator for a narrow profile or uid-mapping.
2. **Record**: `git fetch`, note `git rev-parse origin/github/main` and the exact tree SHA under test (clean tree required). Then `python3 submission/fingerprint.py write --inputs <public input dir> <manifest.json>`.
3. **Clean owned state**: inside the userns shell, list with `sh docs/evidence/2026-10-06-offline-channel/podman-wrap.sh images` and `... ps -a` (validate.sh uses this wrapper's private store; plain `podman` would not show it). Remove only the images and containers named `offline-ch*` created by this validation. Leave all other podman state alone.
4. **Run once**: a single `flock /tmp/quoroum-full-validation.lock unshare --user --map-root-user --mount sh docs/evidence/2026-10-06-offline-channel/validate.sh` (the line from the validate.sh header). One expensive validation; do not loop on failure.
5. **Reviewer checks**, independently, on the exact SHA: `build.log` exit 0 with the pinned base digest; `run.log` and `case-ledger.json` show every case REAL, zero FALLBACK, zero RuntimeWarning, network blocked, inputs unchanged; `controls.log` shows all four controls failing as intended; `python3 submission/fingerprint.py verify <manifest.json> --inputs <dir>` exits 0.
6. **Status update**: only after step 5 passes, replace the BLOCKED status in `limitations.md` with the new tree SHA and date. If the engine tree differs from `fd73cbcd`, restate every proof sentence for the new tree and keep `fd73cbcd` labelled as the older proof. A failed or partial run changes nothing but a note of what failed.

