# Stage 1 compliance matrix — October 27, 2026 (#35)

This maps each Adobe Stage 1 requirement to the evidence that covers it on the current tree. Sources: the Final Chameleon Challenge brief v1.5 and the starter `RULES.md`, `README.md` and `FAQ.md` at `a44a060`, as recorded in the [launch source register](../2026-10-05-adobe-launch/README.md), the [competition contract](../2026-09-26-issue4/competition-contract.md) and the [P0 inventory](../2026-10-06-python-p0/INVENTORY.md).

Engine state is main `6d82709`. It does **not** include PR #150; re-check the affected rows when that merges.

Status values:
- **Met:** evidence on the current tree shows it.
- **Gap:** a requirement is not met, or a deliverable is missing.
- **Open:** Adobe's sources conflict or are silent, so it can't be settled here.

There is no weighted scoring rubric in the inspected sources. The rows below are the stated requirements, not a score.

## Output contract (scored on JSON and rendered PNG)

| Requirement | Source | Status | Evidence |
|---|---|---|---|
| Every source element ID exactly once; none added or removed | RULES; brief pp9–10 | Met | `test_contract.test_canvas_is_target_and_ids_exactly_once`, `test_duplicate_and_missing_ids`, `test_fields.test_all_fixtures_together_ids_once_in_order`. Public samples rechecked on Oct 27. |
| Text `content` and `font_family` unchanged (Stage 1); `font_size` may change | RULES | Met | `test_fields.test_non_geometry_fields_preserved_verbatim`, `test_legal_line_fit.test_source_and_protected_fields_are_preserved`. Public samples rechecked. |
| Other design properties preserved (group, stacking, opacity, rotation, type-specific) | brief pp9–10 | Met for the public samples | `test_fields.test_non_geometry_fields_preserved_verbatim`, `test_group_scale`, `test_rotated_bleed`. Only geometry and `font_size` (plus scaled `letter_spacing`, `corner_radius`, `stroke_width`) change. |
| No regeneration or replacement of image pixels (disqualifying) | RULES; brief | Met | The engine never touches asset bytes; `asset_id` is preserved verbatim (`test_fields`). The six output hashes are identical across hosted Linux and the teammate Mac ([README](README.md)). |
| Non-background images keep their aspect within ~5% unless cover or full-bleed | RULES | Met | `test_contract.test_aspect_ratio_preserved_for_non_cover_image`, `test_layout.test_framed_image_aspect_never_changes`. Public samples rechecked: no deviation. |
| Nothing outside the target canvas | RULES | **Open** | L2 `deco_circle_1` sits at (−100, −100) **in the source**, so it stays partly off-canvas (y = −37 at 1600×400). The engine keeps it on purpose (`test_layout.test_off_canvas_source_element_is_accepted_and_scaled`), and the starter README calls this bleed an expected self-check warning. Rules conflict 6 in the competition contract; needs a team or organizer decision. |
| Input never mutated | starter contract | Met | `test_contract.test_input_not_mutated_and_output_not_aliased`, `test_fields.test_input_unmutated_for_every_fixture`. Container inputs are read-only and byte-identical before and after ([README](README.md)). |
| Real renderer output (not the box fallback) | starter README; brief | Met | 3 REAL / 0 FALLBACK on hosted Linux (run 40521858337) and on the teammate Mac. The renderer-absent control fails as required. |
| Readable text in the rendered PNG | brief (PNG is evaluated) | **Gap (partial)** | On main, L3 labels are drawn at 6 px with broken spacing on Linux (#148). PR #150 fixes the plate labels; the L3 subhead and legal line stay at 6 px (F3). |
| Visual quality of the rendered PNG | brief (PNG is evaluated) | **Gap** | L2 1600×400 leaves the left third empty, the product is tiny, the CTA is far from the headline, and a decoration covers the subhead. L3 728×90 is dense. Tracked in #5 / #12; no independent quality review yet (#7, #98). |

## Execution

| Requirement | Source | Status | Evidence |
|---|---|---|---|
| Runs offline, network disabled at runtime | brief pp6,9 | Met | Network `none` and the in-container probe reports blocked, on both hosts ([README](README.md)). |
| No external model or API calls in the engine | brief; AGENTS.md | Met | No network or HTTP imports in `engine/`. Same offline runs as above. |
| linux/amd64 Python 3.11 container; dependencies installed at build time | brief; starter Dockerfile | Met | `Dockerfile.python-submission`; image linux/amd64; fingerprint verify exit 0 on both hosts. |
| Deterministic, complete outputs (JSON + PNG per task) | starter `engine/main.py` | Met | Six outputs per run; the repeat run is identical; the hosted and Mac outputs are byte-identical. |
| Bad inputs fail visibly (malformed, unsupported, invalid target, timeout, memory) | internal policy (#35 acceptance) | Met | Failure matrix 6/6 on both hosts. |
| Execution time (no hard limit; faster preferred) | brief p9; RULES | Met | Hosted: fresh-process median 0.572 s for three tasks. Mac with Rosetta: 1.059 s. Descriptive only. |
| Reference hardware (Apple M5 Pro; exact limits unpublished) | brief pp6,9 | **Open** | Passes on an arm64 Mac through Rosetta and on hosted x86_64. Exact limits are not published. |

## Stage 1 deliverables and submission

| Requirement | Source | Status | Evidence |
|---|---|---|---|
| Engine code | brief pp6,12 | Met | `engine/` |
| Dockerfile | brief pp6,12 | **Gap** | The submission image is `Dockerfile.python-submission`. The **root `Dockerfile` builds the old Node/TypeScript CLI**, so `docker build .` gives the wrong image. The README explains this, but a judge may not read that far. |
| Short README | brief pp6,12 | **Gap** | `README.md` is a long developer document. There is no short "what it does / build / run" section for judges. |
| GitHub repository link via the submission form | launch email | **Gap** | The repository is **private** and has **no license**. Judges may not be able to open the link. Visibility and license are team decisions. |
| Deadline | launch email | **Open** | October 30; the exact time and timezone are unpublished. |
| Viewer | starter FAQ Q5 vs brief v1.5 | **Open** | The brief removes it and the FAQ still lists an unscored viewer. The workbench exists; no organizer answer yet. |

## Not in Stage 1

The engineering check-in, Express add-on, pitch and demo video apply to the finale (#4, #10), not to the October 30 submission.
