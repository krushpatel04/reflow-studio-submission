# Issue #4: capability and released-contract audit

Observed September 26, 2026 (Eastern), continuing into September 27 UTC. Reflow intake: `c4af8e7`. [Plan](../../plans/2026-09-26-issue4-capability-audit.md). [Live issue](https://github.com/kj-squared-labs/reflow-studio/issues/4) was OPEN; none of its host acceptance boxes were completed in this audit.

## Result and changed priority

**The published challenge has changed.** The official hub now supplies **[Final] Chameleon_Challenge_v1.5.pdf**, added September 24, and **Hackathon_FAQ_v3.pdf**, added September 25. Brief v1.5 removes the stage-one viewer requirement and links a public starter with schema, renderer and resources. The first qualification checkpoint should therefore be **official source → adapter → unchanged Reflow engine → official JSON/renderer**, with visible conversion losses and real assets/fonts. Native Express editing remains a separate product/finale integration gate, not evidence needed to prove this offline path works.

The current sources contain conflicts; do not silently treat the older starter FAQ as authoritative over the revised brief, or claim every policy question is settled. See [competition contract and conflicts](competition-contract.md).

## Evidence index

- [Released schema support matrix](schema-support.md): all 28 element fields, wrapper/canvas and style-run fields; current local limits and next behavioral tests.
- [Document Sandbox support matrix](sdk-support.md): documented support and stable/experimental distinctions, with **no host-tested capability claims**.
- [Host access log and next probe](host-check.md): sign-in confirmed in dedicated browser session; no native mutation, edit/save/reopen, undo or retry executed.
- [Pinned source manifest](source-manifest.json): official-linked starter commit and SHA-256 of files reviewed; no dependency install, renderer execution or runtime certification.
- [Sign-in screenshot](sign-in.png), [Playground route sign-in](playground-sign-in.png), [challenge source](challenge-source.png), [FAQ source](faq-source.png).

## Handoff

Completed: live issue/context audit, current official documentation review, published starter inspection, field-level gap mapping, public PDF source review, actual host access check, and next-test plan. No adapter/probe/production implementation was attempted. The rules discovery made a speculative native probe lower priority than a reviewable contract handoff.

Blocked host step: authenticate to Adobe Express, then open a disposable editable document and enable Code Playground. The dedicated session reached sign-in; this says nothing about another browser profile's authentication. No credentials, account selection, Developer Terms acceptance, document creation or outreach occurred.

Next implementation should write failing adapter/official-renderer tests first, retaining the intentional missing-asset sample and rejecting unsupported fields without changing the source. Do not broaden production schema merely to make inputs pass. Coordinate interface ownership with #8/#33 and preserve #7's sealed-family boundaries.

Validation: see plan Results. No engine tests/build were rerun for this documentation-only change. Coordinator-reported baseline results are not this audit's validation. Existing browser/PDF skills and repository workflow cover the repeatable process; no new skill warranted. No vault writes.
