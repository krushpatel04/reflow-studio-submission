# Medium-aspect campaign readability — October 29, 2026

[Plan](../../plans/2026-10-29-medium-campaign.md) · [Final macOS comparisons](comparison.json) · [Reproduction script](compare.py) · [Provisional Linux receipt](linux-provisional/receipt.json).

Baseline: `f14d8312e1206a030593f4115062b78b78efb9fc`. Final candidate composition SHA256: `321325d2b14715b3b99c3dfb2826fa02dc067386312c49ef390e4014934a417f`. Other engine files are unchanged and fingerprinted in the comparison receipt. The macOS comparisons and provisional Linux renders are source-bound development evidence. The final clean rebuild and expanded Linux checks now pass on commit `14b973861faed93378a7b24f84e13931249df308`; see [final integration](integration.md).

## Demonstrated improvement

The public Level 3 campaign at 300×250 previously used 6px labels/legal and approximately 6.9px body copy, with a watermark/legal overlap. The guarded medium arrangement places the product and headline beside each other, fits supporting copy across the canvas, keeps plate/label groups together in measured rows, and retains source-footer art/legal below the groups. Header artwork shares the product column only when its combined width fits. Horizontal gaps remain 2px; vertical gaps try 2px first and only reduce to 1px when measured height requires it. Roles never depend on IDs or missing-asset status.

| Target | Headline before → after | Body before → after | Minimum text before → after |
| --- | --- | --- | --- |
|300×250|12.55→13|6.90→9|6→9|
|301×251|12.55→13|6.90→9|6→9|
|320×250|13.95→14|7.67→9|6→9|
|250×300|9.15→10|6→9|6→9|
|600×500|12.55→30|6.90→20|6→15|

Final type sizes agree across the macOS comparison and provisional Linux renders. No individual prior text or main product is made smaller. The Linux correction changes placement/spacing only; it does not reduce the already-reviewed ancillary artwork sizes. Protected source fields, element/paint order, groups and assets remain intact. The missing source asset still produces its official placeholder and warning, kept clear of legal copy.

| Target | macOS before | macOS after | Provisional Linux after |
| --- | --- | --- | --- |
|300×250|[Before](300x250-before.png)|[After](300x250-after.png)|[Linux](linux-provisional/300x250.png)|
|301×251|[Before](301x251-before.png)|[After](301x251-after.png)|[Linux](linux-provisional/301x251.png)|
|320×250|[Before](320x250-before.png)|[After](320x250-after.png)|[Linux](linux-provisional/320x250.png)|
|250×300|[Before](250x300-before.png)|[After](250x300-after.png)|[Linux](linux-provisional/250x300.png)|
|600×500|[Before](600x500-before.png)|[After](600x500-after.png)|[Linux](linux-provisional/600x500.png)|

Astra inspected all five final Linux PNGs at native size and the earlier/final representative macOS renders. The compact 250×300 case retains limited headline/body contrast but improves the small copy and keeps the product visible. This is AI review of exposed cases, not human acceptance or a prediction of competition placement.

## Conservative boundaries and acceptance evidence

The exception applies only to medium targets whose established output contains text at or below the existing 6px fitter floor and whose strict campaign structure qualifies. Other patterns retain their aspect guards. Healthy medium outputs, including 728×600 rigid groups, and the same source canvas retain fallback. Unsupported groups/typography, obstructing shapes and impossible small targets also keep fallback. Accepted candidates preserve prior text-size minima and measure full text against both the pinned renderer and independent Pillow BASIC wrapping.

- Initial [RED](red.txt): five tests and seven expected readability/collision failures. An [identity regression](identity-red.txt) separately caught unwanted recomposition of an unchanged canvas with authored 8px legal copy.
- First candidate `1a83391c…` failed the [551-test full gate with three failures](rejected-full-gate.txt): rigid groups at 728×600 and independent headline/subhead containment at 300×250. Its [comparison receipt](rejected-comparison.json) is historical. The [all-text BASIC regression](dual-metrics-red.txt) produced 18 expected failures before narrowing the trigger and fixing metrics. Original tests were not changed.
- Second candidate `aa46e1fc…` passed the [61-test macOS focused gate](regression-focused.txt) and later root's full 552-test gate, but failed Linux visual acceptance at 300×250 and 301×251. The [macOS-only receipt](mac-only-comparison.json) is superseded. [Linux integration receipt](linux-integration-rejected.json) and [rejected image](linux-integration-rejected-300x250.png) distinguish successful offline execution from failed visual quality. The exact-image [RED](linux-red.txt) reproduces both real watermark/legal overlaps; the [metric probe](linux-probe.txt) records the excess measured height.
- The correction places fitting header artwork above the product within its column. An initial centered alignment collided with preserved tiny decoration on macOS; that [failed control](mac-linux-correction-focused.txt) is retained. Left alignment fixes the collision without moving the decoration or reducing artwork.
- Final source: **61/61 macOS tests pass in 23.647s**, zero skips ([log](mac-linux-correction-final.txt)): complete group-scale/text-fit modules plus all eight medium tests. **19/19 Linux medium/group tests pass in 22.559s**, zero skips ([log](linux-correction-final.txt)), including independent BASIC measurements and real renderer ink. Linux tests used read-only test/module/fontTools mounts; no dependency was added to the production image.
- The generic headline ink probe's pessimistic padding exceeds its 60M-pixel cap. The test instead compares the full unchanged copy on the actual and a bounded padded canvas, requires identical ink and checks its box. Other text uses the existing probe. No safety limit was relaxed.
- Final comparison: three original public outputs, wide 970×250, tall 160×600/300×900, ordinary identity and authored-small-text identity are unchanged as full canonical JSON. The 36-target macOS sweep changes **22 cases**, preserving protected fields, bounds, minimum type, prior text sizes and cross-group separation; **14 retain exact fallback**. This is not a Linux sweep or a hidden-set result.

Earlier setup errors remain disclosed: a broader command initially named a nonexistent test module; an ad hoc render initially imported the starter engine through path precedence. Those renders were discarded and both sides regenerated from frozen packages. The archived script binds the exact packages, clean pinned starter SHA and converter hash. The earlier [seven-test](medium-final.txt) and [56-test](focused-final.txt) logs belong to predecessor sources.

## Performance and reproduction

The extra alternatives cost layout time. Final-source five-trial alternating macOS medians: 300×250 **71→162ms**, 250×300 **20→180ms**, 600×500 **18→87ms**. Root paused full Python testing; Linux render generation overlapped part of the run. These are local warm layout-only measurements, not controlled hardware or container latency. The change makes no speedup claim. The finite existing size search remains; healthy cases exit early.

```sh
CHAMELEON_UPSTREAM="$PWD/.cache/chameleon" .cache/venv/bin/python -m unittest tests_python.test_group_scale tests_python.test_text_fit tests_python.test_campaign_medium -q
CHAMELEON_UPSTREAM="$PWD/.cache/chameleon" .cache/venv/bin/python docs/evidence/2026-10-29-medium-campaign/compare.py
```

Fresh reports stay under `reports/medium-campaign-20261029/`. Linux provisional rendering uses [this script](linux-provisional/render.py) in the prior amd64 image with current composition mounted read-only; the receipt explicitly marks that distinction. The subsequent clean-source image qualification and five-format readback passed; all five final image hashes exactly match the reviewed images above. See [final integration](integration.md) for the immutable image identity and receipts. Unknown designs, platform differences, human preference and official submission decisions remain separate. No new dependency, external API, model, native integration, sealed input or global cache is involved.
