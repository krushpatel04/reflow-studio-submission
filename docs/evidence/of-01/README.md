# OF-01 evidence: Python image on hosted Docker (#99)

Status: **operational evidence only.** The Python image built from `Dockerfile.python-submission` was built and exercised on a GitHub-hosted Ubuntu runner for one exact tree (below). This is not a quality, accuracy or submission-readiness claim; PNG quality was not reviewed.

## SHAs: do not conflate

| Role | SHA |
|---|---|
| Source / integrated head under test | `e25ea1d5caa1c3cd3f5cb05f70b29e7b125b9fee` |
| Tested merge (what the hosted jobs checked out: parents main `c75a0eff2be5ab565995b865ca6dbcbd40ce61b6` + `e25ea1d`) | `710138b99aa169cddf9be109ef3e6a32ecc7eccc` (tree `04c3cfddf089c4b075cf6e02484efc70a4a772c0`) |
| Docs head (the commit that adds this file) | the commit containing this text. **It has no fresh hosted qualification**; it only records the result above. |

The image, fingerprint `git_head` and artifact all describe the tested merge `710138b`. A docs-only commit does not re-qualify anything.

## Historical: hosted image qualification of tested merge `710138b` (October 8, 2026)

Superseded for the current engine by the final run below. Kept as the record of the first qualified tree.

| Field | Value |
|---|---|
| Qualification run | [37827783243](https://github.com/kj-squared-labs/reflow-studio/actions/runs/37827783243); full CI [37827783393](https://github.com/kj-squared-labs/reflow-studio/actions/runs/37827783393); both SUCCESS, verified by the Mac publisher |
| Artifact | 11572467097 |
| Artifact zip sha256 | `d43cfbff47764c54de19114ca1ee9c0d221362549f95006dd216a9391cda9f17` (as reported by the Coordinator; the zip itself is not in this repo) |
| `python-tests.log` sha256 | `16c66d8d9eee9fc9a18b2199a90a767bc3d846199a0533fa85b66d3c909ae44e` (as reported by the Coordinator) |
| Runtime / machine | `docker`, x86_64 hosted runner |
| `qualification.json` | `pass` true, `failures` `[]`, `git_sha` `710138b99aa169cddf9be109ef3e6a32ecc7eccc`, `build_exit` 0, `fingerprint_verify_exit` 0 |
| Image | `sha256:a8879443a40f822af74e6a6465e5cf20972a60e96e850edcdc8813dfcdfd2132`, amd64 / linux (from a checked `image inspect`) |
| Base image digest (fingerprint) | `sha256:e529028263dbe6910a2d96f7d2b8f5266385e917fd45d286ef166977c094a51e` |
| Upstream pin (fingerprint) | `a44a06046b0413f0785e7203955c3822e0acbc32` |
| Fingerprint | `git_head` `710138b99aa169cddf9be109ef3e6a32ecc7eccc`, `git_dirty` false; `verify` exit 0 |

Runtime, image, fingerprint and smoke values were read from the extracted artifact (`qualification.json`, `fingerprint.json`, `image-inspect.stdout`, `smoke-main/case-ledger.json`). Run date/status, commit parents and tree equality were verified separately by the Mac publisher through GitHub and Git. The publisher and independent Reviewer verified the archive and Python log hashes; the Reviewer also inspected the extracted evidence and recomputed output hashes.

### Main smoke (3 public sample inputs)
- `cases_attempted` 3; probe events `REAL`, `REAL`, `REAL`; **3 REAL / 0 FALLBACK**; no RuntimeWarning failure; entrypoint exit 0.
- Network: probe `net` `blocked`; `HostConfig.NetworkMode` read from `docker inspect` is `none` for both the entrypoint run and the probe run (`network_inspect` `["none", "none"]`).
- Inputs read-only and unchanged: `inputs_sha256_before` equals `inputs_sha256_after`:
  - `chameleon_sample_level1_warmup.json` `79f889a1b0ec616b3f75de7b0d7fe4b92dcfb027e99b512a019a7aa941000ea6`
  - `chameleon_sample_level2_core.json` `c37407fa20aefb8e1c53a3476b99973000657c3c1d93fc9637e462703955a04b`
  - `chameleon_sample_level3_advanced.json` `fd99e3972c9c11c506d98897f3cb9520a5caea10b358d30e6853b9efca58cf33`
- Write attempt to the `:ro` input refused: exit 1, `OSError: [Errno 30] Read-only file system: '/app/input/.write-attempt'`.
- Six output hashes recorded (`outputs_sha256`), identical between the entrypoint and probe runs:
  - `chameleon_sample_level1_warmup_output.json` `97193ea3f25bf3bd01a6d745f98ccd7cb60e0f19f21854aa8b04c651f93cbcf6`
  - `chameleon_sample_level1_warmup_output.png` `494caf37aae64d8ca8fcccb05402bab86079cec0eff7abd251294db8117d8c2d`
  - `chameleon_sample_level2_core_output.json` `416cac59d99f607c766dba853b6d03250e0c6655977a4ffa6f902262b0bddc53`
  - `chameleon_sample_level2_core_output.png` `b2c880e29b2a3736f5bbdc70829188d3d4515350c8835b9903dbb713fe098d3a`
  - `chameleon_sample_level3_advanced_output.json` `086e504127041b0812b76209952c0f7322c38dd1591acce8da02f3e58cb9085c`
  - `chameleon_sample_level3_advanced_output.png` `d070c9560d5f9e1e7cd0132238ebd4639ab0048ee95ffc870f6ccf8ee0f8df2d`

### Four controls (each failed the smoke for its stated reason; recorded in `qualification.json`)
| Control | Reason recorded |
|---|---|
| renderer-absent | `probe stderr: ModuleNotFoundError: No module named 'renderer.converter'` |
| mutated-input | `input bytes changed` |
| zero-input | `zero input cases` |
| write-attempt | `write to :ro input was not refused with Read-only file system` (the `:rw` disposable copy was writable, so the smoke failed as required) |

### Tests in the same run
Full CI ran 337 tests, all OK, zero skips, including `RealStarterAssemble` (the real `assemble_context.sh` against the pinned starter). The Mac publisher and independent Reviewer both inspected the downloaded CI log for this count.

## Final hosted image qualification of `beeb41d878962e58e138866186037200591ceef3`

Operational evidence only. Values below were read by me from the extracted artifact at `of01-artifacts-final/extracted/` on the Nala host, except where marked "reported".

| Field | Value |
|---|---|
| Workflow runs | 37831486997 and 37831486932 (ids as relayed by the Coordinator; which is the qualification run and which is full CI, and their GitHub status, were not verified by me) |
| Artifact | 11573213051 |
| Artifact zip sha256 | `5713382d521c9c0f0810fd9e1f790fbf080f13ee3392a3cb765ae5c822265be9` (I recomputed it from `image-artifact.zip`; matches `SHA256SUMS`) |
| `python-tests.log` sha256 | `b77e78cf4f1f8c33d5337cab79758c45dd4a85483f7405e0e0ad9414d6851682` (recomputed; matches `SHA256SUMS`) |
| Python tests | `Ran 346 tests ... OK` (last lines of the log); the log shows no skips line, I did not count per-test skips |
| `qualification.json` | runtime `docker`, machine `x86_64`, `pass` true, `failures` `[]`, `git_sha` `beeb41d878962e58e138866186037200591ceef3`, `build_exit` 0, `fingerprint_verify_exit` 0 |
| Image | `sha256:49e06d5ec127c91f6bb0a3df27fffc40983dfc8deae7c1e44a26f62d951569cb`, amd64 / linux (`image-inspect.stdout` and `qualification.json` agree) |
| Fingerprint | `git_head` `beeb41d878962e58e138866186037200591ceef3`, `git_dirty` false, `verify` output `OK` |
| Base image digest (fingerprint) | `sha256:e529028263dbe6910a2d96f7d2b8f5266385e917fd45d286ef166977c094a51e` |
| Upstream pin (fingerprint) | `a44a06046b0413f0785e7203955c3822e0acbc32` |

### Provenance of `beeb41d` and local baseline (labelled by source)
- **API-observed, publisher-verified (relayed; I did not fetch it):** GitHub API commit receipt `https://api.github.com/repos/kj-squared-labs/reflow-studio/git/commits/beeb41d878962e58e138866186037200591ceef3`: parents `87642e8389f5c3d71d1bfc8557446cca0a2b768a` and `93c1bc202322149b4d37a25acf37671aa2d2e5ef`, tree `7f26376bcc78b7281264e23188efef2d3698e4a5`. Qualification run `37831486997` and full CI `37831486932` SUCCESS (as relayed from publisher receipts; I did not query GitHub).
- **Checked by me in this repository (local baseline `69464b9`):** `git rev-parse 69464b9^{tree}` gives `7f26376bcc78b7281264e23188efef2d3698e4a5`, and `git log -1 --format=%P 69464b9` gives parents `87642e8389f5c3d71d1bfc8557446cca0a2b768a` and `93c1bc202322149b4d37a25acf37671aa2d2e5ef`.
- **Comparison:** The API-observed tree and parents for `beeb41d` are identical to the locally checked tree and parents of `69464b9`. This is a comparison of values, not a claim that the two commits are the same object. `beeb41d` is not a native git object in this copy; `69464b9` is.
- **Level 2 output change (relayed):** attributed by the publisher receipts to accepted RF-02, matching the committed candidate PNG `5d36066` and JSON `b31edc4e`. I only compared the hashes in the artifact with those prefixes; I did not rerun anything.

### Artifact location (read by me)
`/home/nala/.local/share/reflow-run-20261013-codex6/of01-artifacts-final/` on the Nala host. Recomputed sha256: `image-artifact.zip` `5713382d521c9c0f0810fd9e1f790fbf080f13ee3392a3cb765ae5c822265be9`; `python-tests.log` `b77e78cf4f1f8c33d5337cab79758c45dd4a85483f7405e0e0ad9414d6851682`; `SHA256SUMS` `2ed890c4a6308a12054bdc50063cab72483b1a26d09b3fbfcb9d7dc26ca2ec8a`; `extracted.SHA256SUMS` `9599bfed8b2e9a465323b402a3a1671a2f0100b2bece759ad182bdbd02b852ac`. Contents are under `extracted/`.

### Current engine is not covered by this record
This run qualifies tree `7f26376` only. Accepted main `62937e12caa3280097ba7bd1014a73ccf257b8d6` (tree `52b51adcd835400aeb54bb18c32590d1bf843bf6`, checked by me) is a different tree and needs its own proof. The Coordinator relays that it has its own full CI and image run; those results are not recorded or claimed here.

### Smoke (3 public sample inputs)
- `cases_attempted` 3; probe events `REAL`, `REAL`, `REAL` (**3 REAL / 0 FALLBACK**); probe `rc` 0; entrypoint exit 0; smoke `failures` `[]`.
- Network: probe `net` `blocked`; `network_inspect` `["none", "none"]`.
- Inputs unchanged (`inputs_sha256_before` equals `inputs_sha256_after`): same three input hashes as the historical run.
- Write attempt to the `:ro` input refused: exit 1, `OSError: [Errno 30] Read-only file system: '/app/input/.write-attempt'`.
- Output hashes (`outputs_sha256`). Level 1 and level 3 are byte-identical to the historical run; **level 2 JSON and PNG differ** (attribution under "Provenance of `beeb41d`" below):
  - `chameleon_sample_level1_warmup_output.json` `97193ea3f25bf3bd01a6d745f98ccd7cb60e0f19f21854aa8b04c651f93cbcf6`
  - `chameleon_sample_level1_warmup_output.png` `494caf37aae64d8ca8fcccb05402bab86079cec0eff7abd251294db8117d8c2d`
  - `chameleon_sample_level2_core_output.json` `b31edc4e04c91f01f1395b6693d3f9f9f5a89bd4e45713abd7831f3d8e3f34cd`
  - `chameleon_sample_level2_core_output.png` `5d36066283eabea41af914e2199992fe0f8cfd5c982ead622adad5d439b2e218`
  - `chameleon_sample_level3_advanced_output.json` `086e504127041b0812b76209952c0f7322c38dd1591acce8da02f3e58cb9085c`
  - `chameleon_sample_level3_advanced_output.png` `d070c9560d5f9e1e7cd0132238ebd4639ab0048ee95ffc870f6ccf8ee0f8df2d`

### Four controls (each failed the smoke for its stated reason; `qualification.json`)
| Control | `ok` | Reason recorded |
|---|---|---|
| renderer-absent | true | `probe stderr: ModuleNotFoundError: No module named 'renderer.converter'` |
| mutated-input | true | `input bytes changed` |
| zero-input | true | `zero input cases` |
| write-attempt | true | `write to :ro input was not refused with Read-only file system` |

### Limits of the final run
- Applies to tree `beeb41d` only; a later engine, renderer or packaging SHA needs its own hosted run.
- PNG quality was not reviewed; no scoring or submission-readiness claim.
- This docs commit has no hosted qualification of its own; it only records the run above.
- Two runs inside one smoke produced identical hashes (entrypoint vs probe in the same image). That is not a repeat-hash proof across separate image runs.

## Earlier capability run (runner/publication only; not an image result)
| Field | Value |
|---|---|
| Workflow run | 37820563720 (PR 107) |
| Artifact | 11569456005, `python-submission-capability-37820563720-1` |
| Archive sha256 | `32521b4d40786c4c0d2a757b6a5727874880550962c41ea05f2c930cdd345f6f` |
| PR merge checkout SHA | `24df7fd2f8a2ce8041b5db28068777a606e05904` |
| Reviewed head | `b8fb8325e69abba8299dac19eca3bb629d3158a5` |
| `capability.json` | runtime `docker`, `runtime_ok` true, Linux x86_64, Python 3.11.17, `version` and `info` exit 0, no timeout |

That run proved only that a hosted runner can dispatch the pull_request workflow, run Docker and publish an artifact. It built no image.

## Limits
- Operational evidence only. It says the packaged pipeline built and ran offline on the three public samples; it says nothing about output quality (PNGs were not reviewed), scoring or submission readiness.
- Exact tree: the result applies to merge `710138b` (head `e25ea1d`). Any later engine, renderer or packaging SHA needs its own hosted run; packet-SHA qualification does not carry over.
- The docs head has no hosted qualification of its own.
- Artifact retention is 14 days; after that only the values copied into this file remain. Raw logs and ledgers are not duplicated in Git.
- The Nala host still cannot run containers (unprivileged user namespaces denied; see `docs/evidence/2026-10-06-offline-channel/limitations.md`). The only container proof is hosted.

## Integration pending (superseded)

When first written, the record said fresh hosted CI and image qualification were required before OF-01 acceptance because accepted RF-02 main `87642e8389f5c3d71d1bfc8557446cca0a2b768a` changed the engine. The final run above is that fresh qualification, for `beeb41d` only.
