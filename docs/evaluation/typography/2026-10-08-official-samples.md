# Typography review — official public samples, October 8, 2026

Reviewer: JunhoHwoang (JH-02, [#105](https://github.com/kj-squared-labs/reflow-studio/issues/105), parent #3). Source `0ed00ca`, upstream `a44a060`. Evidence, commands and hashes: [docs/evidence/jh-02](../../evidence/jh-02/README.md).

This is a human review of rendered output. It records findings for the engine and renderer owners and changes no code. Verdicts on readability are review opinions at the stated scale, not measured thresholds.

## What was reviewed

The three public samples were rendered by the current engine through the real upstream renderer on macOS: 3 REAL calls, 0 fallback, identical across two runs. The engine's design JSON matches the team's pinned hashes for all three samples. The same JSON produces **different pixels** in the Linux renders retained by RF-02 and RF-03 (`docs/evidence/rf-02/png/candidate.png`, `docs/evidence/rf-03/png/after_728x90.png`): 1.5% of Level 2 pixels and 16% of Level 3 pixels differ. Both are compared below. The submission runs on Linux, so the Linux images are the closer stand-in for what is scored. They were rendered by the channels, not by this review.

| Sample | Target | Text elements | Clean at 1× | Findings |
| --- | --- | --- | --- | --- |
| level1_warmup | 1080×1350 | 2 (60 px, 30 px) | yes | none |
| level2_core | 1600×400 | 4 (56, 24, 6.67, 8.15 px) | headline and subhead yes; labels marginal | F2, F3, F5, F7 |
| level3_advanced | 728×90 | 8 (11.3 px headline, seven at 6 px) | no | F1, F2, F3, F4, F5, F6 |

Supplied faces: every text element rendered with the pinned Solstice face (the RF-01 probe raises on fallback or a hash mismatch). **Matching font bytes did not guarantee matching glyph placement or line breaks across platforms**; see F2 and F6.

## Findings

Severity: **defect** = content visibly lost or wrong; **risk** = degrades readability or depends on environment; **known limit** = already recorded, now seen in real output.

### F1 — Level 3 legal line is cut off (defect on macOS; thin margin on Linux)

`legal_text` (6 px, box 344 × 7.2 at y 80.6 on a 90 px canvas) wraps on macOS as `…See solstice.com/terms for full` / `details.`. The second line is drawn at y 88–95, so **84 px of ink falls off the canvas**: the probe reports clipped, overflow 90 px. On the Linux evidence render the whole sentence fits on one line. Legal copy must stay fully visible. Here that depends on sub-pixel text width, and the box leaves no room for a second line. Image: [`l3_legal_4x.png`](../../evidence/jh-02/png/l3_legal_4x.png).

### F2 — Letter and word spacing breaks at small sizes, differently per platform (defect)

At 6–8 px the gaps between letters and words become uneven:

| Label | macOS | Linux evidence |
| --- | --- | --- |
| L3 ribbon (6 px, −12°) | `SUNSET SALE` correct | `S UN S ETS ALE` |
| L3 badge 2 (6 px) | `A WARD WINNING 2026` | `AWARD WINNING 2026` |
| L3 badge 3 (6 px) | `SMALL BATCH` | `S MALL BATCH` |
| L2 badge (6.67→6 px) | `NEWFLAVOR` (space nearly gone) | `NEW FLAVOR` |
| L2 CTA (8.15→8 px) | `SummerLine` (space nearly gone) | `Shop  the  Summer  Li ne` (uneven gaps) |

Readers will see words split or merged. Glyphs appear to be placed at whole pixels at these sizes, consistent with RF-01's notes (advance-only positioning, no kerning, size truncated to an integer). The cause has not been isolated here. Images: [`l3_labels_4x.png`](../../evidence/jh-02/png/l3_labels_4x.png), [`l2_badge_4x.png`](../../evidence/jh-02/png/l2_badge_4x.png), [`l2_cta_4x.png`](../../evidence/jh-02/png/l2_cta_4x.png).

### F3 — Most Level 3 copy renders at 6 px (risk)

Seven of eight Level 3 text elements are drawn at 6 px: the subhead (6.21→6), the three badges, the CTA, the ribbon and the legal line. On Level 2, the badge is 6 px and the CTA 8 px. At 1× the legal line and the subhead are barely readable; at 2× they are readable (review opinion). 6 px is the engine's floor, so F1 and F2 are concentrated in exactly this text. Image: [`l3_full_2x.png`](../../evidence/jh-02/png/l3_full_2x.png).

### F4 — Line breaks differ between macOS and Linux (risk)

Upstream wraps with Skia metrics at the float size, and those metrics differ by platform. The Level 3 headline breaks as `…Exclusively for Golden` / `Hour Gatherings` on macOS but `…Exclusively for` / `Golden Hour Gatherings` on Linux. The F1 legal line breaks only on macOS. A layout checked on a Mac does not predict the scored Linux output line for line. Image: [`l3_full_2x.png`](../../evidence/jh-02/png/l3_full_2x.png).

### F5 — Fractional sizes draw smaller than they are measured (known limit, visible)

The renderer draws `int(font_size)` but wraps at the float size (RF-01): 6.67→6, 8.15→8, 11.30→11, 6.21→6. Text is up to 1 px smaller than the engine fitted. It never overflows for this reason, but lines are measured as if they were wider than they draw. This feeds F2.

### F6 — Serif kerning is not applied (known limit, visible)

Solstice Serif has a `kern` feature, but the renderer positions glyphs by advance only (RF-01, and the probe notes for every Serif headline here). Solstice Sans has no `kern` feature, so this affects headlines only. This review did not isolate kerning pairs in pixels.

### F7 — Level 2 headline descender extends below its box (risk, minor)

The `Chase the Light` ink is narrower than its box (419 vs 433 px), but the `g` descender sits about 5 px below the box bottom: overflow 66 px, nothing clipped, nothing overlapped. The subhead's one-word last line `hour.` was already recorded by RF-02. Image: [`l2_headline_subhead_2x.png`](../../evidence/jh-02/png/l2_headline_subhead_2x.png).

## Not findings

- **Rotation.** The −12° ribbon label stays inside its rotated plate on both platforms. Its problem is spacing (F2), not rotation.
- **Layering.** No text is covered by another element. The dots near the Level 1 CTA and the Level 2 subhead are background art drawn beneath the text.
- **Level 1.** Both texts are one line, unclipped and readable.

## Not reviewed

- Package A's source-fidelity handoff (KR-01 has not delivered a bundle yet).
- Corpus, validation and held-out inputs.
- Targets other than each sample's own.
- A Linux render produced by this reviewer.
- Contrast measurement.
- Visual quality beyond typography.
