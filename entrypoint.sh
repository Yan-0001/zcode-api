#!/bin/sh
# Entrypoint that bridges Render's PORT env var to ZCODE_PROXY_PORT
set -e

# Priority: ZCODE_PROXY_PORT > PORT (Render default) > 8080 (app default)
export ZCODE_PROXY_PORT="${ZCODE_PROXY_PORT:-${PORT:-8080}}"

exec bun run src/index.ts "$@"
