# Viewer refinement — October 29, 2026

[Plan](../../plans/2026-10-29-studio-polish.md). The workbench is a local TypeScript development viewer; these screenshots do not claim native Adobe Express integration or Python-renderer parity.

## What changed

A compact neutral workspace replaces promotional headings and small tinted UI. Source, headline and format controls use plain labels and larger text. Desktop previews use two columns; mobile previews use one. Diagnostics stay visible, and a neutral “Checks clear” label is not an aesthetic-quality verdict.

Each displayed source or variant has an **Inspect** action. The native modal dialog supports Fit, 100% and 200% views; large artwork scrolls within the dialog. It renders the current displayed source, target and baseline/Reflow mode with fresh SVG clip IDs. Zoom changes presentation size only. Escape and Close restore the inspection button's focus; a completed layout update closes a stale inspector. Existing export, findings, error and recovery paths remain.

The existing Express-themed Spectrum controls are retained. Direction follows [Adobe's implementation guidance](https://developer.adobe.com/express/add-ons/docs/guides/build/design/implementation-guide), without installing another UI framework or claiming Adobe endorsement.

## Verification

- RED: missing Inspect action and mobile stage width 158 px instead of >300 px. [Original failure evidence](inspector-red.txt).
- GREEN: keyboard open/Escape/focus, unchanged artwork inventory, exact 1080/2160 CSS-pixel dimensions, baseline identity, unique SVG clip IDs, single-column mobile, readable helper text and no page overflow. [Focused result](inspector-green.txt).
- **29/29 Playwright tests**, including all existing export, worker/request lifecycle, stale-result, error and recovery checks. `/verify.html`: **20/20 checks**, no browser errors.
- **741/741 Node tests**, build, **30 native layouts** and **70 benchmark PNG/SVG/JSON sets** passed. The eight existing TypeScript benchmark warnings remain; these are not Python-engine scores.
- Astra inspected before/after, dark, mobile and dialog screenshots, reviewed source and independently exercised mobile 200% zoom, contained scrolling, Escape/focus and baseline identity. **ACCEPT**, no blocking finding. This is AI review, not a human preference study.
- A test-draft uniqueness assertion initially traversed Spectrum shadow roots, whose local `label` IDs may repeat. It was corrected to test document-scoped IDs and actual SVG clip IDs; no application behavior was weakened.

The [production-build smoke](built-smoke.json) also passed with external network requests blocked: edit, inspect, actual-size view, Escape/focus and JSON export with exact edited copy. Disconnecting the local HTTP server correctly retains the previous artwork and offers Retry; restoring it recovers. The browser workbench requires its local server to serve workers/fonts, unlike the separately packaged offline Python engine. Early ad hoc probe drafts incorrectly treated raw SVG textContent as spaced text across tspans and used a mismatching exact-label locator; assertions were corrected to join rendered lines, query the actual combobox role/name and verify the exported source string. No product changes were needed.

The flow checked is source/copy controls → local worker → committed preview → modal inspection / JSON and SVG export. There is no server API or database. Complete generated logs and screenshots are under `reports/studio-polish-2026-10-29/`.

## Visual comparisons

| View | Evidence |
| --- | --- |
| Previous desktop | [Before](before-desktop.png) |
| Updated desktop | [After](after-desktop.png) |
| Dark workspace | [Dark](after-dark.png) |
| Mobile workspace | [Mobile](after-mobile.png) |
| Landscape inspection | [Desktop inspector](inspect-desktop.png) |
| Source inspection | [Mobile inspector](inspect-mobile.png) |

The mobile page is longer because previews are readable rather than compressed into two columns; a View formats link skips the controls. The main bundle is about 514 kB / 82 kB gzip and retains Vite's >500 kB warning. No new dependency was added. This slice improves presentation and inspection, not the underlying TypeScript layout choices or competition ranking.

Archived console excerpts have trailing whitespace removed; raw generated logs remain under reports.
