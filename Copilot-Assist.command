#!/bin/bash
# Double-click on macOS, or invoke from a terminal. No Codex process is involved.
cd -- "$(dirname -- "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null || ! command -v copilot >/dev/null || ! command -v gh >/dev/null; then
  echo 'Install Node, GitHub CLI and Copilot CLI first; see docs/copilot-workflow.md.'
  read -r -p 'Press Enter to close. ' _
  exit 1
fi
if [ ! -d node_modules/tsx ]; then
  echo 'Installing this checkout’s locked development dependencies...'
  npm ci || exit 1
fi
npm run --silent assist -- --context || exit 1
npm run --silent assist -- --auto
result=$?
read -r -p 'Run ended. Press Enter to close. ' _
exit "$result"
