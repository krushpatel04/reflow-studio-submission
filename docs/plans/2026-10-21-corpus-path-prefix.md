# Corpus path prefix boundary

Problem/evidence: `checkCorpusFiles` rejects every relative path whose resolved relative string starts with `..`. An in-root directory named `..draft` is legal but misclassified as outside the corpus. This can discard an otherwise valid admitted source or resource. A true `../` traversal must remain rejected.

Scope/behavior: Recognize only `..` itself or `..` followed by the platform separator as a parent escape. Keep absolute-path rejection, hash checks, and all other manifest behavior unchanged.

Risk: A loose prefix correction could accidentally permit parent traversal. Test both a valid in-root `..draft` file and an actual `../outside.json` control, plus the existing manifest suite.

Steps/checks: Add a normal supported-design regression and a traversal control; run it red on the current implementation; apply the one-condition correction; rerun focused tests, `npm test`, and `npm run build`. No layout/UI behavior changes; native and browser gates already covered the preceding changes.

Execution: The focused test failed before the fix because `..draft/poster.json` yielded `file-outside-corpus`. After the separator-aware check, all 10 corpus-file tests passed, including true traversal and absolute-path controls. Full Node suite passed 712 tests with zero skips; build passed. The read-only AI review attempt ran in an isolated clean worktree and could not inspect these uncommitted changes, so it supplies no approval.
