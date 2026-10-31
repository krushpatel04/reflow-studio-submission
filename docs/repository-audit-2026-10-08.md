# Repository review — October 8, 2026

## Decision: Python submission, optional TypeScript tools

Keep the canonical engine in Python and build on Adobe's starter. Do not undertake another whole-repository rewrite. The [released brief](https://acrobat.adobe.com/id/urn:aaid:sc:US:9a9861db-a87a-4dc4-91fb-fff30ed022c6), page 10, identifies `engine/resize.py` as the implementation point. The [starter README](https://github.com/jhaaj08/chameleon/blob/a44a06046b0413f0785e7203955c3822e0acbc32/README.md) wires it into the orchestrator, renderer and Docker entry point. Python is explicitly supported and is the simplest fit for this interface. These sources do not establish a requirement that development tools or every repository file use Python, nor do they certify arbitrary replacement submission interfaces.

The repository already implements this direction: `engine/resize.py` and `engine/text_fit.py` form a Python engine, and `submission/assemble_context.sh` overlays them onto pinned official plumbing. It does not invoke the TypeScript engine. Preserve the existing UI, regression suite, fixtures, source-ranking/group/crop experiments and corpus tools; port a behavior only when a reproduced Python failure and independent evaluation justify it. `scripts/lica_official/rasterize.cjs` still has live development callers, so deleting Node would break corpus preparation/tests. Node is excluded from the submission build context.

## Official-source refresh

Rechecked the direct launch-linked Adobe brief, the starter's README/RULES/FAQ and current Git HEAD, and Adobe's October 5 launch email. Upstream remains **`a44a06046b0413f0785e7203955c3822e0acbc32`**. The Gmail search for Adobe hackathon/Chameleon mail after October 4 returned that launch email and no newer matching message. No new upstream revision or changed technical contract was found in this review.

The [launch source register](evidence/2026-10-05-adobe-launch/README.md) retains the official dates and form links: team registration October 8; submission October 30; finalists November 23; finale January 11–13, 2027. Exact closing time/timezone and the team's registration status remain unverified. The older event URL returned 404 during this review, so it was not used to override the launch communication. The hub currently displayed the FAQ; the launch-linked challenge remained accessible directly.

Preserve IDs/count, copy, font family, asset pixels and relevant design properties. JSON and actual PNG are both evaluated; no image regeneration. Runtime must be offline. The official self-check is not the scorer. Starter FAQ Q5 still includes an unscored viewer while the brief describes engine deliverables: retain this conflict, rather than declaring the viewer waived. Schema sign-off, model/hardware limits and finale policy questions from the source register remain unresolved.

## What the repo and channels actually establish

Reviewed main at `3c3c378`, its commit/PR history, all repository issues, 23 open PRs, the Reflow continuation handoff, both Quoroum shared histories (Reflow through message 533; offline through 182), and coordinator histories (through 1024 and 232 respectively). Channel summaries are reported evidence; merged code and committed records determine implementation status. The channels were idle at inspection. This review does not resume or schedule workers.

| Area | Observed state | Remaining boundary |
| --- | --- | --- |
| Python engine | Contract/preservation, uniform/group geometry, sub-floor text fitting, obstacles, rotations, wrap-cap controls and exact-face context are merged through P13 | Incremental engine, not full feature parity with old TypeScript search/ranking |
| Real renderer | [A1](evidence/2026-10-06-adobe-a1/README.md) establishes historical real-renderer/fallback controls; current synthetic renderer/font tests exist | Real rendering alone does not establish visual quality |
| Font correspondence | [P12](evidence/2026-10-08-p12/README.md) and [binding](evidence/2026-10-08-p12b/README.md) connect LICA measurement to hash-verified renderer faces | Binding is explicit in the LICA harness; official `engine/main.py` still uses the supplied brand kit. Do not generalize to arbitrary unknown fonts |
| Public corpus | [R3 committed results](evidence/2026-10-08-r3/README.md): 224 development + 84 validation tasks rendered; all 52 + 26 measured tasks matched renderer font hashes | 172 + 58 tasks were unmeasured; no reference-image quality verdict. Deltas are changes, not improvements |
| Packaging | Context allowlist, dependency/base pins, fingerprints, negative controls and runbook merged | [Offline proof](evidence/2026-10-06-offline-channel/limitations.md) covers older tree `fd73cbcd`, not current engine. Channel reports latest attempt blocked by user-namespace restrictions |
| Express/viewer | Workbench and internal CLI retained; viewer request-lifecycle PR still has unique work | No native Express editable round-trip or finale readiness certified |

The coordinator's broad “all milestones complete” message does not close these gates. Its later explanation attributing a validation warning to text-count differences was corrected in review; the cause was not isolated. Do not tune on validation data or publish that abandoned explanation as fact. Sealed material remains private and unexamined in this cleanup.

## Cleanup delivered

- Python-first README with reproducible setup/assembly commands, a compact directory map and explicit evidence boundaries. Moved the long workbench/evidence catalogue to [its own guide](workbench.md); refreshed contributor, progress, team and CI navigation. Historical records retain their dated scope.
- Added `python-verify` CI for the full Python suite, pinned starter and dependencies, including genuine renderer/font controls. `scripts/verify_python.py` fails on skips and empty suites. Existing Node CI continues to protect retained work.
- Made Pillow BASIC measurement explicit. Its automatic RAQM selection changed geometry on Linux and exposed six failing regression assertions in the newly enabled CI job. The existing assertions are retained; the independent Pillow overflow helper also explicitly selects BASIC. Linux confirmed RAQM available and FreeType 2.14.3; after the engine fix, only this helper still used the auto-selected backend. These are BASIC metric checks, not proof of Skia glyph/shaping parity; complex-script shaping remains unqualified. [Pillow documents this platform-dependent default](https://pillow.readthedocs.io/en/stable/reference/ImageFont.html#PIL.ImageFont.truetype).
- Removed the private-machine font fallback and made packaging test resources explicit through `CHAMELEON_UPSTREAM`. Missing fonts can no longer be hidden by another host's installation.
- Replaced GNU-only `realpath -m` in context assembly with Python standard-library path resolution. Existing path, symlink, collision, failure-preservation and interruption controls remain enabled on macOS.
- Losslessly compressed four large September 22 product-review/benchmark JSON archives: **4,871,947 → 215,741 bytes**, a reduction of **4,656,206 bytes (95.6%)** for those files. Links and decompression instructions are updated; decompressed bytes match Git originals exactly. Images, datasets and substantive evidence are preserved. This reduces checkout size; Git history is not rewritten.
- Closed 17 redundant milestone PRs after rechecking that each exact head was already contained in reviewed main: **#38, #39, #40, #41, #42, #43, #44, #45, #46, #47, #48, #49, #50, #51, #52, #54 and #61**. Each closure was read back and verified; no branch was deleted. Exact head containment, not similar titles, was the closing criterion. Unique-head PRs #36, #56, #59, #63, #68 and #93 remain for reconciliation. Branches are preserved.

Updated and read back current-state sections on issues #3, #4, #5, #7, #8, #11, #33 and #35, preserving ownership and acceptance checklists. Historical launch snapshots are labelled as such.

## Next improvements, in order

1. **Current-engine offline qualification (#8/#35):** run the documented probe on a supported container host against a clean, fingerprinted current tree. Require real renderer calls, zero fallback, unchanged inputs, blocked network and negative controls. A green workbench container job does not satisfy this.
2. **Independent quality (#7/#33/#34):** review representative output images against faithful sources; label readability, hierarchy, collision and clipping failures separately from structural checks. Diagnose development cases, then perform a fixed validation run. Preserve sealed isolation.
3. **Font/interface coverage (#3/#4):** document exact supported brand faces and ensure unseen-font behavior is explicit. Keep the source/renderer/metric resource contract consistent before expanding text heuristics.
4. **Backlog reconciliation (#11):** review unique-head PRs and classify TypeScript-only CLI/viewer tickets as legacy maintenance or finale work. Do not port every old ticket to Python or close it merely because another milestone has the same title.
5. **Release details (#4/#35):** resolve the official viewer discrepancy and outstanding hardware/deadline details; verify team registration separately. Keep native Express proof distinct from offline engine proof.

## Validation of this cleanup

- Regression-first font control failed because the private fallback masked missing resources; assembled-kit and explicit-checkout positive controls passed. After the fix all three pass.
- Existing assembly tests first failed on macOS with `realpath: illegal option -- m`; the portable resolver restores those controls.
- Python 3.11 full gate: **267 tests passed, zero skips** with pinned starter/resources and real renderer dependencies. An injected skipped-test control exits 1 as required.
- TypeScript: **685 tests passed, zero skips**; production build passed (existing >500 kB bundle warning). Native verification passed all **30 layouts**; benchmark generated **70 PNG/SVG/editable-document sets**.
- Ran all three official public samples through the upstream orchestrator with this engine on macOS: **3 real renderer calls, 0 fallback**, exit 0. Inspected all three PNGs: the wide Level 2 output still concentrates content centrally with small body copy; Level 3 remains dense with tiny product imagery. These are concrete development quality concerns, not a scored comparison or a layout regression caused by this cleanup.
- After explicit BASIC measurement, all six official sample JSON/PNG files remained byte-identical on macOS; the additional fractional-size font-metric characterization passes. Linux validation is required because the original six failures occurred there.
- Four compressed archives were compared byte-for-byte to `git show` originals. Changed-document links and workflow syntax were checked.
- GitHub rejected the first workflow revision before starting jobs; the job-level resource path used an unavailable `runner` context. It now uses `github.workspace`; subsequent hosted results are visible in [Reflow CI](https://github.com/kj-squared-labs/reflow-studio/actions/workflows/ci.yml).
- Hosted CI and current-tree offline-container qualification are separate from these local results. No official score, broad quality improvement or sealed acceptance is claimed.

[Cleanup plan and scope](plans/2026-10-08-repository-cleanup.md). No new reusable skill was needed. Original checkout reads stalled; work was performed in a clean clone without overwriting its local changes.
