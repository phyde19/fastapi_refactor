# Compass Plugins Service (Reference)

Standalone external plugin service for Compass Hub integration.

## What this service demonstrates

- Stable Hub->Plugin contract (`PluginServiceRequest`, `contract_version="v1"`)
- NDJSON streaming frames (`llm`, `citation`, `error`)
- Multi-plugin dispatch by `plugin_id` in one service
- Optional Databricks Vector Search integration via settings

## Endpoint

- `POST /plugin/response`

Request body must match `app/contracts.py::PluginServiceRequest`.

## Quick start

1. Copy `.env.example` to `.env`.
2. Run:
   - `./scripts/run-service.sh`

By default this service runs on port `5002` with host networking.

## Plugin dispatch

- `compass_assistant` -> general assistant handler
- `dscoe_search_assistant` -> document search assistant handler
- Unknown `plugin_id` -> deterministic `error` frame
