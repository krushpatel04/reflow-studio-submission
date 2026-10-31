# Bounded #148 diagnosis (macOS only)

Ran October15 within the secondary ten-minute diagnostic budget, after the #147 review-ready candidate. No production change is proposed for spacing.

50 untouched actual-renderer images: five strings, sizes6/6.67/7/8/8.15, rotations0/−12, identical pinned SolsticeSans-Bold face. [diagnosis.json](diagnosis.json) records every image SHA256, actual renderer/font event, Skia advance/position array and platform. Exactly one real call and zero fallback per image. All20 fractional-vs-integer pairs (6.67vs6,8.15vs8 across five strings/two rotations) produced identical PNG bytes in these roomy boxes. This isolates float-size truncation in drawing from wrap effects for these cases; it does not isolate the reported cross-platform gap defect.

Observed renderer code: pinned `cr_renderer/text_utils.py` `make_blob` constructs `skia.Font(typeface,int(fontSize))`, uses `getXPos(glyphs)` plus letter spacing, and builds a positioned text blob. Measured Skia default on this host has subpixel disabled and linear_metrics disabled. The glyph advances are fractional on macOS. These are observed mechanics, not proof that enabling subpixel positioning or raising a global floor fixes Linux spacing.

[size-sweep-2x.png](size-sweep-2x.png) shows native pixels with nearest-neighbour2x enlargement (whitespace crop only). AI inspection sees a narrower word space in `NEW FLAVOR` at6 than7/8; this is not a human judgment or a quantitative quality gate. Raw1x images remain available. Source strings are unchanged. No renderer monkeypatch, model call, global floor change, Linux run or human acceptance occurred.

Next owner/action: typography reviewer reproduces these same strings and sizes on Linux with identical hashes/pins, checks raw1x and2x gaps, then selects a bounded causal experiment. Keep issue148 open. Font-size rounding is demonstrated; the cross-platform spacing cause remains unisolated.

Reproduce with pinned environment from repository root:

```sh
CHAMELEON_UPSTREAM=<a44a060 checkout> PYTHONPATH=. python docs/evidence/2026-10-15-legal-line/spacing/reproduce.py
```

The script writes fresh output under `reports/two-hour/A/spacing`, separate from this archive. The displayed contact sheet is a derived inspection aid, not another renderer output.
