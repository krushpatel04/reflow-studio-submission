# M2 bounded source-fidelity ledger

> Scope note, October 5: this is a retained internal/scoped plan. The [current Adobe execution sequence](2026-10-05-adobe-execution.md) and [source audit](../evidence/2026-10-05-adobe-launch/README.md) govern next work; this plan is not proof of official Python entrypoint or genuine renderer compatibility.


## Problem and evidence

`docs/figma-intake.md` names two selected public practice designs (birthday flyer; Clyra poster) and explicitly says imports, access/terms, assets/fonts, conversion fidelity and renders are unverified. Neither corresponding source/export nor an existing ledger is present locally. `scripts/issue7-source-audit.ts` audits the admitted LICA manifest, not source-to-converted per-item eligibility; it intentionally does not claim rendering. No sealed files or network resources will be accessed.

## Why it matters

Any later fidelity or quality summary must retain each source item in the denominator. Missing inputs and known fidelity failures cannot disappear or count as wins. This slice builds accounting controls only; without actual source/export inputs, it cannot establish source fidelity or qualify either selected practice design.

## Scope and behavior

Separate branch `jo/reflow-m2-source-fidelity` from accepted checkpoint `8a52d6e34970e436cc0914147cbdf9493bf98976`. Exact owned paths:
- `docs/plans/m2-source-fidelity-ledger.md`
- `scripts/m2-source-fidelity-ledger.ts`
- `tests/m2-source-fidelity-ledger.test.ts`
- `fixtures/m2-source-fidelity-manifest.json`

No edits to M1 official-adapter paths, corpus manifests, shared interfaces/dependencies, or source assets. The two selected practice IDs remain rows marked `not-assessed` / `input-unavailable`; they carry no invented inventory, resource claims, or observed defects. A separate explicitly synthetic positive control demonstrates an eligible row can pass. Each row preserves original ID, category/reason, separate source and converted inventories (`elements`, `copy_count`, `text_count`), and per-row resource references/status. Total rows must equal declared source count. Reject duplicate/missing IDs, invalid category/reason pairs, inconsistent counts, malformed resources, duplicate resource IDs, and eligible rows with missing resources. Categories: eligible, source-defect, conversion-loss, missing-resource, introduced-engine-defect, not-assessed. This is ledger validation, not corpus qualification.

## Failure modes

A missing/unreadable input must remain visible as a not-assessed row, not vanish. Do not convert historical issue7 reports into current observations. Do not claim render parity, visual quality, permission, or source fidelity. Denominator mismatch and malformed rows must fail closed. Synthetic control must be clearly labelled, never mixed into observed counts.

## Steps and acceptance

1. Confirm local input absence and no equivalent ledger (done; no network/sealed access).
2. Define JSON schema and write fixture-independent tests, including a meaningful RED for duplicate ID/count/category failures plus an eligible positive control.
3. Add tests and pass-through stub, then capture behavioral RED; follow-up red against prior validator: 5 tests, 3 pass / 2 fail for eligible separate-count positive control and resource-status mismatch (no setup error).
4. Implement the minimum pure validator in the owned script; focused GREEN.
5. Record exact branch/SHA, focused counts and limitations. No full suite/build unless Coordinator queues it; independent exact-SHA review before publication.

## Evidence record

- Branch/base: `jo/reflow-m2-source-fidelity` at accepted checkpoint `8a52d6e34970e436cc0914147cbdf9493bf98976`.
- Local inputs: practice names only in `docs/figma-intake.md`; no corresponding local source/export files. Admitted corpus is `corpus/manifest.json` (separate LICA scope).
- RED: against an intentional pass-through `validateLedger` stub, `npx tsx --test tests/m2-source-fidelity-ledger.test.ts` ran Initial RED before first implementation: 5 tests, 2 pass / 3 fail on duplicate/missing IDs, denominator/category mismatch, and eligible inventory mismatch. Follow-up RED against prior validator: 5 tests, 3 pass / 2 fail on the separate copy/text count positive control and resource status mismatch. Both are behavioral failures, not setup/import errors.
- GREEN after initial implementation and follow-up: `npx tsx --test tests/m2-source-fidelity-ledger.test.ts` 5/5; `npx tsc --noEmit` exit 0. Full suite/build not run; waiting for Coordinator's serialized validation queue.
- No source-fidelity or rendering claim is made; acquisition/evidence subgate remains blocked until approved local exports and terms are supplied.
