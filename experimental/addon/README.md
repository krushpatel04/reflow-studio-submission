# JH-01 Express round-trip probe

Experimental. Plan: [jh-01-2026-10-13.md](../../docs/plans/jh-01-2026-10-13.md). Issue: [#104](https://github.com/kj-squared-labs/reflow-studio/issues/104).

This probe answers one question: can an add-on create native text in Adobe Express that keeps its identity through a person's native edit, a save and reopen, and a repeated operation? It does not run the Reflow engine and is not the viewer add-on.

## Results so far

On October 8, 2026, one complete run passed in Chrome 154 ([evidence](../../docs/evidence/jh-01/README.md)):

- The add-on created native text. Its native ID and `addOnData` tag survived a native edit and a save/reopen.
- A repeated operation applied once.
- One host undo reverted the add-on call's geometry and metadata as a single step.
- The comparator reported no findings across snapshots A–E.

The panel only loads with a complete HTML document and the Playground template's SDK import. The run covered one text node in one browser and has not been independently reviewed.

## Files

| File | Where it goes |
| --- | --- |
| `playground/index.html` | Code Playground → Add-on Mode → **HTML** tab |
| `playground/iframe.js` | **Iframe JS** tab |
| `playground/document.js` | **Document JS** tab |
| `compare.mjs` | Run locally on the saved snapshots |
| `compare.test.mjs` | `node --test experimental/addon/compare.test.mjs` |

## Run sheet

Use a new, disposable Express document. Write down the date, the browser and its version, and any Playground or manifest settings you change. Save each snapshot's JSON as `reports/jh-01/<label>.json` (the folder is git-ignored). **Copy JSON** is blocked inside the Express iframe, so copy the JSON by hand or transcribe it from the panel.

1. Open Code Playground in Add-on Mode, paste the three files, and click **Run Code**. The panel should show "Ready". `index.html` must stay a complete HTML document and `iframe.js` must keep the template's `new.express.adobe.com` import: with an HTML fragment the panel stays blank and the console reports `'panel' runtime not initialized` ([evidence](../../docs/evidence/jh-01/README.md)). If the first **Run Code** after the welcome dialog does nothing, click it again.
2. **Create probe text**. Confirm that a text box reading `Reflow probe JH-01` appears on the canvas. Take a snapshot labelled `A-created`.
3. With Express's own text tool (not the add-on), change a word in that text box and drag it to a new place. Take a snapshot labelled `B-edited`.
4. Wait for Express to show the document as saved. Close the tab, reopen the document from Express home, run the add-on again, and take a snapshot labelled `C-reopened`.
5. Click **Apply move** twice with the same operation ID `move-1`. The second click must answer "operation already applied". Take a snapshot labelled `D-retried`.
6. Press the host's Undo once and note by eye what changed. A resolved promise is not proof of undo.

Then compare:

```bash
node experimental/addon/compare.mjs reports/jh-01/{A-created,B-edited,C-reopened,D-retried}.json \
  --expect-same B-edited:C-reopened
```

It exits 1 for a duplicate node, a changed native ID, a lost metadata tag, a missing node, or any change between `B-edited` and `C-reopened`. Also read the `C-reopened → D-retried` transition: `bounds.x` should increase by exactly 40, once.

If sign-in, Premium or development-mode gating stops the run, record the exact screen and message. That blocker is a valid result for this slice.
