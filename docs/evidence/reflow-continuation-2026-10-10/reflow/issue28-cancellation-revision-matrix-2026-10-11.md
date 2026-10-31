# #28 cancellation and revision-consistency test matrix and claim map — October 11, 2026

Docs only. This is test design. CLI2 read local Git objects with `git show` / `git cat-file`. Nothing was checked out, fetched, imported, executed or tested. No browser verification exists or is claimed.

## 1. Revision and provenance

- **Issue body was unavailable to CLI2.** Root read the live public #28 body at integration: OPEN, unassigned, body SHA256 `504c14c2a9d656e25f75fe87a700659e5b8c2706185a9d41c669f17b5dc488cd`. Its acceptance calls for bounded reuse, responsiveness with a measured browser threshold, real cancellation/deadline, stale-result protection, failure/error/export consistency, retry/revert, baseline parity and keyboard operation. The historical matrix below comes from `docs/roadmap-2026-09-22.md` L37 @ `3c3c378`, labelled **historical roadmap, not issue body**. The live issue remains the acceptance authority; this matrix does not claim to exhaust it.
- **Current main binding by root:** at `349ac158543eedbc82a79a13c0576366ec3973d0`, `src/main.ts` is blob `3d709c0663e4602e4f4b34f17bba47d621ba9788` (16390 B, SHA256 `dfd8a975ee2730aaf687ce4db4023209c6bb4235e929a49be0d9477c4b9219f9`), matching the historical `6920ab65` `main.ts` blob; `src/reflow-targets.ts` is blob `f4ee20bbe385420ee55b30011c05242684cb3b09` (2350 B, SHA256 `d664ea7323e48eb59b652e406ef3fbdfb0599e01171c4da759bd207630f66054`), matching the historical helper. Current `tests/browser-checks.ts` is blob `51fa538eb6882e2d3e430b8e6d76a02123c4e996` (24994 B, SHA256 `dfc2c0e2fe37d5b083fe957208e4c4934a3c8e40d47a11dd9f9b04ab6e548c1b`); it includes the no-valid-layout benchmark check at L83-106. This is source binding only, not execution or browser acceptance.
- Roadmap L37 cites `src/main.ts:53–55,79–98,111–120`. Those numbers refer to the roadmap-era file, `ffe9b93` (2026-09-22T12:57:32-04:00) `src/main.ts`: blob `ae1a511b4d72b01f4fe0282c8051a5df52b3185d`, 14463 B, sha256 `fef71e302ca32fe713e82f2fc0b417bb705577fcfdf3ba98dc57f3b28e96f50e`. That commit is an ancestor of `3c3c378`. The ranges are:
  - L53-55: `redraw` with synchronous `targets.map(reflow)`
  - L79-98: copy edit, custom size, mode toggle and overlay handlers, each calling `redraw()`
  - L111-120: export, and `runAll` up to its yield
  The matrix cites the equivalent `3c3c378` lines.

| Ref / path | Blob | Bytes | SHA256 |
| --- | --- | --- | --- |
| `3c3c378` `src/main.ts` | `6efe0c2227207e65089e1fc7ceea53cc809b8ade` | 15751 | `47cf7a6daa8c76fe7666bae178d62427c3170c545035f070bf1cb4908f9a2ba7` |
| `3c3c378` `src/reflow-targets.ts` | `f4ee20bbe385420ee55b30011c05242684cb3b09` | 2350 | `d664ea7323e48eb59b652e406ef3fbdfb0599e01171c4da759bd207630f66054` |
| `3c3c378` `tests/reflow-targets.test.ts` | `78f572560443bbbccd791fca1c66dbd75b5e83f5` | 5598 | `3c834ac4a0a6483eb6002c182f33914ffe87309ef542526734a4e9e0ad881ef3` |
| `3c3c378` `docs/plans/issue28-per-target-reflow-failures.md` | `dd3a725f0802bd77e4340d4e2766938878b84af3` | 5494 | `2f7e8f133b6b1d5122d72f79ebd6850cf5f6950fe2584af4811dc5056abde524` |
| `3c3c378` `docs/roadmap-2026-09-22.md` | `c43f916f4a1a3749634a3c4547e2f507de34e1e2` | 15764 | `b961071177d7ed6261544231c93944cbeab9678cdaca6ff0dd73d572754cb12f` |
| `3c3c378` `tests/browser-checks.ts` | `ca6f166d781b37adbdf0d44fd4584e971e5bd43b` | 22268 | `be154b63755ab36e5110a696548361a2ae06ad1fac4b7359c6ed8d602415d20b` |
| `3c3c378` `tests/browser/acceptance.spec.ts` | `399580a6aa27855edcc9c0005ace8aae2ad01eef` | 2101 | `7d58ec075bc0cb3a41d63a3a11d2c4693375942e663bd614ca5ae9d1c95fa621` |
| `a1581ea7` `src/main.ts` | `6efe0c22…` (same as `3c3c378`) | 15751 | `47cf7a6d…` |
| `6920ab65` `src/main.ts` | `3d709c0663e4602e4f4b34f17bba47d621ba9788` | 16390 | `dfd8a975ee2730aaf687ce4db4023209c6bb4235e929a49be0d9477c4b9219f9` |
| `6920ab65` `tests/browser-checks.ts` | `0431e19fb222b57af79979ae656e0350cab4ce0c` | 23890 | `e392cd02b0457cb9759394df3ff7eb88ee3e84417b06f087c6d5b44e48ead23e` |

Engine3 historical branches. They are unmerged here, and neither is an ancestor of `3c3c378`; root later found the `6920ab65` `main.ts` blob on current main, and the relevant no-valid-layout browser check is also present there; no branch ancestry is inferred.

- `exchange/agent-3/jo/reflow-engine-28` = `a1581ea7f4f7f22a89a38e3af0320f0666dbeaf7` (2026-10-05T00:06:09Z, "Document combined-branch card typing regression and fix"). Its commit changes only the plan. Its `main.ts`, `reflow-targets.ts` and plan blobs equal `3c3c378`'s, which means the failed-card typing fix is already present at `3c3c378` (`main.ts` L20-22, L65-69).
- `exchange/agent-3/jo/reflow-milestone-viewer-request-lifecycle` = `6920ab65ebda6eb19da080a9c30d642fd32b6199` (2026-10-06T03:10:36Z, "fix(viewer): benchmark records a no-valid-layout case and continues (#28)"). It changes `src/main.ts` and `tests/browser-checks.ts`: `runAll` uses `reflowTargets` per case, and a new browser check covers it. Neither change is in `3c3c378`.

Landed at `3c3c378`, not duplicated below: `reflowTargets` / `reflowMany` / `describeFailure` (`reflow-targets.ts` L13-34), with 10 unit tests (`reflow-targets.test.ts` L16-80); per-target failure cards in `redraw` (`main.ts` L58-81); and `failedTargets` in the export (`main.ts` L125).

## 2. Behavioral test matrix (design only, not implemented)

Layers: **unit** means `tsx --test` against a pure revision/result-cache module. **DOM** means `tests/browser-checks.ts`-style in-page checks. **browser** means the Playwright `verify:browser` run. All `main.ts` line numbers are @ `3c3c378`.

| ID | Precondition | Action | Expected observable | Negative control | Layer | Motivation |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Source at rev N, results shown | Copy edit to rev N+1 while the N run is in flight | Only N+1 results render; N's late completion is dropped | The same edit with no run in flight renders N+1 normally | unit + DOM | L90-94 mutates `source` in place and then calls `redraw()` |
| R2 | Results at rev N | Toggle overlay (`#show-issues`) | No `reflow` call (call counter unchanged); same result objects re-rendered | A copy edit does increment the counter | unit + DOM | L109 overlay calls `redraw()`, which recomputes at L60 |
| R3 | Results at rev N | Toggle mode selected/baseline | No recompute; the view switches from `result.selected` to `result.baseline` | Switching the fixture recomputes | unit + DOM | L103-108 mode handler calls `redraw()` |
| R4 | Cached (rev N, target T) | Re-request the same (N, T) | Cache hit, identical object | The same target at rev N+1 misses | unit | Roadmap L37 "bounded result reuse" |
| R5 | Cache at its bound | Insert one more key | Oldest is evicted and size stays at the bound | Bound−1 inserts evict nothing | unit | Roadmap L37 "bounded" |
| R6 | Custom target added at rev N | Change the custom size | Key includes target dimensions: new size misses, built-ins hit | Same custom size re-applied hits | unit | L95-102 replaces `custom` and redraws all |
| R7 | Multi-target run at rev N in progress | Cancel (via a superseding edit or an explicit cancel) after target 1 | No partial set is shown as complete. Completed targets are either discarded or marked partial/cancelled | An uncancelled run finishes with all targets | unit + DOM | Roadmap L37 "cancellable work"; L60 runs everything synchronously |
| R8 | Benchmark running | Cancel mid-run | Status names the cancelled count; button is re-enabled; no "N / N completed" | An uncancelled run reaches its completed status | DOM | L128-153 `runAll` has no cancel path |
| R9 | Results at rev N shown | Export JSON | Export carries the rev N id, and `source` equals the source that produced its `variants` | A tampered pair (source N+1, variants N) is refused | unit + DOM | L122-126 exports live `source` with module `results` |
| R10 | Edit to rev N+1, recompute pending or failed | Export | Export is refused or stated stale; it is never N+1 source with N variants | Export after N+1 completes succeeds | unit + DOM | Roadmap L37 "revision-safe export" |
| R11 | Rev N shown | SVG export of one card | Filename and SVG come from the same revision as the card | A card re-rendered at N+1 exports N+1 | DOM | L110-115 uses current `source.id` with the card's DOM SVG |
| R12 | Rev N good; edit N+1 makes a **non-per-target** throw (source fault / `TypeError`, which `reflowTargets` rethrows at L14/L20) | Copy edit | Shown source and results stay a consistent pair, either N/N with an error, or N+1 with an explicit failure state | The per-target `no-valid-candidate` path is already landed and is not retested here | unit + DOM | Roadmap L37 "old results on a later-target exception"; L60-61 assigns only after success, but L92 has already mutated `source` |
| R13 | R12 failure state | Retry | Recompute at N+1 is attempted once, and the result or error is shown | Retry with nothing pending is a no-op | unit + DOM | Roadmap L37 "explicit retry" |
| R14 | R12 failure state | Revert | Source returns to rev N byte-equal, with N results; no recompute if cached | Revert with no prior good rev is disabled | unit + DOM | Roadmap L37 "revert" |
| R15 | Rev N | Five rapid copy edits N+1..N+5 | Final view and export equal N+5; intermediate results never render after N+5 | A single edit renders once | DOM | L90-94 has no supersede or debounce |
| R16 | Fixture A shown | Switch to fixture B mid-run | B only; A's late results dropped | Switching with no run in flight shows B | DOM | L86-89 replaces `source` and redraws |
| R17 | Per-target failure at rev N (landed card) | Toggle mode or overlay | Failure card persists with no recompute; `failures` reused | An edit clears or recomputes it | unit + DOM | L61 and L65-69; complements the landed cards and does not retest them |
| R18 | Benchmark running | Copy edit in the workbench | Benchmark is unaffected (it uses original fixtures, L130-131), and workbench revisions are independent | — (status text already asserts independence) | DOM | L130-131 iterates `FIXTURES`, not `source` |

Coverage of plan L37 open items:

- revision-safe export: R9-R11
- result reuse: R2-R6, R17
- cancellable work: R7, R8, R15, R16
- retry/revert: R13, R14
- **script-level failure reporting: deferred.** Plan L29-33 and L42 deliberately leave the scripts unwrapped. `6920ab65` covers only the in-viewer benchmark.

R12's negative control is the landed per-target path. No row repeats `reflow-targets.test.ts` L16-80.

## 3. File-claim and prerequisite map

| File (future implementation) | Rows | Existing claim / overlap | Prerequisite | Event trigger |
| --- | --- | --- | --- | --- |
| `src/main.ts` (`redraw` L58-81, handlers L86-109, export L110-126, `runAll`/benchmark L128-153) | all | Engine3 branch `6920ab65` rewrites `runAll`/benchmark (L128-153); reconcile before R8/R18. `a1581ea7` touches only the plan here. | root-bound `349ac158` blob and live #28 body now recorded; production claim coordination still required | New current-main or claim change; `main.ts` blob is already present |
| new pure module, e.g. `src/revision-cache.ts`, plus `tests/revision-cache.test.ts` | R1-R7, R9-R10, R12-R14, R17 | None found locally | Same as above; red tests first | Owner assigned by root |
| `src/reflow-targets.ts` | R12 (read-only use) | Landed per-target helper; Engine3 engine/worker ownership. Do not change its catch semantics (plan L19-22). | root-bound `349ac158` blob | Only if a new head shows drift |
| `tests/browser-checks.ts` / `tests/browser/acceptance.spec.ts` | DOM/browser rows | `6920ab65` adds a #28 benchmark check. The CLI2 viewer mapping is a read-only reference. | A browser runner available to an authorized writer | A browser verification slot is granted |

Ordering: **#26, then #27 first**. The plan's upstream dependency is at plan L5. #28 implementation still needs explicit current file-claim coordination, fresh red tests and actual browser verification; root's public-source readback alone did not deliver an authorized remote code handoff.

## 4. Boundaries

- Test design only. No production or test code was written, and nothing was executed.
- No closure claim for #28. No claim that browser verification exists: the plan L41 and L46 failed-card verification is still "not browser-verified".
- Current-main and live-issue facts above were added by root at integration; historical line references remain @ `3c3c378` or the named refs. No implementation or acceptance claim follows.
- Rows R1-R18 add no duplicate per-target failure tests.
