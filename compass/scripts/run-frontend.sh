#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/load-ports.sh"

FRONTEND_HOST="0.0.0.0"

echo "Starting Compass Frontend with:"
echo "  FRONTEND_PORT=$FRONTEND_PORT"
echo "  NEXT_PUBLIC_COMPASS_API_BASE_URL=${NEXT_PUBLIC_COMPASS_API_BASE_URL:-http://localhost:$BACKEND_PORT}"

podman build -t compass-refactor-frontend:dev "$PROJECT_ROOT/frontend"

podman run \
  --rm \
  --name compass-refactor-frontend-dev \
  --network host \
  -v "$PROJECT_ROOT/frontend:/app:Z" \
  -w /app \
  -e NEXT_PUBLIC_COMPASS_API_BASE_URL="${NEXT_PUBLIC_COMPASS_API_BASE_URL:-http://localhost:$BACKEND_PORT}" \
  compass-refactor-frontend:dev \
  npm run dev -- -H "$FRONTEND_HOST" -p "$FRONTEND_PORT"
