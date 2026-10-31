#!/bin/sh
# podman with the single-ID rootless recipe (see limitations.md). Private state on DISK (tmpfs /tmp has a user quota
# that the vfs graph exceeds). Run inside: unshare --user --map-root-user --mount sh ...   (tmpfs on /var/cache and /run).
HERE=$(cd "$(dirname "$0")" && pwd)
R=${PODMAN_STATE:-/home/nala/.local/share/reflow-offline-runtime/podman-state}
mkdir -p $R/root $R/run $R/xdg $R/tmp $R/home/.config/containers
cat > $R/storage.conf <<EOF
[storage]
driver="vfs"
runroot="$R/run"
graphroot="$R/root"
[storage.options]
ignore_chown_errors="true"
EOF
cat > $R/containers.conf <<EOF
[engine]
helper_binaries_dir=["/home/nala/.local/lib/podman"]
conmon_path=["/home/nala/.local/lib/podman/conmon"]
runtime="$HERE/crun-wrap/crun"
cgroup_manager="cgroupfs"
events_logger="file"
[containers]
cgroups="disabled"
netns="host"
userns="host"
EOF
cp /home/nala/.config/containers/policy.json /home/nala/.config/containers/registries.conf $R/home/.config/containers/
export HOME=$R/home XDG_RUNTIME_DIR=$R/xdg CONTAINERS_CONF=$R/containers.conf CONTAINERS_STORAGE_CONF=$R/storage.conf
exec /home/nala/.local/bin/podman --tmpdir $R/tmp "$@"
