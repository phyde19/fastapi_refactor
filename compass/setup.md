# Compass Hub Setup Guide

## Required environment variables

Core:
- `COMPASS_ENV=DEV|STAGING|PROD`
- `PLUGIN_REGISTRY_SOURCE=local|databricks|overlay` (DEV only)
- `PLUGIN_SERVICES_LOCAL_FILE`
- `PLUGIN_REGISTRY_LOCAL_FILE`

Redis:
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_SESSION_DB`
- `REDIS_PLUGIN_CACHE_DB`

Databricks (required for `databricks` and `overlay`):
- `DATABRICKS_WORKSPACE_URL`
- `DATABRICKS_HTTP_PATH`
- `DATABRICKS_TOKEN`
- `DATABRICKS_PLUGINS_TABLE`

Optional:
- `SERVICE_URL_*` mappings (highest precedence for service resolution)
- `FRONTEND_URL`, `FRONTEND_URL_ALT`
- `NEXT_PUBLIC_COMPASS_API_BASE_URL`

Identity:
- User identity is extracted from the bearer auth token claims.
- No local email fallback env variables are used.

## Local files

- `services.local.json`:
  - list of `service_key` to `service_url`
- `plugins.local.json`:
  - plugin records for local/overlay modes

Use:
- `services.local.example.json`
- `plugins.local.example.json`

## Run commands

From `compass/`:

- Start Redis:
  - `./scripts/run-redis.sh`
- Start Hub backend:
  - `./scripts/run-backend.sh`
- Start frontend:
  - `./scripts/run-frontend.sh`

## Mode troubleshooting

- `local` mode:
  - Ensure `plugins.local.json` exists and is valid JSON.
- `overlay` mode:
  - Databricks credentials must be valid.
  - Local file entries override Databricks by `(workspace_id, plugin_id)`.
- `databricks` mode:
  - Redis must be reachable for cache hydration.
  - Plugin table must match expected schema.

## Staging/Prod notes

- `COMPASS_ENV=STAGING|PROD` enforces `PLUGIN_REGISTRY_SOURCE=databricks`.
- Service URLs should be injected with `SERVICE_URL_*` env vars from deployment config.
