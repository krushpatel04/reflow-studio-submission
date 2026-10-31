# Worker font loading and format inspection — October 29, 2026

[Plan and red/green evidence](../../plans/2026-10-29-viewer-efficiency.md). Baseline: `f14d8312e1206a030593f4115062b78b78efb9fc`. The Python submission engine is a separate path; these timings describe the TypeScript development viewer.

## Less repeated font work

Each worker previously loaded all 34 bundled font faces serially. The source now determines which family, weight and Unicode subsets are needed. Independent loads run concurrently, then enter the font set in declaration order. Overlapping subsets and the typography line-height reference remain available. Empty or unsupported copy conservatively retains every matching subset. Worker isolation, cancellation, deadlines and strict SVG-export validation remain intact.

Seven alternating baseline/candidate pairs for the Latin sample in the final browser run:

| Measurement | Before | After |
| --- | ---: | ---: |
| FontFace loads per request | 34 | 8 |
| Encoded font resource bytes loaded | 463,368 | 121,740 |
| Median font setup | 43.0 ms | 9.7 ms |
| Median request, including layout | 92.3 ms | 57.8 ms |

This is about 37% lower median request latency in this local run, not a portable guarantee or a cold-network measurement. The browser context and server/OS caches are reused; each trial creates a fresh worker. Resource bytes describe decoded resource records, not uncached wire transfer. Host load affects timing: an earlier smaller run recorded 141→72 ms. Work counts are the stable comparison.

All ten fixture designs × three targets have exactly matching complete output hashes, excluding only `elapsedMs`. Additional multilingual, unsupported-character and empty-copy comparisons also match. Pure Greek and Cyrillic text are independently compared with main-thread metrics in browser tests. [Raw paired measurements](profile.json).

An unavailable unused font can no longer fail an otherwise supported request. Missing used fonts, corrupt used font files and nonlocal used URLs still produce visible failures. No font cache, worker pool, dependency or service was added.

## Easier artwork review

The existing native-size inspector now has Previous/Next format controls and a position indicator. Navigation preserves zoom and displayed source/baseline/reflow artwork, disables at boundaries, and returns focus to the original opener. It includes committed custom formats and retains committed artwork after update failures. Mobile controls are at least44px tall, with no horizontal page overflow at320/390px.

[Before](before-inspector.png) · [After](after-inspector.png) · [Mobile](after-mobile.png) · [Dark](after-dark.png) · [320px](after-narrow.png). The restrained canvas, typography and existing Express/Spectrum controls remain; the change improves an actual review task instead of adding decoration.

## Reproduce

Run the standard npm test/build/verify/benchmark/verify:browser gates. With Vite on4175, run `node docs/evidence/2026-10-29-viewer-efficiency/profile.mjs`. It obtains the baseline worker from the recorded Git commit, writes the temporary module below ignored reports, compares complete output hashes and records fresh results under `reports/viewer-efficiency-2026-10-29/`. The frozen baseline adjusts only relative import paths; all layout modules are shared and unchanged by this viewer optimization.

Remaining limits: dense content still needs honest diagnostics; unsupported glyphs are not made supported by loading fewer fonts; the existing main-bundle size warning remains. The viewer is not native Adobe integration, and these tests establish neither human preference nor a competition ranking. A final320px screenshot exposed split navigation arrows/labels. A failing browser regression caught two text fragments; buttons now keep labels on one line while the toolbar wraps whole controls. Four final inspector tests and a rebuilt production preview pass.

Final viewer checks: **744 Node tests**, build, **30 native layouts**, **30 benchmark cases /70 artifact sets** (zero selected errors/eight existing warnings), and **34 browser tests**, including20 verification-page checks. Production edit → worker → preview → inspection → export and failure/retry pass with no page errors or external requests. Astra independently reviewed the diff, screenshots and live mobile navigation at200% zoom; no blocking issue found. [Validation receipt](validation.json). Python runtime qualification is separate.
