#!/bin/sh
# Entrypoint — bridges PORT env var (HF Spaces=7860, Render=10000) to ZCODE_PROXY_PORT
set -e

# Priority: ZCODE_PROXY_PORT > PORT (platform default) > 8080 (app default)
export ZCODE_PROXY_PORT="${ZCODE_PROXY_PORT:-${PORT:-8080}}"

exec bun run src/index.ts "$@"
