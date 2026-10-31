#!/bin/sh
# R5: rootless podman build with single-ID userns (no newuidmap). Run via: unshare --user --map-root-user --mount sh /tmp/r5-build.sh
R=/tmp/r5-podman2
C=/tmp/r5-ctx
mount -t tmpfs tmpfs /var/cache || exit 97
export HOME=$R/home XDG_RUNTIME_DIR=$R/xdg CONTAINERS_CONF=$R/containers.conf CONTAINERS_STORAGE_CONF=$R/storage.conf
exec /home/nala/.local/bin/podman --tmpdir $R/tmp build -f $C/Dockerfile.r5-diag -t reflow-python-submission $C
