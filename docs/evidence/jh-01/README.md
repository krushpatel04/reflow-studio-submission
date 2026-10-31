# JH-01 evidence: native Express text round trip (slice 1)

Recorded October 8, 2026 (local evening; snapshot timestamps are UTC October 9). Issue [#104](https://github.com/kj-squared-labs/reflow-studio/issues/104), parent #4. Plan: [jh-01-2026-10-13.md](../../plans/jh-01-2026-10-13.md). Probe: [experimental/addon](../../../experimental/addon/README.md). Source: branch `jh/jh-01-express-round-trip`, base `62937e1`.

This is the first observation of an add-on running inside Adobe Express for this project. It covers **one native text element** in one scratch document. It does not cover images, groups, multiple pages, running the Reflow engine, a distributed add-on, or the viewer requirement.

## Environment

| | |
| --- | --- |
| Host | Adobe Express web, Code Playground, Add-on Mode, owner's personal account; Settings → Add-on Development already enabled |
| Browser | Google Chrome 154 (macOS), driven through Claude in Chrome; the owner signed in by hand |
| Document | New blank document, `urn:aaid:sc:AP:f0272e11-8bdd-4c56-a2cf-e6ee1d4250cc` |
| Probe files | `experimental/addon/playground/*` (SHA-256 in [`hashes.txt`](hashes.txt)). They were entered into the Playground as whitespace-minified one-line equivalents; the only other change was replacing one template string with string concatenation |

## Official sources (rechecked October 8)

- Starter `a44a06046b0413f0785e7203955c3822e0acbc32` is unchanged. FAQ Q5 still says Stage 1 includes "the required (but not scored) viewer add-on"; the challenge brief lists engine deliverables without it. **Unresolved, not decided here.**
- The APIs used are documented and not flagged experimental: `runtime.apiProxy` / `exposeApi`, `editor.createText`, `insertionParent.children.append`, `TextNode.fullContent.text`, `boundsInParent`, `translation`, `addOnData`. The TextNode reference says `id` "stays the same when the file is closed & reopened". The metadata guide does not say whether `addOnData` survives a reopen; this run observed that it does (below).

## Results

Snapshots are in [`snapshots/`](snapshots/). The add-on panel's clipboard write is blocked inside the Express iframe, so each snapshot was **transcribed from a zoomed screenshot** of the panel's JSON output and checked against a second, horizontally scrolled view.

| Step | What was done | Observed |
| --- | --- | --- |
| A-created | Add-on **Create probe text** | One text node `cd4df617-275e-432e-bf26-44be534a3022`, text `Reflow probe JH-01`, tag `reflow.sourceId=probe-1`. Express placed it largely off the page (x −545, y −111, w 1091, h 154) |
| B-edited | Native Express UI: drag the box onto the page, double-click, replace the word `JH-01` with `edited` | Same ID; text `Reflow probe edited`; y −111 → 205; width grew with the longer word; tag kept |
| C-reopened | Wait for autosave, go to Express home, reopen the document URL, restart the Playground add-on | **Identical to B**: ID, text, bounds and tag all persisted |
| D-retried | **Apply move** with operation `move-1`, then again with `move-1` | First call `applied: true`, x −560.93 → −520.93 (+40 once), tag `reflow.lastOp=move-1` added. Second call `applied: false`, `operation already applied` |
| E-undo | One host ⌘Z on the canvas | x back to −560.93 **and** `reflow.lastOp` removed: the add-on's move and metadata write were undone as one step. Otherwise identical to C |

Comparator (`node experimental/addon/compare.mjs … --expect-same B-edited:C-reopened --expect-same C-reopened:E-undo`) exits 0 with **no findings**. It saw no duplicates, no ID change, no lost tag, nothing missing, and no change across reopen or undo. Output: [`snapshots/compare-output.json`](snapshots/compare-output.json).

The comparator's own tests were written first: 9 tests failed before `compare.mjs` existed and pass after it. Six deliberately broken versions of the comparator were each caught by a test. `npm test` (685) and `npm run build` are unaffected.

## Integration findings

1. **The Playground needs a complete HTML document.** With an HTML fragment, even a one-line control add-on gave a blank panel in Firefox and Chrome. Adobe's own template ran in the same session. After switching to a full `<!DOCTYPE html><html><head>…<body>` document and the template's import, the probe ran.
2. **Use the template's SDK import.** `import addOnUISdk from "https://new.express.adobe.com/static/add-on-sdk/sdk.js"` and `apiProxy("documentSandbox")`. The developer page's Add-on Mode sample (global `addOnUISdk`, `documentSandbox.dispatch`) does not match the template the Playground actually ships.
3. **The failure message points at the wrong half.** A panel that never initializes surfaces in the document sandbox as `'panel' runtime not initialized within set time limit`.
4. **`createText` placement is not layout-aware.** New text arrived at a large default size, mostly outside the page. An engine that writes native text must set size and position explicitly.
5. **Native IDs and `addOnData` survive save and reopen.** This supports `addOnData` as the source-ID mapping mechanism for later slices. It is one observation of one node, not a transaction guarantee.
6. **Host undo treats one add-on call as one step.** Undo reverted the geometry and metadata written in the same call. An operation-ID guard stored in metadata is therefore cleared by undo, so a retry after undo correctly reapplies.

## Blockers and limitations

- **Clipboard export.** Copy JSON is blocked in the add-on iframe; screenshot transcription is the evidence path. A future probe should render a short checksum next to the JSON so transcription can be verified mechanically.
- **Automation side effect.** While the editor was being driven automatically, keystrokes went to the canvas of an earlier scratch document (`urn:aaid:sc:AP:96631073…`), adding stray text boxes and pages. That document is not used for evidence and was not deleted; the owner can discard it.
- **Scope.** One text node, one page, one account, one browser, one run. Firefox was seen only failing with the fragment HTML; the corrected files were not re-run there. Images, groups, crops, paint order, fonts, multiple pages, partial-failure recovery and a running Reflow engine are untested.
- **Viewer.** The FAQ/brief conflict remains open. This probe is not a viewer add-on and does not show that one is or is not required.
- No independent review yet. The packet requires a named teammate to review this exact evidence before acceptance.
