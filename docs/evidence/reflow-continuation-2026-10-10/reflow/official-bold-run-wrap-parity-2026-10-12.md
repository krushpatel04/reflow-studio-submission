# Official full-span bold-run wrap parity — 2026-10-12

## Scope and authorization

Upstream observational evidence for #3 only. Not Reflow code, current-main red/green, parent #3 closure, Adobe intent, human quality judgment, bounds measurement, or native acceptance. PY-FONT-RED remains HOLD, untouched. No upstream/Reflow source modified.

Coordinator assigned CLI2 these exact fresh paths: this doc, its `.md.sha256`, and ignored `reports/ofc-bold-wrap-2026-10-12/**`. All three were absent on disk before creation. Checked local morning/provider manifests and referenced plans plus ownership/unblock receipts: no exact-path/slice collision; local docs showed no equivalent probe. Not global clearance. Coordinator relayed explicit root final claim clearance and authorization for **one** finite job after Reviewer5 APPROVE-PLAN, STATIC ONLY. All five review conditions were adopted.

Actual preflight: guard state `phase=ACTIVE`, `implementation_authorized=true`; existing lease available. Upstream HEAD `a44a06046b0413f0785e7203955c3822e0acbc32`, `git diff --quiet HEAD` exit 0, `git status --porcelain` empty. Exact source/font/installed renderer hashes checked before the job; upstream hashes checked again inside and after it. The guard's active PID was asserted to be the probe's timeout parent. No state mutation, guard bypass, retry, alternate input, or second heavy job.

## Plan and source hypothesis

`renderer/converter/convert.py:156-189@c2cfb56dd8a906072a6ba47cda9b689ecfe842f5`:
- L160-166 derives weight/style from the element, computes `char_widths`, then `wrap_text`.
- L167 sets `n = len(wrapped)`.
- L182-185 applies run `font_weight` to per-character bold flags **after** wrapping.
- L193/L200/L203 emits wrapped text, bold flags, and line indices.

`renderer/converter/wrap.py:8-20` loads the measured face via `font_manager.lookup`, then Skia `font.getWidths`. L23-59 greedily changes existing spaces into newlines without changing string length. This probe uses ASCII, so character/run offsets are unambiguous. Full-span run `start=0, end=len(content)=20` neutralizes the separately documented inclusive/exclusive end issue.

`renderer/converter/convert.py:237-245` constructs a local-font `CrelloV5Renderer` without a download; L249-272 `render_design_to_png` performs real conversion/rendering and writes PNG bytes. Installed `cr_renderer/fonts.py:68-111` returns lookup bytes; the probe asserted exact Regular/Bold bytes on both the measurement manager and renderer manager, with no fallback. No mocks.

Approved procedure: one fixed string/font/size; derive one narrow width between distinct full-string advances; wide controls first; stop inconclusive if prerequisites or controls fail; at most four PNGs. No pixel-bound or ink-box measurements. Record equality outcomes separately, retaining unexpected outcomes rather than assuming a defect.

## Inputs and width selection

One fixed string: `Bright morning light` (20 ASCII characters). Family `Solstice Sans`, size 40, black `rgba(0,0,0,1)`, normal style, left alignment, line_height 1.2, letter_spacing 0. Canvas 900×300; element ID `headline`, x/y=20, height=240.

A/C: whole-element `font_weight=bold`. B/D: `font_weight=regular` plus `style_runs=[{start:0,end:20,font_weight:bold}]`. Within each pair the probe asserts that removing only these bold representations leaves identical input JSON; all other fields remain protected. All four inputs pass the pinned schema through the existing `scripts/lica_official/schema.py` helper. Complete source objects were asserted unchanged after conversion and after rendering.

| Advance at size 40 | Regular | Bold |
| --- | ---: | ---: |
| `Bright` | 116 | 123 |
| `morning` | 171 | 174 |
| `light` | 86 | 92 |
| Full string, including spaces | 395 | 405 |
| Widest word | 171 | 174 |

**Measured larger face: Bold**, not assumed. Narrow width = (395+405)/2 = **400**. Wide width = ceil(max(395,405))+40 = **445**. Both positive; x+width = 420 and 465, each ≤900. Narrow 400 ≥ both widest-word advances. No search, alternate string, or retry. Raw character advances retained in `result.json`.

## Actual guarded command and receipt

Exact invocation structure below; only local absolute prefixes replaced by `<runtime>`, `<guard-root>`, `<repo>`. Unredacted actual command retained privately in ignored `command.txt`. Set these prefixes to the pinned locations to reproduce; **this is not authorization for another run**.

```sh
CHAMELEON_UPSTREAM="<runtime>/chameleon-a44a060" \
OFC_GUARD_ROOT="<guard-root>" \
LD_LIBRARY_PATH="<runtime>/chameleon-syslibs/root/usr/lib/x86_64-linux-gnu" \
python3 "<guard-root>/heavy_job.py" \
  timeout --signal=TERM --kill-after=5s 110s \
  "<runtime>/chameleon-venv311/bin/python" \
  "<repo>/reports/ofc-bold-wrap-2026-10-12/probe.py" \
  > "<repo>/reports/ofc-bold-wrap-2026-10-12/job.log" 2>&1
```

Mandatory existing `heavy_job.py`, not a new job route. Timeout 110s plus 5s termination grace ≤115s. Its exclusive lease is held until the child exits. Actual guard receipt: `command_executable=timeout`, `started_at_ms=1791765980962`, `drain_utc=2026-10-13T11:30:00Z`, `lease_held_until_exit=true`, `exit_code=1`. No timeout/cutoff field. Local PID omitted here. Copied receipt retained as `guard-receipt.json`.

**Actual guarded exit: 1**, from the narrow equality oracle after all four PNGs and results were retained:

```
AssertionError: narrow converted text equality oracle failed
```

This is an expected behavioral failure of the equivalence assertion, not an import/setup failure or a skipped probe. `result.json` also records the independent line/bold/pixel comparisons before the assertion. The first final assertion fails, so the later final assertion statements are not reached; their comparisons were already evaluated and saved. Upstream source stayed clean; lease available after exit; `heavy-job-active.json` absent. Root was notified that the single job had finished and could revert authorization. No assertion that root's later state mutation was verified.

## Results: controls before narrow

Exactly **one job**, **four actual PNGs**, order **C, D, A, B**, no retries. Every decoded PNG is RGBA 900×300 (1,080,000 decoded bytes). `max_size=900` equals the maximum canvas dimension, so installed renderer `_get_scale_size` uses scale 1; decoded dimensions asserted. No downscaling/rescaling.

| Comparison | C/D wide controls (445) | A/B narrow (400) |
| --- | --- | --- |
| Converted `text` equal | true | **false** |
| Converted `text_line` equal | true | **false** |
| Converted `font_bold` equal | true | true |
| Decoded RGBA dimensions equal | true | true |
| Decoded RGBA bytes equal | true | **false** |
| Conversion warnings | 0 each | 0 each |
| Rendering returned warnings | 0 each | 0 each |
| Captured Python/logging warnings | 0 each | 0 each |

C/D each: converted text `Bright morning light`, no newline; 20 zero line indices, 20 true bold flags. Both decoded pixels identical. All controls pass before narrow rendering.

A: whole-element bold at width 400:

```json
{"text":["Bright morning\nlight"],"text_line":[[0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1]]}
```

B: regular element + full-span bold run at width 400:

```json
{"text":["Bright morning light"],"text_line":[[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]]}
```

Both retain 20 true bold flags. Converted newline replaces the original space at index 14 in A, consistent with upstream `wrap_text`; the protected input string itself is unchanged.

**Classification: rendered-wrap discrepancy**, because narrow converted lines differ **and** decoded PNG pixels differ after passing wide controls. The observation is consistent with wrap widths being measured on the element face before full-span run overrides. It does not establish Adobe's intended contract or acceptance. Conversion-only mismatch would remain conversion-only; pixel-only mismatch would not establish wrap cause; all-equal results would mean no discrepancy. Those alternative outcomes were not observed here.

Warnings distinction: official conversion and rendering return empty warnings; captured Python/logging warning lists empty. Raw stderr nevertheless contains **one** `Fontconfig error: Cannot load default config file` line from the extracted system-library environment. It is recorded, not silently counted as warning-free execution. Both managers' selected bytes matched the actual bundled faces, so this stderr line did not imply font fallback. No images were visually judged.

## Retention and runnable check

Ignored `reports/ofc-bold-wrap-2026-10-12/` retains: `probe.py`; exact A/B/C/D input JSONs; converted output JSONs; warning JSONs; PNGs; raw decoded RGBA; full result; actual command, output/exit, guard receipt, postflight receipt, artifact manifest. Conversion JSON preserves every column; `image` objects are represented by their mode, size and decoded-byte hash rather than an unserializable PIL object. Raw warning/log output retained. `probe.py` is runnable through the same mandatory guard, pins source/face hashes, asserts schema validity/identity, evaluates controls before narrow, saves outcome before raising equivalence assertions. It is a retained observation, not a CI change.

Hashes below bind the observed inputs/output. Sources/fonts are also bound in the probe. The artifact manifest does not include its own hash; that hash is listed separately. Private absolute paths/tracebacks in ignored raw command/log are not publication content.

### Pinned source and face SHA256

| Path | SHA256 |
| --- | --- |
| `brand_kit/fonts/SolsticeSans-Bold.ttf` | `609a215925701021b97578c71702bfc492882556ce05602b670aaa74a32a1156` |
| `brand_kit/fonts/SolsticeSans-Regular.ttf` | `4500567b25fc1af2983cee01c1e57e01a0108b8b3844c182936d14c7dec7f69c` |
| `chameleon_design_schema_v0.9.json` | `14d97d48c4f00357f7f27d2e8000ef9cc8778cac7cd5a621ed7e1261f949820d` |
| `renderer/converter/brand_fonts.py` | `c4f58d99767c7a770d731080c6bccc16334dc1058ac959747b6d0d3867c9d0a5` |
| `renderer/converter/convert.py` | `2d4f68984f1cdfe41a068d477270aedfd07f9d35a22ef61a1399ebd4774d0cde` |
| `renderer/converter/wrap.py` | `3055a4c83009760a225233c43ae3433d8ef597bc2f6025c867833806accd0975` |
| `scripts/lica_official/schema.py` (local read-only validator) | `c99f1feec6332396e4f2769aa67331177dd5e1ee00a3443996f704d11beea803` |
| `heavy_job.py` | `2897c4d461a28484ab08afff9aa33894011a4182df873ae9f8fe6a1483ecaeca` |

Pinned venv311: Python 3.11.16, Pillow 12.3.0; cr-renderer VCS commit `a17e1fb9a732959dd6c21ae168d5ee09d74bd64f`. Installed renderer source SHA256:

- `cr_renderer/fonts.py`: `b927e1d49672204eec5ff79cc776583e1c624c68919366a5dc22437524766ed9`
- `cr_renderer/renderer.py`: `bd7f3cff8c5506b6e37e52545a019fdbeae84762224ee99bfc6714b98c1db0d4`
- `cr_renderer/text_utils.py`: `9ffe812c455b67b5591d8ee39fd2a6c50fc27cad001a03762b9e62e79a27cdbc`

### Retained artifact SHA256

Paths relative to the ignored report directory.

| Artifact | Bytes | SHA256 |
| --- | ---: | --- |
| `A.conversion.json` | 2002 | `81bbbfccd093e13348098cb10188e9aa0944a7de6e9452a50cb3efe952425a10` |
| `A.input.json` | 483 | `bea9b0817540bf7c0292a47b62412c7d05d9ef993f21d316a3dea8e2ba9fb693` |
| `A.png` | 7561 | `f9edbc5d2a9bf81a8347608c33f04bfce7dca1643a1e0f781ed74bbf034bd6ea` |
| `A.rgba` | 1080000 | `79c9a0159a80ef3c0761811ceeda384a21aa73825737af8dbddd3ed5c9e5559b` |
| `A.warnings.json` | 111 | `2bc8782e91b8c680b7a651607f9fd3f08b05eb8a24d2a53ef08fe8e3e1f73b76` |
| `B.conversion.json` | 2001 | `275c258cc48371deca01c42370d4a01d28ebce8ed1db3eb040ba7a1713477ac7` |
| `B.input.json` | 612 | `c9aa9def4259562cc8f1566371281b94f6c25f6f0d7e28ac964819b97e812cdb` |
| `B.png` | 6020 | `aa252f99af2b658978f7114deabb973251c791ca2b67127e19c60f93f1bf4a95` |
| `B.rgba` | 1080000 | `b23d278ef474c1cf834c3d053b85c431ff68188ad56ea119bdd7e7940c481790` |
| `B.warnings.json` | 111 | `2bc8782e91b8c680b7a651607f9fd3f08b05eb8a24d2a53ef08fe8e3e1f73b76` |
| `C.conversion.json` | 2001 | `2877883c994b019e3b6fab463b4c5ed79144b0dda7afc69b1fd9cd70fc2454e7` |
| `C.input.json` | 481 | `68d33bec464ec0ad5d6b54c4a05ead242db133d557bb79a3e0968e0dfc9f9823` |
| `C.png` | 6020 | `aa252f99af2b658978f7114deabb973251c791ca2b67127e19c60f93f1bf4a95` |
| `C.rgba` | 1080000 | `b23d278ef474c1cf834c3d053b85c431ff68188ad56ea119bdd7e7940c481790` |
| `C.warnings.json` | 111 | `2bc8782e91b8c680b7a651607f9fd3f08b05eb8a24d2a53ef08fe8e3e1f73b76` |
| `D.conversion.json` | 2001 | `2877883c994b019e3b6fab463b4c5ed79144b0dda7afc69b1fd9cd70fc2454e7` |
| `D.input.json` | 610 | `8593d8f18e22ff6bfb67eebc0b2a700e6a0f4c2defe87dee4da61f6fa6a06824` |
| `D.png` | 6020 | `aa252f99af2b658978f7114deabb973251c791ca2b67127e19c60f93f1bf4a95` |
| `D.rgba` | 1080000 | `b23d278ef474c1cf834c3d053b85c431ff68188ad56ea119bdd7e7940c481790` |
| `D.warnings.json` | 111 | `2bc8782e91b8c680b7a651607f9fd3f08b05eb8a24d2a53ef08fe8e3e1f73b76` |
| `command.txt` | 702 | `366d75fe6e5cabc73d6957ebcc3d73608afb179de09102581e7af5c6d0878c79` |
| `guard-receipt.json` | 180 | `e1a23507f30ac08ef402dd5a42170e3b6f001bbe03b3421c8024c02f2d073003` |
| `job.exit` | 2 | `4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865` |
| `job.log` | 11762 | `296e627b35f45bfea50f565562a9f9b8000b7091e4c6f03b456526d7f19f42d8` |
| `postflight.json` | 203 | `a45a72609bebce3ab8cce24ae364584ad6522fd553c087e5a8b22fd7e5a837ad` |
| `probe.py` | 10286 | `f24a7a366bc47b75e77432967837cf95b740bfde42bcd96d96b864eefd23bc4e` |
| `result.json` | 8721 | `68639d584a9609ef9cdb5c9893b999572733d911543ffcbbedac0f6a41cea1de` |
| `manifest.json` | 3352 | `a2fe73976208f59cd521551f50ed43338ceedb7e595c327826b52fdb11c59a76` |

## Boundaries and handoff

- No changes to upstream/Reflow source or excluded ownership paths; PY-FONT-RED remains HOLD. No registry activity.
- No current-main receipt: current main absent locally, no Reflow production fix/test claim.
- No bounds measurement, human quality judgment, Adobe-intent claim, native acceptance, or parent #3 closure.
- All evidence is a single pinned upstream run. No retry, alternate input or generalization beyond this fixed case.
- Exact result routed through Coordinator for Reviewer5 independent exact-blob/source review. Root alone publishes; no immutable export made before review.
- Skill assessment: existing run guidance plus retained probe suffice; no new skill created.
