# Agent B packaging lane

## Problem and evidence
Friday handoff requires a source-bound package inventory, portable operator instructions, and a bounded baseline rehearsal. Main starts at `6d82709def61ae533fbc4f3ff59c2aa0a9c36bb3`; canonical Python packaging is distinct from the root TypeScript Dockerfile. The official upstream and organizer requirements must not be assumed from stale notes.

## Why it matters
A wrong context, missing renderer asset, or misleading offline success claim could invalidate submission evidence. A rehearsed baseline cannot qualify later code.

## Intended behavior and scope
Audit existing files without changing production, packaging, workflow, or tests. Write only B-prefixed plan/release documents and B report files on `jo/friday-packaging-20261027`. Do not inspect blind material, use external models, or modify the primary checkout. Agent A integrates; this branch is handed back without merging or pushing.

## Risks and failure modes
Distinguish Docker availability, real renderer execution, offline-network enforcement, input completeness, and unknown submission rules. Avoid running a container/full suite without Agent A's host slot. Preserve teammate files and never present skipped checks as passes.

## Acceptance checks
- Trace every assembled component, dependency pin, resource path, and exclusion to its source; record SHA-256 hashes for inspected inputs and reports.
- Compare runbook commands to current scripts and official accessible documentation; flag ambiguous cutoff/timezone, format, and viewer rules.
- Preflight executable availability, resource paths, and side effects. Run safe bounded static checks; mark container rehearsal HALTED without a host slot.
- Check links, commands, source/conflict wording, final diff, and owned-path scope. No artificial prose tests.

## Steps and ownership
B-1 inventory and static assembly inspection; B-2 runbook, README draft, source/conflict table; B-3 preflight and bounded rehearsal only if resource slot is authorized. Append B-status, commit owned files with configured identity, return B-handoff to user for Agent A.

## Execution record
- Base: `6d82709def61ae533fbc4f3ff59c2aa0a9c36bb3`; fetched origin/main at same SHA October 27, 2026.
- `CHAMELEON_UPSTREAM` is unset in this session; locate and verify pinned upstream before claiming runtime evidence.
