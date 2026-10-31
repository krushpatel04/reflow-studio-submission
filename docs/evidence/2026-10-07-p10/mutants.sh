#!/usr/bin/env bash
# P10 mutants: patch one expression in engine/text_fit.py, run test_text_fit, restore. Output: KILLED/SURVIVED per mutant.
R=/home/nala/.local/share/reflow-runtime; PY=$R/chameleon-venv311/bin/python; F=engine/text_fit.py; cp $F /tmp/tf.p10good
run() { # name, python-replace old, new
  cp /tmp/tf.p10good $F
  $PY - "$2" "$3" <<'PYE'
import sys
p="engine/text_fit.py"; s=open(p).read(); o,n=sys.argv[1],sys.argv[2]
assert s.count(o)==1,("pattern count",s.count(o),o); open(p,"w").write(s.replace(o,n))
PYE
  [ $? -ne 0 ] && { echo "$1: PATCH-FAILED"; return; }
  if CHAMELEON_UPSTREAM=$R/chameleon-a44a060 $PY -m unittest tests_python.test_text_fit >/tmp/p10mut.log 2>&1; then echo "$1: SURVIVED"; else echo "$1: KILLED ($(grep -cE '^(FAIL|ERROR):' /tmp/p10mut.log) tests)"; fi
}
run height-fit-dropped ' or n * FLOOR_PX * float(e.get("line_height", DEFAULT_LINE_HEIGHT)) > e["height"]' ''
run width-fit-dropped 'if math.ceil(widest * 1.02) + 1.0 > e["width"]' 'if False'
run margin-1-removed 'math.ceil(widest * 1.02) + 1.0 > e["width"]' 'math.ceil(widest * 1.02) > e["width"]'
run margin-1.02-removed 'math.ceil(widest * 1.02) + 1.0 > e["width"]' 'math.ceil(widest) + 1.0 > e["width"]'
run letter-spacing-skip-removed ' or any(e.get("letter_spacing") for e in low)' ''
run partial-not-all-or-nothing '            return False
    for e in low:' '            continue
    for e in low:'
run raise-when-not-sub-floor '        if _sub_floor(els, idx):
            _raise(els, idx)' '        _raise(els, idx)'
run font-not-floor 'e["font_size"] = FLOOR_PX
    return True' 'e["font_size"] = FLOOR_PX + 1
    return True'
run geometry-touched 'e["font_size"] = FLOOR_PX
    return True' 'e["font_size"] = FLOOR_PX; e["y"] += 0.5
    return True'
run rotation-touched 'e["font_size"] = FLOOR_PX
    return True' 'e["font_size"] = FLOOR_PX; e["rotation"] = 1
    return True'
run fit-on-unscaled-source-box 'e["content"], e["width"])
        if math' 'e["content"], e["width"] * 20)
        if math'
run raise-also-above-floor 'els[i]["font_size"] < FLOOR_PX - 1e-9]' 'els[i]["font_size"] < FLOOR_PX + 5]'
run eps-removed 'els[i]["font_size"] < FLOOR_PX - 1e-9]' 'els[i]["font_size"] < FLOOR_PX]'
run raise-disabled '    _raise_all(out)
' ''
run raise-before-rigid-ladder '    base = copy.deepcopy(out["elements"])
    moved = _place_groups' '    _raise_all(out)
    base = copy.deepcopy(out["elements"])
    moved = _place_groups'
cp /tmp/tf.p10good $F; git diff --quiet $F -- 2>/dev/null; echo restored
