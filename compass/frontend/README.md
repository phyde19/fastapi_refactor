# Compass Frontend (Refactor)

Frontend for the refactored Compass Hub with:

- plugin menu loading from `/plugins`
- dynamic plugin input rendering from registry-defined schema
- NDJSON stream chat from `/chats/*/stream`
- admin dashboard from `/plugins-config`
- Zustand slices for plugin/input/chat/admin/ui domains

## Local development

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Or run through the host-network script from `../scripts/run-frontend.sh`.

## Architecture layout

- `schemas/` - API and UI data models
- `api/` - typed transport, mappers, stream parser
- `store/` - Zustand slices and selectors
- `hooks/` - orchestration hooks (menu, chat stream, admin)
- `features/` - UI grouped by feature area
- `ARCHITECTURE.md` - deeper runtime/dataflow diagrams
