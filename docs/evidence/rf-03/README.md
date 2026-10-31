# RF-03 evidence (#97): floor accounting for 1-ulp sub-floor group labels

Base: accepted main 69464b9 (tree 7f26376b). Branch jo/rf-03-floor-snap. Plan: `docs/plans/rf-03-2026-10-13.md`.
Commits: plan f865408f, RED tests 37b40e0e, fix bc01454b, pins 972c7505 (this README is a later docs-only commit).

## Change
`engine/text_fit.py` `_raise`: the `low=` filter drops `- 1e-9`. A group label that the rigid upscale left at `5.999999999999999` (`fs * (6/fs)`) now goes through the same P10 fit gate as every other sub-floor label. The gate is unchanged: raised to exactly 6.0 only if every sub-floor label of the group fits its scaled box at 6px; otherwise nothing changes. `_sub_floor` is already a strict `<` at 69464b9, no edit needed. Engine-only (one line).

## Real renderer, paired (Skia via `scripts/quality/text_ink.py` probe; `before_after.py`, raw `before.json` at 69464b9, `after.json` at bc01454b)
| target | text | font_size before -> after | drawn | ink px | ink bbox |
|---|---|---|---|---|---|
| 728x90 | cta_label | 5.999999999999999 -> 6.0 | 5 -> 6 | 152 -> 271 | [486,7,540,13] -> [486,8,561,15] |
| 2000x300 | cta_label | 5.999999999999999 -> 6.0 | 5 -> 6 | 152 -> 271 | [456,7,510,13] -> [456,8,531,15] |
| 1600x400 | ribbon_label (rot -12) | 5.999999999999999 -> 6.0 | 5 -> 6 | 126 -> 180 | [1,16,35,27] -> [1,15,43,28] |
| 160x600 | ribbon_label (rot -12) | 5.999999999999999 -> 6.0 | 5 -> 6 | 126 -> 180 | [1,16,35,27] -> [1,15,43,28] |

Explicit 5.0 renders identical to "before", explicit 6.0 identical to "after" (columns `explicit_5` / `explicit_6` in the JSON). No lost ink, no overflow, geometry byte-identical before/after (only `font_size` differs). `ribbon_label` is raised, not left at 5: its box fits at 6px. `legal_text` (6.0, 728x90) is unchanged: 889 ink px.
Renders: `png/before_728x90.png`, `png/after_728x90.png`. The ribbon garble at 728x90 is a separate cause (label exactly 6.0, rotated -12) and is not changed here.

## Pins (acceptance is the paired render above, not the hash)
| pin | old | new |
|---|---|---|
| `tests_python/test_shape_obstacles.py` `L3_HASH` (level3_advanced) | 65e0278b151fa114ef2155451d14930c99e60c64a560114bcd48d716c27bca26 | f00cb4a1b724f6fb64eaa653e687ac79f3d0ebb91717a6881b30c31099d9646b |
| `tests_python/test_text_fit.py` `SubFloorLabelRaise.MAIN["C1_l3_120x600"]` | 2d81e37ad0a02aaa7d63df232f66d45c9847e5163c9c2435e8792e14a16d8d5d | 900c61306c57613477e160db5d8028d7f93212b149d2413f3ea07588a0423691 |

The C1 hash is re-measured here on the object that test hashes (output with `badge2_label` font restored to 4.860000000000001). The only element difference on the L3 sample and on C1 is `cta_label.font_size` 5.999999999999999 -> 6.0.
Unchanged, re-measured at the fix: level1_warmup 5553467cf7ae106de6c6502aec567c3f23c5a953d4a43c47a4ef5c98b8f4e23a, level2_core 4aeec49c3468c0ad1eb9486201be945a5af6a799b7674b2b6bdb0744669cd4c7 (equal to the BASE_HASH pins). C3b_extreme_60x1000 pin 3985b3e0... unchanged. No other pin touched.

## Behavioral green with pins red (before the pin commit, at bc01454b)
`test_text_fit test_shape_obstacles test_wide_composition test_extreme_composition`: 69 tests, exactly 2 failures, the two pins above (`SubFloorLabelRaise.test_only_label_font_changes_everything_else_equals_main [C1_l3_120x600]`, `ShapeObstacles.test_public_samples_byte_identical_to_base`). No third failure.
RED at 37b40e0e (new file vs unfixed engine): 11 tests, 14 subtest failures, all `5 not greater than or equal to 6.0`, ink `152 != 271` / `126 != 180`, and the sliver-in-fitting-box control `(False, 5.999999999999999) != (True, 6.0)`. Too-narrow, outside-epsilon (6-1e-6, 5.9999, 5.5) and floor-exact controls pass on both base and fix: they pin that nothing else moved.

## Limits
Only the [6-1e-9, 6) sliver changes. Genuinely sub-floor values keep the existing fit-gated behavior: fitting labels may rise to 6; labels that do not fit remain unchanged/reported. No layout redesign. Final-SHA test counts and env-failure comparison against 69464b9 are in the hand-off message.
