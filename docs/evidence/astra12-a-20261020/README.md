# #148 acceptance reconciliation — October 20

**OPEN; no engine remedy or human acceptance.** Baseline and freshly checked
remote main: `b7e8eab86df265580fa3ffab9ccda335ee8f6ef3`.
[Plan](../../plans/astra12-a-20261020.md) · [Live issue snapshot](issue-148.json)
· [Prior render packet](../2026-10-15-linux-spacing/README.md).

## Original criteria

| Original acceptance | Evidence available | Remaining gate |
| --- | --- | --- |
| On Linux, public-sample labels have word gaps and no internal word gaps at 1x/2x, with reproducible rendering and human check | Prior packet retains 50 isolated-string inputs/renders per host, including all five strings at 6/7/8px and 2x nearest-neighbor views. Fresh archive audit below verifies retention. | Actual public-sample candidate render and real human verdict remain absent. Isolated roomy strings cannot substitute for full samples. |
| If a floor or engine change fixes it, show Level 3 before/after on Linux | No new engine change selected; original Level 3 defect remains reported in issue. | A constrained safe candidate and complete Linux Level 3 before/after are required when a remedy is proposed. This conditional criterion is not counted as a completed fix. |

## Fresh audit, historical rendering

Run from repository root with a Python environment containing Pillow:

```sh
python docs/evidence/astra12-a-20261020/audit.py
```

[Result](audit-result.json) verifies the old packet's complete SHA manifest,
100 PNG hashes and 100 input hashes across both hosts, 100 exact nearest-neighbor
2x views, 40 retained fractional/integer controls, real-render call/fallback
records, nonzero glyphs/advances and size-sensitive raster controls. The embedded
ZIP diagnoses equal the standalone diagnoses. This is a fresh audit of retained
bytes, **zero fresh renders**, not a rerun of historical Python/Node suites.
The 8px rotated Linux 2x image was visually inspected by AI; this is not the
required human verdict.

## Remedy boundary and next action

Current `engine/text_fit.py` measures Skia advances but deliberately leaves the
official renderer's hinting policy untouched. The existing diagnostic's linear
and unhinted policies only measure metrics. No alternate-policy image is present.
The per-glyph differences vary, so uniform tracking cannot exactly cancel them;
this does not prove every possible tracking/layout experiment is futile.
Changing font size is possible, but no safe full-layout improvement is established
by the existing 6/7/8 isolated-string controls. Do not adopt a blanket floor change
from these metrics or assert all engine remedies are impossible.

Return this engineering slot to root for a feasible next issue. Keep #148 open:

- Root/typography owner: choose a bounded engine candidate with full-layout
  preservation controls, or obtain the official renderer-policy constraint
  answer before considering a renderer change. No organizer message was sent.
- Engineer: after candidate selection, meaningful failing tests, smallest change,
  root-serialized required suites and actual Linux before/after renders.
- Human typography reviewer: assess the exact candidate's Linux public samples
  at 1x and 2x; record verdict and source/image hashes. AI review cannot fulfill it.
- B: review this packet at exact commit; root alone handles integration/closure.

No production or regression-test source changed. No heavy validation requested.
Reusable-skill assessment: no new skill; existing evidence/plan workflow covers
this narrow audit. This packet is review-ready reconciliation, not issue Done.
