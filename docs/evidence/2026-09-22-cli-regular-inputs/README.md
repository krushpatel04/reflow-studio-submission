# CLI regular-file inputs — September 22, 2026

Focused completion evidence for [issue #23](https://github.com/kj-squared-labs/reflow-studio/issues/23), following the [test-first plan](../../plans/cli-regular-inputs.md). This hardens the provisional offline command from issue #8; it does not establish Adobe's official contract, official limits, or teammate clean-machine reproduction.

## Reproduced defect and policy

The command previously followed `--input` with `statSync`, checked only the reported size, and then called `readFileSync` before starting its supervised worker. A FIFO without a writer therefore blocked outside `--deadline-ms`. The new process test created a real FIFO, started the CLI with a 120-second worker deadline, and independently killed the process after two seconds. Against the old implementation it failed because the child was still blocked. A directory separately returned generic `input-read-failed`, showing the absence of a clear file-type contract.

The command now checks the followed path status before reading. It accepts regular files and symbolic links resolving to regular files. It rejects directories, FIFOs, devices, sockets, and links resolving to those types with exit 2, empty stdout, input category, and code `unsupported-input-type`. Missing paths and broken links continue to return `input-read-failed`. Size checks, JSON parsing, resource validation, and the worker deadline are unchanged.

The type check follows symlinks intentionally because mounted or linked ordinary inputs are supported. There remains a path replacement race between metadata lookup and reading, and a slow regular filesystem can still delay `readFileSync`; this is a supported-type contract and a fix for ordinary special-file blocking, not a hostile-filesystem or general I/O latency guarantee.

## Red, green, and controls

- [Red](red.txt): **6 passed / 2 failed**. The FIFO reached the independent 2000ms timeout and was killed by the test cleanup. The regular file and symlink positive controls passed, while the directory failed because it returned `input-read-failed` instead of `unsupported-input-type`.
- [Focused green](green.txt): **8/8 passed**. The FIFO returned in about 81ms in that run, with exit 2 and no stdout. Directory rejection and both regular-input positive controls passed.
- [Complete tests](final-test.txt): includes existing input-size, malformed JSON, unavailable resource, 1ms deadline, dense synchronous deadline, bundled-image and deterministic-output controls. [Build](final-build.txt) also passed.
- Hosted main-branch CI and the final commit are linked below after publication.

The FIFO test owns an independent timeout, kills a surviving child in its timeout and `finally` paths, and removes its temporary FIFO directory. This ensures a future regression fails instead of hanging the test process.

## Scope and skill assessment

Only `scripts/reflow-cli.ts`, its regression tests, and focused input documentation changed. Container workflow/smoke orchestration belongs to issue #24 and was not modified. Issue #8 remains open for official contract and teammate reproduction work. The repository's existing plan/test/CI workflow fully covered this focused process-boundary task; no new reusable skill was warranted.
