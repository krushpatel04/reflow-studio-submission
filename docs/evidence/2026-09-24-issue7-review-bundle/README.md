# Issue #7 / #20 review-bundle evidence

Date: 2026-09-24. This is synthetic engineering evidence only. It contains no human votes, real #33 outputs, held-out labels, quality result, or claim that #7/#20 is complete.

## Test-first record

Copilot first created the plan and tests, then ran:

```text
node --import tsx tests/issue7-review-bundle.test.ts
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../scripts/issue7-review-bundle'
```

That was the expected pre-implementation red state: the requested generator did not exist.

Independent review of Copilot's first green implementation found three contract failures: vote values were pre-populated, private decoding was returned beside reviewer data, and the claimed reversed controls retained the original A/B order. Tightened behavioral tests were written before the corrective implementation. The first corrective red run was:

```text
node --import tsx --test tests/issue7-review-bundle.test.ts
tests 6
pass 0
fail 6
```

The failures showed that the prior source/artifact schema could not produce blank, separated manifests or genuine reversed controls. A later regression test changed a pinned source hash while retaining the seed and produced:

```text
tests 6
pass 5
fail 1
AssertionError: artifact changes require a new bundle identity
```

The bundle identity was then derived from the seed, reviewer/configuration fields, case statuses, and pinned artifact identities.

## Final validation

```text
$ node --import tsx --test tests/issue7-review-bundle.test.ts
tests 6
pass 6
fail 0

$ npm test
tests 418
pass 418
fail 0

$ npm run build
tsc --noEmit: passed
vite build: 103 modules transformed; passed
```

The focused tests cover deterministic generation and input-order stability, content-sensitive bundle IDs, blank vote fields and declared choices, absence of method/case/path leakage from the reviewer manifest, distinct and balanced primary assignments, genuine per-reviewer reversed controls, retained exclusion/failure reasons, invalid-input boundaries, and physical separation of reviewer/private/accounting files.

## Copilot and coordinator record

- Bounded local Copilot process: Auto efficiency, 20-minute deadline, 30-credit soft cap, no remote export, GitHub mutation, commit/push, nested agent, or built-in MCP access.
- Completion: 5 minutes 32 seconds; reported AI usage 8.760448 credits (`totalNanoAiu` 8,760,448,000; one premium request cost unit).
- Copilot changed only the four exclusive paths, then the coordinator reviewed and corrected the contract failures above.
- No commit, push, issue edit, assignment change, vote creation, model/data download, or vault write occurred during implementation.

## Remaining limitations

- Inputs and outputs are manifests only; this tool does not copy or render artifacts.
- All tests use synthetic fixtures. Integration with trustworthy #33 artifacts is intentionally deferred.
- Method hiding is best effort for this team: pinned image content may still be recognizable even when names, paths, case IDs, and method metadata are hidden.
- This slice does not recruit reviewers, collect annotations, analyze agreement, train a model, unseal holdouts, or satisfy the broader #7/#20 acceptance criteria.
