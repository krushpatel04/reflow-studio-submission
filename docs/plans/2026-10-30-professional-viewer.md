# Professional viewer refinement

## Problem and intended result
The current viewer spreads related artboard controls across an undifferentiated page. The settings panel disappears during long reviews. Refine the existing workspace into a coherent creative tool: compact neutral application chrome, a persistent desktop properties panel, clearly grouped artboards, consistent control geometry, and restrained typography. Keep artwork, comparison, findings and export immediately understandable.

## Scope, risks and implementation
Single-owner changes to viewer markup/styles and browser coverage. Preserve engine behavior, source assets/text, export semantics, keyboard controls, mobile settings disclosure and both themes. Risks are sticky-panel focus traps, short-window clipping, narrow toolbar wrapping, and accidentally reducing artwork size. No source design or private evaluation material enters this change.

1. Add and run a failing behavior test for settings remaining reachable while reviewing lower artboards; run existing viewer characterization before styling.
2. Consolidate accumulated CSS overrides into one responsive system. Add small format silhouettes and group card metadata; use quiet surfaces and consistent controls without decorative effects.
3. Inspect desktop, tablet and phone screenshots in both themes; check short desktop, expanded settings, full-size comparison and keyboard focus.
4. Run Node tests, build, native verification, benchmark, browser acceptance including `/verify.html`, and production resource checks. Preserve a dated review packet and publish validated work after fetching.

## Acceptance
- Desktop settings remain within the viewport while the canvas scrolls; all controls remain reachable in short windows and by keyboard.
- No horizontal overflow at 320/390/820/1440px; mobile settings stay collapsed initially; narrow inspector retains at least 380px of artwork height.
- Existing source/copy/format/comparison/zoom/findings/download behavior passes. No visual concealment of warnings or unsupported quality claims.
- Visual inspection confirms consistent panel spacing, readable secondary text, clear focus states and prominent artwork. Tests establish behavior, not an objective aesthetic score.

## Execution evidence
- Before production changes, `npx playwright test tests/browser/professional-viewer.spec.ts tests/browser/workspace-review.spec.ts`: three existing characterization tests pass; new persistent-properties regression fails because panel top is -504px instead of at least 56px during canvas review. Log: `reports/professional-viewer/before.log`.
- The first full browser pass found helper text below the existing 12px readability floor (53 pass / 1 fail). Restored 12px helpers. Visual review at 1025px also found a wrapped sticky toolbar obscuring an artboard heading after scroll-into-view. Added a regression first: card top 156.2px versus required 218.2px; then increased the responsive artboard scroll margin. Kept page-level scroll padding unset to preserve toolbar click stability.
- Final 6 focused / 55 browser tests pass, including all 20 `/verify.html` checks. Node 744, build, native 30-layout verification and benchmark 70 PNG/SVG/editable documents pass. Production screenshots reviewed at 320/390/820/1025/1280/1440/1920px in light/dark modes, including 320px comparison inspector and short-desktop keyboard access. No engine files changed. The build retains its existing >500kB JavaScript chunk advisory.
- Consolidated repeated CSS overrides; restrained charcoal application chrome, neutral canvas/panels, grouped artboard metadata and actions, format silhouettes, consistent button geometry, and persistent desktop settings. Existing verification workflow and capture script cover this work; no new reusable skill or vault update is needed. Clean-source production receipt and final screenshots are recorded in the dated evidence handoff.
