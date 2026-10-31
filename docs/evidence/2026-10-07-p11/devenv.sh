#!/usr/bin/env bash
# dev-env wrapper (see c9178a6-python-ENV-RECIPE.txt). Usage: devenv.sh <python args...>
R=/home/nala/.local/share/reflow-runtime
PATH=$R/node-v24.20.0-linux-x64/bin:$PATH PLAYWRIGHT_BROWSERS_PATH=$R/playwright-browsers PYTHONPATH=$R/lica-devdeps CHAMELEON_UPSTREAM=$R/chameleon-a44a060 \
LD_LIBRARY_PATH=$R/chameleon-syslibs/root/usr/lib/x86_64-linux-gnu:$R/chameleon-syslibs/root/lib/x86_64-linux-gnu:$R/browser-libs/root/usr/lib/x86_64-linux-gnu \
$R/chameleon-venv311/bin/python "$@"
