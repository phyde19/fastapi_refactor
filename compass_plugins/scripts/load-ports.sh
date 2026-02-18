#!/usr/bin/env bash
set -euo pipefail

__DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../" && pwd)"
ENV_FILE="$__DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

: "${PORT_OFFSET:=0}"
: "${PLUGIN_SERVICE_PORT:=5002}"

export EFFECTIVE_PLUGIN_SERVICE_PORT=$((PLUGIN_SERVICE_PORT + PORT_OFFSET))
