#!/bin/sh
# R5 diag: strip devpts gid=5 (unmapped in single-ID userns) from the OCI spec, then exec crun.
for a in "$@"; do b="$prev"; prev="$a"; [ "$b" = "--bundle" ] || [ "$b" = "-b" ] && BUNDLE="$a"; done
[ -n "$BUNDLE" ] && [ -f "$BUNDLE/config.json" ] && sed -i 's/"gid=5",\?//g' "$BUNDLE/config.json"
exec /home/nala/.local/lib/podman/crun "$@"
