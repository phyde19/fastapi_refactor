#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/load-ports.sh"

BACKEND_HOST="0.0.0.0"

echo "Starting Compass Hub (PORT_OFFSET=${PORT_OFFSET}) on :${BACKEND_PORT}"

podman build --target dev -t compass-refactor-hub:dev "$PROJECT_ROOT/backend"

podman run \
  --rm \
  --name compass-refactor-hub-dev \
  --network host \
  -v "$PROJECT_ROOT:/workspace:Z" \
  -w /workspace \
  -e REDIS_PORT="$REDIS_PORT" \
  -e FRONTEND_URL="$FRONTEND_URL" \
  compass-refactor-hub:dev \
  fastapi dev backend/src/main.py --host "$BACKEND_HOST" --port "$BACKEND_PORT"
