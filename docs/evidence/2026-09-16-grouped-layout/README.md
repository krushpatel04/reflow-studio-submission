# Coherent mixed-role groups — September 16, 2026

Completed group-geometry slice of [#5](https://github.com/ojedaJD/reflow-studio/issues/5), based on `98b2eb1`. [Plan and execution record](../../plans/grouped-layout.md) · [Native/geometry regression tests](../../../tests/grouped-layout.test.ts) · [Browser checks](../../../tests/browser-checks.ts).

| Original badge | Before fix | After fix |
| --- | --- | --- |
| ![White label on dark backing](badge-source.png) | ![Label moved away and became invisible](badge-before.png) | ![Label stays on backing](badge-after.png) |

The engine now collects all explicit group members before role selection, so the content label and decorative/background plate share a rectangle transform. Background-only groups keep uniform geometry. A new `group-geometry` error also catches independently moved/resized members; it does not detect arbitrary occlusion or contrast problems.

## Test-first evidence

- Baseline `npm test`: 123/123 passed.
- `node_modules/.bin/tsx --test tests/grouped-layout.test.ts` on unchanged production code: **8 failures / 3 passes**. Failures included `label.x: 65 != 140.5`, missed geometry findings, and zero visible white glyph pixels inside the stack backing. Identity, intentional-layering and legal-transform controls passed.
- New `/verify.html` check: **9/10 passed** before the fix; stack glyph bounds separated from the backing. After the fix: [10/10 passed](browser-green.json), no startup errors, no glyph-bound findings.
- Final `npm test`: **134/134**; `npm run build` passes. `npm run verify` completes all **30** native layouts.

Native verification counts light glyph pixels inside the dark plate, while the browser independently checks actual SVG glyph bounds and displays all candidates. Both outputs were inspected. Vite initially served a cached pre-fix module after an edit; restarting this task's dev server with file polling resolved the test environment. No typography/renderer production change was made for that stale module.

## Benchmark and limits

All 70 benchmark editable documents and 70 PNGs remain byte-identical to the [September 15 archive](../2026-09-15/README.md). No selected strategy changed: identity 1, uniform 3, stack 19, split 7. Zero source/baseline/selected errors; 42 baseline and six selected product warnings. Sparse layouts therefore retain their prior behavior and tradeoffs.

The single native benchmark measured median 21.61 ms and p95 47.94 ms, excluding font loading/rendering; this is not a repeated performance study. Environment and hashes: [manifest](manifest.json).

[Before candidate output](badge-before.json), [after candidate output](badge-after.json), and [new observational probes](probes.json) retain all measurements and editable geometry. The mixed-role probe is now visibly repaired and reports zero errors/warnings. Eight of ten one-pixel width probes still rearrange; stability remains #12.

**#5 remains open.** Product-layout tuning and new candidate families depend on typography constraints from #3. The six product warnings, independent human comparison, broad visibility/contrast/crop diagnostics (#6), runtime bounds and Adobe integration remain separate work. Extreme-aspect tests show group coherence, not guaranteed readable output.

## Reproduce

```sh
npm test
npm run build
npm run verify
npm run benchmark
npm run review:probes
CHOKIDAR_USEPOLLING=true npm run dev
```

Visit `/verify.html` on the actual port printed by Vite. The badge comparison is at `#grouped-preview`. Fresh reports stay under ignored `reports/`; preserve this reviewed snapshot.
