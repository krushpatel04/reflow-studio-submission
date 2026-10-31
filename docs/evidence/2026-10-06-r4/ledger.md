# R4 case ledger: P4 vs P5 vs P5b (real renderer)

Evidence only; no engine edits. Variants: P4 4c86006, P5 79b18b3, P5b d48a548 (main). Single machine, one font set; Pillow approximates the renderer; ink bounds approximate; no layout-quality or score claim. Public samples are development evidence, not qualification.
Run proof: public L1-L3 each variant 3 REAL / 0 FALLBACK exit 0 (public/*/run.log); S1-S4 each variant 1 REAL, exit 0 (synthetic/*.log). Provenance: provenance.txt. Regenerate: run_public.sh, synthetic/driver.py, ledger.py, ink.py, groups.py (venv python, repo root).

## Measured results (JSON + pixels, tables below)
- L1, L2: JSON and PNG byte-identical across P4/P5/P5b.
- L3 -> 728x90: P4 ungrouped headline 2.67px, subhead 1.47px, legal 1.0px. P5 and P5b headline 13.95, subhead 7.67, legal 6.0.
- P5 grouped labels: JSON label NOT inside plate on all 5 L3 groups and on S1/S2; L3 P5 ribbon_label rotated box extends past the canvas (ink_ledger flag clipped-by-canvas; box test, not an ink measurement). P5b: labels inside plates on all (groups_ledger.md), plates identical to P4. P5b grouped labels remain 1.0-1.47px on L3 (below floor; known limit).
- S1 (120x600): P4 = P5b label 5.76px inside plate; P5 label 25.51px outside plate.
- S2 (728x90, -12 deg): P4 = P5b ribbon_label 4.86px; plate pixel axis -11.8 deg (JSON -12). P5 label 48.6px, outside plate.
- S3 (1000x60): P4 text 3.2/1.8/2.0px; P5 = P5b 27.55/15.5/17.22px.
- S4 (60x1000): P4 3.0/2.4px; P5 = P5b 12.71/10.17px.
- Ink ratios: only 4 of 45 rows reliable (0.95-0.99); the rest UNRELIABLE (overlap, non-uniform bg, rotation, <3px) and are reported with the flag, not as a result.

## Visuals I looked at (contact sheets of P4/P5/P5b stacked; not stored)
L3: P4 content is a tiny centered column; P5 text spread over strip with badge labels away from their plates and a clipped ribbon label at top-left; P5b headline/subhead/legal readable, badges tiny. S2: P5 label large and overflowing the plate, P4/P5b small inside. S3: P4 specks, P5/P5b readable single row. Reviewer to judge group association, clipping, overflow.

## Tables
## Public L1-L3 (status from run.log; font px of text elements)

| case | variant | status | json | png | text px |
|---|---|---|---|---|---|
| level1_warmup | P4 | REAL exit0 | `97193ea3f25b` | `494caf37aae6` | headline=60.00, cta=30.00 |
| level2_core | P4 | REAL exit0 | `416cac59d99f` | `b2c880e29b2a` | headline=20.74, subhead=8.89, badge_label=6.67, cta_label=8.15 |
| level3_advanced | P4 | REAL exit0 | `630bf5d7def6` | `afd52c4d1d4f` | headline=2.67, subhead=1.47, badge1_label=1.00, badge2_label=1.00, badge3_label=1.00, cta_label=1.47, ribbon_label=1.33, legal_text=1.00 |
| level1_warmup | P5 | REAL exit0 | `97193ea3f25b` | `494caf37aae6` | headline=60.00, cta=30.00 |
| level2_core | P5 | REAL exit0 | `416cac59d99f` | `b2c880e29b2a` | headline=20.74, subhead=8.89, badge_label=6.67, cta_label=8.15 |
| level3_advanced | P5 | REAL exit0 | `0648acfe582e` | `830aca0fe2be` | headline=13.95, subhead=7.67, badge1_label=6.00, badge2_label=6.00, badge3_label=6.00, cta_label=7.67, ribbon_label=6.97, legal_text=6.00 |
| level1_warmup | P5b | REAL exit0 | `97193ea3f25b` | `494caf37aae6` | headline=60.00, cta=30.00 |
| level2_core | P5b | REAL exit0 | `416cac59d99f` | `b2c880e29b2a` | headline=20.74, subhead=8.89, badge_label=6.67, cta_label=8.15 |
| level3_advanced | P5b | REAL exit0 | `35d75ec9d72f` | `2d844047d1e9` | headline=13.95, subhead=7.67, badge1_label=1.00, badge2_label=1.00, badge3_label=1.00, cta_label=1.47, ribbon_label=1.33, legal_text=6.00 |

## Synthetic S1-S4

| case | variant | status | json | png | text px |
|---|---|---|---|---|---|
| S1_narrow_group | P4 | REAL exit0 | `1cf3edc52449` | `0a2bfbe503c7` | label=5.76 |
| S1_narrow_group | P5 | REAL exit0 | `8b2940ba5d3c` | `e7f85d1db4ce` | label=25.51 |
| S1_narrow_group | P5b | REAL exit0 | `1cf3edc52449` | `0a2bfbe503c7` | label=5.76 |
| S2_rotated_group | P4 | REAL exit0 | `dd85c436c49e` | `3620b7bf7f8b` | ribbon_label=4.86 |
| S2_rotated_group | P5 | REAL exit0 | `533aa62285b4` | `914817234f9e` | ribbon_label=48.60 |
| S2_rotated_group | P5b | REAL exit0 | `dd85c436c49e` | `3620b7bf7f8b` | ribbon_label=4.86 |
| S3_extreme_strip | P4 | REAL exit0 | `29de2f9b531f` | `0ea4edb05f0e` | h=3.20, s=1.80, c=2.00 |
| S3_extreme_strip | P5 | REAL exit0 | `1df404d878fe` | `218128265b2b` | h=27.55, s=15.50, c=17.22 |
| S3_extreme_strip | P5b | REAL exit0 | `ee25e33e2ecf` | `ec93c50cb0f1` | h=27.55, s=15.50, c=17.22 |
| S4_extreme_tall | P4 | REAL exit0 | `bdd5fb3d89f8` | `9530ae81dc3a` | tall1=3.00, tall2=2.40 |
| S4_extreme_tall | P5 | REAL exit0 | `de83b40fb54c` | `0d7b59ed0ee2` | tall1=12.71, tall2=10.17 |
| S4_extreme_tall | P5b | REAL exit0 | `de83b40fb54c` | `0d7b59ed0ee2` | tall1=12.71, tall2=10.17 |

## Ink-bound ledger
| case | variant | id | grp | rot | px | pred lines | pred w | ink w | ink h | ratio | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|
| L3 | P4 | headline | - | 0 | 2.67 | 4 | 60.0 | 44 | 13 | UNRELIABLE (0.73) | font<3px;overlaps:subhead;bg-not-uniform |
| L3 | P4 | subhead | - | 0 | 1.47 | 3 | 55.0 | 50 | 5 | UNRELIABLE (0.91) | font<3px;overlaps:headline;overlaps:badge1_bg;overlaps:badge2_bg;overlaps:badge3_bg;bg-not-uniform |
| L3 | P4 | badge1_label | badge1 | 0 | 1.00 | 1 | 17.0 | 20 | 3 | UNRELIABLE (1.18) | font<3px;overlaps:badge2_bg;overlaps:badge2_label;bg-not-uniform |
| L3 | P4 | badge2_label | badge2 | 0 | 1.00 | 1 | 19.0 | 22 | 3 | UNRELIABLE (1.16) | font<3px;overlaps:badge1_bg;overlaps:badge1_label;overlaps:badge3_bg;overlaps:badge3_label;bg-not-uniform |
| L3 | P4 | badge3_label | badge3 | 0 | 1.00 | 1 | 13.0 | 18 | 3 | UNRELIABLE (1.38) | font<3px;overlaps:badge2_bg;overlaps:badge2_label;bg-not-uniform |
| L3 | P4 | cta_label | cta | 0 | 1.47 | 1 | 18.0 | 28 | 3 | UNRELIABLE (1.56) | font<3px;bg-not-uniform |
| L3 | P4 | ribbon_label | ribbon | -12 | 1.33 | 1 | 14.0 | 21 | 7 | UNRELIABLE (1.50) | rotated;font<3px;bg-not-uniform |
| L3 | P4 | legal_text | - | 0 | 1.00 | 2 | 54.0 | 59 | 3 | UNRELIABLE (1.09) | font<3px;overlaps:holiday_watermark;bg-not-uniform |
| L3 | P5 | headline | - | 0 | 13.95 | 2 | 709.0 | 680 | 34 | UNRELIABLE (0.96) | overlaps:logo;overlaps:product;overlaps:ribbon_label;bg-not-uniform |
| L3 | P5 | subhead | - | 0 | 7.67 | 1 | 704.0 | 634 | 11 | UNRELIABLE (0.90) | overlaps:badge1_label;overlaps:badge2_label;overlaps:badge3_label;overlaps:cta_label;overlaps:legal_text;bg-not-uniform |
| L3 | P5 | badge1_label | badge1 | 0 | 6.00 | 1 | 52.0 | 52 | 5 | UNRELIABLE (1.00) | overlaps:subhead |
| L3 | P5 | badge2_label | badge2 | 0 | 6.00 | 1 | 72.0 | 72 | 5 | UNRELIABLE (1.00) | overlaps:subhead |
| L3 | P5 | badge3_label | badge3 | 0 | 6.00 | 1 | 44.0 | 43 | 5 | UNRELIABLE (0.98) | overlaps:subhead |
| L3 | P5 | cta_label | cta | 0 | 7.67 | 1 | 105.0 | 97 | 7 | UNRELIABLE (0.92) | overlaps:subhead;bg-not-uniform |
| L3 | P5 | ribbon_label | ribbon | -12 | 6.97 | 1 | 49.0 | 42 | 14 | UNRELIABLE (0.86) | clipped-by-canvas;rotated;overlaps:headline;bg-not-uniform |
| L3 | P5 | legal_text | - | 0 | 6.00 | 1 | 336.0 | 336 | 6 | UNRELIABLE (1.00) | overlaps:subhead;bg-not-uniform |
| L3 | P5b | headline | - | 0 | 13.95 | 2 | 709.0 | 644 | 34 | UNRELIABLE (0.91) | overlaps:logo;overlaps:product;bg-not-uniform |
| L3 | P5b | subhead | - | 0 | 7.67 | 1 | 704.0 | 634 | 10 | UNRELIABLE (0.90) | overlaps:legal_text;bg-not-uniform |
| L3 | P5b | badge1_label | badge1 | 0 | 1.00 | 1 | 17.0 | 20 | 3 | UNRELIABLE (1.18) | font<3px;overlaps:badge2_bg;overlaps:badge2_label;bg-not-uniform |
| L3 | P5b | badge2_label | badge2 | 0 | 1.00 | 1 | 19.0 | 22 | 3 | UNRELIABLE (1.16) | font<3px;overlaps:badge1_bg;overlaps:badge1_label;overlaps:badge3_bg;overlaps:badge3_label;bg-not-uniform |
| L3 | P5b | badge3_label | badge3 | 0 | 1.00 | 1 | 13.0 | 18 | 3 | UNRELIABLE (1.38) | font<3px;overlaps:badge2_bg;overlaps:badge2_label;bg-not-uniform |
| L3 | P5b | cta_label | cta | 0 | 1.47 | 1 | 18.0 | 28 | 3 | UNRELIABLE (1.56) | font<3px;bg-not-uniform |
| L3 | P5b | ribbon_label | ribbon | -12 | 1.33 | 1 | 14.0 | 21 | 7 | UNRELIABLE (1.50) | rotated;font<3px;bg-not-uniform |
| L3 | P5b | legal_text | - | 0 | 6.00 | 1 | 336.0 | 336 | 6 | UNRELIABLE (1.00) | overlaps:subhead;bg-not-uniform |
| S1_narrow_group | P4 | label | g1 | 0 | 5.76 | 2 | 54.0 | 44 | 10 | UNRELIABLE (0.81) | bg-not-uniform |
| S1_narrow_group | P5 | label | g1 | 0 | 25.51 | 4 | 111.0 | 106 | 111 | 0.95 | - |
| S1_narrow_group | P5b | label | g1 | 0 | 5.76 | 2 | 54.0 | 44 | 10 | UNRELIABLE (0.81) | bg-not-uniform |
| S2_rotated_group | P4 | ribbon_label | ribbon | -12 | 4.86 | 2 | 56.0 | 64 | 22 | UNRELIABLE (1.14) | rotated;bg-not-uniform |
| S2_rotated_group | P5 | ribbon_label | ribbon | -12 | 48.60 | 1 | 712.0 | 74 | 32 | UNRELIABLE (0.10) | clipped-by-canvas;rotated |
| S2_rotated_group | P5b | ribbon_label | ribbon | -12 | 4.86 | 2 | 56.0 | 64 | 22 | UNRELIABLE (1.14) | rotated;bg-not-uniform |
| S3_extreme_strip | P4 | h | - | 0 | 3.20 | 2 | 48.0 | 44 | 8 | UNRELIABLE (0.92) | bg-not-uniform |
| S3_extreme_strip | P4 | s | - | 0 | 1.80 | 1 | 25.0 | 21 | 1 | UNRELIABLE (0.84) | font<3px;overlaps:c;bg-not-uniform |
| S3_extreme_strip | P4 | c | - | 7 | 2.00 | 1 | 8.0 | 8 | 4 | UNRELIABLE (1.00) | rotated;font<3px;overlaps:s |
| S3_extreme_strip | P5 | h | - | 0 | 27.55 | 1 | 612.0 | 608 | 27 | 0.99 | - |
| S3_extreme_strip | P5 | s | - | 0 | 15.50 | 1 | 234.0 | 231 | 11 | UNRELIABLE (0.99) | overlaps:c |
| S3_extreme_strip | P5 | c | - | 7 | 17.22 | 1 | 90.0 | 86 | 23 | UNRELIABLE (0.96) | clipped-by-canvas;rotated;overlaps:s |
| S3_extreme_strip | P5b | h | - | 0 | 27.55 | 1 | 612.0 | 608 | 27 | 0.99 | - |
| S3_extreme_strip | P5b | s | - | 0 | 15.50 | 1 | 234.0 | 231 | 11 | 0.99 | - |
| S3_extreme_strip | P5b | c | - | 7 | 17.22 | 1 | 90.0 | 86 | 22 | UNRELIABLE (0.96) | rotated |
| S4_extreme_tall | P4 | tall1 | - | 0 | 3.00 | 1 | 37.0 | 37 | 3 | UNRELIABLE (1.00) | bg-not-uniform |
| S4_extreme_tall | P4 | tall2 | - | 0 | 2.40 | 1 | 30.0 | 23 | 1 | UNRELIABLE (0.77) | font<3px |
| S4_extreme_tall | P5 | tall1 | - | 0 | 12.71 | 3 | 55.0 | 50 | 40 | UNRELIABLE (0.91) | overlaps:tall2 |
| S4_extreme_tall | P5 | tall2 | - | 0 | 10.17 | 3 | 56.0 | 56 | 33 | UNRELIABLE (1.00) | overlaps:tall1 |
| S4_extreme_tall | P5b | tall1 | - | 0 | 12.71 | 3 | 55.0 | 50 | 40 | UNRELIABLE (0.91) | overlaps:tall2 |
| S4_extreme_tall | P5b | tall2 | - | 0 | 10.17 | 3 | 56.0 | 56 | 33 | UNRELIABLE (1.00) | overlaps:tall1 |

## Group ledger
| case | variant | group | plate | label | json label in plate | json plate aabb in canvas | json rot | plate mask px | plate ink bbox | label ink in plate ink | plate axis deg (px) | flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L3 | P4 | badge1 | badge1_bg | badge1_label | yes | yes | 0 | 43 | (332, 68, 355, 75) | 1px label-colour in plate bbox | 8.1 | label<3px: ink unreliable |
| L3 | P4 | badge2 | badge2_bg | badge2_label | yes | yes | 0 | 46 | (353, 68, 375, 71) | 2px label-colour in plate bbox | 0.0 | label<3px: ink unreliable |
| L3 | P4 | badge3 | badge3_bg | badge3_label | yes | yes | 0 | 41 | (373, 68, 394, 75) | 1px label-colour in plate bbox | -9.3 | label<3px: ink unreliable |
| L3 | P4 | cta | cta_bg | cta_label | yes | yes | 0 | 124 | (347, 70, 381, 79) | 5px label-colour in plate bbox | 0.0 | label<3px: ink unreliable |
| L3 | P4 | ribbon | ribbon_bg | ribbon_label | yes | yes | -12 | 42 | (378, 1, 397, 7) | none found | -12.4 | label<3px: ink unreliable;rotated plate: bbox corners include background, label-colour count UNRELIABLE |
| L3 | P5 | badge1 | badge1_bg | badge1_label | NO | yes | 0 | 57 | (332, 68, 355, 75) | none found | 6.8 | - |
| L3 | P5 | badge2 | badge2_bg | badge2_label | NO | yes | 0 | 62 | (353, 68, 375, 71) | none found | 0.0 | - |
| L3 | P5 | badge3 | badge3_bg | badge3_label | NO | yes | 0 | 51 | (373, 68, 394, 75) | none found | -8.6 | - |
| L3 | P5 | cta | cta_bg | cta_label | NO | yes | 0 | 138 | (347, 70, 381, 79) | none found | 0.0 | - |
| L3 | P5 | ribbon | ribbon_bg | ribbon_label | NO | yes | -12 | 56 | (378, 1, 397, 7) | none found | -11.9 | rotated plate: bbox corners include background, label-colour count UNRELIABLE |
| L3 | P5b | badge1 | badge1_bg | badge1_label | yes | yes | 0 | 43 | (332, 68, 355, 75) | 1px label-colour in plate bbox | 8.1 | label<3px: ink unreliable |
| L3 | P5b | badge2 | badge2_bg | badge2_label | yes | yes | 0 | 46 | (353, 68, 375, 71) | 2px label-colour in plate bbox | 0.0 | label<3px: ink unreliable |
| L3 | P5b | badge3 | badge3_bg | badge3_label | yes | yes | 0 | 41 | (373, 68, 394, 75) | 1px label-colour in plate bbox | -9.3 | label<3px: ink unreliable |
| L3 | P5b | cta | cta_bg | cta_label | yes | yes | 0 | 124 | (347, 70, 381, 79) | 5px label-colour in plate bbox | 0.0 | label<3px: ink unreliable |
| L3 | P5b | ribbon | ribbon_bg | ribbon_label | yes | yes | -12 | 42 | (378, 1, 397, 7) | none found | -12.4 | label<3px: ink unreliable;rotated plate: bbox corners include background, label-colour count UNRELIABLE |
| S1_narrow_group | P4 | g1 | plate | label | yes | yes | 0 | 1140 | (24, 288, 96, 306) | 17px label-colour in plate bbox | 0.3 | - |
| S1_narrow_group | P5 | g1 | plate | label | NO | yes | 0 | 1296 | (24, 288, 96, 306) | none found | 0.0 | - |
| S1_narrow_group | P5b | g1 | plate | label | yes | yes | 0 | 1140 | (24, 288, 96, 306) | 17px label-colour in plate bbox | 0.3 | - |
| S2_rotated_group | P4 | ribbon | ribbon_bg | ribbon_label | yes | yes | -12 | 1036 | (328, 20, 400, 52) | 996px label-colour in plate bbox | -11.8 | rotated plate: bbox corners include background, label-colour count UNRELIABLE |
| S2_rotated_group | P5 | ribbon | ribbon_bg | ribbon_label | NO | yes | -12 | 847 | (328, 21, 400, 52) | 1227px label-colour in plate bbox | -12.6 | rotated plate: bbox corners include background, label-colour count UNRELIABLE |
| S2_rotated_group | P5b | ribbon | ribbon_bg | ribbon_label | yes | yes | -12 | 1036 | (328, 20, 400, 52) | 996px label-colour in plate bbox | -11.8 | rotated plate: bbox corners include background, label-colour count UNRELIABLE |
