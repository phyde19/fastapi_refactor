# Compass Hub (Refactor)

Refactored Compass Hub API gateway. This service owns:

- auth/session context
- plugin registry reads and admin updates
- service key resolution
- chat proxying to external plugin services
- message persistence (in this scaffold: in-memory store)

It does not own AI plugin logic.

## Runtime model

- Explicit host routing (`podman --network host`)
- No compose dependency
- Plugin services may run anywhere reachable by URL

## Directory highlights

- `backend/src/main.py` — FastAPI app entrypoint
- `backend/src/routers/plugin_routes.py` — plugins, plugins-config, chats
- `backend/src/plugin_registry/registry.py` — local/databricks/overlay source layer
- `backend/src/config/service_resolver.py` — service_key to URL resolution
- `backend/src/db/memory.py` — in-memory conversation/message persistence for scaffold runs
- `scripts/run-backend.sh` — host-network runtime script
- `frontend/` — Next.js UI with typed schemas + Zustand slices
- `scripts/run-frontend.sh` — host-network frontend runtime script

## Quick start

1. Copy `.env.example` to `.env` and fill values.
2. Copy examples:
   - `cp services.local.example.json services.local.json`
   - `cp plugins.local.example.json plugins.local.json`
3. Run Redis (optional but recommended):
   - `./scripts/run-redis.sh`
4. Run backend:
   - `./scripts/run-backend.sh`
5. Run frontend:
   - `./scripts/run-frontend.sh`

## Notes

- `COMPASS_ENV=DEV` supports `PLUGIN_REGISTRY_SOURCE=local|databricks|overlay`.
- `STAGING` and `PROD` force `databricks` source.
- Service URL precedence:
  1) `SERVICE_URL_*` env vars
  2) `PLUGIN_SERVICES_LOCAL_FILE`
  3) unresolved
