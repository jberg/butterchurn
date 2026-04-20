#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE="butterchurn-visual-test"
PLATFORM="linux/amd64"

docker build --platform="$PLATFORM" -f Dockerfile.test -t "$IMAGE" .

docker run --rm -i \
  --platform="$PLATFORM" \
  -v "$PWD":/app \
  -v butterchurn-pnpm-store:/root/.local/share/pnpm \
  -v butterchurn-puppeteer-cache:/root/.cache/puppeteer \
  -v butterchurn-node-modules:/app/node_modules \
  "$IMAGE" \
  bash -c 'pnpm install --frozen-lockfile && pnpm dev-build && pnpm test:visual "$@"' _ "$@"
