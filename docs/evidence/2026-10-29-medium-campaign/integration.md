# Viewer efficiency and compact-layout integration — October 29, 2026

Validated source: **`14b973861faed93378a7b24f84e13931249df308`**. Linux/amd64 image: **`sha256:bc0e91a5f27efde05a26fc4f5672c3e5a545e0171d485a1a6a274d2b061169a4`**. Later documentation commits do not change the runtime fingerprint.

The viewer loads fewer fonts and supports direct navigation through full-size formats. The Python engine improves the five demonstrated compact campaign layouts while preserving source content and conservative fallbacks. Neither change adds a service, dependency, model or native integration.

## Results and remaining costs

| Area | Result and disposition |
| --- | --- |
| Viewer font setup | 34→8 faces and 463,368→121,740 encoded resource bytes on the measured Latin case. Seven alternating pairs give median request time 92.3→57.8ms, about 37% lower. All ten fixtures plus three multilingual/fallback controls preserve complete layout outputs. These are warm local-browser measurements, not a portable latency guarantee. [Profile and method](../2026-10-29-viewer-efficiency/README.md). |
| Viewer review flow | Previous/Next controls retain zoom and restore the original opener on close. Readable 44px controls, narrow-screen wrapping, light/dark presentation and keyboard navigation pass visual and browser checks. The larger artwork workspace and restrained controls remain; no framework replacement. |
| Compact campaign readability | All five changed Linux formats now use text at 9px or larger; 600×500 reaches a 15px minimum. Legal copy is clear of the preserved missing-asset placeholder. Existing text and main product are never made smaller. The 36-target macOS sweep improves 22 cases; 14 retain exact fallback. [Comparisons and boundaries](README.md). |
| Additional layout search | Local macOS medians rise from 71→162ms at 300×250, 20→180ms at 250×300 and 18→87ms at 600×500. The bounded search buys readability; healthy inputs exit early. Linux rendering overlapped part of timing collection, so these are indicative layout-only timings, not controlled throughput benchmarks. |
| Renderer startup and metrics | Preserve the pinned renderer and independent font measurements. Final offline resource checks pass under the configured 512MiB container limit. Removing these checks would weaken fidelity; no such shortcut was taken. The resource receipt covers the original three public cases, while compact formats have separate offline execution and visual evidence. |
| Unsupported or impossible layouts | Keep source content, groups and fallback rather than force an unverified arrangement. Dense layouts and unfamiliar designs remain quality limitations. Viewer diagnostics and actual-size inspection help expose them; they do not solve every case. |
| Viewer bundle and warnings | The existing main bundle remains about 515kB /82kB gzip, with the build warning visible. Benchmark retains eight warnings and zero selected errors. No measured startup failure justifies new bundling architecture in this pass. |
| Hosted CI and submission | Local tests and offline image qualification are separate from GitHub-hosted CI and human acceptance. No competition submission was made. The collaborator monitor remains paused. |

## Verification

- **552 Python tests**, zero skips, 182.392s on the final engine source. [Full log](python-final.txt).
- **744 Node tests**, build, 30 native layouts, 30 benchmark cases /70 artifact sets and **34 browser tests** pass. Four further inspector tests and a production rebuild pass after the final narrow-screen CSS change. The browser suite includes 20 verification-page checks. [Viewer receipt](../2026-10-29-viewer-efficiency/validation.json).
- Production-browser edit → worker → preview → inspect → export passes with no page errors or external requests, plus visible local-server failure and successful retry. This does not turn the development viewer into an offline app.
- **Clean-source Linux qualification passes**, with the clean-tree gate enforced: three real-rendered public cases, zero fallback rendering, four biting negative controls, six failure-matrix cases, resource profile and fingerprint verification. All six original public JSON/PNG hashes match the previously qualified runtime. [Qualification](qualification.json) · [Fingerprint](fingerprint.json).
- The same immutable image separately renders **all five changed compact formats** offline, with immutable inputs and identical repeated output. Protected fields, paint order, group membership, bounds, text floor and cross-group separation pass readback. Every final PNG exactly matches its reviewed provisional image, so those images remain the visual record without duplicate copies. [Execution ledger](linux-final-ledger.json) · [Visual readback](linux-final-visual.json) · [Combined receipt](validation.json).
- Astra's final adversarial code review passes with the documented fallback limits. Its native-size visual review accepts all five exposed outputs as improvements. Root inspected the representative and final Linux images too. This is AI review, not a human preference study or a prediction of top-three placement.

The rejected macOS-only and Linux candidates remain clearly labeled in the comparison packet. Successful container execution was not treated as visual acceptance; the Linux failure was corrected and a new clean image built before publication.

## Reproduction

Use the pinned setup in the README and the commands in the two linked plans. Run `scripts/qualify_python_submission.py image` from a clean checkout at the source commit, with the pinned starter as `--upstream` and a fresh `--out` directory. For the expanded set, copy the public Level 3 task five times, changing only `target_canvas` to 300×250, 301×251, 320×250, 250×300 and 600×500. Run `scripts/offline_submission_smoke.py` on that input directory using the exact qualified image, retained under a separate tag before the harness cleans its own temporary tag. Check the returned JSON invariants and actual PNGs as well as the smoke result.

Fresh generated logs remain under `reports/viewer-efficiency-2026-10-29/`; archived comparisons and receipts are linked here. The established plan/test/browser/qualification workflow was sufficient, so no new reusable skill was needed.
