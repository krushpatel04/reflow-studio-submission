# Official-adapter CLI entry (Q9)

> Scope note, October 5: this is a retained internal/scoped plan. The [current Adobe execution sequence](2026-10-05-adobe-execution.md) and [source audit](../evidence/2026-10-05-adobe-launch/README.md) govern next work; this plan is not proof of official Python entrypoint or genuine renderer compatibility.


## Problem and evidence
`adaptOfficial` (`src/official-adapter.ts`) has no command-line entry point; only unit tests call it. `scripts/reflow-cli.ts` supervises the internal-schema worker and cannot be reused (different schema, no file output, no assets/roles/report).

## Scope
New `scripts/official-cli.ts` (in-process, no new dependencies), `tests/official-cli.test.ts`, one `package.json` script, this plan, one docs line in `docs/design-contract.md`. `src/official-adapter.ts` and the engine are untouched. Provisional subset adapter only: no official renderer, level-3, browser or visual claim.

## Behavior
`node --import tsx scripts/official-cli.ts --input REQ.json --output OUT.json [--assets DIR] [--roles FILE] [--report]`
- REQ is the official `{source, target_canvas}` request; the target comes from it. Request cap 2 MiB; roles file cap 64 KiB; asset cap 8 MiB.
- Measurer: `scripts/native.ts` `measure` (bundled fonts, deterministic; unsupported fonts are rejected by the adapter as `unsupported` before measuring).
- `--assets DIR`: `asset_id` must be a bare filename; realpath must stay inside DIR; regular png/svg file only; returned as a `data:` URI. Anything else resolves to undefined, so the adapter reports `missing-asset`. No network.
- `--output` is exactly `outcome.output`. With `--report`, `OUT.json.report.json` holds `outcome.report`; both are committed transactionally by `commitFiles` (temps with `wx` + fsync, hardlink backup of existing regular finals, rename both). On any failure both files are byte-identical to before (or absent if absent before) and no tmp/bak remains; the original error is rethrown, and if a restore itself fails the surviving `.bak` basename is named on stderr. Behavior change (Q10): an existing symlink or directory at OUT.json or the report path is rejected (`output-not-regular`, `$args.output`) before any write instead of being replaced. Known limits: path checks and writes are not atomic with respect to concurrent changes (a race between the alias/regular-file check and the rename, TOCTOU, is not closed), and there is no journal, so a crash between renames can leave a `.bak`. Entry detection compares real paths, so symlinked invocation still runs.
- Realpath guard: output (directory realpath + name) may not equal the input or lie inside the assets DIR; a symlinked output cannot alias the input.
- Failure: `OfficialAdapterError` -> exit 2, stderr `{error:{category:'adapter',code,path,message}}`; argument/input errors -> exit 2 (`category:'input'`); unexpected -> exit 1 (`error.code` or `adapter-failed`). Messages are fixed strings; raw `error.message` (which embeds absolute paths) is never printed, only the errno `code` and the user's `$args.*` path. No output or temp file on failure; a pre-existing output is left unchanged. The source file is never opened for writing.

## Risks
Path escape through asset ids/symlinks; output aliasing the input; half-written pairs; stub measurers masking text geometry (tests use the real native measurer).

## Acceptance
RED tests below fail before implementation (script absent), then pass. `npx tsx --test tests/official-cli.test.ts`, `npx tsc --noEmit`/`npm run build` clean. Mutation check: disabling the asset path-escape guard makes the escape test fail (`/tmp/q9-mutation.log`). Diff touches only the five listed files.

## Tests
1 success + official shape + source bytes unchanged; 2 roles honored, report sidecar, output identical with/without `--report`; 3 rejected request leaves no output and keeps a pre-existing one; 4 missing asset path, traversal/absolute/escaping symlink; 5 argument errors; 6 controls (inside symlink, Unicode, same-size round trip); 7 output aliasing input via symlink; 8 report-write failure leaves no OUT.json.

## Execution record
(red/green evidence appended below)
- RED (`reports/q9/red.log`, script absent): `npx tsx --test tests/official-cli.test.ts` -> 0 pass / 8 fail (ERR_MODULE_NOT_FOUND). A ninth test (font the bundled measurer lacks) went red first against `supportsFont: () => true` (exit 1, uncaught) and was fixed by using `BUNDLED_RESOURCES.supportsFont`; the adapter then rejects `Solstice Serif` as `unsupported` at `$.elements[0].fontFamily` (its own internal-design path).
- GREEN (`reports/q9/green.log`): 9/9 pass. `npx tsc --noEmit` exit 0.
- Mutation (`/tmp/q9-mutation.log`): removing the `inside(assetsDir, real)` realpath guard makes the escaping-symlink test fail; guard restored.
- Native measurer is deterministic on this host (bundled fonts only; repeated `Inter` measure identical).
- Limits: provisional subset; real official fonts (e.g. Solstice) are rejected, not substituted; no deadline/subprocess; no full suite run by owner; no renderer/level-3/visual claim.
- Q10 (`/tmp/q10-red.log`, `/tmp/q10-mutation.log`): transactional write fixing the pre-existing-OUT.json loss on report failure; scrubbed errors; `--roles` probes. Rollback is tested in-process through an injected `ops.rename` (no test hook in shipped code). Mutants (skip restore, skip cleanup, old `rmSync(target)`, no regular-file preflight, raw `error.message`) all killed.
