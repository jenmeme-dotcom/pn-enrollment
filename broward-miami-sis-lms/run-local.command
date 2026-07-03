#!/bin/zsh
set -e

cd "$(dirname "$0")"

export PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin:$PATH"

if [ ! -d "node_modules" ]; then
  pnpm install
fi

pnpm run dev
