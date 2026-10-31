# Host access observation and remaining native probe

## Actual observation

September 26, 2026, approximately 23:56–23:59 UTC, dedicated `reflow-issue4` session using agent-browser **0.38.1**. Fresh CLI session; no reuse/import of authentication state.

1. Browser MCP navigation to Express failed with **Transport closed** before any host observation.
2. CLI fallback `npx --yes agent-browser --session reflow-issue4 open https://express.adobe.com/` reached Adobe **Sign in**. Blank email input and sign-in options were visible. [Screenshot](sign-in.png) was visually inspected; no personal account data appears.
3. Official Playground short link `https://www.adobe.com/go/addon-playground` failed with `net::ERR_HTTP2_PROTOCOL_ERROR` in the CLI. The official developer page links to a redirect destination `https://new.express.adobe.com/new?category=addOns&mode=playground`; opening that directly reached a **Sign in** iframe with Google/Facebook/Apple/email options. [Screenshot](playground-sign-in.png).
4. No account was selected, credentials entered, terms accepted, or authenticated editable canvas reached. The screenshot also shows a guest continuation option; guest-mode capabilities were not tested. No deliberate document creation/mutation or native operation occurred, and no manual repair time was measured.

The attempted authenticated-development path stopped at user-controlled Adobe authentication in an accessible browser session. Guest-mode development was not established; this is not a claim that every possible anonymous path is unavailable. Then open a disposable editable document and enable Add-on development/Code Playground if needed. This is a continuation prerequisite, not a request for credentials in chat. Authentication elsewhere on the Mac was not examined or inferred.

The public Acrobat hub was independently accessible without sign-in in `reflow-issue4-rules`. That proves access to public source documents, **not** authentication to Express. The PDF accessibility control was keyboard-focused and activated after a pointer click was covered by the document layer. No AI summary or generated answer was used as rule evidence.

## Native next-run acceptance checklist (unexecuted)

Use [official Playground launch instructions](https://developer.adobe.com/express/add-ons/docs/guides/getting-started/code-playground) and [current Architecture examples](https://developer.adobe.com/express/add-ons/docs/guides/learn/platform-concepts/architecture). Record SDK/host build if exposed, manifest/API flags, browser version, document type and enabled development mode; no tokens/account details.

1. On a scratch document, use the current Add-on template with a Spectrum control. Disable repeated activation while one request is pending and display success/error. Check keyboard access.
2. Expose one synchronous document function through `runtime.exposeApi`; call via `apiProxy(RuntimeType.documentSandbox)` after UI SDK readiness. Create native text with `editor.createText(content)` and append it through `editor.context.insertionParent.children`. Use the current official reference to position it. Return plain ID/type/content data, not the native proxy object.
3. Select the created text in Express, change a word using the native text tool, then resize/move it independently. Record UI request/result and native edit as separate observations. Merely displaying a text-shaped raster fails this checkpoint.
4. Observe save completion, close/reopen, and verify ID/content/style/editability. Undo/redo in the host and record actual count/geometry/content changes. Never infer undo success from a resolved API promise.
5. Before multiple elements/pages, choose an operation-ID/source-ID mapping policy. Inject failure after the first native write; inspect partial state and original preservation. Retry twice with the same operation ID; require no duplicate output. Metadata is a candidate mechanism, not a proven transaction system.
6. Expand to text+image+group+layer source → adapter → same Reflow engine → native output. Test unsupported node/font/assets, transparency/crop, async page navigation, and matched native/official-renderer outputs. Archive failures and conversion losses alongside successes.

The two-design event-poster/product-promotion walkthrough remains pending. Native Express resize comparisons for #7 must use matched source/fonts/sizes and a declared first-result/equal-candidate rule; no superiority claim follows from SDK features.

This remains useful finale/product work. For stage-one qualification, prioritize the [offline schema/renderer tests](schema-support.md) without waiting on Adobe sign-in.
