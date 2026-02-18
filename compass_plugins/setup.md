# Compass Plugins Service Setup Guide

## Required environment variables

Base:
- `PLUGIN_SERVICE_PORT`

Optional Azure LLM:
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_MODEL`

Optional Databricks vector search:
- `DATABRICKS_HOST`
- `DATABRICKS_TOKEN`
- `DATABRICKS_VECTOR_SEARCH_ENDPOINT`
- `DATABRICKS_VECTOR_SEARCH_INDEX`
- `VECTOR_SEARCH_TOP_K`

Fallback:
- `ALLOW_MOCK_LLM=true|false`

## Run command

From `compass_plugins/`:
- `./scripts/run-service.sh`

The script runs with `--network host` so Hub can call the service at the configured URL.

## Contract

Endpoint:
- `POST /plugin/response`

Request:
- `PluginServiceRequest` v1 (see `service/app/contracts.py`)

Response stream:
- NDJSON frames:
  - `llm`
  - `citation`
  - `error`
