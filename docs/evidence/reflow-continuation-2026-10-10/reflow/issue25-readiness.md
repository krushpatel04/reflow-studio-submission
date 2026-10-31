# Issue #25 readiness — October 11, 2026

> Publication reconciliation (October 11): this is a historical documentary checkpoint. Root verified current main `02c75aa76d1580f916263dc657adac830716d2dd` contains fix `3d61eb0` and the exact three post-fix blobs recorded in the addendum. Case B applies; main-unknown/Case-A alternatives are superseded. No collector implementation is needed from this artifact. Historical test counts and the worker-only description of #26 are not an exhaustive current implementation inventory. See the [frozen addendum](issue25-readiness-addendum-2026-10-11.md). Optional test coverage remains subject to current ownership/source gates and is not implemented or accepted here. Earlier local refs and missing-object statements describe the author environment at review time. See the [publication queue](../../../plans/reflow-through-2026-10-10/publication-queue.md).

Docs only. CLI2 read local Git objects with `git show` and `git cat-file`. Nothing was checked out, fetched, imported, executed, committed or pushed. The reviewed issue body cites main `4adaba4`. This document does **not** claim that `4adaba4`, or any other local ref, is current GitHub main.

## 1. Source revision read

Primary revision: `4adaba4c51f0b5389a2d0b5efbe8aab6d6a4db38` (2026-09-22T13:43:52-04:00, "Record hosted container smoke controls"). Local HEAD is `d44b6a722a84e73454ddf6911b5a3995b643fb45`. `4adaba4` is an ancestor of local `main`/`origin/main` (`f08a795`, 30 commits later). These three files are identical at `f08a795`.

| Path @ `4adaba4` | Blob | SHA256 | Bytes |
| --- | --- | --- | --- |
| `scripts/reflow-cli.ts` | `c4259e5f61f0a40623f29c2b615133caf46823dc` | `66fe62c4c830e2b7bf1e3b88f9d41c93807bfc0420a4110c9c9be77a40b1102f` | 5024 (99 lines) |
| `scripts/reflow-worker.ts` | `08ac910e0bdfee4e92b29430cb4999757deff8b7` | `117776cc05107b0cee34ada67b8af11c281d34b6138595db34f10232334d3700` | 1778 |
| `tests/offline-cli.test.ts` | `e70209c6b5f0db2c6019761c05d72f44197201d5` | `01147e8c7fc173da27b76dc61174cc0315c5fd9902870dfe7004cc0eb5b6d40e` | 7709 |

At `4adaba4` the only test that spawns the CLI is `tests/offline-cli.test.ts`. Other CLI paths there are docs and examples only: `docs/plans/cli-regular-inputs.md`, `docs/plans/offline-cli-container.md`, `docs/evidence/2026-09-22-{cli-regular-inputs,offline-cli}/*` and `examples/cli-design.json`.

Comparison ref, also read locally: `exchange/github/main` = `3c3c378137071bcfc98849930226815f32cb7a36` (2026-10-07T21:46:09-04:00, merge of PR #94). It is a local mirror ref last updated 2026-10-08. It is not verified as current GitHub main. Its parents are `7a30b88` and `d44b6a7`, and both it and HEAD contain `4adaba4`.

| Path @ `3c3c378` (same blob at HEAD `d44b6a7`) | Blob | SHA256 | Bytes |
| --- | --- | --- | --- |
| `scripts/reflow-cli.ts` | `90d4326ff0515f86be584a7567e85c0913c44f0f` | `d3d5a8eff3c673d894400a5b7c58ef106aad55aeb154d0968a75cb3ed705bb6e` | 5394 |
| `tests/reflow-cli-output.test.ts` | `2e99f7e929ee225fa76c747180fd87e44d91ae27` | `6915ed98e7a14cf08dddb9c5358cb5aa46b61e25318a0a4f7007f991b8dea851` | 11928 (217 lines, 20 `test(` sites) |
| `tests/helpers/fake-worker-spawn.mjs` | `075aee425567ddceabf71cb2b0c0985a97557943` | `e9e921f6f88ba39c8f9e673613135c65ae9cd967433697fb441b5bf0e4cd007e` | 1781 |
| `docs/plans/cli-unicode-output.md` | `63cb0f791dca0f3bdc5ea259300b93c0529213fe` | `cbd67523ee2e5a14af871b9e93b907c9a16d3c88a137ecd822c9a9b28c0d02b9` | 6475 |
| `tests/offline-cli.test.ts` | `e70209c6…` (unchanged from `4adaba4`) | `01147e8c…` | 7709 |

## 2. Collector behavior at `4adaba4`

`scripts/reflow-cli.ts`:

- L6 `MAX_OUTPUT_BYTES = 20 * 1024 * 1024` applies to each stream separately.
- L55 sets `output`/`diagnostic` to JS strings.
- L58-63 `collect`:
  - L59 calls `chunk.toString()` on each Buffer independently. A UTF-8 sequence split across chunks decodes as U+FFFD on each side and is never repaired. This is the defect.
  - L60 overflow test `Buffer.byteLength(output) > MAX` (or `diagnostic`). It counts bytes, but over the **re-encoded decoded string**, not raw received bytes. Each U+FFFD re-encodes as 3 bytes (`ef bf bd`). A split 2-byte `é` (2 raw) therefore counts as 6, a split 3-byte CJK character (3 raw) as 6 or 9, and a split 4-byte emoji (4 raw) as 6, 9 or 12. These counts assume Node's maximal-subpart replacement: one U+FFFD for the valid prefix plus one per orphan continuation byte. That is derived from the decoder spec, not executed here. Valid output at or below the limit can be falsely rejected. Each call also re-encodes the whole accumulated string, which is O(n²) over chunks.
  - L61 overflow sets `overflow = true` and sends `SIGKILL`. Later chunks are still appended.
- L64-65 wire stdout/stderr `'data'` to `collect`. No `setEncoding`, no flush at close.
- Input limits are separate and unaffected: L45 `statSync().size` (raw bytes) and L47 `Buffer.byteLength(input)`.

Exit protocol, `'close'` handler L73-99. `fail()` L11-14 writes one `{"error":{category,code,path,message}}` line to stderr. Order of checks:

1. L76 `timedOut` gives `deadline-exceeded`, exit 124.
2. L77 `overflow` gives `output-limit`, exit 1.
3. L78-86 exit code 0: `JSON.parse(output)`, set `payload.timing.processWallMs`, write stdout and exit 0. Any throw gives `invalid-worker-output`, exit 1.
4. L88-97 nonzero exit with `diagnostic.trim()` that parses and has `error.code` and `error.category`: re-emit the payload with exit `code || 1`.
5. L98 otherwise `worker-failed`, exit 1.
6. L68-72 spawn `'error'` gives `spawn-failed`, exit 1.

Consequence: corruption inside a JSON string stays JSON-valid. IDs, text, error paths and messages change silently, but the exit status is still 0 (or the forwarded worker status).

Fixed form, blob `90d4326…`:

- L3 imports `StringDecoder`.
- L60 has one `StringDecoder('utf8')` per stream.
- L61 keeps raw counters `received.{out,err}`.
- L62-68 `collect`:
  - returns early once `overflow` is set
  - adds `chunk.length`
  - compares `> MAX` on raw bytes, then kills and returns
  - otherwise appends `decoders[kind].write(chunk)`
- L81 at close calls `decoders.*.end()` to flush, only when not overflowed.

The rest of the exit protocol is unchanged.

## 3. Unicode chunk-boundary test matrix

Offsets are byte positions inside the sample where chunk 1 ends. "Mid-code-point" offsets are the corrupting ones. Grapheme-only offsets (between code points of one cluster) must also round-trip byte-exactly. Every row applies to **stdout** (successful result JSON: `sourceId`, element `id`, `text`) and **stderr** (worker protocol error forwarded on nonzero exit: `path`, `message`). The harness must also sweep every offset of the full serialized payload, plus byte-at-a-time delivery.

| Class | Sample bytes | Mid-code-point offsets | Grapheme-only offsets | Coverage at `3c3c378` |
| --- | --- | --- | --- | --- |
| Latin 2B | `é` = `c3 a9` | 1 | — | `'Café Zoë'`: stdout every two-chunk split + 1-byte; stderr 1-byte only |
| Combining | `e`+U+0301 = `65 cc 81` | 2 | 1 | `'é combining'` (decomposed): same as above |
| CJK 3B | `日` = `e6 97 a5` | 1, 2 | — | `'日本語テキスト'`: same as above |
| Emoji 4B + modifier + ZWJ | `👩🏽‍💻` = `f0 9f 91 a9` `f0 9f 8f bd` `e2 80 8d` `f0 9f 92 bb` (15 B) | 1-3, 5-7, 9-10, 12-14 | 4, 8, 11 | `'👩🏽‍💻 ZWJ'`: same as above |
| ASCII control | `ASCII only` | — | — | positive control, same as above |
| Interleaved | stdout `日本👩🏽‍💻é` and stderr `$.é日`/`👩🏽‍💻 é日`, alternating 1-byte | all | all | one test, exit 0 and exit 2 |

Gap against acceptance (1): the stderr two-chunk split at every offset is not swept. Only byte-at-a-time stderr exists, and byte-at-a-time is a superset for decoder correctness. Cheap to add if Reviewer5 wants a literal reading.

Byte-limit × mid-code-point split (`LIMIT = 20 MiB`, raw bytes per stream):

| Case | Stream | Construction | Expected |
| --- | --- | --- | --- |
| limit-1 / limit | stdout | `sized(n)`: valid JSON of exactly n bytes padded with `é`, delivered in 65537-byte chunks (odd, so it splits `é`) | exit 0, `pad` ends with `é` |
| limit+1 | stdout | same, n = LIMIT+1 | exit 1 `output-limit` |
| limit, truncated | stdout | `sized(LIMIT-1)` + lone lead `e6` | `invalid-worker-output`, **not** `output-limit` (the decoder flush must not be counted) |
| limit+1, truncated | stdout | `sized(LIMIT)` + `e6` | `output-limit` |
| limit, truncated | stderr | `a`×(LIMIT-1) + `e6`, code 3 | `worker-failed` |
| limit+1 | stderr | same + `80` | `output-limit` |
| per-stream | both | stderr `é`×LIMIT/4 (LIMIT/2 B) + stdout LIMIT/2 | exit 0; limits are not summed |
| stderr limit+1 | stderr | `a`×(LIMIT+1) in 1 MiB chunks, code 2 | `output-limit` |
| both over + hang | both | each LIMIT+1, worker never closes | single `output-limit` line; overflow wins over deadline |

All rows above exist at `3c3c378`. Not covered: a stderr limit-1/limit **valid** structured payload with split multibyte text (forwarded as a worker error). That is a cheap optional addition.

Malformed and truncated worker output (structured failure, empty stdout, one stderr line):

- stdout, exit 0:
  - empty, `{"timing":{}` (truncated), `not json` and `7b e6 97` (truncated mid-CJK) give `invalid-worker-output`
  - non-result JSON (`null`, `[]`, `5`, `"x"`, `{}`, `{"timing":5}`, `{"timing":null}`, trailing data, two documents) gives `invalid-worker-output`
- genuinely invalid byte `ff` inside a string: exit 0 with U+FFFD (Node replacement semantics retained); `c3` before `"` inside a stderr protocol message is forwarded as `a�`
- nonzero exit with unusable diagnostics (10 shapes), or with valid stdout, gives `worker-failed`. A signal kill (null code) gives `worker-failed`; a spawn error gives `spawn-failed`.
- Timeout: hung worker after partial stdout gives exit 124 `deadline-exceeded`.
- Ordinary valid output: real worker (no fake spawn) with Unicode ids and text round-trips unchanged. The eight `offline-cli.test.ts` tests remain the native success, validation, asset, deadline, FIFO and symlink controls.

## 4. Existing coverage and overlap

At `4adaba4`, `tests/offline-cli.test.ts` (8 tests) drives the real CLI with ASCII-dominant designs. It covers success, structured input errors, deadline (1 ms and dense layout), assets, oversized input, FIFO and symlink/directory. None of it covers chunk boundaries, Unicode across chunks or output-limit, so at that revision the defect is uncovered.

**A #25 implementation already exists locally.** It is on HEAD and `exchange/github/main`, but not on `main`/`origin/main` `f08a795`:

| Commit | Date (UTC) | Content |
| --- | --- | --- |
| `3d61eb06ec3a9a6de11c3c8bab61a5ce354bf728` | 2026-10-04 19:03 | Fix, parent `f08a795`. Plan `docs/plans/cli-unicode-output.md`, `scripts/reflow-cli.ts` (blob `c4259e5`→`90d4326`), preload `tests/helpers/fake-worker-spawn.mjs`, 13-test `tests/reflow-cli-output.test.ts`. Plan records red 9 pass/11 fail, green 20 pass (per-sample tests expand), `npm test` 485/0, `npm run build` ok. |
| `493577b` | 19:19 | real-worker Unicode positive control |
| `ac20cf3` | 20:04 | truncated-UTF-8 stdout/stderr ceiling controls |
| `ed8c097`, `90a6a30` | 20:14, 22:36 | 7 structured-failure audit tests. Helper gains `code: null` and `spawnError`. Plan says these were not red-first (no gap found) and that only focused tests were run. |

Integration: `f8a6c19` "Integrate a2/jo/reflow-cli-engineer" and `71ef503` "Integrate reviewed checkpoint a2/jo/reflow-cli-audit". Local branches `jo/reflow-cli-engineer` (`ac20cf3`) and `jo/reflow-cli-audit` (`90a6a30`) and exchange mirrors carry them. `reflow-cli.ts` is unchanged after `3d61eb0` on `exchange/github/main`, and the later #25 commits touch tests and plan only.

Not proven by these objects:

- that issue #25 is closed
- that a GitHub PR or hosted CI exists for these commits
- that the recorded red/green numbers were rerun by a reviewer

CLI2 ran nothing. The plan's evidence is author-recorded and has no separate `docs/evidence/` directory for #25. `reports/issue-25/` is described as ignored.

#26/#27 overlap. The next implementation priority remains **#26, then #27**. This doc proposes no patch for either.

- #26 (`5e53194`, `c7cf512`, integrated `011d029`/`12ae2fc`) changes `scripts/reflow-worker.ts` only (`NoValidCandidateError`, payload `category:'engine'`, `findings`, `total`). It does not change the collector. Shared surface: those payloads travel over stderr and are forwarded by L88-97 / fixed L94-103. Large `findings` arrays with non-ASCII text depend on the #25 decoder and the per-stream 20 MiB ceiling. Commit `7cc23ea` caps and dedupes findings, which bounds this.
- #27 (`53167ac`, `b849374`, `ebff07c`, `a41d241`) touches none of `reflow-cli.ts`, `reflow-worker.ts`, `offline-cli.test.ts` or `reflow-cli-output.test.ts`. Its "native CLI failure assertions" are its own tests. No line overlap with the collector.

## 5. Smallest next implementation scope

**Case A, target main lacks `3d61eb0`** (as at `4adaba4`/`f08a795`). Do not re-author. Carry the existing reviewed slice as-is, rebased or cherry-picked onto current main, with pre-image checks:

1. Pre-image: `scripts/reflow-cli.ts` blob must equal `c4259e5f…`. If it differs, stop and report.
2. Red first. Add only `tests/helpers/fake-worker-spawn.mjs` (`075aee42…`) and `tests/reflow-cli-output.test.ts` (`2e99f7e9…`). Run `npx tsx --test tests/reflow-cli-output.test.ts` against unmodified `c4259e5`. Expected red is the stdout split sweeps, stderr byte-at-a-time, interleave, and the limit-1/limit false `output-limit`. The audit tests pass on both trees.
3. Green. Apply only the collector diff that turns `c4259e5` into `90d4326`:
   - import `StringDecoder`
   - per-stream decoders and raw `received` counters
   - early return after overflow
   - `end()` flush at close when not overflowed
4. Then run focused tests, `npm test`, `npm run build`, and plan `docs/plans/cli-unicode-output.md` (`63cb0f79…`) with fresh red/green links.

There are no other production files. The worker and engine stay untouched. Keep concat-then-decode-once out of scope: the decoder is already O(n) and already proven.

**Case B, target main already contains `3d61eb0`, `ac20cf3` and `ed8c097`.** The code scope is empty. Remaining work:

- reviewer rerun of the focused file plus `npm test`/`npm run build` at that exact SHA
- optional stderr two-chunk sweep and stderr valid-payload-at-limit test (§3 gaps), each test-only and expected green
- issue handoff linking commit, plan and red/green

Neither case touches #26 or #27 files.

## 6. Missing prerequisite

The exact current GitHub main SHA has to be made available to an authorized writer. That means the source tree plus the four pre-image blob ids above, so Case A or Case B can be decided.

CLI2 has `4adaba4`, `f08a795` and a 2026-10-08 mirror `3c3c378`, but none is verified as current main. CLI2 is not authorized to fetch (import379 is still prohibited). Until a writer confirms main's `scripts/reflow-cli.ts` blob (`c4259e5` or `90d4326`, or something else, which means stop), #25 implementation stays behind #26, then #27.
