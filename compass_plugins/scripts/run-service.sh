#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/load-ports.sh"

SERVICE_HOST="0.0.0.0"

echo "Starting Compass Plugins service (PORT_OFFSET=${PORT_OFFSET}) on :${EFFECTIVE_PLUGIN_SERVICE_PORT}"

podman build --target dev -t compass-refactor-plugins:dev "$PROJECT_ROOT/service"

podman run \
  --rm \
  --name compass-refactor-plugins-dev \
  --network host \
  -v "$PROJECT_ROOT:/workspace:Z" \
  -w /workspace \
  -e PLUGIN_SERVICE_PORT="$EFFECTIVE_PLUGIN_SERVICE_PORT" \
  compass-refactor-plugins:dev \
  fastapi dev service/app/main.py --host "$SERVICE_HOST" --port "$EFFECTIVE_PLUGIN_SERVICE_PORT"
