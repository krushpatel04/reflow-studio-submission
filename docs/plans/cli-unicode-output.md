# CLI Unicode output — issue #25

## Problem and evidence
On October 4, 2026, fetched `main` is `f08a7951a4e6a8b84fcf8589f33d0e4c954c67d5`; issue #25 is open with unchanged acceptance and no comments. The assigned isolated clone is clean on `jo/reflow-issue-25`. The supervisor still decodes each stdout/stderr Buffer separately and re-encodes accumulated strings to check the 20 MiB per-stream limit. Splitting a UTF-8 character can silently replace original content and inflate counted bytes. The issue's previous probe was not a complete supervisor reproduction.

## Why it matters
JSON can remain valid while text, IDs, error paths and messages change. A valid output near the byte limit can also be rejected solely because chunk decoding inflated its size.

## Intended behavior and scope
Own only `scripts/reflow-cli.ts` output collection, dedicated CLI regression tests and this plan. Preserve the worker, engine/typography interfaces, source content/assets/styles/groups/paint order, 20 MiB limit on each individual stream, input bounds and exit protocol (0 success, worker error status, 1 runtime failure, 124 timeout). Use Node's existing UTF-8 replacement semantics for genuinely malformed bytes; this task does not introduce a new worker encoding protocol.

## Risks and failure modes
- Separate decoder state is required for stdout and stderr; interleaving must not join unrelated partial characters.
- Count raw Buffer lengths, not decoded characters or re-encoded replacements; limit-1 and limit are accepted, limit+1 is rejected.
- Flush pending bytes at close; malformed/truncated JSON must retain structured failures without returning a design.
- Preserve worker-error forwarding, deadline/overflow precedence and cleanup. Ignore further collection after overflow.
- Tests must control the supervisor's actual data events, not assume OS pipe writes preserve chunk boundaries or test a copy of collector logic.

## Test cases and acceptance criteria
- Force every byte-boundary split plus byte-at-a-time delivery for accented text, combining marks, ZWJ/skin-tone emoji and CJK on both streams. Assert exact payloads, IDs, paths and messages.
- Interleave partially decoded stdout/stderr; verify independent state.
- Exercise the actual 20 MiB per-stream boundary at limit-1/limit/limit+1, including split multibyte text, independent stream totals and malformed bytes.
- Empty, malformed and truncated worker output retain `invalid-worker-output`/`worker-failed`; output overflow remains `output-limit`; timeout remains `deadline-exceeded`/124.
- Retain unsplit/ASCII positive controls and run a real worker with Unicode design content plus the existing native CLI success, validation, asset and timeout tests.

## Implementation steps and ownership
1. Save this plan. Add a test-only Node preload that replaces child spawning with controlled streams in a subprocess running the unmodified supervisor entrypoint. Do not add production test flags or worker exports.
2. Run dedicated tests against existing code; record behavioral red evidence here before production edits.
3. Use independent standard-library streaming decoders and raw byte counters. Keep the remaining supervisor protocol unchanged.
4. Run focused green tests, `npm test`, `npm run build`, and native CLI controls. No UI, layout or font changes: browser acceptance, native gallery verification and benchmark reruns are not required by AGENTS.md for this scope.
5. Fetch before publication; inspect concurrent changes and revalidate after any necessary integration. Commit only owned files with the configured human Git identity, push the assigned branch without force. Do not merge main or close the issue.

## Validation and handoff
Link this plan, commit and exact red/green/final commands in the issue handoff. Check final diff, ownership and local links. Keep raw generated logs under ignored `reports/issue-25/`. State that deterministic stream integration proves collection independently of OS scheduling; it does not certify renderer glyph support, aesthetic quality, official Adobe compatibility or parent #8. No sealed sources, credentials/account settings, vault writes or Codex memory writes.

## Execution record
- Required repository instructions, README, progress, team plan, workflow and September 22 roadmap reviewed. No available skill materially improves this Node collector task; repository TDD and built-in test tooling suffice.
- Initial sandbox blocked Git metadata writes; the supervisor corrected it. A subsequent `git fetch origin` succeeded; branch matches fetched main. `gh issue view 25 --repo kj-squared-labs/reflow-studio --json number,title,state,body,comments,assignees,updatedAt,url` confirmed the live issue.
- Read-only vault context was attempted with bounded reads; both required context files timed out. No vault content was used or changed.
- Test harness: `tests/helpers/fake-worker-spawn.mjs` (preload replacing `child_process.spawn` with scripted `data` events) + `tests/reflow-cli-output.test.ts` (20 tests, unmodified supervisor).
- Red (pre-fix): `npx tsx --test tests/reflow-cli-output.test.ts` -> 9 pass / 11 fail (split Unicode corrupted on stdout/stderr, interleave, limit-1 and limit falsely rejected as output-limit).
- Green: same command -> 20 pass. `npm test` 485 pass / 0 fail (baseline 465 + 20); `npm run build` ok.
- Fix: per-stream `StringDecoder('utf8')`, raw byte counters, decoder flush at close, collection ignored after overflow.

## Structured-failure protocol audit (on f7b0d92)
Audit of `scripts/reflow-cli.ts` against malformed worker streams, via the scripted-spawn harness. Each case must give exactly one stderr line, empty stdout, and a structured code:
- exit 0 with non-result JSON (`null`, `[]`, `5`, `{}`, `{"timing":5}`, trailing/duplicate documents) -> `invalid-worker-output`.
- non-zero exit with unusable diagnostics (`null`, `[]`, `{}`, error missing code/category, truncated JSON, leading noise) -> `worker-failed`; non-zero exit with valid stdout -> `worker-failed`.
- signal-killed worker (null status) -> `worker-failed`; spawn error -> `spawn-failed`.
- invalid UTF-8 inside a protocol line -> forwarded with U+FFFD, no crash.
- oversized single stdout line, or both streams oversized while hanging -> `output-limit` (overflow wins over deadline).
Result: all 7 audit tests passed against the unmodified collector; no gap, so no production change (not red-first). Focused tests only; no full suite run.
