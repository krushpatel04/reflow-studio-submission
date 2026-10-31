# Deep investigation evidence — October 29, 2026

[Findings, priorities and acceptance criteria](../../research/2026-10-29-improvement-investigation.md) · [Plan](../../plans/2026-10-29-deep-improvement-investigation.md)

This archive records a read-only production-code investigation, not a qualified release. Baseline `2fd7a89afbde50ae2e2ae886861adb2b7d4cbf1a`; local candidate text-fit hash `fede1c58a8f04d605a1c15543f7ae99787f58ebe5cc6d2eca1000a0e868dae18`. The floor-stop variant changes only an isolated diagnostic copy. [Source manifest](source-manifest.json) identifies every Python module in all three variants.

- [Raw timings and quality probes](results.json): five alternating trials per variant/workload, canonical output hashes, warnings, strategy eligibility and font sizes. Final run after correcting the input-immutability check. Native local Python layout only, partly warmed native libraries and per-call cleared Pillow cache; residual first-use effects remain. No claimed percentile or whole-container factor.
- [Dense100 profile](dense100-profile.json): one instrumented candidate/prototype pair, top function calls/times, output hashes and warnings. 39.23 versus 5.19 seconds is diagnostic, not a stable latency guarantee. Rendering probes briefly ran concurrently with the first run. Nested cumulative times must not be added.
- [Output invariants](invariants.json): all six cases preserve ordered IDs and non-geometric fields and use the exact target. `results.json` separately verifies source against a pre-call deep copy.
- [Renderer receipts](renders.json): six direct calls to the real pinned official converter. All returned the expected deliberately missing public badge warning. This is local rendering, not Docker/offline qualification.
- [Older container profile summary](prechange-profile-summary.json): extracted from the existing ordinary-versus-instrumented profile; identified by image/source-file hash. Historical context only, not an old/new timing comparison.
- [Artifact hashes](artifact-hashes.json): archive file SHA-256 values, excluding this explanatory README and the hash manifest itself.

## Visual probes

Compare at native dimensions. These exposed sample variations are debugging/regression material, not an independent unseen benchmark.

Original public Level 3, 728×90; all text 9px:

![Original public banner](public-l3.png)

One additional low-opacity 5×5 ellipse in the source; labels/legal fall to 6px:

![Added decoration](l3-small-decor.png)

Only legal text assigned a singleton group; legal text falls to 1px:

![Singleton legal group](l3-singleton-group.png)

Same source at 970×250; all text 16px, including headline and legal:

![Wider campaign](l3-970x250.png)

Same source at 300×250; composition adaptation never attempted:

![Compact campaign](l3-300x250.png)

## Reproduction

Use a disposable checkout with the committed baseline and the exact local candidate bytes identified above, Python 3.11 with project dependencies, and the clean pinned starter at `.cache/chameleon`. Do not reset a shared checkout to reproduce historical evidence. The input workloads were created by `scripts/submission_workload_profile.py` under `reports/quality-speed-profile-20261029/inputs`; recreate those via its `make_workloads` function using the pinned three public inputs if absent. No hidden or sealed datasets are required.

Run from the checkout root:

```sh
.cache/venv/bin/python docs/evidence/2026-10-29-deep-investigation/probe.py
.cache/venv/bin/python docs/evidence/2026-10-29-deep-investigation/render_probes.py
.cache/venv/bin/python docs/evidence/2026-10-29-deep-investigation/dense_probe.py
```

Fresh outputs go under ignored `reports/deep-investigation-2026-10-29/`, including frozen Python packages and input/output JSON. `probe.py` supports `REFLOW_INVESTIGATION_OUT` for separate profiling destinations; the two follow-on scripts currently use the default destination. Do not confuse later reruns with this archive. The baseline is pinned in the probe; the candidate is read from the worktree and its actual bytes are fingerprinted. Always compare that fingerprint with this archive before interpreting a reproduction.

Astra's review was independent code/differential/visual analysis, not human acceptance. Its additional 360-case font differential was agent-reported; the root's fresh timing and quality receipts are archived here. The diagnostic scripts are evidence tools, not supported production interfaces.
