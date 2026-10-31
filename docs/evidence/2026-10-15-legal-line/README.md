# Legal-line clipping: macOS candidate evidence, October 15

Issue #147; [plan](../../plans/two-hour-A.md). Baseline `8ac29a0103bdb8c092c59ab88160a5a58952181a`. Host and pinned dependency identities: [environment.json](environment.json). Linux candidate evidence remains pending; this is not cross-platform acceptance or #148 human readability acceptance.

Baseline: three real renderer calls, zero fallback. RF-01 flags legal text lost84/overflow90 pixels. Candidate: three real calls, zero fallback, every public text unclipped. L1/L2 JSON and PNG unchanged. L3 changes only subhead width585→595 and legal width344→354; all text/IDs/fonts/groups/assets/paint order remain intact. The legal sentence fits one line and loses zero pixels. The existing Level2 headline box overflow remains visible in element reports; no new claim resolves that issue.

Cause: Pillow BASIC summed legal advances336px; Skia default float-size advances346.068px; old box344px. Fit now allocates width from both measures and recounts actual wrapped line slots at the returned width. The existing 2%+1px padding remains unchanged. Font floor, renderer, and source content are unchanged. Missing Skia/font prerequisites raise visibly.

Test-first: [red.log](red.log) has33 tests,32 passing/one expected legal clipping failure. Unchanged tests pass33/33 in [green-first.log](green-first.log). Baseline focused104 has7 failures: six helper equal-width assumptions and one actual leading-space caller line-underallocation. Candidate [focused-green.log](focused-green.log) passes104/104 after measurement correction and helper oracle repair. The helper now compares wrap algorithms with identical width inputs; real caller assertions remain unchanged. Synthetic search tests mock both metric providers. L3 macOS output hash is platform-bound; retained Linux expected hash must pass actual Linux CI before it is accepted.

Reproduction from lane source with Python3.11 and pinned upstream:

```sh
CHAMELEON_UPSTREAM=<a44a060 checkout> python -m unittest tests_python.test_legal_line_fit tests_python.test_text_ink -v
sh submission/assemble_context.sh /tmp/legal-context "$CHAMELEON_UPSTREAM"
cp -R "$CHAMELEON_UPSTREAM/input" /tmp/legal-context/input
# Use upstream main with real/fallback counters, then:
PYTHONPATH=. python docs/evidence/jh-02/elements.py /tmp/legal-context/output
```

`baseline/` and `candidate/` retain the original JSON and rendered PNG files. Element reports include input/output hashes, pinned-face use and clipping controls. Both environments use the same official inputs and fonts. All three candidate images were visually inspected at native size; Level3 remains very small typography. Visual review is AI inspection, not human acceptance.

Full canonical Python/workbench checks and Linux validation are pending at this early review handoff. No qualification, publication or deployment is claimed. Existing repository procedures suffice; no new skill was created.
