# P11 wrap cap padding

Impl is a two-pass cap in `engine/text_fit.py::_texts`, NOT the plan's one-expression cap: try `tw-2` first (unchanged), and only if nothing packs retry with `(tw-3)/1.02` so `ceil(w*1.02)+1 <= tw-2`. Why: cases that packed before stay byte-identical (L1/L2/L3 + all P8 run3 hashes: `hashes_main.txt` == `hashes_final.txt`). The plan text's one-expression form is superseded.

Validation on abab6e2 (engine/tests identical to this commit): build 0, npm test 685/685, python 191 OK, tsc 0; logs in results/midnight-run/abab6e2-*.
Mutants (`mutants.log`): 10 killed, 2 SURVIVED: `cap-minus-4` ((tw-4)/1.02) and `cap-loop-inner-outer-swapped`. No test pins the exact tightened cap beyond "box <= tw-2", nor the cap/skip loop order; not claimed covered.
