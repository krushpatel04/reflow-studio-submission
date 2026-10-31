# #28 bounded Viewer revision consistency — CLI2

Base `9d261c6daf6bc3789c295cdc169602b433d66e57`, branch `jo/demo-20261015-cli2-viewer-revision`. Base is local, not the current GitHub main commit. Worktree `cli2-issue28-viewer`. Approved plan sha256 `f4d53e5c285d62898154cbcaac57f18dc285ed98b62a2dff426ddae187607094`; Reviewer5 N1–N3 included. Original window: 2026-10-14T05:30:59.709930Z–07:10:59.709930Z, no extension.

Only four paths: `src/main.ts`, `tests/browser-checks.ts`, this plan, `docs/evidence/demo-20261015-issue28-viewer.md`. No CSS, findings, highlights, keyboard, mobile, theme, #9, native implementation, CI edits, installs or browser downloads.

## Sequence

1. Write this plan and one appended browser check before touching production. Existing checks remain byte-unchanged; insertion immediately before final uncaught-error check keeps that check last.
2. Guarded original browser RED must demonstrate the actual retained-revision defect, not K instability or infrastructure failure.
3. In `redraw`, compute candidate batch, source metrics, cards, SVG markup and summary locally before committing source/custom/mode/results/failures. Handlers pass candidates rather than mutating committed state. Catch whole-update failure without rethrow: actionable `role=alert`, visible previous-version label attached to the grid, previous grid/export retained. Failed fixture switch rolls select back; mode aria changes only on commit.
4. Same browser test bytes GREEN; full tests; build. Stop on unexpected assertions, failed GREEN, instability, insufficient time or conflicting scope.

## Regression

Real browser Canvas `measureText`, no production hook. Count target 1's measurement calls twice on the same cloned candidate; require equal K >= 1. On actual copy-update click, throw TypeError exactly once at K+1, proving target 1 completed before target 2 failed. Assert all stages/title and summary geometry/content count retained; real intercepted JSON source/variants retained; SVG filename and headline retained; actionable alert and visible retained label; page error count unchanged separately from geometry errors. Record observations even on RED. Valid edit then recovers DOM/export and clears label/alert. First-measurement mode/fixture faults retain committed state, aria and fixture selection. Finally restore measureText, URL interception, fixture 0/headline/selected mode (M1). Existing positive controls unchanged (M2). Custom apply relies on shared commit point, not separately fault-tested.

## Budget

Sequential commands, each via `python3 /home/nala/.local/share/reflow-run-20261015/heavy_job.py timeout --signal=TERM --kill-after=5s 900s COMMAND`, launch only with >=960 seconds left:
1. `npm run verify:browser` original RED.
2. `npm run verify:browser` planned GREEN, same test hash.
3. `npm test`.
4. `npm run build`.

One additional browser repeat only after disclosed infrastructure failure; never retry an assertion or weaken a test. Copy receipts/logs immediately. Record preverify and browser elapsed versus CI four-minute cap, no cap edit. No other validation commands. Four commands are an upper bound, not guaranteed to fit remaining window.

## Authorized temporary infrastructure exception

Root authorized; manager claims only temporary untracked `/home/nala/.local/share/reflow-run-20261015/worktrees/cli2-issue28-viewer/vite.config.ts`. Before creation recheck absence including symlinks and tracked paths; stop if any file appeared. Exact minimal config keeps `server.fs.strict: true`, allows only this worktree plus resolved `/home/nala/.local/share/reflow-runtime/baseline/node_modules/@fontsource`, no imports/plugins/HMR/test changes. Command 1 infrastructure failure: 64.600 s, receipt pid 1258229 / started_at_ms 1791958815920 / exit 1 / lease true. Root exception does not authorize production change or retry before independent review. Test/main bytes unchanged.

CLI2 owns cleanup: remove only the exact authored config after validation or on stop, before any commit. If bytes changed unexpectedly, stop and report rather than delete a collaborator's changes. Config never enters eventual four-product-path commit. Checkpoint stops before conditional retry; budget 1/4 regular + 0/1 conditional, original expiry unchanged. Record exact bytes/hash in evidence for independent inspection.

## Final partial checkpoint — no implementation

Independent direct Sop review 96 PASS inspected exact temporary 215-byte config (`c0da3f9039dcdd1873d4233fabcb2c5a5342a415bc033eb3667ce7b885b24411`), strict=true, exact two paths. Authorized conditional original-production browser run at 06:45:28.467946Z–06:45:38.536220Z exited 1 in 10.068 s: meaningful retained-revision RED with K=1138 twice, injected call 1139 once. No production edit followed; manager stopped product/validation before latest-launch cutoff. No GREEN, full tests or build. Budget 1/4 regular + 1/1 conditional consumed; three regular commands UNRUN, not reset. Test hash unchanged. Child 3b/4a UNPROVEN until implementation plus required verification.

Temporary config exact bytes/hash/untracked ownership checked, preserved under ignored `reports/issue28-viewer-evidence/temporary-vite.config.ts.txt`, removed at 2026-10-14T06:53:16.014043Z; config absence confirmed. No commit/push. Existing evidence preserved; future work requires root-owned fresh window. Current expiry unchanged. Manager last observed cursor 28275, stalled Read 28274; no subsequent implementation/validation.

Only #28 child 3b/4a partial intended evidence, currently UNPROVEN; 1/2/3a/4b unaddressed. No closure. Root owns publication/integration/CI/closure. Local four-path commit only after all required successes; otherwise preserve partial work and receipts, no success commit.


## 2026-10-14 additive supersession — observer repair preparation ONLY

Root authorizes narrow observer repair, NOT runtime activation. Preserved worktree now at `c9460982245f61f938e052fc305f6d79b4b6029f`; fast-forward preparation receipt `cli2-c946-ff-preparation-receipt.json`. Original test SHA `8501beafb5d37fcb25586f3d5e78e3d3df17dfb67e2822b3252274a2bc26139b` remains unchanged at this checkpoint. The old empty-filename observations are UNPROVEN: document-level click observer cannot see production's detached anchor. Original mixed-source/variant RED and all old receipts remain valid historical observations; no old RED reused for revised observer.

### Proposed narrow test diff (not applied)

Within the existing appended Viewer check only, replace document-level download observation with a wrapper on the ACTUAL detached anchor `.click()` path. Save both `HTMLAnchorElement.prototype.click` and its own-property descriptor before patching. Wrapper records `this.download` (never constructs a filename); adds a temporary click listener on that actual anchor to prevent default navigation, calls the saved real click with `this`, removes that listener in an inner finally. Non-download anchors call original unchanged. Existing URL.createObjectURL Blob capture calls original and remains unchanged. Exact outer finally restores the original property descriptor if present, otherwise deletes the temporary own property, exposing the inherited original. No production download changes, synthetic names/content, skipped click, or bypass of real export Blob.

Proposed observer core:
```ts
const anchorClick = HTMLAnchorElement.prototype.click;
const anchorClickDescriptor = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'click');
HTMLAnchorElement.prototype.click = function() {
  if (!this.download) return anchorClick.call(this);
  filename = this.download;
  const prevent = (event: MouseEvent) => event.preventDefault();
  this.addEventListener('click', prevent);
  try { anchorClick.call(this); }
  finally { this.removeEventListener('click', prevent); }
};
// existing outer finally, including URL/measureText/fixture/headline/mode cleanup:
if (anchorClickDescriptor) Object.defineProperty(HTMLAnchorElement.prototype, 'click', anchorClickDescriptor);
else delete (HTMLAnchorElement.prototype as Partial<HTMLAnchorElement>).click;
```

Before any K count/injection, after normal fixture/headline/mode setup and baseline JSON snapshot, reset `exported` and `filename`; click the existing Original SVG export button, require a captured Blob and nonempty observed actual filename equal to `${fixture.id}-Original.svg`, parse its actual SVG and require headline text equal to baseline stage headline plus no XML parser error. Require baseline JSON filename nonempty/equal `${fixture.id}-reflow.json`. Store baseline filename/content observations. Failure here is explicitly `TEST HARNESS FAILURE`, never expected product RED. Reset filename before subsequent JSON/SVG captures so stale values cannot pass. Keep every existing filename/content/source/variants/SVG/state/recovery/K/error assertion, prior checks, fault boundary and cleanup. No weakened assertions, new production hook or synthetic metrics. Revised hash frozen only after independent direct Sop static review and authorized test edit.

### Separate future budget/window, NOT activated

Proposed distinct window 07:11Z–09:11Z on 2026-10-14; strict end 09:11Z. Four once-only guarded commands, all UNRUN: revised browser RED on unchanged main SHA `dfd8a975ee2730aaf687ce4db4023209c6bb4235e929a49be0d9477c4b9219f9`; browser GREEN same revised test hash; npm test; npm run build. Each existing shared-lease launcher plus timeout 900s, launch only with >=960s remaining. No conditional infrastructure repeat. Unexpected assertion, K instability, observer harness failure, failed GREEN/test/build STOP. Only true expected revised RED permits reviewed atomic production fix; historical RED does not.

Exact 215-byte strict-font config SHA `c0da3f9039dcdd1873d4233fabcb2c5a5342a415bc033eb3667ce7b885b24411`, full bytes/two paths above and independent review 96 retained. Recreate only after fresh activation and absence proof. Remove exact owned config on stop or after validation before commit; changed config means stop/report without deleting collaborator bytes. Eventual commit only four product paths, only all four required results plus independent review; per-command JD identity, no AI attribution/push. Root alone publishes/integrates/closes. Parent #28 OPEN; child 3b/4a still UNPROVEN. Old 1/4 regular + 1/1 conditional consumed/incomplete remains separate; old three unrun commands are not reset or transferred.


### 2026-10-14 07:16:54Z activation / direct Sop 111 ordering correction

New distinct slice ACTIVATED at 07:16:54Z, fixed 07:11Z–09:11Z window; no extension. Activation receipt `cli2-0711-activation-receipt.json`; direct Sop 111 mechanism APPROVE / operations PASS. New budget 0/4 regular, ZERO conditional; old consumed/incomplete budget remains archived. Install observer FIRST inside restoration-protected try, before ANY jsonExport, not merely before SVG. Close wrapper before following setup. Save real click and own descriptor; restore own descriptor or remove temporary own override to expose inherited original. Healthy actual JSON filename and SVG Blob/nonempty actual filename/valid XML/expected headline must pass before K/fault. Baseline failure is TEST HARNESS FAILURE, not product RED. Existing assertions/checks retained. Four guarded commands only; unexpected assertion/K instability/harness/GREEN/test/build failure stops without retry. Exact owned font config cleanup before stop/commit. Parent #28 OPEN.

Actual revised test freeze SHA256 `417655b70a51f60e653b7938a21d1c0361cf10b5d774d85c50f93ec8933740a9`; main unchanged DFD. Exact 215B config recreated exclusively after absence/untracked/resolved-path proofs, SHA256 `c0da3f9039dcdd1873d4233fabcb2c5a5342a415bc033eb3667ce7b885b24411`, direct Sop 96 bytes/path review retained. New artifacts only `reports/issue28-viewer-0711-evidence/`; old artifacts preserved. Creation UTC 2026-10-14T07:18:35.513886+00:00.


### Revised observer RED / production fix / SAME-hash GREEN — 2026-10-14

Actual revised browser RED: healthy actual JSON filename `after-dark-reflow.json`, SVG filename `after-dark-Original.svg`, valid actual SVG/headline baseline passed before K/fault. K=1138 twice; TypeError fired exactly once at1139. 15/17: appended retained-revision assertion and final uncaught check failed, all prior positive controls passed. Source rejected edit mixed with previous variants; alert/label absent; mode aria and fixture select/title/export rollback failed. Page errors three injected uncaught TypeErrors, separately from retained zero summary geometry/content errors. Old observer filename issue absent; no historical RED reuse.

Atomic fix only src/main.ts: candidate source/custom/mode handlers, compute batch/original metrics/cards/full SVG markup/summary/runtime in locals before commit; then assign state+DOM+mode aria together. Whole-update catch retains state/grid, adds role=alert with actionable edit guidance plus visible small-tag previous-version label using existing CSS. Failed fixture switch restores select id; valid updates remove alert/retained label. Export logic unchanged; no CSS/native/#9 changes. Custom-apply uses shared point, not separately fault-tested.

SAME revised test SHA417655b70a51f60e653b7938a21d1c0361cf10b5d774d85c50f93ec8933740a9 GREEN:17/17, page errors empty; K1138/1138, throw1139 once; source/variants/DOM/SVG retained, visiblelabel/actionablealert, recovery/mode/fixture controls passed. Four variants observed because unchanged prior custom-size check leaves custom active; first-target fault boundary still K+1.

Command1 browser: 2026-10-14T07:18:58.905522+00:00–2026-10-14T07:19:09.175444+00:00, exit 1, wall 10.270s; receipt {"command_executable": "timeout", "pid": 1476596, "drain_utc": "2026-10-15T12:30:00Z", "started_at_ms": 1791962338939, "lease_held_until_exit": true, "exit_code": 1}. Phase markers ['0.070 > reflow-studio@0.1.0 preverify:browser', '3.022 > reflow-studio@0.1.0 verify:browser']; entire command below CI240s cap.
- cmd1.log sha256 `4cb8fb06d9ad38087269d232f021f5bc315f1cfcab3e8289996f37e104ee9648`
- cmd1.timeline sha256 `c3371a01b44df1796ab39913f64d29e7921f87fd4f95863a0d75ab201ec5d138`
- cmd1.receipt.json sha256 `d9f71e6f2000219fa3edd6a0c1cc6c129deb17259f2d0f1b9dbfaa0343c52b3f`
- cmd1.browser-report.json sha256 `a4fcb96e52975beb02f358d23f2cf03e8045b00698e4d998409236336af8e3e5`
- cmd1.browser-runtime.json sha256 `94473ef4f9059de649b4548c0ff9d4094ac379cee8786c21fd7bf9ae162cfae0`
Command2 browser: 2026-10-14T07:20:29.583661+00:00–2026-10-14T07:20:38.750164+00:00, exit 0, wall 9.167s; receipt {"command_executable": "timeout", "pid": 1481919, "drain_utc": "2026-10-15T12:30:00Z", "started_at_ms": 1791962429616, "lease_held_until_exit": true, "exit_code": 0}. Phase markers ['0.069 > reflow-studio@0.1.0 preverify:browser', '2.829 > reflow-studio@0.1.0 verify:browser']; entire command below CI240s cap.
- cmd2.log sha256 `8f33d050cf0028da0ae943738d7d8a44a3e9c678b2ee317d0106460f085e394f`
- cmd2.timeline sha256 `cf8148d29c207153837f0e1751f4d0b3aa504a5739800f650fae0cd01c510096`
- cmd2.receipt.json sha256 `ef7de20533ccc576b3b00469ab5676ef26a92de916ea2452d171feb8b6d6cca4`
- cmd2.browser-report.json sha256 `17b1d6fcfd9a9c9d4784d2e68bc36db99766b97bbd8c1836d9d4ac5e2cc4b132`
- cmd2.browser-runtime.json sha256 `3fc2c161770d5e22f0bd387073d4adeae9e38047562b7b23b9ca50d1f3c1227f`

Command3 full tests launched once, still running at this checkpoint. No command4 launch before its terminal success. Required guards/cleanup unchanged. New budget3/4 launched, no conditional. This is not final success/closure.


### STOP correction — full-test transport interruption, no completion claim

2026-10-14T07:24:46.474473+00:00: command3 `npm test` launched once at 2026-10-14T07:20:45.263763+00:00; Quorum shell call timed out after120s. Initial running-state messages are superseded: subsequent /proc inspection showed no run.py3/npmtest/tsx/heavy_job process, and no cmd3.exit/end/receipt exists. Shared receipt still command2 (pid1481919/start1791962429616/exit0), NOT command3 evidence. Full-test log stops at test484, no TAP totals/terminal outcome. UNKNOWN/interrupted, not success and not an assertion result. No guessed kill/retry/extra validation. Command4 build UNRUN; new budget3/4 launched, no conditional; old budget separate. Product edits and browser RED/GREEN retained, no commit/push; child3b/4a only browser-tested partial, required overall verification INCOMPLETE. Parent28OPEN.

Command3 log SHA256 `9899c8be716f03501a0fec0bc9a9acdd09df748612a736ef7411c54eaf749ff4`; timeline `e6f495bd0de4afec25554e2999ab65763190f8550db8017a80df4499202da223`; partial-stop.json records absent terminal artifacts without fabricating heavy receipt. Exact owned215B fontconfig SHA c0da3f9039dcdd1873d4233fabcb2c5a5342a415bc033eb3667ce7b885b24411 checked non-symlink/untracked then removed at 2026-10-14T07:24:46.474473+00:00; absence confirmed. Configbytes preserved in ignored temporary-vite.config.ts.txt. Original09:11Z expiry unchanged; STOP partial.


### 2026-10-14 recovery-only activation provenance

Root authorized one recovery full-test launch for outer120s interruption, same07:11–09:11 window, max FIVE total launches. Fresh cli2-0711-recovery-activation-receipt.json/direct independent invocation+hash review PASS; existing runner frozen SHA6959306295fb9b9ad30a8dfdc209066977f35ccfd53caf93ce86a71136b42158. Recoverylabel3recovery separate; originalcmd3 remains UNKNOWN/interrupted. Supported Bash asynchronous timeout960000ms avoids Quorum120s foreground limit. No product/test/config edits/recreation. Before launch old1483163/1483164 absent, leasefree, currentmainFE0186/test417655 exact, config/labelabsent, >=960s reserve. Capture live identity and external receipt association; canonical copiedreceipt remains UNVERIFIED until independent manager+review match. Stop at recovery terminal, no build/commit without release.

Recovery actualstart `2026-10-14T07:40:22.498299+00:00`, taskbondsh39b; live capture `2026-10-14T07:40:40.406711+00:00`: wrapper1591821/startticks2405258, launcher1591822/2405260, timeoutchild1591823/2405261; boot94aacc11-20cb-4eb5-b866-892494c8155f, parentchain/cwd exact. Durable identity file SHA256 `051c7acfec325853c6fe65e42bcb4e6db1792d12e454c16c9678dacaa7b3d1b0`. Budget4/5total launched. Recovery terminal receipt not yet available/associated at launch checkpoint; independentmanager+review gate mandatory before build. No config recreation/product/test edits.


### Recovery terminal — external association pending

Supported async taskbondsh39b completed; cmd3recovery start07:40:22.498299Z–end07:41:34.919105Z, exit0, elapsed72.420806s. Full TAP totals696 tests/696 pass/0 fail/cancelled/skipped/todo; duration72183.877878ms. Copied receipt pid1591823 / started_at_ms1791963622531 / leaseheldtrue / exit0 locally matches captured timeoutchild and new launch interval, not oldGREEN. This is local consistency only: copiedcanonical receipt remains EXTERNALLY UNVERIFIED pending manager+independent reviewer association. MainFE0186/test417655 unchanged, configabsent; frozenrunnerunchanged. No build/commit release inferred; STOP at recovery terminal. Budget4/5total launched, buildUNRUN; old interruptedcmd3 retainedUNKNOWN, not overwritten.

- cmd3recovery.identity.json sha256 `051c7acfec325853c6fe65e42bcb4e6db1792d12e454c16c9678dacaa7b3d1b0`
- cmd3recovery.receipt.json sha256 `6b6854e53eafbb9b6a83f0cb04947775794431ddadca3e370d91a805e94978c8`
- cmd3recovery.log sha256 `980ef5bfbf8774c64e1f600418d6fc61cde43d3f9dc805fe4a296d482297a0e5`
- cmd3recovery.timeline sha256 `51451f1579508d86f32dbc111503342e269bde1e56d71a88dad66854ea9dce20`
- cmd3recovery.launcher-output.log sha256 `22c680b9456c6554509843a1f1385258c0923fe368ce025f13f08d9f865ae91a`


### Original build release — recovery externally associated

Independent direct review131–133 PASS associated recovery child1591823/start1791963622531/exit0/696pass zero failures/cancel/skipped/todo with unchanged mainFE0186/test417655/runner695930. Manager cli2-0711-recovery-manager-result.json; fresh cli2-0711-build-release.json. Recovery historical UNKNOWN remains unchanged. Original build once released: supportedBashasync outer1020000ms/>=1020s reserve, inner900s/onelease, fixed09:11end. Configabsent/no source/test changes. Budget becomes5/5 on launch. Build copiedreceipt UNVERIFIED until independentmanager+review identity association; STOPterminal, no commit without explicit release.


### Original build terminal — missing live identity, STOP association

Taskbbbe04ysi cmd4 actualstart07:43:56.915091Z–end07:43:57.473092Z, exit0, elapsed0.558001s; log tsc--noEmit and Vitebuild completed, >500kB advisory only. Receipt pid1618478/start1791963836951/leaseheldtrue/exit0 copied by frozenwrapper. Build finished before immediate subsequent tool capture07:44:11Z: heavy-job-active.json absent. cmd4.identity.json records MISSING livewrapper/launcher/child/startticks/parentchain; no fabricated process identity. Copiedcanonical receipt UNVERIFIED pending externalmanager+review association; missingidentity triggers STOP, no rerun. Budget5/5 exhausted, configabsent, no product/test edit/commit/push. Root decides independent gate/future action; no final acceptedbuildclaim.

- cmd4.identity.json sha256 `89e320b5bbd368d084899278908c5a809d93399f073d3e330a1a6f35d17d260e`
- cmd4.receipt.json sha256 `1fcc804a057ef06755d8c07f42ac300023294cc454df027f11b9a59a2025acc0`
- cmd4.log sha256 `66fc2be418ff6e38da86fc569e2444b20de4fc69ec40e6006c7aeabd03ad8172`
- cmd4.timeline sha256 `f2f3803d511c7eb97ef7aa295eff5b31b345d26bc46550116476a844ecf55219`
- cmd4.launcher-output.log sha256 `ecd3514ed1a048c7da1d4233d3d1b5faf37973ec96c13fddc73a0fa78e35f0dc`


## Final accepted validation / local commit release — 2026-10-14

Additive correction to prior missing-live-identity STOP: manager was the SOLE successful live build identity source, not a second worker capture. Manager `cli2-0711-build-live-identity.json` SHA256 `72be798ff7ccefc732c152a6a0f95d177ac996496488584253ccfbe9c86d07d9` captured at07:43:57.158380Z within actual07:43:56.915091–07:43:57.473092 run: wrapper1618476/startticks2426699, launcher1618477/2426701, timeoutchild1618478/2426703, boot94aacc11-20cb-4eb5-b866-892494c8155f, exact worktree cwd/parentchain. Worker cmd4.identity.json honestly records missing capture and remains unchanged. Independent direct review137 PASS bound manager identity to canonical receipt child1618478/start1791963836951/exit0 and complete build output. Manager event29935 confirms async outer1020000ms; prelaunch event29928 confirms1020s reserve. Vite reports83ms; complete tsc/Vite, chunk-size advisory only. No rerun needed or performed.

Independent recovery association direct review131–133 PASS / `cli2-0711-recovery-manager-result.json`: child1591823/start1791963622531/exit0, 696pass/0fail/0cancelled/0skip/0todo. Revised browser expectedRED15/17 then GREEN17/17, SAME test SHA417655b70a51f60e653b7938a21d1c0361cf10b5d774d85c50f93ec8933740a9, healthy real detached-anchor JSON/SVG baseline, K1138 twice/throw1139 once, no harnessfailure. Original interruptedcmd3 remains UNKNOWN; never rewritten as pass. Old observer8501 filename failures remain UNPROVEN. All old infrastructure/RED/unknown receipts retained.

Local release `cli2-0711-local-commit-release.json` SHA256 `befc1e090b67192009733a5eb76002ef55ad0230b73699e131d4400205a58069`, at07:45:41.850691Z: required validation COMPLETE, five launches exhausted, runstate REVIEW_ONLY/implementationfalse. No further validation/product/test changes. Root JD transport alert1559832203477913644 delivered/readback (root-owned; no duplicate worker alert).

Temporary215B fontconfig removed earlier, absence confirmed before commit; preserved exact bytes/hash under ignored reports only. Only four product paths may enter the local commit: src/main.ts, tests/browser-checks.ts, this plan and its paired evidence document. Main SHAfe0186cbe51f6de0e8a51089a8129ef52529deb1e8dc79c14983c142eb347178 frozen. Per-command author AND committer JD Ojeda <jddedios.ojeda@gmail.com>, inherited identity overrides unset; no global configuration/AI attribution/push. Final exact-code independent review pending after local commit; root sole integration/CI/publication/closure authority.

Claim ceiling: #28 children3b/4a only partial browser evidence; parent28 OPEN. Checkboxes1/2/3a/4b remain UNADDRESSED; custom apply relies on commoncommitpoint, not separately injected. No CSS/findings/highlights/keyboard/mobile/theme/#9/native scope. Browser dispatches DOM events, not pointer/keyboard/screen-reader proof. No visual-quality acceptance, hosted CI or merge claimed. Config dependency exception local only; no production export redesign.


## 2026-10-14 visual preparation ONLY — not activated

GREEN17/17 artifacts contain no error-state PNG; assertion text is not pixels. Prepare ONE separate guarded visual-capture job, not another test/build/browser acceptance run. Original five-test-launch budget exhausted and unchanged. Fresh visual activation plus direct independent invocation review required before any server/config/capture. Same fixed09:11Z stop, >=1020s prelaunch reserve, supportedBashasync outer1020000ms, heavy_job.py timeout TERM/kill-after5s/900s/singlelease. No retry on failure.

Method: existing Playwright Chromium and pinned bundled fonts, actual index app at owned ephemeral localhost127.0.0.1:4175 ONLY; never verify.html. Fixture0 `after-dark`, selected mode, viewport1440x1000/deviceScaleFactor1/light initial theme. Source mainSHAfe0186cbe51f6de0e8a51089a8129ef52529deb1e8dc79c14983c142eb347178/testSHA417655b70a51f60e653b7938a21d1c0361cf10b5d774d85c50f93ec8933740a9 frozen. Capture healthy UI; wrap real CanvasRenderingContext2D.prototype.measureText on actual page, throw TypeError once on first real measurement during copy-update click, restore exact original in finally, capture actual retained-version label/actionable alert. Then valid copy edit and capture recovery. No DOM rewrite/fake pixels/production hook/synthetic metrics/export redesign. Fault only visual first-measurement whole-update illustration, NOT second-target/K proof (already separate browser evidence). Record real fault calls and actual alert text in lifecycle log, no new acceptance assertions. Browser error console recorded diagnostically. No mobile/keyboard/human aesthetic acceptance claim.

Intended new claimed PNGs: `docs/evidence/demo-20261015-viewer-visual/healthy.png`, `retained-error.png`, `recovered.png`. Healthy headline is fixture0 original, rejected headline `Visual rejected revision`, recovered headline `Visual recovered revision`. Screenshots actual full-page UI; prepared owned untracked `reports/issue28-viewer-0711-evidence/visual-capture.mjs` not committed. Existing devserver process spawned directly from installed Vite CLI (no new service/dependency), explicit localhost host/strict owned port. Before spawn/config prove absence, source/test hashes and resolved @fontsource realpath. Prior96 exact215B fontconfigc0da may be recreated only inside fresh activated job; exact owned bytes removed on finally/TERM/INT, never delete altered collaborator bytes. Server PID/startticks/boot/cwd/parent tracked; terminate only the owned spawned live child, wait bounded, browser close finally. SIGTERM/SIGINT handlers invoke cleanup within outer timeout kill-after5s; no guessedPID/process-group kill. Lifecycle/log/exit copiedreceipt association to actual guarded job required; missingidentity/foreignreceipt/failure STOP, no retry.

After capture root inspects pixels; final independent exact-head review follows. Expanded seven-product-path JD/noAI/nopush supplement only after visual review and explicit release; preserve b1c45ab commit/history, no amend/reset. Parent28OPEN partial3b/4a, rootsoleintegrationCIpublication.


Prepared visual script SHA256 `13befbe65cff7b3467b1b02561197bfa332e475df5c64a5580451349dd39f1ee`, not executed. Exact proposed supportedBashasync invocation (`run_in_background:true`, `timeout:1020000`), only after review/fresh activation:
```sh
cd /home/nala/.local/share/reflow-run-20261015/worktrees/cli2-issue28-viewer && python3 /home/nala/.local/share/reflow-run-20261015/heavy_job.py timeout --signal=TERM --kill-after=5s 900s node reports/issue28-viewer-0711-evidence/visual-capture.mjs > reports/issue28-viewer-0711-evidence/visual.log 2>&1
code=$?
cp /home/nala/.local/share/reflow-run-20261015/heavy-job-receipt.json reports/issue28-viewer-0711-evidence/visual.receipt.json
printf '%s\n' "$code" > reports/issue28-viewer-0711-evidence/visual.exit
exit "$code"
```
Canonical copy UNVERIFIED until external captured-job PID/start/exit association; no reused olderreceipt. No start/config/capture at preparation checkpoint.


### Visual actual activation — 2026-10-14T08:05:37.514731+00:00

Root authorizes ONE visual job; independent direct review148 PASS exactscript13befbe65cff7b3467b1b02561197bfa332e475df5c64a5580451349dd39f1ee, manager preflight08:04:36PASS, cli2-0711-visual-activation-receipt.json. Current frozen main/test/script verified, config/newPNGs absent, leasefree, >=1020s reserve before launch. Script unchanged; index-only realUI threePNG capture, no tests/build/verify.html/source edits/retry. Existing testbudget5/5 remains exhausted. STOPterminal pending independent pixel inspection, no supplementcommit inferred.


### Visual terminal FAILURE — no pixels, no retry

Taskbcyc3qqsu single authorized visual job at08:05:46Z exited1 before page/browser creation: pinned Chromium failed to load `libnspr4.so` (missing shared library), browser process exit127. Infrastructure failure, NOT product failure or visual acceptance. No screenshots produced; healthy/retained/recovery PNGs absent. No install/download/env workaround/retry or source/test/script edits. MainFE0186/test417655/script13befbe frozen. Testbudget5/5 still exhausted; one visual session consumed.

Script liveidentity08:05:46.644Z boot94aacc11-20cb-4eb5-b866-892494c8155f: node1688483/startticks2557656, timeoutchild1688482/2557656, launcher1688481/2557655, shell1688480/2557654; exact cwd/parentchain. Receipt {"command_executable": "timeout", "pid": 1688482, "drain_utc": "2026-10-15T12:30:00Z", "started_at_ms": 1791965146481, "lease_held_until_exit": true, "exit_code": 1} copied, local child match only, external association UNVERIFIED. Server1688491/startticks2557674 stopped08:05:46.931Z; exact owned215Bconfigc0da removed same time, cleanupcomplete08:05:46.932Z; actual config/serverPID absence confirmed. Browser failed at launch and Playwright cleaned its temporary directories. No supplementcommit/push; b1c45ab preserved, root publication blocked on actual visual inspection. STOP, original09:11end unchanged.

- visual.log SHA256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- visual.receipt.json SHA256 `1a6475531206e5de6ac70b71ddb2734d1aaa65d4a555503fc3fe5f3774074a42`
- visual.exit SHA256 `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865`
- visual.lifecycle.json SHA256 `dd13dde56e573c1bc4354759d70d94904d8142bcdb1d0c82e43b794e7bd192fd`
- visual.identity.json SHA256 `74c4931058639fe204f0ebcf4b878a96bd610b34958270d615a1e1098f64ea35`
- visual.devserver.log SHA256 `02f438daaeb4ca1e4d881ba1cb918a7f5c86dc5364e9d272c1c56980665a2d61`


### 2026-10-14 read-only native/Quorum visual context comparison

No launch/probe/config/browser/server performed. Sanitized receipts `visual.native-context.json` and `visual.quorum-context.json` capture only selected browser variables, Node/executable realpaths and libnspr4 paths. Native Bash: LD_LIBRARY_PATH unset, PLAYWRIGHT_BROWSERS_PATH unset, Nodev24.21.0 `/home/nala/.local/opt/node-v24.21.0/bin/node`, no libnspr4.so in selected known systemdirs. Successful persistent Quorum context: LD_LIBRARY_PATH=`/home/nala/.local/chromedeps/usr/lib/x86_64-linux-gnu:`; PLAYWRIGHT_BROWSERS_PATH unset; Nodev22.20.0 `/home/nala/.local/node-v22.20.0-linux-x64/bin/node`; existing libnspr4.so realpath `/home/nala/.local/chromedeps/usr/lib/x86_64-linux-gnu/libnspr4.so`. Both Playwright API resolve full Chromium `/home/nala/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`; observed failed headless path `/home/nala/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell` exists. Installed Playwright registry pins chromium/headless revision1243/browserVersion153.0.8010.12, consistent with prior GREEN runtimeChromium153.0.8010.12/Nodev22.20.0. Prior runtime does not record LD_LIBRARY_PATH or executable path/hash: cannot cryptographically prove prior specificlibrary/executable use; actual successful persistent-context settings plus pinned version match are concrete operational evidence, not a guessed path.

Minimal proposed correction only per-invocation environment: `LD_LIBRARY_PATH=/home/nala/.local/chromedeps/usr/lib/x86_64-linux-gnu:` and absolute proven Nodev22 binary for existing capture script. Keep PLAYWRIGHT_BROWSERS_PATH unset as both contexts; script/main/test unchanged. No globalenv/framework/policy change/install/download. Preserve failedscript13befbe original; script SHA remains13befbe (no content delta necessary). New separate visual recovery invocation and independent direct delta review/fresh activation required; not launched. Same09:11end/reserve1020/async1020000/inner900/onelease/actualindexonly/3PNGs/ownedcleanup. First failedvisual remains consumed with0PNG; tests5/5 unchanged.


### 2026-10-14 visual recovery preparation — isolation + invocation only

Root conditionally permits ONE separate visual recovery after independent delta review/fresh activation, NOT launched. Original failedvisual1/1/0PNG consumed; original script13befbe and all original visual.* unchanged. Historical GREEN LD/executablehash limitation retained. Per-invocation child environment only: `env LD_LIBRARY_PATH=/home/nala/.local/chromedeps/usr/lib/x86_64-linux-gnu: /home/nala/.local/node-v22.20.0-linux-x64/bin/node`, actual observed successful Quorum context; parent/native/globalenv untouched.

Prepare ignored `reports/issue28-viewer-0711-evidence/visual-recovery/visual-capture.mjs` copy; ONLY evidence outputdirectory constant changes from `reports/issue28-viewer-0711-evidence` to `reports/issue28-viewer-0711-evidence/visual-recovery`. All capture logic/guards/sourcehash/testhash/actual three PNG paths/finallycleanup unchanged. New SHA256 `ed15a0ee502e7a615084e18b001ddbcc94f819d193e8f170004b7c9bb741fceb`. No new persistent runner/service/watchdog; no source/test/framework/policy edits. All artifacts under new directory: visual.log, visual.exit, visual.receipt.json, visual.lifecycle.json, visual.identity.json, visual.devserver.log; previous visual.* untouched. One recovery only, fail/unknown STOP/no retry. Async1020000/reserve1020/end09:11/inner900/onelease unchanged. No server/config/browser/probe at preparation checkpoint.

Exact proposed supported functions.Bash `run_in_background:true timeout:1020000` invocation/trailer, only after review+freshactivation:
```sh
cd /home/nala/.local/share/reflow-run-20261015/worktrees/cli2-issue28-viewer && python3 /home/nala/.local/share/reflow-run-20261015/heavy_job.py timeout --signal=TERM --kill-after=5s 900s env LD_LIBRARY_PATH=/home/nala/.local/chromedeps/usr/lib/x86_64-linux-gnu: /home/nala/.local/node-v22.20.0-linux-x64/bin/node reports/issue28-viewer-0711-evidence/visual-recovery/visual-capture.mjs > reports/issue28-viewer-0711-evidence/visual-recovery/visual.log 2>&1
code=$?
cp /home/nala/.local/share/reflow-run-20261015/heavy-job-receipt.json reports/issue28-viewer-0711-evidence/visual-recovery/visual.receipt.json
printf '%s\n' "$code" > reports/issue28-viewer-0711-evidence/visual-recovery/visual.exit
exit "$code"
```
Canonical receipt unverified until actual guarded identity association. No supplementcommit before independent pixel review/release.


### Visual recovery actual activation — 2026-10-14T08:25:07.549541+00:00

Root accepts observed SAME persistentQuorumcontext with historical LD/executablehash limitation; direct review166 exacted15 directory-only copy/per-job env PASS, manager freshguard/receipt cli2-0711-visual-recovery-activation-receipt.json. Root alert1559843136161849457 verified/root-owned, not duplicated. ONE recovery only; main/test/originalscript/recoveryscript frozen, config/threePNGs absent, leasefree/>=1020s reserve checked before launch. Tests5/5 and firstvisualFAILED1/1/0PNG unchanged. Same09:11end/outer1020000/inner900/singlelease, no sourceedit/probe/retry/install/globalenv. STOPterminal for actualpixelreview before supplementcommit.


### Visual recovery terminal — actual pixels, inspection pending

Taskbvo0yxepu exit0; canonicalreceipt timeoutchild1750647/start1791966319587/leaseheldtrue/exit0 locally matches captured script chain. Node1750648/startticks2674966→timeout1750647/2674966→launcher1750646/2674965→shell1750645/2674964, exactboot94aacc11-20cb-4eb5-b866-892494c8155f/cwd/chain; scriptlive08:25:19.814Z. Receipt externalassociation and independentvisualinspection pending, no acceptance/commit inferred. Actualhealthy08:25:20.827Z→onceCanvasfault08:25:20.830Z→retained08:25:20.901Z→validrecovery08:25:21.059Z. Realfault observations {"utc": "2026-10-14T08:25:20.830Z", "event": "real-measurement-fault", "calls": 1, "throws": 1, "alert": "Update not applied: Visual capture measurement failure. The previous version is still shown and exported. Edit the copy or settings to try again.", "retainedLabel": "Previous version \u2014 not updated"}. No fakeDOM/new assertions/acceptance suite.

Server1750691 stopped08:25:21.083Z/browserclosed.102/exact215Bconfigc0da removed.102/cleanupcomplete.104; actualserverPID/configabsence confirmed. FrozenmainFE0186/test417655/original13bef/recoveryed15 unchanged; oldfailedvisual.* preserved/testbudget5/5unchanged. ONEseparatevisualrecovery consumed, no furtherjobs. STOPbefore supplementcommit/pixelreview; b1preserved. RootJDlibalert1559843136161849457 not duplicated. HistoricalGREENLD/exehash limitation retained.

- `docs/evidence/demo-20261015-viewer-visual/healthy.png` SHA256 `d3c7d27d93795ac38a7e709abf1250fa941abda5cf24043bd49a69c330d65076`
- `docs/evidence/demo-20261015-viewer-visual/retained-error.png` SHA256 `d29a6ebe221b71b7fe126cad8beb08e4a7f5045d2e6813d7dcb1d7949f95535d`
- `docs/evidence/demo-20261015-viewer-visual/recovered.png` SHA256 `83a5504f35e0898d4ed621cf6bc7abb4562ae3d97d2f959699c2a230963361e4`
- visual-recovery/visual.receipt.json SHA256 `5ecea3db94cb9a1bc1cdbf9024eb432d35cfff290301fece83349a9f2e96cda8`
- visual-recovery/visual.lifecycle.json SHA256 `9ac4b2ba0c2d1a6e47882711da19edb3b9922ccef42a2135a46ac22c64386634`
- visual-recovery/visual.identity.json SHA256 `5e0d8d271d30ae17a56e824e5ed9481f3aeb472b53f85debc06ecaea6ce7e8fb`
- visual-recovery/visual.log SHA256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- visual-recovery/visual.devserver.log SHA256 `af6f9d4554cc0035eb1e3cbc7615db243804097c3ecd9f9e32761cd19e0dcfe9`


## Final visual technical acceptance / supplement release — 2026-10-14

Direct independent review171–172 actual-pixel TECHNICAL PASS: opened healthy/error/recovered images; verified actual actionablealert wording, retainedversiontag, unchanged old previews versus rejected textarea, subsequent valid recovery in allfourpreviews. Independently associated timeoutchild1750647/start1791966319587/exit0 and cleanup/configabsence/frozenmainFE0186/test417655. Manager `cli2-0711-visual-recovery-manager-result.json` records result. Root received actualpixels private160/161/162 for separate viewing; no root aesthetic/publication acceptance claimed. Worker shared identical copies private284/285/286; captured originals remain authoritative.

Actual indexfixture0 `after-dark`, selectedmode, viewport1440x1000/deviceScaleFactor1, bundledfonts. Real Canvas measureText threw TypeError exactlyonce on firstmeasurement during rejectedcopy click; original restored before validedit. This illustrates whole-update failure, not additional second-target/K proof. No fakeDOM/productionhook/new acceptance assertions/mobile/keyboard checks. Actualretainedalert and oldpreviewlabel pixels; rejectedtextarea intentionally differs from retained exported revision. Validrecovery updates allfourcards/removesfailurelabel and alert.

Captured originals and SHA256 (links relative to these docs):
- [Healthy](../evidence/demo-20261015-viewer-visual/healthy.png): `d3c7d27d93795ac38a7e709abf1250fa941abda5cf24043bd49a69c330d65076`
- [Retained error](../evidence/demo-20261015-viewer-visual/retained-error.png): `d29a6ebe221b71b7fe126cad8beb08e4a7f5045d2e6813d7dcb1d7949f95535d`
- [Recovered](../evidence/demo-20261015-viewer-visual/recovered.png): `83a5504f35e0898d4ed621cf6bc7abb4562ae3d97d2f959699c2a230963361e4`

Child-only observedpersistentQuorumcontext correction: existing LD_LIBRARY_PATH `/home/nala/.local/chromedeps/usr/lib/x86_64-linux-gnu:` and Nodev22.20.0, no globalenv/install/download. Historical GREEN metadata did not record LD/executablehash; that limitation remains. Originalvisual FAILED1/1/0PNG with missinglibnspr4 preserved unchanged; one separate recovery1/1complete, scriptcopyed15 ONLYevidence-directory delta from13bef. Old interruptedtestcmd3 UNKNOWN remains unchanged; tests5/5accepted including independentlybound recovery696 and originalbuild. No furtherjobs, runstateREVIEW_ONLY/implementationfalse.

Server1750691 stopped08:25:21.083Z/browserclosed.102/exactowned215Bconfigc0da removed.102/cleanupcomplete.104; absenceconfirmed. Main/test/scripts/images frozen. Supplementalcommit only two ownedMD plus threePNG, atopb1c45ab1367a5372a19655907caadafb7a4f440f; no amend/reset/push/bundle/server/export. JD per-command author+committer/noAI/globalconfigunchanged. Final immutablehead independent review pending, root sole bundle/pixels/integration/CI/publication/closure. Aggregate c946→supplement sevenallowedpaths; source/test only in firstcommit. Parent28OPEN partial3b/4a, screenshots technical evidence not mobile/keyboard/humanvisualquality acceptance.

Manager result receipt SHA256 f5716fb220ae5114f196e983012ec0383958c81ab33a8f66a8413ef7f1ade9c4 is the08:26 terminal association snapshot with VISUAL_REVIEW_PENDING; later direct171–172 pixel PASS/supplementrelease supersedes only that waiting status. Snapshot unchanged, no claim it originally contained finalvisualverdict.
