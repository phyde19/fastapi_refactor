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
: "${COMPASS_ENV:=DEV}"
: "${PLUGIN_REGISTRY_SOURCE:=databricks}"
: "${PLUGIN_SERVICES_LOCAL_FILE:=./services.local.json}"
: "${PLUGIN_REGISTRY_LOCAL_FILE:=./plugins.local.json}"

export BACKEND_PORT=$((8000 + PORT_OFFSET))
export REDIS_PORT=$((6000 + PORT_OFFSET))
export FRONTEND_PORT=$((3000 + PORT_OFFSET))

case "$COMPASS_ENV" in
  DEV|STAGING|PROD) ;;
  *)
    echo "Invalid COMPASS_ENV='$COMPASS_ENV'. Expected DEV|STAGING|PROD." >&2
    exit 1
    ;;
esac
