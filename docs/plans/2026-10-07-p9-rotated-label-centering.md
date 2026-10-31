# P9: rotated plate label not centred (C2b ribbon 300x250)

Branch `jo/reflow-milestone-python-p9-rotated-label-centering`, base 82a967f. Evidence: `docs/evidence/2026-10-07-p9/` (`measurements.txt`, scripts, inputs, outputs, PNGs).

## Question
P8 README: C2b rotated ribbon at 300x250, label sits upper-left in the plate. Source-inherent or engine-introduced?

## Measures (two, both on disk)
1. Geometry: label box centre minus plate centre, in the plate's rotated frame (`geom.py`).
2. Ink: centroid of rendered label pixels inside the plate, in the plate's rotated frame (`ink_*.py`, genuine renderer PNGs). Tolerance for a "defect" would be set from the source ink offset, since the engine cannot change what the renderer draws inside a box.

## Result
| case | geometry offset (u,v) | ink offset u/pw, v/ph |
|---|---|---|
| C2b source 1000x1000 rendered, NO resize | 0, 0 | -0.152, -0.272 |
| C2b output 300x250 | 0, 0 | -0.106, -0.271 |
| C2a output 728x90 | 0, 0 | -0.083, -0.280 |
| C2b source with `text_align=center`, no resize | 0, 0 | -0.003, -0.272 |
| public L3 1080x1350 (source align=center, box h/ph 0.63) | 0, 0 | -0.005, -0.055 |
| public L3 -> 120x600 | 0, 0 | -0.004, -0.067 |

Reading: label box is exactly centred on the plate in source and in every output (engine preserves it). The off-centre look appears already in the unresized source render; v/ph is the same (-0.27) before and after resize. Cause is the synthetic input: `text_align` unset (renderer default left) and a 180px-tall box around one 48px line, which the renderer draws from the top of the box. The public L3 ribbon (centre-aligned, snug box) is within 0.07 of ph. u/pw differs across sizes only because left-aligned ink width relative to the plate changes with the text-fit; not a position change.

## Decision
Source-inherent. No RED test, no engine change, no mutants, no full validation needed (engine/ untouched; L1-L3 byte-identity trivially holds). Evidence-only.

Limits: ink centroid is of near-black pixels over the red plate (anti-aliasing included); single font/renderer build; no claim on layout quality. Upstream renderer vertical-text placement is out of scope (not our code).
