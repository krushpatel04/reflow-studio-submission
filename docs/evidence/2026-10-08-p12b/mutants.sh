#!/usr/bin/env bash
# P12b mutants on scripts/lica_official/render.py; restore after each. Engine-side mutants live in docs/evidence/2026-10-08-p12/mutants.sh.
F=scripts/lica_official/render.py; cp $F /tmp/render.p12bgood
run() { cp /tmp/render.p12bgood $F
  python3 - "$2" "$3" <<'PYE'
import sys
p="scripts/lica_official/render.py"; s=open(p).read(); o,n=sys.argv[1],sys.argv[2]
assert s.count(o)==1,("pattern count",s.count(o),o); open(p,"w").write(s.replace(o,n))
PYE
  [ $? -ne 0 ] && { echo "$1: PATCH-FAILED"; return; }
  if bash docs/evidence/2026-10-07-p11/devenv.sh -m unittest tests_python.test_render_font_binding >/tmp/p12bmut.log 2>&1; then echo "$1: SURVIVED"; else echo "$1: KILLED ($(grep -cE '^(FAIL|ERROR):' /tmp/p12bmut.log) tests)"; fi; }
run bold-gt-600 "face['weight'] >= 600" "face['weight'] > 600"
run bold-ge-700 "face['weight'] >= 600" "face['weight'] >= 700"
run skip-with "with (bind(renderer.records) if bind else contextlib.nullcontext()):" "with contextlib.nullcontext():"
run family-substituted "self.records.append({'family': face['family']," "self.records.append({'family': 'SolsticeSans',"
run drop-ttf-sha256 "'path': str(blobs / face['ttf_sha256']), 'ttf_sha256': face['ttf_sha256']})" "'path': str(blobs / face['ttf_sha256'])})"
run drop-path "'path': str(blobs / face['ttf_sha256']), 'ttf_sha256'" "'ttf_sha256'"
run weight-swapped "'weight': weight, 'style': face['style']" "'weight': 'regular' if weight == 'bold' else 'bold', 'style': face['style']"
run style-forced-normal "'style': face['style'],
                                 'path'" "'style': 'normal',
                                 'path'"
run audit-always-bound "'bound' if bind else 'unavailable'" "'bound'"
run gate-dropped "bind = getattr(text_fit, 'faces', None)" "bind = text_fit.faces"
cp /tmp/render.p12bgood $F; echo restored
