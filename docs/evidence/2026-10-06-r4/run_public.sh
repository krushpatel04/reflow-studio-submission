#!/usr/bin/env bash
# R4: run each variant's OWN tests_python/run_official_samples.sh on L1-L3. Failures kept verbatim (no set -e on the run).
# usage: run_public.sh <outdir>   (from repo root)
OUT="$(cd "${1:?outdir}" && pwd)"
for v in P4=4c86006 P5=79b18b3 P5b=d48a548; do
  n=${v%%=*}; c=${v##*=}; T=$(mktemp -d); mkdir -p "$OUT/$n"
  git archive "$c" | tar -x -C "$T"
  ( cd "$T" && bash tests_python/run_official_samples.sh "$OUT/$n" ) > "$OUT/$n.stdout" 2> "$OUT/$n.stderr"
  echo "$n $c exit=$?" | tee -a "$OUT/summary.txt"
  (cd "$OUT/$n" && sha256sum * ) >> "$OUT/$n.sha256" 2>/dev/null
done
