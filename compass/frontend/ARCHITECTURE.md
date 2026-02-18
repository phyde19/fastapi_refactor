# Frontend Architecture (Refactor)

This frontend keeps the Compass look and feel while reorganizing code around typed boundaries.

## 1) Runtime flow

```text
+---------------------+           +-------------------------+
| Next.js UI          |           | Compass Hub API         |
| (app + features)    | <-------> | /plugins                |
|                     |           | /plugins-config         |
|                     |           | /chats/*/stream         |
+----------+----------+           +-------------------------+
           |
           v
+---------------------+
| Zustand Store       |
| - plugin slice      |
| - input slice       |
| - chat slice        |
| - admin slice       |
| - ui slice          |
+---------------------+
```

## 2) Source layout

```text
frontend/
  app/              route wiring and page composition
  features/         chat, plugin menu, plugin inputs, admin UI
  hooks/            orchestration (menu load, stream send, admin save)
  store/            Zustand slices + selectors
  api/              transport + mapping + NDJSON parser
  schemas/          typed API and UI data models
```

## 3) Plugin input behavior

```text
/plugins response
    -> api/mappers/pluginMapper.ts
    -> PluginInputField[]
    -> inputSlice.hydrateInputDefaults()
    -> PluginInputsPanel renderer
    -> user modifies values
    -> inputSlice.validate + serialize
    -> /chats/*/stream request user_inputs
```

## 4) Chat stream behavior

```text
User prompt
  -> useChatStream.sendMessage()
  -> append user + assistant draft
  -> POST /chats/new/stream OR /chats/{id}/stream
  -> parseNdjsonStream()
       llm      -> appendAssistantChunk()
       citation -> appendAssistantCitation()
       error    -> setAssistantError()
  -> finalize state
```

## 5) Admin behavior

- Dashboard page loads grouped plugin records from `/plugins-config`.
- Detail page loads one plugin by workspace and plugin ID.
- Editable fields in v1: `plugin_name`, `description`, `instructions`.
- Input schema (`user_inputs`) remains read-only in admin UI for this phase.
