#!/usr/bin/env bash
# P12 mutants on engine/text_fit.py (faces); restores after each. Usage: bash mutants.sh
F=engine/text_fit.py; cp $F /tmp/tf.p12good
run() { cp /tmp/tf.p12good $F
  python3 - "$2" "$3" "${4:-1}" <<'PYE'
import sys
p="engine/text_fit.py"; s=open(p).read(); o,n,c=sys.argv[1],sys.argv[2].replace("\\n","\n"),int(sys.argv[3])
o=o.replace("\\n","\n")
assert s.count(o)==c,("pattern count",s.count(o),o); open(p,"w").write(s.replace(o,n))
PYE
  [ $? -ne 0 ] && { echo "$1: PATCH-FAILED"; return; }
  if bash docs/evidence/2026-10-07-p11/devenv.sh -m unittest tests_python.test_real_fonts >/tmp/p12mut.log 2>&1; then echo "$1: SURVIVED"; else echo "$1: KILLED ($(grep -cE '^(FAIL|ERROR):' /tmp/p12mut.log) tests)"; fi; }
run skip-sha-verify 'if hashlib.sha256(f.read()).hexdigest() != r["ttf_sha256"]:' 'if False:'
run weight-600-to-800 'w >= 600' 'w >= 800'
run distinct-bytes-silently-first 'if len(hits) == 1 else None' 'if len(hits) >= 1 else None'
run identical-sha-dup-ambiguous '[r["ttf_sha256"]] = r["path"]' '[id(r)] = r["path"]'
run no-reset-on-exit '_FACES.reset(token)' 'pass'
run reset-only-on-success '    try:\n        yield\n    finally:\n        _FACES.reset(token)\n        _font.cache_clear()' '    yield\n    _FACES.reset(token)\n    _font.cache_clear()'
run cache-not-cleared '    _font.cache_clear()\n    token' '    token'
run cache-not-cleared-on-exit '        _FACES.reset(token)\n        _font.cache_clear()' '        _FACES.reset(token)'
run last-word-weight-skipped-resolve '    ew = _last(fam) if _last(fam) in _WEIGHTS else weight' '    ew = weight'
run italic-rule-inverted 'if r["style"] == "italic" else weight  # as ExactManager' 'if r["style"] != "italic" else weight'
run bold-ignored-in-resolve '    bold, ital = e.get("font_weight") == "bold", e.get("font_style") == "italic"\n    weight' '    bold, ital = False, e.get("font_style") == "italic"\n    weight'
run family-normalize-skipped 'name = name.replace("_", " ").title()' 'name = name'
run absent-not-warned '        warnings.warn("text_fit: no exact font face' '        0 and warnings.warn("text_fit: no exact font face'
run unmeasured-ignored-in-texts '        if _unmeasured([els[i] for i in free]):\n            return True' '        _unmeasured([els[i] for i in free])'
run cache-never-cleared '    _font.cache_clear()\n    token' '    token'
python3 - <<'PYE'
p="engine/text_fit.py"; s=open(p).read(); a="        _FACES.reset(token)\n        _font.cache_clear()"; assert s.count(a)==1
open(p,"w").write(s.replace(a,"        _FACES.reset(token)"))
PYE
if bash docs/evidence/2026-10-07-p11/devenv.sh -m unittest tests_python.test_real_fonts >/tmp/p12mut.log 2>&1; then echo "cache-never-cleared-both: SURVIVED"; else echo "cache-never-cleared-both: KILLED ($(grep -cE '^(FAIL|ERROR):' /tmp/p12mut.log) tests)"; fi
cp /tmp/tf.p12good $F; echo restored
