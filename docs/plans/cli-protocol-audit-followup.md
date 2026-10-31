# Clarify CLI audit test label

## Evidence and purpose
Reviewer approved `ed8c097` with one non-blocking nit: a test title claimed signal-kill coverage although its body exercised status 7; the signal case is actually in the following test. Clarify the title to accurately describe its own assertion.

## Scope and failure modes
Rename one test only in `tests/reflow-cli-output.test.ts`; do not change collector behavior or neighboring owners' files. Keep the signal-kill and spawn-error test intact. Risk is a typo or unintended test-body edit.

## Acceptance
Focused CLI output test file passes with the same case count and assertions; diff contains only the title correction and this plan. No full suite/build needed for this label-only change.

## Steps
1. Correct the test title.
2. Run `npx tsx --test tests/reflow-cli-output.test.ts`.
3. Review diff and commit on `jo/reflow-cli-audit`.
4. Send exact SHA to Reviewer and Coordinator. PR #38 remains draft; no merge.
