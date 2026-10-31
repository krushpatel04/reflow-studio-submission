# JH-02 evidence: typography review of the official samples (slice 1)

Recorded October 8, 2026. Issue [#105](https://github.com/kj-squared-labs/reflow-studio/issues/105), parent #3. Plan: [jh-02-2026-10-13.md](../../plans/jh-02-2026-10-13.md). Findings: [typography review](../../evaluation/typography/2026-10-08-official-samples.md).

Read-only review. No engine, helper or test file is changed.

## Environment

| | |
| --- | --- |
| Source | `0ed00ca` (branch `jh/jh-02-typography-review`) |
| Upstream | `a44a06046b0413f0785e7203955c3822e0acbc32` |
| Host | macOS 15.6.1, Apple silicon; Python 3.11.13 is an **x86_64 build running under Rosetta** |
| Packages | skia-python 144.0.post2, Pillow 12.3.0, numpy 2.4.6, installed from the repo's pinned requirements and constraints |
| Install note | This Python reports macOS as 10.16, so pip rejects the `macosx_11_0` skia wheel. Installing with `SYSTEM_VERSION_COMPAT=0` fixes it |

## Commands

The README reproduction, with `SYSTEM_VERSION_COMPAT=0` exported:

```sh
sh submission/assemble_context.sh "$RUN_ROOT/context" "$CHAMELEON_UPSTREAM"
cp -R "$CHAMELEON_UPSTREAM/input" "$RUN_ROOT/context/input"
(cd "$RUN_ROOT/context" && python -m engine.main)
PYTHONPATH=. python docs/evidence/rf-02/hashes.py              # design hashes vs pinned
PYTHONPATH=. python docs/evidence/jh-02/elements.py <output_dir>  # per-element table + controls
```

Real-renderer proof used the same instrumentation as `scripts/offline_submission_smoke.py`: it wraps `render_design_to_png` and `_fallback_render` and counts calls.

## Provenance and determinism

| Sample | Input SHA-256 | Output JSON SHA-256 | Output PNG SHA-256 (macOS) |
| --- | --- | --- | --- |
| level1_warmup | `79f889a1…ea6` | `97193ea3…cbcf6` | `6ef5efa6…ecbba` |
| level2_core | `c37407fa…a04b` | `b31edc4e…34cd` | `edb21cea…f6fe` |
| level3_advanced | `fd99e397…cf33` | `f4f9c3a4…789c` | `1af1d772…0cb8` |

Full hashes are in [`elements.json`](elements.json).

- **Real rendering.** 3 REAL renderer calls, 0 FALLBACK, no warnings, exit 0. The engine's self-check reported one warning: `deco_circle_1` is off-canvas on Level 2. It is a decoration, not text.
- **Engine output matches the pins.** Design hashes from `hashes.py` equal the test pins: `5553467c…` (L1), `4aeec49c…` (L2), `f00cb4a1…` (L3, after the RF-03 fix).
- **Deterministic.** Two complete runs produced byte-identical JSON and PNG files.
- **Platform difference.** The same design JSON renders differently on Linux. Against the retained Linux renders, 9,516 of 640,000 pixels differ on Level 2 (`rf-02/png/candidate.png`) and 10,572 of 65,520 on Level 3 (`rf-03/png/after_728x90.png`). The differences are text placement and line breaks; see findings F2 and F4.

## Controls

These repeat RF-01's clip pair through `elements.py`. Both behaved as required, so the probe-based verdicts below are usable:

- `Hello world` at x = −120 is flagged clipped with ink lost.
- The same text at x = 20 is clean.

## Per-element results

[`elements.json`](elements.json) lists, for every text element:

- content and face;
- fitted size and drawn integer size;
- box and rotation;
- the lines upstream wraps to;
- RF-01 probe ink, clipping and overflow;
- shaping notes.

Only two elements are flagged:

- `level3_advanced/legal_text`: 2 lines, clipped (84 px ink lost), overflow 90 px (F1).
- `level2_core/headline`: 66 px overflow from a descender below the box, not clipped (F7).

The probe renders left-aligned, so horizontal overflow for centred text is approximate. Neither flagged case depends on alignment.

## Images

[`png/`](png/), hashes in [`SHA256SUMS`](SHA256SUMS):

- `level*_macos.png`: the three native (1×) outputs.
- `*_2x.png`, `*_4x.png`: crops scaled with nearest-neighbour. In the pairs, macOS is on top and the retained Linux render is below.

All images were opened and inspected.

## Limits

- No Linux render was produced by this review. The Linux side is the channels' retained evidence for the same design hashes.
- Readability verdicts are one reviewer's opinion at 1× and 2×. Contrast was not measured.
- Three samples at their own targets only. No corpus, validation or held-out inputs.
- Package A's source-fidelity review is not included; KR-01 has no accepted bundle yet.
- No independent review of this evidence yet.
