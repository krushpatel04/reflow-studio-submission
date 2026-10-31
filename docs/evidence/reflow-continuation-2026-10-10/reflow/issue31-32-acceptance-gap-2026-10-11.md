# #31 / #32 acceptance-gap map — October 11, 2026

Docs only. CLI2 read local Git objects with `git show` / `git cat-file` at one revision. Nothing was checked out, fetched, imported, executed, scanned or tested. No count below is new: each one is quoted from the cited blob line. CLI2 did not have the issue bodies for #31 and #32. Criteria (a)–(d) are **root-reported** from root's check of main `868e23fc`, not read from the issues.

## 1. Revision read and caveat

- Revision read: `3c3c378137071bcfc98849930226815f32cb7a36`. This is the local exchange mirror of github/main, dated 2026-10-07T21:46:09-04:00.
- This is **not** a current-main claim. Changes on main after `3c3c378` are unknown to CLI2, and `868e23fc` is not available locally.
- Prerequisite: root reads back the blob ids for the paths below at `868e23fc`. Any mismatch voids the matching row.

| Path @ `3c3c378` | Blob | Bytes | SHA256 |
| --- | --- | --- | --- |
| `corpus/split-lock.json` | `e522ec5e43980dfff68a05f819753234bbe63889` | 2167 | `a864bbb8eb6645d92dedbf09cc96ca7622a678b2df865154a5a86d3e233f509d` |
| `corpus/lica/import-outcomes.json` | `b88e41b5e6190837601fb189e202359b067c82e4` | 642989 | `85983788023df14fe7df1f4248dd111b344c8bf3b7cbdd2d4c5598a13658d425` |
| `corpus/manifest.json` | `3422362f0ffa76d9a12961ff1b84eafb462e07da` | 80948 | `213a4fdba7eda5cb6ad5e5d63d46cc1cbe5589a67a9863d4e66ef4062f953eb7` |
| `docs/plans/frozen-corpus-splits.md` | `37b21597c5cfb00d2ddd497673ec58362c166e97` | 6166 | `40da51fb14bebbe12afe85ae384698ebd19dfe2b84c072ff20eef5c8f7dca220` |
| `docs/plans/lica-import-outcomes.md` | `b1ae16120b4b21b5e23793d7ac7ccb83755954ef` | 5799 | `ca55cd042415119700932ceaa6b9366c565bac256c0c009b321ff9f45844134c` |
| `docs/plans/lica-bounded-expansion.md` | `56984892de9a1dc4b5c809d9907fee25f3476735` | 5340 | `737aadee807afcc1e534f5ebd315cdf363d1debac2066b8f10464689069896e3` |
| `docs/figma-intake.md` | `e443a5413e2ddc8c773b287f9b8e6ce40d79c715` | 3588 | `322c80664219449e4338d734266d341ddc7797b921342a418d484be8736640c0` |
| `docs/evidence/2026-09-24-corpus-preflight/README.md` | `950e8959249f44a96ccae281e8110f050af46ae7` | 5293 | `994620b212da8ca2037d3d7a8dfb0a922ffa58c6c26a00533e626a84c0f7f765` |
| `docs/evidence/2026-09-26-project-audit/README.md` | `087e1e3f9bba46d33c51838fb9b5c1030adebb42` | 15052 | `1b3ddf0505272a0447b40d0d8723d9cdb0c8914a5d18029933d69eb746238e66` |
| `scripts/corpus-splits.ts` | `72cc853389e7c0ed46ada55c5b9608908f27f170` | 12023 | `dedee271f72b19e3477c125b3b3ba84474c1f689b66b4cd017f7f2ab2e7b18ac` |
| `scripts/lica-outcomes.ts` | `7f687f21a4217cb05b02ed1467e0be14ce3ae385` | 6786 | `85e6a7b24b8c9866271fbec18dc1a875704f3985d6429dd76bd4a40ed1458861` |

`lica-bounded-expansion.md` is the only path read beyond the Coordinator's list. It is the #32 expansion plan from commit `91c3e55`.

## 2. What landed (author-recorded; CLI2 reran nothing)

**#31 frozen splits / family admission.** Commit `09deb9edc0d64ef559e4a12f1200ff2c8700bb71` (2026-09-22, "Freeze corpus family splits for independent evaluation (#7)"). It adds `corpus/split-lock.json`, `scripts/corpus-splits.ts` and `scripts/corpus-split-files.ts`, wires the lock into `scripts/lica-import.ts`/`corpus-check.ts`, and adds tests.

- `split-lock.json` L2-3: schema `reflow.corpus-splits.v1`, `targetsSha256` `9d4bf17d204b5327fd0eab9ab0cf4ae7bb255384ac706befa0a2056c2b1bc453`.
- `split-lock.json` L12: `importConfigSha256` `583feec1…`.
- `split-lock.json` L13-74: 10 families, 7 `development` and 3 `validation`, 0 `test`, all `exposure: "seen"`. L75 has `migrations: []`.
- `frozen-corpus-splits.md` L39 records the same counts: "10 families, seven development, three validation, all `seen`, zero test", with the same target hash.
- `frozen-corpus-splits.md` L41: `npm test` 351/0, build passed, `corpus:check` 0 errors plus the expected `too-few-test-families` warning.
- `corpus-splits.ts` L60: an unseen family is rejected unless `--approve-new-families` is passed "after duplicate review". A LICA family can never be assigned `test` (plan L9).

**#32 LICA import accounting / bounded growth.**

- Commit `d2a123ed52866ce392915087ac71827948154f72` (2026-09-22, "Record outcomes for every LICA import input") adds `corpus/lica/import-outcomes.json` and `scripts/lica-outcomes.ts`, plus file checks and tests.
  - `import-outcomes.json` L2-11: schema `reflow.lica-import.v1`, `metadataSha256` `06d478a0…`, `total` 1148. Counts: `supported` 0, `adapted` 21, `unsupported` 878, `unavailable` 20, `not-selected` 229.
  - `lica-import-outcomes.md` L32 breaks these down: 878 = 741 conversion-blocked + 137 animated; the 20 unavailable are missing fonts; for the 229 not-selected, "image URLs are unchecked".
  - `lica-import-outcomes.md` L36: `npm test` 370/0, `corpus:check` 0 errors plus one missing-test-family warning.
- Commit `91c3e5523a17114cbbb7217ac68e8966f1864e1d` (2026-09-22, "Add bounded append-only LICA expansion path") adds `scripts/lica-batch.ts` and extends `corpus-splits.ts`.
  - `lica-bounded-expansion.md` L36: a trial import into an isolated temp copy grew 21 to 25 sources from 12 families. It was not committed.
  - L38: `npm test` 375 passed.

Manifest `3422362f` (sha256 `213a4fdb…`, which matches preflight README L11-13) holds 21 sources, all `"license": "CC-BY-4.0"` (L109 and repeats), and 10 `split` records.

## 3. Gap table (criteria root-reported at `868e23fc`)

| # | Missing criterion | Existing evidence @ `3c3c378` | What would satisfy it | Prerequisite / owner | Event trigger |
| --- | --- | --- | --- | --- | --- |
| (a) | **Real family admission.** At least one admitted, untouched `test` family from outside creators, so `too-few-test-families` clears. | **Partial**, tooling only. The lock has 0 `test` families (`split-lock.json` L13-74). The warning is still expected (`frozen-corpus-splits.md` L41, `lica-import-outcomes.md` L36). LICA cannot produce `test` (plan L9). `figma-intake.md` L14/L18-19 records two private sealed candidates, sourced but **not admitted**, and "zero sealed test families". | The custodian's private protocol is completed per `figma-intake.md` L26: permission, near-duplicate/family checks, exposure record, frozen targets/hashes, deliberate release. That yields a committed `test` lock entry plus a `corpus:check` result without the warning. | Sealed-source custodian (private protocol), then root to publish. Not CLI2. | Custodian reports admission complete with a nonidentifying record. |
| (b) | **Near-duplicate and exposure review** for families before approval. | **Partial.** A code gate requires `--approve-new-families` "after duplicate review" (`corpus-splits.ts` L60), but the plan says automated checks "cannot prove visual independence" (`frozen-corpus-splits.md` L26). All 10 families are `seen` (L39), and the 3 validation families are "already seen" (L27). `migrations: []` (`split-lock.json` L75). Custodian screening exposure must be recorded privately (`figma-intake.md` L21). **No review record** is cited for any family. | A dated human near-duplicate review per candidate family. Exposure is recorded separately for custodian screening and developer use, and is referenced (not disclosed) before any approval flag or holdout claim. | Human reviewer and custodian; root records it. | A new family is proposed (an import requests `--approve-new-families`), or a sealed candidate is about to be admitted. |
| (c) | **Grouped/busy-photo classification.** | **None** in the cited blobs. `lica-import-outcomes.md` L11 says this slice does "not … classify busy photos" and defers that to follow-ups. Neither script mentions grouped or busy classification. | A classification rule and a per-source label (e.g. grouped / busy photo / other) recorded for the committed corpus, with the test written first. It is out of scope for this doc. | Implementation owner assigned by root; needs source at verified main. | Root assigns a slice after verified-main readback. |
| (d) | **Permissioned coverage.** Distribution permission is established per asset or source. | **None established.** The manifest records `"license": "CC-BY-4.0"` per source (L109 and so on), which is a declared license, not cleared permission. "Permissions clearance … not … established" (preflight README L16). The ledger "does not verify embedded-photo permissions" (`lica-import-outcomes.md` L36). "Not established: permission to distribute each asset" (`figma-intake.md` L20). | A per-asset permission record, covering embedded photos and fonts, for each source counted toward coverage, with gaps listed explicitly. | Rights owner or authorized human, recorded by root. Never inferred by an agent. | A permission record is supplied by an authorized human. |

## 4. Boundaries

- Sealed selections stay private and unopened. This doc names no sealed title, link, creator, content or private path, and only cites `figma-intake.md`'s nonidentifying status lines.
- No permission is inferred. A declared `CC-BY-4.0` license is not cleared distribution permission, and "not established" stays not established.
- Practice designs are not relabelled as sealed (`figma-intake.md` L21). The 3 `validation` families are seen and are not test evidence.
- No test family is claimed admitted, and no permission is claimed cleared. The isolated 25-source trial (`lica-bounded-expansion.md` L36) is not committed corpus.
- There is **no closure claim** for #7, #31 or #32. The project audit lists #31 and #32 as Backlog with partial work, where "closure requires acceptance reconciliation" (`2026-09-26-project-audit/README.md` L55-56, L61).
- No code or tests were edited and nothing was rescanned. #26/#27 priority is unchanged; both are blocked on source.
