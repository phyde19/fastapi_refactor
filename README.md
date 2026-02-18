# Compass Refactor: Final Architecture Guide

If you are coming back to this after context-switching, this README is designed to
rebuild your mental model quickly and accurately. It explains what we built, why it
works, and how to run it without guessing.

---

## 1) What This Workspace Is

This workspace is a clean reference implementation of the split Compass architecture:

- `compass/` is the Compass Hub.
- `compass_plugins/` is a reference external plugin service.

The Hub owns routing, auth context, plugin registry reads/writes, and stream proxying.
Plugin services own AI/business behavior.

Both use explicit host routing via `podman --network host` (no compose dependency).

---

## 2) System Intent in One Sentence

Compass should let plugin developers build and run plugins with minimal friction in
DEV, while keeping STAGING/PROD behavior deterministic and centrally managed.

---

## 3) High-Level Architecture

```text
                         (A) Plugin Registry Data
                     +------------------------------+
                     | Databricks plugin_registry   |
                     +------------------------------+
                                ^
                                | (databricks source)
                                |
                     +------------------------------+
                     | Redis cache (DB1)            |
                     | plugins:index + plugin:*     |
                     +------------------------------+

             (B) local overrides in DEV
             +------------------------------+
             | plugins.local.json           |
             +------------------------------+

Frontend (Next.js + Zustand)         Compass Hub (FastAPI)         Plugin Service(s)
+-----------------------------+      +--------------------------+   +-----------------------+
| /plugins menu + inputs      | ---> | /plugins                |   | POST /plugin/response |
| /plugins admin UI           | ---> | /plugins-config         |   | streams llm/citation/ |
| /chat stream renderer       | ---> | /chats/*/stream         |-->| error NDJSON frames   |
+-----------------------------+      +--------------------------+   +-----------------------+
                                             |
                                             v
                                  ServiceResolver (service_key -> URL)
                                  precedence:
                                  1) SERVICE_URL_*
                                  2) services.local.json (DEV)
                                  3) unresolved
```

---

## 4) The Two Independent Runtime Knobs

This is the most important conceptual simplification:

- `COMPASS_ENV` chooses environment behavior (`DEV | STAGING | PROD`).
- `PLUGIN_REGISTRY_SOURCE` chooses plugin metadata source (`local | databricks | overlay`), but only meaningfully in `DEV`.

Why this matters:

- You can change plugin metadata source without changing service URL routing rules.
- You can change service URL mapping without rewriting registry rows.

This is the core of the "interception" model for developer workflows.

---

## 5) Plugin Registry: What It Stores and Why

Each plugin record carries:

- identity: `workspace_id`, `workspace_name`, `plugin_id`, `plugin_name`
- UX/admin fields: `description`, `instructions`, `position`, `enabled`
- plugin developer fields: `user_inputs`, `conversation_seed`
- routing hint: `service_key` (not hardcoded URL)
- classification/audit fields

Important split:

- Registry says **what exists** and **which logical service key it uses**.
- Resolver says **where that service key points right now**.

---

## 6) Primary Plugin Registry Interactions

These are the main touchpoints across frontend and backend.

### 6.1 `GET /plugins` (menu loading path)

Flow:

1. Frontend loads plugin catalog.
2. Hub calls `plugin_registry.get_grouped(..., enabled_only=True)`.
3. Hub checks routability per plugin:
   - plugin has `service_key`
   - resolver can map `service_key` to URL
4. By default, unroutable plugins are filtered out.
5. Frontend receives workspace-grouped plugin list with `user_inputs` and seed data.

Meaning:

- Menu only shows plugins that can actually be called (unless explicitly overridden).

### 6.2 `GET /plugins-config` and `PUT /plugins-config/{workspace}/{plugin}/config`

Flow:

1. Admin UI loads grouped plugin records.
2. Edit page updates `plugin_name`, `description`, `instructions`.
3. Hub delegates update to `plugin_registry.update(...)`.

Write constraints by mode:

- `local`: write is blocked (read-only; edit local file directly).
- `overlay`: local-overridden records are read-only through API; Databricks records are writable.
- `databricks`: writable in Databricks.

### 6.3 `POST /chats/new/stream` and `POST /chats/{id}/stream`

Flow:

1. Frontend sends conversation + user input values.
2. Hub resolves plugin from registry.
3. Hub resolves `service_key` to URL through resolver.
4. Hub builds plugin request envelope and streams to plugin service endpoint.
5. Hub forwards `llm` / `citation` / `error` frames back to frontend.
6. Hub persists partial/terminal state and normalizes failure behavior.

Meaning:

- Registry is used for both menu composition and runtime routing decisions.

---

## 7) How We Intercept Plugin Registry Logic by Dev Mode

This is the core behavior implemented in `plugin_registry/registry.py`.

### Mode matrix

```text
Source       Read all/get one                Update behavior
-----------  ------------------------------  --------------------------------------------
local        plugins.local.json only         blocked (edit local file)
databricks   Databricks + Redis cache        allowed (updates Databricks)
overlay      Databricks + local overlay      Databricks rows writable
             local wins by (ws, plugin)      local overlay rows blocked via API
```

### Overlay merge rule

Overlay uses this key:

- `(workspace_id, plugin_id)`

If a local file record has same key as Databricks row, local record wins.

### Guardrails enforced in settings

- `STAGING` and `PROD` must use `plugin_registry_source=databricks`.
- In `DEV`, `local` or `overlay` requires `PLUGIN_REGISTRY_LOCAL_FILE`.
- In `DEV`, `PLUGIN_SERVICES_LOCAL_FILE` must be defined.

---

## 8) Service URL Resolution (Where Requests Actually Go)

Service URL precedence:

1. `SERVICE_URL_*` env vars
2. `PLUGIN_SERVICES_LOCAL_FILE` (DEV only)
3. unresolved -> plugin treated as unroutable / request fails with service unavailable

Example:

- Plugin row has `service_key="compass_plugins"`.
- You set `SERVICE_URL_COMPASS_PLUGINS=http://localhost:5002`.
- This env var wins even if `services.local.json` says something else.

Practical effect:

- Ops can override destination quickly in STAGING/PROD without changing registry rows.
- Developers can remap local plugin services safely in DEV.

---

## 9) Deep Dive: Start Path + ENV-Driven DEV Overlay Bring-Up

This section is intentionally concrete and command-first.

### Start path

```bash
cd /root/mlops/mlops-artifacts-review/work_items/compass_refactor
```

### Step 1: Configure Hub env

```bash
cp compass/.env.example compass/.env
cp compass/plugins.local.example.json compass/plugins.local.json
cp compass/services.local.example.json compass/services.local.json
```

Use these key values in `compass/.env` for overlay mode:

```env
COMPASS_ENV=DEV
PLUGIN_REGISTRY_SOURCE=overlay
PLUGIN_REGISTRY_LOCAL_FILE=./plugins.local.json
PLUGIN_SERVICES_LOCAL_FILE=./services.local.json
NEXT_PUBLIC_COMPASS_API_BASE_URL=http://localhost:8000
```

Optional fast URL interception:

```env
SERVICE_URL_COMPASS_PLUGINS=http://localhost:5002
```

### Step 2: Configure plugin service

```bash
cp compass_plugins/.env.example compass_plugins/.env
```

### Step 3: Run in order

```bash
./compass_plugins/scripts/run-service.sh
./compass/scripts/run-redis.sh
./compass/scripts/run-backend.sh
./compass/scripts/run-frontend.sh
```

### Step 4: What should happen

- Frontend asks Hub for `/plugins`.
- Hub reads Databricks (through Redis cache) then applies local overlay.
- Hub resolves each `service_key` to URL.
- Routable plugins appear in menu.
- Chat sends to `POST {service_url}/plugin/response`.

### Port model

From scripts:

- Hub backend: `8000 + PORT_OFFSET`
- Hub frontend: `3000 + PORT_OFFSET`
- Hub Redis: `6000 + PORT_OFFSET`
- Plugin service: `5002 + PORT_OFFSET`

This lets you run multiple stacks side-by-side by changing `PORT_OFFSET`.

---

## 10) Frontend Architecture Summary

Frontend path: `compass/frontend`

Key layers:

- `schemas/` typed API and UI models
- `api/` transport + mappers + NDJSON parser
- `store/` Zustand slices (`plugin`, `input`, `chat`, `admin`, `ui`)
- `hooks/` orchestration (`usePluginMenu`, `usePluginInputs`, `useChatStream`, `useAdminPlugins`)
- `features/` UI modules (menu, chat, inputs, admin)

Critical behavior:

- plugin-defined `user_inputs` are rendered dynamically in right panel
- input values are validated/serialized before send
- stream frames incrementally update chat state
- admin edits only allowed fields in v1; plugin-defined input schema remains read-only in admin UI

---

## 11) Hub <-> Plugin Service Handshake

Hub calls:

- `POST {service_url}/plugin/response`

Request includes:

- plugin identity and workspace
- conversation and user inputs
- registry-driven context (`instructions`, `conversation_seed`, `user_inputs_schema`)
- user/auth context

Plugin service streams NDJSON frames:

- `llm` content chunks
- `citation` payloads
- `error` payloads

Hub is responsible for graceful failure behavior and normalization.

---

## 12) STAGING/PROD Behavior

In STAGING/PROD:

- plugin registry source is Databricks only
- local registry file behavior is not used
- service URL overrides should come from deployment env (`SERVICE_URL_*`)
- same Hub/plugin stream handshake applies

This keeps production behavior predictable while preserving operational override control.

---

## 13) Troubleshooting by Symptom

Plugin missing from menu:

- check `enabled=true`
- check plugin has `service_key`
- check resolver can map that key to a URL
- remember `/plugins` hides unroutable plugins by default

Plugin appears in admin list but update fails:

- in `local` mode, writes are intentionally blocked
- in `overlay`, local-overridden records are blocked via API; edit local file directly

Chat fails with service unavailable:

- service key exists but resolver mapping missing
- fix via `SERVICE_URL_*` or `services.local.json`

Unexpected plugin data in DEV:

- verify whether source is `local`, `databricks`, or `overlay`
- for overlay collisions, local file wins by `(workspace_id, plugin_id)`

---

## 14) Short Mental Model to Keep

When debugging, ask these in order:

1. Which environment am I in (`COMPASS_ENV`)?
2. Which registry source is active (`PLUGIN_REGISTRY_SOURCE`)?
3. Is this plugin record coming from Databricks, local, or overlay override?
4. Does `service_key` resolve under current precedence rules?
5. Is the plugin service actually listening on that URL/port?

If those five answers are clear, the system is usually straightforward to reason about.
