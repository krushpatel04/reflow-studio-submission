#!/bin/sh
# One build + run + controls of the committed tree. Usage (host, from repo root, tree clean):
#   flock /tmp/quoroum-full-validation.lock unshare --user --map-root-user --mount sh docs/evidence/2026-10-06-offline-channel/validate.sh
set -u
mkdir -p /home/nala/.local/share/reflow-offline-runtime
REPO=$(cd "$(dirname "$0")/../../.." && pwd); D=$REPO/docs/evidence/2026-10-06-offline-channel
UP=${UPSTREAM:-/home/nala/.local/share/reflow-runtime/chameleon-a44a060}
W=/tmp/offline-ch; rm -rf $W; mkdir -p $W
# /etc/resolv.conf is a symlink into /run (systemd-resolved); recreate its target after /run is masked, or pulls cannot resolve DNS
cat /etc/resolv.conf > $W/resolv.conf
mount -t tmpfs tmpfs /var/cache || exit 97; mount -t tmpfs tmpfs /run || exit 96
mkdir -p /run/systemd/resolve; : > /run/systemd/resolve/stub-resolv.conf; mount --bind $W/resolv.conf /run/systemd/resolve/stub-resolv.conf || exit 95
P="sh $D/podman-wrap.sh"
[ -z "$(git -C $REPO status --porcelain)" ] || { echo "tree dirty" >&2; exit 3; }
echo "repo HEAD $(git -C $REPO rev-parse HEAD)  host $(uname -srm)"
sh $REPO/submission/assemble_context.sh $W/ctx $UP || exit 4
mkdir -p $W/in; cp $UP/input/*.json $W/in/
python3 $REPO/submission/fingerprint.py write --inputs $W/in $W/fingerprint.json || exit 5
echo "== BUILD"; $P build --volume $D/apt-nosandbox.conf:/etc/apt/apt.conf.d/99nosandbox:ro -f $W/ctx/Dockerfile.python-submission -t offline-ch $W/ctx > $W/build.log 2>&1; echo "build exit $?"
$P image inspect offline-ch --format '{{.Id}} {{.Digest}} {{.Architecture}} {{.Os}}' > $W/image.txt 2>&1; echo "base: $(grep -m1 '^FROM' $W/ctx/Dockerfile.python-submission)" >> $W/image.txt; grep -a -m3 -i 'Getting image source\|Pulling\|digest' $W/build.log >> $W/image.txt; cat $W/image.txt
echo "== SMOKE"; python3 $REPO/scripts/offline_submission_smoke.py --image offline-ch --input $W/in --work $W/smoke --runtime $D/podman-wrap.sh; echo "smoke exit $?"
python3 $REPO/submission/fingerprint.py verify $W/fingerprint.json --inputs $W/in; echo "fingerprint verify exit $?"
{
echo "== control 1: renderer absent (empty renderer/ in context) -> smoke must exit nonzero"
rm -rf $W/ctx2; cp -r $W/ctx $W/ctx2; rm -rf $W/ctx2/renderer; mkdir $W/ctx2/renderer
$P build --volume $D/apt-nosandbox.conf:/etc/apt/apt.conf.d/99nosandbox:ro -f $W/ctx2/Dockerfile.python-submission -t offline-ch-norenderer $W/ctx2 > $W/build-control.log 2>&1; echo "control build exit $?"
python3 $REPO/scripts/offline_submission_smoke.py --image offline-ch-norenderer --input $W/in --work $W/c1 --runtime $D/podman-wrap.sh; echo "control1 smoke exit $?"
echo "== control 2: input altered after run -> smoke must exit nonzero"
rm -rf $W/in2; cp -r $W/in $W/in2
python3 $REPO/scripts/offline_submission_smoke.py --image offline-ch --input $W/in2 --work $W/c2 --runtime $D/podman-wrap.sh --control-mutate-input; echo "control2 smoke exit $?"
echo "== control 3: container cannot write to :ro input mount"
$P run --rm --network none -v $W/in:/app/input:ro --entrypoint python offline-ch -c "open('/app/input/x','w')"; echo "ro-write exit $?"
echo "== control 4: zero input cases -> smoke must exit nonzero"
mkdir -p $W/empty; python3 $REPO/scripts/offline_submission_smoke.py --image offline-ch --input $W/empty --work $W/c4 --runtime $D/podman-wrap.sh; echo "control4 smoke exit $?"
} > $W/controls.log 2>&1
cp $W/fingerprint.json $D/ 2>/dev/null; cp $W/build.log $W/build-control.log $W/controls.log $W/image.txt $D/
cp $W/smoke/run.log $D/run.log; cp $W/smoke/case-ledger.json $D/case-ledger.json
mkdir -p $D/control-ledgers; cp $W/c1/case-ledger.json $D/control-ledgers/renderer-absent.json; cp $W/c2/case-ledger.json $D/control-ledgers/input-altered.json
echo done
