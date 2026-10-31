# R7: close R6 mutant gap (test-only)
Branch jo/reflow-milestone-python-r7-mutant-gap, base main 8d119dc. No engine edits.
Add one committed fixture in tests_python/test_text_fit.py where text and image relations differ between source and output (one pair non-overlapping in source but overlapping after uniform scale, and one overlapping in source but clear after). Mutants die.
Result: uniform scale preserves overlap, so source/output relations differ only via the full-bleed cover image (stretched to the target). Fixture test_r7_full_bleed_makes_output_relation_differ_from_source: t disjoint from bg in source, inside it in output. The reverse (overlap in source, clear in output) cannot occur; recorded, not tested.
Mutants now dying: swap both/img-only/text-only rect source<->output, obstacle off, exemption inverted, floor off. 81 tests (80 unchanged + 1). No engine edit.
