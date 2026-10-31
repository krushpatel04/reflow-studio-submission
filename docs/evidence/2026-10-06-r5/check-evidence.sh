#!/bin/sh
# Every file the README names (backticked tokens with a known extension) must be tracked in HEAD. Run from repo root.
D=docs/evidence/2026-10-06-r5; miss=0
for f in $(grep -o '`[A-Za-z0-9_./-]*\.\(log\|sh\|py\|txt\|md\)`' $D/README.md | tr -d '`' | sort -u); do
  p=$D/$f; case $f in *.log) p=$D/logs/$(basename $f) ;; esac
  [ "$f" = "Dockerfile.python-submission" ] && p=$f
  git cat-file -e "HEAD:$p" 2>/dev/null || { echo "MISSING $p"; miss=$((miss+1)); }
done
echo "missing $miss"; [ $miss -eq 0 ]
