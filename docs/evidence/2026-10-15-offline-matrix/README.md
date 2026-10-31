# Hosted offline failure matrix — 2026-10-15

Candidate source `af6e4411035062957e355a7a14d5d1207134e840`, [successful hosted run 38766967759](https://github.com/kj-squared-labs/reflow-studio/actions/runs/38766967759), Ubuntu hosted Docker, Linux/amd64. This is candidate qualification; final integrated source requires its own run. No full issue 8/35 acceptance or teammate reproduction is implied.

All six actual container cases passed: valid public fixture, malformed JSON, unsupported element type, invalid target dimension, injected sleeping parent/child timeout, and injected allocation exceeding a 64 MiB cgroup. Every case retained actual image/name/network inspection, read-only input and before/after hashes, stopped state, force-removal result, and confirmed container absence. Ordinary three-public-sample smoke also passed with three REAL renderer calls, zero FALLBACK calls, repeat output identity and four smoke controls.

The memory case used a surviving parent: safe 8 MiB allocation exited0 without an OOM event; a larger child allocation increased the isolated kernel `memory.events` counter `oom_kill` from 0 to 1, killed that child with signal 9 and let its parent exit 0. Kernel `memory.max` and Docker memory/swap limits were 67108864 bytes. External container UUID, parent-reported childPID and child-reported PID matched. Docker `OOMKilled` remained false; that flag and exit137 alone were not accepted as evidence.

Earlier [run 38765279064](https://github.com/kj-squared-labs/reflow-studio/actions/runs/38765279064) failed correctly: five cases passed, but the first OOM oracle could not establish the required event. Its artifact remains distinct from the corrected result. Timeout/OOM are deliberate fault controls, not measurements of natural worst-case engine workloads.

| Artifact | ID | ZIP SHA256 |
|---|---|---|
| Corrected image |11988638573|`ae175dfc9520810d36b3da53728126f285a18e1b0203dc5f085c0844c948572c`|
| Corrected capability |11988123941|`3724c3c80dae36b5905d179f48a3a67edd8aa85daed1414cb70c8d51bb6c6253`|
| Earlier failed image |11989790400|`3fa82dcd419b923a1e696248bd6527b0fbb57dbd96ef93b725a21cb716e3ab46`|

Agent lane B independently checked 81 source/archive/output/control facts; agent lane D independently checked 49 raw matrix facts and accepted this bounded checkpoint. Full phase profiling, representative dense/extreme workloads, other failure combinations, internal resource budgets, named teammate reproduction and applicable human/native acceptance remain separate. Hosted artifacts have finite retention; the hashes identify the original downloaded bytes.

## Small resource pilot on the same hosted image

At source `c1fd4d8659b2427f3e090b432f6fa4d2c5f5459b`, [run 38770001641](https://github.com/kj-squared-labs/reflow-studio/actions/runs/38770001641) passed ordinary smoke, the six-case failure matrix, and a resource pilot over the same three public inputs. [Raw observation summary](resource-summary.json) retains all samples and artifact hashes. Agent lane B independently audited 157 resource facts plus 81 ordinary/matrix facts; agent lane D independently checked 100 raw resource facts and accepted this bounded pilot. These are automated evidence audits, not named teammate or human acceptance.

| Observation | Samples | Measured result |
|---|---:|---|
| Fresh-process entrypoint time |5|Median 0.745 s; range 0.743–0.769 s|
| Same-process initial warmup |1|0.747 s|
| Same-process steady repeats |9|Median 0.664 s; range 0.663–0.668 s|
| Import/setup within wrapper |6 processes|Median 1.018 s; range 1.008–1.058 s|
| Fresh container invocation |5|2.077–2.114 s, including startup/imports/instrumentation|
| Ten-iteration container invocation |1|8.120 s total|

Every iteration produced the same six output hashes as ordinary smoke, with three real renderer calls and no fallback. Seven unique containers, including calibration, used network none, read-only input, 512 MiB memory/swap caps and 64 PID limits; raw inspection, stopped state, removal and absence were retained. Kernel `memory.max` matched the inspected limit. A separate 100 ms delay measured 100.098 ms; touching 32 MiB raised process RSS high-water from 16,084,992 to 49,733,632 bytes and cgroup peak from 6,983,680 to 40,484,864 bytes.

Fresh-process RSS high-water ranged 222.37–222.68 MiB. The ten-iteration process's cumulative RSS high-water rose from 222.27 to 264.98 MiB; its cumulative cgroup peak rose from 143.16 to 190.83 MiB. These have different accounting: RSS includes resident shared mappings; cgroup charges include other charged memory and filesystem cache. Neither is a per-iteration allocation. Peaks include wrapper imports and, on later iterations, earlier hash/copy/snapshot overhead. Increasing cumulative peaks alone do not establish a leak or retained-memory plateau.

This is a small descriptive pilot, not a cold-machine, percentile, worst-case or organizer-budget guarantee. Host page caches were not cleared. Entry timing excludes imports and output hashing/copying; outer invocation includes them and excludes later container removal. Phase breakdown, representative dense/extreme workloads, budgets and independent teammate reproduction remain open.

The prior resource attempt, [run 38769288073](https://github.com/kj-squared-labs/reflow-studio/actions/runs/38769288073), stopped in capability tests because an older fake success fixture lacked the new receipt. No image ran and no artifact was uploaded. A test-only correction then passed the full 96-test qualification set with zero skips before the successful hosted run. The earlier failed OOM run above is a different failure and is retained separately.
