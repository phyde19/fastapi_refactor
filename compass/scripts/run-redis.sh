#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/load-ports.sh"

podman run \
  --rm \
  --name compass-refactor-redis-dev \
  --network host \
  redis:7 \
  redis-server \
    --bind 127.0.0.1 \
    --protected-mode yes \
    --port "${REDIS_PORT}"
