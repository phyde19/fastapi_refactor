#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MODE="${1:-local}" # local | overlay | databricks
FORCE="${FORCE:-0}" # FORCE=1 overwrites generated files

ENV_EXAMPLE="$PROJECT_ROOT/.env.example"
ENV_FILE="$PROJECT_ROOT/.env"
SERVICES_EXAMPLE="$PROJECT_ROOT/services.local.example.json"
SERVICES_FILE="$PROJECT_ROOT/services.local.json"
PLUGINS_EXAMPLE="$PROJECT_ROOT/plugins.local.example.json"
PLUGINS_FILE="$PROJECT_ROOT/plugins.local.json"

copy_if_missing() {
  local src="$1"
  local dest="$2"
  local label="$3"

  if [[ ! -f "$src" ]]; then
    echo "Missing template: $src" >&2
    exit 1
  fi

  if [[ -f "$dest" && "$FORCE" != "1" ]]; then
    echo "Keeping existing $label: $dest"
    return
  fi

  cp "$src" "$dest"
  echo "Created $label: $dest"
}

case "$MODE" in
  local|overlay|databricks) ;;
  *)
    echo "Invalid mode '$MODE'. Expected: local | overlay | databricks" >&2
    exit 1
    ;;
esac

copy_if_missing "$ENV_EXAMPLE" "$ENV_FILE" ".env"
copy_if_missing "$SERVICES_EXAMPLE" "$SERVICES_FILE" "services.local.json"
copy_if_missing "$PLUGINS_EXAMPLE" "$PLUGINS_FILE" "plugins.local.json"

# Apply quick-start defaults every run (safe, deterministic).
python - "$ENV_FILE" "$MODE" <<'PY'
from pathlib import Path
import re
import sys

env_path = Path(sys.argv[1])
mode = sys.argv[2]

text = env_path.read_text(encoding="utf-8")

updates = {
    "COMPASS_ENV": '"DEV"',
    "PLUGIN_REGISTRY_SOURCE": f'"{mode}"',
    "PLUGIN_SERVICES_LOCAL_FILE": '"./services.local.json"',
    "PLUGIN_REGISTRY_LOCAL_FILE": '"./plugins.local.json"',
    "FRONTEND_URL": '"http://localhost:3000"',
    "NEXT_PUBLIC_COMPASS_API_BASE_URL": '"http://localhost:8000"',
    "SERVICE_URL_COMPASS_PLUGINS": '"http://localhost:5002"',
}

for key, value in updates.items():
    pattern = re.compile(rf"^{re.escape(key)}=.*$", flags=re.MULTILINE)
    replacement = f"{key}={value}"
    if pattern.search(text):
        text = pattern.sub(replacement, text)
    else:
        if not text.endswith("\n"):
            text += "\n"
        text += replacement + "\n"

env_path.write_text(text, encoding="utf-8")
PY

cat <<'EOF'

Hub setup complete.

Next (from this compass directory):
  1) make redis
  2) make backend
  3) make frontend

If plugin service is not running yet, start it in the sibling repo:
  ../compass_plugins/scripts/run-service.sh

Notes:
  - Current mode was set in .env as PLUGIN_REGISTRY_SOURCE.
  - Default plugin URL override is SERVICE_URL_COMPASS_PLUGINS=http://localhost:5002
EOF
