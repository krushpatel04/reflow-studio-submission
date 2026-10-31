# Finalist-focused refinement — October 29, 2026

Qualified source: `8b0485acd90b0c23d1335c285f63a147117d44fa`. Linux/amd64 image: `sha256:424c0eea2c0651e685e61694b2261fd14bef9096b2e19d9609bab6127ce9e51d`. Baseline: `3d10c00bb6868c22937c507c910df9defbb09115`. [Plan](../../plans/2026-10-29-finalist-pass.md).

## What changed

The Python engine reuses exact font file bytes and identical glyph queries during one resize. Retention ends after success or failure, with caps of eight files / 2 MiB and 128 queries / 32,768 characters. Later requests read their own resources. Native face sharing was rejected after a compact output changed; different glyph queries keep the original native face construction, and the independent metrics and composition search remain intact.

The viewer uses quieter artboard frames and larger artwork, opens directly on artwork on mobile, and puts settings behind a keyboard-accessible disclosure. Full-size inspection can switch Reflow/Baseline without changing the grid or exported result, preserving zoom and scroll position. The 320px toolbar was iterated again to leave more room for artwork. Vite and its locked dependencies are patched; npm audit now reports zero findings. No runtime dependency was added to Python.

## Evidence

Results are technical and AI visual inspection, not human acceptance or hidden-design quality. The TypeScript viewer remains development tooling, separate from the Python submission engine.

- Full Python gate: 559 tests, zero skips. One additional complete-output comparison was added after suite discovery; the final focused suite passes all eight resource tests, covering that addition. No production Python change followed the full gate.
- **744 Node tests**, build, **30 native layouts**, **37 browser tests** including **20 verification-page checks**, and the separate production test all pass. [Validation receipt](validation.json). The build warning remains about 516kB main JavaScript /83kB gzip. Production startup observations were 362/130/138ms; page heap peaked at 11.3MB, measured retained growth was 0.11MB, and every existing resource/interaction gate passed. These are local observations, not portable guarantees.
- **Clean-source Linux/amd64 qualification passes**: three real-rendered public cases, zero box fallback, four biting controls, six failure scenarios, resource profile under 512MiB and fingerprint verification. All six public JSON/PNG hashes match the previous qualified image. The same immutable image separately passes the five compact formats with **all ten JSON/PNG hashes unchanged**, immutable inputs and deterministic repeat execution. [Qualification](qualification.json) · [Fingerprint](fingerprint.json) · [Compact ledger](compact-linux.json). Representative 300×250 and 600×500 final PNGs were inspected; their unchanged pixels are already archived in the preceding compact-layout packet.
- All ten local paired outputs and warnings match the baseline. Native-face-cache trial outputs were rejected, not published.
- Initial RED evidence: duplicate font file reads (507/157/747 vs three distinct files), duplicate native glyph queries (six vs three); mobile artwork below the viewport; missing in-preview Baseline control; narrow inspector with only 362px artwork height. Final behavior retains the original assertions except the mobile acceptance workflow now opens the new settings disclosure.
- Reviewed screenshots: [before desktop](before-desktop.png) → [after desktop](after-desktop.png), [dark theme](after-dark.png), [before mobile](before-mobile.png) → [after mobile](after-mobile.png), [320px inspector](after-inspector-320.png). Both themes were checked at 1440/390/320px with no page overflow or browser errors. The native preview retains the same artwork and exposes its warnings.

## Measured layout performance

Three alternating fresh-process pairs, six measured runs per case after warmup. Timing excludes rendering and process/container startup. No other task verification workloads ran during these final pairs; normal OS background activity remained. Full-output hashes and warnings match across every trial. [Raw measurements](comparison.json) · [Reproduction](compare.py).

| Case | Median wall time, before → after | Font file reads, before → after | Native glyph queries, before → after |
| --- | --- | --- | --- |
| chameleon_sample_level1_warmup | 0.07 → 0.07 ms | 0 → 0 | 0 → 0 |
| chameleon_sample_level2_core | 0.77 → 0.84 ms | 0 → 0 | 0 → 0 |
| chameleon_sample_level3_advanced | 36.67 → 27.50 ms | 157 → 3 | 157 → 69 |
| campaign-300x250 | 172.53 → 139.13 ms | 507 → 3 | 507 → 329 |
| campaign-301x251 | 163.17 → 152.29 ms | 507 → 3 | 507 → 329 |
| campaign-320x250 | 171.31 → 160.92 ms | 504 → 3 | 504 → 329 |
| campaign-250x300 | 206.62 → 186.28 ms | 747 → 3 | 747 → 528 |
| campaign-600x500 | 99.55 → 92.97 ms | 309 → 3 | 309 → 237 |
| campaign-20x20 | 279.58 → 200.23 ms | 560 → 3 | 560 → 62 |
| campaign-1080x1350 | 0.27 → 0.27 ms | 0 → 0 | 0 → 0 |

Public Level 3 improves about **25%** in this run (36.7→27.5ms); the five compact cases improve about **6–19%**. The no-fit 20×20 case improves about 28% but remains an unacceptable design; this is cost reduction, not improved readability. Sub-millisecond controls vary slightly and have no meaningful speed claim. Do not combine these gains with earlier optimizations or infer end-to-end container latency.

## Bottleneck disposition

| Bottleneck | Disposition |
| --- | --- |
| Repeated font I/O and identical glyph measurements | Resolved with bounded per-resize reuse. Complete output/warning comparison and resource controls guard fidelity. |
| Native face sharing changes fractional-size results | Rejected. Preserve the existing construction policy; accept only the smaller safe optimization. |
| Mobile first screen contains no artwork | Resolved: artwork first, settings disclosed on demand; keyboard and resize checks pass. |
| Closing a preview to compare baseline/reflow | Resolved: local comparison controls preserve target, zoom, scroll and exported revision. |
| Crowded 320px preview toolbar | Resolved after a second visual/test loop; three compact rows leave at least 380px for artwork at 320×640. |
| Generic dashboard framing | Refined with flatter artboards, neutral pasteboards, reduced borders and restrained typography, preserving Spectrum controls. Visual judgment remains subjective. |
| Vulnerable development dependencies | Patched within the existing Vite major; zero audit findings and lockfile/build/browser checks. |
| Viewer main-bundle warning | Compensated by measured production startup and interaction/resource gates, with the warning disclosed. No unmeasured code-splitting rewrite. |
| Existing eight synthetic benchmark warnings | Retained and inspectable; zero selected errors. No source text or assets were dropped to suppress warnings. |
| Dense/impossible targets, unsupported glyphs, unknown designs | Conservative fallbacks, visible diagnostics, full-size inspection and preserved source; these are limits, not claims of universal design quality. |
| Missing asset in public Level 3 | Preserve the official placeholder and reference; no fabricated replacement. Real-renderer controls distinguish this from box fallback. |
| Stale release candidate pointers | Correct the current handoff to the exact newly qualified source, preserving older receipts as historical. |
| Hosted CI billing failure | Complete local gates plus exact clean-source Linux qualification. Live hosted run 40961970931 had no executed steps and cites account billing/spending restrictions; owner action remains necessary to restore hosted CI. |
| Stage 1 viewer rule, judge repository access, registration and closing time | Retain the working viewer/runbook while awaiting attributable organizer and participant facts. These cannot be truthfully resolved by code or assumed from a repository URL. Existing owner issue #160 remains the source of required inputs. |
| Top-three placement | Unverified; internal tests and exposed examples cannot establish hidden-score ranking or human preference. |

## Reproduce

Follow README for pinned Python dependencies/starter. Run `python scripts/verify_python.py`, npm test/build/verify/benchmark/verify:browser and the production Playwright configuration. Run `compare.py` here with `CHAMELEON_UPSTREAM` for three alternating baseline/candidate pairs; it writes only under ignored reports and verifies complete output hashes/warnings. Use the standard clean-tree qualification harness and its exact image for the five compact inputs. CPU and wall timings exclude rendering and process startup and are not reference-machine guarantees.

Visual direction follows [Adobe's Spectrum implementation guide](https://developer.adobe.com/express/add-ons/docs/guides/build/design/implementation-guide) and [purposeful color/surface guidance](https://spectrum.adobe.com/page/color/). Current [official rules](https://github.com/jhaaj08/chameleon/blob/main/RULES.md) prioritize quality over speed and score both JSON and PNG. No copy rewriting or regenerated asset pixels.

No new reusable skill was needed: the existing repository test-first workflow, verification skill and reproducible comparison script cover future work. No vault writes, collaborator messages, or competition submission were made.
