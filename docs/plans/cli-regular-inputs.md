# Issue #23: reject non-regular CLI inputs before reading

## Problem and evidence
At `41dae3b`, `scripts/reflow-cli.ts` follows the input path with `statSync`, checks only its size, and then calls `readFileSync`. A FIFO reports a small size but can block indefinitely when no writer exists. The worker deadline begins later, so it cannot terminate this read. Directories and other non-regular filesystem objects also lack an explicit input contract.

## Why it matters
The offline command must fail visibly instead of hanging before its supervised worker starts. This is a focused reliability contract for issue #23; it does not establish a general filesystem latency bound or complete issue #8's official-contract and teammate-reproduction work.

## Intended behavior and scope
Accept a regular JSON file. Accept a symbolic link only when normal path resolution reaches a regular file. Before reading, reject directories, FIFOs, devices, sockets, and symlinks resolving to those types with a structured input error, exit 2, and empty stdout. Preserve missing/broken-path errors, size checks, malformed JSON, resources, successful regular files, and worker deadlines.

## Risks and failure modes
Checking the link object itself would reject useful mounted or linked regular files. Checking only file size repeats the FIFO defect. There is an unavoidable path replacement race between metadata lookup and read; this change defines supported path types and prevents ordinary blocking special-file reads, but is not a hostile-filesystem guarantee. Tests must own a timeout and kill/cleanup path so a regression cannot hang the suite.

## Test cases and acceptance criteria
- A FIFO with no writer fails promptly with structured `unsupported-input-type`, exit 2, and empty stdout. The test independently times out, kills the child, and removes its temporary directory.
- A directory fails with the same clear type error.
- A regular JSON file and symlink to that file both succeed and produce equivalent editable content.
- Existing malformed JSON, size, resources, and worker-deadline tests continue to pass.
- `npm test`, `npm run build`, and hosted CI pass. Archive red/green evidence, update focused CLI documentation, link the issue, commit, and close #23 only after validation.

## Implementation steps and ownership
This task owns `scripts/reflow-cli.ts`, its process regression tests, and focused input documentation. Add process helpers and tests first; record the behavioral failure. Then check the followed file status with `isFile()` before `readFileSync`, without changing worker/runtime logic. Sibling issue #24 owns container CI orchestration and is outside this task.

## Validation and handoff
Record the failing and passing focused commands, full tests/build, hosted CI URL, commit, input-policy limits, and remaining #8 scope. Do not claim a board move if project API scope prevents verification. Assess reusable-skill value; do not create one automatically.

## Execution record
Started September 22, 2026 from `41dae3b`. The focused red run had **6 passing / 2 failing** tests. The real FIFO child remained blocked until the test's independent 2000ms timeout killed it; the directory returned `input-read-failed` instead of the required type error. Regular-file and symlink positive controls already passed. The process test cleans up the child and temporary FIFO even on failure.

The production change follows symlinks through `statSync`, checks `isFile()` before `readFileSync`, and returns structured `unsupported-input-type` for everything else. It changes no worker, engine, resource, size, or deadline behavior. Focused green was **8/8**; complete validation and hosted CI are recorded in the [dated evidence](../evidence/2026-09-22-cli-regular-inputs/README.md). Existing repository workflow covered this bounded process test; no reusable skill was needed.
