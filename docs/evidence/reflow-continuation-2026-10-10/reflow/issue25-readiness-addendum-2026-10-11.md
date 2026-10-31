# Issue #25 readiness addendum — October 11, 2026

> Publication reconciliation (October 11): this is a historical documentary checkpoint. Root verified current main `02c75aa76d1580f916263dc657adac830716d2dd` contains fix `3d61eb0` and the exact three post-fix blobs recorded in the addendum. Case B applies; main-unknown/Case-A alternatives are superseded. No collector implementation is needed from this artifact. Historical test counts and the worker-only description of #26 are not an exhaustive current implementation inventory. See the [frozen addendum](issue25-readiness-addendum-2026-10-11.md). Optional test coverage remains subject to current ownership/source gates and is not implemented or accepted here. Earlier local refs and missing-object statements describe the author environment at review time. See the [publication queue](../../../plans/reflow-through-2026-10-10/publication-queue.md).

Addendum to frozen, approved `issue25-readiness.md` (sha256 `3499cb5c873097f18e4a2315a75cbc33c9fb894143e2c1c4d59733f7327d0792`), which is unchanged. Docs only. This records **metadata, not a source import**. CLI2 fetched, imported, checked out and executed nothing. `d8656f4a` is not present as an object in CLI2's repo.

## Root metadata-only readback at verified main `d8656f4a` (root-reported)

- `git merge-base --is-ancestor 3d61eb0 origin/main` exits 0. That confirms **Case B** (§5) by commit ancestry, not only by blob.
- `scripts/reflow-cli.ts` blob `90d4326ff0515f86be584a7567e85c0913c44f0f` (post-fix).
- `tests/reflow-cli-output.test.ts` blob `2e99f7e9…`.
- `tests/helpers/fake-worker-spawn.mjs` blob `075aee42…`.

## CLI2 local check (`git rev-parse <rev>:<path>`)

| Path | `3c3c378` / HEAD `d44b6a7` | `3d61eb0` |
| --- | --- | --- |
| `scripts/reflow-cli.ts` | `90d4326ff0515f86be584a7567e85c0913c44f0f` | `90d4326ff0515f86be584a7567e85c0913c44f0f` |
| `tests/reflow-cli-output.test.ts` | `2e99f7e929ee225fa76c747180fd87e44d91ae27` | `cf00edf1b16c0255ccad0a03465742cdb9a321d3` |
| `tests/helpers/fake-worker-spawn.mjs` | `075aee425567ddceabf71cb2b0c0985a97557943` | `af5d1754f6f4ae6c7181266f9d25785a820b48c1` |

Main's reported test blobs equal those at `3c3c378`/`d44b6a7`, the revision analyzed in §1/§3. They differ from `3d61eb0`'s own blobs because follow-ups `493577b`..`90a6a30` changed them. So the §3 gaps apply to current main as documented:

- the stderr two-chunk split is not swept at every byte offset
- no stderr test sends a valid worker error payload at limit-1 or limit

## Resolution

The collector code scope is **empty**. Do not duplicate `3d61eb0`. Remaining #25 work is test-only and optional. It requires an authorized writer with the `d8656f4a` source and stays behind #26, then #27. The root readback is root-reported and not independently verified by CLI2.
