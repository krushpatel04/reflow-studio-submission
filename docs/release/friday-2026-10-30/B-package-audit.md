# B-1 — Historical Python package inventory

**Historical audit:** the 29-file inventory below applies only to `6d82709`. Later candidates include additional engine files and require their own manifest and qualification. Use the [current submission review packet](../2026-10-27-submission-review.md) for the reviewed candidate and exact evidence bindings; preserve this audit as the record of what was inspected at its stated source.

**Audited source:** repository `6d82709def61ae533fbc4f3ff59c2aa0a9c36bb3` on `jo/friday-packaging-20261027`; official `jhaaj08/chameleon` HEAD and pinned checkout `a44a06046b0413f0785e7203955c3822e0acbc32`, rechecked October 27. No package or production changes. [Plan](../../plans/friday-2026-10-30/B-plan.md).

## Assembly and provenance

`submission/assemble_context.sh OUT UPSTREAM` checks exact upstream HEAD, clean status, and nonempty `renderer/converter`, `brand_kit/fonts`, `brand_kit/assets`, schema, and orchestrator. It rejects dangerous/nonowned output directories, stages beside OUT, then promotes. It does not include the upstream `engine/resize.py` or upstream Dockerfile.

| Context item | Source | Purpose / check |
| --- | --- | --- |
| `engine/main.py` | Pinned upstream | Reads `input/*.json`; calls overlaid resize; writes `<stem>_output.json` and `<stem>_output.png`. Self-check warnings do **not** fail the process. |
| `engine/__init__.py`, `engine/resize.py`, `engine/text_fit.py` | Audited repository `engine/*.py` | Python implementation overlay. Glob captures any future Python engine modules; inventory must be regenerated after changes. |
| `renderer/` | Pinned upstream, 9 files | Real converter; upstream orchestrator can fall back to box renderer on import failure. |
| `brand_kit/` | Pinned upstream, README + 3 image assets + 7 font files | Fonts and sample image assets; sample Level 3 intentionally references an absent asset (below). |
| `chameleon_design_schema_v0.9.json` | Pinned upstream | Design format. |
| `Dockerfile.python-submission` | Audited repository | `linux/amd64` Python 3.11 base digest `sha256:e529028263dbe6910a2d96f7d2b8f5266385e917fd45d286ef166977c094a51e`; installs Git/graphics/font libraries; copies only Python context; `/app/input` and `/app/output` runtime mounts. Debian apt packages are not version-pinned. |
| `requirements-python-submission.txt`, `constraints-python-submission.txt` | Audited repository | Pillow 12.3.0, skia-python 144.0.post2, cr-renderer Git commit `a17e1fb9a732959dd6c21ae168d5ee09d74bd64f`, pinned transitives. No pip hash enforcement; Git commit pin is not a wheel hash. |
| `.assembled-by-assemble_context` | Deterministic script output | Assembly ownership marker; not a resource/proof of qualification. |

The assembled context has **29 files, 1,242,671 file bytes**: 22 upstream, 6 repository, 1 marker. Every byte matches its traced source; no unexpected/missing context entry. Exact per-file SHA-256 and source are in `reports/friday-2026-10-30/B/manifest.json`; package/source/input fingerprint in `reports/friday-2026-10-30/B/fingerprint.json`. The latter records `git_dirty: true` because this lane's plan was untracked during the audit; inspected engine/package files were unchanged. `fingerprint.py verify` returned `OK` against the three untouched public inputs. Neither generated JSON report is committed by default (`reports/` ignored); hashes appear in the handoff.

**Excluded:** root `Dockerfile` (older TypeScript path), upstream `requirements.txt`, upstream `engine/resize.py`, `input/`, `output/`, tests, scripts, TypeScript workbench, corpus, docs/evidence, Git metadata, caches, credentials and private/blind material. The official starter input directory is mounted at run time, not baked into the image. Build **only** with `-f "$CONTEXT/Dockerfile.python-submission"`; `docker build .` in repository root selects the wrong image.

## Resource and qualification caveats

The unchanged public Level 3 JSON references `solstice_holiday_badge_2025.png`, absent from the official `brand_kit/assets`. Its `_adversarial_note` explicitly says this is intentional. The official converter's `renderer/converter/assets.py` draws a **missing-asset placeholder**; do not invent the file, silently remove the element, or count that specific placeholder as an import fallback. Check other absent assets separately. Every case still needs a real converter call; PNG existence alone is insufficient.

Static assembly **PASS**: exact pin, clean starter, 29 matched source files, excluded paths absent, three public inputs fingerprinted. Container build/offline render **NOT RUN**: Docker daemon socket absent; Podman VM socket refused; Agent A's heavy-job slot not granted. Python tests and independent visual acceptance **NOT RUN** in this documentation lane. No claim this SHA inherits OF-02 acceptance (`75f0ac12`) or qualifies later code. The official schema/rules remain at the pinned starter; exact deadline/viewer requirements are separate unresolved source conflicts.
