#!/bin/sh
R=/tmp/r5-podman2
UP=/home/nala/.local/share/reflow-runtime/chameleon-a44a060
OUT=/tmp/r5b-out
mount -t tmpfs tmpfs /var/cache || exit 97
mount -t tmpfs tmpfs /run || exit 96
export HOME=$R/home XDG_RUNTIME_DIR=$R/xdg CONTAINERS_CONF=$R/containers.conf CONTAINERS_STORAGE_CONF=$R/storage.conf
mkdir -p $OUT
exec /home/nala/.local/bin/podman --tmpdir $R/tmp run --rm --network none -v $UP/input:/app/input:ro -v $OUT:/app/output reflow-python-submission-r5b
