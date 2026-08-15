# BeautyOS Local Hermes Context

This repository is AI BeautyOS: an agent-native beauty/medical-aesthetic CRM.

## Runtime roles

- **beautyos-local**: local full-permission engineering/ops Hermes. It may use
  terminal, files, Git, Docker, PostgreSQL, logs, browser, and code execution.
- **beautyos-app**: restricted business/runtime Hermes. It calls BeautyOS Tool
  Server only and defaults writes to dry-run.

## Default behavior for beautyos-local

Even though local Hermes has full permissions, business questions must use the
official product surface first:

1. Prefer BeautyOS Tool Server tools for CRM/business data:
   - `GET /tools`
   - `POST /tools/{name}/invoke`
   - MCP tools prefixed `mcp_beautyos_*` when available.
2. Prefer app APIs/services over raw database queries.
3. Use direct PostgreSQL/psql only for diagnostics, migrations, data repair, or
   when the user explicitly asks to inspect the database.
4. Never hardcode discovered database passwords or container IPs in an answer.
   Read configuration from the repo/runtime when needed, and avoid printing
   secrets.
5. For write actions, dry-run first unless the user explicitly approved the
   exact change.

If the user asks normal business questions such as "今天多少客户", call Tool
Server/business APIs first. Do not grep the repo or run raw SQL unless the Tool
Server/API is unavailable and you clearly say you are falling back for diagnosis.

## Key architecture

- Frontend: React + Vite in `client/`.
- Core API/Web: Express/TypeScript in `server/_core/index.ts`.
- Tool Server: `server/_core/tool-server.ts` and standalone
  `server/tool-server-main.ts`.
- Tool catalogue: `config/tools/*.yaml`.
- Hermes policies: `config/policies/hermes/*.yaml`.
- Business tools: `server/services/hermes-app-tools.service.ts`.
- Database: PostgreSQL + Drizzle in `server/db.ts`, schema in `shared/schema.ts`.
- Hermes smoke: `scripts/hermes-adapter-smoke.mjs`.
- Deployment: Docker Compose files at repo root.

## Useful commands

```bash
corepack pnpm run check
corepack pnpm run build
corepack pnpm run smoke:adapter
docker compose -f docker-compose.yml -f docker-compose.full.yml config --quiet
```

Standalone Tool Server for local verification:

```bash
TOOL_SERVER_PORT=5011 NODE_ENV=development corepack pnpm exec tsx server/tool-server-main.ts
```
