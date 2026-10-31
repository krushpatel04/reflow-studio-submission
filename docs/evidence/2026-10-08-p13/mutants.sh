#!/usr/bin/env bash
# P13 mutants (full test_text_fit, -B, pycache cleared) on engine/text_fit.py; restore after each.
F=engine/text_fit.py; cp $F /tmp/tf.p13good
run() { cp /tmp/tf.p13good $F
  python3 - "$2" "$3" <<'PYE'
import sys
p="engine/text_fit.py"; s=open(p).read(); o,n=sys.argv[1],sys.argv[2]
assert s.count(o)==1,("pattern count",s.count(o),o); open(p,"w").write(s.replace(o,n))
PYE
  [ $? -ne 0 ] && { echo "$1: PATCH-FAILED"; return; }
  if find . -name __pycache__ -prune -exec rm -rf {} + 2>/dev/null; bash docs/evidence/2026-10-07-p11/devenv.sh -B -m unittest tests_python.test_text_fit >/tmp/p13mut.log 2>&1; then echo "$1: SURVIVED"; else echo "$1: KILLED ($(grep -cE '^(FAIL|ERROR):' /tmp/p13mut.log) tests)"; fi; }
run cap-off-by-one-tw2-over-1.02 'lambda w: (w - 3.0) / 1.02' 'lambda w: (w - 2.0) / 1.02'
run cap-no-padding-division 'lambda w: (w - 3.0) / 1.02' 'lambda w: (w - 3.0)'
run cap-minus-2-instead-of-3 'lambda w: (w - 3.0) / 1.02' 'lambda w: (w - 2.0)'
run cap-minus-4 'lambda w: (w - 3.0) / 1.02' 'lambda w: (w - 4.0) / 1.02'
run padded-cap-only-no-first-attempt 'for c in (lambda w: w - 2.0, lambda w: (w - 3.0) / 1.02)' 'for c in (lambda w: (w - 3.0) / 1.02,)'
run padded-cap-first 'for c in (lambda w: w - 2.0, lambda w: (w - 3.0) / 1.02)' 'for c in (lambda w: (w - 3.0) / 1.02, lambda w: w - 2.0)'
run retry-disabled 'for c in (lambda w: w - 2.0, lambda w: (w - 3.0) / 1.02)' 'for c in (lambda w: w - 2.0,)'
run box-margin-plus1-removed 'w, h = math.ceil(widest * 1.02) + 1.0, n * f' 'w, h = math.ceil(widest * 1.02), n * f'
run box-margin-plus2 'w, h = math.ceil(widest * 1.02) + 1.0, n * f' 'w, h = math.ceil(widest * 1.02) + 2.0, n * f'
run box-1.02-removed 'w, h = math.ceil(widest * 1.02) + 1.0, n * f' 'w, h = math.ceil(widest) + 1.0, n * f'
run images-ignored-retry-dropped '[(c, k) for c in (lambda w: w - 2.0, lambda w: (w - 3.0) / 1.02) for k in (skip, [set(range(len(fixed) - len(imgs), len(fixed))) for _ in order])]' '[(c, k) for c in (lambda w: w - 2.0, lambda w: (w - 3.0) / 1.02) for k in (skip,)]'
run cap-loop-inner-outer-swapped '[(c, k) for c in (lambda w: w - 2.0, lambda w: (w - 3.0) / 1.02) for k in (skip, [set(range(len(fixed) - len(imgs), len(fixed))) for _ in order])]' '[(c, k) for k in (skip, [set(range(len(fixed) - len(imgs), len(fixed))) for _ in order]) for c in (lambda w: w - 2.0, lambda w: (w - 3.0) / 1.02)]'
cp /tmp/tf.p13good $F; echo restored
