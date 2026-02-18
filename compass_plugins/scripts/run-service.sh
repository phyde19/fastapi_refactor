#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/load-ports.sh"

SERVICE_HOST="0.0.0.0"

echo "Starting Compass Plugins service with:"
echo "  PLUGIN_SERVICE_PORT=$EFFECTIVE_PLUGIN_SERVICE_PORT"
echo "  ALLOW_MOCK_LLM=${ALLOW_MOCK_LLM:-true}"

podman build --target dev -t compass-refactor-plugins:dev "$PROJECT_ROOT/service"

podman run \
  --rm \
  --name compass-refactor-plugins-dev \
  --network host \
  -v "$PROJECT_ROOT:/workspace:Z" \
  -w /workspace \
  -e PLUGIN_SERVICE_NAME="${PLUGIN_SERVICE_NAME:-compass-plugins}" \
  -e PLUGIN_SERVICE_PORT="$EFFECTIVE_PLUGIN_SERVICE_PORT" \
  -e AZURE_OPENAI_API_KEY="${AZURE_OPENAI_API_KEY:-}" \
  -e AZURE_OPENAI_API_VERSION="${AZURE_OPENAI_API_VERSION:-2024-06-01}" \
  -e AZURE_OPENAI_ENDPOINT="${AZURE_OPENAI_ENDPOINT:-}" \
  -e AZURE_OPENAI_MODEL="${AZURE_OPENAI_MODEL:-gpt-4o-mini}" \
  -e DATABRICKS_HOST="${DATABRICKS_HOST:-}" \
  -e DATABRICKS_TOKEN="${DATABRICKS_TOKEN:-}" \
  -e DATABRICKS_VECTOR_SEARCH_ENDPOINT="${DATABRICKS_VECTOR_SEARCH_ENDPOINT:-}" \
  -e DATABRICKS_VECTOR_SEARCH_INDEX="${DATABRICKS_VECTOR_SEARCH_INDEX:-}" \
  -e VECTOR_SEARCH_TOP_K="${VECTOR_SEARCH_TOP_K:-3}" \
  -e ALLOW_MOCK_LLM="${ALLOW_MOCK_LLM:-true}" \
  compass-refactor-plugins:dev \
  fastapi dev service/app/main.py --host "$SERVICE_HOST" --port "$EFFECTIVE_PLUGIN_SERVICE_PORT"
