#!/bin/sh
# R5b: build the UNMODIFIED Dockerfile.python-submission. The apt sandbox override is supplied by the build
# invocation (--volume onto /etc/apt/apt.conf.d during RUN steps only), never by editing the Dockerfile.
# Run: unshare --user --map-root-user --mount sh r5b-build.sh
R=/tmp/r5-podman2
C=/tmp/r5b-ctx
mount -t tmpfs tmpfs /var/cache || exit 97
export HOME=$R/home XDG_RUNTIME_DIR=$R/xdg CONTAINERS_CONF=$R/containers.conf CONTAINERS_STORAGE_CONF=$R/storage.conf
exec /home/nala/.local/bin/podman --tmpdir $R/tmp build \
  --volume /tmp/r5b-apt-nosandbox.conf:/etc/apt/apt.conf.d/99r5-nosandbox:ro \
  -f $C/Dockerfile.python-submission -t reflow-python-submission-r5b $C
