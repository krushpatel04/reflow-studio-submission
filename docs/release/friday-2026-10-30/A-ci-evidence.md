# Recovering ordinary CI evidence during artifact quota failure

## Behavior

Normal `actions/upload-artifact` remains first choice. If it fails, the job runs `.github/scripts/ci-evidence.mjs emit` for its existing report directories. It prints a versioned header (full archive SHA256, compressed byte count, chunk count, included roots, absent roots, regular-file count), ordered base64 chunks and a footer. No data is silently truncated. More than32MiB compressed fails retention visibly. Empty evidence or unsafe paths/symlinks also fail; missing roots from partial setup are disclosed if other report files exist.

Only upload actions use continue-on-error. Tests, builds, setup, native/browser acceptance and fallback retention remain fatal. A failed product job remains failed even if its evidence is recovered. A failed fallback remains a retention failure, not a successful check. An aborted/cancelled job may not retain evidence. Normal artifact links and log archives have different retention behavior; the latter follows repository Actions log policy.

## Recovery

From the candidate source checkout, download the selected job's full log and recover one named archive to a NEW file:

```sh
mkdir -p reports/ci-recovery
gh run view RUN_ID --repo kj-squared-labs/reflow-studio --job JOB_ID --log > reports/ci-recovery/job.log
node .github/scripts/ci-evidence.mjs recover --name viewer --log reports/ci-recovery/job.log --out reports/ci-recovery/viewer.tgz
tar -tzf reports/ci-recovery/viewer.tgz
```

Names are `python`, `container`, and `viewer`. The tool rejects a wrong/missing header, truncated or reordered chunks, duplicated data, missing footer, altered bytes, and existing output files. It verifies SHA256 and byte count before writing. Inspect archive paths before extracting into an empty directory; this command does not execute recovered files. Preserve job/run/source SHA and the recovery receipt alongside the archive.

This repairs the evidence transport path, not a product failure or the organization's storage quota. It does not replace Python submission qualification, human/AI visual acceptance, or final artifact checks. PR151's submission workflow remains separately owned and unchanged.

## Sources

GitHub distinguishes a step's raw [outcome from its conclusion after continue-on-error](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts). The fallback checks `steps.retain_evidence.outcome`, so an upload action failure still triggers recovery. No product step is assigned continue-on-error.

## Verification

Three tests failed on unchanged ci.yml before implementation because a quota rejection had no recoverable evidence route. Focused tests then passed, exercising actual configured commands, byte-exact nested/binary round trips, integrity failures, no-overwrite and product-failure/healthy controls. Local/hosted full results and exact source bindings will be appended after execution; no hosted success is assumed.

Local validation:19focused controls and739full Node tests pass,0skips; build, script syntax and diff checks pass. Hosted readback remains pending.

The first injected browser-fault archive measured25,702,598bytes and correctly exceeded the initial16MiB cap. A new17MiB binary-trace regression reproduced that failure before changing the cap to32MiB;20focused controls now pass. The historical first run remains failed with both the expected browser assertion and the explicit retention-budget failure. Corrected-head hosted recovery is still required before acceptance.
