# Reflow team handoff: two packages with no channel overlap

Either teammate can take either package. GitHub assignees and the older KR/JH packet prefixes are planning labels; **ownership starts with an explicit claim of a task and its files**. Both packages below are reserved for the human team. Channels may read their outputs, but must not implement in these areas or take over an unclaimed package.

Start from current `main`. Take one 1–3 hour slice at a time; if it grows beyond that, hand off a smaller result and split the remainder. These are equal initial timeboxes, not a claim that the whole packages require equal effort. Rebalance after the first slices by recording any ownership transfer.

## Choose your first task

| Package | First task | Hand back |
| --- | --- | --- |
| **A — Input fidelity and evaluation** | Audit a small, fixed batch of public development examples against their originals | A discrepancy list and a versioned bundle manifest with hashes, preserved fields and explicit exclusions |
| **B — Adobe integration and visual review** | Verify official Adobe Express/viewer requirements and attempt one minimal editable-object round trip | Official source references plus observed editability evidence, or a precise access/technical blocker |

Adobe's official material is authoritative. Preserve unresolved contradictions rather than guessing. Use public development examples; do not change frozen family splits or use sealed inputs.

## Package A: input fidelity and evaluation

**First slice — [#102 / KR-01](https://github.com/kj-squared-labs/reflow-studio/issues/102):**

1. Pick a small existing public batch and record its source identifiers and hashes before making changes.
2. Check original copy, assets, supplied fonts and crop behavior against the converted examples. Separate successful rendering from faithful conversion.
3. Reproduce one discrepancy. Fix it within the reserved paths with meaningful regression controls, or explicitly exclude the unsupported case with a reason. Include a valid control.
4. Deliver a versioned development bundle, manifest, exact commit and discrepancy/exclusion report. Preserve earlier bundles; do not silently replace their bytes.

This accepted bundle unblocks the channels' development report, [#98 / RF-04](https://github.com/kj-squared-labs/reflow-studio/issues/98). The channel must remain blocked if it is missing, rather than inventing substitute inputs.

**Follow-up — [#103 / KR-02](https://github.com/kj-squared-labs/reflow-studio/issues/103):** define a compact rubric before viewing candidate outputs. Once the bundle and channel report are accepted, compare blinded source/baseline/candidate examples for fidelity, readability and composition. Record real human judgments, ties and missing reviews; keep objective checks separate.

**Reserved edit paths:**

- `scripts/lica_official/**`, `tests_python/test_lica_*`, `tests_python/test_render_font_binding.py`.
- Only the public corpus admission metadata files explicitly listed in your claim; no blanket ownership of the corpus.
- `docs/evaluation/rubric.md`, `docs/evaluation/blind-review/**`.
- Packet-specific `docs/plans/kr-01-2026-10-13.md`, `docs/plans/kr-02-2026-10-13.md`, `docs/evidence/kr-01/**`, `docs/evidence/kr-02/**`, `reports/kr-01/**`, `reports/kr-02/**`.
- Existing `docs/collaborators/krush-evidence/**` remains available to this package; its legacy folder name does not assign a person.

## Package B: Adobe integration and visual review

**First slice — [#104 / JH-01](https://github.com/kj-squared-labs/reflow-studio/issues/104):**

1. Read the current official Adobe challenge and Express SDK material. Record source links, retrieval dates and the unresolved viewer requirement discrepancy.
2. In the reserved experimental folder, attempt one small native editable-object round trip. Record actual IDs, text and assets before and after.
3. Deliver the smallest reproducible probe and observed evidence. If host access or schema support prevents it, document the exact blocker and next action; do not expand into a UI rewrite.

**Follow-up — [#105 / JH-02](https://github.com/kj-squared-labs/reflow-studio/issues/105):** after the channel delivers accepted [#95 / RF-01](https://github.com/kj-squared-labs/reflow-studio/issues/95) evidence, inspect actual PNGs for legal-copy visibility, wrapping, rotation and supplied-font rendering. File reproducible defects with input/output hashes and screenshots. A font hash alone does not establish correct rendering. Independently review Package A's source-fidelity evidence when available.

**Reserved edit paths:**

- `docs/express/**`, `experimental/addon/**`, `docs/evaluation/typography/**`.
- Packet-specific `docs/plans/jh-01-2026-10-13.md`, `docs/plans/jh-02-2026-10-13.md`, `docs/evidence/jh-01/**`, `docs/evidence/jh-02/**`, `reports/jh-01/**`, `reports/jh-02/**`.

## Work retained by the channels

| Channel area | Boundary |
| --- | --- |
| Python correctness and layout | `engine/**` and assigned engine regression tests |
| Automated renderer evidence and development reporting | `scripts/quality/**` and their assigned tests |
| Offline image and submission rehearsal | Submission packaging, Docker/dependency files, smoke runner and packaging tests |
| Release coordination | CI workflows, shared README/contracts, reviewed integration, publication and run controls |

Existing `src/**` work and pending branches remain preserved. Neither package grants a blanket UI edit reservation. If a task needs a channel-owned/shared file changed, request a scoped patch or record a transfer before editing it. Channels must likewise request a handoff before touching human-reserved files. Package B does not edit Package A's conversion code, and Package A does not edit Package B's typography review documents.

## Claim and finish a slice

Post this on the relevant issue before editing:

```text
Claiming Package A/B, slice:
Name:
Issue:
Branch (jo/...):
Starting commit:
Exact files reserved:
Expected output and checks:
Dependencies or access needed:
```

Check existing claims first; if there is a conflict, resolve it before writing. Keep the slice on a separate branch/worktree. For code changes, reproduce the failure and add meaningful controls before implementation. For research/docs, verify source references and observed behavior. Ask an independent teammate/reviewer to assess the exact result; authors do not approve their own evidence.

Finish with the commit, changed files, reproduction commands, test results/skips, artifacts/hashes, findings and next dependency. Post this to the issue so the coordinator can relay it to the channels; direct Quoroum access is not required. No claim means reserved/unclaimed, not started or available for channel takeover.

The channels stop selecting new work on **Tuesday, October 13, 2026 at 08:00 Eastern** and stop at **08:30 Eastern**. That cutoff governs channel automation. Human teammates may continue afterward after checking outstanding claims. This handoff does not authorize deployment or organizer submission.
