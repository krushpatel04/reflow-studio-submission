# Whitespace wrap parity: bounded caller RED

Base: immutable 6ebfd9b002b4ad1f4b5099fabc6789238c498f4b, copied into own jo/reflow-whitespace-parity checkout. Frozen Engine3 checkout is read-only. Existing _block helper review confirmed leading/double/trailing-space mismatch with pinned a44a060 wrap_text; existing tests duplicate Pillow greedy wrapping, not upstream character-index wrapping.

Problem: _block drops leading/duplicate empty words; undercounts line slots used by _texts height allocation. Supported plain Latin/U+0020, not complex shaping. Static 400x400→72x60 caller prediction must now be observed, using actual returned width/font rather than assuming69/24. Existing helper RED is retained, not repeated.

Authorized preparation: this plan and tests_python/test_text_fit_whitespace.py only. Future production scope engine/text_fit.py::_block only, pending this actual caller RED handoff; no edit yet. No geometry/resources/human paths, stripping/normalization, runtime upstream dependency, full jobs or publishing.

One focused run: four resize calls (leading-space regression at72x60, ordinary-space72x60, same leading-space identity400x400 wide baseline, explicit newline72x60). Verify pinned Sans Regular bytes; keep font data alive; use upstream wrap_text with exact Skia advances at returned font and width. Assert output height accommodates upstream line slots, record actual dimensions/oracle; preserve exact content/style_runs indices and source deep-copy for every case. Identity wide case deliberately avoids assuming that a wider repacked box fixes omitted leading advances.

Expected RED: actual leading-space output may allocate two slots while upstream needs three. Test checks observed slot capacity, not pixels. Controls must pass; errors/skips are blockers. Save raw log and source/input/test/hash receipt. Stop before production code; send plan/RED/controls to Coordinator and Reviewer.

Future smallest repair, if authorized: implement upstream-compatible wrapping count using existing Pillow per-character advances and original character indices; no copy rewrite/import of renderer runtime. Tests cover ordinary, whitespace boundary, newline and copy/style-run retention. Risks: last-space handling, spaces replaced with newlines must not contribute advance, font buffer lifetime, actual returned box differs from search cap. Production caller may choose smaller font once corrected; do not freeze broken dimensions as a permanent acceptance requirement.

## Authorized proportional delta

Actual caller RED and helper-only failed GREEN retained. Direct human authorization via Coordinator extends production scope to `_texts` caller-cap consistency only, alongside `_block`. Existing geometry validation on6eb completed; root integration is separate.

Keep allocated width derived from the search cap, then remeasure line count at that exact width with the same font before calculating height/AABB/packing. Existing finite font search handles excess height; no fixed-point/retry expansion or `_raise`/`_wide` edits. Unchanged four caller controls and seven helper boundaries form focused GREEN. Preserve both failed raw logs; write new final GREEN log, portable literal excerpts and exact candidate/test hashes. No copy normalization, upstream runtime dependency, unrelated paths or full jobs.

## Authorized test-only integration delta

9f94 fullguard:373 tests,2 failures,0 skips; raw5824ff46. Reviewer-confirmed stale P10 whole-output/P11 width120-font6 assertions. Change only tests_python/test_text_fit.py and this existing plan/evidence: isolate settled `_raise_all` equality except eligible fonts, historical grouped/nontext and source protected-field preservation; P11 trace first search cap118 separately from returned-width recount, independently verify pinned actual-width advances/slots/floor. Preserve fake-font retry and whitespace callers. No new golden/production change.

One guarded focused sequence: affected P10/P11 tests, existing tightened-cap control, whitespace module; temporary in-memory mutations demonstrate detection of grouped unrelated change, wrong first cap, insufficient height. No persistent production mutations. Exact commands/raw/source binding retained. Diagnosis executed6eb twice and9f94 twice after initial save failure. Coordinator132/134 preceded diagnosis and required saved baseline, no historical-source execution, ONE candidate call: these four calls were a scope deviation. No retroactive authority or cleaner-provenance rerun.

## Authorized supplemental first-success control

Reviewer accepted existing P10 equivalence and9GREEN/3mutation proof. Remaining gap: ignored successful first packing could continue retries. Add one short fake-font `_texts` test in existing test_text_fit.py: first search tw-2, returned-width recount, one successful `_pack`, no later search. One additional guarded execution ONLY this method plus transient ignore-first-success mutation; existing nine tests are not replayed. Record exact command, raw assertion traceback, exit and before/after production/test hashes. Minimal evidence append; no production/golden/commit/export. Full validation belongs solely to Steward after exact review/new immutable.

Existing Python3.11/pinned starter/syslibs only; no installs or rendering. Full integrated qualification remains separate, not claimed. No additional skill needed: repository TDD and existing unittest suffice.
